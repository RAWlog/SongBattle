'use server';

import { generateBracket } from '@/services/bracket.service';
import { calculateNewRatings } from '@/services/elo.service';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

/**
 * Запускает турнир: генерирует турнирную сетку и сохраняет все матчи в базу данных.
 * Эта функция вызывается сразу после импорта треков.
 * 
 * @param tournamentId ID турнира
 */
export async function startTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { tracks: true }
  });

  if (!tournament || tournament.status !== 'READY') {
    return { success: false, error: 'Турнир не готов к запуску' };
  }

  // 1. Генерируем математическую сетку турнира (в памяти)
  const matches = generateBracket(tournament.tracks);

  // 2. Сохраняем все матчи в базу данных
  const createdMatches = [];
  for (const match of matches) {
    let status = 'PENDING';
    
    // В первом раунде матчи могут быть либо готовы к бою (READY), 
    // либо быть "автоматами" (BYE), где есть только Игрок А.
    if (match.round === 1) {
      if (match.playerAId && !match.playerBId) {
        status = 'COMPLETED'; // Трек прошел автоматом
      } else {
        status = 'READY'; // Трек ждет боя
      }
    }

    const createdMatch = await prisma.match.create({
      data: {
        tournamentId,
        round: match.round,
        position: match.position,
        playerAId: match.playerAId,
        playerBId: match.playerBId,
        winnerId: (match.playerAId && !match.playerBId) ? match.playerAId : null,
        status,
      }
    });
    createdMatches.push(createdMatch);
  }

  // 3. Продвигаем всех победителей-"автоматов" во второй раунд.
  // Это нужно делать ПОСЛЕ создания всех матчей, иначе Раунд 2 еще не будет существовать в базе.
  for (const match of createdMatches) {
    if (match.round === 1 && match.status === 'COMPLETED' && match.winnerId) {
      await advancePlayer(tournamentId, 1, match.position, match.winnerId);
    }
  }

  // 4. Переводим сам турнир в статус "В процессе"
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'IN_PROGRESS', currentRound: 1 }
  });

  revalidatePath(`/tournament/${tournamentId}`);
  return { success: true };
}

/**
 * Вспомогательная функция для продвижения победителя в следующий раунд турнирной сетки.
 */
async function advancePlayer(tournamentId: string, currentRound: number, currentPosition: number, winnerId: string) {
  const nextRound = currentRound + 1;
  // Позиция в следующем раунде вычисляется делением на 2 с округлением вверх
  // (например, победители 1 и 2 матчей идут в 1-й матч следующего раунда)
  const nextPosition = Math.ceil(currentPosition / 2);
  
  const nextMatch = await prisma.match.findFirst({
    where: { tournamentId, round: nextRound, position: nextPosition }
  });

  if (!nextMatch) return;

  // Нечетные матчи становятся Игроком А, четные — Игроком Б
  const isPlayerA = currentPosition % 2 !== 0;

  await prisma.match.update({
    where: { id: nextMatch.id },
    data: {
      playerAId: isPlayerA ? winnerId : nextMatch.playerAId,
      playerBId: !isPlayerA ? winnerId : nextMatch.playerBId,
      // Матч готов (READY), только если теперь в нем есть оба игрока
      status: ((isPlayerA && nextMatch.playerBId) || (!isPlayerA && nextMatch.playerAId)) ? 'READY' : 'PENDING'
    }
  });
}

/**
 * Обрабатывает голос пользователя за один из треков.
 * Пересчитывает Elo-рейтинг и продвигает победителя по сетке.
 */
export async function submitVote(matchId: string, winnerId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { playerA: true, playerB: true }
  });

  if (!match || match.status !== 'READY') {
    return { success: false, error: 'Этот матч еще не готов для голосования' };
  }

  const isPlayerAWinner = match.playerAId === winnerId;
  const loserId = isPlayerAWinner ? match.playerBId : match.playerAId;

  if (!match.playerA || !match.playerB || !loserId) {
    return { success: false, error: 'Ошибка состояния матча' };
  }

  // Используем транзакцию, чтобы обновить рейтинги и продвинуть трек атомарно
  await prisma.$transaction(async (tx) => {
    // 1. Помечаем текущий матч как завершенный
    await tx.match.update({
      where: { id: matchId },
      data: { status: 'COMPLETED', winnerId }
    });

    // 2. Обновляем Elo-рейтинг для глобального топа
    const { newRatingA, newRatingB } = calculateNewRatings(
      match.playerA!.eloRating,
      match.playerB!.eloRating,
      isPlayerAWinner ? 1 : 0
    );

    await tx.track.update({
      where: { id: match.playerAId! },
      data: {
        eloRating: newRatingA,
        wins: { increment: isPlayerAWinner ? 1 : 0 },
        losses: { increment: isPlayerAWinner ? 0 : 1 },
      }
    });

    await tx.track.update({
      where: { id: match.playerBId! },
      data: {
        eloRating: newRatingB,
        wins: { increment: !isPlayerAWinner ? 1 : 0 },
        losses: { increment: !isPlayerAWinner ? 0 : 1 },
      }
    });

    // 3. Продвигаем победителя в следующий раунд
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    
    const nextMatch = await tx.match.findFirst({
      where: { tournamentId: match.tournamentId, round: nextRound, position: nextPosition }
    });

    if (nextMatch) {
      const isPlayerANext = match.position % 2 !== 0;
      await tx.match.update({
        where: { id: nextMatch.id },
        data: {
          playerAId: isPlayerANext ? winnerId : nextMatch.playerAId,
          playerBId: !isPlayerANext ? winnerId : nextMatch.playerBId,
          status: ((isPlayerANext && nextMatch.playerBId) || (!isPlayerANext && nextMatch.playerAId)) ? 'READY' : 'PENDING'
        }
      });
    } else {
      // Если следующего матча нет — значит это был финал! Турнир окончен.
      await tx.tournament.update({
        where: { id: match.tournamentId },
        data: { status: 'COMPLETED', winnerId }
      });
    }

    // 4. Проверяем, не закончились ли все бои в текущем раунде, чтобы переключить турнир на следующий
    const pendingMatchesInRound = await tx.match.count({
      where: { tournamentId: match.tournamentId, round: match.round, status: { not: 'COMPLETED' } }
    });

    if (pendingMatchesInRound === 0 && nextMatch) {
      await tx.tournament.update({
        where: { id: match.tournamentId },
        data: { currentRound: nextRound }
      });
    }
  });

  revalidatePath(`/tournament/${match.tournamentId}`);
  return { success: true };
}

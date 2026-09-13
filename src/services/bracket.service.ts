import { Track } from '@prisma/client';

export type GeneratedMatch = {
  round: number;
  position: number;
  playerAId: string | null;
  playerBId: string | null;
};

/**
 * Алгоритм Фишера-Йетса для случайного перемешивания массива треков.
 * Это нужно для того, чтобы турнирная сетка каждый раз собиралась случайно.
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Сервис генерации турнирной сетки (Bracket).
 * 
 * В турнирах на выбывание размер сетки всегда должен быть степенью двойки 
 * (например, 256, 512, 1024). Если количество треков не совпадает со степенью двойки
 * (например, их 522), то "лишние" места в первом раунде заполняются "автоматами" (BYEs).
 * Трек, получивший автомат, не сражается в первом раунде, а сразу проходит во второй.
 * 
 * @param tracks Массив треков из базы данных
 * @returns Массив всех матчей для всех раундов турнира
 */
export function generateBracket(tracks: Track[]): GeneratedMatch[] {
  if (tracks.length < 2) {
    throw new Error('Для создания турнира нужно как минимум 2 трека');
  }

  // Находим ближайшую степень двойки сверху (например, для 522 треков это 1024)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(tracks.length)));
  // Считаем количество "автоматов" (пустых мест)
  const byes = bracketSize - tracks.length;

  const shuffled = shuffle(tracks);
  
  // В первом раунде всегда ровно половина матчей от размера сетки
  const matchesRound1 = bracketSize / 2;
  const generatedMatches: GeneratedMatch[] = [];

  // 1. Создаем пустой каркас всех матчей для всех раундов
  let currentRound = 1;
  let matchesInRound = matchesRound1;
  while (matchesInRound >= 1) {
    for (let pos = 1; pos <= matchesInRound; pos++) {
      generatedMatches.push({
        round: currentRound,
        position: pos,
        playerAId: null,
        playerBId: null,
      });
    }
    currentRound++;
    matchesInRound = Math.floor(matchesInRound / 2);
  }

  // 2. Заполняем первый раунд реальными треками
  let trackIdx = 0;
  for (let pos = 1; pos <= matchesRound1; pos++) {
    const match = generatedMatches.find(m => m.round === 1 && m.position === pos);
    if (!match) continue;

    // Всегда назначаем первого Игрока А
    match.playerAId = shuffled[trackIdx]?.id || null;
    trackIdx++;

    // Если матч не попадает в список "автоматов", назначаем ему Игрока Б для боя.
    // Если это автомат, то Игрок Б останется null.
    if (pos > byes && trackIdx < shuffled.length) {
      match.playerBId = shuffled[trackIdx]?.id || null;
      trackIdx++;
    }
  }

  return generatedMatches;
}

import { PrismaClient } from '@prisma/client';
import { redirect } from 'next/navigation';
import MatchView from './MatchView';
import Link from 'next/link';

const prisma = new PrismaClient();

/**
 * Страница активного турнира. 
 * Это серверный компонент (Server Component), который извлекает следующий доступный матч из базы данных
 * и отображает его пользователю.
 */
export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
  });

  if (!tournament) return <div>Турнир не найден</div>;

  // Если турнир уже завершен, отправляем на страницу победителя
  if (tournament.status === 'COMPLETED') {
    redirect(`/tournament/${id}/winner`);
  }

  // Находим следующий матч в текущем раунде, который готов к игре (имеет обоих игроков)
  let nextMatch = await prisma.match.findFirst({
    where: {
      tournamentId: id,
      status: 'READY'
    },
    orderBy: [
      { round: 'asc' },
      { position: 'asc' }
    ],
    include: {
      playerA: true,
      playerB: true
    }
  });

  if (!nextMatch) {
    // Если готовых матчей нет, проверяем, есть ли матчи, ожидающие завершения предыдущих раундов
    const pendingMatches = await prisma.match.count({
      where: { tournamentId: id, status: 'PENDING' }
    });

    // Если ожидающих матчей тоже нет, значит турнир завершен
    if (pendingMatches === 0) {
      redirect(`/tournament/${id}/winner`);
    } else {
       // Если есть ожидающие матчи, но нет готовых, значит мы находимся на стыке раундов.
       // Пользователь должен нажать "Next Round", чтобы страница перезагрузилась и подхватила новые матчи.
       return (
         <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
           <div className="text-center">
             <h1 className="text-2xl mb-4">Раунд {tournament.currentRound} завершен!</h1>
             <p className="mb-4 text-zinc-400">Формируем матчи следующего раунда...</p>
             <a href={`/tournament/${id}`} className="px-4 py-2 bg-zinc-800 rounded inline-block hover:bg-zinc-700 transition">
               Следующий раунд
             </a>
           </div>
         </div>
       );
    }
  }

  // --- Подсчет текущего прогресса в раунде ---
  // Мы игнорируем матчи-"автоматы" (BYEs), которые автоматически завершаются в 1 раунде,
  // чтобы показывать пользователю только реальное количество битв (например, 10 вместо 512).
  const allMatchesInRound = await prisma.match.findMany({
    where: { tournamentId: id, round: nextMatch.round },
    select: { status: true, playerBId: true, round: true }
  });

  let totalPlayable = 0;
  let completedPlayable = 0;

  for (const m of allMatchesInRound) {
    // Матч считается автоматом только в 1-м раунде и если в нем нет Игрока Б
    const isBye = m.round === 1 && m.playerBId === null;
    if (!isBye) {
      totalPlayable++;
      if (m.status === 'COMPLETED') {
        completedPlayable++;
      }
    }
  }

  // --- Just-In-Time (JIT) загрузка видео YouTube ---
  // Вместо того чтобы спамить API YouTube 100+ запросами при создании турнира (что приводит к банам и исчерпанию квот),
  // мы ищем клипы прямо перед тем, как они появятся на экране (на лету).
  // Пользователь голосует раз в 10-30 секунд, что делает запросы к YouTube естественными и не блокируется защитой от ботов.
  const fetchYoutubeIfNeeded = async (player: any) => {
    if (player && !player.youtubeVideoId) {
      try {
        const { findBestYoutubeMatch } = await import('@/services/youtube.service');
        const match = await findBestYoutubeMatch(player.title, player.artist, player.durationMs || 0);
        if (match) {
          const updated = await prisma.track.update({
            where: { id: player.id },
            data: { 
              youtubeVideoId: match.videoId, 
              youtubeTitle: match.title, 
              youtubeConfidence: match.confidence.toString() 
            }
          });
          return updated;
        }
      } catch (e) {
        console.error('Ошибка JIT загрузки для трека:', player.title, e);
      }
    }
    return player;
  };

  // Запускаем поиск для обоих треков параллельно
  const [updatedPlayerA, updatedPlayerB] = await Promise.all([
    fetchYoutubeIfNeeded(nextMatch.playerA),
    fetchYoutubeIfNeeded(nextMatch.playerB)
  ]);

  if (nextMatch.playerA) nextMatch.playerA = updatedPlayerA;
  if (nextMatch.playerB) nextMatch.playerB = updatedPlayerB;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-4">
      <header className="flex items-center justify-between max-w-5xl mx-auto py-4 border-b border-zinc-800 mb-8">
        <div>
          <h1 className="text-xl font-bold">{tournament.name}</h1>
          <p className="text-zinc-400 text-sm uppercase">
            РАУНД {nextMatch.round} • МАТЧ {completedPlayable + 1} / {totalPlayable}
          </p>
        </div>
        <nav className="space-x-4">
          <Link href={`/tournament/${id}/bracket`} className="text-sm text-zinc-400 hover:text-white transition">Сетка</Link>
          <Link href={`/tournament/${id}/ranking`} className="text-sm text-zinc-400 hover:text-white transition">Рейтинг</Link>
        </nav>
      </header>
      
      <main className="max-w-5xl mx-auto">
        <MatchView match={nextMatch} />
      </main>
    </div>
  );
}

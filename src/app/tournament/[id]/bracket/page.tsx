import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matches = await prisma.match.findMany({
    where: { tournamentId: id },
    include: { playerA: true, playerB: true },
    orderBy: [{ round: 'asc' }, { position: 'asc' }]
  });

  const rounds = Array.from(new Set(matches.map(m => m.round)));

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="max-w-6xl mx-auto py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Tournament Bracket</h1>
          <Link href={`/tournament/${id}`} className="text-sm text-zinc-400 hover:text-white">
            Back to Tournament
          </Link>
        </header>

        <div className="flex space-x-8 overflow-x-auto pb-8">
          {rounds.map(round => (
            <div key={round} className="flex-none w-64 space-y-4">
              <h2 className="text-lg font-bold text-zinc-500 mb-6 text-center">Round {round}</h2>
              {matches.filter(m => m.round === round).map(match => (
                <div key={match.id} className="bg-zinc-900 border border-zinc-800 rounded p-3 text-sm">
                  <div className={`py-1 ${match.winnerId === match.playerAId ? 'text-green-400 font-bold' : (match.playerA ? 'text-zinc-300' : 'text-zinc-600')}`}>
                    {match.playerA ? match.playerA.title : 'TBD'}
                  </div>
                  <div className="border-t border-zinc-800 my-1"></div>
                  <div className={`py-1 ${match.winnerId === match.playerBId ? 'text-green-400 font-bold' : (match.playerB ? 'text-zinc-300' : 'text-zinc-600')}`}>
                    {match.playerB ? match.playerB.title : (match.status === 'COMPLETED' ? '(BYE)' : 'TBD')}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

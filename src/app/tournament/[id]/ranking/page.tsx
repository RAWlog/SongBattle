import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

export default async function RankingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tracks = await prisma.track.findMany({
    where: { tournamentId: id },
    orderBy: [
      { eloRating: 'desc' },
      { wins: 'desc' },
    ]
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="max-w-4xl mx-auto py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Tournament Rankings</h1>
          <Link href={`/tournament/${id}`} className="text-sm text-zinc-400 hover:text-white">
            Back to Tournament
          </Link>
        </header>

        <p className="text-zinc-400 mb-6 text-sm">
          Rankings are based on Elo rating, calculating opponent strength into each win or loss.
        </p>

        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 text-sm">
                <th className="p-4 w-16 text-center">#</th>
                <th className="p-4">Track</th>
                <th className="p-4 w-24 text-right">Rating</th>
                <th className="p-4 w-24 text-right">W - L</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, i) => (
                <tr key={track.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                  <td className="p-4 text-center font-bold text-zinc-500">{i + 1}</td>
                  <td className="p-4">
                    <div className="font-medium text-white">{track.title}</div>
                    <div className="text-sm text-zinc-400">{track.artist}</div>
                  </td>
                  <td className="p-4 text-right font-mono text-zinc-300">{track.eloRating}</td>
                  <td className="p-4 text-right text-zinc-400">{track.wins} - {track.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

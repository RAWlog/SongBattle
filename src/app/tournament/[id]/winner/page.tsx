import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

export default async function WinnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
  });

  if (!tournament || !tournament.winnerId) {
    return <div>No winner yet!</div>;
  }

  const winner = await prisma.track.findUnique({
    where: { id: tournament.winnerId }
  });

  if (!winner) return <div>Winner track not found.</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-black text-yellow-500 tracking-wider">TOURNAMENT WINNER</h1>
        
        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl max-w-md w-full mx-auto">
          {winner.albumArtUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={winner.albumArtUrl} alt="" className="w-48 h-48 mx-auto rounded-lg shadow-lg mb-6" />
          )}
          <h2 className="text-2xl font-bold">{winner.title}</h2>
          <p className="text-lg text-zinc-400">{winner.artist}</p>
        </div>

        <div className="flex justify-center space-x-4 pt-8">
          <Link href={`/tournament/${id}/ranking`} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-md font-semibold">
            View Full Ranking
          </Link>
          <Link href={`/`} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-md font-semibold">
            Start New Tournament
          </Link>
        </div>
      </div>
    </div>
  );
}

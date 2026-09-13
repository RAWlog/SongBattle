import { PrismaClient } from '@prisma/client';
import { CreateTournamentForm } from '@/components/CreateTournamentForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const prisma = new PrismaClient();

export default async function Home() {
  const recentTournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      _count: {
        select: { tracks: true }
      }
    }
  });

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-50">
      <div className="w-full max-w-md space-y-8">
        <Card className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">MUSIC TOURNAMENT</CardTitle>
            <CardDescription className="text-center text-zinc-400">
              Compare every track in your playlist and crown a winner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTournamentForm />
          </CardContent>
        </Card>

        {recentTournaments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-300 px-1">Recent Tournaments</h3>
            <div className="space-y-2">
              {recentTournaments.map((t) => (
                <Link key={t.id} href={`/tournament/${t.id}`}>
                  <Card className="bg-zinc-900/50 hover:bg-zinc-800 border-zinc-800 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-zinc-100 truncate max-w-[200px]" title={t.name}>
                          {t.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {t._count.tracks} tracks • {t.status === 'COMPLETED' ? 'Finished' : `Round ${t.currentRound}`}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-primary">
                        {t.status === 'COMPLETED' ? 'View Results' : 'Continue'}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

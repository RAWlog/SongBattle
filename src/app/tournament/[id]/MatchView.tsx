'use client';

import { useState } from 'react';
import YouTube from 'react-youtube';
import { submitVote } from '@/app/actions/tournament';
import { Button } from '@/components/ui/button';

export default function MatchView({ match }: { match: any }) {
  const [submitting, setSubmitting] = useState(false);
  // Анимация при голосовании (какой трек выбран)
  const [votedFor, setVotedFor] = useState<string | null>(null);
  
  const [playerA, setPlayerA] = useState<any>(null);
  const [playerB, setPlayerB] = useState<any>(null);

  const handleVote = async (winnerId: string) => {
    if (submitting) return;
    setSubmitting(true);
    setVotedFor(winnerId);
    
    playerA?.pauseVideo();
    playerB?.pauseVideo();

    await submitVote(match.id, winnerId);
    
    // Сбрасываем стейт при получении следующего матча
    // Next.js Server Action выполнит revalidatePath, и пропсы обновятся.
    setSubmitting(false);
    setVotedFor(null);
  };

  const onPlayA = () => {
    if (playerB && typeof playerB.pauseVideo === 'function') {
      playerB.pauseVideo();
    }
  };

  const onPlayB = () => {
    if (playerA && typeof playerA.pauseVideo === 'function') {
      playerA.pauseVideo();
    }
  };

  // Позволяем плавно исчезнуть невыбранной карточке
  const getCardClass = (playerId: string) => {
    const baseClass = "flex flex-col space-y-4 bg-zinc-900 p-5 rounded-2xl border border-zinc-800 transition-all duration-300 ease-in-out hover:border-zinc-700 hover:shadow-2xl hover:shadow-primary/5";
    if (!votedFor) return baseClass;
    if (votedFor === playerId) return `${baseClass} ring-2 ring-primary scale-105 opacity-100 z-10`;
    return `${baseClass} scale-95 opacity-50 blur-sm pointer-events-none`;
  };

  // Ключ key={match.id} заставит React перерендерить компонент при смене матча,
  // тем самым запуская анимацию fade-in заново.
  return (
    <div key={match.id} className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in zoom-in-95 duration-500">
      
      {/* Player A */}
      <div className={getCardClass(match.playerA.id)}>
        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
          {match.playerA.youtubeVideoId ? (
            <YouTube 
              videoId={match.playerA.youtubeVideoId} 
              opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0 } }} 
              onReady={(e) => setPlayerA(e.target)}
              onPlay={onPlayA}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-zinc-500 animate-pulse">Видео не найдено</div>
          )}
        </div>
        <div className="flex items-center space-x-4 pt-2">
          {match.playerA.albumArtUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.playerA.albumArtUrl} alt="" className="w-14 h-14 rounded-lg object-cover shadow-md" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-zinc-800 animate-pulse"></div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate text-zinc-100 tracking-tight" title={match.playerA.title}>{match.playerA.title}</h2>
            <p className="text-sm text-zinc-400 truncate" title={match.playerA.artist}>{match.playerA.artist}</p>
          </div>
        </div>
        <Button 
          onClick={() => handleVote(match.playerA.id)} 
          disabled={submitting}
          className="w-full h-14 text-lg font-bold bg-zinc-800 text-zinc-100 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
        >
          ВЫБРАТЬ
        </Button>
      </div>

      {/* VS Badge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex w-16 h-16 bg-zinc-900 rounded-full items-center justify-center font-black text-xl italic text-primary border-4 border-zinc-950 z-10 pointer-events-none shadow-lg">
        VS
      </div>

      {/* Player B */}
      <div className={getCardClass(match.playerB.id)}>
        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
          {match.playerB.youtubeVideoId ? (
            <YouTube 
              videoId={match.playerB.youtubeVideoId} 
              opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0 } }} 
              onReady={(e) => setPlayerB(e.target)}
              onPlay={onPlayB}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-zinc-500 animate-pulse">Видео не найдено</div>
          )}
        </div>
        <div className="flex items-center space-x-4 pt-2">
          {match.playerB.albumArtUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.playerB.albumArtUrl} alt="" className="w-14 h-14 rounded-lg object-cover shadow-md" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-zinc-800 animate-pulse"></div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate text-zinc-100 tracking-tight" title={match.playerB.title}>{match.playerB.title}</h2>
            <p className="text-sm text-zinc-400 truncate" title={match.playerB.artist}>{match.playerB.artist}</p>
          </div>
        </div>
        <Button 
          onClick={() => handleVote(match.playerB.id)} 
          disabled={submitting}
          className="w-full h-14 text-lg font-bold bg-zinc-800 text-zinc-100 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
        >
          ВЫБРАТЬ
        </Button>
      </div>
    </div>
  );
}

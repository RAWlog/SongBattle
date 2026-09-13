import { describe, it, expect } from 'vitest';
import { generateBracket } from '@/services/bracket.service';

describe('Bracket Service', () => {
  const createMockTracks = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
      id: `track-${i + 1}`,
      tournamentId: 'tour-1',
      spotifyId: `sp-${i + 1}`,
      title: `Title ${i + 1}`,
      artist: `Artist ${i + 1}`,
      album: null,
      albumArtUrl: null,
      durationMs: 0,
      youtubeVideoId: null,
      youtubeTitle: null,
      youtubeConfidence: null,
      eloRating: 1000,
      wins: 0,
      losses: 0,
      isManualMatch: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  };

  it('должен выбрасывать ошибку, если треков меньше 2', () => {
    expect(() => generateBracket(createMockTracks(1))).toThrow('Для создания турнира нужно как минимум 2 трека');
  });

  it('должен создавать идеальную сетку без BYE для степени двойки (4 трека)', () => {
    const tracks = createMockTracks(4);
    const matches = generateBracket(tracks);

    // Сетка из 4 треков: Раунд 1 = 2 матча, Раунд 2 (финал) = 1 матч. Итого 3 матча.
    expect(matches).toHaveLength(3);
    
    const round1 = matches.filter(m => m.round === 1);
    expect(round1).toHaveLength(2);
    
    // В первом раунде ни у кого не должно быть BYE (у всех есть соперник)
    for (const match of round1) {
      expect(match.playerAId).not.toBeNull();
      expect(match.playerBId).not.toBeNull();
    }
  });

  it('должен создавать сетку с BYE для неровного количества треков (5 треков)', () => {
    const tracks = createMockTracks(5);
    const matches = generateBracket(tracks);

    // Для 5 треков сетка будет на 8 слотов. 
    // Значит Раунд 1 = 4 матча, Раунд 2 = 2 матча, Раунд 3 = 1 матч. Итого 7 матчей.
    expect(matches).toHaveLength(7);
    
    const round1 = matches.filter(m => m.round === 1);
    expect(round1).toHaveLength(4);
    
    // Для 5 треков в сетке на 8 слотов будет 3 BYE (8 - 5 = 3)
    const byes = round1.filter(m => m.playerAId !== null && m.playerBId === null);
    expect(byes).toHaveLength(3);
    
    // И только 1 реальный матч
    const playable = round1.filter(m => m.playerAId !== null && m.playerBId !== null);
    expect(playable).toHaveLength(1);
  });
});

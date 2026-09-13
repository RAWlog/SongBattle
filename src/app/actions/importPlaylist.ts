'use server';

import { extractPlaylistId, fetchPlaylist } from '@/services/spotify.service';
import { startTournament } from './tournament';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Импортирует плейлист по URL из Spotify и сразу запускает турнир.
 * Эта Server Action вызывается с главной страницы при нажатии кнопки "IMPORT URL".
 * 
 * @param url Ссылка на плейлист Spotify
 */
export async function importPlaylist(url: string) {
  try {
    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      return { success: false, error: 'Неверный URL плейлиста Spotify' };
    }

    // Парсим публичный виджет Spotify (до 100 треков)
    const { playlist, tracks } = await fetchPlaylist(playlistId);
    
    if (tracks.length < 2) {
      return { success: false, error: 'В плейлисте должно быть минимум 2 трека' };
    }

    // Создаем запись турнира в базе данных
    const tournament = await prisma.tournament.create({
      data: {
        spotifyId: playlist.id,
        name: playlist.name,
        thumbnail: playlist.images[0]?.url || null,
        status: 'READY', // Сразу готов к бою, так как YouTube-клипы будут подгружаться на лету (Just-In-Time)
      }
    });

    // Сохраняем все найденные треки
    await prisma.track.createMany({
      data: tracks.map(t => ({
        tournamentId: tournament.id,
        spotifyId: t.spotifyId,
        title: t.title,
        artist: t.artists.join(', '),
        album: t.album,
        albumArtUrl: t.albumArtUrl,
        durationMs: t.durationMs || 0,
      }))
    });

    // Сразу же генерируем турнирную сетку.
    // Больше не нужно ждать загрузки видео на промежуточной странице Setup!
    const startRes = await startTournament(tournament.id);
    if (!startRes.success) {
      return { success: false, error: startRes.error };
    }

    // Возвращаем ID, чтобы фронтенд мог мгновенно перенаправить пользователя в бой
    return { success: true, tournamentId: tournament.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Ошибка импорта плейлиста' };
  }
}

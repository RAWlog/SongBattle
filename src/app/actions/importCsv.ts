'use server';

import { PrismaClient } from '@prisma/client';
import { startTournament } from './tournament';

const prisma = new PrismaClient();

/**
 * Импортирует треки из CSV файла (сгенерированного через Exportify).
 * Это позволяет обойти лимит виджета Spotify в 100 треков и загружать гигантские плейлисты (500+ треков).
 * 
 * @param formData Объект FormData, содержащий загруженный CSV-файл
 */
export async function importCsv(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'Файл не загружен' };
    }

    const text = await file.text();
    const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
    
    // Простой парсер CSV, который корректно обрабатывает кавычки и запятые внутри названий
    const parseCsvRow = (row: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '"') {
          inQuotes = !inQuotes;
        } else if (row[i] === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += row[i];
        }
      }
      result.push(current.trim());
      return result.map(s => s.replace(/^"|"$/g, ''));
    };

    // Читаем заголовки, чтобы понять, в каких колонках лежат нужные данные
    const headers = parseCsvRow(rows[0]);
    const nameIdx = headers.findIndex(h => h.toLowerCase().includes('track name'));
    const artistIdx = headers.findIndex(h => h.toLowerCase().includes('artist name'));
    const albumIdx = headers.findIndex(h => h.toLowerCase().includes('album name'));
    const durationIdx = headers.findIndex(h => h.toLowerCase().includes('duration'));

    if (nameIdx === -1 || artistIdx === -1) {
      return { success: false, error: 'Неверный формат CSV. Отсутствуют колонки "Track Name" или "Artist Name".' };
    }

    const tracks = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = parseCsvRow(rows[i]);
      if (cols.length > nameIdx) {
        tracks.push({
          spotifyId: `csv-${i}`, // Генерируем фейковый ID, так как из CSV мы не всегда получаем Spotify ID
          title: cols[nameIdx] || 'Unknown Title',
          artist: cols[artistIdx] || 'Unknown Artist',
          album: albumIdx !== -1 ? cols[albumIdx] : '',
          durationMs: durationIdx !== -1 ? parseInt(cols[durationIdx], 10) || 0 : 0,
        });
      }
    }

    if (tracks.length < 2) {
      return { success: false, error: 'В CSV должно быть как минимум 2 трека' };
    }

    // Создаем запись турнира в базе
    const tournamentName = file.name.replace('.csv', '');
    const tournament = await prisma.tournament.create({
      data: {
        spotifyId: `csv-${Date.now()}`,
        name: tournamentName,
        thumbnail: null,
        status: 'READY',
      }
    });

    // Сохраняем все треки
    await prisma.track.createMany({
      data: tracks.map(t => ({
        tournamentId: tournament.id,
        spotifyId: t.spotifyId,
        title: t.title,
        artist: t.artist,
        album: t.album,
        albumArtUrl: null, // Увы, Exportify не отдает обложки альбомов
        durationMs: t.durationMs,
      }))
    });

    // Сразу генерируем турнирную сетку
    const startRes = await startTournament(tournament.id);
    if (!startRes.success) {
      return { success: false, error: startRes.error };
    }

    return { success: true, tournamentId: tournament.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Ошибка при импорте CSV' };
  }
}

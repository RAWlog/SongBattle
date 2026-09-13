import ytSearch from 'yt-search';

/**
 * Ищет лучший подходящий клип на YouTube для заданного трека.
 *
 * Мы используем библиотеку yt-search (парсинг страниц YouTube), а не официальный Google API.
 * Это позволяет обойти лимит в 10 000 квот (100 поисковых запросов в день),
 * а также обходит региональные блокировки (например, недоступность официальных клипов в РФ),
 * так как парсер может работать через VPN-соединение сервера.
 *
 * @param trackTitle Название трека
 * @param artistName Имя исполнителя
 * @param targetDurationMs Длительность трека из Spotify в миллисекундах (используется для точного подбора)
 * @returns Объект с видео ID, названием и уровнем уверенности алгоритма
 */
export async function findBestYoutubeMatch(
  trackTitle: string,
  artistName: string,
  targetDurationMs: number
): Promise<{ videoId: string; title: string; confidence: string } | null> {
  const query = `${trackTitle} ${artistName}`;

  try {
    const r = await ytSearch(query);
    const videos = r.videos.slice(0, 5); // Берем топ-5 результатов

    if (videos.length === 0) return null;

    let bestVideo = videos[0];
    let bestScore = -1;

    // Оцениваем каждый клип из топ-5, чтобы выбрать наиболее подходящий
    for (const item of videos) {
      // yt-search возвращает длительность в секундах
      const durationMs = item.duration.seconds * 1000;
      
      const titleLower = item.title.toLowerCase();
      const queryTitle = trackTitle.toLowerCase();
      const queryArtist = artistName.toLowerCase();

      let score = 0;
      
      // Самый важный критерий — совпадение по длительности.
      // Позволяет отсеять длинные миксы или короткие обрезки.
      const durationDiff = Math.abs(durationMs - targetDurationMs);
      if (durationDiff < 5000) score += 50;
      else if (durationDiff < 15000) score += 30;
      else if (durationDiff < 30000) score += 10;
      
      // Совпадение по названию и артисту
      if (titleLower.includes(queryTitle)) score += 25;
      if (titleLower.includes(queryArtist)) score += 25;
      
      // Штрафуем живые выступления и каверы, если только мы изначально не искали их
      if (titleLower.includes('live') && !queryTitle.includes('live')) score -= 20;
      if (titleLower.includes('cover') && !queryTitle.includes('cover')) score -= 30;
      if (titleLower.includes('karaoke')) score -= 50;

      if (score > bestScore) {
        bestScore = score;
        bestVideo = item;
      }
    }

    // Определяем уровень уверенности алгоритма для возможного дебага
    let confidence = 'LOW';
    if (bestScore >= 70) confidence = 'HIGH';
    else if (bestScore >= 40) confidence = 'MEDIUM';

    return {
      videoId: bestVideo.videoId,
      title: bestVideo.title,
      confidence: confidence,
    };
  } catch (err) {
    console.error('Ошибка при поиске видео через yt-search:', err);
    return null;
  }
}

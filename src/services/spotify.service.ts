/**
 * Сервис для парсинга плейлистов Spotify.
 *
 * Мы НЕ используем официальный API Spotify, так как он требует авторизации
 * и ограничивает доступ в режиме разработки (Dev Mode).
 * Вместо этого мы парсим публичный HTML-код виджета плейлиста (Embed Widget),
 * извлекая все данные треков из встроенного скрипта __NEXT_DATA__.
 * Это позволяет скачивать плейлисты абсолютно бесплатно и без ключей API.
 */

export type ParsedTrack = {
  id: string;
  spotifyId: string;
  title: string;
  artists: string[];
  album: string;
  albumArtUrl: string | null;
  durationMs?: number;
};

/**
 * Извлекает ID плейлиста из стандартной ссылки Spotify.
 * @param url Ссылка на плейлист (например, https://open.spotify.com/playlist/...)
 * @returns Строка с ID или null, если ссылка неверна
 */
export function extractPlaylistId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'open.spotify.com' && parsed.hostname !== 'spotify.link') {
      return null;
    }
    const match = parsed.pathname.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Скачивает страницу виджета Spotify и парсит из неё JSON-данные.
 * Ограничение виджета: он отдает максимум 100 треков.
 * @param playlistId ID плейлиста Spotify
 */
export async function fetchPlaylist(playlistId: string) {
  const url = `https://open.spotify.com/embed/playlist/${playlistId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Не удалось загрузить страницу виджета Spotify');
  }
  const html = await response.text();

  // Ищем тег, в котором Next.js отдает сырые JSON-данные для гидратации
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
  if (!match) {
    throw new Error('Не удалось найти данные плейлиста в HTML-коде');
  }

  const data = JSON.parse(match[1]);
  const entity = data.props.pageProps.state?.data?.entity;

  if (!entity || entity.type !== 'playlist') {
    throw new Error('Неверный формат данных плейлиста');
  }

  const playlist = {
    id: entity.id,
    name: entity.name,
    images: [{ url: entity.coverArt?.sources?.[0]?.url || '' }],
  };

  const tracks: ParsedTrack[] = [];
  const trackList = entity.trackList || [];

  for (const item of trackList) {
    if (item.uri) {
      // Идентификатор трека теперь передается как spotify:track:id
      const spotifyId = item.uri.split(':').pop() || '';
      if (!spotifyId) continue;
      
      tracks.push({
        id: spotifyId,
        spotifyId: spotifyId,
        title: item.title,
        artists: item.subtitle ? item.subtitle.split(', ') : [],
        album: item.subtitle || '', // В виджете нет отдельного поля альбома, используем подзаголовок
        albumArtUrl: item.coverArt?.sources?.[0]?.url || null,
        durationMs: item.duration || 0,
      });
    }
  }

  // Удаляем дубликаты треков, если они были в плейлисте
  const uniqueTracks = Array.from(new Map(tracks.map(t => [t.spotifyId, t])).values());

  return { playlist, tracks: uniqueTracks };
}

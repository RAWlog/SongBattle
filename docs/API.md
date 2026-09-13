# Внутренний API проекта

В проекте намеренно отсутствует традиционный REST или GraphQL API (`/api/*`). Вместо этого используется архитектура **RPC поверх Next.js Server Actions**. Это гарантирует строгую типизацию от клиента до базы данных.

## Основные Actions (`src/app/actions`)

### `importPlaylist(url: string): Promise<{ success: boolean; tournamentId?: string; error?: string }>`
Инициирует парсинг публичного Spotify плейлиста. Внутри вызывает `spotify.service`, сохраняет треки в БД и немедленно вызывает `startTournament`.

### `importCsv(formData: FormData): Promise<{ success: boolean; tournamentId?: string; error?: string }>`
Альтернативный метод импорта треков через загрузку CSV-файла (обходит аппаратные лимиты Spotify Embed).

### `startTournament(tournamentId: string): Promise<{ success: boolean; error?: string }>`
Генерирует турнирную сетку на основе треков (с учетом BYE матчей) и сохраняет начальное состояние в базу данных.

### `submitVote(matchId: string, winnerId: string): Promise<{ success: boolean; error?: string }>`
Регистрирует голос пользователя. Внутри единой транзакции Prisma выполняет:
1. Завершение матча.
2. Пересчет Elo-рейтинга.
3. Продвижение победителя в следующий раунд.

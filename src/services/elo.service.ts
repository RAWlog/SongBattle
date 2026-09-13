/**
 * Сервис для расчета рейтинга Elo.
 * Elo — это система оценки относительного уровня мастерства игроков, изначально созданная для шахмат.
 * В нашем приложении она используется для формирования глобального топа любимых треков.
 */

// Коэффициент K определяет максимальное изменение рейтинга за одну игру.
// Значение 32 — это стандарт для новых игроков в шахматах, дает ощутимое смещение рейтинга.
export const ELO_K_FACTOR = 32;

/**
 * Рассчитывает математическое ожидание победы (от 0 до 1) для Игрока А против Игрока Б.
 * Если рейтинг А выше Б, ожидание будет больше 0.5.
 */
export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Вычисляет новые рейтинги обоих треков после завершения битвы.
 * @param ratingA Текущий рейтинг трека А
 * @param ratingB Текущий рейтинг трека Б
 * @param actualScoreA Результат трека А (1 — победа, 0 — поражение, 0.5 — ничья)
 * @returns Объект с новыми рейтингами для сохранения в БД
 */
export function calculateNewRatings(
  ratingA: number, 
  ratingB: number, 
  actualScoreA: number
): { newRatingA: number, newRatingB: number } {
  const expectedA = calculateExpectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;
  
  const actualScoreB = 1 - actualScoreA;
  
  const newRatingA = Math.round(ratingA + ELO_K_FACTOR * (actualScoreA - expectedA));
  const newRatingB = Math.round(ratingB + ELO_K_FACTOR * (actualScoreB - expectedB));
  
  return { newRatingA, newRatingB };
}

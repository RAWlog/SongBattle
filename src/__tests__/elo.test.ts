import { describe, it, expect } from 'vitest';
import { calculateExpectedScore, calculateNewRatings } from '@/services/elo.service';

describe('Elo Service', () => {
  it('должен правильно рассчитывать ожидание при равном рейтинге', () => {
    const expected = calculateExpectedScore(1000, 1000);
    expect(expected).toBe(0.5); // 50% шанс на победу
  });

  it('должен давать высокое ожидание для сильного игрока', () => {
    const expected = calculateExpectedScore(1400, 1000);
    expect(expected).toBeGreaterThan(0.5);
    expect(expected).toBeCloseTo(0.9, 1);
  });

  it('должен корректно обновлять рейтинг после победы (равные игроки)', () => {
    const { newRatingA, newRatingB } = calculateNewRatings(1000, 1000, 1);
    
    // Победитель получает очки (ожидание 0.5, K=32 -> 1000 + 32*(1-0.5) = 1016)
    expect(newRatingA).toBe(1016);
    // Проигравший теряет очки
    expect(newRatingB).toBe(984);
  });

  it('должен меньше менять рейтинг, если фаворит побеждает', () => {
    const { newRatingA, newRatingB } = calculateNewRatings(1400, 1000, 1);
    
    // Сильный игрок получает меньше очков за ожидаемую победу
    expect(newRatingA - 1400).toBeLessThan(16);
    // Слабый игрок теряет меньше очков
    expect(1000 - newRatingB).toBeLessThan(16);
  });
});

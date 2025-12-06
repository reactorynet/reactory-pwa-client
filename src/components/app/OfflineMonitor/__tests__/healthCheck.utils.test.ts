import {
  TM_BASE_DEFAULT,
  ApiCheckTotals,
  calculateTimeout,
  calculateNextBaseTimeout,
  classifyPerformance,
  calculateQualityScore,
} from '../healthCheck.utils';

describe('healthCheck.utils', () => {
  describe('calculateTimeout', () => {
    it('should return base timeout for fast responses', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 15, total: 15 };
      const result = calculateTimeout(2000, totals, TM_BASE_DEFAULT);
      expect(result).toBe(TM_BASE_DEFAULT);
    });

    it('should increase timeout by 1.25x for degraded responses', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 15, total: 15 };
      const result = calculateTimeout(5000, totals, TM_BASE_DEFAULT);
      expect(result).toBe(TM_BASE_DEFAULT * 1.25);
    });

    it('should increase timeout by 1.5x for slow responses', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 15, total: 15 };
      const result = calculateTimeout(8000, totals, TM_BASE_DEFAULT);
      expect(result).toBe(TM_BASE_DEFAULT * 1.5);
    });

    it('should not adjust timeout if total checks are less than 10', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 5, total: 5 };
      const result = calculateTimeout(8000, totals, TM_BASE_DEFAULT);
      expect(result).toBe(TM_BASE_DEFAULT);
    });
  });

  describe('calculateNextBaseTimeout', () => {
    it('should return default timeout for low total checks', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 3, total: 3 };
      const result = calculateNextBaseTimeout(totals);
      expect(result).toBe(TM_BASE_DEFAULT);
    });

    it('should return default timeout for success rate below 90%', () => {
      const totals: ApiCheckTotals = { error: 2, slow: 0, ok: 8, total: 10 };
      const result = calculateNextBaseTimeout(totals);
      expect(result).toBe(TM_BASE_DEFAULT);
    });

    it('should increase timeout by 1.3x for 90%+ success rate', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 9, total: 10 };
      const result = calculateNextBaseTimeout(totals);
      expect(result).toBe(TM_BASE_DEFAULT * 1.30);
    });

    it('should increase timeout by 1.5x for 95%+ success rate', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 19, total: 20 };
      const result = calculateNextBaseTimeout(totals);
      expect(result).toBe(TM_BASE_DEFAULT * 1.5);
    });

    it('should increase timeout by 2.5x for 98%+ success rate', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 99, total: 100 };
      const result = calculateNextBaseTimeout(totals);
      expect(result).toBe(TM_BASE_DEFAULT * 2.5);
    });
  });

  describe('classifyPerformance', () => {
    it('should classify as normal for fast responses', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 15, total: 15 };
      const result = classifyPerformance(2000, totals);
      expect(result).toBe('normal');
    });

    it('should classify as degraded for moderate delays', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 15, total: 15 };
      const result = classifyPerformance(5000, totals);
      expect(result).toBe('degraded');
    });

    it('should classify as slow for significant delays', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 15, total: 15 };
      const result = classifyPerformance(8000, totals);
      expect(result).toBe('slow');
    });

    it('should classify as normal for slow response with low total checks', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 5, total: 5 };
      const result = classifyPerformance(8000, totals);
      expect(result).toBe('normal');
    });
  });

  describe('calculateQualityScore', () => {
    it('should return 100 for perfect performance', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 100, total: 100 };
      const result = calculateQualityScore(totals);
      expect(result).toBe(100);
    });

    it('should reduce score for errors', () => {
      const totals: ApiCheckTotals = { error: 10, slow: 0, ok: 90, total: 100 };
      const result = calculateQualityScore(totals);
      expect(result).toBe(95); // 100 - (0.1 * 50) = 95
    });

    it('should reduce score for slow responses', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 10, ok: 90, total: 100 };
      const result = calculateQualityScore(totals);
      expect(result).toBe(97); // 100 - (0.1 * 30) = 97
    });

    it('should reduce score for both errors and slow responses', () => {
      const totals: ApiCheckTotals = { error: 10, slow: 10, ok: 80, total: 100 };
      const result = calculateQualityScore(totals);
      expect(result).toBe(92); // 100 - (0.1 * 50) - (0.1 * 30) = 92
    });

    it('should not go below zero', () => {
      const totals: ApiCheckTotals = { error: 100, slow: 100, ok: 0, total: 200 };
      const result = calculateQualityScore(totals);
      expect(result).toBe(0);
    });

    it('should return 100 for zero total checks', () => {
      const totals: ApiCheckTotals = { error: 0, slow: 0, ok: 0, total: 0 };
      const result = calculateQualityScore(totals);
      expect(result).toBe(100);
    });
  });
});

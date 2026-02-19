/**
 * (c) Copyright ZEPZ TECHNOLOGY SERVICES LIMITED 2024. All rights reserved.
 */

import { FeatureFlagFlowStatistic } from '../FeatureFlagFlowStatistic';

describe('FeatureFlagFlowStatistic', () => {
  let statistic: FeatureFlagFlowStatistic;

  beforeEach(() => {
    statistic = new FeatureFlagFlowStatistic();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(statistic.requestCount).toBe(0);
      expect(statistic.executedCount).toBe(0);
      expect(statistic.failedCount).toBe(0);
      expect(statistic.successCount).toBe(0);
      expect(statistic.lastExecution.getTime()).toBe(0); // EPOCH
      expect(statistic.trackingSince).toBeInstanceOf(Date);
    });
  });

  describe('onRequested', () => {
    it('should increment request count', () => {
      statistic.onRequested();
      expect(statistic.requestCount).toBe(1);

      statistic.onRequested();
      expect(statistic.requestCount).toBe(2);
    });
  });

  describe('onSuccess', () => {
    it('should increment success count and executed count', () => {
      const beforeTime = new Date();
      statistic.onSuccess();
      const afterTime = new Date();

      expect(statistic.successCount).toBe(1);
      expect(statistic.executedCount).toBe(1);
      expect(statistic.failedCount).toBe(0);
      expect(statistic.lastExecution.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(statistic.lastExecution.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should update last execution time', () => {
      const beforeTime = new Date();
      statistic.onSuccess();
      const afterTime = new Date();

      expect(statistic.lastExecution.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(statistic.lastExecution.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('onFailed', () => {
    it('should increment failed count and executed count', () => {
      const beforeTime = new Date();
      statistic.onFailed();
      const afterTime = new Date();

      expect(statistic.failedCount).toBe(1);
      expect(statistic.executedCount).toBe(1);
      expect(statistic.successCount).toBe(0);
      expect(statistic.lastExecution.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(statistic.lastExecution.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('getFlowRate', () => {
    it('should return -1 when no requests', () => {
      expect(statistic.getFlowRate()).toBe(-1);
    });

    it('should return -1 when no executions', () => {
      statistic.onRequested();
      expect(statistic.getFlowRate()).toBe(-1);
    });

    it('should calculate flow rate correctly', () => {
      statistic.onRequested(); // 1 request
      statistic.onRequested(); // 2 requests
      statistic.onSuccess();   // 1 execution
      statistic.onRequested(); // 3 requests
      statistic.onSuccess();   // 2 executions

      // Flow rate = (executed / requested) * 100 = (2/3) * 100 = 66.67
      expect(statistic.getFlowRate()).toBeCloseTo(66.67, 1);
    });

    it('should return 100 when all requests are executed', () => {
      statistic.onRequested();
      statistic.onSuccess();
      statistic.onRequested();
      statistic.onSuccess();

      expect(statistic.getFlowRate()).toBe(100);
    });
  });

  describe('getFailureRate', () => {
    it('should return -1 when no executions', () => {
      expect(statistic.getFailureRate()).toBe(-1);
    });

    it('should return -1 when no failures', () => {
      statistic.onSuccess();
      expect(statistic.getFailureRate()).toBe(-1);
    });

    it('should calculate failure rate correctly', () => {
      statistic.onSuccess();  // 1 success
      statistic.onFailed();   // 1 failure
      statistic.onSuccess();  // 2 successes
      statistic.onFailed();   // 2 failures

      // Failure rate = (failed / executed) * 100 = (2/4) * 100 = 50
      expect(statistic.getFailureRate()).toBe(50);
    });

    it('should return 100 when all executions fail', () => {
      statistic.onFailed();
      statistic.onFailed();

      expect(statistic.getFailureRate()).toBe(100);
    });
  });

  describe('getSuccessRate', () => {
    it('should return -1 when no executions', () => {
      expect(statistic.getSuccessRate()).toBe(-1);
    });

    it('should return -1 when no successes', () => {
      statistic.onFailed();
      expect(statistic.getSuccessRate()).toBe(-1);
    });

    it('should calculate success rate correctly', () => {
      statistic.onSuccess();  // 1 success
      statistic.onFailed();   // 1 failure
      statistic.onSuccess();  // 2 successes
      statistic.onFailed();   // 2 failures

      // Success rate = (success / executed) * 100 = (2/4) * 100 = 50
      expect(statistic.getSuccessRate()).toBe(50);
    });

    it('should return 100 when all executions succeed', () => {
      statistic.onSuccess();
      statistic.onSuccess();

      expect(statistic.getSuccessRate()).toBe(100);
    });
  });

  describe('getTPS', () => {
    it('should return 0 when no executions', () => {
      expect(statistic.getTPS()).toBe(0);
    });

    it('should calculate TPS correctly', () => {
      // Simulate some executions over time
      statistic.onSuccess();
      statistic.onSuccess();
      statistic.onSuccess();

      // TPS should be calculated based on time difference
      const tps = statistic.getTPS();
      expect(tps).toBeGreaterThan(0);
      expect(typeof tps).toBe('number');
    });
  });

  describe('reset', () => {
    it('should reset all counters to initial values', () => {
      // Add some data
      statistic.onRequested();
      statistic.onSuccess();
      statistic.onFailed();
      statistic.onSuccess();

      // Reset
      statistic.reset();

      expect(statistic.requestCount).toBe(0);
      expect(statistic.executedCount).toBe(0);
      expect(statistic.failedCount).toBe(0);
      expect(statistic.successCount).toBe(0);
      expect(statistic.lastExecution.getTime()).toBe(0); // EPOCH
      expect(statistic.trackingSince).toBeInstanceOf(Date);
    });

    it('should update trackingSince to current time', () => {
      const beforeReset = new Date();
      statistic.reset();
      const afterReset = new Date();

      expect(statistic.trackingSince.getTime()).toBeGreaterThanOrEqual(beforeReset.getTime());
      expect(statistic.trackingSince.getTime()).toBeLessThanOrEqual(afterReset.getTime());
    });
  });

  describe('toString', () => {
    it('should return formatted string representation', () => {
      statistic.onRequested();
      statistic.onSuccess();
      statistic.onFailed();

      const result = statistic.toString();
      expect(result).toContain('FeatureFlagFlowStatistic');
      expect(result).toContain('requestCount=1');
      expect(result).toContain('executedCount=2');
      expect(result).toContain('flowRate=');
      expect(result).toContain('successRate=');
      expect(result).toContain('failRate=');
      expect(result).toContain('tps=');
    });
  });

  describe('edge cases', () => {
    it('should handle rapid successive calls', () => {
      for (let i = 0; i < 100; i++) {
        statistic.onRequested();
        if (i % 2 === 0) {
          statistic.onSuccess();
        } else {
          statistic.onFailed();
        }
      }

      expect(statistic.requestCount).toBe(100);
      expect(statistic.executedCount).toBe(100);
      expect(statistic.successCount).toBe(50);
      expect(statistic.failedCount).toBe(50);
    });

    it('should handle very large numbers', () => {
      for (let i = 0; i < 10000; i++) {
        statistic.onRequested();
        statistic.onSuccess();
      }

      expect(statistic.requestCount).toBe(10000);
      expect(statistic.executedCount).toBe(10000);
      expect(statistic.getFlowRate()).toBe(100);
      expect(statistic.getSuccessRate()).toBe(100);
    });
  });
}); 
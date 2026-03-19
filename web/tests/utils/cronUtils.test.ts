import { describe, it, expect } from 'vitest';
import {
  validateCronExpression,
  cronToHumanReadable,
  getNextRunTimes,
  formatNextRun,
  CRON_PRESETS,
} from '@/utils/cronUtils';

describe('cronUtils', () => {
  describe('validateCronExpression', () => {
    it('should validate correct cron expressions', () => {
      const validCrons = [
        '* * * * *',
        '0 * * * *',
        '0 0 * * *',
        '*/5 * * * *',
        '0 */6 * * *',
        '0 0 1 * *',
        '0 0 * * 1',
        '30 14 * * *',
        '0,30 * * * *',
        '0 0 1,15 * *',
        '0 0 * 1-6 *',
      ];

      validCrons.forEach((cron) => {
        const result = validateCronExpression(cron);
        expect(result.isValid, `Expected "${cron}" to be valid`).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject empty or null expressions', () => {
      const result = validateCronExpression('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cron expression is required');
    });

    it('should reject expressions with wrong number of fields', () => {
      const result4 = validateCronExpression('* * * *');
      expect(result4.isValid).toBe(false);
      expect(result4.errors[0]).toContain('Expected 5 fields');

      const result6 = validateCronExpression('* * * * * *');
      expect(result6.isValid).toBe(false);
      expect(result6.errors[0]).toContain('Expected 5 fields');
    });

    it('should reject invalid minute values', () => {
      const result = validateCronExpression('60 * * * *');
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors).toHaveProperty('minute');
    });

    it('should reject invalid hour values', () => {
      const result = validateCronExpression('0 24 * * *');
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors).toHaveProperty('hour');
    });

    it('should reject invalid day of month values', () => {
      const result = validateCronExpression('0 0 32 * *');
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors).toHaveProperty('dayOfMonth');
    });

    it('should reject invalid month values', () => {
      const result = validateCronExpression('0 0 * 13 *');
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors).toHaveProperty('month');
    });

    it('should reject invalid day of week values', () => {
      const result = validateCronExpression('0 0 * * 7');
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors).toHaveProperty('dayOfWeek');
    });

    it('should validate step values', () => {
      expect(validateCronExpression('*/5 * * * *').isValid).toBe(true);
      expect(validateCronExpression('0 */2 * * *').isValid).toBe(true);
      expect(validateCronExpression('0 0 */7 * *').isValid).toBe(true);
    });

    it('should validate range values', () => {
      expect(validateCronExpression('0 9-17 * * *').isValid).toBe(true);
      expect(validateCronExpression('0 0 * * 1-5').isValid).toBe(true);
      expect(validateCronExpression('0 0 1-15 * *').isValid).toBe(true);
    });

    it('should validate list values', () => {
      expect(validateCronExpression('0,30 * * * *').isValid).toBe(true);
      expect(validateCronExpression('0 0,12 * * *').isValid).toBe(true);
      expect(validateCronExpression('0 0 * * 1,3,5').isValid).toBe(true);
    });
  });

  describe('cronToHumanReadable', () => {
    it('should describe "every minute"', () => {
      expect(cronToHumanReadable('* * * * *')).toBe('Every minute');
    });

    it('should describe step intervals', () => {
      expect(cronToHumanReadable('*/5 * * * *')).toBe('Every 5 minutes');
      expect(cronToHumanReadable('*/15 * * * *')).toBe('Every 15 minutes');
      expect(cronToHumanReadable('*/30 * * * *')).toBe('Every 30 minutes');
    });

    it('should describe hourly schedules', () => {
      expect(cronToHumanReadable('0 * * * *')).toBe('At minute 0 of every hour');
      expect(cronToHumanReadable('30 * * * *')).toBe('At minute 30 of every hour');
    });

    it('should describe daily schedules at specific times', () => {
      const result = cronToHumanReadable('0 0 * * *');
      expect(result).toContain('12:00 AM');

      const result6am = cronToHumanReadable('0 6 * * *');
      expect(result6am).toContain('6:00 AM');

      const result2pm = cronToHumanReadable('30 14 * * *');
      expect(result2pm).toContain('2:30 PM');
    });

    it('should describe weekly schedules', () => {
      const result = cronToHumanReadable('0 0 * * 1');
      expect(result).toContain('Monday');
    });

    it('should describe monthly schedules', () => {
      const result = cronToHumanReadable('0 0 1 * *');
      expect(result).toContain('1st');
    });

    it('should describe day of week ranges', () => {
      const result = cronToHumanReadable('0 0 * * 1-5');
      expect(result).toContain('Monday');
      expect(result).toContain('Friday');
    });

    it('should describe multiple days of week', () => {
      const result = cronToHumanReadable('0 0 * * 1,3,5');
      expect(result).toContain('Monday');
      expect(result).toContain('Wednesday');
      expect(result).toContain('Friday');
    });

    it('should describe months', () => {
      const result = cronToHumanReadable('0 0 1 6 *');
      expect(result).toContain('June');
    });

    it('should return error message for invalid cron', () => {
      expect(cronToHumanReadable('invalid')).toBe('Invalid cron expression');
      expect(cronToHumanReadable('')).toBe('Invalid cron expression');
    });
  });

  describe('getNextRunTimes', () => {
    it('should return empty array for invalid cron', () => {
      expect(getNextRunTimes('invalid')).toEqual([]);
      expect(getNextRunTimes('')).toEqual([]);
    });

    it('should return requested number of dates', () => {
      const result = getNextRunTimes('* * * * *', 5);
      expect(result).toHaveLength(5);
    });

    it('should return Date objects', () => {
      const result = getNextRunTimes('* * * * *', 1);
      expect(result[0]).toBeInstanceOf(Date);
    });

    it('should return dates in the future', () => {
      const now = new Date();
      const result = getNextRunTimes('* * * * *', 3);

      result.forEach((date) => {
        expect(date.getTime()).toBeGreaterThan(now.getTime());
      });
    });

    it('should return dates in chronological order', () => {
      const result = getNextRunTimes('*/5 * * * *', 3);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].getTime()).toBeGreaterThan(result[i - 1].getTime());
      }
    });

    it('should respect minute step values', () => {
      const result = getNextRunTimes('*/15 * * * *', 4);

      result.forEach((date) => {
        expect(date.getMinutes() % 15).toBe(0);
      });
    });

    it('should default to 3 results', () => {
      const result = getNextRunTimes('* * * * *');
      expect(result).toHaveLength(3);
    });
  });

  describe('formatNextRun', () => {
    it('should format dates within an hour', () => {
      const now = new Date();
      const in30Mins = new Date(now.getTime() + 30 * 60 * 1000);

      const result = formatNextRun(in30Mins);
      expect(result).toContain('30 minutes');
    });

    it('should format dates today', () => {
      const now = new Date();
      const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Only test if still today
      if (in2Hours.getDate() === now.getDate()) {
        const result = formatNextRun(in2Hours);
        expect(result).toContain('today');
      }
    });

    it('should format dates tomorrow', () => {
      const now = new Date();
      // Set to tomorrow at a specific time to avoid timezone issues
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);

      const result = formatNextRun(tomorrow);
      // The result should either contain 'tomorrow' or a day name
      expect(result).toMatch(/tomorrow|at/);
    });

    it('should include time in format', () => {
      const future = new Date();
      future.setDate(future.getDate() + 3);
      future.setHours(14, 30, 0, 0);

      const result = formatNextRun(future);
      // Should include time in some format
      expect(result).toMatch(/\d+:\d+/);
    });
  });

  describe('CRON_PRESETS', () => {
    it('should have valid cron expressions', () => {
      CRON_PRESETS.forEach((preset) => {
        const result = validateCronExpression(preset.value);
        expect(result.isValid, `Preset "${preset.label}" should be valid`).toBe(true);
      });
    });

    it('should have unique values', () => {
      const values = CRON_PRESETS.map((p) => p.value);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });

    it('should include common presets', () => {
      const labels = CRON_PRESETS.map((p) => p.label.toLowerCase());

      expect(labels.some((l) => l.includes('minute'))).toBe(true);
      expect(labels.some((l) => l.includes('hour'))).toBe(true);
      expect(labels.some((l) => l.includes('daily'))).toBe(true);
      expect(labels.some((l) => l.includes('weekly'))).toBe(true);
      expect(labels.some((l) => l.includes('monthly'))).toBe(true);
    });
  });
});

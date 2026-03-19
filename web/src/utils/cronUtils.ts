/**
 * Cron Expression Utilities
 *
 * Validates and describes cron expressions in human-readable format.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 */

// Validation patterns for each cron field
const CRON_FIELD_PATTERNS = {
  minute: /^(\*|([0-5]?\d)(,[0-5]?\d)*|([0-5]?\d)-([0-5]?\d)|\*\/([1-9]|[1-5]\d))$/,
  hour: /^(\*|([01]?\d|2[0-3])(,[01]?\d|,2[0-3])*|([01]?\d|2[0-3])-([01]?\d|2[0-3])|\*\/([1-9]|1\d|2[0-3]))$/,
  dayOfMonth: /^(\*|([1-9]|[12]\d|3[01])(,[1-9]|,[12]\d|,3[01])*|([1-9]|[12]\d|3[01])-([1-9]|[12]\d|3[01])|\*\/([1-9]|[12]\d|3[01]))$/,
  month: /^(\*|([1-9]|1[0-2])(,[1-9]|,1[0-2])*|([1-9]|1[0-2])-([1-9]|1[0-2])|\*\/([1-9]|1[0-2]))$/,
  dayOfWeek: /^(\*|[0-6](,[0-6])*|[0-6]-[0-6]|\*\/[1-6])$/,
};

const FIELD_NAMES = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'] as const;

export interface CronValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: Record<string, string>;
}

/**
 * Validates a cron expression and returns detailed errors
 */
export function validateCronExpression(cron: string): CronValidationResult {
  const result: CronValidationResult = {
    isValid: true,
    errors: [],
    fieldErrors: {},
  };

  if (!cron || typeof cron !== 'string') {
    result.isValid = false;
    result.errors.push('Cron expression is required');
    return result;
  }

  const parts = cron.trim().split(/\s+/);

  if (parts.length !== 5) {
    result.isValid = false;
    result.errors.push(`Expected 5 fields, got ${parts.length}`);
    return result;
  }

  const fieldLabels = {
    minute: 'Minute (0-59)',
    hour: 'Hour (0-23)',
    dayOfMonth: 'Day of month (1-31)',
    month: 'Month (1-12)',
    dayOfWeek: 'Day of week (0-6)',
  };

  parts.forEach((part, index) => {
    const fieldName = FIELD_NAMES[index];
    const pattern = CRON_FIELD_PATTERNS[fieldName];

    if (!pattern.test(part)) {
      result.isValid = false;
      result.fieldErrors[fieldName] = `Invalid ${fieldLabels[fieldName]}: "${part}"`;
      result.errors.push(result.fieldErrors[fieldName]);
    }
  });

  return result;
}

/**
 * Converts a cron expression to a human-readable description
 */
export function cronToHumanReadable(cron: string): string {
  const validation = validateCronExpression(cron);
  if (!validation.isValid) {
    return 'Invalid cron expression';
  }

  const parts = cron.trim().split(/\s+/);
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Build description based on pattern
  const descriptions: string[] = [];

  // Time description
  const timeDesc = describeTime(minute, hour);
  if (timeDesc) descriptions.push(timeDesc);

  // Day of week
  if (dayOfWeek !== '*') {
    descriptions.push(describeDayOfWeek(dayOfWeek));
  }

  // Day of month
  if (dayOfMonth !== '*') {
    descriptions.push(describeDayOfMonth(dayOfMonth));
  }

  // Month
  if (month !== '*') {
    descriptions.push(describeMonth(month));
  }

  if (descriptions.length === 0) {
    return 'Every minute';
  }

  return descriptions.join(', ');
}

function describeTime(minute: string, hour: string): string {
  // Every minute
  if (minute === '*' && hour === '*') {
    return 'Every minute';
  }

  // Every X minutes
  if (minute.startsWith('*/')) {
    const interval = minute.slice(2);
    if (hour === '*') {
      return `Every ${interval} minute${interval !== '1' ? 's' : ''}`;
    }
    return `Every ${interval} minute${interval !== '1' ? 's' : ''} during hour ${hour}`;
  }

  // Every hour at minute X
  if (hour === '*' && minute !== '*') {
    return `At minute ${minute} of every hour`;
  }

  // Every X hours
  if (hour.startsWith('*/')) {
    const interval = hour.slice(2);
    const minStr = minute === '0' ? '' : ` at minute ${minute}`;
    return `Every ${interval} hour${interval !== '1' ? 's' : ''}${minStr}`;
  }

  // Specific time
  if (minute !== '*' && hour !== '*') {
    const hourNum = parseInt(hour, 10);
    const minNum = parseInt(minute, 10);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    const displayMin = minNum.toString().padStart(2, '0');
    return `At ${displayHour}:${displayMin} ${period}`;
  }

  return '';
}

function describeDayOfWeek(dayOfWeek: string): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Multiple days
  if (dayOfWeek.includes(',')) {
    const days = dayOfWeek.split(',').map((d) => dayNames[parseInt(d, 10)]);
    if (days.length === 2) {
      return `on ${days[0]} and ${days[1]}`;
    }
    return `on ${days.slice(0, -1).join(', ')}, and ${days[days.length - 1]}`;
  }

  // Range
  if (dayOfWeek.includes('-')) {
    const [start, end] = dayOfWeek.split('-').map((d) => dayNames[parseInt(d, 10)]);
    return `${start} through ${end}`;
  }

  // Single day
  const dayNum = parseInt(dayOfWeek, 10);
  if (!isNaN(dayNum)) {
    return `on ${dayNames[dayNum]}`;
  }

  return '';
}

function describeDayOfMonth(dayOfMonth: string): string {
  // Multiple days
  if (dayOfMonth.includes(',')) {
    const days = dayOfMonth.split(',');
    if (days.length === 2) {
      return `on the ${ordinal(parseInt(days[0]))} and ${ordinal(parseInt(days[1]))}`;
    }
    return `on days ${days.join(', ')} of the month`;
  }

  // Range
  if (dayOfMonth.includes('-')) {
    const [start, end] = dayOfMonth.split('-');
    return `from the ${ordinal(parseInt(start))} to the ${ordinal(parseInt(end))}`;
  }

  // Every X days
  if (dayOfMonth.startsWith('*/')) {
    return `every ${dayOfMonth.slice(2)} days`;
  }

  // Single day
  const day = parseInt(dayOfMonth, 10);
  if (!isNaN(day)) {
    return `on the ${ordinal(day)} of the month`;
  }

  return '';
}

function describeMonth(month: string): string {
  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Multiple months
  if (month.includes(',')) {
    const months = month.split(',').map((m) => monthNames[parseInt(m, 10)]);
    if (months.length === 2) {
      return `in ${months[0]} and ${months[1]}`;
    }
    return `in ${months.slice(0, -1).join(', ')}, and ${months[months.length - 1]}`;
  }

  // Range
  if (month.includes('-')) {
    const [start, end] = month.split('-').map((m) => monthNames[parseInt(m, 10)]);
    return `from ${start} through ${end}`;
  }

  // Every X months
  if (month.startsWith('*/')) {
    return `every ${month.slice(2)} months`;
  }

  // Single month
  const monthNum = parseInt(month, 10);
  if (!isNaN(monthNum)) {
    return `in ${monthNames[monthNum]}`;
  }

  return '';
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Calculates the next N run times for a cron expression
 */
export function getNextRunTimes(cron: string, count: number = 3): Date[] {
  const validation = validateCronExpression(cron);
  if (!validation.isValid) {
    return [];
  }

  const parts = cron.trim().split(/\s+/);
  const [minuteExpr, hourExpr, dayOfMonthExpr, monthExpr, dayOfWeekExpr] = parts;

  const results: Date[] = [];
  const now = new Date();
  let current = new Date(now);
  current.setSeconds(0, 0);

  // Move to next minute
  current.setMinutes(current.getMinutes() + 1);

  // Limit iterations to prevent infinite loops
  const maxIterations = 525600; // 1 year in minutes
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    if (
      matchesField(current.getMinutes(), minuteExpr) &&
      matchesField(current.getHours(), hourExpr) &&
      matchesField(current.getDate(), dayOfMonthExpr) &&
      matchesField(current.getMonth() + 1, monthExpr) &&
      matchesField(current.getDay(), dayOfWeekExpr)
    ) {
      results.push(new Date(current));
    }

    current.setMinutes(current.getMinutes() + 1);
  }

  return results;
}

function matchesField(value: number, expr: string): boolean {
  if (expr === '*') return true;

  // Step values (*/5)
  if (expr.startsWith('*/')) {
    const step = parseInt(expr.slice(2), 10);
    return value % step === 0;
  }

  // Range (1-5)
  if (expr.includes('-') && !expr.includes(',')) {
    const [start, end] = expr.split('-').map(Number);
    return value >= start && value <= end;
  }

  // List (1,3,5)
  if (expr.includes(',')) {
    const values = expr.split(',').map(Number);
    return values.includes(value);
  }

  // Exact match
  return parseInt(expr, 10) === value;
}

/**
 * Formats a date for display
 */
export function formatNextRun(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Within an hour
  if (diffMins < 60) {
    return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''} (${timeStr})`;
  }

  // Today
  if (diffDays === 0) {
    return `today at ${timeStr}`;
  }

  // Tomorrow
  if (diffDays === 1) {
    return `tomorrow at ${timeStr}`;
  }

  // Within a week
  if (diffDays < 7) {
    return `${dateStr} at ${timeStr}`;
  }

  // Beyond a week
  return `${dateStr} at ${timeStr}`;
}

/**
 * Common cron presets for quick selection
 */
export const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Daily at noon', value: '0 12 * * *' },
  { label: 'Weekly on Monday', value: '0 0 * * 1' },
  { label: 'Monthly on the 1st', value: '0 0 1 * *' },
] as const;

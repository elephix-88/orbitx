import React, { useState, useEffect, useMemo } from 'react';
import { Select } from './Select';
import { Input } from './Input';
import { TimePicker } from './TimePicker';
import { cronToHumanReadable, getNextRunTimes, formatNextRun, CRON_PRESETS, validateCronExpression } from '@/utils/cronUtils';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  customCron?: string;
}

interface ScheduleSelectorProps {
  value: string; // cron expression
  onChange: (_cronExpression: string) => void;
  error?: string;
}

export const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({
  value,
  onChange,
  error
}) => {
  const [config, setConfig] = useState<ScheduleConfig>({
    frequency: 'daily',
    time: '00:00'
  });

  // Convert cron to user-friendly config on mount
  useEffect(() => {
    const parsed = parseCronExpression(value);
    if (parsed) {
      setConfig(parsed);
    }
  }, [value]);

  // Convert config to cron and notify parent
  useEffect(() => {
    const cronExpression = configToCron(config);
    if (cronExpression !== value) {
      onChange(cronExpression);
    }
  }, [config, onChange, value]);

  const handleFrequencyChange = (frequency: string) => {
    const newConfig: ScheduleConfig = {
      frequency: frequency as ScheduleConfig['frequency'],
      time: config.time || '00:00'
    };

    // Set sensible defaults based on frequency
    if (frequency === 'weekly') {
      newConfig.dayOfWeek = 1; // Monday
    } else if (frequency === 'monthly') {
      newConfig.dayOfMonth = 1; // 1st of month
    }

    setConfig(newConfig);
  };

  const frequencyOptions = [
    { value: 'hourly', label: 'Every hour' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom (Advanced)' }
  ];

  const dayOfWeekOptions = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' }
  ];

  // Use the cronUtils for human-readable description
  const scheduleDescription = useMemo(() => {
    return cronToHumanReadable(value);
  }, [value]);

  // Calculate next run times
  const nextRuns = useMemo(() => {
    return getNextRunTimes(value, 3);
  }, [value]);

  // Validate custom cron
  const customCronValidation = useMemo(() => {
    if (config.frequency !== 'custom') return null;
    return validateCronExpression(value);
  }, [config.frequency, value]);

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-2.5">
          Schedule Frequency
        </label>
        <Select
          options={frequencyOptions}
          value={config.frequency}
          onChange={(freq) => handleFrequencyChange(String(freq))}
        />
      </div>

      {/* Time picker for non-hourly schedules */}
      {config.frequency !== 'hourly' && config.frequency !== 'custom' && (
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2.5">
            Time
          </label>
          <TimePicker
            value={config.time || '00:00'}
            onChange={(newTime) => setConfig(prev => ({ ...prev, time: newTime }))}
          />
          <p className="mt-1.5 text-sm text-text-tertiary">
            24-hour format
          </p>
        </div>
      )}

      {/* Day of week picker for weekly */}
      {config.frequency === 'weekly' && (
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2.5">
            Day of Week
          </label>
          <Select
            options={dayOfWeekOptions}
            value={String(config.dayOfWeek || 1)}
            onChange={(day) => setConfig(prev => ({ ...prev, dayOfWeek: Number(day) }))}
          />
        </div>
      )}

      {/* Day of month picker for monthly */}
      {config.frequency === 'monthly' && (
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2.5">
            Day of Month
          </label>
          <Input
            type="number"
            min="1"
            max="31"
            value={String(config.dayOfMonth || 1)}
            onChange={(e) => setConfig(prev => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
            helperText="Day of the month (1-31)"
          />
        </div>
      )}

      {/* Custom cron input */}
      {config.frequency === 'custom' && (
        <div className="space-y-4">
          {/* Quick presets */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2.5">
              Quick Presets
            </label>
            <Select
              options={CRON_PRESETS.map(p => ({ value: p.value, label: p.label }))}
              value={value}
              onChange={(newValue) => onChange(String(newValue))}
              placeholder="Select a preset..."
            />
          </div>

          {/* Manual input */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2.5">
              Cron Expression
            </label>
            <div className="relative">
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0 0 * * *"
                error={error || (customCronValidation && !customCronValidation.isValid ? customCronValidation.errors[0] : undefined)}
                className={customCronValidation?.isValid ? 'pr-10' : ''}
              />
              {customCronValidation && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {customCronValidation.isValid ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs text-text-tertiary font-mono">
              Format: minute(0-59) hour(0-23) day(1-31) month(1-12) weekday(0-6)
            </p>
          </div>
        </div>
      )}

      {/* Schedule preview with next run times */}
      <div className="rounded-xl border border-primary-400/20 bg-primary-400/5 overflow-hidden">
        {/* Description */}
        <div className="p-4 border-b border-primary-400/10">
          <div className="flex items-start space-x-3">
            <div className="text-primary-400 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary mb-1">
                Schedule Description
              </p>
              <p className="text-sm text-text-secondary">
                {scheduleDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Next run times */}
        {nextRuns.length > 0 && (
          <div className="p-4 bg-surface-primary/30">
            <div className="flex items-start space-x-3">
              <div className="text-emerald-400 mt-0.5">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text-primary mb-2">
                  Next Run Times
                </p>
                <ul className="space-y-1.5">
                  {nextRuns.map((run, idx) => (
                    <li key={idx} className="text-sm text-text-secondary flex items-center">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-900/30 text-emerald-400 text-xs font-medium mr-2">
                        {idx + 1}
                      </span>
                      {formatNextRun(run)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && config.frequency !== 'custom' && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
};

// Helper functions
function parseCronExpression(cron: string): ScheduleConfig | null {
  if (!cron) return null;
  
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  
  const [minute, hour, day, month, weekday] = parts;
  
  // Hourly: "0 * * * *"
  if (minute === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return { frequency: 'hourly' };
  }
  
  // Daily: "0 6 * * *" (6 AM daily)
  if (day === '*' && month === '*' && weekday === '*' && minute !== '*' && hour !== '*') {
    return {
      frequency: 'daily',
      time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
    };
  }
  
  // Weekly: "0 6 * * 1" (6 AM on Monday)
  if (day === '*' && month === '*' && weekday !== '*' && minute !== '*' && hour !== '*') {
    return {
      frequency: 'weekly',
      time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
      dayOfWeek: Number(weekday)
    };
  }
  
  // Monthly: "0 6 1 * *" (6 AM on 1st of month)
  if (day !== '*' && month === '*' && weekday === '*' && minute !== '*' && hour !== '*') {
    return {
      frequency: 'monthly',
      time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
      dayOfMonth: Number(day)
    };
  }
  
  // Custom/unknown pattern
  return {
    frequency: 'custom',
    customCron: cron
  };
}

function configToCron(config: ScheduleConfig): string {
  switch (config.frequency) {
    case 'hourly':
      return '0 * * * *';
    
    case 'daily': {
      const [hour, minute] = (config.time || '00:00').split(':');
      return `${minute} ${hour} * * *`;
    }
    
    case 'weekly': {
      const [hour, minute] = (config.time || '00:00').split(':');
      return `${minute} ${hour} * * ${config.dayOfWeek || 1}`;
    }
    
    case 'monthly': {
      const [hour, minute] = (config.time || '00:00').split(':');
      return `${minute} ${hour} ${config.dayOfMonth || 1} * *`;
    }
    
    case 'custom':
      return config.customCron || '0 0 * * *';
    
    default:
      return '0 0 * * *';
  }
}


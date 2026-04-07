import React, { useMemo } from 'react';
import { Select } from './Select';

interface TimePickerProps {
  value: string; // HH:MM format
  onChange: (_value: string) => void;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  className = ""
}) => {
  // Parse current value
  const [hours, minutes] = useMemo(() => {
    if (!value || !value.includes(':')) return ['00', '00'];
    return value.split(':');
  }, [value]);

  // Generate options
  const hourOptions = useMemo(() => 
    Array.from({ length: 24 }, (_, i) => {
      const val = i.toString().padStart(2, '0');
      return { value: val, label: val };
    }), 
  []);

  const minuteOptions = useMemo(() => 
    Array.from({ length: 60 }, (_, i) => {
      const val = i.toString().padStart(2, '0');
      return { value: val, label: val };
    }), 
  []);

  const handleHourChange = (newHour: string | number) => {
    onChange(`${newHour}:${minutes}`);
  };

  const handleMinuteChange = (newMinute: string | number) => {
    onChange(`${hours}:${newMinute}`);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1">
        <Select
          options={hourOptions}
          value={hours}
          onChange={handleHourChange}
          placeholder="HH"
          className="w-full"
        />
      </div>
      <span className="text-text-tertiary font-bold text-lg">:</span>
      <div className="flex-1">
        <Select
          options={minuteOptions}
          value={minutes}
          onChange={handleMinuteChange}
          placeholder="MM"
          className="w-full"
        />
      </div>
    </div>
  );
};

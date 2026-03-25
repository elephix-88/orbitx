
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (_selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div
        className="flex items-center justify-between w-full px-3 py-2.5 text-left bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer hover:border-neutral-600 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-2">
          {selected.length === 0 ? (
            <span className="text-text-tertiary text-sm">{placeholder}</span>
          ) : (
            selected.map((value) => {
              const label = options.find((opt) => opt.value === value)?.label || value;
              return (
                <div key={value} className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary-400/10 text-primary-400 rounded-md border border-primary-400/20">
                  {label}
                  <X className="w-3 h-3 cursor-pointer hover:text-primary-300" onClick={(e) => { e.stopPropagation(); handleRemove(value); }} />
                </div>
              );
            })
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-surface-secondary border border-neutral-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <ul className="py-1 overflow-y-auto max-h-60">
            {options.map((option) => (
              <li
                key={option.value}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                  selected.includes(option.value)
                    ? 'bg-primary-400/10 text-primary-400 font-medium'
                    : 'text-text-primary hover:bg-neutral-800'
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

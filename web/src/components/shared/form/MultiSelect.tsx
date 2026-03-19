
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
        className="flex items-center justify-between w-full px-3 py-2.5 text-left bg-[#0F1729] border border-[rgba(0,212,255,0.12)] rounded-[4px] cursor-pointer hover:border-[rgba(0,212,255,0.25)] transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-2">
          {selected.length === 0 ? (
            <span className="text-[#506080] text-sm">{placeholder}</span>
          ) : (
            selected.map((value) => {
              const label = options.find((opt) => opt.value === value)?.label || value;
              return (
                <div key={value} className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-[rgba(0,212,255,0.08)] text-[#00D4FF] rounded-[4px] border border-[rgba(0,212,255,0.2)]">
                  {label}
                  <X className="w-3 h-3 cursor-pointer hover:text-[#E8ECF4]" onClick={(e) => { e.stopPropagation(); handleRemove(value); }} />
                </div>
              );
            })
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-[#8896AD] transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-[#1A2744] border border-[rgba(0,212,255,0.12)] rounded-[4px] shadow-[0_0_12px_rgba(0,212,255,0.08)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <ul className="py-1 overflow-y-auto max-h-60">
            {options.map((option) => (
              <li
                key={option.value}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                  selected.includes(option.value)
                    ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF] font-medium'
                    : 'text-[#E8ECF4] hover:bg-[rgba(0,212,255,0.08)]'
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

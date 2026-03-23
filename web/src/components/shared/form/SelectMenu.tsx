import React, { useEffect, useMemo, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string; disabled?: boolean };

interface SelectMenuProps {
  value?: string;
  onChange?: (_value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}

export const SelectMenu: React.FC<SelectMenuProps> = ({
  value: _value,
  onChange,
  options,
  placeholder = 'Select…',
  searchable = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === _value);
  const filtered = useMemo(() => {
    if (!searchable || !query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchable, query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!btnRef.current || !listRef.current) return;
      if (
        !btnRef.current.contains(e.target as Node) &&
        !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const commit = (val: string) => {
    onChange?.(val);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt && !opt.disabled) commit(opt.value);
    }
  };

  // Stop event propagation to prevent clicks from reaching parent elements
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={`relative ${className || ''}`} onKeyDown={onKeyDown} onClick={stopPropagation} onMouseDown={stopPropagation}>
      <button
        ref={btnRef}
        type="button"
        className={`w-full h-11 px-3 pr-9 text-left rounded-2xl ring-1 ring-border bg-surface-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          open ? 'ring-primary-300' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseDown={stopPropagation}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`block truncate ${current ? 'text-text-primary' : 'text-text-tertiary'}`}>
          {current ? current.label : placeholder}
        </span>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute z-[100] mt-2 w-full rounded-2xl border border-border bg-surface-primary shadow-lg overflow-hidden"
          role="listbox"
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
        >
          {searchable && (
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={stopPropagation}
                onMouseDown={stopPropagation}
                placeholder="Search…"
                className="w-full h-9 px-3 rounded-xl ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-primary"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.map((opt, idx) => (
              <button
                key={opt.value}
                role="option"
                aria-selected={opt.value === _value}
                disabled={opt.disabled}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!opt.disabled) commit(opt.value);
                }}
                onMouseDown={stopPropagation}
                className={`w-full text-left px-3 py-2 text-[14px] ${
                  idx === activeIndex ? 'bg-blue-50 text-blue-700' : 'text-text-primary'
                } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-tertiary'} `}
              >
                {opt.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-text-tertiary">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



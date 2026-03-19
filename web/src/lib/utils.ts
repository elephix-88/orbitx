import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Deep-equal helpers for form dirty-check
export function stableSerialize(value: any): string {
  const stable = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(stable);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = stable(v[k]);
    return out;
  };
  try { return JSON.stringify(stable(value)); } catch { return String(value); }
}

export function isDeepEqual(a: any, b: any): boolean {
  return stableSerialize(a) === stableSerialize(b);
}

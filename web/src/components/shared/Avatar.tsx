import React from 'react';
import { cn } from '@/lib/utils';

const pastelPalette = [
 '#DBEAFE',
 '#FEF3C7',
 '#DCFCE7',
 '#FEE2E2',
 '#F3E8FF',
 '#CFFAFE',
 '#E0E7FF',
] as const;

function hashString(value: string): number {
 let hash = 0;
 for (let index = 0; index < value.length; index += 1) {
 hash = (hash * 31 + value.charCodeAt(index)) | 0;
 }
 return Math.abs(hash);
}

function initialsFor(name: string): string {
 const trimmed = name.trim();
 if (!trimmed) return '?';
 const parts = trimmed.split(/\s+/).filter(Boolean);
 if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
 return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pastelForName(name: string): string {
 return pastelPalette[hashString(name) % pastelPalette.length];
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
 name: string;
 size?: 'sm' | 'md';
 tone?: 'navy' | 'auto';
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
 sm: 'w-[22px] h-[22px] text-[10px]',
 md: 'w-[28px] h-[28px] text-[11px]',
};

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
 ({ className, name, size = 'md', tone = 'auto', style, ...props }, ref) => {
 const initials = initialsFor(name);
 const isNavy = tone === 'navy';
 const background = isNavy ? 'var(--navy)' : pastelForName(name);
 const color = isNavy ? '#FFFFFF' : 'var(--text-2)';

 return (
 <span
 ref={ref}
 data-tone={tone}
 className={cn(
 'inline-flex items-center justify-center rounded-full border border-line-1 font-semibold select-none',
 sizeClasses[size],
 className
 )}
 style={{ background, color, ...style }}
 aria-label={name}
 {...props}
 >
 {initials}
 </span>
 );
 }
);

Avatar.displayName = 'Avatar';

export default Avatar;

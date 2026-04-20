import React, { useEffect, useRef, useState } from 'react';
import { useIsGlobalLoading } from '@/store/globalLoadingStore';

type RouteProgressBarProps = {
 minDurationMs?: number; // minimum time to keep the bar visible to avoid flicker
};

// Simple route-change top progress bar (no external deps)
export const RouteProgressBar: React.FC<RouteProgressBarProps> = ({ minDurationMs = 200 }) => {
 const isLoading = useIsGlobalLoading();
 const [visible, setVisible] = useState(false);
 const [width, setWidth] = useState(0);
 const startRef = useRef<number | null>(null);
 const rafRef = useRef<number | null>(null);

 useEffect(() => {
 if (isLoading) {
 setVisible(true);
 setWidth(0);
 startRef.current = performance.now();

 const step = () => {
 setWidth((prev) => {
 if (prev < 80) return Math.min(80, prev + 5 + Math.random() * 10);
 return prev;
 });
 rafRef.current = requestAnimationFrame(step);
 };
 rafRef.current = requestAnimationFrame(step);
 return () => {
 if (rafRef.current) cancelAnimationFrame(rafRef.current);
 };
 } else {
 // complete
 if (rafRef.current) cancelAnimationFrame(rafRef.current);
 const timer = window.setTimeout(() => {
 setWidth(100);
 window.setTimeout(() => {
 setVisible(false);
 setWidth(0);
 }, 180);
 }, minDurationMs);
 return () => window.clearTimeout(timer);
 }
 }, [isLoading, minDurationMs]);

 if (!visible) return null;

 return (
 <div className="fixed top-0 left-0 right-0 z-[1100] h-0.5">
 <div
 className="h-full bg-blue-primary-hover transition-[width] duration-200 ease-out"
 style={{ width: `${width}%` }}
 />
 </div>
 );
};

export default RouteProgressBar;



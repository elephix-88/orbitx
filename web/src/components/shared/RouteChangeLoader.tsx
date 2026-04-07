import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

type RouteChangeLoaderProps = {
  durationMs?: number;
};

/**
 * Minimal route change indicator - just a thin progress bar at top.
 * Non-blocking and unobtrusive.
 */
export const RouteChangeLoader: React.FC<RouteChangeLoaderProps> = ({ durationMs = 300 }) => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const hideTimer = useRef<number | null>(null);
  const progressTimer = useRef<number | null>(null);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Skip if same path
    if (prevPathRef.current === location.pathname) {
      return;
    }
    prevPathRef.current = location.pathname;

    // Clear timers
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
    }
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
    }

    // Start progress animation
    setVisible(true);
    setProgress(0);

    // Animate progress
    let currentProgress = 0;
    progressTimer.current = window.setInterval(() => {
      currentProgress += Math.random() * 15 + 5;
      if (currentProgress >= 90) {
        currentProgress = 90;
        if (progressTimer.current) {
          window.clearInterval(progressTimer.current);
        }
      }
      setProgress(currentProgress);
    }, 50);

    // Complete and hide
    hideTimer.current = window.setTimeout(() => {
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current);
      }
      setProgress(100);

      // Hide after complete animation
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 150);
    }, durationMs);

    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (progressTimer.current) window.clearInterval(progressTimer.current);
    };
  }, [location.pathname, durationMs]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div
        className="h-full bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 transition-all duration-150 ease-out shadow-sm shadow-primary-500/50"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default RouteChangeLoader;

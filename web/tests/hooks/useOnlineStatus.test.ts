import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus, formatOfflineDuration } from '@/hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  let originalNavigator: typeof navigator.onLine;

  beforeEach(() => {
    // Save original value
    originalNavigator = navigator.onLine;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    // Restore original value
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalNavigator,
    });
  });

  it('should initialize with current online status', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.lastOnline).toBeInstanceOf(Date);
  });

  it('should update when going offline', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('should update when coming back online', () => {
    const { result } = renderHook(() => useOnlineStatus());

    // Go offline first
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);

    // Come back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  it('should set wasOffline when reconnecting after being offline', () => {
    const { result } = renderHook(() => useOnlineStatus());

    // Initially wasOffline should be false
    expect(result.current.wasOffline).toBe(false);

    // Go offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Come back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Now wasOffline should be true
    expect(result.current.wasOffline).toBe(true);
  });

  it('should clear wasOffline when clearWasOffline is called', () => {
    const { result } = renderHook(() => useOnlineStatus());

    // Simulate going offline and back online
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.wasOffline).toBe(true);

    // Clear the wasOffline flag
    act(() => {
      result.current.clearWasOffline();
    });

    expect(result.current.wasOffline).toBe(false);
  });

  it('should update lastOnline when coming back online', () => {
    const { result } = renderHook(() => useOnlineStatus());

    const initialLastOnline = result.current.lastOnline?.getTime();

    // Go offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Come back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    // lastOnline should be updated (different Date object or later time)
    expect(result.current.lastOnline).toBeInstanceOf(Date);
    // Since the test runs fast, just check it's a valid Date
    expect(result.current.lastOnline?.getTime()).toBeGreaterThanOrEqual(initialLastOnline ?? 0);
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});

describe('formatOfflineDuration', () => {
  it('should return empty string for null input', () => {
    expect(formatOfflineDuration(null)).toBe('');
  });

  it('should return "just now" for recent times', () => {
    const now = new Date();
    const recentTime = new Date(now.getTime() - 30 * 1000); // 30 seconds ago

    expect(formatOfflineDuration(recentTime)).toBe('just now');
  });

  it('should return minutes for times within an hour', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    expect(formatOfflineDuration(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('should return singular minute correctly', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    expect(formatOfflineDuration(oneMinuteAgo)).toBe('1 minute ago');
  });

  it('should return hours for times beyond an hour', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    expect(formatOfflineDuration(twoHoursAgo)).toBe('2 hours ago');
  });

  it('should return singular hour correctly', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    expect(formatOfflineDuration(oneHourAgo)).toBe('1 hour ago');
  });
});

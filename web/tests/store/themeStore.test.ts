import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useThemeStore } from '@/store/themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    // Reset store state
    useThemeStore.setState({ isDark: true });
    // Clear localStorage
    localStorage.clear();
    // Reset document classes
    document.documentElement.classList.remove('dark');
  });

  describe('initial state', () => {
    it('should default to dark mode', () => {
      const { result } = renderHook(() => useThemeStore());
      expect(result.current.isDark).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from dark to light', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.isDark).toBe(false);
    });

    it('should toggle from light to dark', () => {
      const { result } = renderHook(() => useThemeStore());

      // Start with light mode
      act(() => {
        result.current.setTheme(false);
      });

      expect(result.current.isDark).toBe(false);

      // Toggle to dark
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.isDark).toBe(true);
    });

    it('should update document class when toggling', () => {
      const { result } = renderHook(() => useThemeStore());

      // Start dark
      act(() => {
        result.current.setTheme(true);
      });
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Toggle to light
      act(() => {
        result.current.toggleTheme();
      });
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Toggle back to dark
      act(() => {
        result.current.toggleTheme();
      });
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should persist theme to localStorage', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.toggleTheme();
      });

      // Check localStorage was called
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('setTheme', () => {
    it('should set dark mode explicitly', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setTheme(true);
      });

      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should set light mode explicitly', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setTheme(false);
      });

      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should persist theme to localStorage when setting', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setTheme(false);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'theme-dark',
        JSON.stringify(false)
      );
    });
  });

  describe('document class management', () => {
    it('should add dark class for dark mode', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setTheme(true);
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class for light mode', () => {
      const { result } = renderHook(() => useThemeStore());

      // Start with dark
      document.documentElement.classList.add('dark');

      act(() => {
        result.current.setTheme(false);
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});

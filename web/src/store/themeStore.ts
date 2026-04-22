import { create } from 'zustand';

interface ThemeStore {
	isDark: boolean;
	toggleTheme: () => void;
	setTheme: (isDark: boolean) => void;
}

// Initialize theme from localStorage and apply to document.
// v1 is light-only per the design system (CLAUDE.md). Default to light;
// only honor a persisted `theme-dark=true` if it was explicitly saved.
const getInitialTheme = (): boolean => {
	if (typeof window === 'undefined') return false;

	try {
		const saved = localStorage.getItem('theme-dark');
		if (saved !== null) {
			const isDark = JSON.parse(saved);
			if (isDark) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
			return isDark;
		}
	} catch {
		// Ignore localStorage errors
	}

	document.documentElement.classList.remove('dark');
	return false;
};

// Apply theme to document and persist to localStorage
const applyTheme = (isDark: boolean) => {
	if (typeof window === 'undefined') return;

	const root = document.documentElement;
	if (isDark) {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}

	try {
		localStorage.setItem('theme-dark', JSON.stringify(isDark));
	} catch {
		// Ignore localStorage errors
	}
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
	isDark: getInitialTheme(),

	toggleTheme: () => {
		const newValue = !get().isDark;
		applyTheme(newValue);
		set({ isDark: newValue });
	},

	setTheme: (isDark: boolean) => {
		applyTheme(isDark);
		set({ isDark });
	},
}));

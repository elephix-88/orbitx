import { create } from 'zustand';

type GlobalLoadingState = {
 inFlight: number;
 start: () => void;
 end: () => void;
};

const useGlobalLoadingStore = create<GlobalLoadingState>((set) => ({
 inFlight: 0,
 start: () => set((state) => ({ inFlight: state.inFlight + 1 })),
 end: () => set((state) => ({ inFlight: Math.max(0, state.inFlight - 1) })),
}));

export const useIsGlobalLoading = () => {
 return useGlobalLoadingStore((s) => s.inFlight > 0);
};



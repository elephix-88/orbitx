import { act } from '@testing-library/react';
import type { StoreApi } from 'zustand';

// =============================================================================
// Types
// =============================================================================

type ExtractState<S> = S extends { getState: () => infer T } ? T : never;

// =============================================================================
// Store Testing Utilities
// =============================================================================

/**
 * Reset a Zustand store to its initial state.
 * Call this in beforeEach to ensure test isolation.
 *
 * @example
 * beforeEach(() => {
 *   resetStore(useWorkflowStore);
 * });
 */
export function resetStore<T extends StoreApi<unknown>>(
  store: T,
  initialState?: Partial<ExtractState<T>>
): void {
  const state = store.getState() as Record<string, unknown>;

  // Find and call reset function if it exists
  if (typeof state.reset === 'function') {
    act(() => {
      (state.reset as () => void)();
    });
  }

  // Apply initial state if provided
  if (initialState) {
    act(() => {
      store.setState(initialState as ExtractState<T>);
    });
  }
}

/**
 * Set store state within act() wrapper.
 * Use this when you need to set specific state for a test.
 *
 * @example
 * setStoreState(useAuthStore, { isAuthenticated: true, user: mockUser });
 */
export function setStoreState<T extends StoreApi<unknown>>(
  store: T,
  state: Partial<ExtractState<T>>
): void {
  act(() => {
    store.setState(state as ExtractState<T>);
  });
}

/**
 * Get current store state (convenience wrapper).
 */
export function getStoreState<T extends StoreApi<unknown>>(
  store: T
): ExtractState<T> {
  return store.getState() as ExtractState<T>;
}

/**
 * Subscribe to store changes and return collected states.
 * Useful for testing that actions trigger expected state changes.
 *
 * @example
 * const { states, unsubscribe } = trackStoreChanges(useWorkflowStore);
 * // ... perform actions
 * expect(states).toHaveLength(3);
 * unsubscribe();
 */
export function trackStoreChanges<T extends StoreApi<unknown>>(store: T): {
  states: ExtractState<T>[];
  unsubscribe: () => void;
} {
  const states: ExtractState<T>[] = [];

  const unsubscribe = store.subscribe((state) => {
    states.push(state as ExtractState<T>);
  });

  return { states, unsubscribe };
}

/**
 * Wait for store state to match a condition.
 *
 * @example
 * await waitForStoreState(useWorkflowStore, (state) => state.nodes.length > 0);
 */
export async function waitForStoreState<T extends StoreApi<unknown>>(
  store: T,
  condition: (state: ExtractState<T>) => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 1000, interval = 50 } = options;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    // Check initial state
    if (condition(store.getState() as ExtractState<T>)) {
      resolve();
      return;
    }

    // Subscribe to changes
    const unsubscribe = store.subscribe((state) => {
      if (condition(state as ExtractState<T>)) {
        unsubscribe();
        resolve();
      }
    });

    // Timeout check
    const checkTimeout = setInterval(() => {
      if (Date.now() - startTime > timeout) {
        clearInterval(checkTimeout);
        unsubscribe();
        reject(new Error(`Store state condition not met within ${timeout}ms`));
      }
    }, interval);
  });
}

// =============================================================================
// Mock Store Creator
// =============================================================================

/**
 * Create a mock store for testing components in isolation.
 * Useful when you want to test a component without the real store implementation.
 *
 * @example
 * const mockStore = createMockStore({
 *   nodes: [mockNode],
 *   addNode: vi.fn(),
 *   removeNode: vi.fn(),
 * });
 */
export function createMockStore<T extends Record<string, unknown>>(
  initialState: T
): StoreApi<T> & { setState: (state: Partial<T>) => void } {
  let state = { ...initialState };
  const listeners = new Set<(state: T, _prevState: T) => void>();

  let prevState = { ...initialState };

  return {
    getState: () => state,
    setState: (partial: Partial<T>) => {
      prevState = state;
      state = { ...state, ...partial };
      listeners.forEach((listener) => listener(state, prevState));
    },
    subscribe: (listener: (state: T, _prevState: T) => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getInitialState: () => initialState,
    destroy: () => listeners.clear(),
  } as unknown as StoreApi<T> & { setState: (state: Partial<T>) => void };
}

// =============================================================================
// Action Testing Utilities
// =============================================================================

/**
 * Test that a store action produces the expected state change.
 *
 * @example
 * await testStoreAction(
 *   useWorkflowStore,
 *   (store) => store.getState().addNode(mockNode),
 *   (before, after) => {
 *     expect(after.nodes.length).toBe(before.nodes.length + 1);
 *   }
 * );
 */
export async function testStoreAction<T extends StoreApi<unknown>>(
  store: T,
  action: (_store: T) => void | Promise<void>,
  assertion: (_before: ExtractState<T>, _after: ExtractState<T>) => void
): Promise<void> {
  const storeState = store.getState() as Record<string, unknown>;
  const before = { ...storeState } as ExtractState<T>;

  await act(async () => {
    await action(store);
  });

  const after = store.getState() as ExtractState<T>;
  assertion(before, after);
}

// =============================================================================
// Persistence Testing Utilities
// =============================================================================

/**
 * Mock the persistence layer for Zustand stores that use persist middleware.
 *
 * @example
 * const { getPersistedState, clearPersistedState } = mockPersistence('workflow-store');
 */
export function mockPersistence(storeName: string) {
  const storage = new Map<string, string>();

  // Mock sessionStorage/localStorage
  const mockStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  };

  return {
    storage: mockStorage,
    getPersistedState: () => {
      const item = storage.get(storeName);
      return item ? JSON.parse(item) : null;
    },
    clearPersistedState: () => storage.delete(storeName),
    setPersistedState: (state: unknown) => {
      storage.set(storeName, JSON.stringify({ state, version: 0 }));
    },
  };
}

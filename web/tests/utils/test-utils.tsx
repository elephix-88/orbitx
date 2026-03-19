import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// =============================================================================
// Types
// =============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route for MemoryRouter */
  route?: string;
  /** Use MemoryRouter instead of BrowserRouter */
  useMemoryRouter?: boolean;
  /** Initial history entries for MemoryRouter */
  initialEntries?: string[];
}

interface CustomRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
}

// =============================================================================
// Provider Wrappers
// =============================================================================

interface AllProvidersProps {
  children: ReactNode;
  useMemoryRouter?: boolean;
  initialEntries?: string[];
}

function AllProviders({
  children,
  useMemoryRouter = false,
  initialEntries = ['/'],
}: AllProvidersProps) {
  const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;
  const routerProps = useMemoryRouter ? { initialEntries } : {};

  return <Router {...routerProps}>{children}</Router>;
}

// =============================================================================
// Custom Render Function
// =============================================================================

/**
 * Custom render function that wraps components with common providers.
 *
 * @example
 * // Basic render
 * const { getByText, user } = renderWithProviders(<MyComponent />);
 *
 * @example
 * // With specific route
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   route: '/workflows/123',
 *   useMemoryRouter: true,
 * });
 *
 */
function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  const {
    route = '/',
    useMemoryRouter = false,
    initialEntries,
    ...renderOptions
  } = options;

  // Set up userEvent with proper timing
  const user = userEvent.setup();

  // If using BrowserRouter, set the route via history
  if (!useMemoryRouter) {
    window.history.pushState({}, 'Test page', route);
  }

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders
      useMemoryRouter={useMemoryRouter}
      initialEntries={initialEntries ?? [route]}
    >
      {children}
    </AllProviders>
  );

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    user,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Wait for a condition to be true.
 * Useful for testing async state updates.
 */
async function waitForCondition(
  condition: () => boolean,
  { timeout = 1000, interval = 50 } = {}
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Create a deferred promise for testing async flows.
 */
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

/**
 * Flush all pending promises and timers.
 * Useful after triggering async actions.
 */
async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// =============================================================================
// Re-exports
// =============================================================================

/* eslint-disable react-refresh/only-export-components */
// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Re-export userEvent for convenience
export { userEvent };

// Export custom utilities
export {
  renderWithProviders,
  renderWithProviders as render, // Alias for convenience
  waitForCondition,
  createDeferred,
  flushPromises,
  AllProviders,
};
/* eslint-enable react-refresh/only-export-components */

// Export types
export type { CustomRenderOptions, CustomRenderResult };

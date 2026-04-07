import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NotificationContainer } from './components/shared/Notification';
import RouteChangeLoader from './components/shared/RouteChangeLoader';
import RouteProgressBar from './components/shared/RouteProgressBar';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { PageLoader } from './components/shared/PageLoader';
import { SessionWarningModal } from './components/shared/SessionWarningModal';
import { OfflineIndicator } from './components/shared/OfflineIndicator';
import { useGlobalErrorHandler } from './hooks/useGlobalErrorHandler';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { useThemeStore } from './store/themeStore';

// =============================================================================
// Lazy Loaded Pages
// =============================================================================

// Public pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));

// Protected pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const WorkflowsPage = lazy(() => import('./pages/WorkflowsPage'));
const WorkflowBuilderPage = lazy(() => import('./pages/WorkflowBuilderPage'));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// =============================================================================
// App Component
// =============================================================================

function App() {
  // Set up global error handlers for unhandled promises and errors
  useGlobalErrorHandler();

  // Initialize theme store (ensures theme is applied on app load)
  useThemeStore();

  // Monitor session expiration and show warning 5 minutes before expiry
  const { showWarning, minutesRemaining, dismissWarning, logout } = useSessionTimeout(5);

  return (
    <ErrorBoundary>
      {/* Global offline indicator */}
      <OfflineIndicator />

      {/* Session expiration warning modal */}
      {showWarning && (
        <SessionWarningModal
          minutesRemaining={minutesRemaining}
          onDismiss={dismissWarning}
          onLogout={logout}
        />
      )}
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <NotificationContainer />
        <RouteProgressBar />
        <RouteChangeLoader />
        <Suspense fallback={<PageLoader message="Loading..." />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <DashboardPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/workflows" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <WorkflowsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/workflows/builder" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <WorkflowBuilderPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/connections" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <ConnectionsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

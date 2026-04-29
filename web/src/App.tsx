import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NotificationContainer } from './components/shared/Notification';
import RouteChangeLoader from './components/shared/RouteChangeLoader';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { PageLoader } from './components/shared/PageLoader';
import { SessionWarningModal } from './components/shared/SessionWarningModal';
import { useGlobalErrorHandler } from './hooks/useGlobalErrorHandler';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { useAuthExpiredListener } from './hooks/useAuthExpiredListener';
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

// Dev-only pages (DEV build only)
const AtomsPage = import.meta.env.DEV
 ? lazy(() => import('./pages/_dev/AtomsPage'))
 : null;

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
 <AuthExpiredBridge />
				<NotificationContainer />
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
 {AtomsPage && (
 <Route path="/_dev/atoms" element={
 <ErrorBoundary>
 <AtomsPage />
 </ErrorBoundary>
 } />
 )}
 </Routes>
 </Suspense>
 </BrowserRouter>
 </ErrorBoundary>
 );
}

function AuthExpiredBridge() {
	useAuthExpiredListener();
	return null;
}

export default App;

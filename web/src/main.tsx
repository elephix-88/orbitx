import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
  });
}

createRoot(document.getElementById('root')!).render(<App />)

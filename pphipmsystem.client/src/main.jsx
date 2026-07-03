import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import ToastContainer from './components/common/Toast';
import { applyDisplayPrefs, initThemeSync } from './utils/displayPrefs';

// Apply saved display preferences before first paint, and keep the theme in
// sync with the OS while "system" is selected.
applyDisplayPrefs();
initThemeSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <ToastContainer />
    </AuthProvider>
  </StrictMode>,
);

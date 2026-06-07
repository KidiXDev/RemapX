import '@/i18n';
import TrayPopupApp from '@/components/tray/tray-popup-app';
import App from '@/routes';
import { getCurrentWindow } from '@tauri-apps/api/window';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './global.css';

if (import.meta.env.PROD) {
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  document.documentElement.classList.add('prod-mode');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {typeof window !== 'undefined' && '__TAURI_INTERNALS__' in (window as object) && getCurrentWindow().label === 'tray-popup' ? (
      <TrayPopupApp />
    ) : (
      <App />
    )}
  </React.StrictMode>
);

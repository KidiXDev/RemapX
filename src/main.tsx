import '@/i18n';
import App from '@/routes';
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
    <App />
  </React.StrictMode>
);

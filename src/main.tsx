import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/plus-jakarta-sans';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import App from './App.tsx';
import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('WebSocket') ||
    event.reason?.message?.includes('vite') ||
    (typeof event.reason === 'string' && (event.reason.includes('WebSocket') || event.reason.includes('vite')))
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

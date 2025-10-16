import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/toaster';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('未找到根节点 #root');

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

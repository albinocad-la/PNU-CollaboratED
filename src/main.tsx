import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StudyProvider } from './contexts/StudyContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SearchProvider } from './contexts/SearchContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <StudyProvider>
        <SearchProvider>
          <App />
        </SearchProvider>
      </StudyProvider>
    </ThemeProvider>
  </StrictMode>,
);

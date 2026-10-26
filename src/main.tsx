import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/Toast';
import 'sileo/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);

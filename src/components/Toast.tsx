import React, { createContext, useCallback, useContext } from 'react';
import { sileo, Toaster } from 'sileo';

type ToastKind = 'error' | 'success' | 'warning' | 'info';
type ToastContextValue = { showToast: (message: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showToast = useCallback((message: string, kind: ToastKind = 'error') => {
    const options = {
      title: kind === 'error' ? 'Request failed' : kind === 'success' ? 'Success' : kind === 'warning' ? 'Warning' : 'Notice',
      description: message,
      duration: 5000,
      fill: 'rgba(255, 255, 255, 0.92)',
    };

    if (kind === 'success') sileo.success(options);
    else if (kind === 'warning') sileo.warning(options);
    else if (kind === 'info') sileo.info(options);
    else sileo.error(options);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toaster
        position="top-right"
        offset={16}
        theme="light"
        options={{
          fill: 'rgba(255, 255, 255, 0.92)',
          roundness: 16,
          styles: {
            title: 'text-[#171719]!',
            description: 'text-[#626267]!',
          },
        }}
      />
      {children}
    </ToastContext.Provider>
  );
};

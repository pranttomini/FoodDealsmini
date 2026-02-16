import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, message, type }]); // max 3 visible
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-safe left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none px-4" style={{ paddingTop: 'env(safe-area-inset-top, 16px)', top: 0 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto mx-auto px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-green-600' :
              toast.type === 'error' ? 'bg-red-600' : 'bg-gray-800'
            }`}
            style={{ animation: 'slideDown 0.3s ease forwards' }}
          >
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'ℹ'}</span>
            {toast.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

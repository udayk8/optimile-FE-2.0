import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  activeModule: string | null;
  setActiveModule: (module: string | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar: () => setSidebarOpen(p => !p),
        closeSidebar: () => setSidebarOpen(false),
        activeModule,
        setActiveModule,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};

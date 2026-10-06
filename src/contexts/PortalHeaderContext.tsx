import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface HeaderMeta {
  title?: string;
  badge?: string | ReactNode;
  subtitle?: string | ReactNode;
}

interface PortalHeaderContextType {
  headerMeta: HeaderMeta | null;
  setHeaderMeta: (meta: HeaderMeta | null) => void;
}

const PortalHeaderContext = createContext<PortalHeaderContextType>({
  headerMeta: null,
  setHeaderMeta: () => {},
});

export const PortalHeaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [headerMeta, setHeaderMeta] = useState<HeaderMeta | null>(null);

  return (
    <PortalHeaderContext.Provider value={{ headerMeta, setHeaderMeta }}>
      {children}
    </PortalHeaderContext.Provider>
  );
};

export const usePortalHeader = () => useContext(PortalHeaderContext);

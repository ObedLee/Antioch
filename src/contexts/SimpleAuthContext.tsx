'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SimpleUser {
  name: string;
  phoneNumber: string;
  region?: string;
  profileId?: string;
}

interface SimpleAuthContextType {
  simpleUser: SimpleUser | null;
  simpleLogin: (name: string, phoneNumber: string, region?: string, profileId?: string) => void;
  simpleLogout: () => void;
  isLoading: boolean;
}

const SimpleAuthContext = createContext<SimpleAuthContextType>({
  simpleUser: null,
  simpleLogin: () => {},
  simpleLogout: () => {},
  isLoading: true,
});

const STORAGE_KEY = 'antioch-simple-auth';

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [simpleUser, setSimpleUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSimpleUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('[SimpleAuth] session restore error:', e);
    }
    setIsLoading(false);
  }, []);

  const simpleLogin = (name: string, phoneNumber: string, region?: string, profileId?: string) => {
    const user = { name, phoneNumber, region, profileId };
    setSimpleUser(user);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('[SimpleAuth] session save error:', e);
    }
  };

  const simpleLogout = () => {
    setSimpleUser(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[SimpleAuth] session remove error:', e);
    }
  };

  return (
    <SimpleAuthContext.Provider value={{ simpleUser, simpleLogin, simpleLogout, isLoading }}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth() {
  return useContext(SimpleAuthContext);
}

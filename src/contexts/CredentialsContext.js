'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CREDENTIAL_STORAGE_KEY } from '@/lib/constants';

const CredentialsContext = createContext(null);

export function CredentialsProvider({ children }) {
  const [credentials, setCredentialsState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accessKeyId && parsed.secretAccessKey && parsed.region && parsed.bucket) {
          setCredentialsState(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load credentials:', e);
    }
    setIsLoading(false);
  }, []);

  const setCredentials = useCallback((creds) => {
    setCredentialsState(creds);
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(creds));
  }, []);

  const clearCredentials = useCallback(() => {
    setCredentialsState(null);
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  }, []);

  const isConfigured = !!credentials;

  // Build headers object to send with every API request
  const getHeaders = useCallback(() => {
    if (!credentials) return {};
    return {
      'x-s3-access-key-id': credentials.accessKeyId,
      'x-s3-secret-access-key': credentials.secretAccessKey,
      'x-s3-region': credentials.region,
      'x-s3-bucket': credentials.bucket,
      ...(credentials.endpoint ? { 'x-s3-endpoint': credentials.endpoint } : {}),
    };
  }, [credentials]);

  return (
    <CredentialsContext.Provider value={{
      credentials,
      setCredentials,
      clearCredentials,
      isConfigured,
      isLoading,
      getHeaders,
    }}>
      {children}
    </CredentialsContext.Provider>
  );
}

export function useCredentials() {
  const context = useContext(CredentialsContext);
  if (!context) {
    throw new Error('useCredentials must be used within a CredentialsProvider');
  }
  return context;
}

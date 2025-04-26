// src/contexts/ModeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const ModeContext = createContext();

export function ModeProvider({ children }) {
  const [useMock, setUseMock] = useState(true);
  
  useEffect(() => {
    // Load initial mode from API
    async function loadMode() {
      try {
        const response = await fetch('http://localhost:8000/api/mode/status');
        if (response.ok) {
          const data = await response.json();
          setUseMock(data.useMock);
        }
      } catch (error) {
        console.error('Failed to fetch mode status:', error);
      }
    }
    
    loadMode();
  }, []);
  
  const toggleMockMode = async () => {
    try {
      const newMode = useMock ? 'live' : 'mock';
      const response = await fetch(`http://localhost:8000/api/mode/switch?mode=${newMode}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUseMock(data.useMock);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to switch mode:', error);
      return false;
    }
  };
  
  return (
    <ModeContext.Provider value={{ useMock, toggleMockMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
// src/components/Header.jsx
import React from 'react';
import { useMode } from '../../contexts/ModeContext';

const Header = () => {
  const { useMock, toggleMockMode } = useMode();
  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-800">AzureInsight Portal</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="mr-2 text-sm font-medium text-gray-700">
              Live Mode
            </span>
            <label htmlFor="toggle-mock" className="inline-flex relative items-center cursor-pointer">
              <input
                type="checkbox"
                id="toggle-mock"
                className="sr-only peer"
                checked={useMock}
                onChange={toggleMockMode}
              />
              <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${useMock ? 'bg-primary-600' : ''}`}></div>
            </label>
            <span className="ml-2 text-sm font-medium text-gray-700">
              Demo Mode
            </span>
          </div>

          <div className="ml-3 relative">
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-600">
                <span className="text-sm font-medium leading-none">AI</span>
              </span>
              <span className="ml-2 text-sm font-medium text-gray-700">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
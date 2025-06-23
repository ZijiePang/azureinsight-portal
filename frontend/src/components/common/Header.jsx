// src/components/Header.jsx
import React from 'react';

const Header = () => {  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-800">AzureInsight Portal</h1>
        </div>

        <div className="flex items-center space-x-4">

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
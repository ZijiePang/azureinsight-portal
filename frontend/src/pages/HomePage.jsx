// src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to AzureInsight Portal</h1>
        <p className="mt-2 text-gray-600">Your all-in-one dashboard for monitoring Azure resources</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 className="ml-2 text-xl font-semibold text-gray-800">Key Vault Tracker</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Monitor your Azure Key Vault secrets and certificates with smart expiration tracking and alerts.
          </p>

          <Link to="/keyvault" className="btn btn-primary inline-block">
            View Key Vault Dashboard
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1v22" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <h2 className="ml-2 text-xl font-semibold text-gray-800">Cost Explorer</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Analyze Azure resource costs with detailed visualizations, track spending trends, and identify cost optimization opportunities.
          </p>

          <Link to="/cost" className="btn btn-primary inline-block">
            View Cost Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <div className="card">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <h2 className="ml-2 text-xl font-semibold text-gray-800">Demo Information</h2>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              {/* Add the rest of the demo content here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

// src/pages/KeyVaultPage.js
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

const KeyVaultPage = () => {
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterExpiry, setFilterExpiry] = useState('All');
  const [filterDescription, setFilterDescription] = useState('All items');
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Secret', 'Certificate'
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState(null);
  const [showRotationSuggestion, setShowRotationSuggestion] = useState(false);

  // Fetch secrets from API
  const fetchSecrets = async (query = '') => {
    setLoading(true);
    try {
      let url = 'http://localhost:8000/api/keyvault/secrets';
      
      if (query) {
        url = `http://localhost:8000/api/keyvault/search?query=${encodeURIComponent(query)}`;
      } else if (filterExpiry === '7') {
        url = 'http://localhost:8000/api/keyvault/secrets/expiring/7';
      } else if (filterExpiry === '30') {
        url = 'http://localhost:8000/api/keyvault/secrets/expiring/30';
      } else if (filterExpiry === '90') {
        url = 'http://localhost:8000/api/keyvault/secrets/expiring/90';
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Apply additional client-side filtering
      let filteredSecrets = data.value;
      
      // Apply tab filtering
      if (activeTab !== 'All') {
        filteredSecrets = filteredSecrets.filter(s => s.type === activeTab);
      }
      
      setSecrets(filteredSecrets);
      
      // If using NL search, get description of search
      if (query) {
        try {
          const nlpResponse = await fetch(`http://localhost:8000/api/nlp/parse?query=${encodeURIComponent(query)}`);
          const nlpData = await nlpResponse.json();
          setFilterDescription(nlpData.description);
        } catch (err) {
          console.error("Failed to parse query:", err);
          setFilterDescription(`Search results for: "${query}"`);
        }
      } else {
        setFilterDescription(getFilterDescription());
      }
      
    } catch (err) {
      console.error("Failed to fetch secrets:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get human-readable filter description
  const getFilterDescription = () => {
    let desc = activeTab === 'All' ? 'All items' : `${activeTab}s`;
    
    if (filterExpiry === '7') {
      desc += ' expiring in the next 7 days';
    } else if (filterExpiry === '30') {
      desc += ' expiring in the next 30 days';
    } else if (filterExpiry === '90') {
      desc += ' expiring in the next 90 days';
    }
    
    return desc;
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchSecrets(searchQuery);
    }
  };

  // Reset filters
  const handleReset = () => {
    setSearchQuery('');
    setFilterType('All');
    setFilterExpiry('All');
    setActiveTab('All');
    fetchSecrets();
  };

  // Apply regular filters
  const applyFilters = () => {
    fetchSecrets();
  };

  // Calculate status based on expiry date
  const getExpiryStatus = (expiryDate) => {
    const now = new Date();
    const expiry = parseISO(expiryDate);
    const daysToExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysToExpiry <= 0) {
      return { class: 'status-expired', text: 'Expired', icon: '🚫' };
    } else if (daysToExpiry <= 7) {
      return { class: 'status-warning', text: 'Expiring Soon', icon: '⚠️' };
    } else {
      return { class: 'status-safe', text: 'Valid', icon: '✅' };
    }
  };

  // Get rotation status icon and text
  const getRotationStatus = (secret) => {
    // This would come from your API in a real implementation
    // Here we're simulating based on the secret ID
    const id = parseInt(secret.id.split('-')[1]) || 0;
    
    if (id % 3 === 0) {
      return { icon: '🔁', text: 'Auto', class: 'text-green-600' };
    } else if (id % 3 === 1) {
      return { icon: '👤', text: 'Manual', class: 'text-blue-600' };
    } else {
      return { icon: '❗', text: 'Not Set', class: 'text-red-600' };
    }
  };

  // Show rotation history modal
  const viewHistory = (secret) => {
    // In a real app, you'd fetch this from an API
    const mockHistory = [
      { date: '2025-03-15', action: 'Rotated', user: 'admin_user_1' },
      { date: '2024-12-01', action: 'Auto-Rotate', user: 'system_bot' },
      { date: '2024-09-01', action: 'Created', user: 'admin_user_2' }
    ];
    
    setSelectedItemHistory({
      name: secret.name,
      type: secret.type,
      history: mockHistory
    });
    
    setShowHistoryModal(true);
  };

  // Show rotation suggestion modal
  const showSuggestion = () => {
    setShowRotationSuggestion(true);
  };

  // Initial load
  useEffect(() => {
    fetchSecrets();
  }, [activeTab]); // Refetch when tab changes

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Azure Key Vault Expiration Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          {/* Search Form */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Natural Language Search
            </label>
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                id="search"
                className="flex-1 border-gray-300 rounded-l-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., show certificates expiring in May"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Search
              </button>
            </form>
          </div>
          
          {/* Filter Controls */}
          <div className="flex space-x-4">
            <div>
              <label htmlFor="filter-expiry" className="block text-sm font-bold text-gray-700 mb-1">
                Expiry
              </label>
              <select
                id="filter-expiry"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={filterExpiry}
                onChange={(e) => setFilterExpiry(e.target.value)}
              >
                <option value="All">All</option>
                <option value="7">≤ 7 days</option>
                <option value="30">≤ 30 days</option>
                <option value="90">≤ 90 days</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Apply
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {['All', 'Secret', 'Certificate'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab === 'Secret' && '🔐 '}
                {tab === 'Certificate' && '📄 '}
                {tab === 'All' && '📋 '}
                {tab}s
              </button>
            ))}
          </nav>
        </div>
        
        {/* Filtered Results Description */}
        <div className="text-sm text-gray-500 mb-4">
          Showing: <span className="font-medium">{filterDescription}</span>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-3/4">
            {/* Expiring Soon Alert - Enhanced */}
            {secrets.filter(s => {
              const status = getExpiryStatus(s.expirationDate);
              return status.text === 'Expiring Soon';
            }).length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Urgent Rotation Required
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        <strong className="font-medium">
                          {secrets.filter(s => {
                            const status = getExpiryStatus(s.expirationDate);
                            return status.text === 'Expiring Soon';
                          }).length} items
                        </strong> expiring in the next 7 days.
                      </p>
                    </div>
                    <div className="mt-3">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          Send Renewal Reminder
                        </button>
                        <button
                          type="button"
                          onClick={showSuggestion}
                          className="inline-flex items-center px-3 py-2 border border-yellow-700 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-700 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          View Rotation Suggestions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Secrets Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : error ? (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">Error: {error}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rotation</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {secrets.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                          No secrets or certificates found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      secrets.map((secret) => {
                        const status = getExpiryStatus(secret.expirationDate);
                        const rotationStatus = getRotationStatus(secret);
                        return (
                          <tr key={secret.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{secret.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {secret.type === 'Secret' ? '🔐 ' : '📄 '}{secret.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {secret.tags?.environment || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(parseISO(secret.expirationDate), 'MMM d, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                status.text === 'Expired' ? 'bg-red-100 text-red-800' :
                                status.text === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {status.icon} {status.text}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                rotationStatus.text === 'Auto' ? 'bg-green-100 text-green-800' :
                                rotationStatus.text === 'Manual' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {rotationStatus.icon} {rotationStatus.text}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                type="button"
                                className="text-primary-600 hover:text-primary-900"
                              >
                                View
                              </button>
                              {' | '}
                              <button
                                type="button"
                                className="text-primary-600 hover:text-primary-900"
                              >
                                Renew
                              </button>
                              {' | '}
                              <button
                                type="button"
                                className="text-primary-600 hover:text-primary-900"
                                onClick={() => viewHistory(secret)}
                              >
                                🕘 History
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          {/* Compliance Tips Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="font-medium text-blue-800 text-lg mb-3">🛡️ Compliance Tips</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start">
                  <span className="mr-1.5">•</span>
                  <span>API Secrets should be rotated every 90 days</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5">•</span>
                  <span>TLS Certificates should be renewed at least 30 days before expiry</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5">•</span>
                  <span>Avoid using "never expire" for any credentials</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5">•</span>
                  <span>Set up automated rotation where possible</span>
                </li>
              </ul>
              <div className="mt-4">
                <button
                  type="button"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Configure Reminder Policies
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle for Demo Mode */}
      <div className="flex justify-end">
        <div className="inline-flex items-center">
          <span className="mr-3 text-sm text-gray-700">Live Mode</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            <span className="ml-3 text-sm text-gray-700">Demo Mode</span>
          </label>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && selectedItemHistory && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Rotation History: {selectedItemHistory.name}
                    </h3>
                    <div className="mt-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">By User</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedItemHistory.history.map((entry, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.action}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.user}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rotation Suggestion Modal */}
      {showRotationSuggestion && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      AI-Driven Rotation Suggestions
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        We've analyzed your rotation patterns and found some areas for improvement:
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-gray-500">
                        <li className="flex items-start">
                          <span className="text-orange-500 mr-2">•</span>
                          <span>5 secrets have manual rotation but could be automated</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-orange-500 mr-2">•</span>
                          <span>3 certificates expiring in 7 days have no rotation strategy</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-orange-500 mr-2">•</span>
                          <span>Production database credentials should be rotated more frequently</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-4 bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900">Recommended Actions:</h4>
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center">
                          <input
                            id="automate-rotation"
                            name="rotation-action"
                            type="radio"
                            className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                          />
                          <label htmlFor="automate-rotation" className="ml-3 block text-sm font-medium text-gray-700">
                            Configure automatic rotation for all eligible secrets
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="renew-now"
                            name="rotation-action"
                            type="radio"
                            className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                          />
                          <label htmlFor="renew-now" className="ml-3 block text-sm font-medium text-gray-700">
                            Initiate immediate renewal for expiring items
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="adjust-policies"
                            name="rotation-action"
                            type="radio"
                            className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                          />
                          <label htmlFor="adjust-policies" className="ml-3 block text-sm font-medium text-gray-700">
                            Adjust rotation policies based on environment sensitivity
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Apply Suggestions
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowRotationSuggestion(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyVaultPage;
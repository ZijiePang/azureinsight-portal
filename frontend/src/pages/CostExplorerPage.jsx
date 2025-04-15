// src/pages/CostExplorerPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

const CostExplorerPage = () => {
  // State variables
  const [costData, setCostData] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedAppId, setSelectedAppId] = useState('all');
  const [untaggedResources, setUntaggedResources] = useState([]);
  const [showUntaggedOnly, setShowUntaggedOnly] = useState(false);
  const [anomalies, setAnomalies] = useState([]);
  const [applications, setApplications] = useState(['all', 'app-1', 'app-2', 'app-3', 'app-4']);

  // Colors for the pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Fetch cost data from API
  const fetchCostData = async () => {
    setLoading(true);
    try {
      const url = `http://localhost:8000/api/cost/data?start_date=${startDate}&end_date=${endDate}&app_id=${selectedAppId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCostData(data.costs);
      setTotalCost(data.totalCost);
      
      // Fetch anomalies
      const anomaliesResponse = await fetch(`http://localhost:8000/api/cost/anomalies?start_date=${startDate}&end_date=${endDate}`);
      const anomaliesData = await anomaliesResponse.json();
      setAnomalies(anomaliesData);
      
    } catch (err) {
      console.error("Failed to fetch cost data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch untagged resources
  const fetchUntaggedResources = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/cost/untagged');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      setUntaggedResources(data);
      
    } catch (err) {
      console.error("Failed to fetch untagged resources:", err);
    }
  };

  // Handle filter changes
  const handleFilterChange = () => {
    fetchCostData();
  };

  // Process data for charts
  const getDailyTotalCosts = () => {
    const dailyCosts = {};
    
    costData.forEach(item => {
      if (!dailyCosts[item.date]) {
        dailyCosts[item.date] = 0;
      }
      dailyCosts[item.date] += item.cost;
    });
    
    return Object.keys(dailyCosts).map(date => ({
      date,
      cost: parseFloat(dailyCosts[date].toFixed(2))
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getCostByResourceType = () => {
    const typeCosts = {};
    
    costData.forEach(item => {
      if (!typeCosts[item.type]) {
        typeCosts[item.type] = 0;
      }
      typeCosts[item.type] += item.cost;
    });
    
    return Object.keys(typeCosts).map(type => ({
      name: type,
      value: parseFloat(typeCosts[type].toFixed(2))
    }));
  };

  // Custom tooltip for LineChart
  const CustomLineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-3 border border-gray-200 shadow-md">
          <p className="font-medium">{`Date: ${format(parseISO(label), 'MMM d, yyyy')}`}</p>
          <p className="text-primary-600">{`Cost: $${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for PieChart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-3 border border-gray-200 shadow-md">
          <p className="font-medium">{`${payload[0].name}`}</p>
          <p className="text-primary-600">{`$${payload[0].value} (${((payload[0].value / totalCost) * 100).toFixed(1)}%)`}</p>
        </div>
      );
    }
    return null;
  };

  // Initial data load
  useEffect(() => {
    fetchCostData();
    fetchUntaggedResources();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Azure Cost Explorer Dashboard</h1>
      
      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Cost Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label htmlFor="app-id" className="block text-sm font-medium text-gray-700 mb-1">
              Application ID
            </label>
            <select
              id="app-id"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
            >
              {applications.map(app => (
                <option key={app} value={app}>
                  {app === 'all' ? 'All Applications' : app}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleFilterChange}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            id="untagged-only"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            checked={showUntaggedOnly}
            onChange={(e) => setShowUntaggedOnly(e.target.checked)}
          />
          <label htmlFor="untagged-only" className="ml-2 block text-sm text-gray-700">
            Show only untagged resources
          </label>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Total Cost</h3>
          <p className="text-3xl font-bold text-gray-900">${totalCost.toLocaleString()}</p>
          <p className="text-sm text-gray-500">For selected period</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Daily Average</h3>
          <p className="text-3xl font-bold text-gray-900">
            ${costData.length > 0 
              ? (totalCost / (Object.keys(getDailyTotalCosts()).length || 1)).toFixed(2) 
              : '0.00'}
          </p>
          <p className="text-sm text-gray-500">Average daily spend</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Untagged Resources</h3>
          <p className="text-3xl font-bold text-gray-900">{untaggedResources.length}</p>
          <p className="text-sm text-gray-500">Resources missing application tags</p>
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
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
      )}
      
    </div>)}

export default CostExplorerPage;

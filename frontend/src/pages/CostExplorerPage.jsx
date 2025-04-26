import React, { useState, useEffect, useRef } from 'react';

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
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
  const [selectedBreakdown, setSelectedBreakdown] = useState('type'); // 'type', 'tag', 'region'
  const [inactiveResources, setInactiveResources] = useState(5); // Mock data
  const [anomalousDays, setAnomalousDays] = useState(0);
  const [resourcesData, setResourcesData] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([
    "⚠️ This week detected 3 days of abnormal spending, with the highest daily cost 250% above average. Consider reviewing storage resource configuration.",
    "🛑 Found 39 resources without application_id tags, costing a total of $6,820. Adding tags is recommended for better tracking.",
    "🔍 Detected the following unused resources still incurring costs for 7 days: vm-prod-usw-001 ($112/day). Consider evaluating necessity."
  ]);

  const [sortField, setSortField] = useState('cost');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Colors for charts
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
      
      // Prepare resource data table
      setResourcesData(
        data.costs
          .filter(item => !showUntaggedOnly || !item.tags.application_id)
          .sort((a, b) => b.cost - a.cost)
      );
      
      // Fetch anomalies
      const anomaliesResponse = await fetch(`http://localhost:8000/api/cost/anomalies?start_date=${startDate}&end_date=${endDate}`);
      const anomaliesData = await anomaliesResponse.json();
      const anomalyArray = anomaliesData.anomalies || [];

      console.log("Fetched anomalies:", anomalyArray); // Debug log

      setAnomalies(anomalyArray);
      setAnomalousDays(countAnomalousDays(anomalyArray));
      
    } catch (err) {
      console.error("Failed to fetch cost data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Count anomalous days from anomalies data
  const countAnomalousDays = (anomaliesData) => {
    const uniqueDays = new Set();
    anomaliesData.forEach(anomaly => uniqueDays.add(anomaly.date));
    return uniqueDays.size;
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

  // Sort table data
  const handleSort = (field) => {
    // If clicking the same field, toggle direction
    const newDirection = (field === sortField) 
      ? (sortDirection === 'asc' ? 'desc' : 'asc')
      : 'asc'; // Default to ascending for a new sort field
    
    setSortField(field);
    setSortDirection(newDirection);
  };

  // Get sorted, filtered, and paginated data
  const getSortedAndPaginatedData = () => {
    // First filter the data based on UI filters
    let filteredData = [...resourcesData];
    
    // Sort the data
    const sortedData = filteredData.sort((a, b) => {
      // Special case for nested fields
      if (sortField === 'application_id') {
        const valA = a.tags.application_id || '';
        const valB = b.tags.application_id || '';
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else if (sortField === 'environment') {
        const valA = a.tags.environment || '';
        const valB = b.tags.environment || '';
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      
      // Handle numeric fields
      if (sortField === 'cost') {
        return sortDirection === 'asc' 
          ? a[sortField] - b[sortField] 
          : b[sortField] - a[sortField];
      }
      
      // Regular string sortFields
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    });
    
    // Get paginated data
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
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
      cost: parseFloat(dailyCosts[date].toFixed(2)),
      isAnomaly: anomalies.some(anomaly => anomaly.date === date)
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getBreakdownData = () => {
    const breakdown = {};
    
    costData.forEach(item => {
      let key;
      if (selectedBreakdown === 'type') {
        key = item.type;
      } else if (selectedBreakdown === 'tag') {
        key = item.tags.application_id || 'Untagged';
      } else if (selectedBreakdown === 'region') {
        // Mock region data
        const regions = ['East US', 'West US', 'Europe', 'Asia'];
        key = regions[Math.floor(Math.random() * regions.length)];
      }
      
      if (!breakdown[key]) {
        breakdown[key] = 0;
      }
      breakdown[key] += item.cost;
    });
    
    return Object.keys(breakdown).map(key => ({
      name: key,
      value: parseFloat(breakdown[key].toFixed(2))
    }));
  };

  // Custom tooltip for LineChart
  const CustomLineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-3 border border-gray-200 shadow-md">
          <p className="font-medium">{`Date: ${format(parseISO(label), 'MMM d, yyyy')}`}</p>
          <p className="text-primary-600">{`Cost: $${payload[0].value}`}</p>
          {payload[0].payload.isAnomaly && (
            <p className="text-red-600 font-bold">⚠️ Anomaly Detected</p>
          )}
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

  // Export data as CSV
  const exportCSV = () => {
    const headers = "Resource Name,Type,Cost,Date,Resource Group,Application ID,Environment\n";
    const csvData = costData.map(item => {
      return `${item.name},${item.type},${item.cost},${item.date},${item.resourceGroup},${item.tags.application_id || 'Untagged'},${item.tags.environment || 'Untagged'}`;
    }).join("\n");
    
    const blob = new Blob([headers + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `azure-cost-data-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Initial data load
  useEffect(() => {
    fetchCostData();
    fetchUntaggedResources();
  }, [startDate, endDate, selectedAppId]); // Re-fetch when filters change

  // Update data whenever sorting or filtering changes
  useEffect(() => {
    // Reset to first page when sorting changes
    setCurrentPage(1);
  }, [sortField, sortDirection]);

  // Calculate average daily cost
  const averageDailyCost = costData.length > 0 
    ? (totalCost / (Object.keys(getDailyTotalCosts()).length || 1)).toFixed(2) 
    : '0.00';

  // Calculate total pages for pagination
  const totalPages = Math.ceil(resourcesData.length / itemsPerPage);
  
  // Generate array of page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };
  
  // Render sort indicator arrow
  const renderSortArrow = (field) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <span className="ml-1">↑</span> 
      : <span className="ml-1">↓</span>;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Azure Cost Explorer Dashboard</h1>
      
      {/* 1. Filter Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label htmlFor="app-id" className="block text-sm font-medium text-gray-700 mb-1">
              Application ID
            </label>
            <select
              id="app-id"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
              Start Date 📅
            </label>
            <input
              type="date"
              id="start-date"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date 📅
            </label>
            <input
              type="date"
              id="end-date"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              id="untagged-only"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              checked={showUntaggedOnly}
              onChange={(e) => setShowUntaggedOnly(e.target.checked)}
            />
            <label htmlFor="untagged-only" className="block text-sm text-gray-700">
              Show only untagged ✅
            </label>
          </div>
          
          <div>
            <button
              type="button"
              onClick={handleFilterChange}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* 2. Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">💰 Total Cost</h3>
          <p className="text-2xl font-bold text-gray-900">${totalCost.toLocaleString()}</p>
          <p className="text-xs text-gray-500">For selected period</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">📊 Daily Average</h3>
          <p className="text-2xl font-bold text-gray-900">${averageDailyCost}</p>
          <p className="text-xs text-gray-500">Average daily spend</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">🏷️ Untagged Resources</h3>
          <p className="text-2xl font-bold text-gray-900">{untaggedResources.count}</p>
          <p className="text-xs text-gray-500">Missing application tags</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">⚠️ Anomalous Days</h3>
          <p className="text-2xl font-bold text-gray-900">{anomalousDays}</p>
          <p className="text-xs text-gray-500">Days with unusual spending</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">🔍 Inactive Resources</h3>
          <p className="text-2xl font-bold text-gray-900">{inactiveResources}</p>
          <p className="text-xs text-gray-500">Potential waste identified</p>
        </div>
      </div>
      
      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 3.1 Cost Over Time Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Cost Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={getDailyTotalCosts()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(parseISO(date), 'MMM d')} 
                />
                <YAxis />
                <Tooltip content={<CustomLineTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#0088FE" 
                  name="Daily Cost" 
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    return payload.isAnomaly ? (
                      <circle cx={cx} cy={cy} r={6} fill="red" stroke="none" />
                    ) : (
                      <circle cx={cx} cy={cy} r={3} fill="#0088FE" stroke="none" />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* 3.2 Cost Breakdown Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Cost Breakdown</h2>
            <div className="flex space-x-2">
              <button
                className={`px-3 py-1 text-xs rounded-md ${selectedBreakdown === 'type' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => setSelectedBreakdown('type')}
              >
                Resource Type
              </button>
              <button
                className={`px-3 py-1 text-xs rounded-md ${selectedBreakdown === 'tag' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => setSelectedBreakdown('tag')}
              >
                Application ID
              </button>
              <button
                className={`px-3 py-1 text-xs rounded-md ${selectedBreakdown === 'region' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => setSelectedBreakdown('region')}
              >
                Region
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getBreakdownData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {getBreakdownData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getBreakdownData()}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip />
                  <Bar dataKey="value" name="Cost ($)" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      
      {/* 4. AI Insights Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          <span className="mr-2">🤖</span>
          AI Insights & Recommendations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiSuggestions.map((suggestion, index) => (
            <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
              <p className="text-sm text-gray-800">{suggestion}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* 5. Resource Tables Section */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* 5.1 All Resources Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              {showUntaggedOnly ? "Untagged Resources" : "All Resources"}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={exportCSV}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
              >
                <span className="mr-1">📤</span> Export CSV
              </button>
              <button
                onClick={() => fetchCostData()}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
              >
                <span className="mr-1">🔄</span> Refresh
              </button>
              
              {/* Items per page selector */}
              <select
                className="px-2 py-1 text-xs bg-gray-100 rounded-md"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page
                }}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
              <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    Resource Name {renderSortArrow('name')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('type')}
                  >
                    Type {renderSortArrow('type')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('resourceGroup')}
                  >
                    Resource Group {renderSortArrow('resourceGroup')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('cost')}
                  >
                    Cost {renderSortArrow('cost')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('application_id')}
                  >
                    Application ID {renderSortArrow('application_id')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('environment')}
                  >
                    Environment {renderSortArrow('environment')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tag Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedAndPaginatedData().map((item) => (
                  <tr key={item.id} className={!item.tags.application_id ? "bg-yellow-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.resourceGroup}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ${item.cost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.tags.application_id || 
                        <span className="text-yellow-600">Untagged</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.tags.environment || 
                        <span className="text-yellow-600">Untagged</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!item.tags.application_id ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          ⚠️ Missing Tags
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ Tagged
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
          
          {resourcesData.length > 10 && (
            <div className="px-6 py-3 border-t border-gray-200 text-center text-sm text-gray-500">
              Showing 10 of {resourcesData.length} resources
            </div>
          )}
        </div>
      </div>
      
      {/* 6. Footer Buttons */}
      <div className="flex justify-center space-x-4 mb-6">
        <button className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center">
          <span className="mr-2">📘</span> Help Center
        </button>
        <button className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center">
          <span className="mr-2">🤖</span> AI Settings
        </button>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-700">Loading cost data...</p>
          </div>
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
    </div>
  );
};

export default CostExplorerPage;
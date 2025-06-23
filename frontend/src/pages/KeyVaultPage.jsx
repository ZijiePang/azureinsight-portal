// src/pages/KeyVaultPage.js
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TablePagination,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Search, 
  Download, 
  RefreshCw, 
  Clock, 
  Shield, 
  Key, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';

const KeyVaultPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1); // Backend uses 1-based pagination
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    expirationWindow: 'all',
    owner: '',
    vaultName: '',
    objectType: 'all'
  });

  // System status from KPI endpoint
  const [systemStatus, setSystemStatus] = useState({
    lastSync: '',
    syncStatus: 'unknown',
    totalSecrets: 0,
    totalCertificates: 0,
    expiring60Days: 0,
    expiring30Days: 0,
    emailsSentToday: 0
  });

  // Fetch KPI data
  const fetchKPISummary = async () => {
    try {

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/keyvault/kpi`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch KPI data');
      }
      
      const kpiData = await response.json();
      setSystemStatus(prev => ({
        ...prev,
        totalSecrets: kpiData.total_secrets,
        totalCertificates: kpiData.total_certificates,
        expiring60Days: kpiData.expiring_60_days,
        expiring30Days: kpiData.expiring_30_days,
        emailsSentToday: kpiData.alerts_sent_today,
        syncStatus: 'success'
      }));
      
    } catch (err) {
      console.error('Error fetching KPI data:', err);
      setSystemStatus(prev => ({
        ...prev,
        syncStatus: 'failed'
      }));
    }
  };

  // Fetch paginated data from backend
  const fetchKeyVaultData = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: rowsPerPage.toString()
      });

      // Add filters if they exist
      if (filters.search) {
        params.append('search_text', filters.search);
      }
      if (filters.owner) {
        params.append('owner', filters.owner);
      }
      if (filters.vaultName) {
        params.append('vault_name', filters.vaultName);
      }
      if (filters.expirationWindow !== 'all') {
        params.append('expiration_window', filters.expirationWindow);
      }
      if (filters.objectType !== 'all') {
        params.append('object_type', filters.objectType === 'secrets' ? 'Secret' : 'Certificate');
      }

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/keyvault/objects?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      
      // Transform backend data to frontend format
      const transformedData = result.items.map(item => ({
        objectName: item.object_name,
        objectType: item.object_type,
        vaultName: item.vault_name,
        subscriptionId: item.subscription_id,
        expirationDate: item.expiration_date,
        daysRemaining: item.days_remaining,
        owner: item.owner || '',
        distributionEmail: item.distribution_email || '',
        issuer: item.issuer || '',
        thumbprint: item.thumbprint || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      setData(transformedData);
      setTotalCount(result.total_count);
      setError(null);
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching key vault data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    Promise.all([
      fetchKeyVaultData(),
      fetchKPISummary()
    ]);
  }, [page, rowsPerPage]);

  // Refetch when filters change (reset to page 1)
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchKeyVaultData();
    }
  }, [filters]);

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      // Trigger manual sync
      const syncResponse = await fetch('/api/keyvault/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_ids: null, // Sync all subscriptions
          force_refresh: true
        })
      });
      
      if (!syncResponse.ok) {
        throw new Error('Manual sync failed');
      }
      
      const syncResult = await syncResponse.json();
      
      // Update last sync time
      setSystemStatus(prev => ({
        ...prev,
        lastSync: new Date().toLocaleString(),
        syncStatus: 'success'
      }));
      
      // Refresh data after sync
      await Promise.all([
        fetchKeyVaultData(),
        fetchKPISummary()
      ]);
      
    } catch (err) {
      setSystemStatus(prev => ({
        ...prev,
        syncStatus: 'failed'
      }));
      setError('Manual sync failed: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Object Name', 'Object Type', 'Vault Name', 'Subscription ID', 'Expiration Date', 'Days Remaining', 'Owner', 'Distribution Email', 'Issuer', 'Thumbprint'],
      ...data.map(row => [
        row.objectName,
        row.objectType,
        row.vaultName,
        row.subscriptionId,
        row.expirationDate ? new Date(row.expirationDate).toISOString().split('T')[0] : '',
        row.daysRemaining || '',
        row.owner,
        row.distributionEmail,
        row.issuer,
        row.thumbprint
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyvault-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getDaysRemaining = (expirationDate, daysRemaining) => {
    // Use backend calculated daysRemaining if available
    if (daysRemaining !== null && daysRemaining !== undefined) {
      return daysRemaining;
    }
    
    // Fallback calculation
    if (!expirationDate) return null;
    const now = new Date();
    const expDate = new Date(expirationDate);
    return Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
  };

  const getExpirationChip = (daysRemaining) => {
    if (daysRemaining === null || daysRemaining === undefined) {
      return <Chip label="No Expiry" color="default" size="small" />;
    }
    
    if (daysRemaining <= 0) {
      return <Chip label="Expired" color="error" size="small" />;
    } else if (daysRemaining <= 7) {
      return <Chip label={`${daysRemaining}d`} color="error" size="small" />;
    } else if (daysRemaining <= 30) {
      return <Chip label={`${daysRemaining}d`} color="warning" size="small" />;
    } else if (daysRemaining <= 60) {
      return <Chip label={`${daysRemaining}d`} color="info" size="small" />;
    } else {
      return <Chip label={`${daysRemaining}d`} color="success" size="small" />;
    }
  };

  // Filter data based on current tab (client-side filtering for tabs only)
  const getFilteredDataForTab = () => {
    if (activeTab === 'all') return data;
    if (activeTab === 'secrets') return data.filter(item => item.objectType === 'Secret');
    if (activeTab === 'certificates') return data.filter(item => item.objectType === 'Certificate');
    return data;
  };

  const filteredData = getFilteredDataForTab();

  const handleChangePage = (event, newPage) => {
    setPage(newPage + 1); // Convert from 0-based to 1-based
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      expirationWindow: 'all',
      owner: '',
      vaultName: '',
      objectType: 'all'
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Key Vault Monitoring Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor and manage Azure Key Vault secrets and certificates</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Last Sync Time</p>
                <p className="text-sm font-medium text-gray-900">{systemStatus.lastSync || 'Never'}</p>
              </div>
              <div className="flex items-center">
                {systemStatus.syncStatus === 'success' ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : systemStatus.syncStatus === 'failed' ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <Clock className="h-6 w-6 text-gray-400" />
                )}
                <span className="ml-2 text-sm font-medium capitalize">
                  {systemStatus.syncStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Panel */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{systemStatus.totalSecrets}</p>
                <p className="text-gray-600">Total Secrets</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{systemStatus.totalCertificates}</p>
                <p className="text-gray-600">Total Certificates</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{systemStatus.expiring60Days}</p>
                <p className="text-gray-600">Expiring 60d</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{systemStatus.expiring30Days}</p>
                <p className="text-gray-600">Expiring 30d</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{systemStatus.emailsSentToday}</p>
                <p className="text-gray-600">Emails Sent Today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className=" mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Objects ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('secrets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'secrets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Secrets ({systemStatus.totalSecrets})
            </button>
            <button
              onClick={() => setActiveTab('certificates')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'certificates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Certificates ({systemStatus.totalCertificates})
            </button>
          </nav>
        </div>
      </div>

      {/* Filters Panel */}
      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiration Window</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.expirationWindow}
                onChange={(e) => setFilters({...filters, expirationWindow: e.target.value})}
              >
                <option value="all">All</option>
                <option value="30">Within 30 days</option>
                <option value="60">Within 60 days</option>
                <option value="90">Within 90 days</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Owner</label>
              <input
                type="text"
                placeholder="Filter by owner..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.owner}
                onChange={(e) => setFilters({...filters, owner: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vault Name</label>
              <input
                type="text"
                placeholder="Filter by vault..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.vaultName}
                onChange={(e) => setFilters({...filters, vaultName: e.target.value})}
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className=" mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white rounded-lg shadow">
          {error && (
            <Alert severity="error" className="m-4">
              {error}
            </Alert>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <CircularProgress />
            </div>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead className="bg-gray-50">
                  <TableRow>
                    <TableCell className="font-semibold">Object Name</TableCell>
                    <TableCell className="font-semibold">Type</TableCell>
                    <TableCell className="font-semibold">Vault Name</TableCell>
                    <TableCell className="font-semibold">Expiration Date</TableCell>
                    <TableCell className="font-semibold">Days Remaining</TableCell>
                    <TableCell className="font-semibold">Owner</TableCell>
                    <TableCell className="font-semibold">Distribution Email</TableCell>
                    <TableCell className="font-semibold">Issuer</TableCell>
                    <TableCell className="font-semibold">Thumbprint</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.map((row, index) => {
                    const daysRemaining = getDaysRemaining(row.expirationDate, row.daysRemaining);
                    return (
                      <TableRow key={`${row.vaultName}-${row.objectName}-${row.objectType}`} hover>
                        <TableCell className="font-medium">{row.objectName}</TableCell>
                        <TableCell>
                          <Chip 
                            label={row.objectType} 
                            color={row.objectType === 'Secret' ? 'primary' : 'secondary'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{row.vaultName}</TableCell>
                        <TableCell>
                          {row.expirationDate 
                            ? new Date(row.expirationDate).toLocaleDateString() 
                            : 'No Expiry'
                          }
                        </TableCell>
                        <TableCell>{getExpirationChip(daysRemaining)}</TableCell>
                        <TableCell className="text-sm">{row.owner || '-'}</TableCell>
                        <TableCell className="text-sm">{row.distributionEmail || '-'}</TableCell>
                        <TableCell className="text-sm">{row.issuer || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {row.thumbprint ? row.thumbprint.substring(0, 16) + '...' : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page - 1} // Convert back to 0-based for Material-UI
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className=" mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <button
                onClick={handleExportCSV}
                disabled={filteredData.length === 0}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Manual Refresh
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              Showing {filteredData.length} of {totalCount} total objects
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyVaultPage;
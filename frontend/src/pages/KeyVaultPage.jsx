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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    search: '',
    expirationWindow: 'all',
    owner: '',
    vaultName: '',
    objectType: 'all'
  });

  // Mock system status - replace with actual API call
  const [systemStatus, setSystemStatus] = useState({
    lastSync: '2025-06-17 09:00 AM',
    syncStatus: 'success',
    totalSecrets: 0,
    totalCertificates: 0,
    expiring60Days: 0,
    expiring30Days: 0,
    emailsSentToday: 0
  });

  // Fetch data from Azure Table Storage
  useEffect(() => {
    fetchKeyVaultData();
  }, []);

  const fetchKeyVaultData = async () => {
    setLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/keyvault/data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      setData(result.data || []);
      
      // Update summary statistics
      const secrets = result.data.filter(item => item.objectType === 'Secret');
      const certificates = result.data.filter(item => item.objectType === 'Certificate');
      const now = new Date();
      const expiring60 = result.data.filter(item => {
        const expDate = new Date(item.expirationDate);
        const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        return diffDays <= 60 && diffDays > 0;
      });
      const expiring30 = result.data.filter(item => {
        const expDate = new Date(item.expirationDate);
        const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 0;
      });

      setSystemStatus(prev => ({
        ...prev,
        totalSecrets: secrets.length,
        totalCertificates: certificates.length,
        expiring60Days: expiring60.length,
        expiring30Days: expiring30.length,
        emailsSentToday: result.emailsSentToday || 0
      }));
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching key vault data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      // Trigger manual sync
      await fetch('/api/keyvault/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Refresh data after sync
      await fetchKeyVaultData();
      setSystemStatus(prev => ({
        ...prev,
        lastSync: new Date().toLocaleString(),
        syncStatus: 'success'
      }));
    } catch (err) {
      setSystemStatus(prev => ({
        ...prev,
        syncStatus: 'failed'
      }));
      setError('Manual sync failed');
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Object Name', 'Object Type', 'Vault Name', 'Expiration Date', 'Days Remaining', 'Owner', 'Issuer', 'Thumbprint', 'Last Email Sent'],
      ...filteredData.map(row => [
        row.objectName,
        row.objectType,
        row.vaultName,
        row.expirationDate,
        row.daysRemaining,
        row.owner,
        row.issuer || '',
        row.thumbprint || '',
        row.lastEmailSent || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyvault-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getDaysRemaining = (expirationDate) => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    return Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
  };

  const getExpirationChip = (daysRemaining) => {
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

  // Filter data based on current filters and tab
  const filteredData = data.filter(item => {
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'secrets' && item.objectType === 'Secret') ||
      (activeTab === 'certificates' && item.objectType === 'Certificate');
    
    const matchesSearch = !filters.search || 
      item.objectName.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesOwner = !filters.owner || 
      item.owner.toLowerCase().includes(filters.owner.toLowerCase());
    
    const matchesVault = !filters.vaultName || 
      item.vaultName.toLowerCase().includes(filters.vaultName.toLowerCase());
    
    const matchesExpiration = filters.expirationWindow === 'all' || 
      (filters.expirationWindow === '30' && getDaysRemaining(item.expirationDate) <= 30) ||
      (filters.expirationWindow === '60' && getDaysRemaining(item.expirationDate) <= 60) ||
      (filters.expirationWindow === '90' && getDaysRemaining(item.expirationDate) <= 90);

    return matchesTab && matchesSearch && matchesOwner && matchesVault && matchesExpiration;
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
                <p className="text-sm font-medium text-gray-900">{systemStatus.lastSync}</p>
              </div>
              <div className="flex items-center">
                {systemStatus.syncStatus === 'success' ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
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
              All Objects ({data.length})
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
                onClick={() => setFilters({search: '', expirationWindow: 'all', owner: '', vaultName: '', objectType: 'all'})}
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
                    <TableCell className="font-semibold">Issuer</TableCell>
                    <TableCell className="font-semibold">Thumbprint</TableCell>
                    <TableCell className="font-semibold">Last Email Sent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => {
                      const daysRemaining = getDaysRemaining(row.expirationDate);
                      return (
                        <TableRow key={index} hover>
                          <TableCell className="font-medium">{row.objectName}</TableCell>
                          <TableCell>
                            <Chip 
                              label={row.objectType} 
                              color={row.objectType === 'Secret' ? 'primary' : 'secondary'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{row.vaultName}</TableCell>
                          <TableCell>{new Date(row.expirationDate).toLocaleDateString()}</TableCell>
                          <TableCell>{getExpirationChip(daysRemaining)}</TableCell>
                          <TableCell className="text-sm">{row.owner}</TableCell>
                          <TableCell className="text-sm">{row.issuer || '-'}</TableCell>
                          <TableCell className="text-xs font-mono">
                            {row.thumbprint ? row.thumbprint.substring(0, 16) + '...' : '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.lastEmailSent ? new Date(row.lastEmailSent).toLocaleDateString() : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredData.length}
                rowsPerPage={rowsPerPage}
                page={page}
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
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
              Showing {filteredData.length} of {data.length} total objects
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyVaultPage;
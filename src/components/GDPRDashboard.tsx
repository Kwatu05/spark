import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface ConsentRecord {
  id: string;
  consentType: string;
  granted: boolean;
  consentDate: string;
  withdrawalDate?: string;
  consentMethod: string;
  version: string;
}

interface DataExport {
  userId: string;
  personalData: any;
  posts: any[];
  comments: any[];
  connections: any[];
  messages: any[];
  analytics: any[];
  preferences: any;
  consentHistory: any[];
  exportDate: string;
  format: string;
}

const GDPRDashboard: React.FC = () => {
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [newRestriction, setNewRestriction] = useState('');

  useEffect(() => {
    loadConsentRecords();
  }, []);

  const loadConsentRecords = async () => {
    try {
      const response = await api.get('/gdpr/consent');
      if (response.ok) {
        setConsentRecords(response.data);
      }
    } catch (error) {
      console.error('Failed to load consent records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = async (consentType: string, granted: boolean) => {
    try {
      const response = await api.post('/gdpr/consent', {
        consentType,
        granted,
        consentMethod: 'explicit'
      });

      if (response.ok) {
        loadConsentRecords();
      } else {
        alert('Failed to update consent');
      }
    } catch (error) {
      console.error('Failed to update consent:', error);
      alert('Failed to update consent');
    }
  };

  const handleDataExport = async (format: 'json' | 'csv' | 'xml') => {
    setExporting(true);
    try {
      const response = await api.get(`/gdpr/export?format=${format}`, {
        responseType: 'blob'
      });

      if (response.ok) {
        // Create download link
        const blob = new Blob([response.data], { 
          type: format === 'json' ? 'application/json' : 
                format === 'csv' ? 'text/csv' : 'application/xml'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `spark-data-export-${Date.now()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export data');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleDataDeletion = async () => {
    if (!deleteReason.trim()) {
      alert('Please provide a reason for data deletion');
      return;
    }

    setDeleting(true);
    try {
      const response = await api.delete('/gdpr/data', {
        data: {
          reason: deleteReason,
          confirmed: true
        }
      });

      if (response.ok) {
        alert('Your data has been deleted successfully. You will be logged out.');
        // Redirect to logout or home page
        window.location.href = '/';
      } else {
        alert('Failed to delete data: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to delete data:', error);
      alert('Failed to delete data');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const addRestriction = () => {
    if (newRestriction.trim() && !restrictions.includes(newRestriction.trim())) {
      setRestrictions([...restrictions, newRestriction.trim()]);
      setNewRestriction('');
    }
  };

  const removeRestriction = (index: number) => {
    setRestrictions(restrictions.filter((_, i) => i !== index));
  };

  const applyRestrictions = async () => {
    try {
      const response = await api.post('/gdpr/restrict', {
        restrictions
      });

      if (response.ok) {
        alert('Data processing restrictions applied successfully');
        setRestrictions([]);
      } else {
        alert('Failed to apply restrictions');
      }
    } catch (error) {
      console.error('Failed to apply restrictions:', error);
      alert('Failed to apply restrictions');
    }
  };

  const consentTypes = [
    { key: 'MARKETING', label: 'Marketing Communications', description: 'Receive promotional emails and notifications' },
    { key: 'ANALYTICS', label: 'Analytics Tracking', description: 'Help us improve our service through usage analytics' },
    { key: 'PERSONALIZATION', label: 'Content Personalization', description: 'Personalize your experience based on your preferences' },
    { key: 'DATA_SHARING', label: 'Data Sharing', description: 'Share anonymized data with partners for research' },
    { key: 'COOKIES', label: 'Non-Essential Cookies', description: 'Use cookies for enhanced functionality' },
    { key: 'LOCATION', label: 'Location Services', description: 'Access your location for nearby features' },
    { key: 'PROFILING', label: 'User Profiling', description: 'Create detailed user profiles for better matching' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy & Data Control</h1>
        <p className="text-gray-600">
          Manage your privacy settings and exercise your data protection rights under GDPR.
        </p>
      </div>

      {/* Consent Management */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Consent Management</h2>
        <p className="text-gray-600 mb-6">
          Control what data we can collect and how we can use it. You can change these settings at any time.
        </p>
        
        <div className="space-y-4">
          {consentTypes.map((consent) => {
            const record = consentRecords.find(r => r.consentType === consent.key);
            const isGranted = record?.granted || false;
            
            return (
              <div key={consent.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{consent.label}</h3>
                    <p className="text-sm text-gray-600">{consent.description}</p>
                    {record && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last updated: {new Date(record.consentDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isGranted}
                      onChange={(e) => handleConsentChange(consent.key, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {isGranted ? 'Allowed' : 'Not Allowed'}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Export Your Data</h2>
        <p className="text-gray-600 mb-6">
          Download a copy of all your personal data in your preferred format.
        </p>
        
        <div className="flex space-x-4">
          <button
            onClick={() => handleDataExport('json')}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export as JSON'}
          </button>
          <button
            onClick={() => handleDataExport('csv')}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export as CSV'}
          </button>
          <button
            onClick={() => handleDataExport('xml')}
            disabled={exporting}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export as XML'}
          </button>
        </div>
      </div>

      {/* Data Processing Restrictions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Restrict Data Processing</h2>
        <p className="text-gray-600 mb-6">
          Limit how we process your data while keeping your account active.
        </p>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newRestriction}
              onChange={(e) => setNewRestriction(e.target.value)}
              placeholder="Enter restriction (e.g., no_analytics, no_marketing)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addRestriction}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          
          {restrictions.length > 0 && (
            <div className="space-y-2">
              {restrictions.map((restriction, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm text-gray-700">{restriction}</span>
                  <button
                    onClick={() => removeRestriction(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={applyRestrictions}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Apply Restrictions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data Deletion */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Delete Your Account</h2>
        <p className="text-gray-600 mb-6">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Request Account Deletion
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Please let us know why you're deleting your account..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleDataDeletion}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Deletion'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Policy */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy Policy</h2>
        <p className="text-gray-600 mb-4">
          Read our privacy policy to understand how we collect, use, and protect your data.
        </p>
        <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
          View Privacy Policy
        </button>
      </div>
    </div>
  );
};

export default GDPRDashboard;


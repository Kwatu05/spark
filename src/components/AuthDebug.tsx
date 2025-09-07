import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const AuthDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    const info = {
      hasAccessToken: !!localStorage.getItem('access_token'),
      hasSession: !!localStorage.getItem('spark_session'),
      apiBase: import.meta.env.VITE_API_URL || 'http://localhost:4000',
      currentUrl: window.location.href,
      userAgent: navigator.userAgent
    };
    setDebugInfo(info);
  }, []);

  const testConnection = async () => {
    try {
      setTestResult('Testing connection...');
      const response = await fetch(`${debugInfo.apiBase}/health`);
      const data = await response.json();
      setTestResult(`✅ Connection successful: ${JSON.stringify(data)}`);
    } catch (error) {
      setTestResult(`❌ Connection failed: ${error}`);
    }
  };

  const testLogin = async () => {
    try {
      setTestResult('Testing login...');
      const response = await api.post('/auth/login', { 
        username: 'testuser', 
        password: 'password123' 
      });
      setTestResult(`✅ Login successful: ${JSON.stringify(response)}`);
    } catch (error) {
      setTestResult(`❌ Login failed: ${error}`);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('spark_session');
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-semibold mb-2">Auth Debug</h3>
      <div className="text-xs space-y-1 mb-3">
        <div>Access Token: {debugInfo.hasAccessToken ? '✅' : '❌'}</div>
        <div>Session: {debugInfo.hasSession ? '✅' : '❌'}</div>
        <div>API Base: {debugInfo.apiBase}</div>
      </div>
      <div className="space-y-2">
        <button 
          onClick={testConnection}
          className="w-full px-2 py-1 bg-blue-500 text-white text-xs rounded"
        >
          Test Connection
        </button>
        <button 
          onClick={testLogin}
          className="w-full px-2 py-1 bg-green-500 text-white text-xs rounded"
        >
          Test Login
        </button>
        <button 
          onClick={clearAuth}
          className="w-full px-2 py-1 bg-red-500 text-white text-xs rounded"
        >
          Clear Auth
        </button>
      </div>
      {testResult && (
        <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
          {testResult}
        </div>
      )}
    </div>
  );
};

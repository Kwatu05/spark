import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface QueueData {
  [key: string]: QueueStats;
}

const QueueDashboard: React.FC = () => {
  const [queueData, setQueueData] = useState<QueueData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [queueDetails, setQueueDetails] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueueStats = async () => {
    try {
      const response = await api.get('/queue/stats');
      if (response.data.ok) {
        setQueueData(response.data.data);
        setError(null);
      } else {
        setError('Failed to fetch queue statistics');
      }
    } catch (err) {
      setError('Failed to fetch queue statistics');
      console.error('Queue stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueDetails = async (queueName: string) => {
    try {
      setRefreshing(true);
      const response = await api.get(`/queue/queue/${queueName}`);
      if (response.data.ok) {
        setQueueDetails(response.data.data);
      } else {
        setError('Failed to fetch queue details');
      }
    } catch (err) {
      setError('Failed to fetch queue details');
      console.error('Queue details error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const retryJob = async (queueName: string, jobId: string) => {
    try {
      const response = await api.post(`/queue/queue/${queueName}/job/${jobId}/retry`);
      if (response.data.ok) {
        // Refresh queue details
        fetchQueueDetails(queueName);
      } else {
        setError('Failed to retry job');
      }
    } catch (err) {
      setError('Failed to retry job');
      console.error('Retry job error:', err);
    }
  };

  const removeJob = async (queueName: string, jobId: string) => {
    try {
      const response = await api.delete(`/queue/queue/${queueName}/job/${jobId}`);
      if (response.data.ok) {
        // Refresh queue details
        fetchQueueDetails(queueName);
      } else {
        setError('Failed to remove job');
      }
    } catch (err) {
      setError('Failed to remove job');
      console.error('Remove job error:', err);
    }
  };

  const pauseQueue = async (queueName: string) => {
    try {
      const response = await api.post(`/queue/queue/${queueName}/pause`);
      if (response.data.ok) {
        fetchQueueStats();
        fetchQueueDetails(queueName);
      } else {
        setError('Failed to pause queue');
      }
    } catch (err) {
      setError('Failed to pause queue');
      console.error('Pause queue error:', err);
    }
  };

  const resumeQueue = async (queueName: string) => {
    try {
      const response = await api.post(`/queue/queue/${queueName}/resume`);
      if (response.data.ok) {
        fetchQueueStats();
        fetchQueueDetails(queueName);
      } else {
        setError('Failed to resume queue');
      }
    } catch (err) {
      setError('Failed to resume queue');
      console.error('Resume queue error:', err);
    }
  };

  const cleanQueue = async (queueName: string, type: string = 'completed') => {
    try {
      const response = await api.post(`/queue/queue/${queueName}/clean`, { type });
      if (response.data.ok) {
        fetchQueueStats();
        fetchQueueDetails(queueName);
      } else {
        setError('Failed to clean queue');
      }
    } catch (err) {
      setError('Failed to clean queue');
      console.error('Clean queue error:', err);
    }
  };

  useEffect(() => {
    fetchQueueStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueueStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      fetchQueueDetails(selectedQueue);
    }
  }, [selectedQueue]);

  const getQueueColor = (queueName: string) => {
    const colors: { [key: string]: string } = {
      'media processing': 'bg-blue-500',
      'email notifications': 'bg-green-500',
      'push notifications': 'bg-purple-500',
      'analytics processing': 'bg-yellow-500',
      'data processing': 'bg-red-500'
    };
    return colors[queueName] || 'bg-gray-500';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatJobData = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Queue Dashboard</h1>
        <p className="text-gray-600">Monitor and manage background job queues</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Queue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {Object.entries(queueData).map(([queueName, stats]) => (
          <div
            key={queueName}
            className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedQueue === queueName ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedQueue(queueName)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {queueName.replace(' processing', '').replace(' notifications', '')}
              </h3>
              <div className={`w-3 h-3 rounded-full ${getQueueColor(queueName)}`}></div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Waiting:</span>
                <span className="text-sm font-medium text-blue-600">{stats.waiting}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active:</span>
                <span className="text-sm font-medium text-green-600">{stats.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed:</span>
                <span className="text-sm font-medium text-gray-600">{stats.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Failed:</span>
                <span className="text-sm font-medium text-red-600">{stats.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Delayed:</span>
                <span className="text-sm font-medium text-yellow-600">{stats.delayed}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Queue Details */}
      {selectedQueue && queueDetails && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {selectedQueue.replace(' processing', '').replace(' notifications', '')} Queue Details
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => pauseQueue(selectedQueue)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600"
                >
                  Pause
                </button>
                <button
                  onClick={() => resumeQueue(selectedQueue)}
                  className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
                >
                  Resume
                </button>
                <button
                  onClick={() => cleanQueue(selectedQueue, 'completed')}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                >
                  Clean Completed
                </button>
                <button
                  onClick={() => cleanQueue(selectedQueue, 'failed')}
                  className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
                >
                  Clean Failed
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Failed Jobs */}
            {queueDetails.failed && queueDetails.failed.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Failed Jobs</h3>
                <div className="space-y-4">
                  {queueDetails.failed.map((job: any) => (
                    <div key={job.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium text-red-800">Job #{job.id}</span>
                          <span className="text-sm text-red-600 ml-2">({job.name})</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => retryJob(selectedQueue, job.id)}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          >
                            Retry
                          </button>
                          <button
                            onClick={() => removeJob(selectedQueue, job.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-red-700 mb-2">
                        <strong>Error:</strong> {job.failedReason}
                      </div>
                      <div className="text-sm text-red-600 mb-2">
                        <strong>Attempts:</strong> {job.attemptsMade}
                      </div>
                      <div className="text-sm text-red-600 mb-2">
                        <strong>Failed at:</strong> {formatTimestamp(job.finishedOn)}
                      </div>
                      <details className="text-sm">
                        <summary className="cursor-pointer text-red-700 font-medium">Job Data</summary>
                        <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-auto">
                          {formatJobData(job.data)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Jobs */}
            {queueDetails.active && queueDetails.active.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Jobs</h3>
                <div className="space-y-4">
                  {queueDetails.active.map((job: any) => (
                    <div key={job.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium text-green-800">Job #{job.id}</span>
                          <span className="text-sm text-green-600 ml-2">({job.name})</span>
                        </div>
                        <div className="text-sm text-green-600">
                          {Math.round(job.progress)}% complete
                        </div>
                      </div>
                      <div className="text-sm text-green-600 mb-2">
                        <strong>Started:</strong> {formatTimestamp(job.processedOn)}
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waiting Jobs */}
            {queueDetails.waiting && queueDetails.waiting.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Waiting Jobs</h3>
                <div className="space-y-4">
                  {queueDetails.waiting.slice(0, 10).map((job: any) => (
                    <div key={job.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium text-blue-800">Job #{job.id}</span>
                          <span className="text-sm text-blue-600 ml-2">({job.name})</span>
                        </div>
                        <button
                          onClick={() => removeJob(selectedQueue, job.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="text-sm text-blue-600 mb-2">
                        <strong>Queued:</strong> {formatTimestamp(job.timestamp)}
                      </div>
                      {job.delay > 0 && (
                        <div className="text-sm text-blue-600 mb-2">
                          <strong>Delayed by:</strong> {Math.round(job.delay / 1000)}s
                        </div>
                      )}
                    </div>
                  ))}
                  {queueDetails.waiting.length > 10 && (
                    <div className="text-sm text-gray-500 text-center">
                      ... and {queueDetails.waiting.length - 10} more waiting jobs
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Completed Jobs */}
            {queueDetails.completed && queueDetails.completed.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Completed Jobs</h3>
                <div className="space-y-2">
                  {queueDetails.completed.slice(0, 5).map((job: any) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-800">Job #{job.id}</span>
                          <span className="text-sm text-gray-600 ml-2">({job.name})</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTimestamp(job.finishedOn)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {queueDetails.completed.length > 5 && (
                    <div className="text-sm text-gray-500 text-center">
                      ... and {queueDetails.completed.length - 5} more completed jobs
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueDashboard;

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Loader2 } from 'lucide-react';

type LogViewerProps = {
  projectId: string;
};


function LogViewer({ projectId }:LogViewerProps) {
const [logs, setLogs] = useState<string[]>([]);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;

    const socket = io('http://localhost:9001');
    
    // Connection events
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe', projectId);
    });

    socket.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
      setConnected(false);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Message handling
    socket.on('message', (message) => {
      console.log('Socket message:', message);
    });

    socket.on('log', (logMessage) => {
      setLogs(prevLogs => [...prevLogs, logMessage]);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [projectId]);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    const logsContainer = document.getElementById('logs-container');
    if (logsContainer) {
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }
  }, [logs]);

  if (!projectId) {
    return null;
  }

  return (
    <div className="relative">
      <div 
        id="logs-container"
        className="bg-gray-900 font-mono text-sm text-gray-300 h-64 overflow-auto p-4 rounded-md"
      >
        {logs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="animate-spin h-6 w-6 text-gray-500 mb-2" />
            <p className="text-gray-500">Waiting for logs...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-400 p-2">
            {error}
          </div>
        )}
        
        {logs.map((log, index) => (
          <div key={index} className="mb-1 break-words">
            {log}
          </div>
        ))}
      </div>
      
      {connected && (
        <div className="absolute bottom-2 right-2 flex items-center">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
          <span className="text-xs text-gray-400">Connected</span>
        </div>
      )}
    </div>
  );
}

export default LogViewer;
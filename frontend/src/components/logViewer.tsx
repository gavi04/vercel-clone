import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:9001', {
  transports: ['websocket'],
  reconnectionAttempts: 5,
}); // More stable connection

const LogViewer = ({ projectId }) => {
  const [logs, setLogs] = useState<string[]>([]);


  useEffect(() => {
    if (!projectId) return;

    // Clear previous logs on project change
    setLogs([]);

    // Subscribe to project-specific log channel
    socket.emit('subscribe', projectId);

    const handleMessage = (msg:any) => {
      console.log(`[Socket Message]: ${msg}`);
    };

    const handleLog = (log: any) => {
      setLogs((prevLogs) => [...prevLogs, log]);
    };

    socket.on('message', handleMessage);
    socket.on('log', handleLog);

    return () => {
      socket.off('message', handleMessage);
      socket.off('log', handleLog);
    };
  }, [projectId]);

  return (
    <div className="p-4 bg-black text-green-400 font-mono h-screen overflow-y-scroll">
      <h2 className="text-white mb-4">Logs for: {projectId}</h2>
      {logs.map((log, idx) => (
        <div key={idx} className="mb-1 whitespace-pre-wrap">{log}</div>
      ))}
    </div>
  );
};

export default LogViewer;

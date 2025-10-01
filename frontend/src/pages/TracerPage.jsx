import React, { useState, useEffect } from "react";
import "./TracerPage.css";
import { ArrowRight } from "lucide-react";

const TracerPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:3000/api/alls");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setLogs(data);
      console.log(data);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const groupLogsByDate = (logs) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = { today: [], yesterday: [], older: [] };

    logs.forEach((log) => {
      const logDate = new Date(log.timestamp);
      if (logDate.toDateString() === today.toDateString())
        groups.today.push(log);
      else if (logDate.toDateString() === yesterday.toDateString())
        groups.yesterday.push(log);
      else groups.older.push(log);
    });

    Object.keys(groups).forEach((key) =>
      groups[key].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    );

    return groups;
  };

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString();

  // --- Render a single log entry ---
  const LogEntry = ({ log }) => (
    <div className="log-entry">
      <div className="log-entry-content">
        <div className="log-entry-main">
          <div className="log-entry-details">
            {/* ID + Method + Path */}
            <div className="log-entry-meta">
              <span className="log-entry-id">
                [{log._id}] <ArrowRight size={16} />
              </span>
              <span className="badge badge-method">{log.method}</span>
              <span className="badge badge-path">{log.path}</span>
              <span className="badge badge-status">{log.status}</span>
            </div>

            {/* Request / Response */}
            <div className="log-entry-message">
              <strong>Entered user controllers?</strong>
              <br />
              <strong>DB to fetch user logs</strong>
              <br />
              <strong>Response:</strong>{" "}
              <pre className="log-entry-response">
                {log.response
                  ? JSON.stringify(log.response, null, 2)
                  : "No response"}
              </pre>
            </div>

            {/* Duration */}

            {/* Optional console logs */}
            {log.consoleLogs?.length > 0 && (
              <div className="log-entry-console">
                <strong>Console Logs:</strong>
                <ul>
                  {log.consoleLogs.map((cl, i) => (
                    <li key={i}>
                      [{cl.level}] {cl.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {log.durationMs !== undefined && (
              <div className="log-entry-duration">
                Duration: ({log.durationMs})ms
              </div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="log-entry-timestamp">
          <span>🕐</span>
          <span>{formatTime(log.timestamp)}</span>
        </div>
      </div>
    </div>
  );

  const LogSection = ({ title, logs }) => {
    if (!logs || logs.length === 0) return null;
    return (
      <div className="log-section">
        <div className="log-section-header">
          <span>📅</span>
          <h2 className="log-section-title">{title}</h2>
          <span className="log-section-count">{logs.length}</span>
        </div>
        <div className="log-entries">
          {logs.map((log) => (
            <LogEntry key={log._id} log={log} />
          ))}
        </div>
      </div>
    );
  };

  const groupedLogs = groupLogsByDate(logs);

  return (
    <div className="api-tracer-container">
      <div className="api-tracer-content">
        <div className="api-tracer-header">
          <h1>API Trace Logs</h1>
        </div>

        {error && <div className="error-message">❌ {error}</div>}
        {loading && logs.length === 0 && <div>Loading...</div>}
        {!loading && logs.length === 0 && !error && (
          <div>No logs available</div>
        )}

        {logs.length > 0 && (
          <>
            <LogSection title="Today" logs={groupedLogs.today} />
            <LogSection title="Yesterday" logs={groupedLogs.yesterday} />
            <LogSection title="Older" logs={groupedLogs.older} />
          </>
        )}

        {logs.length > 0 && (
          <div className="stats-footer">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TracerPage;

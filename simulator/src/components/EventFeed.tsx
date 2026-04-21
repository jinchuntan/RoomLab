import type { DiagnosticEvent } from '../../../shared/src';

interface EventFeedProps {
  logs: DiagnosticEvent[];
}

export const EventFeed = ({ logs }: EventFeedProps) => {
  const issueCount = logs.filter((log) => log.level === 'warn' || log.level === 'error').length;

  return (
    <details className="panel diagnostics-panel">
      <summary className="diagnostics-summary">
        <div className="summary-heading">
          <p className="eyebrow">Diagnostics</p>
          <h2>Debug log</h2>
        </div>
        <span className="status-pill">{issueCount > 0 ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : `${logs.length} events`}</span>
      </summary>

      <div className="event-feed">
        {logs.length === 0 ? (
          <p className="muted-text">Logs will show up here if something goes wrong.</p>
        ) : (
          logs.map((log) => (
            <div className={`event-row event-${log.level}`} key={log.id}>
              <div>
                <strong>{log.scope}</strong>
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p>{log.message}</p>
            </div>
          ))
        )}
      </div>
    </details>
  );
};

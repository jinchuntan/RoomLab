import type { DiagnosticEvent } from '../../../shared/src';

interface EventFeedProps {
  logs: DiagnosticEvent[];
}

export const EventFeed = ({ logs }: EventFeedProps) => {
  return (
    <section className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Diagnostics</p>
        <h2>Session and sync trace</h2>
      </div>

      <div className="event-feed">
        {logs.length === 0 ? (
          <p className="muted-text">Logs will appear here once the room starts processing events.</p>
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
    </section>
  );
};

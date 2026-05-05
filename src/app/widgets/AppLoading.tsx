
import React from 'react';
import type { LoadingStepState } from '../../App';

interface AppLoadingProps {
  message?: string;
  steps?: LoadingStepState[];
  startTime?: number;
}

const stepStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#e0e0e0',
    background: '#1a1a2e',
  },
  message: {
    fontSize: '1rem',
    opacity: 0.7,
    marginTop: 8,
    marginBottom: 16,
  },
  stepList: {
    listStyle: 'none',
    padding: 0,
    margin: '8px 0 0 0',
    width: 340,
    maxWidth: '90vw',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '5px 0',
    fontSize: '0.85rem',
    lineHeight: 1.4,
  },
  icon: {
    flexShrink: 0,
    width: 18,
    textAlign: 'center' as const,
    fontSize: '0.9rem',
  },
  label: {
    flex: 1,
  },
  timing: {
    fontSize: '0.75rem',
    opacity: 0.5,
    marginLeft: 'auto',
    flexShrink: 0,
  },
  errorText: {
    fontSize: '0.75rem',
    color: '#ff6b6b',
    marginLeft: 28,
    marginTop: 2,
    wordBreak: 'break-word' as const,
  },
  detail: {
    fontSize: '0.75rem',
    opacity: 0.45,
    marginLeft: 28,
    marginTop: 1,
  },
  elapsed: {
    fontSize: '0.75rem',
    opacity: 0.4,
    marginTop: 12,
  },
};

const statusIcons: Record<string, { symbol: string; color: string }> = {
  pending: { symbol: '○', color: '#555' },
  active: { symbol: '◉', color: '#4fc3f7' },
  done: { symbol: '✓', color: '#66bb6a' },
  error: { symbol: '✗', color: '#ff6b6b' },
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const ElapsedTimer: React.FC<{ startTime: number }> = ({ startTime }) => {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  return <div style={stepStyles.elapsed}>Elapsed: {formatDuration(now - startTime)}</div>;
};

const AppLoading: React.FC<AppLoadingProps> = ({ message, steps, startTime }) => {
  const hasSteps = steps && steps.length > 0;
  const activeStep = hasSteps ? steps.find(s => s.status === 'active') : null;

  return (
    <div style={stepStyles.container}>
      <div id="default_loader" className="loader">
        <div className="loader-inner">
          <div className="loader-line-wrap"><div className="loader-line"></div></div>
          <div className="loader-line-wrap"><div className="loader-line"></div></div>
          <div className="loader-line-wrap"><div className="loader-line"></div></div>
          <div className="loader-line-wrap"><div className="loader-line"></div></div>
          <div className="loader-line-wrap"><div className="loader-line"></div></div>
        </div>
      </div>
      <p style={stepStyles.message}>
        {activeStep ? activeStep.label : (message || 'Loading')}
      </p>
      {hasSteps && (
        <ul style={stepStyles.stepList}>
          {steps.map((step) => {
            const { symbol, color } = statusIcons[step.status] || statusIcons.pending;
            const isPending = step.status === 'pending';
            const duration = step.startedAt && step.completedAt
              ? formatDuration(step.completedAt - step.startedAt)
              : null;

            return (
              <li key={step.id}>
                <div style={{ ...stepStyles.stepItem, opacity: isPending ? 0.4 : 1 }}>
                  <span style={{ ...stepStyles.icon, color }}>{symbol}</span>
                  <span style={stepStyles.label}>{step.label}</span>
                  {duration && <span style={stepStyles.timing}>{duration}</span>}
                </div>
                {step.status === 'error' && step.error && (
                  <div style={stepStyles.errorText}>{step.error}</div>
                )}
                {step.status === 'done' && step.detail && (
                  <div style={stepStyles.detail}>{step.detail}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {startTime && <ElapsedTimer startTime={startTime} />}
    </div>
  );
};

export default AppLoading;
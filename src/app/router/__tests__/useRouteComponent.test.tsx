import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ReactoryApiEventNames } from '@reactory/client-core/api';
import { useRouteComponent } from '../hooks/useRouteComponent';
import { createMockReactory } from './testUtils';

const Probe: React.FC<{ reactory: any; fqn: string; timeoutMs?: number }> = ({
  reactory,
  fqn,
  timeoutMs = 400,
}) => {
  const resolution = useRouteComponent(reactory, fqn, timeoutMs);
  return (
    <div>
      <div data-testid="status">{resolution.status}</div>
      <div data-testid="has-component">{resolution.component ? 'yes' : 'no'}</div>
      <button type="button" onClick={resolution.stopWaiting}>stop</button>
      <button type="button" onClick={resolution.retry}>retry</button>
    </div>
  );
};

describe('useRouteComponent', () => {
  it('resolves immediately when the component is already registered', () => {
    const Home = () => <div>home</div>;
    const reactory = createMockReactory({
      components: { 'core.Home@1.0.0': Home },
    });

    render(<Probe reactory={reactory} fqn="core.Home@1.0.0" />);
    expect(screen.getByTestId('status').textContent).toBe('ready');
    expect(screen.getByTestId('has-component').textContent).toBe('yes');
  });

  it('times out when the FQN never registers', async () => {
    jest.useFakeTimers();
    const reactory = createMockReactory({ components: {} });
    render(<Probe reactory={reactory} fqn="core.Missing@1.0.0" timeoutMs={300} />);

    expect(screen.getByTestId('status').textContent).toBe('resolving');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('timeout');
    });
    jest.useRealTimers();
  });

  it('becomes ready when a plugin registers the component later', async () => {
    jest.useFakeTimers();
    const reactory = createMockReactory({ components: {} });
    const Late = () => <div>late</div>;
    render(<Probe reactory={reactory} fqn="core.Late@1.0.0" timeoutMs={2000} />);

    expect(screen.getByTestId('status').textContent).toBe('resolving');
    act(() => {
      reactory.registerComponent('core.Late@1.0.0', Late);
      reactory.emit(ReactoryApiEventNames.onPluginLoaded, 'late-plugin');
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });
    jest.useRealTimers();
  });

  it('stopWaiting exits the resolving state', async () => {
    const reactory = createMockReactory({ components: {} });
    render(<Probe reactory={reactory} fqn="core.Slow@1.0.0" timeoutMs={8000} />);
    act(() => {
      screen.getByText('stop').click();
    });
    expect(screen.getByTestId('status').textContent).toBe('timeout');
  });

  it('records plugin errors while continuing to wait', async () => {
    jest.useFakeTimers();
    const reactory = createMockReactory({ components: {} });
    render(<Probe reactory={reactory} fqn="core.Slow@1.0.0" timeoutMs={2000} />);
    act(() => {
      reactory.emit(ReactoryApiEventNames.onPluginError, { plugin: 'broken', error: 'fail' });
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('status').textContent).toBe('resolving');
    jest.useRealTimers();
  });
});

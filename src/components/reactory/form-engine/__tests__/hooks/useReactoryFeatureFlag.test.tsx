/**
 * @jest-environment jsdom
 *
 * Regression guards for the forms-engine v5 rollout blockers.
 *
 * Blocker 1: the flag was configured as `value: true` but with `enabled`
 * omitted. The embedded `ReactoryFeatureFlagValue` schema defaults `enabled`
 * to false, and this hook resolves `enabled !== false && value === true` — so
 * a flag that *looks* switched on silently resolved to off and every form kept
 * rendering through the legacy fork.
 *
 * These tests pin the resolution rules so that trap cannot return unnoticed.
 */

import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useQuery } from '@apollo/client';

import {
  useReactoryFeatureFlag,
  FORMS_ENGINE_V5_FQN,
} from '../../hooks/useReactoryFeatureFlag';

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(),
}));

const mockUseQuery = useQuery as unknown as jest.Mock;

type Flag = { feature?: string; value?: unknown; enabled?: boolean; roles?: string[] };

const setQueryResult = (flags: Flag[] | null, opts: { loading?: boolean; error?: Error | null } = {}) => {
  mockUseQuery.mockReturnValue({
    data: flags === null ? undefined : { ReactoryEffectiveFeatureFlags: flags },
    loading: opts.loading ?? false,
    error: opts.error ?? null,
  });
};

/** Renders the hook and exposes its resolved value in the DOM. */
const Probe: React.FC<{ defaultTo?: boolean }> = ({ defaultTo = false }) => {
  const { value, loading } = useReactoryFeatureFlag<boolean>(FORMS_ENGINE_V5_FQN, defaultTo);
  return (
    <span data-testid="out">{loading ? 'loading' : String(value)}</span>
  );
};

describe('useReactoryFeatureFlag', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('reports the flag FQN as core.FormsEngineV5@1.0.0', () => {
    expect(FORMS_ENGINE_V5_FQN).toBe('core.FormsEngineV5@1.0.0');
  });

  it('returns true when value is true and enabled is true', () => {
    setQueryResult([{ feature: FORMS_ENGINE_V5_FQN, value: true, enabled: true }]);
    render(<Probe />);
    expect(screen.getByTestId('out')).toHaveTextContent('true');
  });

  it('returns FALSE when value is true but enabled is false (the rollout trap)', () => {
    setQueryResult([{ feature: FORMS_ENGINE_V5_FQN, value: true, enabled: false }]);
    render(<Probe />);
    expect(screen.getByTestId('out')).toHaveTextContent('false');
  });

  it('returns false when enabled is true but value is false', () => {
    setQueryResult([{ feature: FORMS_ENGINE_V5_FQN, value: false, enabled: true }]);
    render(<Probe />);
    expect(screen.getByTestId('out')).toHaveTextContent('false');
  });

  it('accepts string and numeric truthy values', () => {
    setQueryResult([{ feature: FORMS_ENGINE_V5_FQN, value: 'true', enabled: true }]);
    const { unmount } = render(<Probe />);
    expect(screen.getByTestId('out')).toHaveTextContent('true');
    unmount();

    setQueryResult([{ feature: FORMS_ENGINE_V5_FQN, value: 1, enabled: true }]);
    render(<Probe />);
    expect(screen.getByTestId('out')).toHaveTextContent('true');
  });

  it('falls back to the default while the query is loading', () => {
    setQueryResult([{ feature: FORMS_ENGINE_V5_FQN, value: true, enabled: true }], { loading: true });
    render(<Probe defaultTo={false} />);
    expect(screen.getByTestId('out')).toHaveTextContent('loading');
  });

  it('falls back to the default when the flag is absent from the response', () => {
    setQueryResult([{ feature: 'some.OtherFlag@1.0.0', value: true, enabled: true }]);
    render(<Probe defaultTo={false} />);
    expect(screen.getByTestId('out')).toHaveTextContent('false');
  });

  it('falls back to the default when the response has no flags array', () => {
    setQueryResult(null);
    render(<Probe defaultTo={false} />);
    expect(screen.getByTestId('out')).toHaveTextContent('false');
  });

  it('falls back to the default on a query error', () => {
    setQueryResult([{ feature: FORMS_ENGINE_V5_FQN, value: true, enabled: true }], {
      error: new Error('network down'),
    });
    render(<Probe defaultTo={false} />);
    expect(screen.getByTestId('out')).toHaveTextContent('false');
  });

  it('reads the flags with a cache-first policy so forms stay cheap to mount', () => {
    setQueryResult([{ feature: FORMS_ENGINE_V5_FQN, value: true, enabled: true }]);
    render(<Probe />);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fetchPolicy: 'cache-first' }),
    );
  });

  it('passes non-boolean defaults through untouched', () => {
    const StringProbe: React.FC = () => {
      const { value } = useReactoryFeatureFlag<string>('core.SomeFlag@1.0.0', 'fallback');
      return <span data-testid="out">{String(value)}</span>;
    };
    setQueryResult([{ feature: 'core.SomeFlag@1.0.0', value: 'configured' }]);
    render(<StringProbe />);
    expect(screen.getByTestId('out')).toHaveTextContent('configured');
  });
});

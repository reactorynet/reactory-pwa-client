import React, { useEffect, useState } from 'react';
import { render, act, screen } from '@testing-library/react';
import { ReactoryContext, withReactory } from '../ApiProvider';

/**
 * withReactory used to build its error boundary by calling an HOC inside its
 * own render function. That produces a new component *type* on every pass, and
 * React treats a changed type as a different component: it unmounts the whole
 * subtree and mounts a fresh one. Measured before the fix, a wrapped component
 * logged six mounts across six parent renders instead of one.
 *
 * Every component in the application goes through this wrapper, so the cost was
 * paid everywhere: state discarded on each parent render, effects re-run, and
 * anything fetching on mount refetching every time. These tests hold the
 * component type stable.
 */

describe('withReactory mounting stability', () => {
  const makeLeaf = () => {
    const counters = { mounts: 0, renders: 0, unmounts: 0 };
    const Leaf: React.FC<any> = ({ label }) => {
      counters.renders += 1;
      useEffect(() => {
        counters.mounts += 1;
        return () => {
          counters.unmounts += 1;
        };
      }, []);
      return <div data-testid="leaf">{label}</div>;
    };
    return { Leaf, counters };
  };

  const reactoryStub: any = { log: jest.fn() };

  const renderWithParent = (Wrapped: React.ComponentType<any>) => {
    const Parent: React.FC = () => {
      const [n, setN] = useState(0);
      return (
        <ReactoryContext.Provider value={reactoryStub}>
          <button data-testid="bump" onClick={() => setN(n + 1)}>
            {n}
          </button>
          <Wrapped label="hello" />
        </ReactoryContext.Provider>
      );
    };
    return render(<Parent />);
  };

  const bump = (times: number) => {
    for (let i = 0; i < times; i += 1) {
      act(() => {
        screen.getByTestId('bump').click();
      });
    }
  };

  it('mounts the wrapped component exactly once across many parent renders', () => {
    const { Leaf, counters } = makeLeaf();
    renderWithParent(withReactory(Leaf, 'test.Leaf@1.0.0'));

    bump(5);

    expect(counters.renders).toBe(6);
    // The assertion that matters: re-rendering is fine, remounting is not.
    expect(counters.mounts).toBe(1);
    expect(counters.unmounts).toBe(0);
  });

  it('preserves the wrapped component state across parent renders', () => {
    const Counter: React.FC<any> = () => {
      const [count, setCount] = useState(0);
      return (
        <button data-testid="inner" onClick={() => setCount(count + 1)}>
          {count}
        </button>
      );
    };

    renderWithParent(withReactory(Counter, 'test.Counter@1.0.0'));

    act(() => screen.getByTestId('inner').click());
    act(() => screen.getByTestId('inner').click());
    expect(screen.getByTestId('inner').textContent).toBe('2');

    // A remount would reset this to 0, silently losing whatever the user was
    // in the middle of doing.
    bump(3);
    expect(screen.getByTestId('inner').textContent).toBe('2');
  });

  it('runs a mount effect once, so fetch-on-mount does not refetch per render', () => {
    const fetchSpy = jest.fn();
    const Fetcher: React.FC<any> = () => {
      useEffect(() => {
        fetchSpy();
      }, []);
      return <div data-testid="leaf">fetcher</div>;
    };

    renderWithParent(withReactory(Fetcher, 'test.Fetcher@1.0.0'));
    bump(5);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('injects the reactory sdk into the wrapped component', () => {
    const Probe: React.FC<any> = ({ reactory }) => (
      <div data-testid="leaf">{reactory ? 'has-sdk' : 'no-sdk'}</div>
    );

    renderWithParent(withReactory(Probe, 'test.Probe@1.0.0'));
    expect(screen.getByTestId('leaf').textContent).toBe('has-sdk');
  });

  it('passes through the caller props', () => {
    const { Leaf } = makeLeaf();
    renderWithParent(withReactory(Leaf, 'test.Leaf@1.0.0'));
    expect(screen.getByTestId('leaf').textContent).toBe('hello');
  });

  it('still catches errors thrown by the wrapped component', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const Boom: React.FC<any> = () => {
      throw new Error('kaboom');
    };

    renderWithParent(withReactory(Boom, 'test.Boom@1.0.0'));

    expect(screen.getByRole('alert')).toHaveTextContent('kaboom');
    expect(reactoryStub.log).toHaveBeenCalledWith(
      expect.stringContaining('test.Boom@1.0.0'),
      expect.anything()
    );

    consoleError.mockRestore();
  });

  it('gives the wrapper a useful display name', () => {
    const { Leaf } = makeLeaf();
    Leaf.displayName = 'MyLeaf';
    const Wrapped: any = withReactory(Leaf, 'test.Leaf@1.0.0');
    expect(Wrapped.displayName).toBe('withReactory(MyLeaf)');
  });

  it('rejects a null component up front rather than at render time', () => {
    expect(() => withReactory(null as any, 'test.Null@1.0.0')).toThrow();
  });
});

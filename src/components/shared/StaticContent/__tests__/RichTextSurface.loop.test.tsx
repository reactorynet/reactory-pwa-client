import React, { useCallback, useState } from 'react';
import { render, screen } from '@testing-library/react';
import RichTextSurface from '../editor/RichTextSurface';

/**
 * RichTextSurface is a controlled component, and react-quill resolves the
 * controlled contract by comparing the incoming `value` against the editor's
 * current HTML and overwriting the editor whenever they differ.
 *
 * That makes any lossy transform on the value path a feedback loop: the editor
 * emits HTML, the host stores a transformed version, the transform back into
 * editor form does not reproduce Quill's exact normalisation, react-quill sees
 * a difference and rewrites the editor, which emits again. React eventually
 * gives up with "Maximum update depth exceeded".
 *
 * Component tags are exactly such a transform — stored as `<reactory />`, shown
 * to Quill as an embed. These tests hold the surface stable under it.
 */

const Host: React.FC<{ initial: string; onValue?: (v: string) => void }> = ({
  initial,
  onValue,
}) => {
  const [value, setValue] = useState(initial);
  const [renders, setRenders] = useState(0);

  const handleChange = useCallback(
    (next: string) => {
      setValue(next);
      setRenders((r) => r + 1);
      onValue?.(next);
    },
    [onValue]
  );

  return (
    <div>
      <span data-testid="changes">{renders}</span>
      <RichTextSurface value={value} onChange={handleChange} />
    </div>
  );
};

describe('RichTextSurface controlled-value stability', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => consoleError.mockRestore());

  const loopErrors = () =>
    consoleError.mock.calls
      .map((args) => String(args[0]))
      .filter((message) => /Maximum update depth|too many re-renders/i.test(message));

  it('settles when mounted with plain content', () => {
    render(<Host initial="<p>Hello world</p>" />);
    expect(loopErrors()).toEqual([]);
  });

  it('settles when mounted with content containing a component tag', () => {
    // The case that loops: the value round-trips through the embed transform.
    render(
      <Host initial={'<p>Before</p><reactory reactory-component="core.Label@1.0.0" reactory-props-text="Hi" /><p>After</p>'} />
    );
    expect(loopErrors()).toEqual([]);
  });

  it('does not emit an unbounded stream of changes for a component tag', () => {
    render(
      <Host initial={'<reactory reactory-component="core.Label@1.0.0" reactory-props-text="Hi" />'} />
    );

    // Quill normalises on mount, so one or two changes are expected. A loop
    // shows up as a runaway count.
    const changes = Number(screen.getByTestId('changes').textContent);
    expect(changes).toBeLessThan(5);
  });

  it('preserves the component tag in the value it reports back', () => {
    const seen: string[] = [];
    render(
      <Host
        initial={'<p>Before</p><reactory reactory-component="core.Label@1.0.0" reactory-props-text="Hi" /><p>After</p>'}
        onValue={(v) => seen.push(v)}
      />
    );

    // Whatever normalisation happens, the component must survive it — silently
    // dropping the tag is the bug the embed exists to prevent.
    if (seen.length > 0) {
      expect(seen[seen.length - 1]).toContain('reactory-component="core.Label@1.0.0"');
    }
  });

  it('settles with several component tags', () => {
    render(
      <Host initial={'<reactory reactory-component="core.A@1.0.0" /><p>mid</p><reactory reactory-component="core.B@1.0.0" />'} />
    );
    expect(loopErrors()).toEqual([]);
  });
});

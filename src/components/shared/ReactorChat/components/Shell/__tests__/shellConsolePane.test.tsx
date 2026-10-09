import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ShellConsolePane from '../ShellConsolePane';

/** Stand-in terminal that records the height it was rendered at. */
const renderTerminal = (height: number | string) => (
  <div data-testid="terminal" data-height={String(height)} />
);

const collapsedHeight = (): string | null => screen.getByTestId('terminal').getAttribute('data-height');

describe('ShellConsolePane', () => {
  it('renders the title and the terminal at the collapsed height', () => {
    render(
      <ShellConsolePane id="s1" title="$ ls -la" height={200} expandedHeight={600} renderTerminal={renderTerminal} />,
    );

    expect(screen.getByText('$ ls -la')).toBeInTheDocument();
    expect(collapsedHeight()).toBe('200');
  });

  it('expands and collapses the terminal inline', () => {
    render(
      <ShellConsolePane id="s1" title="$ ls -la" height={200} expandedHeight={600} renderTerminal={renderTerminal} />,
    );

    fireEvent.click(screen.getByLabelText('toggle-s1'));
    expect(collapsedHeight()).toBe('600');

    fireEvent.click(screen.getByLabelText('toggle-s1'));
    expect(collapsedHeight()).toBe('200');
  });

  it('opens an enlarged dialog at full height and closes it with Escape', () => {
    render(<ShellConsolePane id="s1" title="$ ls -la" renderTerminal={renderTerminal} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('maximize-s1'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // The enlarged terminal fills the dialog.
    expect(
      screen.getAllByTestId('terminal').some((node) => node.getAttribute('data-height') === '100%'),
    ).toBe(true);

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the enlarged dialog from the close control', () => {
    render(<ShellConsolePane id="s1" title="$ ls -la" renderTerminal={renderTerminal} />);

    fireEvent.click(screen.getByLabelText('maximize-s1'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('close-modal-s1'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('copies the supplied text to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(
      <ShellConsolePane id="s1" title="$ ls -la" renderTerminal={renderTerminal} getCopyText={() => 'hello'} />,
    );

    fireEvent.click(screen.getByLabelText('copy-s1'));

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('hides the copy control when no copy text is provided', () => {
    render(<ShellConsolePane id="s1" title="$ ls -la" renderTerminal={renderTerminal} />);
    expect(screen.queryByLabelText('copy-s1')).toBeNull();
  });
});

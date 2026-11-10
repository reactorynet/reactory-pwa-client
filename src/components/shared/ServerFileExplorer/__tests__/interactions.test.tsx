import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import ServerFileExplorer from '../ServerFileExplorer';
import { createExplorerHarness, file, folder } from './explorerHarness';

/**
 * Interaction tests for the wiring this ticket adds:
 *
 *  - the footer "Select this folder" action, and its close behaviour;
 *  - the folder row context-menu item;
 *  - navigating to a new root when the `serverPath` prop changes, including the
 *    stale-response guard in `useServerFiles.loadPath` (a slower read of the
 *    previous root must not overwrite the new root's listing).
 */

const setup = (initialProps: Record<string, unknown> = {}) => {
  const harness = createExplorerHarness();
  const onClose = jest.fn();
  const onFolderSelection = jest.fn();
  const onFileSelection = jest.fn();

  const element = (props: Record<string, unknown> = {}) => (
    <ServerFileExplorer
      open
      onClose={onClose}
      onFolderSelection={onFolderSelection}
      onFileSelection={onFileSelection}
      reactory={harness.reactory as any}
      serverPath="/abs/one"
      readonly
      {...initialProps}
      {...props}
    />
  );

  const utils = render(element());

  /** Re-renders with a different root, as a consumer would on reopening. */
  const setPath = (serverPath: string) => utils.rerender(element({ serverPath }));

  return { ...harness, ...utils, onClose, onFolderSelection, onFileSelection, setPath };
};

/**
 * Text of the listing rows only. Labels also appear in the breadcrumb, so
 * `queryByText` alone would report a navigated-away folder as still listed.
 */
const rowText = () =>
  screen
    .queryAllByRole('row')
    .map((row) => row.textContent || '')
    .join(' | ');

describe('ServerFileExplorer — folder selection', () => {
  it('reports the browsed path from the footer action and closes', async () => {
    const { settle, onFolderSelection, onClose } = setup();

    await act(async () => {
      settle('/abs/one', [folder('one-child', '/abs/one/one-child')]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select this folder' }));

    expect(onFolderSelection).toHaveBeenCalledTimes(1);
    expect(onFolderSelection.mock.calls[0][0]).toHaveLength(1);
    // The footer reports the path the component requested, verbatim.
    expect(onFolderSelection.mock.calls[0][0][0].fullPath).toBe('/abs/one');
    expect(onFolderSelection.mock.calls[0][0][0].type).toBe('folder');
    // closeOnFolderSelection defaults to true.
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open when closeOnFolderSelection is false', () => {
    const { onFolderSelection, onClose } = setup({ closeOnFolderSelection: false });

    fireEvent.click(screen.getByRole('button', { name: 'Select this folder' }));

    expect(onFolderSelection).toHaveBeenCalledTimes(1);
    expect(onFolderSelection.mock.calls[0][0][0].fullPath).toBe('/abs/one');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports a folder row from its context menu', async () => {
    const { settle, onFolderSelection, onClose } = setup();

    await act(async () => {
      settle('/abs/one', [folder('one-child', '/abs/one/one-child')]);
    });

    fireEvent.contextMenu(screen.getByText('one-child').closest('[role="row"]') as HTMLElement);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Select this folder' }));

    expect(onFolderSelection).toHaveBeenCalledTimes(1);
    // The menu reports the row's resolver fullPath, not the browsed path.
    expect(onFolderSelection.mock.calls[0][0][0].fullPath).toBe('/abs/one/one-child');
    expect(onFolderSelection.mock.calls[0][0][0].name).toBe('one-child');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not offer a folder action when no onFolderSelection handler is supplied', async () => {
    const harness = createExplorerHarness();

    render(
      <ServerFileExplorer
        open
        onClose={jest.fn()}
        reactory={harness.reactory as any}
        serverPath="/abs/one"
        readonly
      />
    );

    await act(async () => {
      harness.settle('/abs/one', [folder('one-child', '/abs/one/one-child')]);
    });

    expect(screen.queryByRole('button', { name: 'Select this folder' })).not.toBeInTheDocument();
  });
});

describe('ServerFileExplorer — serverPath changes', () => {
  it('browses the new root when serverPath changes', async () => {
    const { settle, requestedPaths, setPath } = setup();

    await act(async () => {
      settle('/abs/one', [folder('one-child', '/abs/one/one-child')]);
    });
    expect(screen.getByText('one-child')).toBeInTheDocument();

    setPath('/abs/two');
    await waitFor(() => expect(requestedPaths()).toContain('/abs/two'));

    await act(async () => {
      settle('/abs/two', [folder('two-child', '/abs/two/two-child')]);
    });

    expect(screen.getByText('two-child')).toBeInTheDocument();
    expect(screen.queryByText('one-child')).not.toBeInTheDocument();
  });

  it('discards a stale listing for the previous root that resolves after the new root', async () => {
    const { settle, requestedPaths, setPath, onFolderSelection } = setup();

    // Both roots are in flight; the previous root's read is the slower one.
    setPath('/abs/two');
    await waitFor(() => expect(requestedPaths()).toEqual(['/abs/one', '/abs/two']));

    await act(async () => {
      settle('/abs/two', [folder('two-child', '/abs/two/two-child')]);
    });
    expect(screen.getByText('two-child')).toBeInTheDocument();

    // The stale response resolves last. Before the request guard this replaced
    // the listing while the reported path stayed on the new root.
    await act(async () => {
      settle('/abs/one', [folder('one-child', '/abs/one/one-child')]);
    });

    expect(screen.queryByText('one-child')).not.toBeInTheDocument();
    expect(screen.getByText('two-child')).toBeInTheDocument();

    // ...and the payload agrees with the listing.
    fireEvent.click(screen.getByRole('button', { name: 'Select this folder' }));
    expect(onFolderSelection.mock.calls[0][0][0].fullPath).toBe('/abs/two');
  });

  it('does not surface a stale failure from the previous root', async () => {
    const { settle, settleError, requestedPaths, setPath } = setup();

    setPath('/abs/two');
    await waitFor(() => expect(requestedPaths()).toEqual(['/abs/one', '/abs/two']));

    await act(async () => {
      settle('/abs/two', [folder('two-child', '/abs/two/two-child')]);
    });

    await act(async () => {
      settleError('/abs/one', 'stale-root-failure');
    });

    expect(screen.getByText('two-child')).toBeInTheDocument();
    expect(screen.queryByText('stale-root-failure')).not.toBeInTheDocument();
  });

  it('still surfaces a failure for the current root', async () => {
    const { settleError } = setup();

    await act(async () => {
      settleError('/abs/one', 'current-root-failure');
    });

    expect(screen.getByText('current-root-failure')).toBeInTheDocument();
  });
});

describe('ServerFileExplorer — existing browsing behaviour', () => {
  it('navigates into a folder row and loads that path', async () => {
    const { settle, requestedPaths } = setup();

    await act(async () => {
      settle('/abs/one', [folder('one-child', '/abs/one/one-child')]);
    });

    fireEvent.click(screen.getByText('one-child'));
    await waitFor(() => expect(requestedPaths()).toContain('/abs/one/one-child'));

    await act(async () => {
      settle('/abs/one/one-child', [folder('grandchild', '/abs/one/one-child/grandchild')]);
    });

    expect(screen.getByText('grandchild')).toBeInTheDocument();
    expect(rowText()).toContain('grandchild');
    // 'one-child' is now a breadcrumb, not a listing row.
    expect(rowText()).not.toContain('one-child');
  });

  it('reports a clicked file through onFileSelection', async () => {
    const { settle, onFileSelection } = setup();

    await act(async () => {
      settle('/abs/one', [], [file('notes.json', '/abs/one/notes.json')]);
    });

    fireEvent.click(screen.getByText('notes.json'));

    expect(onFileSelection).toHaveBeenCalledTimes(1);
    expect(onFileSelection.mock.calls[0][0][0].fullPath).toBe('/abs/one/notes.json');
  });

  it('closes when Cancel is pressed', () => {
    const { onClose } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ServerFileExplorer — listing content', () => {
  it('renders both folders and files from the resolver response', async () => {
    const { settle } = setup();

    await act(async () => {
      settle('/abs/one', [folder('one-child', '/abs/one/one-child')], [file('notes.json', '/abs/one/notes.json')]);
    });

    expect(screen.getByText('one-child')).toBeInTheDocument();
    expect(screen.getByText('notes.json')).toBeInTheDocument();
  });
});

import React from 'react';

/**
 * Rendering harness for `ServerFileExplorer`.
 *
 * The component never imports MUI directly - it destructures `Material` from
 * `reactory.getComponents(['material-ui.Material'])`. That is what makes it
 * consumable by server-module components, and it is also what lets these tests
 * render it with lightweight DOM stubs instead of the real MUI bundle. Same
 * proxy-getComponents pattern as
 * `src/components/reactory/ReactoryForm/hooks/__tests__/useReports.test.tsx`.
 *
 * The stubs keep only the semantics the component actually relies on:
 *  - `Paper` renders `role="row"`, so a folder/file row can be addressed from
 *    its label and clicked or right-clicked.
 *  - `Button` / `IconButton` / `MenuItem` render real `<button>` elements, so
 *    clicks and accessible names behave like they do in the browser.
 *  - `Menu` renders its children, so a context-menu item appears as soon as the
 *    component decides it applies (the stub ignores `anchorEl`).
 *  - `Dialog` renders its children only when `open`, so the rename / create-folder
 *    / delete-confirm dialogs (always mounted with `open={false}`) cannot
 *    contribute buttons to the queries.
 */

const DOM_PROPS = [
  'id',
  'className',
  'role',
  'onClick',
  'onDoubleClick',
  'onContextMenu',
  'onChange',
  'onKeyPress',
  'onKeyDown',
  'href',
  'type',
  'disabled',
  'value',
  'placeholder',
  'name',
  'tabIndex',
];

type StubProps = { children?: React.ReactNode; [key: string]: any };

const domProps = (props: StubProps) => {
  const picked: StubProps = {};
  DOM_PROPS.forEach((key) => {
    if (props[key] !== undefined) picked[key] = props[key];
  });
  return picked;
};

const passthrough = (tag: 'div' | 'span') => {
  const Stub = ({ children, ...rest }: StubProps) => React.createElement(tag, domProps(rest), children);
  return Stub;
};

const ButtonStub = ({ children, onClick, disabled }: StubProps) => (
  <button type="button" onClick={onClick} disabled={Boolean(disabled)}>
    {children}
  </button>
);

const TextFieldStub = ({ placeholder, value, onChange }: StubProps) => (
  <input
    placeholder={placeholder}
    value={value ?? ''}
    onChange={onChange ?? (() => undefined)}
  />
);

const iconStub = (name: string) => {
  const Icon = () => <span data-icon={name} />;
  Icon.displayName = `MaterialIcon(${name})`;
  return Icon;
};

const iconCache = new Map<string, ReturnType<typeof iconStub>>();

/**
 * Any icon name resolves to a stub, so the component can destructure the whole
 * `MaterialIcons` namespace without the harness listing it.
 */
const MaterialIcons = new Proxy(
  {},
  {
    get: (_target, prop: string | symbol) => {
      if (typeof prop !== 'string') return undefined;
      if (!iconCache.has(prop)) iconCache.set(prop, iconStub(prop));
      return iconCache.get(prop);
    },
  }
);

const MaterialCore = {
  Dialog: ({ children, open }: StubProps) => (open ? <div role="dialog">{children}</div> : null),
  DialogTitle: passthrough('div'),
  DialogContent: passthrough('div'),
  DialogActions: passthrough('div'),
  Paper: ({ children, onClick, onDoubleClick, onContextMenu }: StubProps) => (
    <div role="row" onClick={onClick} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu}>
      {children}
    </div>
  ),
  Box: passthrough('div'),
  Typography: passthrough('div'),
  IconButton: ButtonStub,
  Button: ButtonStub,
  TextField: TextFieldStub,
  Toolbar: passthrough('div'),
  Divider: passthrough('div'),
  CircularProgress: passthrough('div'),
  Alert: passthrough('div'),
  Breadcrumbs: passthrough('div'),
  Link: ButtonStub,
  Tooltip: passthrough('div'),
  Chip: ({ label }: StubProps) => <span>{label}</span>,
  Menu: ({ children }: StubProps) => <div role="menu">{children}</div>,
  MenuItem: ({ children, onClick }: StubProps) => (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
  ListItemIcon: passthrough('div'),
  ListItemText: passthrough('span'),
};

export interface PendingListing {
  path: string;
  settled: boolean;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export interface ExplorerFolderSeed {
  name: string;
  path?: string;
  fullPath: string;
  fileCount?: number;
}

/** Builds a folder entry shaped like the `ReactoryServerFiles` resolver output. */
export const folder = (name: string, fullPath: string, fileCount = 0) => ({
  name,
  path: name,
  fullPath,
  created: '2026-01-01T00:00:00.000Z',
  modified: '2026-01-01T00:00:00.000Z',
  size: 0,
  fileCount,
  permissions: { read: true, write: false, delete: true },
});

/** Builds a file entry shaped like the `ReactoryServerFiles` resolver output. */
export const file = (name: string, fullPath: string) => ({
  id: `id-${name}`,
  name,
  mimetype: 'application/json',
  extension: 'json',
  size: 12,
  path: name,
  fullPath,
  created: '2026-01-01T00:00:00.000Z',
  modified: '2026-01-01T00:00:00.000Z',
  isSystemFile: false,
  isHidden: false,
  permissions: { read: true, write: true, delete: true, execute: false },
});

export const createExplorerHarness = () => {
  const pending: PendingListing[] = [];

  const graphqlQuery = jest.fn(
    (_query: string, variables: any) =>
      new Promise((resolve, reject) => {
        pending.push({
          path: variables?.serverPath,
          settled: false,
          resolve,
          reject,
        });
      })
  );

  const reactory = {
    getComponents: jest.fn(() => ({ Material: { MaterialCore, MaterialIcons } })),
    graphqlQuery,
    graphqlMutation: jest.fn(() => Promise.resolve({ data: {} })),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  };

  const firstPendingIndex = (path: string) =>
    pending.findIndex((entry) => entry.path === path && entry.settled === false);

  /** Ordered list of requested paths, including already-settled ones. */
  const requestedPaths = () => pending.map((entry) => entry.path);

  /** Resolves the oldest unresolved listing for `path`. */
  const settle = (path: string, folders: any[] = [], files: any[] = []) => {
    const index = firstPendingIndex(path);
    if (index === -1) throw new Error(`No pending listing for "${path}" (have: ${requestedPaths().join(', ')})`);

    const entry = pending[index];
    entry.settled = true;
    entry.resolve({
      data: {
        ReactoryServerFiles: {
          __typename: 'ReactoryServerFiles',
          serverPath: path,
          totalCount: folders.length + files.length,
          hasMore: false,
          folders,
          files,
        },
      },
    });
  };

  /** Resolves the oldest unresolved listing for `path` as a resolver error. */
  const settleError = (path: string, message: string) => {
    const index = firstPendingIndex(path);
    if (index === -1) throw new Error(`No pending listing for "${path}" (have: ${requestedPaths().join(', ')})`);

    const entry = pending[index];
    entry.settled = true;
    entry.resolve({
      data: {
        ReactoryServerFiles: {
          __typename: 'ReactoryServerFilesErrorResponse',
          error: 'Server Error',
          message,
          serverPath: path,
        },
      },
    });
  };

  return { reactory, pending, requestedPaths, settle, settleError, graphqlQuery };
};

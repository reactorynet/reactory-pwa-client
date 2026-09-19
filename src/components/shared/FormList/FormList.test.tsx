/**
 * Tests for FormList's selection / navigation contract and for the form
 * presentation rules (icon badge + form image).
 *
 * A selection must produce exactly ONE navigation. The list previously both
 * navigated itself and called onFormSelect (whose consumer navigated again),
 * which pushed two history entries per click - "back" needed two presses, and
 * an "Edit" click landed on the view route.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useReactory } from '@reactory/client-core/api';
import FormList from './FormList';
import { resolveFormIcon, toMaterialIconName, getFormImageSrc } from './resolveFormIcon';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/forms', search: '', hash: '' }),
}));

jest.mock('@reactory/client-core/api', () => ({
  useReactory: jest.fn(),
}));

/**
 * Stubs a MUI component as a plain div. `open === false` renders nothing so the
 * closed context menu / dialog do not duplicate the visible action labels.
 * `component` is a MUI polymorphic prop (Box `component="img"`); the stub always
 * renders a div, so it is dropped - every other prop (src, alt, data-testid) is
 * forwarded so tests can assert on it.
 */
/** Props worth forwarding onto the stub element so tests can assert on them. */
const isForwardedProp = (key: string): boolean =>
  key === 'src' || key === 'alt' || key === 'loading' || key.startsWith('data-');

const stub = (name: string) => {
  const Stub = ({ children, onClick, open, ...rest }: any) => {
    if (open === false) return null;
    const forwarded = Object.fromEntries(
      Object.entries(rest).filter(([key]) => isForwardedProp(key))
    );
    return <div data-component={name} onClick={onClick} {...forwarded}>{children}</div>;
  };
  Stub.displayName = name;
  return Stub;
};

const stubRegistry = () => new Proxy({} as Record<string, any>, {
  get: (target, prop: string) => {
    if (!target[prop]) target[prop] = stub(prop);
    return target[prop];
  },
});

/**
 * An icon registry that resolves every icon the component asks for *except* the
 * given identifier, so the "icon defined but unknown to the icon package"
 * fallback can be exercised.
 */
const stubRegistryWithout = (missing: string) => new Proxy({} as Record<string, any>, {
  get: (target, prop: string) => {
    if (prop === missing) return undefined;
    if (!target[prop]) target[prop] = stub(prop);
    return target[prop];
  },
});

const FORMS = [
  { id: 'core.Widget@1.0.0', name: 'Widget', nameSpace: 'core', version: '1.0.0' },
];

const FORMS_WITH_ICON = [
  {
    id: 'core.ApplicationUsers@1.0.0',
    name: 'ApplicationUsers',
    nameSpace: 'core',
    version: '1.0.0',
    title: 'Application Users',
    icon: 'SupervisedUserCircle',
  },
];

const FORMS_WITH_IMAGE = [
  {
    ...FORMS[0],
    avatar: 'http://localhost:4000/cdn/forms/images/reactory-logo.png',
  },
];

const renderList = (
  props: any = {},
  forms = FORMS,
  materialIcons: Record<string, any> = stubRegistry()
) => {
  (useReactory as jest.Mock).mockReturnValue({
    formSchemas: forms,
    forms: jest.fn().mockResolvedValue(forms),
    log: jest.fn(),
    createNotification: jest.fn(),
    getComponents: () => ({
      React,
      Material: { MaterialCore: stubRegistry(), MaterialIcons: materialIcons },
      UserHomeFolder: stub('UserHomeFolder'),
    }),
  });

  return render(<FormList routePrefix="forms" {...props} />);
};

const getBadge = (): HTMLElement | null =>
  document.querySelector('[data-component="Avatar"]');

describe('FormList selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates once to the requested action when no consumer handler is given', async () => {
    renderList();

    fireEvent.click(await screen.findByText('Edit'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/forms/core.Widget@1.0.0/edit');
  });

  it('navigates to the view route when the card body is clicked', async () => {
    renderList();

    await screen.findByText('Widget');
    fireEvent.click(screen.getByText('Widget'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/forms/core.Widget@1.0.0/view');
  });

  it('delegates to onFormSelect with the action and does not navigate itself', async () => {
    const onFormSelect = jest.fn();
    renderList({ onFormSelect });

    fireEvent.click(await screen.findByText('Edit'));

    expect(onFormSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'core.Widget@1.0.0' }),
      'edit'
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // The empty state is the only place a create button is reachable without the
  // SpeedDial tooltips, so the create path is exercised with no forms loaded.
  it('delegates creation to onCreateNew and does not navigate itself', async () => {
    const onCreateNew = jest.fn();
    renderList({ onCreateNew }, []);

    fireEvent.click(await screen.findByText('Create New Form'));

    expect(onCreateNew).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the develop route for a new form when no consumer handler is given', async () => {
    renderList({}, []);

    fireEvent.click(await screen.findByText('Create New Form'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/forms/new/develop');
  });
});

describe('FormList form presentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the form icon instead of the first letter of the form name', async () => {
    renderList({}, FORMS_WITH_ICON);

    await screen.findByText('Application Users');

    const badge = getBadge();
    expect(badge?.querySelector('[data-component="SupervisedUserCircle"]')).not.toBeNull();
    // The initial letter is gone - the icon replaced it.
    expect(badge?.textContent).toBe('');
  });

  it('falls back to the first letter when the form declares no icon', async () => {
    renderList();

    await screen.findByText('Widget');

    const badge = getBadge();
    expect(badge?.textContent).toBe('W');
    expect(badge?.querySelector('[data-component="Description"]')).toBeNull();
  });

  it('falls back to the first letter when the declared icon is unknown', async () => {
    renderList({}, FORMS_WITH_ICON, stubRegistryWithout('SupervisedUserCircle'));

    await screen.findByText('Application Users');

    const badge = getBadge();
    expect(badge?.textContent).toBe('A');
    expect(badge?.querySelector('[data-component="SupervisedUserCircle"]')).toBeNull();
  });

  it('renders the form image below the content', async () => {
    renderList({}, FORMS_WITH_IMAGE);

    const title = await screen.findByText('Widget');
    const image = screen.getByTestId('form-image');

    expect(image.getAttribute('src')).toBe(
      'http://localhost:4000/cdn/forms/images/reactory-logo.png'
    );
    // "below the content" means the image follows the title in document order.
    expect(
      title.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    // The image lives below the content, not inside the avatar badge.
    expect(getBadge()?.getAttribute('src')).toBeNull();
  });

  it('renders no image when the form declares none', async () => {
    renderList();

    await screen.findByText('Widget');

    expect(screen.queryByTestId('form-image')).toBeNull();
  });
});

describe('FormList view modes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // "table"/columns was offered in the toggle but had no render branch, so
  // selecting it showed an empty list. Only views that actually render remain.
  it('offers only the grid and list view options', async () => {
    renderList();

    await screen.findByText('Widget');

    const toggleButtons = document.querySelectorAll('[data-component="ToggleButton"]');
    expect(toggleButtons).toHaveLength(2);
    expect(document.querySelector('[data-component="ViewModule"]')).not.toBeNull();
    expect(document.querySelector('[data-component="ViewList"]')).not.toBeNull();
    expect(document.querySelector('[data-component="TableChart"]')).toBeNull();
  });

  it('renders the grid view by default', async () => {
    renderList();

    // The card body (title) is only rendered by the grid view.
    expect(await screen.findByText('Widget')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
  });
});

describe('resolveFormIcon', () => {
  const TableView = stub('TableView');
  const registry: Record<string, any> = {
    TableView,
    SupervisedUserCircle: stub('SupervisedUserCircle'),
  };

  it('normalises snake / kebab / spaced identifiers to the exported name', () => {
    expect(toMaterialIconName('table_view')).toBe('TableView');
    expect(toMaterialIconName('supervised-user-circle')).toBe('SupervisedUserCircle');
    expect(toMaterialIconName('SupervisedUserCircle')).toBe('SupervisedUserCircle');
    expect(toMaterialIconName('  alternate email ')).toBe('AlternateEmail');
  });

  it('resolves exact, normalised and case-insensitive identifiers', () => {
    expect(resolveFormIcon(registry, 'TableView')).toBe(TableView);
    expect(resolveFormIcon(registry, 'table_view')).toBe(TableView);
    expect(resolveFormIcon(registry, 'tableview')).toBe(TableView);
  });

  it('returns null when there is nothing usable to resolve', () => {
    expect(resolveFormIcon(registry, '')).toBeNull();
    expect(resolveFormIcon(registry, '   ')).toBeNull();
    expect(resolveFormIcon(registry, undefined)).toBeNull();
    expect(resolveFormIcon(registry, null)).toBeNull();
    expect(resolveFormIcon(registry, 'NoSuchIcon')).toBeNull();
    expect(resolveFormIcon(undefined, 'TableView')).toBeNull();
  });
});

describe('getFormImageSrc', () => {
  it('returns the trimmed image url, and undefined for blanks', () => {
    expect(getFormImageSrc({ avatar: ' https://cdn.example/forms/a.png ' })).toBe(
      'https://cdn.example/forms/a.png'
    );
    expect(getFormImageSrc({ avatar: '   ' })).toBeUndefined();
    expect(getFormImageSrc({ avatar: null })).toBeUndefined();
    expect(getFormImageSrc({})).toBeUndefined();
    expect(getFormImageSrc(null)).toBeUndefined();
  });
});

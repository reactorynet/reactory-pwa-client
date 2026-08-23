/**
 * Tests for FormList's selection / navigation contract.
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
 */
const stub = (name: string) => {
  const Stub = ({ children, onClick, open }: any) => {
    if (open === false) return null;
    return <div data-component={name} onClick={onClick}>{children}</div>;
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

const FORMS = [
  { id: 'core.Widget@1.0.0', name: 'Widget', nameSpace: 'core', version: '1.0.0' },
];

const renderList = (props: any = {}, forms = FORMS) => {
  (useReactory as jest.Mock).mockReturnValue({
    formSchemas: forms,
    forms: jest.fn().mockResolvedValue(forms),
    log: jest.fn(),
    createNotification: jest.fn(),
    getComponents: () => ({
      React,
      Material: { MaterialCore: stubRegistry(), MaterialIcons: stubRegistry() },
      UserHomeFolder: stub('UserHomeFolder'),
    }),
  });

  return render(<FormList routePrefix="forms" {...props} />);
};

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

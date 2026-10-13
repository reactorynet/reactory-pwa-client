import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReactoryProvider } from '@reactory/client-core/api/ApiProvider';
import { ReactoryApiEventNames } from '@reactory/client-core/api/ApiEventNames';
import DefaultHeader from '../DefaultHeader';

// The header pulls in several heavy children that are irrelevant here. Stubbing
// them keeps the test focused on the menu-title wiring, which is the path the
// language fix has to reach.
jest.mock('../../WorkflowDesigner/WorkflowCommander', () => ({ WorkflowCommander: () => null }));
jest.mock('../../../../app/router/widgets/RouteInspectorPreferenceButton', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../LanguageSelector', () => ({ LanguageSelector: () => null }));
jest.mock('../AvatarComponent', () => ({ ReactoryAvatar: () => null }));

/**
 * Stub with an emitter, so `emit` drives `onLanguageChanged` exactly as
 * `ReactoryApi` does.
 */
const createReactory = (initialLanguage = 'en') => {
  const listeners: { [event: string]: Array<(...args: any[]) => void> } = {};
  let language = initialLanguage;

  const bundles: { [language: string]: { [key: string]: string } } = {
    en: {
      'reactory.menu.myapplications': 'My Applications',
      'reactory.menu.about-reactory': 'About Reactory',
    },
    af: {
      'reactory.menu.myapplications': 'My Toepe',
      'reactory.menu.about-reactory': 'Oor Reactory',
    },
  };

  const translate = (key: string) => {
    const bundle = bundles[language] || {};
    return bundle[key] !== undefined ? bundle[key] : key;
  };

  const reactory: any = {
    setLanguage: (next: string) => {
      language = next;
    },
    emit: (event: string, ...args: any[]) => {
      (listeners[event] || []).forEach((listener) => listener(...args));
    },
    $user: {
      applicationName: 'Test App',
      server: { id: 'test', version: '1.0.0' },
      when: new Date(),
      loggedIn: { roles: ['USER'], firstName: 'Test', lastName: 'User' },
      menus: [
        {
          id: 'left-nav',
          target: 'left-nav',
          enabled: true,
          entries: [
            // Namespaced key — the shape stored in the database.
            { id: 'e1', title: 'reactory:reactory.menu.myapplications', icon: 'apps', link: '/' },
            { id: 'e2', title: 'reactory:reactory.menu.about-reactory', icon: 'info', link: '/about/' },
            // Literal title — must pass through untouched.
            { id: 'e3', title: 'Chat', icon: 'chat', link: '/chat' },
          ],
        },
      ],
    },
    props: { $version: '1.0.0' },
    muiTheme: { palette: { success: { main: '#0f0' } } },
    hasRole: jest.fn().mockReturnValue(true),
    on: jest.fn((event: string, listener: (...args: any[]) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(listener);
      return reactory;
    }),
    removeListener: jest.fn((event: string, listener: (...args: any[]) => void) => {
      listeners[event] = (listeners[event] || []).filter((registered) => registered !== listener);
      return reactory;
    }),
    i18n: { language: initialLanguage, t: translate },
    getComponents: jest.fn().mockReturnValue({
      SystemStatus: () => null,
      FullScreenModal: ({ children }: any) => <>{children}</>,
      Loading: () => null,
      HelpListForm: () => null,
    }),
    getUser: jest.fn().mockReturnValue({ when: new Date() }),
    log: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
    // The drawer renders the development-mode and route-inspector toggles.
    isDevelopmentMode: jest.fn().mockReturnValue(false),
    setDevelopmentMode: jest.fn(),
    utils: { humanNumber: (value: any) => String(value) },
  };

  return reactory;
};

const renderHeader = (reactory: any) =>
  render(
    // @ts-ignore test stub
    <ReactoryProvider reactory={reactory}>
      <MemoryRouter>
        <DefaultHeader />
      </MemoryRouter>
    </ReactoryProvider>
  );

/** The left-nav lives inside the drawer, so it has to be opened first. */
const openDrawer = () => {
  const menuButtons = screen.getAllByLabelText('Menu');
  fireEvent.click(menuButtons[0]);
};

/**
 * The reported symptom was the left-nav keeping its original language. This
 * asserts the wiring end to end: a stored key reaches the label, and the label
 * follows a language change without a reload.
 */
describe('DefaultHeader left-nav menu titles', () => {
  it('resolves stored keys to the active language and leaves literals untouched', () => {
    renderHeader(createReactory('en'));
    openDrawer();

    expect(screen.getByText('My Applications')).toBeInTheDocument();
    expect(screen.getByText('About Reactory')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('re-renders the left-nav labels when the language changes', () => {
    const reactory = createReactory('en');
    renderHeader(reactory);
    openDrawer();

    expect(screen.getByText('My Applications')).toBeInTheDocument();

    act(() => {
      reactory.setLanguage('af');
      reactory.emit(ReactoryApiEventNames.onLanguageChanged, 'af');
    });

    expect(screen.getByText('My Toepe')).toBeInTheDocument();
    expect(screen.getByText('Oor Reactory')).toBeInTheDocument();
    expect(screen.queryByText('My Applications')).toBeNull();
    // A literal is language-independent.
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });
});

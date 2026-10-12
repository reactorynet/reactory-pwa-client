import React from 'react';
import { act, render, screen } from '@testing-library/react';
import MobileBottomHeader from '../MobileBottomHeader';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { ReactoryProvider } from '@reactory/client-core/api/ApiProvider';
import { ReactoryApiEventNames } from '@reactory/client-core/api/ApiEventNames';

const theme = createTheme();

/** Emitter-backed stub so `emit` can drive `onLanguageChanged`. */
const createReactory = (initialLanguage = 'en') => {
  const listeners: { [event: string]: Array<(...args: any[]) => void> } = {};
  let language = initialLanguage;

  const bundles: { [language: string]: { [ns: string]: { [key: string]: string } } } = {
    en: { reactory: { 'reactory.menu.myapplications': 'My Applications' } },
    af: { reactory: { 'reactory.menu.myapplications': 'My Toepe' } },
  };

  const reactory: any = {
    language: () => language,
    setLanguage: (next: string) => {
      language = next;
    },
    emit: (event: string, ...args: any[]) => {
      (listeners[event] || []).forEach((listener) => listener(...args));
    },
    $user: {
      applicationName: 'Test App',
      loggedIn: { roles: ['USER'], firstName: 'Test', lastName: 'User' },
      menus: [
        {
          target: 'bottom-nav',
          entries: [
            { id: '1', title: 'reactory:reactory.menu.myapplications', icon: 'apps', link: '/' },
            { id: '2', title: 'Chat', icon: 'chat', link: '/chat' },
          ],
        },
      ],
    },
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
    i18n: {
      t: (key: string, options?: { ns?: string }) => {
        const namespace = options?.ns || 'reactory';
        const bundle = (bundles[language] || {})[namespace] || {};
        return bundle[key] !== undefined ? bundle[key] : key;
      },
    },
    getComponents: jest.fn().mockReturnValue({}),
    getUser: jest.fn().mockReturnValue({ when: new Date() }),
  };

  return reactory;
};

const renderHeader = (reactory: any) =>
  render(
    // @ts-ignore test stub
    <ReactoryProvider reactory={reactory}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <MobileBottomHeader />
        </ThemeProvider>
      </MemoryRouter>
    </ReactoryProvider>
  );

describe('MobileBottomHeader menu titles', () => {
  it('resolves a namespaced key to the active language and leaves literals alone', () => {
    renderHeader(createReactory('en'));

    expect(screen.getByText('My Applications')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('re-renders the labels when the language changes', () => {
    const reactory = createReactory('en');
    renderHeader(reactory);

    expect(screen.getByText('My Applications')).toBeInTheDocument();

    act(() => {
      reactory.setLanguage('af');
      reactory.emit(ReactoryApiEventNames.onLanguageChanged, 'af');
    });

    expect(screen.getByText('My Toepe')).toBeInTheDocument();
    expect(screen.queryByText('My Applications')).toBeNull();
    // A literal title is language-independent and stays put.
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('subscribes to language changes and unsubscribes on unmount', () => {
    const reactory = createReactory('en');
    const { unmount } = renderHeader(reactory);

    expect(reactory.on).toHaveBeenCalledWith(ReactoryApiEventNames.onLanguageChanged, expect.any(Function));

    unmount();

    expect(reactory.removeListener).toHaveBeenCalledWith(
      ReactoryApiEventNames.onLanguageChanged,
      expect.any(Function)
    );
  });
});

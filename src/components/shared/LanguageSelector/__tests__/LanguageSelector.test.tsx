import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LanguageSelector } from '../LanguageSelector';
import { ReactoryApiEventNames } from '@reactory/client-core/api/ApiEventNames';

type Listener = (...args: any[]) => void;

/**
 * Minimal stand-in for the Reactory API surface the selector uses. The event
 * helpers are a tiny emitter so `emit` can drive `onLanguageChanged`.
 */
const createReactory = (overrides: any = {}) => {
  const listeners: { [event: string]: Listener[] } = {};

  const reactory: any = {
    getLanguage: jest.fn().mockReturnValue('en'),
    getSupportedLanguages: jest.fn().mockReturnValue([
      { code: 'en', label: 'English' },
      { code: 'af', label: 'Afrikaans' },
    ]),
    setLanguage: jest.fn().mockResolvedValue('af'),
    on: jest.fn((event: string, listener: Listener) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(listener);
      return reactory;
    }),
    removeListener: jest.fn((event: string, listener: Listener) => {
      listeners[event] = (listeners[event] || []).filter((registered) => registered !== listener);
      return reactory;
    }),
    emit: (event: string, ...args: any[]) => {
      (listeners[event] || []).forEach((listener) => listener(...args));
    },
    ...overrides,
  };

  return reactory;
};

describe('LanguageSelector', () => {
  it('renders nothing when fewer than two languages are available', () => {
    const reactory = createReactory({
      getSupportedLanguages: jest.fn().mockReturnValue([{ code: 'en', label: 'English' }]),
    });

    render(<LanguageSelector reactory={reactory} />);

    expect(screen.queryByTestId('language-selector-button')).toBeNull();
  });

  it('renders one icon button that opens a menu of the supported languages', () => {
    const reactory = createReactory();
    render(<LanguageSelector reactory={reactory} />);

    fireEvent.click(screen.getByTestId('language-selector-button'));

    expect(screen.getByTestId('language-option-en')).toBeInTheDocument();
    expect(screen.getByTestId('language-option-af')).toBeInTheDocument();
  });

  it('delegates the choice to reactory.setLanguage', () => {
    const reactory = createReactory();
    render(<LanguageSelector reactory={reactory} />);

    fireEvent.click(screen.getByTestId('language-selector-button'));
    fireEvent.click(screen.getByTestId('language-option-af'));

    expect(reactory.setLanguage).toHaveBeenCalledWith('af');
  });

  it('subscribes to onLanguageChanged and unsubscribes on unmount', () => {
    const reactory = createReactory();
    const { unmount } = render(<LanguageSelector reactory={reactory} />);

    expect(reactory.on).toHaveBeenCalledWith(ReactoryApiEventNames.onLanguageChanged, expect.any(Function));

    unmount();

    expect(reactory.removeListener).toHaveBeenCalledWith(ReactoryApiEventNames.onLanguageChanged, expect.any(Function));
  });

  it('moves the active tick when the language changes', () => {
    const reactory = createReactory();
    render(<LanguageSelector reactory={reactory} />);

    fireEvent.click(screen.getByTestId('language-selector-button'));
    expect(screen.getByTestId('language-option-en')).toHaveClass('Mui-selected');

    act(() => {
      reactory.emit(ReactoryApiEventNames.onLanguageChanged, 'af');
    });

    expect(screen.getByTestId('language-option-af')).toHaveClass('Mui-selected');
    expect(screen.getByTestId('language-option-en')).not.toHaveClass('Mui-selected');
  });
});

/**
 * @jest-environment jsdom
 */

// apollo-upload-client ships a .mjs entry that jest cannot parse without
// transformIgnorePatterns override. Mock it here so the widget chain loads.
jest.mock('apollo-upload-client/createUploadLink.mjs', () => jest.fn());
// mermaid is ESM-only ("type":"module"). Mock the whole package.
jest.mock('mermaid', () => ({ default: { initialize: jest.fn(), run: jest.fn() } }));
// ReactorChatButtonWidget exports a Reactory module descriptor (not a React component);
// its source uses JSX without importing React, which fails under ts-jest's jsx:'react' mode.
jest.mock(
  '../../../ux/mui/widgets/ReactorChatButtonWidget',
  () => ({ default: () => null }),
);
// Mock the Reactory API surfaces to prevent deep transitive deps from loading.
jest.mock('@reactory/client-core/api', () => ({
  useReactory: jest.fn(),
  withReactory: jest.fn((C: unknown) => C),
}));
jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: jest.fn(),
  withReactory: jest.fn((C: unknown) => C),
  default: jest.fn(),
}));
// localforage has no IndexedDB in jsdom; mock it so ReactoryApolloCache doesn't hang.
jest.mock('localforage', () => {
  const driver = jest.fn();
  return {
    config: jest.fn(),
    INDEXEDDB: 'asyncStorage',
    WEBSQL: 'webSQLStorage',
    LOCALSTORAGE: 'localStorageWrapper',
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    length: jest.fn().mockResolvedValue(0),
    key: jest.fn().mockResolvedValue(null),
    keys: jest.fn().mockResolvedValue([]),
    iterate: jest.fn().mockResolvedValue(undefined),
    setDriver: jest.fn().mockResolvedValue(undefined),
    createInstance: jest.fn().mockReturnValue({
      config: jest.fn(),
      setItem: jest.fn().mockResolvedValue(undefined),
      getItem: jest.fn().mockResolvedValue(null),
      removeItem: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      ready: jest.fn().mockResolvedValue(undefined),
    }),
    defineDriver: jest.fn().mockResolvedValue(undefined),
    driver,
    ready: jest.fn().mockResolvedValue(undefined),
    dropInstance: jest.fn().mockResolvedValue(undefined),
    default: undefined,
  };
});

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { WidgetProps } from '@rjsf/utils';
import { reactoryWidgets, HiddenWidget } from '../../widgets/index';

const CRITICAL_KEYS = [
  'HiddenWidget',
  'MaterialListWidget',
  'MaterialTableWidget',
  'RichEditorWidget',
  'SliderWidget',
  'SelectWidget',
  'DateWidget',
  'LabelWidget',
  'SearchWidget',
] as const;

describe('reactoryWidgets()', () => {
  it('returns a map containing all 9 critical-path widget keys', () => {
    const widgets = reactoryWidgets();
    for (const key of CRITICAL_KEYS) {
      expect(widgets).toHaveProperty(key);
      // adaptWidget wraps with React.memo, which returns an object, not a function
      expect(widgets[key]).toBeDefined();
    }
  });

  it('includes alias keys (AutoCompleteWidget, FroalaWidget, UserAvatarWidget, etc.)', () => {
    const widgets = reactoryWidgets();
    expect(widgets).toHaveProperty('AutoCompleteWidget');
    expect(widgets).toHaveProperty('AutoCompleteDropDown');
    expect(widgets.AutoCompleteWidget).toBe(widgets.AutoCompleteDropDown);

    expect(widgets).toHaveProperty('FroalaWidget');
    expect(widgets).toHaveProperty('RichEditorWidget');
    expect(widgets.FroalaWidget).toBe(widgets.RichEditorWidget);

    expect(widgets).toHaveProperty('UserAvatarWidget');
    expect(widgets).toHaveProperty('UserAvatar');
    expect(widgets.UserAvatarWidget).toBe(widgets.UserAvatar);

    expect(widgets).toHaveProperty('LinkField');
    expect(widgets).toHaveProperty('LinkFieldWidget');
    expect(widgets.LinkField).toBe(widgets.LinkFieldWidget);

    expect(widgets).toHaveProperty('ImageWidget');
    expect(widgets).toHaveProperty('ReactoryImageWidget');
    expect(widgets.ImageWidget).toBe(widgets.ReactoryImageWidget);
  });
});

describe('HiddenWidget', () => {
  const baseProps = (overrides: Partial<WidgetProps> = {}): WidgetProps =>
    ({
      id: 'root_token',
      name: 'token',
      value: 'abc123',
      schema: { type: 'string' },
      uiSchema: {},
      options: {},
      required: false,
      disabled: false,
      readonly: false,
      autofocus: false,
      rawErrors: [],
      hideError: false,
      formContext: {},
      registry: {} as WidgetProps['registry'],
      onChange: jest.fn(),
      onBlur: jest.fn(),
      onFocus: jest.fn(),
      label: '',
      hideLabel: false,
      multiple: false,
      ...overrides,
    } as unknown as WidgetProps);

  it('renders a hidden input with the correct id, name, and value', () => {
    render(<HiddenWidget {...baseProps()} />);
    const input = screen.getByDisplayValue('abc123') as HTMLInputElement;
    expect(input.type).toBe('hidden');
    expect(input.id).toBe('root_token');
    expect(input.name).toBe('token');
  });

  it('renders with an empty string when value is undefined', () => {
    const { container } = render(<HiddenWidget {...baseProps({ value: undefined })} />);
    const input = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(input.value).toBe('');
  });
});

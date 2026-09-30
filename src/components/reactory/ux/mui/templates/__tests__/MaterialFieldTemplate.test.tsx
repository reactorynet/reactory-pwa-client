import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import MaterialFieldTemplate from '../MaterialFieldTemplate';

jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: jest.fn(),
  withReactory: () => (Component: any) => Component,
}));

/**
 * Regression guard: the field template used to paint `palette.background.paper`
 * onto every outlined field label. In light mode every surface is white so it
 * was invisible; in dark mode a field sitting on a Card (which carries an
 * elevation overlay) or on `background.default` showed a contrasting patch
 * behind the label. The label must stay transparent so it inherits whatever
 * surface it is on.
 */
const darkPaper = '#121212';

/**
 * Stands in for a widget. The template clones its children and injects
 * `label` / `labelId` / `id`, which a real widget consumes; a raw <input>
 * would leak them onto the DOM.
 */
const StubWidget: React.FC<any> = () => <input id="root_email" />;

const renderTemplate = (props: any = {}) => {
  const theme = createTheme({ palette: { mode: 'dark', background: { paper: darkPaper } } });

  (useReactory as jest.Mock).mockReturnValue({
    muiTheme: theme,
    log: jest.fn(),
    getComponent: jest.fn(),
  });

  return render(
    <ThemeProvider theme={theme}>
      <MaterialFieldTemplate
        id="root_email"
        label="Email"
        schema={{ type: 'string', title: 'Email' }}
        uiSchema={{}}
        idSchema={{ $id: 'root_email' }}
        formData="w"
        required={false}
        {...props}
      >
        <StubWidget />
      </MaterialFieldTemplate>
    </ThemeProvider>
  );
};

const getLabel = (): HTMLElement => screen.getByText('Email');

describe('MaterialFieldTemplate label surface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not paint the theme paper colour behind an outlined label', () => {
    renderTemplate();

    const label = getLabel();

    expect(label.style.backgroundColor).not.toBe(darkPaper);
    // Not the rendered rgb() form of the paper colour either.
    expect(label.style.backgroundColor).not.toBe('rgb(18, 18, 18)');
  });

  it('leaves the label background transparent so it inherits the surface', () => {
    renderTemplate();

    // Transparent means nothing is painted, so the notch gap shows the
    // surrounding surface rather than a hard-coded colour.
    expect(getLabel().style.backgroundColor).toBe('transparent');
  });

  it('still lets a form override the label styling', () => {
    renderTemplate({
      uiSchema: {
        'ui:options': {
          labelProps: { style: { backgroundColor: 'rgb(1, 2, 3)' } },
        },
      },
    });

    expect(getLabel().style.backgroundColor).toBe('rgb(1, 2, 3)');
  });
});

/**
 * Regression guard for numeric field labels.
 *
 * `lodash.isEmpty` reports `true` for **every** primitive number
 * (`isEmpty(2000)` and `isEmpty(0)` are both `true`). The template used it to
 * decide whether a field was filled, so a numeric field holding a value was
 * treated as empty: the label stayed in its resting position (shrink=false)
 * while the number widget had already cut the notch, and the label rendered
 * straight over the value.
 */
describe('MaterialFieldTemplate label shrink for numeric fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderNumeric = (
    formData: unknown,
    type: string = 'integer',
    uiSchema: any = {}
  ) =>
    renderTemplate({
      id: 'root_maxOutputTokens',
      label: 'Max Output Tokens',
      schema: { type, title: 'Max Output Tokens' },
      idSchema: { $id: 'root_maxOutputTokens' },
      formData,
      uiSchema,
    });

  const shrinkState = (): string | null =>
    screen.getByText('Max Output Tokens').getAttribute('data-shrink');

  it('lifts the label for an integer field that holds a value', () => {
    renderNumeric(2000);

    expect(shrinkState()).toBe('true');
  });

  it('lifts the label for a number field that holds zero', () => {
    renderNumeric(0, 'number');

    expect(shrinkState()).toBe('true');
  });

  it('lifts the label for a number field that holds a fractional value', () => {
    renderNumeric(0.25, 'number');

    expect(shrinkState()).toBe('true');
  });

  it('leaves the label resting for an empty integer field', () => {
    renderNumeric(undefined);

    expect(shrinkState()).toBe('false');
  });

  it('honours labelProps.dontShrink even when a value is present', () => {
    renderNumeric(2000, 'integer', {
      'ui:options': { labelProps: { dontShrink: true } },
    });

    expect(shrinkState()).toBe('false');
  });
});
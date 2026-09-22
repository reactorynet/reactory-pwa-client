import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useReactory } from '@reactory/client-core/api';
import MaterialGridField, { resolveSectionGap } from '../MaterialGridField';

jest.mock('@reactory/client-core/api', () => ({
  useReactory: jest.fn(),
}));

/**
 * Regression guard: MUI's Grid spaces items only *within* a container, so the
 * pieces a grid field stacks vertically - the title, the description and each
 * `ui:grid-layout` row (its own Grid container) - had no vertical gap between
 * them. Sections read as one compressed block, and because a shrunk outlined
 * label is absolutely positioned it overhangs its field by ~9px, the next row's
 * label landed on the previous row's helper text.
 */

const theme = createTheme();

const StubSchemaField = ({ name }: any) => <div data-testid={`field-${name}`} />;
const StubTitleField = ({ title }: any) => <div data-testid="grid-title">{title}</div>;
const StubDescriptionField = ({ description }: any) => (
  <div data-testid="grid-description">{description}</div>
);

const registry = {
  definitions: {},
  formContext: {},
  fields: {
    SchemaField: StubSchemaField,
    TitleField: StubTitleField,
    DescriptionField: StubDescriptionField,
  },
};

const SCHEMA = {
  type: 'object',
  title: 'Identity',
  description: 'Namespace, name and version address the form.',
  properties: {
    nameSpace: { type: 'string', title: 'Namespace' },
    name: { type: 'string', title: 'Name' },
    id: { type: 'string', title: 'Form ID' },
  },
};

const LAYOUT = [
  { nameSpace: { size: { md: 4 } }, name: { size: { md: 4 } } },
  { id: {} },
];

/** Per-property id/error schemas, as RJSF would hand them to a nested field. */
const ID_SCHEMA = {
  $id: 'root',
  nameSpace: { $id: 'root_nameSpace' },
  name: { $id: 'root_name' },
  id: { $id: 'root_id' },
};

const renderGrid = (uiSchema: any = {}) => {
  (useReactory as jest.Mock).mockReturnValue({
    muiTheme: theme,
    debug: jest.fn(),
    log: jest.fn(),
    getComponent: () => ({
      retrieveSchema: (schema: any) => schema,
      getDefaultRegistry: () => registry,
    }),
  });

  return render(
    <ThemeProvider theme={theme}>
      <MaterialGridField
        name="base"
        schema={SCHEMA}
        uiSchema={{ 'ui:grid-layout': LAYOUT, ...uiSchema }}
        idSchema={ID_SCHEMA}
        errorSchema={{}}
        formData={{}}
        registry={registry}
        onChange={jest.fn()}
      />
    </ThemeProvider>
  );
};

/** With `container: 'div'` the section container is the title's direct parent. */
const getSectionContainer = (): HTMLElement =>
  screen.getByTestId('grid-title').parentElement as HTMLElement;

describe('resolveSectionGap', () => {
  it('maps theme spacing units to a CSS length', () => {
    expect(resolveSectionGap(2, theme)).toBe('16px');
    expect(resolveSectionGap(3, theme)).toBe('24px');
  });

  it('passes explicit CSS lengths through', () => {
    expect(resolveSectionGap('1.5rem', theme)).toBe('1.5rem');
  });

  it('falls back sensibly when the theme has no spacing helper', () => {
    expect(resolveSectionGap(2, undefined)).toBe('16px');
    expect(resolveSectionGap(undefined, theme)).toBe('16px');
  });
});

describe('MaterialGridField vertical rhythm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stacks the title, description and rows in a spaced column', () => {
    renderGrid({
      'ui:grid-options': { container: 'div', spacing: 2, containerStyles: {} },
    });

    const section = getSectionContainer();

    expect(section).toHaveStyle({ display: 'flex', flexDirection: 'column', gap: '16px' });
  });

  it('uses the grid spacing for the gap', () => {
    renderGrid({
      'ui:grid-options': { container: 'div', spacing: 3, containerStyles: {} },
    });

    expect(getSectionContainer()).toHaveStyle({ gap: '24px' });
  });

  it('renders the title, description and each layout row inside that container', () => {
    renderGrid({
      'ui:grid-options': { container: 'div', spacing: 2, containerStyles: {} },
    });

    const section = getSectionContainer();

    // The header block and every row container are direct children, which is
    // what makes the column gap apply between them.
    expect(screen.getByTestId('grid-description')).toBeInTheDocument();
    expect(screen.getByTestId('field-nameSpace')).toBeInTheDocument();
    expect(screen.getByTestId('field-id')).toBeInTheDocument();
    expect(section.children.length).toBe(4); // title + description + 2 rows
  });

  it('still lets a form override the container styles', () => {
    renderGrid({
      'ui:grid-options': {
        container: 'div',
        spacing: 2,
        containerStyles: { padding: '4px', display: 'block' },
      },
    });

    expect(getSectionContainer()).toHaveStyle({ padding: '4px', display: 'block' });
  });

  it('applies the same rhythm to the default Paper container', () => {
    const { container } = renderGrid({
      'ui:grid-options': { container: 'Paper', spacing: 2, containerStyles: {} },
    });

    const paper = container.querySelector('.MuiPaper-root') as HTMLElement;

    expect(paper).toBeInTheDocument();
    expect(paper).toHaveStyle({ display: 'flex', flexDirection: 'column', gap: '16px' });
  });
});

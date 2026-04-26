/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TitleFieldProps } from '@rjsf/utils';
import { ReactoryTitleFieldTemplate, TitleDepthContext } from '../../templates/TitleFieldTemplate';

const baseRegistry = (overrides: Record<string, unknown> = {}): TitleFieldProps['registry'] =>
  ({ formContext: {}, ...overrides } as unknown as TitleFieldProps['registry']);

const baseProps = (overrides: Partial<Omit<TitleFieldProps, 'uiSchema'> & { uiSchema?: Record<string, unknown> }> = {}): TitleFieldProps => ({
  id: 'root__title',
  title: 'My Title',
  required: false,
  schema: { type: 'string' },
  uiSchema: {},
  registry: baseRegistry(),
  ...overrides,
} as TitleFieldProps);

describe('ReactoryTitleFieldTemplate', () => {
  it('renders default h5 when ui:title is undefined', () => {
    render(<ReactoryTitleFieldTemplate {...baseProps()} />);
    const heading = screen.getByRole('heading');
    expect(heading.tagName.toLowerCase()).toBe('h5');
    expect(heading).toHaveTextContent('My Title');
    expect(heading).toHaveAttribute('id', 'root__title__title');
    expect(heading).toHaveClass('title-field');
  });

  it('renders the string override from ui:title', () => {
    render(<ReactoryTitleFieldTemplate {...baseProps({ uiSchema: { 'ui:title': 'Override Title' } })} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Override Title');
  });

  it('renders nothing when ui:title is false', () => {
    const { container } = render(
      <ReactoryTitleFieldTemplate {...baseProps({ uiSchema: { 'ui:title': false } })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('appends required indicator when required is true', () => {
    render(<ReactoryTitleFieldTemplate {...baseProps({ required: true })} />);
    expect(screen.getByRole('heading').textContent).toContain('*');
  });

  it('does not append required indicator when required is false', () => {
    render(<ReactoryTitleFieldTemplate {...baseProps({ required: false })} />);
    expect(screen.getByRole('heading').textContent).not.toContain('*');
  });

  it('honours opts.title from object ui:title', () => {
    render(
      <ReactoryTitleFieldTemplate
        {...baseProps({ uiSchema: { 'ui:title': { title: 'Object Title' } } })}
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('Object Title');
  });

  it('falls back to props.title when opts.title is absent from object', () => {
    render(
      <ReactoryTitleFieldTemplate
        {...baseProps({ uiSchema: { 'ui:title': { fieldOptions: { foo: 'bar' } } } })}
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('My Title');
  });

  it('renders the resolved FQN component when field is set and resolves', () => {
    const MarkerTitle = jest.fn(() => <span data-testid="marker-title" />);
    const registry = baseRegistry({
      resolveFqn: (name: string, kind: string) =>
        kind === 'field' && name === 'my.TitleField' ? MarkerTitle : null,
    });
    render(
      <ReactoryTitleFieldTemplate
        {...baseProps({
          uiSchema: { 'ui:title': { field: 'my.TitleField' } },
          registry,
        })}
      />,
    );
    expect(screen.getByTestId('marker-title')).toBeInTheDocument();
  });

  it('passes title and fieldOptions to the resolved component', () => {
    const MarkerTitle = jest.fn(() => null);
    const registry = baseRegistry({
      resolveFqn: () => MarkerTitle,
    });
    render(
      <ReactoryTitleFieldTemplate
        {...baseProps({
          uiSchema: {
            'ui:title': { field: 'my.TitleField', title: 'Custom', fieldOptions: { extra: 'val' } },
          },
          registry,
        })}
      />,
    );
    expect(MarkerTitle).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Custom', extra: 'val' }),
      expect.anything(),
    );
  });

  it('falls back to default h5 when field resolves to null', () => {
    const registry = baseRegistry({
      resolveFqn: () => null,
    });
    render(
      <ReactoryTitleFieldTemplate
        {...baseProps({
          uiSchema: { 'ui:title': { field: 'my.Missing' } },
          registry,
        })}
      />,
    );
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('logs debug when field resolves to null and reactory is available', () => {
    const debug = jest.fn();
    const registry = baseRegistry({
      formContext: { reactory: { debug } },
      resolveFqn: () => null,
    });
    render(
      <ReactoryTitleFieldTemplate
        {...baseProps({
          uiSchema: { 'ui:title': { field: 'my.Missing' } },
          registry,
        })}
      />,
    );
    expect(debug).toHaveBeenCalledWith(
      expect.stringContaining('my.Missing'),
    );
  });

  it('caps recursion at depth 3 and renders default h5', () => {
    const MarkerTitle = jest.fn(() => <span data-testid="marker" />);
    const registry = baseRegistry({ resolveFqn: () => MarkerTitle });
    render(
      <TitleDepthContext.Provider value={3}>
        <ReactoryTitleFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:title': { field: 'my.TitleField' } },
            registry,
          })}
        />
      </TitleDepthContext.Provider>,
    );
    expect(screen.queryByTestId('marker')).toBeNull();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('increments depth context when rendering a resolved component', () => {
    let capturedDepth: number | undefined;
    const DepthCapture = (p: Record<string, unknown>) => {
      capturedDepth = React.useContext(TitleDepthContext);
      return <span data-testid="depth-capture" />;
    };
    const registry = baseRegistry({ resolveFqn: () => DepthCapture });
    render(
      <TitleDepthContext.Provider value={1}>
        <ReactoryTitleFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:title': { field: 'my.TitleField' } },
            registry,
          })}
        />
      </TitleDepthContext.Provider>,
    );
    expect(capturedDepth).toBe(2);
  });

  it('renders nothing when ui:title is false even with required true', () => {
    const { container } = render(
      <ReactoryTitleFieldTemplate
        {...baseProps({ required: true, uiSchema: { 'ui:title': false } })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

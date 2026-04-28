/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { DescriptionFieldProps } from '@rjsf/utils';
import {
  ReactoryDescriptionFieldTemplate,
  DescriptionDepthContext,
} from '../../templates/DescriptionFieldTemplate';

const baseRegistry = (overrides: Record<string, unknown> = {}): DescriptionFieldProps['registry'] =>
  ({ formContext: {}, ...overrides } as unknown as DescriptionFieldProps['registry']);

const baseProps = (overrides: Partial<Omit<DescriptionFieldProps, 'uiSchema'> & { uiSchema?: Record<string, unknown> }> = {}): DescriptionFieldProps => ({
  id: 'root__description',
  description: 'My Description',
  schema: { type: 'string' },
  uiSchema: {},
  registry: baseRegistry(),
  ...overrides,
} as DescriptionFieldProps);

describe('ReactoryDescriptionFieldTemplate', () => {
  it('renders default p when ui:description is undefined', () => {
    render(<ReactoryDescriptionFieldTemplate {...baseProps()} />);
    const p = screen.getByText('My Description');
    expect(p.tagName.toLowerCase()).toBe('p');
    expect(p).toHaveClass('description-field');
    expect(p).toHaveAttribute('id', 'root__description__description');
  });

  it('renders the string override from ui:description', () => {
    render(
      <ReactoryDescriptionFieldTemplate
        {...baseProps({ uiSchema: { 'ui:description': 'Override Desc' } })}
      />,
    );
    expect(screen.getByText('Override Desc')).toBeInTheDocument();
  });

  it('renders nothing when ui:description is false', () => {
    const { container } = render(
      <ReactoryDescriptionFieldTemplate
        {...baseProps({ uiSchema: { 'ui:description': false } })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('honours opts.description from object ui:description', () => {
    render(
      <ReactoryDescriptionFieldTemplate
        {...baseProps({ uiSchema: { 'ui:description': { description: 'Object Desc' } } })}
      />,
    );
    expect(screen.getByText('Object Desc')).toBeInTheDocument();
  });

  it('falls back to props.description when opts.description is absent from object', () => {
    render(
      <ReactoryDescriptionFieldTemplate
        {...baseProps({ uiSchema: { 'ui:description': { fieldOptions: {} } } })}
      />,
    );
    expect(screen.getByText('My Description')).toBeInTheDocument();
  });

  it('renders the resolved FQN component when field is set and resolves', () => {
    const MarkerDesc = jest.fn(() => <span data-testid="marker-desc" />);
    const registry = baseRegistry({
      resolveFqn: (name: string, kind: string) =>
        kind === 'field' && name === 'my.DescField' ? MarkerDesc : null,
    });
    render(
      <ReactoryDescriptionFieldTemplate
        {...baseProps({
          uiSchema: { 'ui:description': { field: 'my.DescField' } },
          registry,
        })}
      />,
    );
    expect(screen.getByTestId('marker-desc')).toBeInTheDocument();
  });

  it('passes description and fieldOptions to the resolved component', () => {
    const MarkerDesc = jest.fn(() => null);
    const registry = baseRegistry({ resolveFqn: () => MarkerDesc });
    render(
      <ReactoryDescriptionFieldTemplate
        {...baseProps({
          uiSchema: {
            'ui:description': {
              field: 'my.DescField',
              description: 'Custom',
              fieldOptions: { extra: 42 },
            },
          },
          registry,
        })}
      />,
    );
    expect(MarkerDesc).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Custom', extra: 42 }),
      expect.anything(),
    );
  });

  it('falls back to default p when field resolves to null', () => {
    const registry = baseRegistry({ resolveFqn: () => null });
    render(
      <ReactoryDescriptionFieldTemplate
        {...baseProps({
          uiSchema: { 'ui:description': { field: 'my.Missing' } },
          registry,
        })}
      />,
    );
    expect(screen.getByText('My Description')).toBeInTheDocument();
  });

  it('logs debug when field resolves to null and reactory is available', () => {
    const debug = jest.fn();
    const registry = baseRegistry({
      formContext: { reactory: { debug } },
      resolveFqn: () => null,
    });
    render(
      <ReactoryDescriptionFieldTemplate
        {...baseProps({
          uiSchema: { 'ui:description': { field: 'my.Missing' } },
          registry,
        })}
      />,
    );
    expect(debug).toHaveBeenCalledWith(expect.stringContaining('my.Missing'));
  });

  it('caps recursion at depth 3 and renders default p', () => {
    const MarkerDesc = jest.fn(() => <span data-testid="marker" />);
    const registry = baseRegistry({ resolveFqn: () => MarkerDesc });
    render(
      <DescriptionDepthContext.Provider value={3}>
        <ReactoryDescriptionFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:description': { field: 'my.DescField' } },
            registry,
          })}
        />
      </DescriptionDepthContext.Provider>,
    );
    expect(screen.queryByTestId('marker')).toBeNull();
    expect(screen.getByText('My Description')).toBeInTheDocument();
  });

  it('increments depth context when rendering a resolved component', () => {
    let capturedDepth: number | undefined;
    const DepthCapture = (_p: Record<string, unknown>) => {
      capturedDepth = React.useContext(DescriptionDepthContext);
      return null;
    };
    const registry = baseRegistry({ resolveFqn: () => DepthCapture });
    render(
      <DescriptionDepthContext.Provider value={1}>
        <ReactoryDescriptionFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:description': { field: 'my.DescField' } },
            registry,
          })}
        />
      </DescriptionDepthContext.Provider>,
    );
    expect(capturedDepth).toBe(2);
  });

  it('renders a ReactElement description unchanged', () => {
    render(
      <ReactoryDescriptionFieldTemplate
        {...baseProps({ description: <span data-testid="react-desc">react</span> })}
      />,
    );
    expect(screen.getByTestId('react-desc')).toBeInTheDocument();
  });
});

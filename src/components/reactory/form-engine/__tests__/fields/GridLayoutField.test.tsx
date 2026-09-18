/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FieldProps } from '@rjsf/utils';

import { ReactoryGridLayoutField } from '../../fields/GridLayoutField';
import { buildGridSpans } from '../../templates/ObjectFieldTemplate';

const baseProps = (overrides: Record<string, unknown> = {}): FieldProps =>
  ({
    schema: { type: 'object', properties: {} },
    uiSchema: { 'ui:field': 'GridLayout', 'ui:grid-layout': [] },
    idSchema: { $id: 'root' },
    formData: {},
    registry: {},
    onChange: jest.fn(),
    onBlur: jest.fn(),
    onFocus: jest.fn(),
    ...overrides,
  }) as unknown as FieldProps;

describe('buildGridSpans', () => {
  it('maps a property to a responsive gridColumn span', () => {
    const spans = buildGridSpans([
      { connectionId: { xs: 12, md: 6, lg: 4 } },
    ]);

    expect(spans).toEqual({
      connectionId: { xs: 'span 12', md: 'span 6', lg: 'span 4' },
    });
  });

  it('attributes nested paths to their top-level property', () => {
    const spans = buildGridSpans([
      { 'paging.pageSize': { xs: 12, sm: 6, md: 3, lg: 2 } },
    ]);

    expect(spans.paging).toEqual({
      xs: 'span 12',
      sm: 'span 6',
      md: 'span 3',
      lg: 'span 2',
    });
    expect(spans['paging.pageSize']).toBeUndefined();
  });

  it('accepts a bare number as a fixed span', () => {
    expect(buildGridSpans([{ note: 6 }])).toEqual({ note: 'span 6' });
  });

  it('clamps spans into the 1..12 column range', () => {
    expect(buildGridSpans([{ a: 99 }])).toEqual({ a: 'span 12' });
    expect(buildGridSpans([{ b: 0 }])).toEqual({ b: 'span 1' });
  });

  it('keeps the first definition when a property appears in several rows', () => {
    const spans = buildGridSpans([
      { title: { xs: 12, md: 8 } },
      { title: { xs: 12, md: 4 } },
    ]);

    expect(spans.title).toEqual({ xs: 'span 12', md: 'span 8' });
  });

  it('tolerates malformed layout definitions', () => {
    expect(buildGridSpans(undefined)).toEqual({});
    expect(buildGridSpans('nope')).toEqual({});
    expect(buildGridSpans([null, 'x', 5])).toEqual({});
    expect(buildGridSpans([{ a: 'wide' }])).toEqual({});
  });
});

describe('ReactoryGridLayoutField', () => {
  it('delegates rendering to the registry ObjectField', () => {
    const ObjectField = jest.fn(() => <div data-testid="object-field" />);
    render(
      <ReactoryGridLayoutField
        {...baseProps({ registry: { fields: { ObjectField } } as any })}
      />,
    );

    expect(screen.getByTestId('object-field')).toBeInTheDocument();
    expect(ObjectField).toHaveBeenCalledTimes(1);
  });

  it('forwards the grid layout uiSchema to the ObjectField', () => {
    const ObjectField = jest.fn(() => null);
    const uiSchema = {
      'ui:field': 'GridLayout',
      'ui:grid-layout': [{ name: { xs: 12, md: 6 } }],
    };

    render(
      <ReactoryGridLayoutField
        {...baseProps({ uiSchema, registry: { fields: { ObjectField } } as any })}
      />,
    );

    expect(ObjectField).toHaveBeenCalledWith(
      expect.objectContaining({ uiSchema }),
      expect.anything(),
    );
  });

  it('surfaces a diagnostic instead of rendering nothing when ObjectField is unavailable', () => {
    render(<ReactoryGridLayoutField {...baseProps({ registry: { fields: {} } as any })} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/GridLayout field could not resolve/i);
  });
});

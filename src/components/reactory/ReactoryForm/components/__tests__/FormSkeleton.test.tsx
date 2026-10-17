import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormSkeleton } from '../FormSkeleton';
import { DefaultLoadingSchema, isDefaultLoadingSchema } from '../../constants';

afterEach(cleanup);

describe('FormSkeleton', () => {
  it('renders an accessible loading region', () => {
    render(<FormSkeleton />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveAttribute('aria-label', 'Loading form');
  });

  it('renders the expected number of skeleton blocks for the configured rows', () => {
    const { container } = render(<FormSkeleton rows={4} showHeader showToolbar />);
    // Header (2) + 4 field labels + 4 field controls + 2 toolbar buttons = 12
    // eslint-disable-next-line testing-library/no-container
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(12);
  });

  it('supports a two-column layout', () => {
    const { container } = render(
      <FormSkeleton rows={2} columns={2} showHeader={false} showToolbar={false} />,
    );
    // 4 fields * (label + control) = 8
    // eslint-disable-next-line testing-library/no-container
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(8);
  });

  it('honours a custom aria-label', () => {
    render(<FormSkeleton label="Preparing report" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Preparing report');
  });
});

describe('isDefaultLoadingSchema', () => {
  it('treats the canonical placeholder schema as a placeholder', () => {
    expect(isDefaultLoadingSchema(DefaultLoadingSchema)).toBe(true);
  });

  it('detects a structural clone of the placeholder (same title, no properties)', () => {
    expect(
      isDefaultLoadingSchema({ type: 'object', title: 'Loading Form', properties: {} }),
    ).toBe(true);
  });

  it('does not treat an unknown (undefined) schema as a placeholder', () => {
    expect(isDefaultLoadingSchema(undefined)).toBe(false);
    expect(isDefaultLoadingSchema(null)).toBe(false);
  });

  it('does not treat a real schema as a placeholder', () => {
    expect(
      isDefaultLoadingSchema({
        type: 'object',
        title: 'User Profile',
        properties: { name: { type: 'string' } },
      }),
    ).toBe(false);
  });

  it('does not treat a schema that merely shares the title but has properties as a placeholder', () => {
    expect(
      isDefaultLoadingSchema({ title: 'Loading Form', properties: { loading: { type: 'string' } } }),
    ).toBe(false);
  });
});

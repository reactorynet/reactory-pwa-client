import React from 'react';
import { screen } from '@testing-library/react';
import RouteSlot from '../RouteSlot';
import { createMockReactory, renderWithRouter } from './testUtils';

const Header = ({ title }: { title?: string }) => <div data-testid="slot-header">{title || 'header'}</div>;

describe('RouteSlot', () => {
  it('renders fallback when config is missing', () => {
    const reactory = createMockReactory();
    renderWithRouter(
      <RouteSlot fallback={<div data-testid="fallback">fallback</div>} />,
      reactory,
    );
    expect(screen.getByTestId('fallback')).toBeTruthy();
  });

  it('renders fallback when show is false', () => {
    const reactory = createMockReactory({ components: { 'core.Header@1.0.0': Header } });
    renderWithRouter(
      <RouteSlot
        config={{ show: false, componentFqn: 'core.Header@1.0.0' }}
        fallback={<div data-testid="fallback">fallback</div>}
      />,
      reactory,
    );
    expect(screen.getByTestId('fallback')).toBeTruthy();
  });

  it('renders the registered slot component', () => {
    const reactory = createMockReactory({ components: { 'core.Header@1.0.0': Header } });
    renderWithRouter(
      <RouteSlot config={{ show: true, componentFqn: 'core.Header@1.0.0', props: { title: 'Hello' } }} />,
      reactory,
    );
    expect(screen.getByTestId('slot-header').textContent).toBe('Hello');
  });

  it('maps props when propsMap is provided', () => {
    const reactory = createMockReactory({ components: { 'core.Header@1.0.0': Header } });
    reactory.utils.objectMapper = () => ({ title: 'Mapped' });
    renderWithRouter(
      <RouteSlot
        config={{
          show: true,
          componentFqn: 'core.Header@1.0.0',
          props: { title: 'Original' },
          propsMap: { title: 'props.title' },
        }}
      />,
      reactory,
    );
    expect(screen.getByTestId('slot-header').textContent).toBe('Mapped');
  });

  it('uses fallback when the slot component is not registered', () => {
    const reactory = createMockReactory({ components: {} });
    renderWithRouter(
      <RouteSlot
        config={{ show: true, componentFqn: 'core.MissingHeader@1.0.0' }}
        fallback={<div data-testid="fallback">fallback</div>}
      />,
      reactory,
    );
    expect(screen.getByTestId('fallback')).toBeTruthy();
  });
});

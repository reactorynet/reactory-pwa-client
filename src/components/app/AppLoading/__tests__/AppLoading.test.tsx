/**
 * AppLoading Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppLoading } from '../AppLoading';

describe('AppLoading', () => {
  it('should render with default message', () => {
    render(<AppLoading />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    const customMessage = 'Loading application...';
    render(<AppLoading message={customMessage} />);
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('should render the loader element', () => {
    const { container } = render(<AppLoading />);
    const loader = container.querySelector('#default_loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass('loader');
  });

  it('should render all 5 loader lines', () => {
    const { container } = render(<AppLoading />);
    const loaderLines = container.querySelectorAll('.loader-line');
    expect(loaderLines).toHaveLength(5);
  });
});

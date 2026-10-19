import React from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormLoadingIndicator } from '../FormLoadingIndicator';
import { FormLoadingStage } from '../../hooks/useFormLoadingState';

afterEach(cleanup);

const failedStages: FormLoadingStage[] = [
  { key: 'form-definition', label: 'Loading form definition', status: 'error', errorMessage: 'Form "reactory.MyApplications@1.0.0" could not be resolved' },
  { key: 'ui-schema', label: 'Resolving UI schema', status: 'pending' },
];

const renderErrorState = (onRetry?: () => void) =>
  render(
    <FormLoadingIndicator
      stages={failedStages}
      progress={0}
      activeStageLabel="Loading form definition"
      hasError
      onRetry={onRetry}
    />,
  );

describe('FormLoadingIndicator error state', () => {
  it('renders the failure as an alert with the server message visible', () => {
    renderErrorState();

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Could not load this form')).toBeInTheDocument();
    expect(screen.getByText('Form "reactory.MyApplications@1.0.0" could not be resolved')).toBeInTheDocument();
  });

  it('renders a keyboard-reachable Retry button wired to onRetry', () => {
    const onRetry = jest.fn();
    renderErrorState(onRetry);

    const retry = screen.getByRole('button', { name: /retry/i });
    expect(retry.tagName).toBe('BUTTON');
    expect(retry).toHaveAttribute('type', 'button');

    // It participates in the tab order and receives focus like any real button.
    retry.focus();
    expect(retry).toHaveFocus();

    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the failure message associated with the retry action for assistive tech', () => {
    renderErrorState(jest.fn());

    const retry = screen.getByRole('button', { name: /retry/i });
    const describedBy = retry.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      'Form "reactory.MyApplications@1.0.0" could not be resolved',
    );
  });

  it('does not offer a retry control when no handler is supplied', () => {
    renderErrorState();

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('does not render the skeleton preview while errored', () => {
    const { container } = renderErrorState(jest.fn());
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(0);
  });
});

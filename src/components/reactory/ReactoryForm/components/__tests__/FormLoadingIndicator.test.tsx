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

const inProgressStages: FormLoadingStage[] = [
  { key: 'form-definition', label: 'Loading form definition', status: 'complete' },
  { key: 'ui-schema', label: 'Resolving UI schema', status: 'active' },
  { key: 'widgets', label: 'Mapping widgets & fields', status: 'pending' },
  { key: 'resources', label: 'Loading resources', status: 'pending' },
  { key: 'data', label: 'Fetching data', status: 'pending' },
];

describe('FormLoadingIndicator progress state', () => {
  const renderProgressState = (variant?: 'full' | 'compact') =>
    render(
      <FormLoadingIndicator
        stages={inProgressStages}
        progress={20}
        activeStageLabel="Resolving UI schema"
        hasError={false}
        variant={variant}
      />,
    );

  it('renders the progress bar and active stage label (full variant)', () => {
    const { container } = renderProgressState('full');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    // Active stage label in the header *and* the matching stage row.
    expect(screen.getAllByText('Resolving UI schema')).toHaveLength(2);
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
  });

  it('lists every stage with its status in the full variant', () => {
    renderProgressState('full');

    // A list item per stage, including the pending ones (dimmed, not hidden).
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(inProgressStages.length);
    expect(screen.getByText('Loading form definition')).toBeInTheDocument();
    expect(screen.getByText('Mapping widgets & fields')).toBeInTheDocument();
  });

  it('renders the skeleton preview while loading in the full variant', () => {
    const { container } = renderProgressState('full');
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders only the progress bar and label in the compact variant', () => {
    const { container } = renderProgressState('compact');

    expect(screen.getAllByText('Resolving UI schema')).toHaveLength(1);
    expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
    // The stage list and the skeleton preview are full-variant only.
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(0);
  });
});

describe('FormLoadingIndicator defaults and defensive rendering', () => {
  it('defaults to the full variant when no variant is supplied', () => {
    const { container } = render(
      <FormLoadingIndicator
        stages={inProgressStages}
        progress={0}
        activeStageLabel="Preparing..."
        hasError={false}
      />,
    );

    // Full variant: the stage list and skeleton preview are present.
    expect(screen.getAllByRole('listitem')).toHaveLength(inProgressStages.length);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('labels an errored stage in the list when the stage array disagrees with hasError', () => {
    // Defence in depth: if a caller passes hasError={false} while a stage is
    // errored, the stage row still shows the failure instead of hiding it.
    render(
      <FormLoadingIndicator
        stages={[
          { key: 'form-definition', label: 'Loading form definition', status: 'error', errorMessage: 'boom' },
        ]}
        progress={0}
        activeStageLabel="Loading form definition"
        hasError={false}
        variant="full"
      />,
    );

    expect(screen.getByText('Loading form definition — boom')).toBeInTheDocument();
  });
});

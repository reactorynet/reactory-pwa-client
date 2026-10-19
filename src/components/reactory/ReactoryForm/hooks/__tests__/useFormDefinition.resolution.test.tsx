import React from 'react';
import { act, render, waitFor, cleanup } from '@testing-library/react';
import { useReactory } from '@reactory/client-core/api';
import { useFormDefinition } from '../useFormDefinition';

/**
 * Hook-level coverage for the form-resolution lifecycle in `useFormDefinition`.
 *
 * These are the behaviours the ticket's acceptance criteria name explicitly:
 *  - Retry resets the stage state, performs a *targeted* cache clear for this
 *    form only, then resolves again.
 *  - A login event after a failure re-resolves the form (log out, log back in,
 *    the form resolves) — without requiring a page reload.
 *  - The login listener is removed on unmount.
 *
 * The sub-hooks are stubbed so the test exercises the resolution orchestration
 * (the part that changed) rather than the form engine.
 */

jest.mock('@reactory/client-core/api', () => ({
  useReactory: jest.fn(),
  ReactoryApiEventNames: { onLogin: 'onLogin' },
}));

jest.mock('@reactory/client-core/components/reactory/form/utils', () => ({
  toIdSchema: jest.fn(() => ({})),
}));

jest.mock('@reactory/client-core/components/reactory/ux/mui', () => ({
  __esModule: true,
  default: { widgets: {}, templates: {}, fields: {} },
}));

jest.mock('@reactory/client-core/api/subresourceIntegrity', () => ({
  applyIntegrity: jest.fn(),
}));

jest.mock('react-router', () => ({
  useParams: jest.fn(() => ({})),
}));

jest.mock('../../../ux', () => ({ __esModule: true, default: {} }));

jest.mock('../useDataManager', () => ({ useDataManager: jest.fn() }));
jest.mock('../useSchema', () => ({ useSchema: jest.fn() }));
jest.mock('../useUISchema', () => ({ useUISchema: jest.fn() }));
jest.mock('../useContext', () => ({ useFormContext: jest.fn() }));
jest.mock('../../stateManagement/useStateStore', () => ({
  useStateStore: jest.fn(() => ({ setState: jest.fn(), debug: {} })),
}));
jest.mock('../../performanceOptimization/usePerformanceMonitor', () => ({
  usePerformanceMonitor: jest.fn(() => ({
    startTimer: jest.fn(),
    endTimer: jest.fn(),
    metrics: {},
    getReport: jest.fn(),
  })),
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'instance-1') }));

const { useDataManager } = require('../useDataManager');
const { useSchema } = require('../useSchema');
const { useUISchema } = require('../useUISchema');
const { useFormContext } = require('../useContext');

const FORM_ID = 'reactory.MyApplications@1.0.0';

const resolvedDefinition = {
  id: FORM_ID,
  name: 'MyApplications',
  nameSpace: 'reactory',
  version: '1.0.0',
  schema: { type: 'object', properties: { application: { type: 'string' } } },
  uiSchema: {},
};

const createReactory = () => ({
  utils: {
    nil: (value: any) => value === null || value === undefined,
    lodash: {
      isArray: Array.isArray,
      cloneDeep: (value: any) => JSON.parse(JSON.stringify(value)),
    },
  },
  debug: jest.fn(),
  log: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  getComponents: jest.fn(() => ({})),
  getComponent: jest.fn(() => null),
  form: jest.fn(),
  forms: jest.fn().mockResolvedValue([]),
  clearFormCache: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
});

let latest: any;

const Harness = (props: any) => {
  latest = useFormDefinition(props);
  return null;
};

const loginHandler = (reactory: any): (() => void) => {
  const call = reactory.on.mock.calls.find((entry: any[]) => entry[0] === 'onLogin');
  expect(call).toBeTruthy();
  return call[1];
};

describe('useFormDefinition — resolution lifecycle', () => {
  let reactory: ReturnType<typeof createReactory>;

  beforeEach(() => {
    latest = undefined;
    reactory = createReactory();
    (useReactory as jest.Mock).mockReturnValue(reactory);

    (useDataManager as jest.Mock).mockReturnValue({
      canRefresh: false,
      isDataLoading: false,
      formData: {},
      onChange: jest.fn(),
      reset: jest.fn(),
      onSubmit: jest.fn(),
      validate: jest.fn(),
      isValidating: false,
      errorSchema: {},
      errors: [],
      refresh: jest.fn(),
      RefreshButton: null,
      SubmitButton: null,
      PagingWidget: null,
      paging: null,
    });
    (useSchema as jest.Mock).mockReturnValue({
      schema: { type: 'object', properties: { application: { type: 'string' } } },
    });
    (useUISchema as jest.Mock).mockReturnValue({
      loading: false,
      uiOptions: {},
      uiSchema: {},
      uiSchemaActiveMenuItem: undefined,
      uiSchemaActiveGraphDefintion: undefined,
      uiSchemasAvailable: [],
      SchemaSelector: () => null,
    });
    (useFormContext as jest.Mock).mockReturnValue({});
  });

  afterEach(cleanup);

  it('retry resets the stage state, clears only this form, then re-resolves', async () => {
    reactory.form
      .mockImplementationOnce((id: string, onUpdated: any) =>
        onUpdated(null, new Error(`Form "${id}" could not be resolved`)))
      .mockImplementationOnce((id: string, onUpdated: any) => onUpdated(resolvedDefinition));

    render(<Harness formId={FORM_ID} />);

    await waitFor(() => expect(latest.loadingState.hasError).toBe(true));
    // The failure message is the real one, not a generic placeholder.
    expect(
      latest.loadingState.stages.find((stage: any) => stage.key === 'form-definition').errorMessage,
    ).toBe(`Form "${FORM_ID}" could not be resolved`);

    act(() => {
      latest.retryFormDefinition();
    });

    await waitFor(() => expect(latest.form.id).toBe(FORM_ID));

    // Targeted clear: the id is passed so an unrelated cached list survives.
    expect(reactory.clearFormCache).toHaveBeenCalledTimes(1);
    expect(reactory.clearFormCache).toHaveBeenCalledWith(FORM_ID);
    // Resolution ran again and the error state was replaced by the form.
    expect(reactory.form).toHaveBeenCalledTimes(2);
    expect(latest.loadingState.hasError).toBe(false);
    expect(latest.form.id).toBe(FORM_ID);
  });

  it('keeps the error state when the retry also fails (no auto-loop)', async () => {
    reactory.form.mockImplementation((id: string, onUpdated: any) =>
      onUpdated(null, new Error(`Form "${id}" could not be resolved`)));

    render(<Harness formId={FORM_ID} />);

    await waitFor(() => expect(latest.loadingState.hasError).toBe(true));

    act(() => {
      latest.retryFormDefinition();
    });

    await waitFor(() => expect(reactory.form).toHaveBeenCalledTimes(2));
    // A single automatic second attempt, then it stops: no retry storm.
    expect(latest.loadingState.hasError).toBe(true);
  });

  it('re-resolves when a session becomes available (log out, log back in)', async () => {
    reactory.form
      .mockImplementationOnce((id: string, onUpdated: any) =>
        onUpdated(null, new Error(`Form "${id}" could not be resolved`)))
      .mockImplementationOnce((id: string, onUpdated: any) => onUpdated(resolvedDefinition));

    render(<Harness formId={FORM_ID} />);

    await waitFor(() => expect(latest.loadingState.hasError).toBe(true));
    expect(latest.form.id).not.toBe(FORM_ID);

    // Mirrors ReactoryApi.status() emitting onLogin once the session is known.
    await act(async () => {
      loginHandler(reactory)();
    });

    await waitFor(() => expect(latest.form.id).toBe(FORM_ID));
    expect(latest.loadingState.hasError).toBe(false);
    // Recovery happens by re-resolving, not by discarding the whole list.
    expect(reactory.clearFormCache).not.toHaveBeenCalled();
  });

  it('recovers by loading the list once when the cache was emptied by logout', async () => {
    // `form(id)` throws while no list is loaded — the state after a logout.
    reactory.form
      .mockImplementationOnce(() => {
        throw new Error('No forms have been loaded. Ensure the forms function is called before calling form(id)');
      })
      .mockImplementationOnce((id: string, onUpdated: any) => onUpdated(resolvedDefinition));

    render(<Harness formId={FORM_ID} />);

    await waitFor(() => expect(reactory.forms).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(latest.form.id).toBe(FORM_ID));
    expect(reactory.forms).toHaveBeenCalledWith(true);
  });

  it('uses a caller-supplied definition without resolving by id', async () => {
    const supplied = { ...resolvedDefinition };

    render(<Harness formDef={supplied} />);

    await waitFor(() => expect(latest.form.id).toBe(FORM_ID));

    expect(reactory.form).not.toHaveBeenCalled();
    expect(reactory.forms).not.toHaveBeenCalled();
    expect(latest.loadingState.hasError).toBe(false);
  });

  it('removes the login listener on unmount', async () => {
    reactory.form.mockImplementation((id: string, onUpdated: any) => onUpdated(resolvedDefinition));

    const { unmount } = render(<Harness formId={FORM_ID} />);
    await waitFor(() => expect(latest.form.id).toBe(FORM_ID));

    const handler = loginHandler(reactory);
    unmount();

    expect(reactory.off).toHaveBeenCalledWith('onLogin', handler);
  });
});

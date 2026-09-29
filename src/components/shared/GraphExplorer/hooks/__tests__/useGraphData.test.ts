/**
 * useGraphData — the mount-time capability probe.
 *
 * The probe must ask the *system graph* about its own fields. It used to
 * introspect the GraphQL schema (`__type(name: "Query")`), which is a
 * different capability — the express graph middleware serves introspection
 * only in development, so in production the probe was answered with HTTP 400
 * and surfaced as an error the moment the explorer mounted.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useGraphData } from '../useGraphData';

const mockReactory = {
  graphqlQuery: jest.fn(),
  graphqlMutation: jest.fn(),
  log: jest.fn(),
  createNotification: jest.fn(),
};

jest.mock('@reactory/client-core/api', () => ({
  useReactory: () => mockReactory,
}));

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Mount the hook and let the one-shot probe settle. */
const mountAndSettle = async () => {
  const rendered = renderHook(() => useGraphData());
  await act(async () => {
    await flush();
  });
  return rendered;
};

const probeQuery = (): string => String(mockReactory.graphqlQuery.mock.calls[0]?.[0] ?? '');

/** Apollo Server answers an unknown-field validation error with HTTP 400. */
const unknownFieldError = (field: string) => ({
  message: `Cannot query field "${field}" on type "Query".`,
  extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
});

const thrownValidationFailure = (...fields: string[]) => ({
  graphQLErrors: [],
  networkError: {
    statusCode: 400,
    result: { errors: fields.map(unknownFieldError) },
  },
});

const FULL = {
  subgraphQuery: true,
  batchNodes: true,
  nodeLinks: true,
  graphPath: true,
  savePerspective: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReactory.graphqlQuery.mockResolvedValue({ data: {} });
});

describe('useGraphData capability probe', () => {
  it('asks the graph API for its own fields instead of introspecting the schema', async () => {
    await mountAndSettle();

    const query = probeQuery();
    expect(query).not.toContain('__type');
    expect(query).not.toContain('__schema');
    expect(query).toContain('ReactorSubgraph');
    expect(query).toContain('ReactorNodes');
    expect(query).toContain('ReactorNodeLinks');
    expect(query).toContain('ReactorGraphPath');
    expect(query).toContain('ReactorGraphPerspectives');
  });

  it('skips every probe selection so a valid probe executes no resolvers', async () => {
    await mountAndSettle();

    const gated = probeQuery().match(/@include\(if: false\)/g) ?? [];
    expect(gated).toHaveLength(5);
  });

  it('issues exactly one request on mount', async () => {
    await mountAndSettle();

    expect(mockReactory.graphqlQuery).toHaveBeenCalledTimes(1);
    expect(mockReactory.graphqlMutation).not.toHaveBeenCalled();
  });

  it('resolves the full API when the probe validates', async () => {
    const { result } = await mountAndSettle();

    expect(result.current.capabilitiesResolved).toBe(true);
    expect(result.current.capabilities).toEqual(FULL);
    expect(result.current.error).toBeNull();
  });

  it('downgrades exactly the fields a 400 reports as unknown', async () => {
    mockReactory.graphqlQuery.mockRejectedValueOnce(
      thrownValidationFailure('ReactorSubgraph', 'ReactorGraphPath')
    );

    const { result } = await mountAndSettle();

    expect(result.current.capabilitiesResolved).toBe(true);
    expect(result.current.capabilities).toEqual({
      ...FULL,
      subgraphQuery: false,
      graphPath: false,
    });
  });

  it('downgrades when validation errors resolve instead of throwing', async () => {
    mockReactory.graphqlQuery.mockResolvedValueOnce({
      data: null,
      errors: [unknownFieldError('ReactorGraphPerspectives')],
    });

    const { result } = await mountAndSettle();

    expect(result.current.capabilities.savePerspective).toBe(false);
    expect(result.current.capabilities.subgraphQuery).toBe(true);
  });

  it('never surfaces the probe as a user-visible error', async () => {
    mockReactory.graphqlQuery.mockRejectedValueOnce(
      thrownValidationFailure('ReactorSubgraph')
    );

    const { result } = await mountAndSettle();

    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockReactory.createNotification).not.toHaveBeenCalled();
    expect(mockReactory.log).toHaveBeenCalled();
  });

  it('assumes the full API when the probe fails for a reason other than a missing field', async () => {
    mockReactory.graphqlQuery.mockRejectedValueOnce(new Error('network down'));

    const { result } = await mountAndSettle();

    expect(result.current.capabilities).toEqual(FULL);
    expect(result.current.error).toBeNull();
    expect(mockReactory.createNotification).not.toHaveBeenCalled();
  });
});

/**
 * Guards that the client attaches the language to outgoing traffic.
 *
 * `requestLanguage()` returning the right value proves nothing on its own: the
 * client is the side that silently drops the header, and a drop only surfaces at
 * runtime as a CORS preflight failure ("all GraphQL is broken"). So these tests
 * drive the **real link assembly** the client uses, not the pieces — dropping
 * `authLink` from the composition, or reordering it, is exactly the failure they
 * exist to catch.
 */
import { ApolloLink, Observable, gql } from '@apollo/client';
import Reactory from '@reactorynet/reactory-core';

import { LANGUAGE_HEADER, LANGUAGE_STORAGE_KEY } from '../language';
import {
  buildConnectionParams,
  createAuthLink,
  createSplitLink,
} from '../ReactoryApolloClient';

const setBrowserLanguage = (language: string | undefined) => {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    get: () => language,
  });
};

const QUERY = gql`
  query LanguageHeaderProbe {
    __typename
  }
`;

const SUBSCRIPTION = gql`
  subscription LanguageHeaderProbe {
    __typename
  }
`;

const createOperation = (query: unknown, operationName: string) => {
  const context: Record<string, any> = {};
  const operation: any = {
    query,
    variables: {},
    operationName,
    extensions: {},
    getContext: () => context,
    setContext: (next: any) => {
      Object.assign(context, typeof next === 'function' ? next(context) : next);
      return operation;
    },
  };

  return operation;
};

/**
 * Runs an operation through the real `createSplitLink` assembly, recording what
 * each terminal branch saw.
 */
const runThroughClientLinks = (query: unknown, operationName: string) => {
  let httpContext: Record<string, any> | undefined;
  let wsUsed = false;

  const wsLink = new ApolloLink(() => {
    wsUsed = true;
    return Observable.of({ data: { __typename: 'Subscription' } });
  });

  const uploadLink = new ApolloLink((operation) => {
    httpContext = operation.getContext();
    return Observable.of({ data: { __typename: 'Query' } });
  });

  const link = createSplitLink({ wsLink, authLink: createAuthLink(), uploadLink });
  const operation = createOperation(query, operationName);
  const forward = () => Observable.of({ data: {} });

  return new Promise<{ httpContext?: Record<string, any>; wsUsed: boolean }>((resolve, reject) => {
    link.request(operation as any, forward as any).subscribe({
      error: reject,
      complete: () => resolve({ httpContext, wsUsed }),
    });
  });
};

describe('language on outgoing requests', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBrowserLanguage('en-GB');
  });

  it("attaches the user's stored choice on a query", async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'af');

    const { httpContext, wsUsed } = await runThroughClientLinks(QUERY, 'LanguageHeaderProbe');

    expect(wsUsed).toBe(false);
    expect(httpContext?.headers?.[LANGUAGE_HEADER]).toBe('af');
  });

  it('falls back to the browser preference', async () => {
    const { httpContext } = await runThroughClientLinks(QUERY, 'LanguageHeaderProbe');

    expect(httpContext?.headers?.[LANGUAGE_HEADER]).toBe('en-GB');
  });

  it('omits the header when no language can be resolved', async () => {
    setBrowserLanguage(undefined);

    const { httpContext } = await runThroughClientLinks(QUERY, 'LanguageHeaderProbe');

    expect(httpContext?.headers).not.toHaveProperty(LANGUAGE_HEADER);
  });

  it('still attaches the unrelated request headers', async () => {
    // Guards against the language header being supplied by a link that quietly
    // replaces this chain.
    const { httpContext } = await runThroughClientLinks(QUERY, 'LanguageHeaderProbe');

    expect(httpContext?.headers).toHaveProperty('apollo-require-preflight', 'true');
    expect(httpContext?.headers).toHaveProperty('authorization');
  });

  it('routes subscriptions off the HTTP chain', async () => {
    const { wsUsed, httpContext } = await runThroughClientLinks(
      SUBSCRIPTION,
      'LanguageHeaderProbe'
    );

    expect(wsUsed).toBe(true);
    expect(httpContext).toBeUndefined();
  });

  it('carries the language in the websocket connection params', () => {
    // Subscriptions carry no HTTP headers, so the connection params are their
    // only channel for the language.
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'af');

    expect(buildConnectionParams()[LANGUAGE_HEADER]).toBe('af');
  });

  it('omits the language from the connection params when none resolves', () => {
    setBrowserLanguage(undefined);

    expect(buildConnectionParams()).not.toHaveProperty(LANGUAGE_HEADER);
  });

  it('uses the header name from the shared core constant', () => {
    // Fails if a local literal is reintroduced that can drift from the server's
    // CORS allowlist — the coupling that broke every GraphQL request.
    expect(LANGUAGE_HEADER).toBe(Reactory.LANGUAGE_HEADER);
  });
});

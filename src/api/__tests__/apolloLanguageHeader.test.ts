/**
 * Guards that the client actually attaches the language header to outgoing
 * requests.
 *
 * `requestLanguage()` returning the right value is not enough on its own: if the
 * header is dropped or renamed inside the Apollo link, the request fails its CORS
 * preflight in the browser and every GraphQL operation breaks. The server-side
 * allowlist test cannot see that, so the assertion is made against the request
 * the link actually produces.
 */
import { ApolloLink, Observable, gql } from '@apollo/client';
import Reactory from '@reactorynet/reactory-core';

import { LANGUAGE_HEADER, LANGUAGE_STORAGE_KEY } from '../language';
import { createAuthLink } from '../ReactoryApolloClient';

const setBrowserLanguage = (language: string | undefined) => {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    get: () => language,
  });
};

/** A minimal operation with a real, readable/writable link context. */
const createOperation = () => {
  const context: Record<string, any> = {};
  const operation: any = {
    query: gql`
      query RequestLanguageHeaderTest {
        __typename
      }
    `,
    variables: {},
    operationName: 'RequestLanguageHeaderTest',
    extensions: {},
    getContext: () => context,
    setContext: (next: any) => {
      Object.assign(context, typeof next === 'function' ? next(context) : next);
      return operation;
    },
  };

  return operation;
};

/** Runs an operation through `link` and resolves the context the next link saw. */
const runThroughLink = (link: ApolloLink): Promise<Record<string, any>> => {
  const operation = createOperation();
  const forward = jest.fn(() => Observable.of({ data: { __typename: 'Query' } }));

  return new Promise((resolve, reject) => {
    link.request(operation, forward).subscribe({
      error: reject,
      complete: () => resolve(operation.getContext()),
    });
  });
};

describe('language header on outgoing requests', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBrowserLanguage('en-GB');
  });

  it("attaches the user's stored choice", async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'af');

    const context = await runThroughLink(createAuthLink());

    expect(context.headers).toBeDefined();
    expect(context.headers[LANGUAGE_HEADER]).toBe('af');
  });

  it('falls back to the browser preference', async () => {
    const context = await runThroughLink(createAuthLink());

    expect(context.headers[LANGUAGE_HEADER]).toBe('en-GB');
  });

  it('omits the header when no language can be resolved', async () => {
    setBrowserLanguage(undefined);

    const context = await runThroughLink(createAuthLink());

    expect(context.headers).not.toHaveProperty(LANGUAGE_HEADER);
  });

  it('still attaches the unrelated request headers', async () => {
    // Guards against the language header being added by a separate link that
    // quietly replaces this one.
    const context = await runThroughLink(createAuthLink());

    expect(context.headers).toHaveProperty('apollo-require-preflight', 'true');
    expect(context.headers).toHaveProperty('authorization');
  });

  it('uses the header name from the shared core constant', () => {
    // Fails if a local literal is reintroduced that can drift from the server's
    // CORS allowlist — the coupling that broke every GraphQL request.
    expect(LANGUAGE_HEADER).toBe(Reactory.LANGUAGE_HEADER);
    expect(LANGUAGE_HEADER.length).toBeGreaterThan(0);
  });
});

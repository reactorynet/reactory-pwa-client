import {
  ApolloClient,
  ApolloLink,
  DocumentNode,
  Resolvers,
  split,
  NormalizedCacheObject
} from '@apollo/client';

import { GraphQLWsLink  } from "@apollo/client/link/subscriptions";
import { setContext } from "@apollo/client/link/context";
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws'
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';
import { fetch } from "whatwg-fetch";
import { getCache } from './ReactoryApolloCache';
import { LANGUAGE_HEADER, LANGUAGE_STORAGE_KEY } from './language';
import { readAuthToken } from './local';

const packageInfo: any = require('../../package.json');

const {
  REACT_APP_CLIENT_KEY,
  REACT_APP_CLIENT_PUBLIC_KEY,
  REACT_APP_API_ENDPOINT,
  REACT_APP_APP_TITLE = packageInfo.displayName
} = process.env;



if (localStorage) {
  localStorage.setItem('REACT_APP_CLIENT_KEY', REACT_APP_CLIENT_KEY);
  localStorage.setItem('REACT_APP_CLIENT_PUBLIC_KEY', REACT_APP_CLIENT_PUBLIC_KEY);
  localStorage.setItem('REACT_APP_API_ENDPOINT', REACT_APP_API_ENDPOINT);
}



/**
 * The language to send with a request: the user's explicit choice when there is
 * one, otherwise the browser's preference.
 *
 * Server-authored strings (form titles, schemas, default data) are rendered in
 * the request's language, so the choice has to travel with every request — the
 * server cannot infer it from a shared translation instance. It rides the
 * `LANGUAGE_HEADER` on HTTP operations and the websocket connection params on
 * subscriptions.
 */
export const requestLanguage = (): string | undefined => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) return stored;
  } catch (storageError) {
    // Storage can be blocked; fall through to the browser preference.
  }

  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return undefined;
};

/**
 * The headers every GraphQL request carries.
 *
 * Read fresh on each call so token changes (login/logout) and language changes
 * take effect immediately. Exported so the language-header coupling can be
 * asserted directly — a dropped header only surfaces at runtime as a CORS
 * preflight failure, which presents as "all GraphQL is broken".
 */
export const buildRequestHeaders = (headers: Record<string, any> = {}): Record<string, any> => {
  const currentToken = readAuthToken();
  const language = requestLanguage();
  return {
    ...headers,
    ...(language ? { [LANGUAGE_HEADER]: language } : {}),
    authorization: currentToken ? `Bearer ${currentToken}` : "",
    'x-client-key': `${process.env.REACT_APP_CLIENT_KEY}`,
    'x-client-public-key': `${process.env.REACT_APP_CLIENT_PUBLIC_KEY}`,
    'x-client-version': `${packageInfo.version}`,
    'x-client-name': REACT_APP_APP_TITLE,
    'apollo-require-preflight': 'true'
  };
};

/**
 * The link that attaches `buildRequestHeaders` to every request.
 *
 * Exported so a test can drive a request through the real link and assert the
 * language header is attached — `requestLanguage()` returning the right value is
 * not enough, since the client is the side that silently drops the header.
 */
export const createAuthLink = () => setContext((_, { headers }) => ({
  headers: buildRequestHeaders(headers),
}));

/**
 * True when the operation travels over the websocket (a subscription).
 *
 * Takes the Apollo `Operation` that `split` hands its predicate, not a bare
 * document.
 */
export const isSubscriptionOperation = (operation: { query: DocumentNode }): boolean => {
  const definition = getMainDefinition(operation.query);
  return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
};

/**
 * The link composition the client actually uses: subscriptions over the
 * websocket, everything else through the auth chain and then the upload link.
 *
 * Exported so a test can drive the **real assembly** rather than the pieces:
 * dropping `authLink` from this composition, or reordering it, is exactly the
 * failure mode the language-header test exists to catch, and a test of
 * `createAuthLink()` in isolation would not notice.
 */
export const createSplitLink = (params: {
  wsLink: ApolloLink;
  authLink: ApolloLink;
  uploadLink: ApolloLink;
}): ApolloLink =>
  split(isSubscriptionOperation, params.wsLink, params.authLink.concat(params.uploadLink));

/**
 * Params a subscription connection is opened with.
 *
 * A subscription carries no HTTP headers, so the connection params are the only
 * channel for the language — without it the choice silently does not travel on
 * that path. Read fresh so token and language changes apply on reconnect.
 */
export const buildConnectionParams = (): Record<string, any> => {
  const currentToken = readAuthToken();
  const language = requestLanguage();
  return {
    Authorization: `Bearer ${currentToken}`,
    authToken: currentToken,
    ...(language ? { [LANGUAGE_HEADER]: language } : {})
  };
};

export default async () => {
  let persistedCache: any = null;
  let cache: any = null;
  let persistor: any = null;
  try {
    persistedCache = await getCache(true);
    cache = persistedCache.cache ? persistedCache.cache : null;
    persistor = persistedCache.persistor ? persistedCache.persistor : null;
  } catch (cacheGetError) {

    console.error(`${cacheGetError.message}`);
  }

  const clearCache = () => {
    if (!persistor) return;
    persistor.purge();
  }

  const authLink = createAuthLink();

  const safeUrl = (route: string) => {
    const baseUrl = localStorage.getItem('REACT_APP_API_ENDPOINT') || '';
    return `${baseUrl.replace(/\/+$/, '')}/${route.replace(/^\/+/, '')}`;
  }
  
  const uploadLink = createUploadLink({
    uri: safeUrl('graph'),
    fetch: fetch
  });

  let clientTypeDefs: string[] = [];
  let resolvers: Resolvers[] = [];

  const ws_client = createClient({
    url: safeUrl('graph').replace('http', 'ws'),
    retryAttempts: 5,
    connectionParams: buildConnectionParams,
  })

  const ws_link = new GraphQLWsLink(ws_client);

  const splitLink = createSplitLink({ wsLink: ws_link, authLink, uploadLink });

  const client: ApolloClient<NormalizedCacheObject> = new ApolloClient<NormalizedCacheObject>({
    link: splitLink,//authLink.concat(uploadLink),
    cache,
    defaultOptions: {

      watchQuery: {
        fetchPolicy: 'network-only',
        errorPolicy: 'ignore',
      },

      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },

      mutate: {
        errorPolicy: 'all',
      },
    },
    typeDefs: clientTypeDefs,
    resolvers: resolvers,
    assumeImmutableResults: false,
  });

  return {
    client,
    ws_link,
    clearCache
  }
};

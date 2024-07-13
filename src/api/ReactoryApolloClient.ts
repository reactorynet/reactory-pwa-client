import {
  ApolloClient,
  Resolvers,
  split,
  NormalizedCacheObject
} from '@apollo/client';

import { GraphQLWsLink  } from "@apollo/client/link/subscriptions";
import { setContext } from "@apollo/client/link/context";
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws'
import { createUploadLink } from 'apollo-upload-client';
import { fetch } from "whatwg-fetch";
import { getCache } from './ReactoryApolloCache';


const packageInfo: any = require('../../package.json');
const anonToken: string = process.env.ANON_USER_TOKEN;

const {
  REACT_APP_CLIENT_KEY,
  REACT_APP_CLIENT_PASSWORD,
  REACT_APP_API_ENDPOINT,
  REACT_APP_APP_TITLE = packageInfo.displayName
} = process.env;

if (localStorage) {
  localStorage.setItem('REACT_APP_CLIENT_KEY', REACT_APP_CLIENT_KEY);
  localStorage.setItem('REACT_APP_CLIENT_PASSWORD', REACT_APP_CLIENT_PASSWORD);
  localStorage.setItem('REACT_APP_API_ENDPOINT', REACT_APP_API_ENDPOINT);
}



export default async () => {
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem('auth_token');

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

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
        'x-client-key': `${process.env.REACT_APP_CLIENT_KEY}`,
        'x-client-pwd': `${process.env.REACT_APP_CLIENT_PASSWORD}`,
        'x-client-version': `${packageInfo.version}`,
        'x-client-name': REACT_APP_APP_TITLE
      }
    }
  });

  const uploadLink = createUploadLink({
    uri: `${localStorage.getItem('REACT_APP_API_ENDPOINT')}/api`,
    fetch: fetch
  });

  let clientTypeDefs: string[] = [];
  let resolvers: Resolvers[] = [];

  createClient({  
    url: `${localStorage.getItem('REACT_APP_API_ENDPOINT')}/api`.replace('http', 'ws'),    
    retryAttempts: 5,
    connectionParams: {
      Authorization: `Bearer ${token}`,
      authToken: token
    }    
  })

  const ws_client = createClient({
    url: `${localStorage.getItem('REACT_APP_API_ENDPOINT')}/api`.replace('http', 'ws'),
    retryAttempts: 5,
    connectionParams: {
      Authorization: `Bearer ${token}`,
      authToken: token
    }
  })

  const ws_link = new GraphQLWsLink(ws_client);

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    ws_link,
    authLink.concat(uploadLink),
  );

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

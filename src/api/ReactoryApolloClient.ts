import { 
  ApolloClient,
  Resolvers,
  split,  
  NormalizedCacheObject
} from '@apollo/client';

import { WebSocketLink } from "@apollo/link-ws";
import { setContext } from '@apollo/link-context';
import { getMainDefinition } from '@apollo/client/utilities';
import { SubscriptionClient } from "subscriptions-transport-ws";
import { createUploadLink } from 'apollo-upload-client';
import { fetch } from "whatwg-fetch";
import { getCache } from './ReactoryApolloCache';


const packageInfo: any = require('../../package.json');
const anonToken: string = process.env.ANON_USER_TOKEN;

const {
  REACT_APP_CLIENT_KEY,
  REACT_APP_CLIENT_PASSWORD,
  REACT_APP_API_ENDPOINT,
  REACT_APP_ANON_TOKEN = anonToken,
  REACT_APP_APP_TITLE = packageInfo.displayName
} = process.env;

if (localStorage) {
  localStorage.setItem('REACT_APP_CLIENT_KEY', REACT_APP_CLIENT_KEY);
  localStorage.setItem('REACT_APP_CLIENT_PASSWORD', REACT_APP_CLIENT_PASSWORD);
  localStorage.setItem('REACT_APP_API_ENDPOINT', REACT_APP_API_ENDPOINT);
}



export default async () => {  
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem('auth_token') || anonToken;

  const _cache = await getCache(true);
  const { cache, persistor } = _cache;

  const clearCache = () => {
    if(!persistor) return;
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

  const ws_client = new SubscriptionClient(`${localStorage.getItem('REACT_APP_API_ENDPOINT')}/api`.replace('http', 'ws'), {
    reconnect: true,
    reconnectionAttempts: 5,
    timeout: 1000,
    connectionParams: {
      Authorization: `Bearer ${token}`,
      authToken: token
    }
  });

  const ws_link = new WebSocketLink(ws_client);
  
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

  const client = new ApolloClient<NormalizedCacheObject>({
    link: splitLink,//authLink.concat(uploadLink),
    cache,
    defaultOptions: {

      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'ignore',
      },

      query: {
        fetchPolicy: 'cache-first',
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

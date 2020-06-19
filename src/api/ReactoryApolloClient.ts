import { ApolloClient, InMemoryCache } from 'apollo-client-preset';
import { createHttpLink } from 'apollo-link-http';
import { WebSocketLink } from "apollo-link-ws";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { createUploadLink } from 'apollo-upload-client';
import { setContext } from 'apollo-link-context';
import { fetch } from "whatwg-fetch";


const {
  REACT_APP_CLIENT_KEY,
  REACT_APP_CLIENT_PASSWORD,
  REACT_APP_API_ENDPOINT
} = process.env;

if (localStorage) {
  localStorage.setItem('REACT_APP_CLIENT_KEY', REACT_APP_CLIENT_KEY);
  localStorage.setItem('REACT_APP_CLIENT_PASSWORD', REACT_APP_CLIENT_PASSWORD);
  localStorage.setItem('REACT_APP_API_ENDPOINT', REACT_APP_API_ENDPOINT);
}

export default ( ) => {

  const anonToken = process.env.ANON_USER_TOKEN
// get the authentication token from local storage if it exists
const token = localStorage.getItem('auth_token') || anonToken;

const authLink = setContext((_, { headers }) => {
  //const anonToken = process.env.ANON_USER_TOKEN
  // get the authentication token from local storage if it exists
  //const token = localStorage.getItem('auth_token') || anonToken;

  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      'x-client-key': `${process.env.REACT_APP_CLIENT_KEY}`,
      'x-client-pwd': `${process.env.REACT_APP_CLIENT_PASSWORD}`
    }
  }
});

const uploadLink = createUploadLink({
  uri: `${localStorage.getItem('REACT_APP_API_ENDPOINT')}/api`,
  fetch: fetch
});

const cache = new InMemoryCache();

const client = new ApolloClient({
  link: authLink.concat(uploadLink),
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
     //fetchPolicy: 'cache-first',      
      errorPolicy: 'all',
    },
  },
});



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

return {
  client,
  ws_link
}

};

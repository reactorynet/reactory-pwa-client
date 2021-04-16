import { InMemoryCache, InMemoryCacheConfig, makeVar } from '@apollo/client';
import { CachePersistor, LocalStorageWrapper, LocalForageWrapper } from 'apollo3-cache-persist';
import localForage from 'localforage';
import { ReactoryLoggedInUser } from './local';


export const isLoggedInVar = makeVar<boolean>(ReactoryLoggedInUser().id !== null)
export const apiStatusVar = makeVar<any>(null);


localForage.config({
    driver: localForage.INDEXEDDB, // Force WebSQL; same as using setDriver()
    name: 'reactory',
    version: 1.0,
    //size: 4980736, // Size of database, in bytes. WebSQL-only for now.
    storeName: 'reactory_client', // Should be alphanumeric, with underscores.
    description: 'Reactory Client local database.'
});

const config: InMemoryCacheConfig = {
    typePolicies: {
        Query: {
            fields: {
                isLoggedIn() {
                    return isLoggedInVar()
                },
                serverStatus() {
                    return apiStatusVar();
                }
            }
        }
    },
}


export const cache: InMemoryCache = new InMemoryCache(config);

export const getCache = async (debug: boolean = true) => {

    let reactory_persistor = new CachePersistor({
        cache,
        storage: new LocalForageWrapper(localForage),
        debug,
        trigger: 'write',
        key: 'reactory_apollo_cache',
        maxSize: false
    });

    await reactory_persistor.restore().then();

    return {
        cache,
        persistor: reactory_persistor
    }

};


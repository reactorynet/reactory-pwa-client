import { InMemoryCache, InMemoryCacheConfig, makeVar } from '@apollo/client';
import { CachePersistor, LocalStorageWrapper } from 'apollo3-cache-persist';
import { ReactoryLoggedInUser } from './local';


export const isLoggedInVar = makeVar<boolean>(ReactoryLoggedInUser().id !== null)
export const apiStatusVar = makeVar<any>(null);

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
        storage: new LocalStorageWrapper(window.localStorage),
        debug,
        trigger: 'write',
        key: 'reactory_cache',
        maxSize: false
    });

    await reactory_persistor.restore();

    return {
        cache,
        persistor: reactory_persistor
    }

};


import { InMemoryCache, InMemoryCacheConfig, makeVar } from '@apollo/client';
import { ReactoryLoggedInUser } from './local';


export const isLoggedInVar = makeVar<boolean>(ReactoryLoggedInUser().id !== null)
export const apiStatusVar = makeVar<any>(null);

const config: InMemoryCacheConfig = {
    typePolicies: {
        Query: {
            fields: {
                isLoggedIn() {
                    return isLoggedInVar()
                }
            }
        }
    },
}

export const cache: InMemoryCache = new InMemoryCache(config);



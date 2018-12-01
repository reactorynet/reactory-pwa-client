import rest from 'rest'
import { isEmpty } from 'lodash'
import mime from 'rest/interceptor/mime'
import errorCode from 'rest/interceptor/errorCode'
import { Map, List } from 'immutable'
import params from 'rest/interceptor/params'



export const DEV_CREDENTIALS = {
  theway:  { username: 'justin.braatvedt@gmail.com', password: 'happytimes', templateId: 0 },
  masonwabe: { username: 'werner.weber@gmail.com', password: 'Password123!', templateId: 39925 }
};

export const DEV_SITE_KEY = process.env.REACT_APP_DEV_SITE || 'theway'
export const IS_LOCAL =  window.location.hostname === 'localhost'

export const DEV_SITE_DEFAULT_URL = IS_LOCAL ? `https://${DEV_SITE_KEY}.devsite.ninja` : window.location.origin;



/** getSiteDomain :: HostName -> HostName
* Determines the host name that should be used for the site currently
* being rendered in the browser, supporting a 'localhost'
* override. */
export const getSiteDomain = localHostDefault =>
  localHostDefault && window.location.hostname === 'localhost'
      ? localHostDefault
      : window.location.host


/**
* Determines the full domain of the website including protocol domain and port
* Except in the case of localhost where if a default is provided this will be used.
* TODO: add shim for ie10
*/
export const getSiteURL = localHostDefault =>
  localHostDefault && window.location.hostname === 'localhost'
      ? localHostDefault
      : window.location.origin

/**
* Determines the base path of the 'lib' directory from
* which old-school scripts that can't be packaged with
* webpack is included (e.g. CKEditor 4)
*/
export const getManual3rdPartyLibBasePath = () =>
  window.location.hostname === 'localhost'
      ? '/lib'
      : '/content/lib'


/** Uses the browser location object to determine the 'page name'
* from the current URL - taking into account that the 'default'
* page may be "nothing" ('').
*/
export const getCurrentPagePathName = () =>
  // Ignore leading slash
  window.location.pathname.replace( /^\//, '' )


/**
 * converts a string, should it exceed the maxLength into an array of multiple
 * strings, each not exceeding maxLength parameter.
 * @param input - a comma separated string
 * @param maxLength - max length of each line in the array returned
 * @returns {Array} - with lines not exceeding maxLength
 */
export const splitLength = (input, maxLength = 200) => {
  let curr = maxLength;
  let prev = 0;

  const output = [];

  while (input[curr]) {
      if (input[curr] == ',' || input[curr--] == ',') { // eslint-disable-line
          output.push(input.substring(prev,curr));
          prev = ++curr; // eslint-disable-line
          curr += maxLength;
      }
  }

  const lastElement = input.substr(prev);
  if (lastElement.length > 0)
      output.push(lastElement);

  return output
}

const restClient = rest.wrap(mime).wrap(errorCode).wrap(params)


/** Unwraps the REST response, returning the raw entity (usually
 * a JavaScript object for a JSON response) */
const getEntity = (response = {}) => response.entity

/**
 * The URL of the store is used to get the website extensions which provide 
 * information about where to call the public apis for the services that will be required.
 * 
 * @param {*} url 
 */
export const getWebsiteExtensions = (url) => {
    if (!url)
        return new Promise(resolve => resolve([]))

    return restClient({
        path: `${url}/api/WebsiteExtension`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    }).then(
        getEntity
    )
}


/**
 * get order status by order id.
 * @param baseUrl
 * @param orderId
 */
export const getOrderStatus = (baseUrl, orderId) =>
    restClient({
        path: baseUrl + `/api/Order/Status/${orderId}`,
        method : 'GET',
        nocache : true,
        headers: {
            'Accept': 'application/json',
            'Cache-Control':  'no-cache'
        },
    }).then(
        getEntity
    )

/**
 * Gets all the products available to this particular storefront.
 */
export const getAllProducts = (baseUrl) =>
    restClient({
        path: baseUrl + '/api/Shop/Products',
        method : 'GET',
        headers: {
            'Accept': 'application/json'
        },
    }).then(
        getEntity
    )

// /**
//  * Gets the product specified by the id.
//  */
// export const getProductById = (baseUrl, productId) =>
//     restClient({
//         path: baseUrl + '/api/Shop/Products/' + productId,
//         method : 'GET',
//         headers: {
//             'Accept': 'application/json'
//         },
//     }).then(
//         getEntity
//     )

/**
 * Gets products by ids
 * @param baseUrl
 * @param productIds - a list of the product ids.
 */
export const getProductsByIds = (baseUrl, productIds = List()) => {
    if (!productIds || productIds.isEmpty())
        return new Promise(resolve => resolve([]))

    const idPaths = splitLength(productIds.join(','))

    return Promise.all(
        idPaths.map(idPath => {
            return restClient({
                path: baseUrl + '/api/Shop/Products/' + idPath,
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
            })
        })
    ).then(responses =>
        Reflect.apply([].concat, [], responses.map(getEntity)))
}

/**
 * A service to get all available countries
 */
export const getAllCountries = (baseUrl) =>
    restClient({
        path: baseUrl + '/api/Countries/',
        method : 'GET',
        headers: {
            'Accept': 'application/json'
        },
    }).then(
        getEntity
    )

/**
 * A service to get all shipping providers by the specified ids
 * @param baseUrl
 * @param shippingProviderIds -  a list of shipping provider ids.
 */
export const getShippingProvidersByIds = (baseUrl, shippingProviderIds = List()) =>
{
    if (shippingProviderIds.isEmpty())
        return new Promise(resolve => resolve([]))

    const idPaths = splitLength(shippingProviderIds.join(','))

    return Promise.all(
        idPaths.map(idPath => {
            return restClient({
                path: baseUrl + '/api/Ship/GetShippingProviders/' + idPath,
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
            })
        })
    ).then(responses =>
        Reflect.apply([].concat, [], responses.map(getEntity)))
}

/**
 * A service to get obtain shipping quotes for an order
 */
export const obtainShippingQuotes = (baseUrl, order = Map()) =>
    restClient({
        path: baseUrl + '/api/Ship/GetShippingQuotes',
        method : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        entity: order.toJS()
    }).then(
        getEntity
    )

/**
 * A service to get available payment methods
 */
export const getAvailablePaymentMethods = (baseUrl, iso2CountryCode) =>
    restClient({
        path: baseUrl + '/api/Payment/GetAvailablePaymentMethods/' + iso2CountryCode,
        method : 'GET',
        headers: {
            'Accept': 'application/json'
        }
    }).then(
        getEntity
    )

/**
 * A service to place an order
 */
export const stageNewOrder = (baseUrl, order) =>
    restClient({
        path: baseUrl + '/api/Order/Staged',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        entity: order.toJS()
    }).then(
        getEntity
    )


export const retrieveStagedOrderById = (baseUrl, orderId, emailAddress) => {
    const params = emailAddress ?
        { 'EmailAddress': emailAddress } :
        {}

    return restClient({
        path: baseUrl + '/api/Order/Staged/' + orderId,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        params: params
    }).then(
        getEntity
    )
}

export const updateStagedOrder = (baseUrl, order) =>
    restClient({
        path: baseUrl + '/api/Order/Staged/' + order.get('Id'),
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        entity: order.toJS()
    }).then(
        getEntity
    )

/**
 * removes a staged order
 * @param baseUrl
 * @param orderId
 */
export const removeStagedOrder = (baseUrl, orderId) => {
    return restClient({
        path: `${baseUrl}/api/Order/Staged/${orderId}`,
        method : 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
}


/**
 * Retrieve a previously placed order.
 * @param baseUrl
 * @param orderId
 */
export const retrievePlacedOrder = (baseUrl, orderId, emailAddress) => {

    const params = emailAddress ?
        { 'EmailAddress': emailAddress } :
        {}

    return restClient({
        path: `${baseUrl}/api/Order/Placed/${orderId}`,
        method : 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        params: params
    }).then(
        getEntity
    )
}
// import order from '../samples/order/getPlacedOrderResponse.json'
// export const retrievePlacedOrder = (baseUrl, orderId)=> {
//     return new Promise((resolve) => setTimeout(resolve, 1000))
//         .then(() => {
//             return order
//         })
// }

/**
 * A service to place an order
 */
export const placeOrder = (baseUrl, order) =>
    restClient({
        path: baseUrl + '/api/Order/PlaceOrder',
        method : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        entity: order.toJS()
    }).then(
        getEntity
    )

/**
 * A service to calculate gst on an order
 */
export const calculateGST = (baseUrl, order) =>
    restClient({
        path: baseUrl + '/api/Order/CalculateGST ',
        method : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        entity: order.toJS()
    }).then(
        getEntity
    )

/**
 * A service to update an placed order. This is called on payment retry to update payment method.
 */
export const updatePlacedOrder = (baseUrl, order) =>
    restClient({
        path: baseUrl + '/api/Order/PlaceOrder',
        method : 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        entity: order.toJS()
    }).then(
        getEntity
    )

export const login = (baseUrl, username, password, clientId) =>
    restClient({
        path: baseUrl + '/token',
        method : 'POST',
        headers: {
            'Accept': 'application/json'
        },
        entity: `username=${username}&password=${password}&grant_type=password&client_id=${clientId}`
    }).then(
        getEntity
    )

export const redirect = (hostName, token) =>
    restClient({
        path: `https://${hostName}/redirect`,
        method : 'GET',
        headers: {
            'Accept': 'application/json'
        },
        params: {
            token: encodeURIComponent(token),
            domain: `${encodeURIComponent(hostName)}`
        }
    }).then(
        getEntity
    )


/** For a given host name, returns a promise that resolves to the
 * HTML content of the menu which goes *inside* the #b-site-menu
 * element, which is usually already a <ul>. The result is a chunk
 * of HTML (usually one or more <li>).
 * Note: This is a very ugly way of doing this - rather build menu
 * from clean JSON data structure.
 */
export const getMenuContentHtml = hostName =>
    restClient({
        path: `https://${hostName}/include/_menu`,
        method : 'GET',
        headers: {
            'Accept': 'text/html'
        }
    }).then(
        getEntity
    )

/**
 * Retrieve any terms and conditions that have been set for the store.
 * @param baseUrl
 */
export const getTermsAndConditions = (baseUrl) => {
    return restClient({
        path: baseUrl + '/api/Shop/TermsAndConditions',
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
    }).then(
        getEntity
    )
}

/**
 * Retrieve the logo url for the store.
 * @param baseUrl
 */
export const getShopLogoUrl = (baseUrl) => {
    return restClient({
        path: baseUrl + '/api/Shop/LogoUrl',
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
    }).then(
        getEntity
    )
}


/**
 * Retrieve the general sales tax info for the shop.
 * 
 * @param baseUrl
 */
export const getShopGSTInfo = (baseUrl) => {
    return restClient({
        path: baseUrl + '/api/Shop/GST',
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
    }).then(
        getEntity
    )
}
//Mock version
// export const getShopGSTInfo = (baseUrl) => {

//     return Promise.resolve( 
//         {
//             "Enabled": true,
//             "Description": "VAT",
//             "Number": "1234-23213-32445",
//             "Rate": "14",
//             "IsCrossBorder": true
//         })
// }

/**
 * Retrieve the store merchant details.
 * @param baseUrl
 */
export const getMerchantDetails = (baseUrl) => {
    return restClient({
        path: baseUrl + '/api/Shop/Details',
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
    }).then(
        getEntity
    )
}

/**
 * Inidicates if a store is enabled or not
 * @param baseUrl
 * @returns boolean
 */
export const isStoreEnabled = (baseUrl) => {
    return restClient({
        path: baseUrl + '/api/Shop',
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
    }).then(
        getEntity
    )
}


export const listPages = (baseUrl, auth_token) => {
    
    return restClient({
        path: baseUrl + '/api/WebsitePage/menu',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'authorization': `bearer ${auth_token}`
        },
    }).then(
        getEntity
    )
}

export const getPage = (baseUrl, auth_token, pageId) => {
    ///api/WebsitePage/page/
    return restClient({
        path: baseUrl + '/api/WebsitePage/page/' + pageId,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'authorization': `bearer ${auth_token}`
        },
    }).then(
        getEntity
    )
}
/**
 * 
 */
export const fetchGridEditorConfig = (siteId = 42180, auth_token = null) => {    
    return new Promise((resolve, reject) => {
        restClient({
            path: `${window.location.hostname === 'localhost' ? `https://${DEV_SITE_KEY}.devsite.ninja` : 'https://' + window.location.host}/api/WebsitePage/PageTemplateConfig/${siteId}`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `bearer ${auth_token}`
            },
        }).then((config) => {
            resolve(config)
        }).catch((error) => {
            reject(error)
        });
    });    
};

/**
 * 
 */
export const saveGridEditorConfig = (config) => {
    console.log('Saving config', config);
    return new Promise((resolve, reject) => {
        restClient({
            path: 'https://admin.devsite.ninja/api/PageTemplateConfig/Config',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            entity: config
        }).then((config) => {
            resolve(config)
        }).catch((error) => {
            reject(error)
        });        
    });
};

export const deleteGridEditorConfig = (uuid) => {
    console.log('Delete Grid Editor Config', uuid);
    return new Promise((resolve, reject) => {
        restClient({
            path: `https://admin.devsite.ninja/api/PageTemplateConfig/Config/${uuid}`,
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }            
        }).then((config) => {
            resolve(true)
        }).catch((error) => {
            reject(error)
        });
    });
};

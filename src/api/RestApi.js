const api_root = process.env.REACT_APP_API_ENDPOINT;
const api_client_id = 'towerstone';
const api_client_password = 'sonicwasadog';

const api_headers = {
  'Accept': 'application/json',
  'X-Client-Key': api_client_id,
  'X-Client-Pwd': api_client_password,
  'Content-Type': 'application/json'
}

export const login = (email, password) => {
  const token = btoa(`${email}:${password}`)
  return fetch(`${api_root}login`, {
      method: 'POST',
      mode: 'cors',       
      headers: {
        'authorization': `Basic ${token}`,        
        'accept': 'application/json',
        'x-client-key': api_client_id,
        'x-client-pwd': api_client_password,
        'content-type': 'application/json'
      }
    })
    .then((response) => response.json())
    .catch((loginError) => {
      console.warn('login error', loginError)
      throw loginError
    })
}

export const companyWithId = ( id ) => {
  return fetch(`${api_root}search?types=org,id=${id}`,{
    method: 'get',
    headers: {
      ...api_headers
    },  
  }).then((response) => response.json())
}

export const register = ( registerPayload ) => {
  return fetch(`${api_root}register`,{
      method: 'post', 
      body: JSON.stringify(registerPayload),
      headers: api_headers
    }).then((response) => response.json())
}

export const forgot = ( forgotPayload ) => {
  return fetch(`${api_root}forgot`,{
    method: 'post', 
    body: JSON.stringify(forgotPayload),
    headers: api_headers
  }).then((response) => response.json())
}

export const reset = ( resetPayload ) => {
  return fetch(`${api_root}reset`,{
    method: 'post', 
    body: JSON.stringify(resetPayload),
    headers: api_headers
  }).then((response) => response.json())
}

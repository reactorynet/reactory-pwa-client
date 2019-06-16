
const api_root = process.env.REACT_APP_API_ENDPOINT;
const api_client_id = process.env.REACT_APP_CLIENT_KEY;
const api_client_password = process.env.REACT_APP_CLIENT_PASSWORD;

const api_headers = {
  'Accept': 'application/json',
  'X-Client-Key': api_client_id,
  'X-Client-Pwd': api_client_password,
  'Content-Type': 'application/json'
}

export const login = (email, password) => {
  const that = this;
  return new Promise((resolve, reject) => {
    const token = btoa(`${email}:${password}`)
    fetch(`${api_root}/login`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'authorization': `Basic ${token}`,
        'accept': 'application/json',
        'x-client-key': api_client_id,
        'x-client-pwd': api_client_password,
        'content-type': 'application/json'
      }
    }).then((response) => response.json())
    .then(body => resolve(body))
    .catch(err => {      
      reject(err)
    })
  })
};


export const companyWithId = (id) => {
  return fetch(`${api_root}/search?types=org,id=${id}`, {
    method: 'get',
    headers: {
      ...api_headers
    },
  }).then((response) => response.json())
}

export const register = (registerPayload) => {
  return fetch(`${api_root}/register`, {
    method: 'post',
    body: JSON.stringify(registerPayload),
    headers: api_headers
  }).then((response) => response.json())
}

export const forgot = (forgotPayload) => {
  return fetch(`${api_root}/forgot`, {
    method: 'post',
    body: JSON.stringify(forgotPayload),
    headers: api_headers
  }).then((response) => response.json())
}

export const reset = (resetPayload) => {
  return fetch(`${api_root}/reset`, {
    method: 'post',
    body: JSON.stringify(resetPayload),
    headers: api_headers
  }).then((response) => response.json())
}

export const forms = () => {
  return fetch(`${api_root}/reactory/schema`, {
    method: 'get',
    headers: api_headers
  }).then((response) => response.json())
}

export const getContent = (route, header = api_headers) => {
  return fetch(`${route}`, {
    method: 'get',
    headers: { ...api_headers,  'accept': 'application/text', 'content-type': 'application/text' }
  }).then((response) => response.text())
};

export const getPDF = ( folder, report, params = { __t: new Date().valueOf()  }, filename = 'pdfout.pdf' ) => {
  const { api } = window.reactory;
  api.utils.queryString.stringify(params)
  return fetch(`${api_root}/pdf/${folder}/${report}?`, {
    method: 'get',
    header: { ...api}
  }).then((pdf) => {
    const blob=new Blob([pdf]);
    const link=document.createElement('a');
    link.href=window.URL.createObjectURL(blob);
    link.download=filename;
    link.click();
  });
};

export const getRemoteJson = (route, headers = api_headers) => {
  return fetch(route, {
    method: 'get',
    headers: { ...api_headers, ...headers }
  }).then((response) => response.json())
}

export const postRemoteJson = (route, payload, headers = api_headers) => {
  return fetch(route, {
    method: 'post',
    body: JSON.stringify(payload),
    headers: { ...api_headers, ...headers }
  }).then((response) => response.json())
};

export const patchRemoteJson = (route, payload, headers = api_headers) => {
  return fetch(route, {
    method: 'patch',
    body: JSON.stringify(payload),
    headers: { ...api_headers, ...headers }
  }).then((response) => response.json())
};

export const deleteRemoteJson = (route, payload, headers = api_headers) => {
  return fetch(route, {
    method: 'delete',
    body: JSON.stringify(payload),
    headers: { ...api_headers, ...headers }
  }).then((response) => response.json())
}; 


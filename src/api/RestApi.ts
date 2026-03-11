import { safeCDNUrl, safeUrl } from "@reactory/client-core/utils/safeUrl";

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
  
  const url = safeUrl([api_root, 'login'] );
  return new Promise((resolve, reject) => {
    const token = btoa(`${email}:${password}`)
    fetch(url, {
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
  const url = safeUrl([api_root, `search?types=org,id=${id}`]);
  return fetch(url, {
    method: 'get',
    headers: {
      ...api_headers
    },
  }).then((response) => response.json())
}

export const register = (registerPayload) => {
  const url = safeUrl([api_root, 'useraccount/register']);
  return fetch(url, {
    method: 'post',
    body: JSON.stringify(registerPayload),
    headers: api_headers
  }).then((response) => response.json())
}

export const forgot = (forgotPayload) => {
  const url = safeUrl([api_root, 'useraccount/forgot']);
  return fetch(url, {
    method: 'post',
    body: JSON.stringify(forgotPayload),
    headers: api_headers
  }).then((response) => response.json())
}

/**
 * Checks whether a username is already taken.
 * Returns 200 { exists: false } or 409 { exists: true, suggestion }.
 */
export const checkUsername = (username: string) => {
  const url = safeUrl([api_root, `useraccount/checkUsername/${encodeURIComponent(username)}`]);
  return fetch(url, {
    method: 'get',
    headers: api_headers,
  }).then((response) => response.json());
}

export const reset = (resetPayload) => {
  const url = safeUrl([api_root, 'useraccount/reset']);
  return fetch(url, {
    method: 'post',
    body: JSON.stringify(resetPayload),
    headers: api_headers
  }).then((response) => response.json())
}

export const forms = () => {
  const url = safeUrl([api_root, 'reactory/schema']);
  return fetch(url, {
    method: 'get',
    headers: api_headers
  }).then((response) => response.json())
}

export const getContent = (route, header = api_headers) => {
  const url = safeUrl([api_root, route]);
  return fetch(url, {
    method: 'get',
    headers: { ...api_headers,  'accept': 'application/text', 'content-type': 'application/text' }
  }).then((response) => response.text())
};

export const getPDF = ( folder, report, params = { __t: new Date().valueOf()  }, filename = 'pdfout.pdf' ) => {
  const { api } = window.reactory;
  api.utils.queryString.stringify(params)
  const url = safeUrl([api_root, `pdf/${folder}/${report}?`]);
  return fetch(url, {
    method: 'get',
    headers: { ...api}
  }).then((pdf: Response) => {
    return pdf.blob();
  }).then((pdfBlob: Blob) => {
    const blob=new Blob([pdfBlob]);
    const link=document.createElement('a');
    link.href=window.URL.createObjectURL(blob);
    link.download=filename;
    link.click();;    
  })
  
};

export const getExcel = ( formId: string, params = { __t: new Date().valueOf()  }, filename = 'form.xlsx' ) => {
  const { api } = window.reactory;
  api.utils.queryString.stringify(params)
  const url = safeUrl([api_root, `excel/${formId}?`]);
  return fetch(url, {
    method: 'get',
    headers: { ...api}
  }).then((excel) => {

    return excel.blob();
  }).then((excelBlob: Blob) => {
    const blob=new Blob([excelBlob]);
    const link=document.createElement('a');
    link.href=window.URL.createObjectURL(blob);
    link.download=filename;
    link.click();
  })    
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


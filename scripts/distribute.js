'use strict';
/**
 * 
PUBLIC_URL=https://app.reactory.net/
REACT_APP_API_ENDPOINT=https://api.reactory.net
REACT_APP_CDN=https://api.reactory.net/cdn
REACT_APP_TITLE='Reactory Launchpad'
REACT_APP_THEME=reactory
REACT_APP_CLIENT_KEY=reactory
REACT_APP_SHORTNAME=Reactory
REACT_APP_CLIENT_PASSWORD=sonicwasadog
REACT_APP_THEME_PRIMARY=#1a2049
REACT_APP_THEME_BG=#464775
CI=false

process.env.NODE_ENV = 'production';
* 
 */

process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';


// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');

const path = require('path');
const chalk = require('react-dev-utils/chalk');
const fs = require('fs-extra');
const moment = require('moment');
const zipFolder = require('zip-folder');
const FormData = require('form-data');
const axios = require('axios');
const btoa = require('btoa');
const paths = require('../config/paths');
const https = require('https');
const ca = require('ssl-root-cas/latest').create();
https.globalAgent.options.ca = ca;

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

//zip the files and upload to CDN via filemanager
const appPackage = require(paths.appPackageJson);
const publicUrl = paths.publicUrl;
const { 
    REACT_APP_CLIENT_KEY,
    REACT_APP_CLIENT_PASSWORD,
    REACT_APP_CDN,
    REACT_APP_API_ENDPOINT,
    REACT_APP_WEBROOT,
    PUBLIC_URL,    
} = process.env;

console.log(`Called distribute, zipping files in ${paths.appBuild} and sending to ${REACT_APP_CDN}/builds/${appPackage.version}/${REACT_APP_CLIENT_KEY}/ for distribution`);



const doUpload = function(){
    //upload distribution to target server
    
    const token = btoa('werner.weber+reactory-sysadmin@gmail.com:sonicwasadog')
    const headers = {
        'x-client-key': REACT_APP_CLIENT_KEY,
        'x-client-pwd': REACT_APP_CLIENT_PASSWORD,
        'content-type': 'application/json'
    }

    let kwargs = {
        method: 'POST', 
        headers: {
            ...headers,
            'authorization': `Basic ${token}`,
            'accept': 'application/json',        
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    };

    axios(`${REACT_APP_API_ENDPOINT}/login`, kwargs).then((loginResponse) => {
        if(loginResponse.status === 200) {
            console.log('Login OK');
            const credentials = loginResponse.data.user;

            const stream = fs.createReadStream(`${paths.appDistro}/reactory-client-${appPackage.version}.zip`);
            kwargs.headers.authorization = `Bearer ${credentials.token}`;
            kwargs.body = stream;

            const form = new FormData();
            form.append('file', stream);
            // In Node.js environment you need to set boundary in the header field 'Content-Type' by calling method `getHeaders`
            const formHeaders = form.getHeaders();        
            const uploadUri = `${REACT_APP_API_ENDPOINT}/deliveries/upload/file`;
            axios.post(uploadUri, form, { params: { 
                    __reactory__upload: true, 
                    folder: `builds/${appPackage.version}/${REACT_APP_CLIENT_KEY}/` 
                }, 
                headers: { ...kwargs.headers, ...formHeaders } 
            }).then(response => {
                if(response.status === 200) {
                    console.log(`File has been successfully uploaded ${response.data.link}`);
                    //stream.close();
                    if(response.data.link) {
                        axios({
                            url: `${REACT_APP_API_ENDPOINT}/resources/`,
                            method: 'POST',
                            headers: kwargs.headers,                                                 
                            data: JSON.stringify({  
                                resourceType: 'application',
                                version: appPackage.version,
                                build: `${appPackage.version}`,
                                name: `reactory-client-${appPackage.version}.zip`,
                                link: response.data.link,
                                when: new Date(),                            
                                meta: {
                                    installer: 'nginx',
                                    installerprops: {
                                        path: `${REACT_APP_WEBROOT}/${REACT_APP_CLIENT_KEY}`,
                                        uri: PUBLIC_URL
                                    },
                                    release: true,
                                    clientKey: REACT_APP_CLIENT_KEY,
                                    tag: 'not-set',
                                    notes: 'not-set',
                                    tested: {
                                        qa: false,
                                        prod: false,
                                        local: false
                                    },
                                }
                            }),
                        }).then((catalogResult) => {
                            console.log('Uploaded client to CDN and cataloged new build - installing');
                            if(catalogResult.data.accepted === true) {
                                axios({
                                    url: `${REACT_APP_API_ENDPOINT}/resources/install/${catalogResult.data.id}`,
                                    method: 'GET',
                                    headers: kwargs.headers,
                                }).then((installResult) => {
                                    console.log(`resource has been installed`, installResult.data);
                                    process.exit(0);
                                });
                            } else {
                                console.error('Catalog did not responde correctly');
                                process.exit(1);
                            }                            
                        }).catch((catalogError) => {
                            console.error(`Could not publish the catalog info`, catalogError);
                            process.exit(1);
                        });
                    }
                } else {
                    console.warn(`File was upload but did not receive valid JSON Response`);
                    process.exit(1);
                }
            }).catch(error => {
                console.error(`Could not upload the file to the endpoint.`, error);
            });
        } else {
            process.exit(loginResponse.status);
        }
    });
}


if(fs.existsSync(paths.appDistro) === false) fs.mkdirSync(paths.appDistro);
zipFolder(paths.appBuild, `${paths.appDistro}/reactory-client-${appPackage.version}.zip`, function(err) {
    if(err) {
        console.error('Could not zip the file, please check your filename and context', err);
        process.exit(1);
    } else {
        console.log(`File has been zipped, uploading`);
        doUpload();
    }
});

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { IconButton, Toolbar, Icon, Typography } from '@material-ui/core';
import Iframe from 'react-iframe';
import { compose } from 'recompose';
import { withTheme } from '@material-ui/styles';
import { withApi, ReactoryApi } from '../../api/ApiProvider';

const defaultFrameProps = {
  url: 'http://localhost:3001/',
  className: null,
  style: {
    top: '65px',
    bottom: '0px',
    width: '100%',
    border: 'none'
  }    
};

class FramedWindow extends Component {
      
  static propTypes = {
    containerProps: PropTypes.object,
    frameProps: PropTypes.object,
    method: PropTypes.oneOf(['get', 'post']),
    data: PropTypes.object,
    api: PropTypes.instanceOf(ReactoryApi).isRequired,
  };

  static defaultProps = {
    containerProps: {
      style: {
        display: 'block',
        // position: 'fixed',
        top: '65px',
        bottom: '0px',
        width: '100%',
      },
      with: '100%',
    },
    frameProps: defaultFrameProps,
    method: 'get',
    data: {},
    
  };

  getForm(){

  }

  render(){

    const { containerProps, frameProps, api, data, method } = this.props;
    const _cprops = {...FramedWindow.defaultProps.containerProps, ...containerProps}
    const _fprops = {...FramedWindow.defaultProps.frameProps, ...frameProps }
    
    const frameid = this.props.id || `reactory_iframe_${api.utils.hashCode(_fprops.url || 'about:blank')}`

    if(method === 'post') {    
      const frameprops = { ..._fprops };
      delete frameprops.url;
      
      //setTimeout(()=>{
      //  let form = document.forms[frameid];
      //  form.submit();
      //}, 1500); 
      return (
        <div { ..._cprops } >
            <iframe id={frameid} { ...frameprops } />
            <form action={_fprops.url} method="post" target={frameid}>
              <input type="hidden" name="data" id="data" value={JSON.stringify(data)}/>
              <input type="submit" value="submit" />
            </form>
        </div>
      )
    } else {
      delete _fprops.styles;
      _fprops.src = _fprops.url;
      delete _fprops.url;
      return (
        <div { ..._cprops } >
            <iframe id={frameid} { ..._fprops } />
        </div>
        )
    }    
  }
}

const FramedWindowComponent = compose(withTheme, withApi)(FramedWindow);

class ReportViewer extends Component {

  static propTypes = {    
    //the namespace for the report
    folder: PropTypes.string.isRequired,
    //the name for the report
    report: PropTypes.string.isRequired,
    //filename for the pdf report
    filename: PropTypes.string.isRequired,
    //api import
    api: PropTypes.instanceOf(ReactoryApi),
    //The data we want to post to the pdf generator
    data: PropTypes.object,
    //The way the report is to be returned
    method: PropTypes.oneOf(['post', 'get']),
    //The text we want to display while loading the data
    waitingText: PropTypes.string,
    //The resolver for the data, when using 
    //graphql we will execute the query get the results
    //then pass it to the report, we won't support rest now
    //but it is added for future option    
    resolver: PropTypes.oneOf(['graphql', 'rest', 'json', 'query-params']),
    //we can provide the report via inline view, send as email attachment, or as url for get
    //parameter
    delivery: PropTypes.oneOf(['inline', 'email', 'url', 'download']),
    //any customization we may need to do
    deliveryOptions: PropTypes.object,
  }

  static defaultProps = {
    folder: 'core',
    report: 'api-status',
    method: 'get',
    resolver: 'query-params',
    delivery: 'inline',
    filename: 'api-status.pdf',
    waitingText: 'Loading, please wait',
    deliveryOptions: {

    },
    data: { 

    }      
  }

  static dependencies = [
    'core.Loading'
  ]

  constructor(props, context){
    super(props, context)
    this.state = {
      ready: props.method === 'get' && props.delivery === 'inline'
    };

    this.onSubmitReport = this.onSubmitReport.bind(this);
    this.getDownloadViewResult = this.getDownloadViewResult.bind(this);
    this.getEmailViewResult = this.getEmailViewResult.bind(this);
    this.getUrlViewResult = this.getUrlViewResult.bind(this);
    this.getInlineViewResult = this.getInlineViewResult.bind(this);

    this.componentDefs = props.api.getComponents(ReportViewer.dependencies);
  }
  
  onSubmitReport(){
    console.log('report submit / refresh')
  }

  getInlineViewResult(){
    const { folder, report, api, method, data } = this.props;
    const { Loading } = this.componentDefs;

    const reportWindowProps = {
      src: ''
    };
    
    const queryparams = {
      ...data,
      'x-client-key': api.CLIENT_KEY,
      'x-client-pwd': api.CLIENT_PWD,
      'auth_token': api.getAuthToken(),      
    };

    reportWindowProps.src = `${api.API_ROOT}/pdf/${folder}/${report}?${api.utils.queryString.stringify(queryparams)}`;
    return (<FramedWindowComponent id={`reactory-report-window`} frameProps={{ ...reportWindowProps }} method={method} />)
  }

  getDownloadViewResult(){
    return <Typography>Your download will being shortly</Typography>
  }

  getUrlViewResult(){
    return <Typography>Waiting for url result</Typography>
  }

  getEmailViewResult(){
    return (
      <Typography>The report has been emailed</Typography>
    )
  }

  generateReportOutput(){

    switch (method) {
      case 'get': {      
        if(src && typeof src  === 'string') {
          reportWindowProps.src = src;  
          if(reportWindowProps.src.indexOf("?") > -1) {
            const { url, query }  = api.utils.queryString.parseUrl(reportWindowProps.src);
            api.restApi.getPDF(
              folder, 
              report, 
              data,
              filename              
              );
          }
        }        
      }
    }
  }
  
  render(){

    const { 
      folder, report, method, 
      resolver, delivery, 
      deliveryOptions,
      api, data, filename
    } = this.props;
    

    let showFrame = true;
    let content = null;
    
    switch(delivery) {
      case 'email': {
        content = this.getEmailViewResult();
        break;
      }        
      case 'url': {
        content = this.getUrlViewResult();
        break;
      }
      case 'download': {
        content = this.getDownloadViewResult();
        break;
      }
      case 'inline':
      default: {
        content = this.getInlineViewResult();
      }
    }
    
    return (
      <div>
        <Toolbar>
          <IconButton onClick={this.onSubmitReport}>
            <Icon>print</Icon>
          </IconButton>
        </Toolbar>
        { content }
      </div>
    );
  }
}

export const ReportViewerComponent = compose(withTheme, withApi)(ReportViewer);


export default FramedWindowComponent;
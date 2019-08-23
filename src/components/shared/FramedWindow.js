import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { IconButton, Toolbar, Icon, Typography } from '@material-ui/core';
import { isArray } from 'lodash';
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
    height: '100%',
    border: 'none',
    marginLeft: '-8px',
  }    
};

class FramedWindow extends Component {
  
  static propTypes = {
    containerProps: PropTypes.object,
    frameProps: PropTypes.object,
    method: PropTypes.oneOf(['get', 'post']),
    data: PropTypes.object,
    api: PropTypes.instanceOf(ReactoryApi).isRequired,
    sendApi: PropTypes.bool,
    messageHandlers: PropTypes.array    
  };

  static defaultProps = {
    containerProps: {
      style: {
        display: 'block',
        position: 'fixed',
        top: '65px',
        bottom: '0px',
        width: '100%',        
      },
      width: '100%',
    },
    frameProps: defaultFrameProps,
    method: 'get',
    data: {},
    sendApi: true,
    messageHandlers: []
  };
  
  constructor(props, context){
    super(props, context);
    
    //the handlers must return a function that returns a message call        
    this.state = {
      apiAcknowledge: false,
      timeout: 500,
      tried: 0,
      handlers: [],
      activeHandlers: { }
    };
    
    this.onReceiveMessage = this.onReceiveMessage.bind(this);
    this.doHandshake = this.doHandshake.bind(this);
    this.onListnerLoaded = this.onListnerLoaded.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
  }
  
  onListnerLoaded(data){    
    const { api } = this.props;
    const { activeHandlers, handlers } = this.state;
    const self = this;
    api.log('Listner Loaded Notification Via Postal', data)    
    if(activeHandlers.hasOwnProperty(`${data.nameSpace}.${data.name}@${data.version}`) === false) {
      let _handlerRefs = { ...activeHandlers };
      if(typeof data.component === 'function') {
        const HandlerInstance = data.component({ ...self.props, sendMessage: self.sendMessage }, self.context);
        if(typeof HandlerInstance === 'function') {
          _handlerRefs[`${data.nameSpace}.${data.name}@${data.version}`] = HandlerInstance          
          self.setState({ activeHandlers: _handlerRefs });
        }
      }
    }
  }
  
  componentDidMount(){
    if(this.props.sendApi === true) {
      const { api } = this.props;
      const subscription = this.props.api.amq.onMessageHandlerLoaded('postwindow.message.handler', this.onListnerLoaded); 
      const _handlers = [];
      const _handlerRefs = {};

      this.props.messageHandlers.forEach( handlerFqn => {
      
        const HandlerComponent = api.getComponent(`${handlerFqn.nameSpace}.${handlerFqn.name}@${handlerFqn.version}`);
        if(typeof HandlerComponent === 'function'){
              const HandlerInstance = HandlerComponent({ ...this.props, sendMessage: this.sendMessage }, this.context);
              if(typeof HandlerInstance === 'function') {                
                _handlerRefs[handlerFqn] = HandlerInstance                
              }
        }
      }); 

      this.doHandshake(); //we try a handshake with target window... 

      if(isArray(this.props.messageHandlers) === true) {
        this.props.api.utils.injectResources(this.props.messageHandlers);      
      }

      this.props.api.log(`Have subscription for listeners being loaded`, subscription);      
      this.setState({ listnerLoadedSubscription: subscription, handlers: _handlers, activeHandlers: _handlerRefs }, ()=>{
        window.addEventListener("message", this.onReceiveMessage)
      });
    }
  }

  onReceiveMessage({ data, origin, source }) {        
    const { api } = this.props;
    api.log(`Received new message from ${origin}`, data);
    const { activeHandlers } = this.state;
    const handlerKeys = Object.keys(activeHandlers);
    if(data.message){      
      switch(data.type) {
        case 'reactory.core.handshake:ack': {
          api.log(`'Received ack on handshake`)
          this.setState({ apiAcknowledge: true })
          break;  
        }
        case 'reactory.api-request': {
          this.doHandshake();
          break;
        }
        default: {
          if(isArray(handlerKeys)) {
            handlerKeys.forEach( handlerKey => {            
              if(typeof activeHandlers[handlerKey] === 'function') {          
                try {
                  activeHandlers[handlerKey](data, origin, source, this.props);
                }catch(messageHanlderError) {
                  api.log(`Could not execute message handler`, {}, 'error');
                }
              }
            });
          }
          break;          
        }
      }
    }
  }

  doHandshake(){
    const self = this;    
    if(this.state.apiAcknowledge === false) {
      this.props.api.log('Attempting Handshake');
      if(this.targetWindow && typeof this.targetWindow.contentWindow.postMessage === 'function') {
        this.props.api.log('Attempting Handshake - iframe has content window');
        const user = this.props.api.getUser();
      this.targetWindow.contentWindow.postMessage({ message: 'reactory.delivery', type: 'reactory.core.handshake', props: { message: `Welcome ${user.firstName}, please login below.` } }, "*");
        if(this.state.tried < 3) {
          this.setState({ tried: this.state.tried + 1}, ()=>{
            setTimeout(()=>{        
              self.doHandshake();
            }, this.state.timeout * (this.state.tried + 1))    
          });
        }
      }      
    }
  }

  sendMessage(message, targetOrigin = "*"){
    if(message && targetOrigin) {
      if(this.targetWindow && typeof this.targetWindow.contentWindow.postMessage === 'function') {
        this.props.api.log(`Sending message to window ${message.type}`);
        this.targetWindow.contentWindow.postMessage(message, targetOrigin);      
      }
    }    
  }
  
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
            <iframe id={frameid} { ...frameprops } ref={ frame => this.targetWindow = frame } />
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
            <iframe id={frameid} { ..._fprops } ref={ frame => this.targetWindow = frame } />
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
      'view': 'inline',      
    };
  
    reportWindowProps.url = `${api.API_ROOT}/pdf/${folder}/${report}?${api.utils.queryString.stringify(queryparams)}`;
    return (<FramedWindowComponent id={`reactory-report-window`} frameProps={{ ...reportWindowProps }} method={method} />)
  }

  getDownloadViewResult(){
    const { folder, report, api, method, data } = this.props;
    
    const queryparams = {
      ...data,
      'x-client-key': api.CLIENT_KEY,
      'x-client-pwd': api.CLIENT_PWD,
      'auth_token': api.getAuthToken(),
      'view': 'attachment',      
    };
  
    const downloaduri = `${api.API_ROOT}/pdf/${folder}/${report}?${api.utils.queryString.stringify(queryparams)}`;
    setTimeout(()=>{
      window.open(downloaduri, '_blank')
    }, 1200)
    
    return <Typography>Your download will being shortly. If the download does not automatically start after a few seconds please click <a href={downloaduri} target="_blank">here</a></Typography>
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
      <div style={{display:'content', top: '0', bottom: '0'}}>        
        { content }
      </div>
    );
  }
}

export const ReportViewerComponent = compose(withTheme, withApi)(ReportViewer);


export default FramedWindowComponent;
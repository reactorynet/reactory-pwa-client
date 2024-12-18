import React, { Component, Fragment } from 'react';
import PropTypes, { any } from 'prop-types';
import { AppBar, IconButton, Toolbar, Icon, Typography } from '@mui/material';
import { isArray } from 'lodash';
import { compose } from 'redux';
import { withTheme } from '@mui/styles';
import { withReactory } from '../../api/ApiProvider';
import ReactoryApi from "../../api/ReactoryApi";
import Reactory from '@reactory/reactory-core';
import * as ExcelJS from 'exceljs';
import moment from 'moment';


const defaultFrameProps = {
  url: 'http://localhost:3001/',
  className: null,
  style: {
    top: '45px',
    bottom: '0px',
    width: '100%',
    height: '100%',
    border: 'none',
    marginLeft: '-8px',
  }    
};

export type ReactoryFormDefinition = Reactory.Forms.IReactoryForm;

class FramedWindow extends Component<any, any> {
  
  static propTypes = {
    containerProps: PropTypes.object,
    frameProps: PropTypes.object,
    method: PropTypes.oneOf(['get', 'post']),
    data: PropTypes.object,
    reactory: PropTypes.instanceOf(ReactoryApi).isRequired,
    sendApi: PropTypes.bool,
    messageHandlers: PropTypes.array,
    header: PropTypes.element,
    footer: PropTypes.element,
  };

  static defaultProps = {
    containerProps: {
      style: {
        position: 'fixed',
        top: '48px',
        bottom: '0px',
        width: '101%',
        display: 'flex',
        justifyContent: 'center',
      },
      width: '100%',
    },
    frameProps: defaultFrameProps,
    method: 'get',
    data: {},
    sendApi: true,
    messageHandlers: []
  };
  targetWindow: HTMLIFrameElement;
  componentDefs: any;
  
  constructor(props, context){
    super(props);
    
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
    const { reactory } = this.props;
    const { activeHandlers, handlers } = this.state;
    const self = this;
    reactory.log('Listner Loaded Notification Via Postal', data)    
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
      const { reactory } = this.props;
      const subscription = this.props.reactory.amq.onMessageHandlerLoaded('postwindow.message.handler', this.onListnerLoaded); 
      const _handlers = [];
      const _handlerRefs = {};

      this.props.messageHandlers.forEach( handlerFqn => {
      
        const HandlerComponent = reactory.getComponent(`${handlerFqn.nameSpace}.${handlerFqn.name}@${handlerFqn.version}`);
        if(typeof HandlerComponent === 'function'){
              const HandlerInstance = HandlerComponent({ ...this.props, sendMessage: this.sendMessage }, this.context);
              if(typeof HandlerInstance === 'function') {                
                _handlerRefs[handlerFqn] = HandlerInstance                
              }
        }
      }); 

      this.doHandshake(); //we try a handshake with target window... 

      if(isArray(this.props.messageHandlers) === true) {
        this.props.reactory.utils.injectResources(this.props.messageHandlers);      
      }

      this.props.reactory.log(`Have subscription for listeners being loaded`, subscription);      
      this.setState({ listnerLoadedSubscription: subscription, handlers: _handlers, activeHandlers: _handlerRefs }, ()=>{
        window.addEventListener("message", this.onReceiveMessage)
      });
    }
  }

  onReceiveMessage({ data, origin, source }) {        
    const { reactory } = this.props;
    reactory.log(`Received new message from ${origin}`, data);
    const { activeHandlers } = this.state;
    const handlerKeys = Object.keys(activeHandlers);
    if(data.message){      
      switch(data.type) {
        case 'reactory.core.handshake:ack': {
          reactory.log(`'Received ack on handshake`)
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
                  reactory.log(`Could not execute message handler`, { error: messageHanlderError });
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
      this.props.reactory.log('Attempting Handshake');
      if(this.targetWindow && typeof this.targetWindow.contentWindow.postMessage === 'function') {
        this.props.reactory.log('Attempting Handshake - iframe has content window');
        const user = this.props.reactory.getUser();
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
        this.props.reactory.log(`Sending message to window ${message.type}`);
        this.targetWindow.contentWindow.postMessage(message, targetOrigin);      
      }
    }    
  }
  
  getForm(){

  }

  render(){

    const { containerProps, frameProps, reactory, data, method } = this.props;
    const _cprops = {...FramedWindow.defaultProps.containerProps, ...containerProps}
    const _fprops = {...FramedWindow.defaultProps.frameProps, ...frameProps }    
    const frameid = this.props.id || `reactory_iframe_${reactory.utils.hashCode(_fprops.url || 'about:blank')}`
    
    if(method === 'post') {    
      _fprops.src = _fprops.url;
      const frameprops = { ..._fprops };
      delete frameprops.url;
      
      setTimeout(()=>{
        let form = document.forms[frameid];
        if(form && form.submit) form.submit();
      }, 1500); 
      
      return (
        <div { ..._cprops } >
            {this.props.header}
            <iframe id={frameid} { ...frameprops } ref={ frame => this.targetWindow = frame } />
            <form action={_fprops.url} method="post" target={frameid}>
              <input type="hidden" name="data" id="data" value={JSON.stringify(data)}/>
              <input type="submit" value="submit" />
            </form>
            {this.props.footer}
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

const FramedWindowComponent = compose(withTheme, withReactory)(FramedWindow);

class _GraphiqlWindow extends Component<any, any> {
  
  render(){    
    const { reactory } = this.props;
  
    const { themeOptions } = reactory.getUser();
    let color1 = themeOptions && themeOptions.palette && themeOptions.palette.primary1Color 
      ? themeOptions.palette.primary1Color 
      : 'unset'

    const queryparams = {      
      'x-client-key': reactory.CLIENT_KEY,
      'x-client-pwd': reactory.CLIENT_PWD,
      'auth_token': reactory.getAuthToken(), 
      'color1':  color1,
    };
  
    return (
      <FramedWindowComponent 
        id={`reactory-graphiql-window`} 
        frameProps={{ url: `${reactory.CDN_ROOT}/plugins/graphiql/index.html?${reactory.utils.queryString.stringify(queryparams)}` }} 
        method={'get'} 
        />)
  }
}

const GraphiqlWindowComponent: any = compose(withTheme, withReactory)(_GraphiqlWindow); 
GraphiqlWindowComponent.meta = {
  nameSpace: 'core',
  name: 'ReactoryGraphiQLExplorer',
  version: '1.0.0',
  component: GraphiqlWindowComponent,
  tags: ['graphql', 'development'],
  description: 'Graphql Express Explorer',
  roles: ['DEVELOPER', 'ADMIN']
};

export const GraphiqlWindow = GraphiqlWindowComponent;

export interface ReportViewerProperties extends Reactory.Client.IReactoryWiredComponent {  
  folder: string,
  report: string,
  filename: string,
  engine: string,
  queryString: string,
  data: any,
  method: string,
  watingText: string,
  resolver: string,
  delivery: string,
  deliveryOptions?: any,
  /** A form component that can be used to provide input / filters for the report */
  inputForm?: string,
  formDef?: Reactory.Forms.IReactoryForm,
  exportDefinition?: Reactory.Excel.IExport,
  useClient?: boolean,
  theme: any
};

export interface ReportViewerState {
  ready: boolean,
  inlineLocalFile: string,
  downloaded: boolean
}


class ReportViewer extends Component<ReportViewerProperties, ReportViewerState> {

  static propTypes = {    
    //the namespace for the report
    folder: PropTypes.string.isRequired,
    //the name for the report
    report: PropTypes.string.isRequired,
    //filename for the pdf report
    filename: PropTypes.string.isRequired,
    //api import
    reactory: PropTypes.instanceOf(ReactoryApi),
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

    inputForm: PropTypes.string,

    formDef: PropTypes.any,

    exportDefinition: PropTypes.any,

    useClient: PropTypes.bool
  }

  static defaultProps = {
    folder: 'core',
    report: 'api-status',
    method: 'get',
    engine: 'pdf',
    resolver: 'query-params',
    delivery: 'inline',
    filename: 'api-status.pdf',
    waitingText: 'Loading, please wait',
    deliveryOptions: {

    },
    data: { 

    },
    formDef: null,
    useClient: false,
    exportDefinition: null      
  }

  static dependencies = [
    'core.Loading'
  ]

  componentDefs: any;

  constructor(props: ReportViewerProperties, context: any){
    
    super(props)
    this.state = {
      ready: props.useClient === true ? false : props.method === 'get' && props.delivery === 'inline',
      inlineLocalFile: '',
      downloaded: false,
    };

    this.onSubmitReport = this.onSubmitReport.bind(this);
    this.getDownloadViewResult = this.getDownloadViewResult.bind(this);
    this.getEmailViewResult = this.getEmailViewResult.bind(this);
    this.getUrlViewResult = this.getUrlViewResult.bind(this);
    this.getInlineViewResult = this.getInlineViewResult.bind(this);
    this.getClientSide = this.getClientSide.bind(this);

    this.componentDefs = props.reactory.getComponents(ReportViewer.dependencies);
  }
  
  onSubmitReport(){
    
  }

  getInlineViewResult(){
    const { folder, report, reactory, method, data, engine = 'pdf', useClient } = this.props;
    const { Loading } = this.componentDefs;
    const { ready, inlineLocalFile } = this.state;
    
    

    if(useClient === true) {
      return this.getClientSide();
    }

    const reportWindowProps = {
      src: '',
      url: '',
    };

    if(useClient === false) {           
      const queryparams = {
        ...data,
        'x-client-key': reactory.CLIENT_KEY,
        'x-client-pwd': reactory.CLIENT_PWD,
        'auth_token': reactory.getAuthToken(),
        'view': 'inline',      
      };
    
      reportWindowProps.url = `${reactory.API_ROOT}/${engine}/${folder}/${report}?${reactory.utils.queryString.stringify(queryparams)}`; 
      const toolbar = (
        <AppBar>
          <Toolbar>
            <IconButton size="large">
              <Icon>refresh</Icon>
            </IconButton>
          </Toolbar>
        </AppBar>
        
      );
  
      return (<FramedWindowComponent id={`reactory-report-window`} frameProps={{ ...reportWindowProps }} method={method} header={toolbar} />)
    }     
  }

  getDownloadViewResult(){
    const { folder, report, reactory, method, data } = this.props;
    
    const queryparams = {
      ...data,
      'x-client-key': reactory.CLIENT_KEY,
      'x-client-pwd': reactory.CLIENT_PWD,
      'auth_token': reactory.getAuthToken(),
      'view': 'attachment',      
    };
  
    const downloaduri = `${reactory.API_ROOT}/pdf/${folder}/${report}?${reactory.utils.queryString.stringify(queryparams)}`;
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
  
  getClientSide = () => {    

    const { Loading } = this.componentDefs;
    const { theme } = this.props;

    if(this.props.useClient === false) {
      throw new Error('Cannot call getClientSide() when useClient === false');
    }    

    const that = this;
    const { ready, inlineLocalFile, downloaded } = this.state;

    if(inlineLocalFile && ready === true) {
      return (
      <Loading message={downloaded === false ? "File ready, download will start shortly" : "File has been downloaded, you can close this window"} icon="done_outline" spinIcon={false}>

      </Loading>
      )
    }

    const exportDefinition: Reactory.Excel.IExport = this.props.exportDefinition
    let formData = that.props.data;
            
    if(exportDefinition) {

      if(exportDefinition.mapping && exportDefinition.mappingType === 'om') {
        formData = that.props.reactory.utils.objectMapper({ formData }, exportDefinition.mapping);
      }

      const wb = new ExcelJS.Workbook();            
      const excelOptions: Reactory.Excel.IExcelExportOptions = exportDefinition.exportOptions as Reactory.Excel.IExcelExportOptions;
            
      const options: Partial<ExcelJS.XlsxWriteOptions> = {
        filename: `${that.props.reactory.utils.template(excelOptions.filename)({ formData: this.props.data, moment: moment })}`,
      };
      
      const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
      excelOptions.sheets.forEach((sheet: Reactory.Excel.IExcelSheet, sheetIndex: number) => {
        const ws = wb.addWorksheet(sheet.name);               
        
        sheet.columns.forEach((column: Reactory.Excel.IExcelColumnDefinition, columnIndex: number) => {
          const headerCell = ws.getCell(`${cols[columnIndex]}1`);          
          ws.columns[columnIndex].width = column.width;
          if(column.style) {
            ws.columns[columnIndex].style = { ...column.style as Partial<ExcelJS.Style> }
          }
          
          let titleText: ExcelJS.CellValue = {
            'richText': [
                { 'font': { 'size': 12 },'text': column.title },
            ]
          };

          if(column.required === true) {
            titleText = {
                'richText': [
                    {'font': { bold: true, 'size': 12 },'text': column.title },
                ]
            }
          }
  
          headerCell.border = {
            top: {
                style: "medium",                            
            }
          };          

          headerCell.style = {
            ...column.style as Object,
            font: {
              color: {
                argb: `FF${theme.palette.primary.contrastText.replace('#', "")}`,
              }, 
            },
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: {
                argb: theme.palette.primary.main.replace('#', "")
              },
              fgColor: {
                argb: theme.palette.primary.main.replace('#', ""),
              },
            }
          }
          headerCell.value = titleText;                    
        });
                 
        if(formData && formData.sheets) {
         
          const sheetObject: any = formData.sheets[sheet.name];
          if(sheetObject && sheetObject[sheet.arrayField]) {
            const dataArray: any[] = sheetObject[sheet.arrayField];          
            dataArray.forEach((row: any, rowIndex: number) => {
              console.log(`Processing row ${rowIndex}`, { row, rowIndex });
              sheet.columns.forEach(( column: Reactory.Excel.IExcelColumnDefinition, columnIndex: number ) => {                
                let fieldValue: string = row[column.propertyField];
                let cell = ws.getCell(rowIndex + 2, columnIndex + 1);
                cell.numFmt = "";
                cell.value = fieldValue;
              })  
            });
          }          
        }        
      });

      if(this.state.ready === false) {
        wb.xlsx.writeBuffer(options).then((buffer: any) => {
          var byteArray = new Uint8Array(buffer);
          var a = window.document.createElement('a');
          a.style.visibility = 'hidden';
          a.href = window.URL.createObjectURL(new Blob([byteArray], { type: 'application/vnd.ms-excel' }));
          a.download = options.filename;
          // Append anchor to body.
          document.body.appendChild(a);
          a.click();
          // Remove anchor from body
          // document.body.removeChild(a)           
          //update local file reference
          that.setState({ inlineLocalFile: options.filename, ready: true, downloaded: true })
        });

        return (<Loading message="Writing Excel, please wait" />)
      }

                                   
      /**
       * 
        filename: 'CRMDashboard ${moment(formData.periodStart).format("YYYY MMM DD")} - ${moment(formData.periodEnd).format("YYYY MMM DD")}.xlsx',
        sheetnames: ['Overview', 'Quotes'],
        Quotes: {

        },
        Overview: {

        },
       * 
       */

      /*  
      let titleText: ExcelJS.CellValue = {
          'richText': [
              {'font': { 'size': 12 },'text': columnDefinition.column },
          ]
      }

      if(columnDefinition.required === true || columnDefinition.required === "true") {
          titleText = {
              'richText': [
                  {'font': { bold: true, 'size': 12 },'text': columnDefinition.column },
              ]
          }
      }
      
      headerCell.border = {
          top: {
              style: "medium",                            
          }
      }
      
      this.props.viewData.data.forEach((row: any, rowIndex: number) => {
          const rowCell = ws.getCell(`${cols[index]}${rowIndex}`);
          const rowText = row[columnDefinition.column];

          rowCell.value = rowText;
      })

      headerCell.value = titleText;
      */           
    }    
  }
   
  render(){

    const { 
      folder, report, method, 
      resolver, delivery, 
      deliveryOptions,
      reactory, data, filename
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

export const ReportViewerComponent = compose(withTheme, withReactory)(ReportViewer);


export default FramedWindowComponent;
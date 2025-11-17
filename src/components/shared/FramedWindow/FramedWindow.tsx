import React, { Fragment } from 'react';
import { AppBar, IconButton, Toolbar, Icon, Typography } from '@mui/material';
import { isArray } from 'lodash';
import { compose } from 'redux';
import { useTheme } from '@mui/material/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import ReactoryApi from "@reactory/client-core/api/ReactoryApi";
import Reactory from '@reactory/reactory-core';
import * as ExcelJS from 'exceljs';
import moment from 'moment';
import { useReactory } from '@reactory/client-core/api';


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

function FramedWindow({ containerProps, frameProps, data, method, id, reactory, header, footer }) {

  if (!reactory) {
    reactory = useReactory();
  }

  const _cprops = {...FramedWindow.defaultProps.containerProps, id, ...containerProps}
  const _fprops = {...FramedWindow.defaultProps.frameProps, ...frameProps }    
  const frameid = reactory.utils.hashCode(_fprops.url || 'about:blank')
  
  if(method === 'post') {    
    _fprops.src = reactory.utils.template(_fprops.url)({ data, reactory });
    const frameprops = { ..._fprops };
    delete frameprops.url;
    
    setTimeout(()=>{
      let form = document.forms[frameid];
      if(form && form.submit) form.submit();
    }, 1500); 
    
    return (
      <div { ..._cprops } >
          {header}
          <iframe id={frameid} { ...frameprops } />
          <form action={_fprops.url} method="post" target={frameid}>
            <input type="hidden" name="data" id="data" value={JSON.stringify(data)}/>
            <input type="submit" value="submit" />
          </form>
          {footer}
      </div>
    )
  } else {
    delete _fprops.styles;
    _fprops.src = reactory.utils.template(_fprops.url)({ data, reactory });
    delete _fprops.url;
    return (
      <div { ..._cprops } >
          <iframe id={frameid} { ..._fprops } />
      </div>
      )
  }    
}

FramedWindow.defaultProps = {
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

function _GraphiqlWindow({ reactory }) {
  
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
    <FramedWindow 
      id={`reactory-graphiql-window`}
      frameProps={{ url: `${reactory.CDN_ROOT}/plugins/graphiql/index.html?${reactory.utils.queryString.stringify(queryparams)}` }}
      method={'get'}
      reactory={reactory}
      containerProps={{
        id: `reactory-graphiql-window-container`,
        ...FramedWindow.defaultProps.containerProps,
      }} 
      header={undefined} 
      footer={undefined}/>)
}

_GraphiqlWindow.meta = {
  nameSpace: 'core',
  name: 'ReactoryGraphiQLExplorer',
  version: '1.0.0',
  component: withReactory(_GraphiqlWindow),
  tags: ['graphql', 'development'],
  description: 'Graphql Express Explorer',
  roles: ['DEVELOPER', 'ADMIN']
};

export const GraphiqlWindow = _GraphiqlWindow;

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


function ReportViewer({ 
  folder, report, method, useClient,
  reactory, data, filename, exportDefinition, engine = 'pdf'
}: ReportViewerProperties) {

  const { Loading } = reactory.getComponents<{ Loading: any }>([
      'core.Loading'
    ]);

  const [ready, setReady] = React.useState(false);
  const [inlineLocalFile, setInlineLocalFile] = React.useState('');
  const [downloaded, setDownloaded] = React.useState(false);

  const onSubmitReport = () => {
    
  }

  const getInlineViewResult = () => {
      
    if(useClient === true) {
      return getClientSide();
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

      return (<FramedWindow 
        id={`reactory-report-window`}
        frameProps={{ ...reportWindowProps }}
        method={method}
        reactory={reactory}
        containerProps={{
          id: `reactory-report-window-container`,
          ...FramedWindow.defaultProps.containerProps,
        }} header={undefined} footer={undefined}        />);
    }     
  }

  const getDownloadViewResult = () => {
    
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

  const getUrlViewResult = () => {
    return <Typography>Waiting for url result</Typography>
  }

  const getEmailViewResult = () => {
    return (
      <Typography>The report has been emailed</Typography>
    )
  }
  
  const getClientSide = () => {        

    const theme = useTheme();

    if(useClient === false) {
      throw new Error('Cannot call getClientSide() when useClient === false');
    }    

    if(inlineLocalFile && ready === true) {
      return (
      <Loading message={downloaded === false ? "File ready, download will start shortly" : "File has been downloaded, you can close this window"} icon="done_outline" spinIcon={false}>

      </Loading>
      )
    }    
    let formData = data;
            
    if(exportDefinition) {

      if(exportDefinition.mapping && exportDefinition.mappingType === 'om') {
        formData = reactory.utils.objectMapper({ formData }, exportDefinition.mapping);
      }

      const wb = new ExcelJS.Workbook();            
      const excelOptions: Reactory.Excel.IExcelExportOptions = exportDefinition.exportOptions as Reactory.Excel.IExcelExportOptions;
            
      const options: Partial<ExcelJS.XlsxWriteOptions> = {
        filename: `${reactory.utils.template(excelOptions.filename)({ formData: data, moment: moment })}`,
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

      if(ready === false) {
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
          setInlineLocalFile(options.filename);
          setReady(true);
          setDownloaded(true);
        });

        return (<Loading message="Writing Excel, please wait" />)
      }                                
    }
  }

  let content = getInlineViewResult();
   
  return (
    <div style={{display:'content', top: '0', bottom: '0'}}>        
      { content }
    </div>
  );
}

export const ReportViewerComponent = compose(withReactory)(ReportViewer);


export default FramedWindow;

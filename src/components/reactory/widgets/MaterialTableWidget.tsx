import React, { Fragment, Component, useState, RefObject, PureComponent } from 'react'
import PropTypes, { any } from 'prop-types'
import { pullAt, isNil, remove, filter, isArray, throttle, ThrottleSettings } from 'lodash'
import {
  Typography,
  Button,
  IconButton,
  Fab,
  Icon,
  Theme
} from '@material-ui/core'
import MaterialTable, { MTableToolbar } from 'material-table';

import {
  useMediaQuery
} from '@material-ui/core';

import { withApi } from '../../../api/ApiProvider';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { find, template } from 'lodash';
import { Styles } from '@material-ui/styles/withStyles/withStyles';
import Reactory from '@reactory/client-core/types/reactory';
import ReactoryApi from 'api';
import { QueryResult } from '@apollo/client';
import { Resolver } from 'dns';

export interface MaterialTableRemoteDataReponse {
  data: any[],
  page: number,
  totalCount: number,
}

export interface ReactoryMaterialTableProps {
  reactory: ReactoryApi,
  theme: any,
  schema: Reactory.IArraySchema,
  uiSchema: any,
  idSchema: any,
  formData: any[],
  formContext: any,
  paging: any,
  searchText: any,
  onChange: (formData: any[]) => void
}

export interface MaterialTableQuery {
  pageSize: number,
  page: number,
  search: string,
  [key: string]: any
}

export interface MaterialTableResult<T> {
  data: T[],
  page: number,
  totalCount: number
}



const ReactoryMaterialTableStyles: Styles<Theme, {}, "root" | "chip" | "newChipInput"> = (theme) => ({
  root: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  chip: {
    margin: theme.spacing(1),
  },
  newChipInput: {
    margin: theme.spacing(1)
  }
});

const ReactoryMaterialTable = (props: ReactoryMaterialTableProps) => {

  const { reactory, theme, schema, idSchema, onChange, uiSchema = {}, formContext, formData = [], searchText="" } = props;
  const uiOptions = uiSchema['ui:options'] || {};

  const AlertDialog = reactory.getComponent('core.AlertDialog@1.0.0');
  const [activeAction, setActiveAction] = useState({
    show: false,
    rowsSelected: [],
    action: null,
  });

  const [selectedRows, setSelectedRows] = useState([]);
  const [version, setVersion] = useState(0);
  const [last_queried, setLastQueried] = useState(null);
  const [last_result, setLastResult] = useState(formData);    

  const tableRef: any = React.createRef();

  let columns = [];
  let actions = [];
  let ToolbarComponent = null;
  let components: { [key: string]: Component | PureComponent | Function } = {};
  let detailsPanel = null;


  if (uiOptions.componentMap) {
    if (uiOptions.componentMap.Toolbar) {
      ToolbarComponent = reactory.getComponent(uiOptions.componentMap.Toolbar);
      if (ToolbarComponent) {
        components.Toolbar = (toolbar_props) => {
          let _toolbar_props = {...toolbar_props};
        
          if(uiOptions.toolbarProps) {
            _toolbar_props = { ..._toolbar_props, ...uiOptions.toolbarProps };
          }

          if(uiOptions.toolbarPropsMap) {
            _toolbar_props = reactory.utils.objectMapper({ 
              toolbarProps: uiOptions.toolbarProps || {}, 
              table_props: props, 
              props: toolbar_props, 
              formContext,
              schema,
              uiSchema,
              idSchema,
            }, uiOptions.toolbarPropsMap)

            _toolbar_props = { ...toolbar_props, ..._toolbar_props };
          }

          return <ToolbarComponent {..._toolbar_props} formContext={formContext} tableRef={tableRef} />
        }
      } else {
        setTimeout(() => { setVersion(version + 1) }, 777);
      }
    }

    if (uiOptions.componentMap.DetailsPanel) {
      const DetailsPanelComponent = reactory.getComponent(uiOptions.componentMap.DetailsPanel);

      detailsPanel = (rowData) => {
        return <DetailsPanelComponent {...rowData} />
      }
    }
  }

  const getData = (query: MaterialTableQuery): Promise<MaterialTableRemoteDataReponse> => {
    return new Promise((resolve, reject) => {
      reactory.log('♻ core.ReactoryMaterialTable data query', { query }, 'debug')

      let response: MaterialTableRemoteDataReponse = {
        data: [],
        page: 0,
        totalCount: 0,
      }      

      try {
        const graphqlDefinitions = formContext.graphql;

        if (graphqlDefinitions.query || graphqlDefinitions.queries) {

          let queryDefinition: Reactory.IReactoryFormQuery = graphqlDefinitions.query;

          if (typeof uiOptions.query === 'string' && uiOptions.query !== 'query' && graphqlDefinitions.queries && graphqlDefinitions.queries[uiOptions.query]) {
            queryDefinition = graphqlDefinitions.queries[uiOptions.query];
            reactory.log(`Switching Query definition to ==> ${uiOptions.query}`, queryDefinition, 'debug');
          }

          reactory.log(`MaterialTableWidget - Mapping variables for query`, { formContext, map: uiOptions.variables, query }, 'debug')
          let variables = reactory.utils.objectMapper({ formContext, query }, uiOptions.variables || queryDefinition.variables);

          variables = { ...variables, paging: { page: query.page + 1, pageSize: query.pageSize } };
          reactory.log('MaterialTableWidget - Mapped variables for query', { query, variables }, 'debug');

          reactory.graphqlQuery(queryDefinition.text, variables, queryDefinition.options).then((queryResult: any) => {
            reactory.log(`Result From Query`, { queryResult  })
            if (queryResult.errors && queryResult.errors.length > 0) {
              //show a loader error
              reactory.log(`Error loading remote data for MaterialTableWidget`, { formContext, queryResult })
              reactory.createNotification(`Could not fetch the data for this query due to an error`, { showInAppNotification: true, type: 'warning' })
            } else {

              response = reactory.utils.objectMapper(reactory.utils.lodash.cloneDeep(queryResult.data[queryDefinition.name]), uiOptions.resultMap || queryDefinition.resultMap);

              if (uiOptions.disablePaging === true) {
                response.page = 1,
                response.totalCount = response.data.length;
              }


              response.page = response.page - 1;

              if (uiOptions.footerColumns && uiOptions.footerColumns.length > 0) {

                const footerObject = {};
                uiOptions.footerColumns.forEach(fcol => {
                  footerObject[fcol.field] = fcol.text && fcol.text != '' ? fcol.text : fcol.value ? template(fcol.value)(queryResult.data[queryDefinition.name]) : null
                });

                if(query.selectedRows) {
                  query.selectedRows.forEach((row) => {
                    if(row.tableData) {
                      response.data[row.tableData.id].tableData = row.tableData;
                    }
                  })
                }

                response.data.push(footerObject);
              }
            }

            resolve(response);
          }).catch((queryError) => {
            reactory.log(`Error getting remote data`, { queryError }, 'error');
            //reject(queryError);
            resolve(response);
          });
        }

      } catch (remoteDataError) {
        reactory.log(`Error getting remote data`, { remoteDataError }, 'error');
        resolve(response);
      }
    });

  };

  const rows = uiOptions.remoteData ? getData : formData;

  if (uiOptions.columns && uiOptions.columns.length) {
    let _columnRef = [];
    let _mergeColumns = false;
    let _columns = uiOptions.columns;
    if (isNil(uiOptions.columnsProperty) === false) {
      _columns = [...formContext.formData[uiOptions.columnsProperty]];
      if (isNil(uiOptions.columnsPropertyMap) === false) {
        _columns = reactory.utils.objectMapper(_columns, uiOptions.columnsPropertyMap)
      }
    }

    remove(_columns, { selected: false });

    _columns.forEach(coldef => {
      const def = {
        ...coldef
      };

      if (isNil(def.component) === false && def.component !== undefined) {
        const ColRenderer = reactory.getComponent(def.component);
        def.render = (rowData) => {
          let props = { formData: formContext.$formData, rowData, api: reactory };
          let mappedProps = {};

          if (def.props) {
            props = { ...props, ...def.props, ...mappedProps, api: reactory }
          }

          //check if there is a propsMap property
          //maps self props
          if (def.propsMap && props) {
            mappedProps = reactory.utils.objectMapper(props, def.propsMap);
            props = { ...props, ...mappedProps, api: reactory };
          }

          if (ColRenderer) return <ColRenderer {...props} />
          else return <Typography>Renderer {def.component} Not Found</Typography>
        }

        delete def.component;
      }

      if (isArray(def.components) === true) {
        reactory.log(`Rendering Chidren Elements`, def);
        const { components } = def;
        def.render = (rowData) => {
          reactory.log(`Child element to be rendered`, def); const childrenComponents = components.map((componentDef, componentIndex) => {

            const ComponentToRender = reactory.getComponent(componentDef.component);

            let props = { formData: formContext.$formData, rowData, api: reactory, key: componentIndex };
            let mappedProps = {};

            if (componentDef.props) {
              props = { ...props, ...componentDef.props, ...mappedProps, api: reactory }
            }

            if (componentDef.propsMap && props) {
              mappedProps = reactory.utils.objectMapper(props, componentDef.propsMap);
              props = { ...props, ...mappedProps, api: reactory };
            }
            if (ComponentToRender) return <ComponentToRender {...props} />
            else return <Typography>Renderer {componentDef.component} Not Found</Typography>

          });


          return (<div style={{ display: 'flex', 'justifyContent': 'flex-start' }}>
            {childrenComponents}
          </div>)

        }

        delete def.components;
      }

      if (def.props && def.props.actionButton) {
        def.render = (rowData) => {
          const buttonProps = def.props.actionButton;
          if (buttonProps.icon) {
            return <Fab color={buttonProps.color ? buttonProps.color : "default"} size={buttonProps.size ? buttonProps.size : "small"}><Icon style={{ color: "#fff" }}>{buttonProps.icon}</Icon></Fab>
          } else {
            return <Button>{buttonProps.text}</Button>
          }
        }
      }

      if (def.breakpoint) {
        const shouldBreak = useMediaQuery(theme.breakpoints.down(def.breakpoint));

        if (shouldBreak === false) {
          reactory.log('MaterialTableWidget ==> Skipping column render', { shouldBreak, def }, 'debug');
          columns.push(def)
        }
      } else {
        columns.push(def)
      }
    });
  }

  let options: any = {
    rowStyle: (rowData, index) => {
      reactory.log(' 🎨 MaterialTableWidget.rowStyle', { rowData, index }, 'debug')
      let style = {};
      let selectedStyle = {};

      if (theme.MaterialTableWidget) {
        if (theme.MaterialTableWidget.selectedRowStyle) selectedStyle = theme.MaterialTableWidget.selectedRowStyle;
        if (theme.MaterialTableWidget.rowStyle) style = { ...theme.MaterialTableWidget.rowStyle };
        if (theme.MaterialTableWidget.altRowStyle && index % 2 === 0) style = { ...style, ...theme.MaterialTableWidget.altRowStyle };
      }

      if (uiOptions.rowStyle) style = { ...uiOptions.rowStyle };
      if (uiOptions.altRowStyle && index % 2 === 0) style = { ...style, ...uiOptions.altRowStyle };

      if (uiOptions.selectedRowStyle) {
        selectedStyle = uiOptions.selectedRowStyle;
      }

      if (find(selectedRows, (row) => row.tableData.id === rowData.tableData.id)) {

        style = {
          ...style,
          ...selectedStyle,
        }
      }

      return style;
    }
  };

  if (uiOptions.options) {
    options = { ...options, ...uiOptions.options }

    if (options.searchText && options.searchText.indexOf('${') >= 0) {
      try {
        options.searchText = reactory.utils.template(options.searchText)({ ...props })
        if(tableRef && tableRef.current) {
          
          if(tableRef.current.state.searchText !== options.searchText) {
            tableRef.current.onQueryChange({ search: options.searchText })
            tableRef.current.setState({ searchText: options.searchText })
          }
        }
      } catch (tErr) {
        reactory.log(`core.MaterialTableWidget template render failed for search input`, { searchText: options.searchText, error: tErr }, 'error');
      }
    }
  }

  if (uiOptions.actions && isArray(uiOptions.actions) === true) {
    actions = uiOptions.actions.map((action) => {

      const actionClickHandler = (selected) => {

        const process = () => {
          if (action.mutation) {
            const mutationDefinition: Reactory.IReactoryFormMutation = formContext.graphql.mutation[action.mutation];

            reactory.graphqlMutation(mutationDefinition.text, reactory.utils.objectMapper({ ...props, selected }, mutationDefinition.variables)).then((mutationResult: {data: any, errors: any[]}) => {
              reactory.log(`MaterialTableWidget --> action mutation ${action.mutation} result`, { mutationDefinition, self, mutationResult, selected })

              let has_errors = false;

              if(!mutationResult.errors && mutationResult.data[mutationDefinition.name]) {
              
                if (uiOptions.remoteData === true) {
                  if (tableRef.current && tableRef.current.onQueryChange) {
                    tableRef.current.onQueryChange()
                  }
                } else {
                  setVersion(version + 1);
                }
  
                if (mutationDefinition.onSuccessEvent) {
                  reactory.log(`Mutation ${mutationDefinition.name} has onSuccessEvent`, mutationDefinition.onSuccessEvent);
                  
                  if(typeof formContext[mutationDefinition.onSuccessEvent.name] === 'function') {
  
                    let _method_props = mutationDefinition.onSuccessEvent.dataMap ? 
                    reactory.utils.objectMapper(mutationResult.data[mutationDefinition.name], mutationDefinition.onSuccessEvent.dataMap) : 
                    mutationResult.data[mutationDefinition.name];
                    try {
                      formContext[mutationDefinition.onSuccessEvent.name]( _method_props );
                    } catch (notHandledByForm) {
                      reactory.log(`${formContext.signature} function handler for event ${mutationDefinition.onSuccessEvent.name} threw an unhandled error`, { notHandledByForm, props: _method_props }, 'warning')
                    }
                    
                    reactory.emit(mutationDefinition.onSuccessEvent.name, _method_props);
                  }
                }                                                        
              } else {
                has_errors = true;
              }

              

              if (mutationDefinition.notification) {
                reactory.createNotification(`${reactory.utils.template(mutationDefinition.notification.title)({ result: mutationResult, selected })}`, { showInAppNotification: true, type: has_errors === true ? 'warning' : 'success' })
              }

              if (mutationDefinition.refreshEvents) {
                mutationDefinition.refreshEvents.forEach((eventDefinition) => {
                  reactory.emit(eventDefinition.name, selected);
                });
              }

            }).catch((rejectedError) => {
              reactory.createNotification(`Could not execute action ${rejectedError.message}`, { showInAppNotification: true, type: 'error' });
            });
          }

          if (action.event) {
            let __formData = {
              ...formContext.$formData,
              ...reactory.utils.objectMapper({ selected }, action.event.paramsMap || {}),
              ...(action.event.params ? action.event.params : {})
            };


            if (action.event.via === 'form') {
              let handler = formContext.$ref.onChange;
              if (typeof formContext.$ref[action.event.name] === 'function') {
                handler = formContext.$ref[action.event.name];
              }
              handler(__formData);
            };

            if (action.event.via === 'api') {

              let handler = () => {
                reactory.emit(action.event.name, __formData);
              }

              handler();
            }
          }

          setActiveAction({ show: false, action: null, rowsSelected: [] });
        };

        if (action.confirmation) {
          setActiveAction({
            show: true,
            rowsSelected: selected,
            action: {
              ...action,
              confirmation: {
                ...action.confirmation,
                onAccept: () => {
                  process();
                  setActiveAction({
                    show: false,
                    action: null,
                    rowsSelected: []
                  });
                },
                onClose: () => {
                  setActiveAction({
                    show: false,
                    action: null,
                    rowsSelected: []
                  })
                }
              }
            },
          });
        } else {
          setActiveAction({ action, show: false, rowsSelected: [] })
          process();
        }
      };

      return {
        icon: action.icon,
        iconProps: action.iconProps || {},
        tooltip: action.tooltip || '',
        isFreeAction: action.isFreeAction === true,
        key: action.key || action.icon,
        onClick: (evt, selected_rows) => {
          actionClickHandler(selected_rows);
        }
      };
    });
  }

  let confirmDialog = null;
  if (activeAction.show === true) {

    confirmDialog = (
      <AlertDialog
        open={true}
        title={reactory.utils.template(activeAction.action.confirmation.title)({ selected: activeAction.rowsSelected })}
        content={reactory.utils.template(activeAction.action.confirmation.content)({ selected: activeAction.rowsSelected })}
        onAccept={activeAction.action.confirmation.onAccept}
        onClose={activeAction.action.confirmation.onClose}
        cancelTitle={activeAction.action.confirmation.cancelTitle}
        acceptTitle={activeAction.action.confirmation.acceptTitle}
        titleProps={activeAction.action.confirmation.titleProps}
        contentProps={activeAction.action.confirmation.contentProps}
        cancelProps={activeAction.action.confirmation.cancelProps}
        confirmProps={activeAction.action.confirmation.confirmProps}
      />);
  }

  const refreshHandler = (eventName: string, eventData: any) => {
    const uiOptions = uiSchema['ui:options'] || {};
    reactory.log(`MaterialTableWidget - Handled ${eventName}`, eventData, 'debug');
    if (uiOptions.remoteData === true) {
      if (tableRef.current && tableRef.current.onQueryChange) {
        tableRef.current.onQueryChange()
      }
    } else {
      setVersion(version + 1);
    }
  };

  const refresh = () => {
    if (uiOptions.remoteData === true) {
      if (tableRef.current && tableRef.current.onQueryChange) {
        tableRef.current.onQueryChange()
      }
    } else {
      setVersion(version + 1);
    }
  }

  const onSelectionChange = (selected_rows) => {
    //setSelectedRows(selected_rows);
  }

  React.useEffect(() => {
    refresh()
  }, [formContext.formData]);

  const willUnmount = () => {
    const uiOptions = uiSchema['ui:options'] || {};
    if (uiOptions.refreshEvents) {
      //itterate through list of event names,
      //for now we just do a force refresh which will trigger re-rendering
      //logic in the widget.
      uiOptions.refreshEvents.forEach((reactoryEvent) => {
        reactory.removeListener(reactoryEvent.name, refreshHandler);
      });
    };
  }
  
  React.useEffect(() => {
    const uiOptions = uiSchema['ui:options'] || {};
    if (uiOptions.refreshEvents) {
      //itterate through list of event names,
      //for now we just do a force refresh which will trigger re-rendering
      //logic in the widget.
      uiOptions.refreshEvents.forEach((reactoryEvent) => {
        reactory.log(`MaterialTableWidget - Binding refresh event "${reactoryEvent.name}"`, undefined, 'debug');
        reactory.on(reactoryEvent.name, refreshHandler.bind(self, reactoryEvent.name));
      });
    };

    return willUnmount;
  }, []);  

  


  return (
    <React.Fragment>
      <MaterialTable
        columns={columns}
        tableRef={tableRef}
        data={rows}        
        title={schema.title || uiOptions.title || "no title"}
        options={options}
        actions={actions}
        onSelectionChange={onSelectionChange}
        components={components}
        detailPanel={detailsPanel} />
      {confirmDialog}
    </React.Fragment>
  )

};

const MaterialTableWidgetComponent = compose(withApi, withTheme, withStyles(ReactoryMaterialTableStyles))(ReactoryMaterialTable)
export default MaterialTableWidgetComponent

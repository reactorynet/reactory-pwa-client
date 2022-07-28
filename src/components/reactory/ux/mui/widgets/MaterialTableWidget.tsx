import React, { Fragment, Component, useState, RefObject, PureComponent } from 'react'
import PropTypes, { any } from 'prop-types'
import { pullAt, isNil, remove, filter, isArray, throttle, ThrottleSettings } from 'lodash'
import {

  Grid,
  Typography,
  Button,
  IconButton,
  Fab,
  Icon,
  Theme,
  Toolbar,
  Select,

  useMediaQuery,
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TablePagination,
  Paper,
  Tooltip,
  TextField

} from '@mui/material'
import { alpha } from '@mui/material/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';
import { find, template, get } from 'lodash';
import { Styles } from '@mui/styles/withStyles/withStyles';
import Reactory from '@reactory/reactory-core';
import ReactoryApi from 'api';
import { useSizeSpec } from '@reactory/client-core/components/hooks/useSizeSpec';
import addYears from 'date-fns/esm/fp/addYears/index.js';
import DropDownMenu from 'components/shared/menus/DropDownMenu';
export interface MaterialTableRemoteDataReponse {
  data: any[],
  paging: {
    page: number
    pageSize: number
    hasNext: boolean
    total: number
  }
}

export interface ReactoryMaterialTableProps {
  reactory: ReactoryApi,
  theme: any,
  schema: Reactory.Schema.IArraySchema,
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

export interface MaterialTableRowState {
  [key: number]: {
    /**
     * indicates if the row is selected
     */
    selected?: boolean,
    /**
     * indicates if the row has hover state
     */
    hover?: boolean,
    /**
     * indicates if the row is set into editing state
     */
    editing?: boolean
    /**
     * indicates if the row is in saving state
     */
    saving?: boolean

    /**
     * indicates if the row data has changed
     */
    dirty?: boolean
  }
}


export interface MaterialTableColumn<TRow> {
  field: string,
  title: string,
  renderRow?: (rowData: TRow, rowIndex: number, rowState: MaterialTableRowState) => JSX.Element
  renderHeader?: (data: TRow[], rowState: MaterialTableRowState) => JSX.Element
  renderFooter?: (data: TRow[], rowState: MaterialTableRowState) => JSX.Element
  footerProps?: any,
  headerProps?: any,
  rowProps?: any,
  altRowProps?: any,
  cellProps?: any
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

const ReactoryMaterialTablePagination = (props) => {
  const { reactory, theme, schema, idShema, formContext, uiSchema, formData, rowsPerPageOptions = [5, 10, 25, 50, 100], tableRef, classes } = props;
  const { DropDownMenu } = reactory.getComponents(['core.DropDownMenu']);


  const { useState, useEffect } = React;

  const [version, setVersion] = useState(0);
  const sizeSpec = useSizeSpec();

  formContext.$page = props.page;

  useEffect(() => {
    setVersion(version + 1);
  }, [sizeSpec.innerWidth])

  const options = uiSchema['ui:options'];
  const default_footer_options = {
    totals: true,
    labelStyle: { fontWeight: 'bold' },
    totalsRowStyle: {},
    totalsCellStyle: { textAlign: 'left' },
    displayTotalsLabel: true,
    paginationStyle: { display: 'flex', justifyContent: 'flex-end' }
  };
  const { columns = [], footerColumns = [], footerOptions = default_footer_options } = options;

  const show_totals: boolean = footerColumns.length > 0 && footerOptions.totals === true;
  const show_totals_label = footerOptions.displayTotalsLabel === true;

  const onMenuItemSelect = (evt, menuItem) => {
    if (props.onChangeRowsPerPage) {
      let e = { target: { value: menuItem.key } };
      props.onChangeRowsPerPage(e);
    }
  }

  let data = [];

  if (tableRef.current) {
    if (tableRef.current.state && tableRef.current.state.data) {
      data = [...tableRef.current.state.data];
    }
  }

  const has_data = data.length > 0;

  return (
    <td style={{ display: 'grid' }}>
      <Grid container spacing={2}>
        {show_totals === true && show_totals_label === true &&
          <Grid item xs={12} md={12} lg={12} xl={12} style={footerOptions.totalsRowStyle}>
            <div style={footerOptions.totalsCellStyle}>Totals</div>
          </Grid>}
        {show_totals === true && footerColumns !== undefined && footerColumns !== null &&
          <Grid item container spacing={0} xs={12} md={12} lg={12} xl={12} style={{ display: 'flex', justifyContent: 'center' }}>
            {
              footerColumns.map((col) => {
                let cellStyle = {};
                let $display = '';
                if (col.value && has_data === true) {

                  switch (col.value) {
                    case 'SUM':
                    default: {
                      let s = 0;
                      data.forEach((row) => {
                        if (typeof row[col.field] === 'string') {
                          s += parseFloat(row[col.field]);
                        }

                        if (typeof row[col.field] === 'number') s += row[col.field]
                      });

                      $display = `${s}`;
                    }
                  }

                  cellStyle = {
                    borderStyle: 'solid none double none',
                    width: `calc((95%) / ${columns.length})`
                  };

                } else {
                  cellStyle = {
                    border: 'none',
                    width: `calc((95%) / ${columns.length})`
                  };
                }
                return (<div style={cellStyle}>{$display}</div>);
              })
            }
          </Grid>}
        <Grid container item xs={12} md={12} lg={12} xl={12} spacing={0} style={{ justifyContent: 'flex-end' }}>

          <Grid item container spacing={0} sm={6} md={2} style={{ justifyContent: 'flext-end', paddingRight: '10px' }}>
            <Grid item sm={8}>
              <Typography style={{ marginTop: '10px', float: 'right' }}>Total records:</Typography>
            </Grid>
            <Grid item sm={2}>
              <Typography style={{ marginTop: '10px', float: 'right' }}>{props.count || 0}</Typography>
            </Grid>
          </Grid>

          <Grid item container spacing={0} sm={6} md={2} style={{ justifyContent: 'flext-end', paddingRight: '10px' }}>
            <Grid item sm={8}>
              <Typography style={{ marginTop: '10px', float: 'right' }}>{props.labelRowsPerPage} {props.rowsPerPage}</Typography>
            </Grid>
            <Grid item sm={2}>
              <DropDownMenu menus={rowsPerPageOptions ? rowsPerPageOptions.map((i) => ({ key: i, title: `${i}` })) : []} onSelect={onMenuItemSelect} />
            </Grid>
          </Grid>
          <Grid item sm={6} md={4}>
            <TablePagination {...{ ...props, classes: { root: classes.root } }} />
          </Grid>
        </Grid>
      </Grid>
    </td >
  )
}

const ReactoryMaterialTableWaitForRenderer = (props) => {
  const { reactory, componentId, DefaultComponent } = props;
  const [version, setVersion] = React.useState<number>(0);

  if (!reactory.componentRegister[componentId]) {

    setTimeout(() => {
      setVersion(version + 1)
    }, 777)

    return DefaultComponent;
  }
  
  const Component = reactory.getComponent(componentId);

  return <Component {...props}/>;

};

const ReactoryMaterialTable = (props: ReactoryMaterialTableProps) => {

  const { reactory, theme, schema, idSchema, onChange, uiSchema = {}, formContext = {}, formData = [], searchText = "" } = props;
  const uiOptions = uiSchema['ui:options'] || {};
  const AlertDialog = reactory.getComponent('core.AlertDialog@1.0.0');
  const DropDownMenu = reactory.getComponent('core.DropDownMenu@1.0.0');
  
  const [activeAction, setActiveAction] = useState({
    show: false,
    rowsSelected: [],
    action: null,
  });

  const [selectedRows, setSelectedRows] = useState([]);
  const [version, setVersion] = useState(0);
  const [is_refreshing, setIsRefreshing] = useState(false);
  const [last_queried, setLastQueried] = useState(null);
  const [last_result, setLastResult] = useState(formData);
  const [rowsState, setRowState] = useState({});
  const [error, setError] = useState(null);
  const [query, setQuery] = useState<MaterialTableQuery>({ page: 1, pageSize: 10, search: "" });

  const [data, setData] = useState<MaterialTableRemoteDataReponse>({
    data: formData || [],
    paging: {
      hasNext: false,
      page: 0,
      pageSize: 10,
      total: 0
    }
  });

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
          let _toolbar_props = { ...toolbar_props };

          if (uiOptions.toolbarProps) {
            _toolbar_props = { ..._toolbar_props, ...uiOptions.toolbarProps };
          }

          if (uiOptions.toolbarPropsMap) {
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

      if (DetailsPanelComponent) {
        detailsPanel = (detail_props) => {
          let _detail_props = { ...detail_props };

          if (uiOptions.detailPanelProps) {
            _detail_props = { ..._detail_props, ...uiOptions.detailPanelProps };
          }

          if (uiOptions.detailPanelPropsMap) {
            _detail_props = reactory.utils.objectMapper({
              detailPanelProps: uiOptions.detailPanelProps || {},
              table_props: props,
              props: detail_props,
              formContext,
              schema,
              uiSchema,
              idSchema,
            }, uiOptions.detailPanelPropsMap)

            _detail_props = { ...detail_props, ..._detail_props };
          }

          return <DetailsPanelComponent {..._detail_props} formContext={formContext} tableRef={tableRef} />
        };
      }
    }
  }



  const getData = async (): Promise<MaterialTableRemoteDataReponse> => {    
      
      reactory.log('core.ReactoryMaterialTable data query', { query }, 'debug')

      let response: MaterialTableRemoteDataReponse = {
        ...data
      }
      
      try {
        const graphqlDefinitions = formContext.graphql;

        if (graphqlDefinitions.query || graphqlDefinitions.queries) {
          let queryDefinition: Reactory.Forms.IReactoryFormQuery = graphqlDefinitions.query;          
          if (typeof uiOptions.query === 'string' && uiOptions.query !== 'query' && graphqlDefinitions.queries && graphqlDefinitions.queries[uiOptions.query]) {
            queryDefinition = graphqlDefinitions.queries[uiOptions.query];
            reactory.log(`Switching Query definition to ==> ${uiOptions.query}`, queryDefinition, 'debug');
          }
                  
          reactory.log(`MaterialTableWidget - Mapping variables for query`, { formContext, map: uiOptions.variables, query }, 'debug')
          let variables = reactory.utils.objectMapper({ formContext, query }, uiOptions.variables || queryDefinition.variables);
         
          variables = { ...variables, paging: { page: query.page + 1, pageSize: query.pageSize } };
          reactory.log('MaterialTableWidget - Mapped variables for query', { query, variables }, 'debug');

          let options = queryDefinition.options ? { fetchPolicy: 'network-only', ...queryDefinition.options } : { fetchPolicy: 'network-only' };
          if (query && query.options) {
            options = { ...options, ...query.options };
          }

          if (options.fetchPolicy && options.fetchPolicy.indexOf('${') >= 0) {
            try {
              options.fetchPolicy = reactory.utils.template(options.fetchPolicy)({ formContext, query });
            } catch (fpterror) {
              options.fetchPolicy = 'network-only';
            }
          }

          let queryResult: any = null; 
          
          try { 
            queryResult = await reactory.graphqlQuery(queryDefinition.text, variables, options).then();
          } catch (e) {
            reactory.log(`Error running query for grid`, {e}, 'error');
            setError("Error executing query");
          }
          //show a loader error
          if (queryResult?.data) {

            const $data: any = reactory.utils.objectMapper(reactory.utils.lodash.cloneDeep(queryResult.data[queryDefinition.name]), uiOptions.resultMap || queryDefinition.resultMap);
            if($data) {
              if($data.data && $data.paging) {
                response.data = $data.data
                response.paging = $data.paging
              } else {
                if( isArray($data) ) {
                  response.data = $data;
                }
              }            
            }
            
            if (uiOptions.disablePaging === true) {
              response.paging.page = 1,
              response.paging.total = response.data.length;
            }

            if (formContext.$selectedRows && formContext.$selectedRows.current) {
              response.data.forEach((item, item_id) => {              
                if(reactory.utils.lodash.findIndex(formContext.$selectedRows.current, { id: item.id }) >= 0) {
                  item.tableData = { checked: true, id: item_id }
                }                
              });
            }
            //response.paging.page = response.paging.page - 1;
          } else {
            reactory.log(`Query returned null data`, { queryResult }, 'warning')
            setError("No data returned from query")
          }                              
        }

      } catch (remoteDataError) {
        reactory.log(`Error getting remote data`, { remoteDataError }, 'error');        
        return response;
      }

      debugger
      setData(response);
  };

  const rows = uiOptions.remoteData === true ? data?.data : formData;
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


          let props = { formData: formContext.$formData, rowData, api: reactory, reactory, formContext };
          let mappedProps = {};

          if (def.props) {
            props = { ...props, ...def.props, ...mappedProps, api: reactory, reactory, }
          }

          //check if there is a propsMap property
          //maps self props
          if (def.propsMap && props) {
            mappedProps = reactory.utils.objectMapper(props, def.propsMap);
            props = { ...props, ...mappedProps, api: reactory, reactory };
          }

          if (ColRenderer) return <ColRenderer {...props} />
          else return <ReactoryMaterialTableWaitForRenderer {...props} componentId={def.component} DefaultComponent={<>...</>} />
        }

        delete def.component;
      }

      if (isArray(def.components) === true) {
        reactory.log(`Rendering Chidren Elements`, def);
        const { components } = def;
        def.render = (rowData) => {
          reactory.log(`Child element to be rendered`, def);

          const childrenComponents = (components || []).map((componentDef, componentIndex) => {

            const ComponentToRender = reactory.getComponent(componentDef.component);

            let props = { formData: formContext.$formData, rowData, api: reactory, key: componentIndex, formContext };
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

  const view_mode = localStorage.getItem('$reactory$theme_mode') || "light";
  let theme_alt_rowStyle = {};
  let theme_row_style = {};
  let theme_selected_style = {};
  let theme_header_style = {};

  if (theme.MaterialTableWidget) {
    if (theme.MaterialTableWidget[view_mode].rowStyle) theme_row_style = { ...theme.MaterialTableWidget[view_mode].rowStyle };
    if (theme.MaterialTableWidget[view_mode].altRowStyle) theme_alt_rowStyle = { ...theme.MaterialTableWidget[view_mode].altRowStyle };
    if (theme.MaterialTableWidget[view_mode].selectedRowStyle) theme_selected_style = theme.MaterialTableWidget[view_mode].selectedRowStyle;
    if (theme.MaterialTableWidget[view_mode].headerStyle) theme_header_style = theme.MaterialTableWidget[view_mode].headerStyle;
  }

  if (uiOptions.headerStyle) {
    theme_header_style = { ...theme_header_style, ...uiOptions.headerStyle };
  }

  let options: any = {
    rowStyle: (rowData, index) => {

      let style = { ...theme_row_style };
      let selectedStyle = { ...theme_selected_style };

      if (index % 2 === 0) style = { ...style, ...theme_alt_rowStyle };

      if (uiOptions.rowStyle) style = { ...style, ...uiOptions.rowStyle };
      if (uiOptions.altRowStyle && index % 2 === 0) style = { ...style, ...uiOptions.altRowStyle };

      if (uiOptions.selectedRowStyle) {
        selectedStyle = { ...selectedStyle, ...uiOptions.selectedRowStyle };
      }

      if (rowData.tableData.checked === true) {

        style = {
          ...style,
          ...selectedStyle,
        }
      }

      if (uiOptions.conditionalRowStyling && uiOptions.conditionalRowStyling.length > 0) {

        uiOptions.conditionalRowStyling.forEach((option) => {
          const _field = get(rowData, option.field);
          if (_field && _field.toLowerCase() == option.condition.toLowerCase()) {
            style = { ...style, ...option.style };
          }
        });
      }

      return style;
    },
    headerStyle: {
      ...theme_header_style
    }
  };

  if (uiOptions.options) {
    options = { ...options, ...uiOptions.options }
    if (options.searchText && options.searchText.indexOf('${') >= 0) {
      try {
        options.searchText = reactory.utils.template(options.searchText)({ ...props })
        if (tableRef && tableRef.current) {

          if (tableRef.current.state.searchText !== options.searchText) {
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
            const mutationDefinition: Reactory.Forms.IReactoryFormMutation = 
            formContext.graphql.mutation[action.mutation];
            reactory.graphqlMutation(mutationDefinition.text, reactory.utils.objectMapper({ ...props, selected }, mutationDefinition.variables)).then((mutationResult: { data: any, errors: any[] }) => {
              reactory.log(`MaterialTableWidget --> action mutation ${action.mutation} result`, { mutationDefinition, self, mutationResult, selected })

              let has_errors = false;

              if (!mutationResult.errors && mutationResult.data[mutationDefinition.name]) {
                if (uiOptions.remoteData === true) {
                  if (tableRef.current && tableRef.current.onQueryChange) {
                    tableRef.current.onQueryChange()
                  }
                } else {
                  setVersion(version + 1);
                }
                if (mutationDefinition.onSuccessEvent) {
                  reactory.log(`Mutation ${mutationDefinition.name} has onSuccessEvent`, mutationDefinition.onSuccessEvent);

                  if (typeof formContext[mutationDefinition.onSuccessEvent.name] === 'function') {

                    let _method_props = mutationDefinition.onSuccessEvent.dataMap ?
                      reactory.utils.objectMapper(mutationResult.data[mutationDefinition.name], mutationDefinition.onSuccessEvent.dataMap) :
                      mutationResult.data[mutationDefinition.name];
                    try {
                      formContext[mutationDefinition.onSuccessEvent.name](_method_props);
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

              if (typeof formContext.$ref.props[action.event.name] === 'function') {
                handler = formContext.$ref.props[action.event.name];
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

  const refresh = (args: any) => {

    if (is_refreshing === true) return;
    setIsRefreshing(true);
    if (uiOptions.remoteData === true) {
      if (tableRef.current && tableRef.current.onQueryChange) {
        tableRef.current.onQueryChange()
      }
    }
    setVersion(version + 1);
    setIsRefreshing(false);
  }

  if (!components.Pagination) {
    components.Pagination = (pagination_props: any) => {

      let $pg_props = {
        ...pagination_props,
        reactory,
        theme,
        tableRef,
        formContext,
        uiSchema,
        schema,
        idSchema,
        formData,
        rowsPerPageOptions: pagination_props.rowsPerPageOptions || [5, 10, 25, 50, 100]
      }
      return (<ReactoryMaterialTablePagination {...$pg_props} />)

    }
  }

  const bindRefreshEvents = (table) => {

    const graphqlDefinitions = formContext.graphql;

    if (graphqlDefinitions.query || graphqlDefinitions.queries) {

      let queryDefinition: Reactory.Forms.IReactoryFormQuery = graphqlDefinitions.query;

      const onEventRefreshHandler = (evt, evtkwargs) => {
        if (uiOptions.remoteData === true) {
          if (table && table.onQueryChange) {
            table.onQueryChange()
          }
        } else {
          setVersion(version + 1);
        }

        reactory.removeListener(evt.name, onEventRefreshHandler);
      };


      if (typeof uiOptions.query === 'string' && uiOptions.query !== 'query' && graphqlDefinitions.queries && graphqlDefinitions.queries[uiOptions.query]) {
        queryDefinition = graphqlDefinitions.queries[uiOptions.query];
        reactory.log(`Switching Query definition to ==> ${uiOptions.query}`, queryDefinition, 'debug');
      }

    if (queryDefinition && queryDefinition.refreshEvents) {
      queryDefinition.refreshEvents.forEach((reactoryEvent) => {
        reactory.log(`MaterialTableWidget - Binding refresh event "${reactoryEvent.name}"`, undefined, 'debug');
        reactory.on(reactoryEvent.name, onEventRefreshHandler);
      });
    }
  }

  }

  React.useEffect(() => {
    
    refresh({})
  }, [formContext.formData]);

  React.useEffect(() => {
    setVersion(version + 1);
  }, [uiSchema])

  const willUnmount = () => {
    const uiOptions = uiSchema['ui:options'] || {};
    if (uiOptions.refreshEvents) {
      //itterate through list of event names,
      //for now we just do a force refresh which will trigger re-rendering
      //logic in the widget.
      uiOptions.refreshEvents.forEach((reactoryEvent) => {
        reactory.removeListener(reactoryEvent.name, refresh);
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
        reactory.on(reactoryEvent.name, refresh);
      });
    };

    if(uiOptions.remoteData === true) {
      getData()
    }

    return willUnmount;
  }, []);

  {/* <MaterialTable
          columns={columns || []}
          tableRef={(ref) => { tableRef.current = ref, bindRefreshEvents(ref) }}
          data={rows || []}
          title={schema.title || uiOptions.title || "no title"}
          options={options}
          actions={actions}
          components={components}
          localization={uiOptions.localization || {}}
          detailPanel={detailsPanel}
          onSelectionChange={ (rows) => {  
            reactory.emit(`MaterialTableWidget.${idSchema.$id}.onSelectionChange`, rows)

          } } /> */}

  //modify columns with virtual columns
  //virtual columns are columns action columns
  //we will provide basic types, checkbox / slider
  //dropdown,
  //action

  // this is our rows object that we will render.
  let $rows = []

  if (typeof rows === "object") {
    $rows = rows as any[]
  }

  if (typeof rows === "function") {
    $rows = last_result as any[]
  }

  const getHeader = () => {

    return (
      <TableHead>
        <TableRow>
          {columns.map((column: MaterialTableColumn<any>, idx) => {             
            const {
              title,
              renderHeader,
              field
            } = column

            if(renderHeader) return renderHeader($rows, rowsState) 

            return (<TableCell key={idx}>{title}</TableCell>)
          })}      
        </TableRow>
      </TableHead>)
  }        

  const getBody = () => {

    let $body_rows = $rows.map((row, rid) => {

      const $rState = rowsState[rid] || {}

      return (<TableRow key={rid}>
        {columns.map((column: MaterialTableColumn<any>, columnIndex: number) => {
          if (column.renderRow) return column.renderRow({ ...row, $rowState: $rState }, rid, rowsState);
          return (<TableCell key={columnIndex}><Typography variant={'body2'}>{row[column.field]}</Typography></TableCell>)
        })}

      </TableRow>)
    });

    if($body_rows.length === 0) {
      $body_rows.push((
        <TableRow key={0}>
          <TableCell colSpan={columns.length}>
            <Typography variant={"body2"} style={{ height: '200px', paddingTop: '90px', textAlign: 'center' }}>{uiOptions?.localization?.body?.emptyDataSourceMessage || "No data available."}</Typography>
          </TableCell>
        </TableRow>
      ))
    }

    return (<TableBody>
      {$body_rows}
    </TableBody>)
  }

  const getFooter = () => {

    let $columns = [];

    columns.forEach((column: MaterialTableColumn<any>, idx) => {
      const {
        renderFooter,
        field
      } = column

      if (renderFooter) $columns.push(column)
    })

    if($columns.length === 0) return null;

    return  (
    <TableFooter>
        <TableRow>
          {$columns.map((footerColumn: MaterialTableColumn<any>) => {
            return footerColumn.renderFooter($rows, rowsState);
          })}      
        </TableRow>
    </TableFooter>)    
  }

  const getPagination = () => {

    return (
      <TablePagination 
        count={10}
        page={0}
        rowsPerPage={10}
        component={"div"}
        onPageChange={(evt, page)=>{}}
        >

      </TablePagination>)
  }


  const getToolbar = () => {

    let numSelected = 0;

    let addButton = null;
    let deleteButton = null;

    const callAdd = () => {

    }

    const callDelete = () => {

    }

    if(uiOptions.allowAdd === true) {
      addButton = (
        <Tooltip title={`Click to add a new entry`}><IconButton onClick={callAdd}><Icon>{uiOptions?.addButtonProps?.icon || "add"}</Icon></IconButton></Tooltip>
      )
    }

    if (uiOptions.allowDelete === true) {
      deleteButton = (
        <IconButton onClick={callDelete}><Icon>{uiOptions?.addButtonProps?.icon || "trash"}</Icon></IconButton>
      )
    }
    
    let searchField = null;    
    if(uiOptions?.search) {
      searchField = (<TextField key={"search"} title={"Search"} size="small" />);
    }

    let actions = null;

    if(numSelected > 0) {
      actions = (
        <DropDownMenu menus={[]}/>
      )
    }

    return (
      <Toolbar sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
        }),
      }}>
        {actions}
        {numSelected > 0 ? (
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {numSelected} selected
          </Typography>
        ) : (
          <Typography
            sx={{ flex: '1 1 100%' }}
            variant="h6"
            id="tableTitle"
            component="div"
          >
            {schema.title}
          </Typography>
        )}
        {numSelected === 0 && searchField}
        {numSelected === 0 && addButton}
        {numSelected > 0 && deleteButton}
    </Toolbar>
    )
  }

  try {
    return (
      <React.Fragment>
        {getToolbar()}
        <Table>        
          {getHeader()}
          {getBody()}
          {getPagination()}
          {getFooter()}
        </Table>
      </React.Fragment>
    )

  } catch (err) {
    return <>Something went wrong during the render of the data table, please <Button onClick={() => { setVersion(version + 1) }}>Retry</Button></>
  }



};

const MaterialTableWidgetComponent = compose(withReactory, withTheme, withStyles(ReactoryMaterialTableStyles))(ReactoryMaterialTable)
export default MaterialTableWidgetComponent

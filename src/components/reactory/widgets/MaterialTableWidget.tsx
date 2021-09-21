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
  Table,
  TableRow,
  TableFooter,
  TablePagination,
  Toolbar,
  Select,
  TableCell,

} from '@material-ui/core'
import MaterialTable, {
  MTableToolbar,
  MTableBody,
  MTablePagination,
  MTableBodyRow,
  MTableCell,
  MTableHeader,
} from 'material-table';

import {
  useMediaQuery
} from '@material-ui/core';

import { withApi } from '../../../api/ApiProvider';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { find, template, get } from 'lodash';
import { Styles } from '@material-ui/styles/withStyles/withStyles';
import Reactory from '@reactory/client-core/types/reactory';
import ReactoryApi from 'api';
import { QueryResult } from '@apollo/client';
import { Resolver } from 'dns';
import { useSizeSpec } from '@reactory/client-core/components/hooks/useSizeSpec';

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

const ReactoryMaterialTablePagination = (props) => {
  const { reactory, theme, schema, idShema, formContext, uiSchema, formData, rowsPerPageOptions = [5, 10, 25, 50, 100], tableRef, classes } = props;
  const { DropDownMenu } = reactory.getComponents(['core.DropDownMenu']);


  const { useState, useEffect } = React;

  const [version, setVersion] = useState(0);
  const sizeSpec = useSizeSpec();

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
            <MTablePagination {...{ ...props, classes: { root: classes.root } }} />
          </Grid>
        </Grid>
      </Grid>
    </td >
  )
}

const ReactoryMaterialTable = (props: ReactoryMaterialTableProps) => {

  const { reactory, theme, schema, idSchema, onChange, uiSchema = {}, formContext, formData = [], searchText = "" } = props;
  const uiOptions = uiSchema['ui:options'] || {};
  const AlertDialog = reactory.getComponent('core.AlertDialog@1.0.0');
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

          reactory.graphqlQuery(queryDefinition.text, variables, options).then((queryResult: any) => {
            reactory.log(`Result From Query`, { queryResult })
            if (queryResult.errors && queryResult.errors.length > 0) {
              //show a loader error
              reactory.log(`Error loading remote data for MaterialTableWidget`, { formContext, queryResult })
              // reactory.createNotification(`Could not fetch the data for this query due to an error`, { showInAppNotification: true, type: 'warning' })
            }

            if (queryResult.data) {

              response = reactory.utils.objectMapper(reactory.utils.lodash.cloneDeep(queryResult.data[queryDefinition.name]), uiOptions.resultMap || queryDefinition.resultMap);

              if (uiOptions.disablePaging === true) {
                response.page = 1,
                  response.totalCount = response.data.length;
              }


              response.page = response.page - 1;
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

  const rows = uiOptions.remoteData === true ? getData : formData;
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
          else return <Typography>🕘 ...</Typography>
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
            const mutationDefinition: Reactory.IReactoryFormMutation = 
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
        reactory.on(reactoryEvent.name, refresh);
      });
    };

    return willUnmount;
  }, []);

  try {
    return (
      <>
        <MaterialTable
          columns={columns || []}
          tableRef={tableRef}
          data={rows || []}
          title={schema.title || uiOptions.title || "no title"}
          options={options}
          actions={actions}
          components={components}
          detailPanel={detailsPanel} />
        {confirmDialog}
      </>
    )

  } catch (err) {
    return <>Something went wrong during the render of the data table, please <Button onClick={() => { setVersion(version + 1) }}>Retry</Button></>
  }



};

const MaterialTableWidgetComponent = compose(withApi, withTheme, withStyles(ReactoryMaterialTableStyles))(ReactoryMaterialTable)
export default MaterialTableWidgetComponent

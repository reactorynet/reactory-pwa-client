import React, { Fragment, useState, RefObject, PureComponent } from 'react'
import { styled } from '@mui/material/styles';
import { pullAt, isNil, remove, filter, isArray, throttle, ThrottleSettings } from 'lodash'
import {

  Grid2 as Grid,
  Typography,
  Button,
  IconButton,
  Fab,
  Icon,
  Theme,
  Toolbar,
  Select,
  Checkbox,
  Slider,
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
  TextField,
  Breakpoint

} from '@mui/material'
import { alpha, SxProps } from '@mui/material/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { compose } from 'redux'
import { useTheme } from '@mui/material/styles';
import { find, template, get } from 'lodash';

import Reactory, { ObjectMap } from '@reactory/reactory-core';
import ReactoryApi from 'api';
import { useSizeSpec } from '@reactory/client-core/components/hooks/useSizeSpec';
import { useNavigate } from 'react-router';
import { ReactoryFormUtilities } from '@reactory/client-core/components/reactory/form/types';
import { constants } from 'zlib';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

const PREFIX = 'MaterialTableWidgetComponent';

const classes = {
  root: `${PREFIX}-root`,
  chip: `${PREFIX}-chip`,
  newChipInput: `${PREFIX}-newChipInput`
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled('div')((
  {
    theme
  }
) => ({
  [`& .${classes.root}`]: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  [`& .${classes.chip}`]: {
    margin: theme.spacing(1),
  },

  [`& .${classes.newChipInput}`]: {
    margin: theme.spacing(1)
  }
}));

export interface MaterialTableRemoteDataReponse {
  data: any[],
  paging: {
    page: number
    pageSize: number
    hasNext: boolean
    total: number
  }
}

export interface ReactoryMaterialTableUISchema {
  'ui:title': string,
  'ui:widget': 'MaterialTableWidget',
  'ui:options': Reactory.Client.Components.IMaterialTableWidgetOptions
}

export interface ReactoryMaterialTableProps {
  reactory: ReactoryApi,
  theme: any,
  schema: Reactory.Schema.IArraySchema,
  uiSchema: ReactoryMaterialTableUISchema,
  idSchema: Reactory.Schema.IDSchema,
  formData: any[],
  formContext: any,
  paging: any,
  searchText: any,
  registry: {
    fields: { [key: string]: any },
    widgets: { [key: string]: any },
  },
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

/**
 * 
 */
export interface MaterialTableDetailPanelProps {
  rowData: any,
  rid: number,
  state: IRowState,
  [key: string]: any
}

export interface IRowState {

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

  /**
   * indicates if the row element is expanded
   */
  expanded?: boolean
}
export interface MaterialTableRowState {
  [key: number]: IRowState
}


export interface MaterialTableColumn<TRow> {
  field: string,
  title: string,
  renderRow?: (rowData: TRow, rowIndex: number, rowState: MaterialTableRowState) => JSX.Element
  renderHeader?: (data: TRow[], rowState: MaterialTableRowState) => JSX.Element
  renderFooter?: (data: TRow[], rowState: MaterialTableRowState) => JSX.Element
  renderCell?: (cellData: any, cellIndex: number, rowData: TRow[], rowIndex: number) => JSX.Element,
  footerProps?: any,
  headerProps?: any,
  rowProps?: any,
  altRowProps?: any,
  cellProps?: any
  sx?: SxProps<Theme>,
  format?: string
}


export interface MaterialTableOptions {
  //[key: string]: any
  rowStyle?: (rowData: any, idx: number) => any,
  rowSx?: SxProps<Theme>,
  headerStyle?: any,
  headerSx?: SxProps<Theme>,
  searchText?: string,  
  sort?: boolean,  
  sx?: SxProps<Theme>,
  /**
   * Enables or disables grouping
   */
  grouping?: boolean;
  /**
   * Group by fields
   */
  groupBy?: string[];

  /**
   * Enable search in toolbar
   */
  search?: boolean;
  /**
   * Show title in field
   */
  showTitle?: boolean;
  /**
   * Show or hide toolbar
   */
  toolbar?: boolean;
  /**
   * Enable or disable selection
   */
  selection?: boolean;
  /**
   * Page size
   */
  pageSize?: number;
  /**
   * Page size options
   */
  pageSizeOptions?: number[];
  /**
   * allow ordering
   */
  allowOrder?: boolean;
  /**
   * The field that we want to use for ordering the result
   */
  orderField?: string;
  /**
   * Allow Sort
   */
  sortFields?: { field: string; direction?: "asc" | "desc" }[];

  [key: string]: unknown;
}

export interface MaterialTablePagingState {
  activeRowsPerPage: number
}

const ReactoryMaterialTablePagination = (props) => {
  const {    
    theme,
    schema,
    idShema,
    formContext,
    uiSchema,
    formData,
    rowsPerPageOptions = [5, 10, 25, 50, 100],
    tableRef,    
  } = props;

  const reactory = useReactory();
  const { DropDownMenu } = reactory.getComponents<{ DropDownMenu: Reactory.Client.Components.DropDownMenu }>(['core.DropDownMenu']);


  const { useState, useEffect } = React;
  const [version, setVersion] = useState<number>(0);
  const navigation = useNavigate();

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

  const rowsPerPageDropDownProps: Reactory.UX.IDropDownMenuProps = {
    menus: rowsPerPageOptions ? rowsPerPageOptions.map((i) => ({
      key: i,
      title: `${i}`,
      selected: i === (props.rowsPerPage || 10)
    })) : [],
    onSelect: onMenuItemSelect,
    tooltip: "Click here to change the rows per page",
  }

  return (
    <td style={{ display: 'grid' }}>
      <Grid container spacing={2}>
        {show_totals === true && show_totals_label === true &&
          <Grid size={{ xs: 12, md: 12, lg: 12, xl: 12 }} sx={footerOptions.totalsRowStyle}>
            <div style={footerOptions.totalsCellStyle}>Totals</div>
          </Grid>}
        {show_totals === true && footerColumns !== undefined && footerColumns !== null &&
          <Grid size={{ xs: 12, md: 12, lg: 12, xl: 12 }} container spacing={0} style={{ display: 'flex', justifyContent: 'center' }}>
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
        <Grid container size={{ xs: 12, md: 12, lg: 12, xl: 12 }} spacing={0} style={{ justifyContent: 'flex-end' }}>

          <Grid container size={{ sm: 6, md: 2 }} style={{ justifyContent: 'flext-end', paddingRight: '10px' }}>
            <Grid size={{ sm: 8 }}>
              <Typography style={{ marginTop: '10px', float: 'right' }}>Total records:</Typography>
            </Grid>
            <Grid size={{ sm: 2 }}>
              <Typography style={{ marginTop: '10px', float: 'right' }}>{props.count || 0}</Typography>
            </Grid>
          </Grid>

          <Grid container size={{ sm: 6, md: 2 }} style={{ justifyContent: 'flext-end', paddingRight: '10px' }}>
            <Grid size={{ sm: 8 }}>
              <Typography style={{ marginTop: '10px', float: 'right' }}>{props.labelRowsPerPage} {props.rowsPerPage}</Typography>
            </Grid>
            <Grid size={{ sm: 2 }}>
              <DropDownMenu {...rowsPerPageDropDownProps} onSelect={onMenuItemSelect} />
            </Grid>
          </Grid>
          <Grid size={{ sm: 6, md: 4 }}>
            <TablePagination {...props} />
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

  return <Component {...props} />;

};

const ReactoryMaterialTable = (props: ReactoryMaterialTableProps) => {
  const theme: Theme & { MaterialTableWidget: any } = useTheme();
  const reactory = useReactory();
  const {    
    schema,
    idSchema,
    onChange,
    uiSchema = {},
    formContext = {},
    formData = [],
    searchText = "",
  } = props;

  let registry = props.registry;
  if (!props.registry) {
    const utils = reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities');
    registry = utils.getDefaultRegistry();
  }

  const uiOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = uiSchema['ui:options'] || {};
  const AlertDialog = reactory.getComponent<React.FC<any>>('core.AlertDialog@1.0.0');
  const DropDownMenu: Reactory.Client.Components.DropDownMenu = reactory.getComponent('core.DropDownMenu@1.0.0');

  const [activeAction, setActiveAction] = useState<{
    show: boolean,
    rowsSelected: any[],
    action?: Reactory.Client.Components.IMaterialTableWidgetAction
  }>({
    show: false,
    rowsSelected: [],
    action: null,
  });
  const navigation = useNavigate();

  const [selectedRows, setSelectedRows] = useState([]);
  const [version, setVersion] = useState(0);
  const [allChecked, setAllChecked] = useState<boolean>(false);
  const [allExpanded, setAllExpanded] = useState<boolean>(false);
  const [is_refreshing, setIsRefreshing] = useState(false);
  const [last_queried, setLastQueried] = useState(null);
  const [last_result, setLastResult] = useState(formData);
  const [rowsState, setRowState] = useState<MaterialTableRowState>({});
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [paginationCount, setPaginationCount] = useState<number>(10);
  const [page, setActivePage] = useState<number>(0);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState<MaterialTableQuery>({ page: 1, pageSize: 10, search: "" });
  const [searchInput, setSearchInput] = useState<string>(searchText);

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
  let components: { [key: string]: React.ComponentType<any> } = {};
  let detailsPanel: (props: MaterialTableDetailPanelProps) => JSX.Element = null;

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
      const DetailsPanelComponent = reactory.getComponent<React.FC<{ formContext: any, tableRef: any }>>(uiOptions.componentMap.DetailsPanel);

      if (DetailsPanelComponent) {
        detailsPanel = (detail_props: MaterialTableDetailPanelProps) => {
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

    reactory.debug('core.ReactoryMaterialTable data query', { query });

    let response: MaterialTableRemoteDataReponse = {
      ...data
    }

    try {
      const graphqlDefinitions = formContext.graphql;

      if (graphqlDefinitions.query || graphqlDefinitions.queries) {
        let queryDefinition: Reactory.Forms.IReactoryFormQuery = graphqlDefinitions.query;
        if (typeof uiOptions.query === 'string' && uiOptions.query !== 'query' && graphqlDefinitions.queries && graphqlDefinitions.queries[uiOptions.query]) {
          queryDefinition = graphqlDefinitions.queries[uiOptions.query];
          reactory.debug(`Switching Query definition to ==> ${uiOptions.query}`, queryDefinition);
        }

        reactory.debug(`MaterialTableWidget - Mapping variables for query`, { formContext, map: uiOptions.variables, query });
        let variableMap = uiOptions.variables || queryDefinition.variables;
        if (variableMap) {
          variableMap = reactory.utils.parseObjectMap(variableMap as ObjectMap);
        }
        let variables = reactory.utils.objectMapper({ formContext, query, props: queryDefinition.props || {} }, variableMap);

        variables = { ...variables, paging: { page: query.page, pageSize: query.pageSize } };
        reactory.debug('MaterialTableWidget - Mapped variables for query', { query, variables });

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
          reactory.log(`Error running query for grid`, { e });
          setError("Error executing query");
        }
        //show a loader error
        if (queryResult?.data) {
          const $data: any = reactory.utils.objectMapper(reactory.utils.lodash.cloneDeep(queryResult.data[queryDefinition.name]), uiOptions.resultMap || queryDefinition.resultMap);
          if ($data) {
            if (isArray($data) === true) response.data = $data;
            else {
              if ($data.data && isArray($data.data) === true) response.data = $data.data;
              if ($data.paging) response.paging = $data.paging
            }

            if ($data.data && $data.paging) {
              response.data = $data.data
              response.paging = $data.paging
            } else {
              if (isArray($data)) {
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
              if (reactory.utils.lodash.findIndex(formContext.$selectedRows.current, { id: item.id }) >= 0) {
                item.tableData = { checked: true, id: item_id }
              }
            });
          }
          //response.paging.page = response.paging.page - 1;
        } else {
          reactory.log(`Query returned null data`, { queryResult });
          setError("No data returned from query")
        }

        if (queryResult?.errors && queryResult.errors.length > 0) {
          reactory.log('Query contains errors', { queryResult });
        }
      }

    } catch (remoteDataError) {
      reactory.log(`Error getting remote data`, { remoteDataError });
      return response;
    }
    setData(response);
  };

  const rows = uiOptions.remoteData === true ? data?.data : formData;
  if (uiOptions.columns && uiOptions.columns.length) {
    let _columnRef = [];
    let _mergeColumns = false;
    let _columns = uiOptions.columns;

    if (isNil(uiOptions.columnsProperty) === false) {
      _columns = [...formContext.formData[uiOptions.columnsProperty as string]];
      if (isNil(uiOptions.columnsPropertyMap) === false) {
        _columns = reactory.utils.objectMapper(_columns, uiOptions.columnsPropertyMap as ObjectMap)
      }
    }

    remove(_columns, { selected: false });

    _columns.forEach(coldef => {

      const def: Reactory.Client.Components.MaterialTableWidgetColumnDefinition & { breakpoint?: string | number } = {
        ...coldef
      };      

      if (isNil(def.component) === false && def.component !== undefined) {        
        const ColRenderer = def.component.indexOf('.') > 0 ? 
          reactory.getComponent<React.FC<any>>(def.component) : 
          registry?.widgets?.[def.component];        
        // @ts-ignore       
        def.renderCell = (cellData, cellIndex, rowData, rowIndex) => {

          let props = { formData: cellData, rowData, api: reactory, reactory, formContext, cellData, cellIndex, rowIndex };
          let mappedProps = {};

          if (def.props) {
            props = { ...props, ...def.props, ...mappedProps, api: reactory, reactory, }
          }

          //check if there is a propsMap property
          //maps self props
          if (def.propsMap && props) {
            mappedProps = reactory.utils.objectMapper(props, reactory.utils.parseObjectMap(def.propsMap as any));
            props = { ...props, ...mappedProps, api: reactory, reactory };
          }

          if (ColRenderer) return <ColRenderer {...props} />
          else return <ReactoryMaterialTableWaitForRenderer {...props} componentId={def.component} DefaultComponent={<Root>...</Root>} />;
        }

        delete def.component;
      }

      if (isArray(def.components) === true) {
        reactory.log(`Rendering Chidren Elements`, def);
        const { components } = def;
        def.render = (rowData) => {
          reactory.log(`Child element to be rendered`, def);

          const childrenComponents = (components || []).map((componentDef, componentIndex) => {

            const ComponentToRender = componentDef.component.indexOf('.') ? 
              reactory.getComponent<React.FC>(componentDef.component) :
              registry.widgets[componentDef.component];

            let props = { formData: formContext.$formData, rowData, api: reactory, key: componentIndex, formContext, registry, };
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
            //@ts-ignore
            return <Fab
              color={buttonProps?.color || "default"}
              size={buttonProps.size ? buttonProps.size : "small"}>
              <Icon style={{ color: "#fff" }}>
                {buttonProps.icon}
              </Icon>
            </Fab>
          } else {
            return <Button>{buttonProps.text}</Button>
          }
        }
      }


      if (def.breakpoint) {
        const shouldBreak = useMediaQuery(theme.breakpoints.down(def.breakpoint as Breakpoint));

        if (shouldBreak === false) {
          reactory.log('MaterialTableWidget ==> Skipping column render', { shouldBreak, def });
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

  let options: MaterialTableOptions = {
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

        const isFunction = (condition: string) => { 
          return condition.indexOf('(rowData)') >= 0;
        }

        const isTemplate = (condition: string) => { 
          return condition.indexOf('${') >= 0;
        }

        const isRegex = (condition: string) => { 
          return condition.indexOf('^') >= 0 && condition.indexOf('$') >= 0;
        }

        uiOptions.conditionalRowStyling.forEach((option) => {
          const _field = get(rowData, option.field);
          let result: boolean = false;
          // support expressions in the condition
          if (isTemplate(option.condition)) {
            let templateFunction = reactory.utils.template(option.condition);
            result = templateFunction({ rowData }) === 'true';
          } else if (isFunction(option.condition)) {
            result = eval(option.condition)(rowData);
          } else if (isRegex(option.condition)) {
            // support regular expressions in the condition
            result = new RegExp(option.condition).test(_field);
          } else {
            result = _field.toLowerCase() == option.condition.toLowerCase();
          }

          if (result === true) {
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
        reactory.log(`core.MaterialTableWidget template render failed for search input`, { searchText: options.searchText, error: tErr });
      }
    }
  }

  const refreshHandler = (eventName: string, eventData: any) => {
    const uiOptions = uiSchema['ui:options'] || {};
    reactory.log(`MaterialTableWidget - Handled ${eventName}`, eventData);
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
        reactory.log(`Switching Query definition to ==> ${uiOptions.query}`, queryDefinition);
      }

      if (queryDefinition && queryDefinition.refreshEvents) {
        queryDefinition.refreshEvents.forEach((reactoryEvent) => {
          reactory.log(`MaterialTableWidget - Binding refresh event "${reactoryEvent.name}"`, undefined);
          reactory.on(reactoryEvent.name, onEventRefreshHandler);
        });
      }
    }

  }

  React.useEffect(() => {
    getData()
  }, [query])

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
        reactory.log(`MaterialTableWidget - Binding refresh event "${reactoryEvent.name}"`, undefined);
        reactory.on(reactoryEvent.name, refresh);
      });
    };

    if (uiOptions.remoteData === true) {
      getData()
    }

    return willUnmount;
  }, []);

  React.useEffect(() => {

    const newRowsState: MaterialTableRowState = { ...rowsState };

    const currentRows = uiOptions.remoteData === true ? data?.data : formData;

    currentRows?.forEach((row, rid) => {
      if (!newRowsState[rid]) {
        newRowsState[rid] = {
          dirty: false,
          editing: false,
          hover: false,
          saving: false,
          selected: allChecked,
        }
      } else {
        newRowsState[rid].selected = allChecked === true
      }
    });

    setRowState(newRowsState);

  }, [allChecked, data?.data, formData, uiOptions.remoteData])

  React.useEffect(() => {

    const newRowsState: MaterialTableRowState = { ...rowsState };

    if (isArray($rows) === false || $rows.length === 0 ) { 
      setRowState(newRowsState);
      return;
    }

    $rows?.forEach((row, rid) => {
      if (!newRowsState[rid]) {
        newRowsState[rid] = {
          dirty: false,
          editing: false,
          hover: false,
          saving: false,
          selected: allChecked,
          expanded: allExpanded
        }
      } else {
        newRowsState[rid].expanded = allExpanded === true
      }
    });

    setRowState(newRowsState);

  }, [allExpanded])

  // Sync allChecked state when individual selections change
  React.useEffect(() => {
    const currentRows = uiOptions.remoteData === true ? data?.data : formData;
    const selectedCount = Object.values(rowsState).filter(state => state.selected === true).length;
    const totalCount = currentRows?.length || 0;
    const isAllSelected = totalCount > 0 && selectedCount === totalCount;
    
    if (allChecked !== isAllSelected) {
      setAllChecked(isAllSelected);
    }
  }, [rowsState, data?.data, formData, uiOptions.remoteData])

  // Initialize row states when data changes
  React.useEffect(() => {
    const currentRows = uiOptions.remoteData === true ? data?.data : formData;
    if (!currentRows || currentRows.length === 0) return;

    const newRowsState: MaterialTableRowState = { ...rowsState };
    
    currentRows.forEach((row, rid) => {
      if (!newRowsState[rid]) {
        newRowsState[rid] = {
          dirty: false,
          editing: false,
          expanded: false,
          hover: false,
          saving: false,
          selected: false,
        }
      }
    });

    setRowState(newRowsState);
  }, [data?.data, formData, uiOptions.remoteData])

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

    let $headers: JSX.Element[] = [];

    if (options.toolbar === false) return null;

    if (detailsPanel) {
      const toggleExpandAll = () => {
        setAllExpanded(!allExpanded)
      }

      $headers.push((<TableCell key={'header_expand_collapse'}>
        <IconButton onClick={toggleExpandAll}>
          <Icon>{allExpanded ? 'unfold_less' : 'unfold_more'}</Icon>
        </IconButton>
      </TableCell>))
    }


    if (options.selection === true) {
      // Calculate header checkbox state
      const currentRows = uiOptions.remoteData === true ? data?.data : formData;
      const selectedCount = Object.values(rowsState).filter(state => state.selected === true).length;
      const totalCount = currentRows?.length || 0;
      const isAllSelected = totalCount > 0 && selectedCount === totalCount;
      const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

      const toggleSelectAll = () => {
        const newAllChecked = !isAllSelected;
        setAllChecked(newAllChecked);
      }

      $headers.push((<TableCell key={'header_selection'}>
        <Checkbox 
          checked={isAllSelected} 
          indeterminate={isIndeterminate}
          onClick={toggleSelectAll} 
        />
      </TableCell>))
    }

    columns.forEach((column: MaterialTableColumn<any>, idx) => {
      const {
        title,
        renderHeader,
        field,

      } = column

      if (renderHeader) $headers.push(renderHeader($rows, rowsState))

      $headers.push((<TableCell key={idx} width={`${(100 / columns.length)}%`}>{title}</TableCell>))
    });


    return (
      <TableHead>
        <TableRow>
          {$headers}
        </TableRow>
      </TableHead>)
  }

  /**
   * Returns the selected rows across all pages for the 
   * current query.
   */
  const getSelectedRows = () => {
    let selected = [];
    const currentRows = uiOptions.remoteData === true ? data?.data : formData;
    
    if (!currentRows) return selected;
    
    Object.keys(rowsState).forEach(key => {
      const rid = parseInt(key);
      const rowState = rowsState[rid];
      // Only include rows that are actually selected
      if (rowState && rowState.selected === true && currentRows[rid]) {
        selected.push(currentRows[rid]);
      }
    });
    return selected;
  }

  const getRowActions = (): Reactory.Client.Components.IMaterialTableWidgetAction[] => {

    let rowActions: Reactory.Client.Components.IMaterialTableWidgetAction[] = [];

    if (uiOptions.actions) {
      rowActions = reactory.utils.lodash.filter(uiOptions.actions, (action: Reactory.Client.Components.IMaterialTableWidgetAction) => {
        return action.isFreeAction === false || action.isFreeAction === undefined || action.isFreeAction === null
      })
    }

    return rowActions;
  }

  const getRow = (row, rid: number, rowActions: Reactory.Client.Components.IMaterialTableWidgetAction[] = []): JSX.Element[] => {
    const $rState: IRowState = rowsState[rid] || { dirty: false, editing: false, expanded: false, hover: false, saving: false, selected: false }

    const {
      expanded = false,
      selected = false,
    } = $rState;

    let $DetailComponent = null;
    if (detailsPanel && expanded === true) {
      $DetailComponent = detailsPanel({ rid, rowData: row, state: $rState })
    }
    const $cols = [];

    if (detailsPanel) {

      const toggleDetailsPanel = (evt) => {
        let newRowState = { ...rowsState };
        if (!newRowState[rid]) newRowState[rid] = { expanded: false, selected: false };
        newRowState[rid].expanded = !expanded
        setRowState(newRowState)
      };

      $cols.push((<TableCell key={`row_${rid}_expand`}>
        <IconButton onClick={toggleDetailsPanel}>
          <Icon>{expanded === true ? 'expand_less' : 'expand_more'}</Icon>
        </IconButton>
      </TableCell>));
    }

    if (options.selection === true) {
      const toggleSelect = (evt) => {
        let newRowState = { ...rowsState };
        if (!newRowState[rid]) newRowState[rid] = { expanded: false, selected: false };
        newRowState[rid].selected = !selected
        setRowState(newRowState)
      };

      $cols.push((
        <TableCell key={`row_${rid}_select`}>
          <Checkbox onClick={toggleSelect} checked={selected === true}></Checkbox>
        </TableCell>
      ))
    }

    const rowActionComponents = [];
    if (rowActions?.length > 0) {
    }

    columns.forEach((column: MaterialTableColumn<any>, columnIndex: number) => {
      const cellData = row[column.field];
      if (column.renderCell) { 
        $cols.push((<TableCell key={columnIndex} sx={column?.sx}>{column.renderCell(cellData, columnIndex, row, rid)}</TableCell>));
      }
      else { 
        // default cell renderer.
        // check if the column has a format property        
        let cellText = cellData;
        if (column.format) {
          try {
            cellText = reactory.utils.template(column.format)({ row, column, reactory, cellData, rowData: row, utils: reactory.utils });
          } catch (error) {
            reactory.error(`Error formatting cell data for column ${column.field}`, { error, column, row, cellData });
            cellText = error.message;
          }
          
        }
        $cols.push((<TableCell key={columnIndex} sx={column?.sx}>{cellText}</TableCell>))
      }
    });



    let rowComponents: JSX.Element[] = [(<TableRow key={rid} sx={row.sx}>
      {$cols}
    </TableRow>)];

    const colCount = () => {
      let additionalCols = 0;

      if (actions.length > 0) additionalCols + 1;

      if (options.selection === true) additionalCols + 1;

      return $cols.length + additionalCols
    }

    if ($DetailComponent) {
      rowComponents.push((<TableRow key={`${rid}_details`} sx={row?.sx}>
        <TableCell colSpan={colCount()} sx={uiOptions?.detailPanelProps?.sx}>
          {$DetailComponent}
        </TableCell>
      </TableRow>))
    }


    return rowComponents;
  }

  const getBody = () => {
    const rowActions = getRowActions();
    let $body_rows = [];
    $rows.forEach((row, rid) => {
      $body_rows.push(...getRow(row, rid, rowActions))
    });

    if ($body_rows.length === 0) {
      $body_rows.push((
        <TableRow key={0}>
          <TableCell colSpan={columns.length}>
            {/* @ts-ignore */}
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

    if ($columns.length === 0) return null;

    return (
      <TableFooter>
        <TableRow key={`${idSchema.$id}_footer`}>
          {$columns.map((footerColumn: MaterialTableColumn<any>) => {
            return footerColumn.renderFooter($rows, rowsState);
          })}
        </TableRow>
      </TableFooter>)
  }

  const getPagination = () => {
    if (uiOptions?.pagination !== null && uiOptions?.pagination === false) return null;
    return (
      <Table id={`${idSchema.$id}_paging_table`} >
        <TableBody>
          <TableRow key={`${idSchema.$id}_pagination`}>
            <TableCell colSpan={columns.length}>
              <TablePagination
                count={data?.paging?.total || 0}
                page={query.page - 1}
                rowsPerPage={query?.pageSize || 10}
                component={"div"}
                rowsPerPageOptions={uiOptions?.options?.pageSizeOptions || [5, 10, 25, 50, 100]}
                onRowsPerPageChange={(evt) => {
                  setQuery({
                    ...query,
                    pageSize: parseInt(evt.target.value)
                  })
                }}
                onPageChange={(evt, nextPage) => {
                  setQuery({
                    ...query,
                    page: nextPage + 1
                  })
                }}
              >
              </TablePagination>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>)
  }

  const processAction = async (): Promise<any> => {
    let selected = getSelectedRows();

    const { action } = activeAction;
    if (action.mutation) {
      const mutationDefinition: Reactory.Forms.IReactoryFormMutation =
        formContext.graphql.mutation[action.mutation];
      const mutationResult = await reactory.graphqlMutation(mutationDefinition.text, reactory.utils.objectMapper({ ...props, selected }, mutationDefinition.variables));
      reactory.log(`MaterialTableWidget --> action mutation ${action.mutation} result`, { mutationDefinition, self, mutationResult, selected })
      let has_errors = false;

      if (!mutationResult.errors && mutationResult.data[mutationDefinition.name]) {

        if (uiOptions.remoteData === true) {
          // if (tableRef.current && tableRef.current.onQueryChange) {
          //   tableRef.current.onQueryChange()
          // }
          getData();
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
              reactory.log(`${formContext.signature} function handler for event ${mutationDefinition.onSuccessEvent.name} threw an unhandled error`, { notHandledByForm, props: _method_props });
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
      //reactory.createNotification(`Could not execute action ${rejectedError.message}`, { showInAppNotification: true, type: 'error' });

      setActiveAction({ show: false, action: null, rowsSelected: [] });
      return;
    }

    if (action.event) {
      let __formData = {
        ...formContext.$formData,
        ...reactory.utils.objectMapper({ selected, data, formContext, uiSchema, schema, reactory }, action.event.paramsMap || {}),
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

        await handler(__formData);
        setActiveAction({ show: false, action: null, rowsSelected: [] });
      };

      if (action.event.via === 'api') {

        let handler = () => {
          reactory.emit(action.event.name, __formData);
        }

        await handler();
        setActiveAction({ show: false, action: null, rowsSelected: [] });
      }

      if (action.event.via === "component" && action.event.component) {
        const component = reactory.getComponent(action.event.component);
        if (typeof component[action.event.name] === "function") {
          await component[action.event.name](__formData)
          setActiveAction({ show: false, action: null, rowsSelected: [] });
        } else {
          reactory.error(`Could not find method ${action.event.name} in component ${action.event.component}`, { component });
          reactory.createNotification(`Could not find method ${action.event.name} in component ${action.event.component}`, { 
            type: 'error',
            showInAppNotification: true,            
          });
        }
        
        setActiveAction({ show: false, action: null, rowsSelected: [] });
      }
    }

    
  }

  const getToolbar = () => {

    // Calculate selected count more efficiently
    const selectedCount = Object.values(rowsState).filter(state => state.selected === true).length;
    let selected = getSelectedRows();

    let addButton = null;
    let deleteButton = null;

    if (uiOptions?.componentMap && uiOptions.componentMap.Toolbar) {
      //get custom toolbar
      const ToolbarComponent = reactory.getComponent(uiOptions.componentMap.Toolbar);
      if (ToolbarComponent) {
        // @ts-ignore
        return <ToolbarComponent 
          reactory={reactory} 
          data={{
            data: data?.data || [],
            paging: data?.paging || {
              hasNext: false,
              page: 0,
              pageSize: 10,
              total: 0
            },
            selected: getSelectedRows()
          }} 
          // @ts-ignore
          onDataChange={() => {
            // console log for now
            console.log('onDataChange', data);
          }} 
          searchText={searchText} 
          // @ts-ignore
          //onSearchChange={onSearchChange} />
          />
      }
    }

    const callAdd = () => {
      if (uiOptions?.addButtonProps) {
        const { onClick, onClickProps = {}, onClickPropsMap = {} } = uiOptions?.addButtonProps;

        if (onClick?.length > 0) {
          const [onClickComponent, onClickName] = onClick.split("/");
          // check if the onclick is a navigation event
          if (onClickComponent === "navigation" && onClickName === "navigate") {
            
            // @ts-ignore
            navigation(reactory.utils.template(onClickProps.path)({ reactory, formContext, formData: $rows }));
            return;
          }

          const $component = reactory.getComponent(onClickComponent);
          if ($component && typeof $component[onClickName] === "function") {
            let $props = { ...(onClickProps as Object) };
            if (Object.keys(onClickPropsMap).length > 0) {
              $props = reactory.utils.objectMapper({ rowsState, rows: $rows }, onClickPropsMap);
              $props = { ...(onClickProps as Object), ...$props }
            }
            $component[onClickName]($props);
          }
        }
      }
    }

    const callDelete = () => {
      if (uiOptions?.deleteButtonProps) {
        const { onClick, onClickProps = {}, onClickPropsMap = {} } = uiOptions?.deleteButtonProps;
        if (onClick?.length > 0) {
          const [onClickComponent, onClickName] = onClick.split("/");
        
          if (onClickComponent === "navigation" && onClickName === "navigate") {
            // @ts-ignore
            navigation(reactory.utils.template(onClickProps.path)({ reactory, formContext, formData: $rows }));
            return;
          }

          const $component = reactory.getComponent(onClickComponent);
          if ($component && typeof $component[onClickName] === "function") {
            let $props = { ...(onClickProps as Object) };
            if (Object.keys(onClickPropsMap).length > 0) {
              $props = reactory.utils.objectMapper({ rowsState, rows: $rows }, onClickPropsMap);
              $props = { ...(onClickProps as Object), ...$props }
            }
            $component[onClickName]($props);
          }
        }
      }
    }

    if (uiOptions?.allowAdd === true) {
      addButton = (
        <Tooltip title={reactory.i18n.t(uiOptions?.addButtonProps?.tooltip || `Click to add a new entry`)}>
          <IconButton onClick={callAdd}>
            <Icon>{uiOptions?.addButtonProps?.icon || "add"}</Icon>
          </IconButton>
        </Tooltip>
      )
    }

    if (uiOptions?.allowDelete === true) {
      deleteButton = (
        <Tooltip title={reactory.i18n.t(uiOptions?.deleteButtonProps?.tooltip || `Click to delete entry`)}>
          <IconButton onClick={callDelete}>
            <Icon>{uiOptions?.deleteButtonProps?.icon || "trash"}</Icon>
          </IconButton>
        </Tooltip>
      )
    }

    let searchField = null;
    if (uiOptions?.search) {
      const searchLableText = reactory.i18n.t("reactory:common.search", "Search", {})
      searchField = (
        <TextField
          style={{ minWidth: 200 }}
          key={"search"}
          title={searchLableText}
          label={searchLableText}
          size="small"
          placeholder={searchLableText}
          value={searchInput}
          onChange={(evt) => {
            setSearchInput(evt.target.value);
          }}
          onKeyPress={(evt) => {
            if (evt.key === "Enter") {
              setData({
                ...data,
                paging: {
                  ...data.paging,
                  page: 0
                }
              })
              setQuery({ ...query, search: searchInput });
            }
          }}
        />);
    }

    let actions = null;

    if (selectedCount > 0 && uiOptions?.actions?.length > 0) {
      let $menus: Reactory.UX.IDataDropDownMenuItem<Reactory.Client.Components.IMaterialTableWidgetAction>[] = [];

      uiOptions.actions.forEach((action, actionIndex) => {
        const {
          key,
          componentFqn,
          confirmation,
          event,
          isFreeAction,
          mutation,
          icon,
          iconProps,
          propsMap,
          tooltip,
          title,
        } = action;

        if (isFreeAction === true) {
          $menus.push({
            id: key,
            icon: icon,
            title: reactory.utils.template(reactory.i18n.t(title, { selected, action, reactory }), {})({ reactory, action, selected }),
            data: action,
          })
        }

      });

      const onMenuSelect = (evt, menu) => {
        const { data } = menu as Reactory.UX.IDataDropDownMenuItem<Reactory.Client.Components.IMaterialTableWidgetAction>

        if (data.confirmation === null) {
          //process the action

        }

        setActiveAction({ action: data, show: data.confirmation !== null, rowsSelected: selected })

      }

      actions = (
        <DropDownMenu menus={$menus} onSelect={onMenuSelect} />
      )
    }

    return (
      <Table id={`${idSchema.$id}_toolbar`}>
        <TableBody>
          <TableRow>
            <TableCell colSpan={columns.length}>
              <Toolbar sx={{
                pl: { sm: 2 },
                pr: { xs: 1, sm: 1 },
                ...(selectedCount > 0 && {
                  bgcolor: (theme) =>
                    alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
                }),
              }}>
                {actions}
                {selectedCount > 0 ? (
                  <>
                    <Typography
                      sx={{ flex: '1 1 100%' }}
                      color="inherit"
                      variant="subtitle1"
                      component="div"
                    >
                      {selectedCount} selected
                    </Typography>
                    {deleteButton}
                  </>
                ) : (
                  <>
                    <Typography
                      sx={{ flex: '1 1 100%' }}
                      variant="h6"
                      id="tableTitle"
                      component="div"
                    >
                      {schema.title}
                    </Typography>
                    {searchField}
                    {addButton}
                  </>
                )}
              </Toolbar>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  const getTableStyles = (): React.CSSProperties => {
    return {}
  }

  let confirmDialog = null;
  if (activeAction.show === true) {

    confirmDialog = (
      <AlertDialog
        open={true}
        title={
          activeAction.action.confirmation?.title.indexOf("${") > -1 ?
            reactory.utils.template(activeAction.action.confirmation.title)({ reactory, data, selected: activeAction.rowsSelected }) :
            reactory.i18n.t(activeAction.action.confirmation.title, { reactory, data, selected: activeAction.rowsSelected })
        }
        content={activeAction.action.confirmation?.content.indexOf("${") > -1 ?
          reactory.utils.template(activeAction.action.confirmation.content)({ reactory, data, selected: activeAction.rowsSelected }) :
          reactory.i18n.t(activeAction.action.confirmation.content, { reactory, data, selected: activeAction.rowsSelected })
        }
        onAccept={async () => {
          await processAction();
        }}
        onClose={() => {
          setActiveAction({ show: false, action: null, rowsSelected: [] });
        }}
        cancelTitle={
          activeAction.action.confirmation?.cancelTitle.indexOf("${") > -1 ?
            reactory.utils.template(activeAction.action.confirmation.cancelTitle)({ reactory, data, selected: activeAction.rowsSelected }) :
            reactory.i18n.t(activeAction.action.confirmation.cancelTitle, { reactory, data, selected: activeAction.rowsSelected })}
        acceptTitle={
          activeAction.action.confirmation?.acceptTitle.indexOf("${") > -1 ?
            reactory.utils.template(activeAction.action.confirmation.acceptTitle)({ reactory, data, selected: activeAction.rowsSelected }) :
            reactory.i18n.t(activeAction.action.confirmation.acceptTitle, { reactory, data, selected: activeAction.rowsSelected })}
        titleProps={activeAction.action.confirmation.titleProps}
        contentProps={activeAction.action.confirmation.contentProps}
        cancelProps={activeAction.action.confirmation.cancelProps}
        confirmProps={activeAction.action.confirmation.confirmProps}
      />);
  }

  try {
    return (
      <>
        {getToolbar()}
        <Table id={`${idSchema.$id}_table`} style={getTableStyles()}>
          {getHeader()}
          {getBody()}
          {getFooter()}
        </Table>
        {getPagination()}
        {confirmDialog}
      </>
    )
  } catch (err) {
    reactory.log(`Error rendering MaterialTable:\n${err.message}`, { error: err });
    return <>Something went wrong during the render of the data table, please <Button onClick={() => { setVersion(version + 1) }}>Retry</Button></>
  }
};

export default ReactoryMaterialTable;

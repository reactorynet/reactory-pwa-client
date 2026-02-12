import React, { Fragment, useState, RefObject, PureComponent, useCallback, useMemo, useRef } from 'react'
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
  TableContainer,
  TableRow,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TablePagination,
  Paper,
  Tooltip,
  TextField,
  Breakpoint,
  Box,

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
import { ColumnHeader, ColumnHeaderConfig } from './components/ColumnHeader';

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


/**
 * Header configuration options for enhanced column header rendering
 */
export interface ColumnHeaderConfiguration {
  /**
   * Custom header renderer component FQN (e.g., 'custom.MyColumnHeader@1.0.0')
   */
  headerComponent?: string;
  /**
   * Props to pass to the custom header component
   */
  headerComponentProps?: Record<string, unknown>;
  /**
   * Props map for dynamic prop resolution
   */
  headerComponentPropsMap?: Record<string, unknown>;
  /**
   * i18n key for the column title
   */
  titleKey?: string;
  /**
   * Icon to display in the header
   */
  icon?: string;
  /**
   * Position of the icon relative to the title
   */
  iconPosition?: 'left' | 'right';
  /**
   * Icon color
   */
  iconColor?: string;
  /**
   * Header text color
   */
  color?: string;
  /**
   * Header background color
   */
  backgroundColor?: string;
  /**
   * Enable sorting for this column
   */
  sortable?: boolean;
  /**
   * Enable filtering for this column
   */
  filterable?: boolean;
  /**
   * Custom filter component FQN
   */
  filterComponent?: string;
  /**
   * Tooltip text
   */
  tooltip?: string;
  /**
   * i18n key for tooltip
   */
  tooltipKey?: string;
  /**
   * Header text alignment
   */
  align?: 'left' | 'center' | 'right';
  /**
   * Custom header cell styles
   */
  headerSx?: SxProps<Theme>;
  /**
   * CSS class name
   */
  headerClassName?: string;
  /**
   * Minimum width
   */
  minWidth?: number | string;
  /**
   * Maximum width
   */
  maxWidth?: number | string;
  /**
   * Disable text wrapping
   */
  noWrap?: boolean;
  /**
   * Typography variant
   */
  variant?: 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption';
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
  format?: string,
  /**
   * Enhanced header configuration options
   */
  header?: ColumnHeaderConfiguration
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

/**
 * Component that waits for a Reactory component to become available.
 * Uses efficient polling (100ms) instead of slow polling (777ms).
 */
const ReactoryMaterialTableWaitForRenderer = (props) => {
  const { reactory, componentId, DefaultComponent } = props;
  const [component, setComponent] = React.useState<React.ComponentType<any> | null>(() => {
    // Check if component is already available on initial render
    return reactory?.componentRegister?.[componentId] || null;
  });
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    
    // If component is already loaded, no need to poll
    if (component) return;

    // Check more frequently (100ms) for better UX
    const checkInterval = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(checkInterval);
        return;
      }
      
      const loadedComponent = reactory?.componentRegister?.[componentId];
      if (loadedComponent) {
        clearInterval(checkInterval);
        setComponent(loadedComponent);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
    }, 10000);

    return () => {
      mountedRef.current = false;
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [componentId, reactory, component]);

  if (!component) {
    return DefaultComponent;
  }

  const Component = component;
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
  const [isLoading, setIsLoading] = useState<boolean>(false); // Track data loading state
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

  const tableRef = useRef<any>(null);

  let columns = [];
  let actions = [];

  let ToolbarComponent = null;
  let components: { [key: string]: React.ComponentType<any> } = {};
  let detailsPanel: (props: MaterialTableDetailPanelProps) => JSX.Element = null;

  // Track component loading state to avoid repeated polling
  const [componentsLoaded, setComponentsLoaded] = useState<{
    toolbar: boolean;
    detailsPanel: boolean;
  }>({ toolbar: false, detailsPanel: false });
  
  const componentLoadingRef = useRef<{ interval?: NodeJS.Timeout }>({});

  // Memoize toolbar component setup
  const toolbarComponentId = uiOptions.componentMap?.Toolbar;
  const detailsPanelComponentId = uiOptions.componentMap?.DetailsPanel;

  // Effect to handle component loading with efficient polling
  React.useEffect(() => {
    if (!toolbarComponentId && !detailsPanelComponentId) return;
    
    const checkComponents = () => {
      let updated = false;
      const newState = { ...componentsLoaded };
      
      if (toolbarComponentId && !componentsLoaded.toolbar) {
        const comp = reactory.componentRegister?.[toolbarComponentId];
        if (comp) {
          newState.toolbar = true;
          updated = true;
        }
      }
      
      if (detailsPanelComponentId && !componentsLoaded.detailsPanel) {
        const comp = reactory.componentRegister?.[detailsPanelComponentId];
        if (comp) {
          newState.detailsPanel = true;
          updated = true;
        }
      }
      
      if (updated) {
        setComponentsLoaded(newState);
      }
      
      // Stop polling when all components are loaded
      const allLoaded = 
        (!toolbarComponentId || newState.toolbar) && 
        (!detailsPanelComponentId || newState.detailsPanel);
      
      if (allLoaded && componentLoadingRef.current.interval) {
        clearInterval(componentLoadingRef.current.interval);
        componentLoadingRef.current.interval = undefined;
      }
    };
    
    // Initial check
    checkComponents();
    
    // Start polling only if needed
    const needsPolling = 
      (toolbarComponentId && !componentsLoaded.toolbar) ||
      (detailsPanelComponentId && !componentsLoaded.detailsPanel);
    
    if (needsPolling && !componentLoadingRef.current.interval) {
      componentLoadingRef.current.interval = setInterval(checkComponents, 100);
    }
    
    return () => {
      if (componentLoadingRef.current.interval) {
        clearInterval(componentLoadingRef.current.interval);
      }
    };
  }, [toolbarComponentId, detailsPanelComponentId, componentsLoaded, reactory.componentRegister]);

  // Build component map using loaded components
  if (uiOptions.componentMap) {
    if (toolbarComponentId) {
      ToolbarComponent = reactory.getComponent(toolbarComponentId);
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
      }
      // No more setTimeout - the effect handles re-checking
    }

    if (detailsPanelComponentId) {
      const DetailsPanelComponent = reactory.getComponent<React.FC<{ formContext: any, tableRef: any }>>(detailsPanelComponentId);

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



  // Memoize getData with useCallback to prevent unnecessary re-creation
  const getData = useCallback(async (): Promise<MaterialTableRemoteDataReponse> => {
    reactory.debug('core.ReactoryMaterialTable data query', { query });

    // Set loading state
    setIsLoading(true);
    setError(null);

    let response: MaterialTableRemoteDataReponse = {
      data: data?.data || [],
      paging: data?.paging || { hasNext: false, page: 0, pageSize: 10, total: 0 }
    };

    try {
      const graphqlDefinitions = formContext.graphql;

      if (graphqlDefinitions?.query || graphqlDefinitions?.queries) {
        let queryDefinition: Reactory.Forms.IReactoryFormQuery = graphqlDefinitions.query;
        if (typeof uiOptions.query === 'string' && uiOptions.query !== 'query' && graphqlDefinitions.queries && graphqlDefinitions.queries[uiOptions.query]) {
          queryDefinition = graphqlDefinitions.queries[uiOptions.query];
          reactory.debug(`Switching Query definition to ==> ${uiOptions.query}`, queryDefinition);
        }

        if (!queryDefinition) {
          return response;
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
          return response;
        }

        if (queryResult?.data) {
          const $data: any = reactory.utils.objectMapper(
            reactory.utils.lodash.cloneDeep(queryResult.data[queryDefinition.name]),
            uiOptions.resultMap || queryDefinition.resultMap
          );
          
          if ($data) {
            if (isArray($data) === true) {
              response.data = $data;
            } else {
              if ($data.data && isArray($data.data) === true) response.data = $data.data;
              if ($data.paging) response.paging = $data.paging;
            }

            if ($data.data && $data.paging) {
              response.data = $data.data;
              response.paging = $data.paging;
            } else if (isArray($data)) {
              response.data = $data;
            }
          }

          if (uiOptions.disablePaging === true) {
            response.paging.page = 1;
            response.paging.total = response.data.length;
          }

          if (formContext.$selectedRows && formContext.$selectedRows.current) {
            response.data.forEach((item, item_id) => {
              if (reactory.utils.lodash.findIndex(formContext.$selectedRows.current, { id: item.id }) >= 0) {
                item.tableData = { checked: true, id: item_id };
              }
            });
          }
        } else {
          reactory.log(`Query returned null data`, { queryResult });
          setError("No data returned from query");
        }

        if (queryResult?.errors && queryResult.errors.length > 0) {
          reactory.log('Query contains errors', { queryResult });
        }
      }
    } catch (remoteDataError) {
      reactory.log(`Error getting remote data`, { remoteDataError });
      setIsLoading(false);
      return response;
    }
    
    setData(response);
    setIsLoading(false);
    return response;
  }, [query, formContext.graphql, uiOptions.query, uiOptions.variables, uiOptions.resultMap, uiOptions.disablePaging, formContext.$selectedRows, reactory]);

  const rows = uiOptions.remoteData === true ? data?.data : formData;

  // Extract unique breakpoints from columns for responsive filtering
  // This must be done at the top level to comply with Rules of Hooks
  const columnBreakpoints = useMemo(() => {
    const breakpoints = new Set<Breakpoint>();
    const cols = uiOptions.columns || [];
    cols.forEach((col: any) => {
      if (col.breakpoint) {
        breakpoints.add(col.breakpoint as Breakpoint);
      }
    });
    return Array.from(breakpoints);
  }, [uiOptions.columns]);

  // Call useMediaQuery at top level for each unique breakpoint (max ~5 breakpoints: xs, sm, md, lg, xl)
  const isXsDown = useMediaQuery(theme.breakpoints.down('xs'));
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));
  const isLgDown = useMediaQuery(theme.breakpoints.down('lg'));
  const isXlDown = useMediaQuery(theme.breakpoints.down('xl'));

  // Map breakpoints to their media query results
  const breakpointMatches = useMemo(() => ({
    xs: isXsDown,
    sm: isSmDown,
    md: isMdDown,
    lg: isLgDown,
    xl: isXlDown,
  }), [isXsDown, isSmDown, isMdDown, isLgDown, isXlDown]);

  // Memoize column building to avoid expensive re-computation on every render
  const processedColumns = useMemo(() => {
    const result: MaterialTableColumn<any>[] = [];
    
    if (!uiOptions.columns || !uiOptions.columns.length) {
      return result;
    }

    let _columns = uiOptions.columns;

    if (isNil(uiOptions.columnsProperty) === false) {
      _columns = [...(formContext.formData?.[uiOptions.columnsProperty as string] || [])];
      if (isNil(uiOptions.columnsPropertyMap) === false) {
        _columns = reactory.utils.objectMapper(_columns, uiOptions.columnsPropertyMap as ObjectMap)
      }
    }

    // Filter out unselected columns
    _columns = _columns.filter((col: any) => col.selected !== false);

    _columns.forEach((coldef: any) => {
      const def: Reactory.Client.Components.MaterialTableWidgetColumnDefinition & { breakpoint?: string | number } = {
        ...coldef
      };

      if (isNil(def.component) === false && def.component !== undefined) {
        const ColRenderer = def.component.indexOf('.') > 0
          ? reactory.getComponent<React.FC<any>>(def.component)
          : registry?.widgets?.[def.component];
        // @ts-ignore
        def.renderCell = (cellData, cellIndex, rowData, rowIndex) => {
          let props = { formData: cellData, rowData, api: reactory, reactory, formContext, cellData, cellIndex, rowIndex };
          let mappedProps = {};

          if (def.props) {
            props = { ...props, ...def.props, ...mappedProps, api: reactory, reactory };
          }

          if (def.propsMap && props) {
            mappedProps = reactory.utils.objectMapper(props, reactory.utils.parseObjectMap(def.propsMap as any));
            props = { ...props, ...mappedProps, api: reactory, reactory };
          }

          if (ColRenderer) return <ColRenderer {...props} />;
          else return <ReactoryMaterialTableWaitForRenderer {...props} componentId={def.component} DefaultComponent={<Root>...</Root>} />;
        };

        delete def.component;
      }

      if (isArray(def.components) === true) {
        const { components } = def;
        def.render = (rowData) => {
          const childrenComponents = (components || []).map((componentDef, componentIndex) => {
            const ComponentToRender = componentDef.component.indexOf('.')
              ? reactory.getComponent<React.FC>(componentDef.component)
              : registry.widgets[componentDef.component];

            let props = { formData: formContext.$formData, rowData, api: reactory, key: componentIndex, formContext, registry };
            let mappedProps = {};

            if (componentDef.props) {
              props = { ...props, ...componentDef.props, ...mappedProps, api: reactory };
            }

            if (componentDef.propsMap && props) {
              mappedProps = reactory.utils.objectMapper(props, componentDef.propsMap);
              props = { ...props, ...mappedProps, api: reactory };
            }
            if (ComponentToRender) return <ComponentToRender {...props} />;
            else return <Typography key={componentIndex}>Renderer {componentDef.component} Not Found</Typography>;
          });

          return (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              {childrenComponents}
            </div>
          );
        };

        delete def.components;
      }

      if (def.props && def.props.actionButton) {
        def.render = (rowData) => {
          const buttonProps = def.props.actionButton;
          if (buttonProps.icon) {
            // Cast color and size as any since they come from dynamic form configuration
            const fabColor = (buttonProps?.color || "default") as any;
            const fabSize = (buttonProps.size ? buttonProps.size : "small") as any;
            return (
              <Fab color={fabColor} size={fabSize}>
                <Icon style={{ color: '#fff' }}>{buttonProps.icon}</Icon>
              </Fab>
            );
          } else {
            return <Button>{buttonProps.text}</Button>;
          }
        };
      }

      // Check breakpoint using pre-computed media query results (no hook violation)
      if (def.breakpoint) {
        const shouldBreak = breakpointMatches[def.breakpoint as keyof typeof breakpointMatches];
        // Only include column if we're NOT at or below the breakpoint
        if (shouldBreak === false) {
          result.push(def as MaterialTableColumn<any>);
        }
      } else {
        result.push(def as MaterialTableColumn<any>);
      }
    });

    return result;
  }, [
    uiOptions.columns,
    uiOptions.columnsProperty,
    uiOptions.columnsPropertyMap,
    formContext.formData,
    formContext.$formData,
    reactory,
    registry,
    breakpointMatches
  ]);

  // Use processed columns
  columns = processedColumns;

  const view_mode = localStorage.getItem('$reactory$theme_mode') || "light";
  const isDarkMode = theme.palette.mode === 'dark';
  
  let theme_alt_rowStyle = {};
  let theme_row_style = {};
  let theme_selected_style = {};
  
  // Default header style using MUI theme colors - respects dark/light mode
  let theme_header_style: Record<string, unknown> = {
    backgroundColor: isDarkMode ? theme.palette.background.paper : theme.palette.background.default,
    color: theme.palette.text.primary,
  };
  
  // Override with custom MaterialTableWidget theme if available
  if (theme.MaterialTableWidget) {
    if (theme.MaterialTableWidget[view_mode]?.rowStyle) theme_row_style = { ...theme.MaterialTableWidget[view_mode].rowStyle };
    if (theme.MaterialTableWidget[view_mode]?.altRowStyle) theme_alt_rowStyle = { ...theme.MaterialTableWidget[view_mode].altRowStyle };
    if (theme.MaterialTableWidget[view_mode]?.selectedRowStyle) theme_selected_style = theme.MaterialTableWidget[view_mode].selectedRowStyle;
    if (theme.MaterialTableWidget[view_mode]?.headerStyle) {
      theme_header_style = { 
        ...theme_header_style, 
        ...theme.MaterialTableWidget[view_mode].headerStyle 
      };
    }
  }

  // Apply uiOptions headerStyle last to allow per-widget overrides
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

  // Memoize refresh handler with useCallback
  const refreshHandler = useCallback((eventName: string, eventData: any) => {
    const opts = uiSchema['ui:options'] || {};
    reactory.log(`MaterialTableWidget - Handled ${eventName}`, eventData);
    if (opts.remoteData === true) {
      if (tableRef.current && tableRef.current.onQueryChange) {
        tableRef.current.onQueryChange();
      }
    } else {
      setVersion(v => v + 1);
    }
  }, [uiSchema, reactory]);

  // Memoize refresh function with useCallback
  const refresh = useCallback((args: any) => {
    if (is_refreshing) return;
    
    setIsRefreshing(true);
    if (uiOptions.remoteData === true) {
      if (tableRef.current && tableRef.current.onQueryChange) {
        tableRef.current.onQueryChange();
      }
    }
    setVersion(v => v + 1);
    setIsRefreshing(false);
  }, [is_refreshing, uiOptions.remoteData]);

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

  // ============================================
  // CONSOLIDATED EFFECTS - Optimized to reduce re-renders
  // ============================================

  // Effect 1: Data fetching - only when query changes
  React.useEffect(() => {
    if (uiOptions.remoteData === true) {
      getData();
    }
  }, [query, getData, uiOptions.remoteData]);

  // Effect 2: Mount/unmount - event binding
  React.useEffect(() => {
    const opts = uiSchema['ui:options'] || {};
    
    // Bind refresh events
    if (opts.refreshEvents) {
      opts.refreshEvents.forEach((reactoryEvent) => {
        reactory.log(`MaterialTableWidget - Binding refresh event "${reactoryEvent.name}"`, undefined);
        reactory.on(reactoryEvent.name, refresh);
      });
    }

    // Cleanup function
    return () => {
      if (opts.refreshEvents) {
        opts.refreshEvents.forEach((reactoryEvent) => {
          reactory.removeListener(reactoryEvent.name, refresh);
        });
      }
    };
  }, [uiSchema, refresh, reactory]);

  // Effect 3: FormContext data changes (for non-remote data mode)
  React.useEffect(() => {
    if (uiOptions.remoteData !== true && formContext.formData) {
      // Only refresh for local data mode when form data changes
      setVersion(v => v + 1);
    }
  }, [formContext.formData, uiOptions.remoteData]);

  // Track previous allChecked/allExpanded values to detect toggle operations
  const prevAllCheckedRef = useRef<boolean>(allChecked);
  const prevAllExpandedRef = useRef<boolean>(allExpanded);

  // Effect 4: Sync row states when allChecked or allExpanded changes (user toggles)
  React.useEffect(() => {
    const currentRows = uiOptions.remoteData === true ? data?.data : formData;
    if (!currentRows || currentRows.length === 0) {
      prevAllCheckedRef.current = allChecked;
      prevAllExpandedRef.current = allExpanded;
      return;
    }

    // Detect if this is a toggle operation (user clicked select all / deselect all)
    const wasSelectAllToggled = prevAllCheckedRef.current !== allChecked;
    const wasExpandAllToggled = prevAllExpandedRef.current !== allExpanded;

    // Update refs immediately
    prevAllCheckedRef.current = allChecked;
    prevAllExpandedRef.current = allExpanded;

    // Only update if a toggle operation happened
    if (!wasSelectAllToggled && !wasExpandAllToggled) {
      return;
    }

    // Use functional update to avoid dependency on rowsState
    setRowState(prevRowsState => {
      const newRowsState: MaterialTableRowState = {};
      
      currentRows.forEach((row, rid) => {
        const existingState = prevRowsState[rid];
        
        if (existingState) {
          newRowsState[rid] = {
            ...existingState,
            selected: wasSelectAllToggled ? allChecked : existingState.selected,
            expanded: wasExpandAllToggled ? allExpanded : existingState.expanded,
          };
        } else {
          newRowsState[rid] = {
            dirty: false,
            editing: false,
            expanded: allExpanded,
            hover: false,
            saving: false,
            selected: allChecked,
          };
        }
      });

      return newRowsState;
    });
  }, [allChecked, allExpanded, data?.data, formData, uiOptions.remoteData]);

  // Effect 5: Initialize row states when data changes
  React.useEffect(() => {
    const currentRows = uiOptions.remoteData === true ? data?.data : formData;
    if (!currentRows || currentRows.length === 0) {
      setRowState({});
      return;
    }

    // Use functional update to initialize only missing row states
    setRowState(prevRowsState => {
      let needsUpdate = false;
      const newRowsState = { ...prevRowsState };
      
      currentRows.forEach((row, rid) => {
        if (!newRowsState[rid]) {
          newRowsState[rid] = {
            dirty: false,
            editing: false,
            expanded: false,
            hover: false,
            saving: false,
            selected: false,
          };
          needsUpdate = true;
        }
      });

      // Clean up rows that no longer exist
      Object.keys(newRowsState).forEach(key => {
        const rid = parseInt(key);
        if (rid >= currentRows.length) {
          delete newRowsState[rid];
          needsUpdate = true;
        }
      });

      return needsUpdate ? newRowsState : prevRowsState;
    });
  }, [data?.data, formData, uiOptions.remoteData]);

  // Effect 6: Sync allChecked state from individual selections (but avoid circular updates)
  const isUpdatingAllChecked = useRef(false);
  React.useEffect(() => {
    if (isUpdatingAllChecked.current) {
      isUpdatingAllChecked.current = false;
      return;
    }

    const currentRows = uiOptions.remoteData === true ? data?.data : formData;
    const totalCount = currentRows?.length || 0;
    
    if (totalCount === 0) {
      if (allChecked) {
        isUpdatingAllChecked.current = true;
        setAllChecked(false);
      }
      return;
    }

    const selectedCount = Object.values(rowsState).filter(state => state?.selected === true).length;
    const isAllSelected = selectedCount === totalCount;
    
    if (allChecked !== isAllSelected) {
      isUpdatingAllChecked.current = true;
      setAllChecked(isAllSelected);
    }
  }, [rowsState, data?.data, formData, uiOptions.remoteData]);

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

  // State for column sorting and filtering
  const [columnSort, setColumnSort] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Set<string>>(new Set());

  // Handler for column sort
  const handleColumnSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    setColumnSort({ field, direction });
    // Emit sort event for external handling
    reactory.emit('MaterialTableWidget:sort', { field, direction, tableId: idSchema.$id });
  }, [reactory, idSchema.$id]);

  // Handler for column filter
  const handleColumnFilter = useCallback((field: string) => {
    setColumnFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(field)) {
        newFilters.delete(field);
      } else {
        newFilters.add(field);
      }
      return newFilters;
    });
    // Emit filter event for external handling
    reactory.emit('MaterialTableWidget:filter', { field, tableId: idSchema.$id });
  }, [reactory, idSchema.$id]);

  const getHeader = () => {
    let $headers: JSX.Element[] = [];

    if (options.toolbar === false) return null;

    // Expand/collapse all button for details panel
    if (detailsPanel) {
      const toggleExpandAll = () => {
        setAllExpanded(!allExpanded);
      };

      $headers.push((
        <TableCell key={'header_expand_collapse'} sx={{ width: 48 }}>
          <Tooltip title={reactory.i18n.t(allExpanded ? 'table.collapseAll' : 'table.expandAll', allExpanded ? 'Collapse All' : 'Expand All')}>
            <IconButton onClick={toggleExpandAll} size="small">
              <Icon>{allExpanded ? 'unfold_less' : 'unfold_more'}</Icon>
            </IconButton>
          </Tooltip>
        </TableCell>
      ));
    }

    // Selection checkbox header
    if (options.selection === true) {
      const currentRows = uiOptions.remoteData === true ? data?.data : formData;
      const selectedCount = Object.values(rowsState).filter(state => state.selected === true).length;
      const totalCount = currentRows?.length || 0;
      const isAllSelected = totalCount > 0 && selectedCount === totalCount;
      const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

      const toggleSelectAll = () => {
        const newAllChecked = !isAllSelected;
        setAllChecked(newAllChecked);
      };

      $headers.push((
        <TableCell key={'header_selection'} sx={{ width: 48 }}>
          <Tooltip title={reactory.i18n.t(isAllSelected ? 'table.deselectAll' : 'table.selectAll', isAllSelected ? 'Deselect All' : 'Select All')}>
            <Checkbox
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onClick={toggleSelectAll}
              size="small"
            />
          </Tooltip>
        </TableCell>
      ));
    }

    // Render column headers
    columns.forEach((column: MaterialTableColumn<any>, idx) => {
      const {
        title,
        renderHeader,
        field,
        header,
        headerProps,
      } = column;

      // If custom renderHeader function is provided (legacy support), use it
      if (renderHeader) {
        $headers.push(renderHeader($rows, rowsState));
        return; // Skip default rendering
      }

      // Calculate column width
      const columnWidth = `${(100 / columns.length)}%`;

      // Check if column has enhanced header configuration
      const hasHeaderConfig = header && (
        header.headerComponent ||
        header.titleKey ||
        header.icon ||
        header.sortable ||
        header.filterable ||
        header.tooltip ||
        header.color ||
        header.backgroundColor
      );

      if (hasHeaderConfig) {
        // Use the new ColumnHeader component with full configuration
        const headerConfig: ColumnHeaderConfig = {
          ...header,
          // Map our interface to ColumnHeaderConfig if needed
        };
      
        $headers.push((
          <TableCell
            key={idx}
            width={columnWidth}
            sx={{            
              minWidth: header.minWidth,
              maxWidth: header.maxWidth,
              ...header.headerSx,
            }}
            {...headerProps}
          >
            <ColumnHeader
              field={field}
              title={title}
              columnIndex={idx}
              header={headerConfig}
              sortDirection={columnSort?.field === field ? columnSort.direction : null}
              isFiltered={columnFilters.has(field)}
              reactory={reactory}
              theme={theme}
              onSort={handleColumnSort}
              onFilter={handleColumnFilter}
              data={$rows}
              rowsState={rowsState}
              formContext={formContext}
              tableRef={tableRef}
            />
          </TableCell>
        ));
      } else {
        // Default header rendering with i18n support
        // Check if title looks like an i18n key (contains dots or starts with common prefixes)
        const isI18nKey = title && (
          title.includes('.') ||
          title.startsWith('table.') ||
          title.startsWith('column.') ||
          title.startsWith('header.')
        );

        const displayTitle = isI18nKey
          ? reactory.i18n.t(title, title)
          : title;

        $headers.push((
          <TableCell
            key={idx}
            width={columnWidth}
            sx={{ fontWeight: 600 }}
            {...headerProps}
          >
            <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600 }}>
              {displayTitle}
            </Typography>
          </TableCell>
        ));
      }
    });


    return (
      <TableHead 
        sx={{
          ...options.headerSx,
        }}
      >
        <TableRow 
          sx={{             
            ...theme_header_style,
            // Ensure header cells also inherit proper styling
            '& .MuiTableCell-head': {
              backgroundColor: 'inherit',
              color: theme.palette.text.primary,
              borderBottomColor: theme.palette.divider,
            },
          }}
        >
          {$headers}
        </TableRow>
      </TableHead>
    );
  };

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
      // column field could be property or array field pointer
      // use lodash get to extract property - supports dot notation and array indices
      const cellData = get(row, column.field);
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
          queryVariables={{
            filter: { searchString: query.search },
            paging: { page: query.page, pageSize: query.pageSize }
          }}
          onQueryChange={(queryName: string, variables: any) => {
             // Handle the update from the toolbar
             let newQuery = { ...query };
             
             // Extract search string if present (supporting standard Reactory patterns)
             if (variables?.filter?.searchString !== undefined) {
                newQuery.search = variables.filter.searchString;
             } else if (typeof variables?.searchString === 'string') {
                newQuery.search = variables.searchString;
             }

             // Extract paging
             if (variables?.paging) {
                 if (typeof variables.paging.page === 'number') newQuery.page = variables.paging.page;
                 if (typeof variables.paging.pageSize === 'number') newQuery.pageSize = variables.paging.pageSize;
             }
             
             setQuery(newQuery);
          }}
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
    return {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    };
  };

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
        <TableContainer 
          sx={{ 
            width: '100%',
            overflowX: 'auto',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Table id={`${idSchema.$id}_table`} style={getTableStyles()}>
            {getHeader()}
            {getBody()}
            {getFooter()}
          </Table>
        </TableContainer>
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

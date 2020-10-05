import React, { Fragment, Component, useState, RefObject, PureComponent } from 'react'
import PropTypes, { any } from 'prop-types'
import { pullAt, isNil, remove, filter, isArray, throttle, ThrottleSettings } from 'lodash'
import {
  Typography,
  Button,
  IconButton,
  Fab,
  Icon, Theme
} from '@material-ui/core'
import MaterialTable, { MTableToolbar } from 'material-table';

import {
  useMediaQuery
} from '@material-ui/core';

import { withApi } from '../../../api/ApiProvider';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { find } from 'lodash';
import { Styles } from '@material-ui/styles/withStyles/withStyles';

export interface MaterialTableRemoteDataReponse {
  data: any[],
  page: number,
  totalCount: number,
}

class MaterialTableWidget extends Component<any, any> {

  tableRef: RefObject<any>;
  components: any

  static styles: Styles<Theme, {}, "root" | "chip" | "newChipInput"> = (theme) => ({
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

  static propTypes = {
    formData: PropTypes.array,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: [],
    readOnly: false
  }

  constructor(props, context) {
    super(props, context)
    

    this.state = {
      newChipLabelText: "",
      currentAction: null,
      displayActionConfirm: false,
      selected: [],
      confirmedCallback: null
    };

    this.refreshHandler = this.refreshHandler.bind(this);
    this.confirmAction = this.confirmAction.bind(this);
    this.tableRef = React.createRef();

    this.components = props.api.getComponents(['core.AlertDialog'])
  }

  componentWillUnmount() {
    const uiOptions = this.props.uiSchema['ui:options'] || {};
    const { api } = this.props;
    const self = this;
    if (uiOptions.refreshEvents) {
      //itterate through list of event names,
      //for now we just do a force refresh which will trigger re-rendering
      //logic in the widget.
      uiOptions.refreshEvents.forEach((reactoryEvent) => {
        api.log(`MaterialTableWidget - Reming Binding refresh event "${reactoryEvent.name}"`, undefined, 'debug');
        api.removeListener(reactoryEvent.name, self.refreshHandler);
      });
    };
  }

  componentDidMount() {
    const uiOptions = this.props.uiSchema['ui:options'] || {};
    const { api } = this.props;
    const self = this;
    if (uiOptions.refreshEvents) {
      //itterate through list of event names,
      //for now we just do a force refresh which will trigger re-rendering
      //logic in the widget.
      uiOptions.refreshEvents.forEach((reactoryEvent) => {
        api.log(`MaterialTableWidget - Binding refresh event "${reactoryEvent.name}"`, undefined, 'debug');
        api.on(reactoryEvent.name, self.refreshHandler.bind(self, reactoryEvent.name));
      });
    };
  }

  confirmAction(action, confirmedCallback) {

    this.setState({ currentAction: action, displayActionConfirm: true, confirmedCallback })

  }

  componentDidCatch(err) {
    this.props.api.log(`MaterialWidgetError out of componentBoundary error`, { err }, 'error');
  }

  refreshHandler(eventName, eventData) {

    const uiOptions = this.props.uiSchema['ui:options'] || {};
    const { api } = this.props;
    const self = this;

    this.props.api.log(`MaterialTableWidget - Handled ${eventName}`, eventData, 'debug');
    if (uiOptions.remoteData === true) {
      self.tableRef.current && self.tableRef.current.onQueryChange()
    } else {
      self.forceUpdate();
    }
  };

  render() {
    const self = this;

    const {
      AlertDialog
    } = self.components;

    const MaterialTableHOC = (props, context) => {

      const { api, theme, schema, idSchema } = self.props;
      const uiOptions = this.props.uiSchema['ui:options'] || {};
      const { formData, formContext } = this.props;
      let columns = [];
      let actions = [];
      let components: { [ key: string]: Component | PureComponent | Function } = {

      };
      let detailsPanel = null;

      if (uiOptions.componentMap) {
        if (uiOptions.componentMap.Toolbar) {
          const ToolbarComponent = api.getComponent(uiOptions.componentMap.Toolbar);
          if (ToolbarComponent) {
            components.Toolbar = (props, context) => {
              return <ToolbarComponent {...props} formContext={formContext} />
            }
          } else {
            setTimeout(() => self.forceUpdate(), 500)
          }
        }

        if (uiOptions.componentMap.DetailsPanel) {
          const DetailsPanelComponent = api.getComponent(uiOptions.componentMap.DetailsPanel);

          detailsPanel = (rowData) => {
            return <DetailsPanelComponent {...rowData} />
          }
        }
      }

      const [activeAction, setActiveAction] = useState({
        show: false,
        rowsSelected: [],
        action: null,
      });

      const [selectedRows, setSelectedRows] = useState([]);

      if (uiOptions.columns && uiOptions.columns.length) {
        let _columnRef = [];
        let _mergeColumns = false;
        let _columns = uiOptions.columns;
        if (isNil(uiOptions.columnsProperty) === false) {
          _columns = [...self.props.formContext.formData[uiOptions.columnsProperty]];
          if (isNil(uiOptions.columnsPropertyMap) === false) {
            _columns = api.utils.objectMapper(_columns, uiOptions.columnsPropertyMap)
          }
        }

        remove(_columns, { selected: false });

        _columns.forEach(coldef => {
          const def = {
            ...coldef
          };

          if (isNil(def.component) === false && def.component !== undefined) {
            const ColRenderer = api.getComponent(def.component);
            def.render = (rowData) => {
              let props = { formData: formContext.$formData, rowData, api };
              let mappedProps = {};

              if (def.props) {
                props = { ...props, ...def.props, ...mappedProps, api }
              }

              //check if there is a propsMap property
              //maps self props
              if (def.propsMap && props) {
                mappedProps = api.utils.objectMapper(props, def.propsMap);
                props = { ...props, ...mappedProps, api };
              }

              if (ColRenderer) return <ColRenderer {...props} />
              else return <Typography>Renderer {def.component} Not Found</Typography>
            }

            delete def.component;
          }

          if (isArray(def.components) === true) {
            api.log(`Rendering Chidren Elements`, def);
            const { components } = def;
            def.render = (rowData) => {
              api.log(`Child element to be rendered`, def);
              const childrenComponents = components.map((componentDef, componentIndex) => {

                const ComponentToRender = api.getComponent(componentDef.component);

                let props = { formData: formContext.$formData, rowData, api, key: componentIndex };
                let mappedProps = {};

                if (componentDef.props) {
                  props = { ...props, ...componentDef.props, ...mappedProps, api }
                }

                if (componentDef.propsMap && props) {
                  mappedProps = api.utils.objectMapper(props, componentDef.propsMap);
                  props = { ...props, ...mappedProps, api };
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
            api.log('MaterialTableWidget ==> Skipping column render', { shouldBreak, def }, 'debug');
            if (shouldBreak === false) columns.push(def)
          } else {
            columns.push(def)
          }
        });
      }

      let data: any = [];

      if (uiOptions.remoteData === true) {
        const remoteFetch = async (query: any) : Promise<any> => {
          const response: MaterialTableRemoteDataReponse = {
            data: [],
            page: 0,
            totalCount: 0,
          }

          try {            
            api.log('♻ core.MaterialTable data query', { query }, 'debug')

            const graphqlDefinitions = formContext.$formState.formDef.graphql;

            if (graphqlDefinitions.query || graphqlDefinitions.queries) {

              let queryDefinition = graphqlDefinitions.query;

              if (typeof uiOptions.query === 'string' && uiOptions.query !== 'query' && graphqlDefinitions.queries && graphqlDefinitions.queries[uiOptions.query]) {
                queryDefinition = graphqlDefinitions.queries[uiOptions.query];
                api.log(`Switching Query definition to ==> ${uiOptions.query}`, queryDefinition, 'debug')
              }

              const { refreshEvents } = queryDefinition;

              api.log(`MaterialTableWidget - Mapping variables for query`, { formContext, self: this, map: uiOptions.variables, query }, 'debug')
              let variables = api.utils.objectMapper({ ...self, formContext, query }, uiOptions.variables || queryDefinition.variables);

              variables = { ...variables, paging: { page: query.page + 1, pageSize: query.pageSize } };
              api.log('MaterialTableWidget - Mapped variables for query', { query, variables }, 'debug');

              const queryResult = await api.graphqlQuery(queryDefinition.text, variables).then();
              if (queryResult.errors && queryResult.errors.length > 0) {
                //show a loader error
                api.log(`Error loading remote data for MaterialTableWidget`, { formContext, queryResult })
                api.createNotification(`Could not fetch the data for this query due to an error`, {showInAppNotification: true, type: 'warning'})
                return response;
              } else {

                let result = api.utils.objectMapper(queryResult.data[queryDefinition.name], uiOptions.resultMap || queryDefinition.resultMap);

                if (uiOptions.disablePaging === true) {
                  result.page = 1,
                  result.totalCount = result.data.length;
                }

                result.page = result.page - 1;
                return { ...response, ...result };
              }
            } else {
              return response
            }
          } catch (remoteDataError) {
            return response
          }
        };

        data = throttle(remoteFetch, 500, { leading: true });
        
      } else {
        if (formData && formData.length) {
          formData.forEach(row => {
            data.push({ ...row })
          })
        }
      }

      let options: any = {
        rowStyle: (rowData, index) => {
          api.log(' 🎨 MaterialTableWidget.rowStyle', { rowData, index }, 'debug')
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
            options.searchText = api.util.template(options.searchText)({ ...this.props })
          } catch (tErr) {
            api.log(`core.MaterialTableWidget template render failed for search input`, { searchText: options.searchText, error: tErr }, 'error');
          }
        }
      }

      if (uiOptions.actions && isArray(uiOptions.actions) === true) {
        actions = uiOptions.actions.map((action) => {

          const actionClickHandler = (selected) => {


            const process = () => {
              if (action.mutation) {
                const mutationDefinition = formContext.formDef.graphql.mutation[action.mutation];

                api.graphqlMutation(mutationDefinition.text, api.utils.objectMapper({ ...self.props, selected }, mutationDefinition.variables)).then((mutationResult) => {
                  api.log(`MaterialTableWidget --> action mutation ${action.mutation} result`, { mutationDefinition, self, mutationResult, selected })

                  if (uiOptions.remoteData === true) {
                    self.tableRef.current && self.tableRef.current.onQueryChange()
                  } else {
                    self.forceUpdate();
                  }

                  if (mutationDefinition.onSuccessEvent) {
                    api.log(`Mutation ${mutationDefinition.name} has onSuccessEvent`, mutationDefinition.onSuccessEvent);
                    api.emit(mutationDefinition.onSuccessEvent, api.utils.objectMapper({ result: mutationResult }, mutationDefinition.onSuccessEvent.data || { '*': '*' }))
                  }

                  if (mutationDefinition.notification) {
                    api.createNotification(`${api.utils.template(mutationDefinition.notification.title)({ result: mutationResult, selected })}`, { showInAppNotification: true, type: 'success' })
                  }

                  if (mutationDefinition.refreshEvents) {
                    mutationDefinition.refreshEvents.forEach((eventDefinition) => {
                      api.emit(eventDefinition.name, selected);
                    });
                  }

                }).catch((rejectedError) => {
                  api.createNotification(`Could not execute action ${rejectedError.message}`, { showInAppNotification: true, type: 'error' });
                });
              }


              if (action.event) {
                let __formData = {
                  ...formContext.$formData,
                  ...api.utils.objectMapper({ selected }, action.event.paramsMap || {}),
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
                    api.emit(action.event.name, __formData);
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
            title={api.utils.template(activeAction.action.confirmation.title)({ selected: activeAction.rowsSelected })}
            content={api.utils.template(activeAction.action.confirmation.content)({ selected: activeAction.rowsSelected })}
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

      const onSelectionChange = (rows) => {
        setSelectedRows(rows);
      }

      return (
        <React.Fragment>
          <MaterialTable
            columns={columns}
            tableRef={self.tableRef}
            data={data}
            title={props.title || uiOptions.title || "no title"}
            options={options}
            actions={actions}
            onSelectionChange={onSelectionChange}
            components={components}
            detailPanel={detailsPanel}

          />
          {confirmDialog}
        </React.Fragment>
      )

    };

    const close_dialog = (evt) => {
      self.setState({ displayActionConfirm: false, currentAction: null, confirmedCallback: null })
    };

    return (<MaterialTableHOC props={{ ...this.props }} context={this.context} />)
  }
}
const MaterialTableWidgetComponent = compose(withApi, withTheme, withStyles(MaterialTableWidget.styles))(MaterialTableWidget)
export default MaterialTableWidgetComponent

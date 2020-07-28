import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, isNil, remove, filter, isArray } from 'lodash'
import {
  Typography,
  Button,
  IconButton,
  Fab,
  Icon
} from '@material-ui/core'
import MaterialTable, { MTableToolbar } from 'material-table';

import {
  useMediaQuery
} from '@material-ui/core';

import { withApi } from '../../../api/ApiProvider';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';

class MaterialTableWidget extends Component {

  static styles = (theme) => ({
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
      newChipLabelText: ""
    };

    this.refreshHandler = this.refreshHandler.bind(this);

    this.tableRef = React.createRef();

  }

  componentWillUnmount(){
    const uiOptions = this.props.uiSchema['ui:options'] || {};
    const { api } = this.props;
    const self = this;
    if(uiOptions.refreshEvents ) {
      //itterate through list of event names, 
      //for now we just do a force refresh which will trigger re-rendering 
      //logic in the widget.      
      uiOptions.refreshEvents.forEach(( reactoryEvent ) => {
        api.log(`MaterialTableWidget - Reming Binding refresh event "${reactoryEvent.name}"`, undefined , 'debug' );        
        api.removeListener(reactoryEvent.name, self.refreshHandler);
      });
    };
  }

  componentDidMount(){
    const uiOptions = this.props.uiSchema['ui:options'] || {};
    const { api } = this.props;
    const self = this;
    if(uiOptions.refreshEvents ) {
      //itterate through list of event names, 
      //for now we just do a force refresh which will trigger re-rendering 
      //logic in the widget.      
      uiOptions.refreshEvents.forEach(( reactoryEvent ) => {
        api.log(`MaterialTableWidget - Binding refresh event "${reactoryEvent.name}"`, undefined , 'debug' );        
        api.on(reactoryEvent.name, self.refreshHandler.bind(self, reactoryEvent.name));
      });
    };
  }

  componentDidCatch(err) {
    this.props.api.log(`MaterialWidgetError out of componentBoundary error`, { err }, 'error');
  }

  refreshHandler(eventName, eventData ) {         
    
    const uiOptions = this.props.uiSchema['ui:options'] || {};
    const { api } = this.props;
    const self = this;
    
    this.props.api.log(`MaterialTableWidget - Handled ${eventName}`, eventData , 'debug' );
    if(uiOptions.remoteData === true) {
      self.tableRef.current && self.tableRef.current.onQueryChange()
    } else {
      self.forceUpdate();
    }    
  };

  render() {
    const self = this;
        
    const MaterialTableHOC = (props, context) => {

      const { api, theme, schema, idSchema } = self.props;
      const uiOptions = this.props.uiSchema['ui:options'] || {};
      const { formData, formContext } = this.props;
      let columns = [];
      let actions = [];
     
      if(uiOptions.columns && uiOptions.columns.length) {
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
                return <Fab color={buttonProps.color ? buttonProps.color : "default"} size={ buttonProps.size ? buttonProps.size : "small" }><Icon style={{ color: "#fff" }}>{buttonProps.icon}</Icon></Fab>
              } else {
                return <Button>{buttonProps.text}</Button>
              }
            }
          }
            
          if(def.breakpoint ) {
            const shouldBreak = useMediaQuery(theme.breakpoints.down(def.breakpoint));
            api.log('MaterialTableWidget ==> Skipping column render', { shouldBreak, def }, 'debug');
            if(shouldBreak === false) columns.push(def)
          } else {
            columns.push(def)
          }          
        });
      }
  
      let data = [];
  
      if (uiOptions.remoteData === true) {
        data = async (query) => {
          try {       
            
            const graphqlDefinitions = formContext.$formState.formDef.graphql;
            
            if(graphqlDefinitions.query || graphqlDefinitions.queries) {
  
              let queryDefinition = graphqlDefinitions.query;
  
              if(typeof uiOptions.query === 'string' && uiOptions.query !== 'query' && graphqlDefinitions.queries && graphqlDefinitions.queries[uiOptions.query]) {              
                queryDefinition = graphqlDefinitions.queries[uiOptions.query];
                api.log(`Switching Query definition to ==> ${uiOptions.query}`, queryDefinition, 'debug')
              }
  
              const { refreshEvents } = queryDefinition;             
              
              api.log(`MaterialTableWidget - Mapping variables for query`, { formContext, self: this, map: uiOptions.variables, query }, 'debug')            
              let variables = api.utils.objectMapper({ ...self, formContext }, uiOptions.variables || queryDefinition.variables);
  
              variables = { ...variables, paging: { page: query.page + 1, pageSize: query.pageSize } };
              api.log('MaterialTableWidget - Mapped variables for query', { query, variables }, 'debug');
  
              const queryResult = await api.graphqlQuery(queryDefinition.text, variables).then();
              if (queryResult.errors && queryResult.errors.length > 0) {
                //show a loader error
                api.log(`Error loading remote data for MaterialTableWidget`, { formContext, queryResult })
                return {
                  data: [],
                  page: 0,
                  totalCount: 0
                }
              } else {
                
                let result = api.utils.objectMapper(queryResult.data[queryDefinition.name], uiOptions.resultMap || queryDefinition.resultMap);
                result.page = result.page - 1;
                return result;
              }
            } else {
              return {
                data: [],
                page: 0,
                totalCount: 0
              }
            }
          } catch (remoteDataError) {
            return {
              data: [],
              page: 0,
              totalCount: 0
            }
          }
        }
      } else {
        if (formData && formData.length) {
          formData.forEach(row => {
            data.push({ ...row })
          })
        }
      }
  
      let options = {
        rowStyle: (rowData, index) => {        
          let style = {};
  
          if(theme.MaterialTableWidget) {
            if(theme.MaterialTableWidget.rowStyle) style = { ...theme.MaterialTableWidget.rowStyle };
            if(theme.MaterialTableWidget.altRowStyle && index % 2 === 0) style = { ...style, ...theme.MaterialTableWidget.altRowStyle };  
          }
  
          if(uiOptions.rowStyle) style = { ...uiOptions.rowStyle };
          if(uiOptions.altRowStyle && index % 2 === 0) style = { ...style, ...uiOptions.altRowStyle };
  
          //TODO CONDITIONAL STYLING
          return style;
        }
      };
  
      if (uiOptions.options) {
        options = { ...options, ...uiOptions.options }
      }
  
      if(uiOptions.actions && isArray(uiOptions.actions) === true) {
        actions = uiOptions.actions.map((action) => {
          
          const actionClickHandler = (selected) => {                    
            if(action.mutation) {            
              const mutationDefinition = formContext.formDef.graphql.mutation[action.mutation];
              
              api.graphqlMutation(mutationDefinition.text, api.utils.objectMapper({ ...self.props, selected }, mutationDefinition.variables)).then((mutationResult) => {
                api.log(`MaterialTableWidget --> action mutation ${action.mutation} result`, { mutationDefinition, self, mutationResult, selected })
                
                if(uiOptions.remoteData === true) {
                  self.tableRef.current && self.tableRef.current.onQueryChange()
                } else {
                  self.forceUpdate();
                }
                
                if(mutationDefinition.onSuccessEvent) {
                  api.log(`Mutation ${mutationDefinition.name} has onSuccessEvent`, mutationDefinition.onSuccessEvent);
                  api.emit(mutationDefinition.onSuccessEvent, api.utils.objectMapper({ result: mutationResult }, mutationDefinition.onSuccessEvent.data || { '*': '*' }))
                }
  
                if(mutationDefinition.notification) {                
                  api.createNotification(`${api.utils.template(action.successMessage)({ result: mutationResult, selected })}`, { showInAppNotification: true, type: 'error' })
                }

                if(mutationDefinition.refreshEvents) {
                  mutationDefinition.refreshEvents.forEach((eventDefinition) => {
                   api.emit(eventDefinition.name, selected);
                  });
                }
                
                
              }).catch((rejectedError) => {
                api.createNotification(`Could not execute action ${rejectedError.message}`, { showInAppNotification: true, type: 'error' });
              });
            }

            if(action.event) {
              let __formData = { 
                ...formContext.$formData, 
                ...api.utils.objectMapper( { selected }, action.event.paramsMap || {} ),
                ...(action.event.params ? action.event.params : {})
              };


              if(action.event.via === 'form') {
                let handler = formContext.$ref.onChange;                
                if( typeof formContext.$ref[action.event.name] === 'function') {
                  handler = formContext.$ref[action.event.name];
                }
                handler(__formData);
              };              
            }
          };
  
          return {
            icon: action.icon,
            iconProps: action.iconProps || {},
            tooltip: action.tooltip || 'No tooltip',
            onClick: (evt, selected) => {
              actionClickHandler(selected);
            }
          };
        });
      }

      return (
        <MaterialTable
            columns={columns}
            tableRef={self.tableRef}                    
            data={data}            
            title={props.title || uiOptions.title || "no title"}
            options={options}
            actions={actions} />
      )

    };
  
    return <MaterialTableHOC props={this.props} context={this.context} />
  }
}
const MaterialTableWidgetComponent = compose(withApi, withTheme, withStyles(MaterialTableWidget.styles))(MaterialTableWidget)
export default MaterialTableWidgetComponent

import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, isNil, remove,filter, isArray } from 'lodash'
import {
  Typography 
} from '@material-ui/core'
import MaterialTable, { MTableToolbar } from 'material-table';
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

  constructor(props, context){
    super(props, context)
    this.state = {
      newChipLabelText: ""
    };

  }


  render(){
    const self = this;
    const { api } = self.props;
    const uiOptions = this.props.uiSchema['ui:options'] || {};
    const { formData, formContext } = this.props;
    let columns = [];
    
    if(uiOptions.columns && uiOptions.columns.length) {
      let _columnRef = [];
      let _mergeColumns = false;
      let _columns = uiOptions.columns; 
      if(isNil(uiOptions.columnsProperty) === false) {          
        _columns = [...self.props.formContext.formData[uiOptions.columnsProperty]];        
        if(isNil(uiOptions.columnsPropertyMap) === false) {
          _columns = api.utils.objectMapper(_columns, uiOptions.columnsPropertyMap)
        }                
      }
                  
      remove(_columns, { selected: false });      
      
      columns = _columns.map( coldef => {        
        const def = {
          ...coldef
        };

        if(isNil(def.component) === false && def.component !== undefined) {
          const ColRenderer = api.getComponent(def.component);
          def.render = ( rowData ) => {           
            let props = { ...rowData };
            let mappedProps = {};

            if(def.props) {
              props = { ...props, ...def.props, ...mappedProps }
            } 

            //check if there is a propsMap property
            //maps self props 
            if(def.propsMap && props) {
              mappedProps = api.utils.objectMapper(props, def.propsMap);
              props = {...props, ...mappedProps };
            }
            
            if(ColRenderer) return <ColRenderer { ...props } />
            else return <Typography>Renderer {def.component} Not Found</Typography>
          }

          delete def.component;
        }
              
        if(isArray(def.components) === true) {                    
          api.log(`Rendering Chidren Elements`, def);
          const { components } = def;
          def.render = ( rowData ) => {      
            api.log(`Child element to be rendered`, def);
            const childrenComponents = components.map((componentDef) => {
            
              const ComponentToRender = api.getComponent(componentDef.component);
                          
              let props = { ...rowData };
              let mappedProps = {};
  
              if(componentDef.props) {
                props = { ...props, ...componentDef.props, ...mappedProps }
              } 
  
              if(componentDef.propsMap && props) {
                mappedProps = api.utils.objectMapper(props, componentDef.propsMap);
                props = {...props, ...mappedProps };
              }                                      
              if(ComponentToRender) return <ComponentToRender { ...props } />
              else return <Typography>Renderer {componentDef.component} Not Found</Typography>
              
            });

          
            return (<div style={{display: 'flex', 'justifyContent': 'flex-start'}}>
                {childrenComponents}
              </div>)
            
          }
          
          delete def.components;
        }
        
        return def;
      });        
    }
    
    let data = [];

    if(uiOptions.remoteData === true) {
      data = async (query) => {
        try {          
          if(formContext.$formState.formDef.graphql && formContext.$formState.formDef.graphql.query) {
            api.log(`MaterialTableWidget - Mapping variables for query`, { formContext, self: this, map: uiOptions.variables }, 'debug')
            let variables = api.utils.objectMapper(self, uiOptions.variables || formContext.$formState.formDef.graphql.query.variables);
            variables = { ...variables, paging: { page: query.page + 1, pageSize: query.pageSize } };
            api.log('MaterialTableWidget - Mapped variables for query', variables, 'debug');

            const queryResult = await api.graphqlQuery(formContext.$formState.formDef.graphql.query.text, variables).then();
            if(queryResult.errors && queryResult.errors.length > 0) {
              //show a loader error
              api.log(`Error loading remote data for MaterialTableWidget`, {formContext, queryResult})
              return {
                data: [],
                page: 0,
                totalCount: 0  
              }
            } else {
              let result = api.utils.objectMapper(queryResult.data[formContext.$formState.formDef.graphql.query.name], uiOptions.resultMap || formContext.$formState.formDef.graphql.query.resultMap);
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
      if(formData && formData.length) {
        formData.forEach( row => {
          data.push({...row})
        })
      }
    }

    

    let options = {

    };
    
    if(uiOptions.options) {
      options = { ...options, ...uiOptions.options }
    }

    

    return (
        <MaterialTable
            columns={columns}                    
            data={data}            
            title={this.props.title || uiOptions.title || "no title"}
            options={options}            
            />
    )
  }
}
const MaterialTableWidgetComponent = compose(withApi, withTheme, withStyles(MaterialTableWidget.styles))(MaterialTableWidget)
export default MaterialTableWidgetComponent

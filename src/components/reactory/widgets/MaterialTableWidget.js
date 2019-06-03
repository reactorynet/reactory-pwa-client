import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, isNil } from 'lodash'
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
    const { formData } = this.props;
    let columns = [];
    
    if(uiOptions.columns && uiOptions.columns.length) { 
      columns = uiOptions.columns.map( coldef => {
        
        const def = {
          ...coldef
        };

        if(isNil(def.component) === false) {
          const ColRenderer = api.getComponent(def.component);
          def.render = ( rowData ) => {           
            let props = { ...rowData };
            if(def.props) {
              props = { ...props, ...def.props }
            } 
            if(ColRenderer) return <ColRenderer { ...props } />
            else return <Typography>Renderer {def.component} Not Found</Typography>
          }

          delete def.component;
        }

        return def;
      });        
    }
    let data = [];
    if(formData && formData.length) {
      formData.forEach( row => {
        data.push({...row})
      })
    }

    return (
        <MaterialTable
            columns={columns}                    
            data={data}            
            title={this.props.title || uiOptions.title || "no title"}            
            />
    )
  }
}
const MaterialTableWidgetComponent = compose(withApi, withTheme, withStyles(MaterialTableWidget.styles))(MaterialTableWidget)
export default MaterialTableWidgetComponent

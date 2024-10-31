import React, { Component, Fragment } from 'react';
import { compose } from 'redux';
import {   
  AppBar, 
  Button, 
  FormControlLabel,
  IconButton, 
  Icon,
  ListItem,
  ListItemText,
  List,
  ListItemSecondaryAction,
  Switch,
  Toolbar   
} from '@mui/material';
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/reactory-core';
import { Typography } from '@mui/material';


export interface ColumnFilter {
  field: string,
  title: string,
  operator: string,
  modifier: string,
  invert: Boolean
}

export interface ColumnFilterWidgetProps {
  formData: ColumnFilter[],
  onChange: Function,
  api: Reactory.Client.IReactoryApi
};

export interface ColumnFilterWidgetState {
  columns: ColumnFilter[];
  expanded: boolean
};

class ColumnFilterWidget extends Component<ColumnFilterWidgetProps, ColumnFilterWidgetState> {
  componentDefs: any;
  constructor(props, context){
    super(props, context);

    this.state = {
      columns: [],
      expanded: false,      
    };

    this.toggleFilterSelector = this.toggleFilterSelector.bind(this);
    this.acceptSelection = this.acceptSelection.bind(this);
    this.onAddFilterClicked = this.onAddFilterClicked.bind(this);

    this.componentDefs = props.api.getComponents([
      'core.FullScreenModal',
      'core.DropDownMenu'
    ]);
  }
  
  static styles = (theme) => {
    return {
      ColumnSelectorContainer: {
        
      }
    }
  };

  static defaultProps = {
    formData: [],
    onChange: ( data )=>{
      console.log('Column Filter Widget', data);
    }
  };

  toggleFilterSelector(){
    this.setState({ expanded: !this.state.expanded });
  }

  acceptSelection(){
    this.setState({ expanded: !this.state.expanded });
  }

  onAddFilterClicked(){
    const { columns } = this.state;
    const _columns = [...columns];

    _columns.push({ 
      field: 'Select Column',
      title: 'Select Column',
      operator: 'EQ',
      modifier: 'AND',
      invert: false,
    });
    this.setState({ columns: _columns })
  }

  render(){
    const { FullScreenModal, DropDownMenu } = this.componentDefs;
    const { columns, expanded } = this.state;
    const { api } = this.props;
    const that = this;
    return (
      <div>
        <IconButton onClick={this.toggleFilterSelector} size="large">
          <Icon>filter_list</Icon>
        </IconButton>
        <FullScreenModal open={this.state.expanded} onClose={this.toggleFilterSelector} title="Column Filter">
          <AppBar title="Column Selection">
            <Toolbar>
              <IconButton onClick={this.acceptSelection} size="large">
                <Icon>check_circle_outline</Icon>
              </IconButton>
              <IconButton onClick={this.toggleFilterSelector} size="large">
                <Icon>cancel</Icon>
              </IconButton>
              <Typography>Column Filter</Typography>
              <IconButton style={{float: 'right'}} onClick={this.onAddFilterClicked} size="large">
                <Icon>add_circle</Icon>
              </IconButton>
            </Toolbar>
          </AppBar>
          <List>
            {
              columns.map(( columnFilter: ColumnFilter, index: number ) => {           
                
                const columnMenus = [
                  {
                    id: 'remove_filter',
                    icon: 'delete_forever',
                    title: 'Remove Filter',                    
                  },
                  {
                    id: 'edit_values',
                    icon: 'widgets',
                    title: 'Configure Widget',
                  }
                ];


                const onMenuItemSelect = (evt, menuItem) => {
                  api.log(`${menuItem.id} selected`, { menuItem });
                  switch(menuItem.id) {
                    case 'remove_filter': {
                      const { columns } = this.state;
                      const _columns = [...columns];

                      that.setState({ columns: _columns });                      
                      break;
                    }
                    case 'edit_values': {
                      const { columns } = this.state;
                      const _columns = [...columns];

                      that.setState({ columns: _columns });
                      break;
                    }
                  }
                };
                
                return (
                  <ListItem key={index}>
                    <ListItemText primary={columnFilter.field} secondary={`${columnFilter.field}`} />
                    <ListItemSecondaryAction>
                      <DropDownMenu 
                        menus={columnMenus} 
                        onSelect={onMenuItemSelect} />                     
                    </ListItemSecondaryAction>
                    <hr/>
                    
                  </ListItem>
                );
              })
            }
            </List>
        </FullScreenModal>            
      </div>
    );
  }
}



const ColumnFilterWidgetComponent = compose(
  withTheme, 
  withStyles(ColumnFilterWidget.styles),
  withReactory
)(ColumnFilterWidget)

export default ColumnFilterWidgetComponent;
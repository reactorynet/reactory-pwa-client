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

export interface ColumnDefinition {
  field: string,
  title: string,
  widget: string,
  selected: boolean,  
}

export interface ColumnSelectorWidgetProps {
  formData: ColumnDefinition[],
  onChange: any,
  reactory: Reactory.Client.IReactoryApi,
  classes: any
};

export interface ColumnSelectorWidgetState {
  columns: ColumnDefinition[];
  expanded: boolean
};

class ColumnSelectorWidget extends Component<ColumnSelectorWidgetProps, ColumnSelectorWidgetState> {
  componentDefs: any;

  constructor(props, context){
    super(props, context);

    this.state = {
      columns: props.formData || [],
      expanded: false,
    };

    this.toggleSelector = this.toggleSelector.bind(this);
    this.acceptSelection = this.acceptSelection.bind(this);

    this.componentDefs = props.api.getComponents([
      'core.FullScreenModal',
      'core.DropDownMenu',
    ]);
  }
  
  static styles = (theme) => {
    return {
      ColumnSelectorContainer: {
        
      },
      IncludedColumn: {
        backgroundColor: '#C4DECB'
      },
      ExcludedColumn: {
        backgroundColor: 'inherit'
      },
    }
  };

  static defaultProps = {
    formData: []
  };

  toggleSelector(){
    this.setState({ expanded: !this.state.expanded });
  }

  acceptSelection(){
    const { onChange } = this.props
    const { columns } = this.state
    this.setState({ expanded: !this.state.expanded }, ()=>{
      if(onChange && typeof onChange === 'function') {
        onChange(columns);
      }      
    });
  }
  
  render(){

    const { FullScreenModal, DropDownMenu } = this.componentDefs;    
    const { columns } = this.state;
    const { reactory, classes } = this.props;
    let activeUiSchemaMenuItem = null;
    const that = this;
    return (
      <div>
        <IconButton onClick={this.toggleSelector} size="large">
          <Icon>view_column</Icon>
        </IconButton>
        <FullScreenModal open={this.state.expanded} onClose={this.toggleSelector}>
          <AppBar title="Column Selection">
            <Toolbar>
              <IconButton onClick={this.acceptSelection} size="large">
                <Icon>check_circle_outline</Icon>
              </IconButton>
              <IconButton onClick={this.toggleSelector} size="large">
                <Icon>cancel</Icon>
              </IconButton>
              <Typography>Column Selection</Typography>
            </Toolbar>
          </AppBar>
          <List>
            {
              columns.map(( columnDefinition: ColumnDefinition, index: number ) => {
                const changeColumnDefinition = () => {
                  const { columns } = this.state;
                  const _columns = [...columns];
                  _columns[index].selected = !_columns[index].selected;
                  that.setState({ columns: _columns });
                };

                const columnMenus = [
                  {
                    id: 'toggle_selected',
                    icon: columnDefinition.selected ? 'check_box' : 'check_box_outline_blank',
                    title: columnDefinition.selected ? 'Exclude' : 'Include',                    
                  },
                  {
                    id: 'widget_select',
                    icon: 'widgets',
                    title: 'Configure Widget',
                  }
                ];

                const onMenuItemSelect = (evt, menuItem) => {
                  reactory.log(`${menuItem.id} selected`, { menuItem });
                  switch(menuItem.id) {
                    case 'toggle_selected': {
                      const { columns } = this.state;
                      const _columns = [...columns];
                      _columns[index].selected = !_columns[index].selected;
                      that.setState({ columns: _columns });
                      break;
                    }
                    case 'widget_select': {
                      const { columns } = this.state;
                      const _columns = [...columns];
                      _columns[index].widget = 'Widget XYZ';
                      that.setState({ columns: _columns });
                      break;
                    }
                  }
                };

                return (
                  <ListItem key={index} >
                    <Switch checked={columnDefinition.selected} onChange={changeColumnDefinition} />
                    <ListItemText 
                      primary={columnDefinition.title} 
                      secondary={`${columnDefinition.title} renders using ${columnDefinition.widget || 'default'} widget`} 
                      className={columnDefinition.selected ? this.props.classes.Included : this.props.classes.Excluded}/>
                    <ListItemSecondaryAction>
                      <DropDownMenu 
                        menus={columnMenus} 
                        onSelect={onMenuItemSelect} />                                          
                    </ListItemSecondaryAction>
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



const ColumnSelectorWidgetComponent = compose(
  withTheme, 
  withStyles(ColumnSelectorWidget.styles),
  withReactory
)(ColumnSelectorWidget)

export default ColumnSelectorWidgetComponent;
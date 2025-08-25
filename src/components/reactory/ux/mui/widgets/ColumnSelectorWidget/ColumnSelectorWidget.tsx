import React, { Fragment, useState, useEffect } from 'react';
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
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
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

const ColumnSelectorWidget = (props: ColumnSelectorWidgetProps) => {
  const theme = useTheme();
  
  const [columns, setColumns] = useState<ColumnDefinition[]>(props.formData || []);
  const [expanded, setExpanded] = useState<boolean>(false);
  
  const componentDefs = props.reactory.getComponents<{
    FullScreenModal: any,
    DropDownMenu: any
  }>([
    'core.FullScreenModal',
    'core.DropDownMenu',
  ]);

  const toggleSelector = () => {
    setExpanded(!expanded);
  };

  const acceptSelection = () => {
    const { onChange } = props;
    setExpanded(!expanded);
    if(onChange && typeof onChange === 'function') {
      onChange(columns);
    }
  };
  
  const { FullScreenModal, DropDownMenu } = componentDefs;    
  const { reactory, classes } = props;
  let activeUiSchemaMenuItem = null;
    return (
      <div>
        <IconButton onClick={toggleSelector} size="large">
          <Icon>view_column</Icon>
        </IconButton>
        <FullScreenModal open={expanded} onClose={toggleSelector}>
          <AppBar title="Column Selection">
            <Toolbar>
              <IconButton onClick={acceptSelection} size="large">
                <Icon>check_circle_outline</Icon>
              </IconButton>
              <IconButton onClick={toggleSelector} size="large">
                <Icon>cancel</Icon>
              </IconButton>
              <Typography>Column Selection</Typography>
            </Toolbar>
          </AppBar>
          <List>
            {
              columns.map(( columnDefinition: ColumnDefinition, index: number ) => {
                const changeColumnDefinition = () => {
                  const _columns = [...columns];
                  _columns[index].selected = !_columns[index].selected;
                  setColumns(_columns);
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
                      const _columns = [...columns];
                      _columns[index].selected = !_columns[index].selected;
                      setColumns(_columns);
                      break;
                    }
                    case 'widget_select': {
                      const _columns = [...columns];
                      _columns[index].widget = 'Widget XYZ';
                      setColumns(_columns);
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
                      style={{ backgroundColor: columnDefinition.selected ? '#C4DECB' : 'inherit' }}/>
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
};



export default ColumnSelectorWidget;
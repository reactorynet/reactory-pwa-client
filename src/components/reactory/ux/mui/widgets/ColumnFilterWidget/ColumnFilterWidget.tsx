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
  reactory: Reactory.Client.IReactoryApi
};

export interface ColumnFilterWidgetState {
  columns: ColumnFilter[];
  expanded: boolean
};

const ColumnFilterWidget = (props: ColumnFilterWidgetProps) => {
  const theme = useTheme();
  
  const [columns, setColumns] = useState<ColumnFilter[]>([]);
  const [expanded, setExpanded] = useState<boolean>(false);
  
  const componentDefs = props.reactory.getComponents<{
    FullScreenModal: any,
    DropDownMenu: any
  }>([
    'core.FullScreenModal',
    'core.DropDownMenu'
  ]);

  const toggleFilterSelector = () => {
    setExpanded(!expanded);
  };

  const acceptSelection = () => {
    setExpanded(!expanded);
  };

  const onAddFilterClicked = () => {
    const _columns = [...columns];

    _columns.push({ 
      field: 'Select Column',
      title: 'Select Column',
      operator: 'EQ',
      modifier: 'AND',
      invert: false,
    });
    setColumns(_columns);
  };

  const { FullScreenModal, DropDownMenu } = componentDefs;
  const { reactory: api } = props;
    return (
      <div>
        <IconButton onClick={toggleFilterSelector} size="large">
          <Icon>filter_list</Icon>
        </IconButton>
        <FullScreenModal open={expanded} onClose={toggleFilterSelector} title="Column Filter">
          <AppBar title="Column Selection">
            <Toolbar>
              <IconButton onClick={acceptSelection} size="large">
                <Icon>check_circle_outline</Icon>
              </IconButton>
              <IconButton onClick={toggleFilterSelector} size="large">
                <Icon>cancel</Icon>
              </IconButton>
              <Typography>Column Filter</Typography>
              <IconButton style={{float: 'right'}} onClick={onAddFilterClicked} size="large">
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
                      const _columns = [...columns];
                      setColumns(_columns);                      
                      break;
                    }
                    case 'edit_values': {
                      const _columns = [...columns];
                      setColumns(_columns);
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
};



export default ColumnFilterWidget;
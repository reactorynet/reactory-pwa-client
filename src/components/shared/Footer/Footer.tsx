import React from 'react';
import { styled } from '@mui/material/styles';
import { withReactory, useReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/reactory-core';
import * as MaterialCore from '@mui/material';
import useSizeSpec from '@reactory/client-core/components/hooks/useSizeSpec';
import { Theme } from '@mui/material';


const PREFIX = 'Footer';

const classes = {
  footer_container: `${PREFIX}-footer_container`,
  powered_by: `${PREFIX}-powered_by`,
  avatar: `${PREFIX}-avatar`
};

const StyledGrid = styled(MaterialCore.Grid2)((
  {
    theme: Theme
  }
) => {

  return {
    [`&.${classes.footer_container}`]: {
      outline: '1px',
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: 100, //sizeSpec.outerWidth,
      //backgroundColor: theme.palette.background[reactory.getThemeMode()].default
    },
    [`& .${classes.powered_by}`]: {
      display: 'flex',
      justifyContent: 'center',
    },
    [`& .${classes.avatar}`]: {
      height: '18px',
      width: '18px'
    }
  };

});


export const Footer = () => {
  const reactory = useReactory();
  const { useEffect, useState } = React;
  const sizeSpec = useSizeSpec();

  const {
    Avatar,
    Grid,
    TextField,
    Tabs,
    Tab,
    Typography,
    Box,
    Popover,
    Button,
    Icon,
    IconButton,
    MenuItem,
    FormControlLabel,
    Switch,
  } = MaterialCore;



  return (
    <StyledGrid spacing={0} container className={classes.footer_container}>
      <Grid item container direction="row">
        <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
          <div className={classes.powered_by}>
            <Avatar sx={{ width: '18px', height: '18px' }} className={classes.avatar} src={reactory.getCDNResource('themes/reactory/images/avatar.png')} ></Avatar>            
          </div>
        </Grid>
      </Grid>
    </StyledGrid>
  );
};


import React from 'react';
import { withApi, useReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/client-core/types/reactory';
import * as MaterialCore from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import useSizeSpec from '@reactory/client-core/components/hooks/useSizeSpec';
import { Theme } from '@material-ui/core';


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

  const useStyles = makeStyles((theme: Theme) => {

    return {
      footer_container: {
        outline: '1px',
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: sizeSpec.outerWidth,
        //backgroundColor: theme.palette.background[reactory.getThemeMode()].default
      },
      powered_by: {
        display: 'flex',
        justifyContent: 'center',
      },
      avatar: {
        height: '18px',
        width: '18px'
      }
    }

  });

  const classes = useStyles();

  return (
    <Grid spacing={0} container className={classes.footer_container}>
      <Grid item container direction="row">
        <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
          <div className={classes.powered_by}>
            <Avatar className={classes.avatar} src={reactory.getCDNResource('themes/reactory/images/avatar.png')} ></Avatar>
            <Typography variant={'caption'}> &nbsp;Reactory</Typography>
          </div>
        </Grid>
      </Grid>
    </Grid>
  );
};


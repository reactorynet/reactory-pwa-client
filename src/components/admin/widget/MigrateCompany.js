import React, { Component } from 'react';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import { Typography, List } from '@material-ui/core';

class MigrateCompany extends Component {
  
  render(){

    return (
      <Grid container spacing={16}>
        <Grid item xs={6}>
          <Paper>
              <Typography>Select Company</Typography>
              
          </Paper>
        </Grid>
      </Grid>
    )
  }
}
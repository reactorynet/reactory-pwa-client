import React, { Component } from 'react';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { Typography, List } from 'material-ui';

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
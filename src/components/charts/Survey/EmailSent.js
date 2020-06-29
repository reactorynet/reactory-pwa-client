import React from 'react'
import { compose } from 'redux'
//import { LineChart } from 'react-easy-chart'
import { withStyles, withTheme, Paper, Typography } from '@material-ui/core'
import { ChartStyles } from '../styles'


const EmailSent = (props, context) => {

  const { theme } = props;

  const surveysOverallClosed = [
    { key: '-', value: 68, color: theme.palette.report.fill },
    { key: '-', value: 32, color: theme.palette.report.empty },
  ];
  

  return (
    <Paper className={props.classes.chartContainer} style={{paddingRight: '10px'}}>
      <p>NEW CHART REQUIRED</p>
      <Typography variant={'caption'} className={props.classes.chartCaption}>Emails Sent</Typography>
    </Paper>
  )
}

export default compose(
  withStyles(ChartStyles),
  withTheme
)(EmailSent);
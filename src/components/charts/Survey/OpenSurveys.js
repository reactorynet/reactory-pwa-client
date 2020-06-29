import React from 'react'
import { compose } from 'redux'
import { withStyles, withTheme, Paper, Typography } from '@material-ui/core'
import { ChartStyles } from '../styles'


const OpenSurveyChart = (props, context) => {

  const { theme } = props;

  const surveysOverallClosed = [
    { key: '-', value: 68, color: theme.palette.report.fill },
    { key: '-', value: 32, color: theme.palette.background.default },
  ];
  

  return (
    <Paper className={props.classes.chartContainer}>
      <Typography variant={'caption'} className={props.classes.chartCaption}>Open Surveys</Typography>
    </Paper>
  )
}

export default compose(
  withStyles(ChartStyles),
  withTheme
)(OpenSurveyChart);
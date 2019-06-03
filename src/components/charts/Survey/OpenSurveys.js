import React from 'react'
import { compose } from 'redux'
import { PieChart } from 'react-easy-chart'
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
      <PieChart
          id={'open-surveys'}
          styles={{ display: 'flex', justifyContent: 'center' }}
          data={surveysOverallClosed}
          size={200}
          innerHoleSize={170}
      />
      <Typography variant={'caption'} className={props.classes.chartCaption}>Open Surveys</Typography>
    </Paper>
  )
}

export default compose(
  withStyles(ChartStyles),
  withTheme
)(OpenSurveyChart);
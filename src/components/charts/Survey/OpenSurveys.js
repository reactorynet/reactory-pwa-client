import React from 'react'
import { compose } from 'redux'
import { PieChart } from 'react-easy-chart'
import { withStyles, withTheme } from 'material-ui'

const ChartStyles = (theme) => ({})

const OpenSurveyChart = (props, context) => {

  const { theme } = props;

  const surveysOverallClosed = [
    { key: '-', value: 68, color: theme.palette.report.fill },
    { key: '-', value: 32, color: theme.palette.report.empty },
  ];
  

  return (
    <PieChart
        id={'personal-quarter'}
        styles={{ display: 'flex', justifyContent: 'center' }}
        data={surveysOverallClosed}
        size={120}
        innerHoleSize={100}
    />
  )
}

export default compose(
  withStyles(ChartStyles),
  withTheme()
)(OpenSurveyChart);
import React from 'react'
import { compose } from 'redux'
import { LineChart } from 'react-easy-chart'
import { withStyles, withTheme, Paper, Typography } from 'material-ui'
import { ChartStyles } from '../styles'


const EmailSent = (props, context) => {

  const { theme } = props;

  const surveysOverallClosed = [
    { key: '-', value: 68, color: theme.palette.report.fill },
    { key: '-', value: 32, color: theme.palette.report.empty },
  ];
  

  return (
    <Paper className={props.classes.chartContainer} style={{paddingRight: '10px'}}>
      <LineChart
        xType={'text'}
        axes
        dataPoints
        width={320}
        height={195}
        interpolate={'cardinal'}
        data={[
          [
            { x: 'Mon', y: 20 },
            { x: 'Tue', y: 10 },
            { x: 'Wed', y: 25 },
            { x: 'Thu', y: 20 },
            { x: 'Fri', y: 15 }
          ], [
            { x: 'Mon', y: 12 },
            { x: 'Tue', y: 13 },
            { x: 'Wed', y: 10 },
            { x: 'Thu', y: 15 },
            { x: 'Fri', y: 10 }
          ],
          [
            { x: 'Mon', y: 7 },
            { x: 'Tue', y: 11 },
            { x: 'Wed', y: 13 },
            { x: 'Thu', y: 18 },
            { x: 'Fri', y: 18 }
          ]
        ]}
      />
      <Typography variant={'caption'} className={props.classes.chartCaption}>Emails Sent</Typography>
    </Paper>
  )
}

export default compose(
  withStyles(ChartStyles),
  withTheme()
)(EmailSent);
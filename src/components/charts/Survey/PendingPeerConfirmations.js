import React from 'react'
import { compose } from 'redux'
import { PieChart } from 'react-easy-chart'
import { withStyles, withTheme, Paper, Typography  } from '@material-ui/core'
import { ChartStyles } from '../styles'


const PendingPeerConfirmations = (props, context) => {

  const { theme } = props;

  const pendingPeerConfirmation = [
    { key: '-', value: 78, color: theme.palette.report.fill },
    { key: '-', value: 22, color: theme.palette.background.default },
  ];
  

  return (
    <Paper className={props.classes.chartContainer}>
      <PieChart
          id={'pending-pier-confirmations'}
          styles={{ display: 'flex', justifyContent: 'center' }}
          data={pendingPeerConfirmation}
          size={200}
          innerHoleSize={170} />
      <Typography variant={'caption'} className={props.classes.chartCaption}>Pending Peer Confirmations</Typography>
    </Paper>
  )
}

export default compose(
  withStyles(ChartStyles),
  withTheme
)(PendingPeerConfirmations);
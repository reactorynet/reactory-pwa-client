import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import {
  Chip,
  IconButton,
  Icon,
  InputLabel,
  Input,
  Typography,
  Tooltip,
} from '@material-ui/core';
import uuid from 'uuid';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { LineChart, PieChart } from 'react-easy-chart';


class PieChartWidget extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    chip: {
      margin: theme.spacing.unit,
    },
    newChipInput: {
      margin: theme.spacing.unit
    }
  });

  static propTypes = {
    formData: PropTypes.array,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: [],
    readOnly: false
  }
    
  render(){
    const self = this
    const { formData, uiSchema, idSchema } = this.props
    //console.log('Rendering Pie Chart', this.props);
    return (
      <Fragment>
       <PieChart
            id={idSchema.$id || uuid()}
            styles={{ display: 'flex', justifyContent: 'center' }}
            data={this.props.formData}
            size={120}
            innerHoleSize={100}
        />
        <Typography variant="caption" style={{textAlign: 'center', margin:'auto'}}>{this.props.schema.title}</Typography>
      </Fragment>
    )
  }
}
export const PieChartWidgetComponent = compose(withTheme(), withStyles(PieChartWidget.styles))(PieChartWidget)
export default { 
  PieChartWidgetComponent
}

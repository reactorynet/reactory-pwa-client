import React, { Component, Fragment, PureComponent } from 'react'
import PropTypes from 'prop-types'
import {
  Chip,
  IconButton,
  Icon,
  InputLabel,
  Input,
  Typography,  
} from '@material-ui/core';
import uuid from 'uuid';
import { compose } from 'recompose';
import lodash, { isNull, isArray } from 'lodash';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withContentRect } from 'react-measure';
import {
  Area,
  Bar,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Sector,
  ResponsiveContainer
} from 'recharts';



class LineChartWidget extends PureComponent<any> {  

  render() {

    const { formData, uiSchema, contentRect } = this.props;

    if(isNull(formData) === true || formData === undefined) {
      return <Typography>NO DATA</Typography> 
    }

    if(isNull(formData.options) === true || formData.options === undefined) return <Typography>[Composed Chart] - NO OPTIONS</Typography> 
    else {
      let { 
        line,
        series = [], 
        xAxis, 
        yAxis = {}
      } = formData.options;

      const { data = [] } = formData;

      return (
        <ResponsiveContainer height={contentRect.bounds.height || 400} width="95%">
            <ComposedChart width={contentRect.bounds.width || 640} height={contentRect.bounds.height || 400} data={data}>
              <XAxis {...xAxis} />
              <YAxis {...yAxis} />
              <Tooltip />
              <Legend />
              <CartesianGrid stroke="#f5f5f5" />
              {series.length === 0 && <Line {...line} />}
              {series.length > 0 && series.map((l,k) => <Line {...l} key={k} />)}
            </ComposedChart>    
          </ResponsiveContainer>  
      );
    }           
  }
};


const LineChartWidgetComponent = compose(withTheme, withContentRect('bounds'))(LineChartWidget);

export default LineChartWidgetComponent;
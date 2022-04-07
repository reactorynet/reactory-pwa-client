import React, { Component, Fragment, PureComponent } from 'react'
import PropTypes from 'prop-types'
import {
  Chip,
  IconButton,
  Icon,
  InputLabel,
  Input,
  Paper,
  Tooltip as MaterialTooltip,
  Typography,
  Theme,  
} from '@mui/material';
import uuid from 'uuid';
import { compose } from 'redux';
import lodash, { isNull, isArray } from 'lodash';
import { withStyles, withTheme } from '@mui/styles';
import { withContentRect } from 'react-measure';
import { withApi } from '@reactory/client-core/api';
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



const HtmlTooltip = withStyles((theme: Theme) => ({
  tooltip: {
    backgroundColor: '#f5f5f9',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: '1px solid #dadde9',
  },
}))(MaterialTooltip);





class LineChartWidget extends PureComponent<any> {  

  render() {

    const { formData, uiSchema, contentRect, api } = this.props;

    if(isNull(formData) === true || formData === undefined) {
      return <Typography>NO DATA</Typography> 
    }

    const CustomTooltip = (props: any) => {

      const { active, payload, label } = props;      
      if (active) {
        return (
          <Paper square={true} variant={'outlined'} style={{ padding: '8px' }}>
            <Typography>{label}</Typography>
            {payload && payload.map((item) => <Typography>{`${item.name} : ${api.utils.humanNumber(item.value)}`}</Typography>)}                    
          </Paper>
        );
      }
    
      return null;
    };

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
              <Tooltip content={<CustomTooltip />}/>
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

//@ts-ignore
const LineChartWidgetComponent = compose(withTheme, withApi, withContentRect('bounds'))(LineChartWidget);

export default LineChartWidgetComponent;
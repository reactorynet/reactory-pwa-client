import React from 'react';
import {
  Paper,
  Typography,
  Tooltip as MaterialTooltip,
  Box,
} from '@mui/material';
import { withTheme } from '@mui/styles';
import { withContentRect } from 'react-measure';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Reactory from '@reactory/reactory-core';

const getDefaultOptionsFromSchema = (schema: Reactory.Schema.IArraySchema, uiSchema:Reactory.Schema.ILineChartUISchema ): Reactory.Schema.ILineChartUIOptions => {
  // If schema is array, infer x/y keys from items
  if (schema && schema.type === 'array' && schema.items && typeof schema.items === 'object') {
    const options: any = uiSchema?.['ui:options'] || {};
    let xKey = options?.xKey || 'date';
    let yKey = options?.yKey || 'value';
    return {
      line: { type: 'monotone', dataKey: yKey, stroke: '#8884d8' },
      series: options?.series || [],
      xAxis: { dataKey: xKey },
      yAxis: { dataKey: yKey },
      bounds: {
        width: uiSchema?.['ui:options']?.bounds?.width || 345,
        height: uiSchema?.['ui:options']?.bounds?.height || 300,
      },
    };
  }
  // fallback
  return {
    line: { type: 'monotone', dataKey: 'value', stroke: '#8884d8' },
    series: [],
    xAxis: { dataKey: 'date' },
    yAxis: { dataKey: 'value' },
    bounds: {
      width: uiSchema?.['ui:options']?.bounds?.width || 345,
      height: uiSchema?.['ui:options']?.bounds?.height || 300,
    },
  };
};

const defaultData = [
  { name: 'A', value: 0 },
  { name: 'B', value: 0 },
  { name: 'C', value: 0 },
  { name: 'D', value: 0 },
  { name: 'E', value: 0 },
];

const CustomTooltip = ({ active, payload, label, reactory }) => {
  if (active) {
    return (
      <Paper square variant={'outlined'} style={{ padding: '8px' }}>
        <Typography>{label}</Typography>
        {payload && payload.map((item, idx) => (
          <Typography key={idx}>{`${item.name} : ${reactory.utils.humanNumber(item.value)}`}</Typography>
        ))}
      </Paper>
    );
  }
  return null;
};



const LineChartWidget = (props) => {
  const { formData, schema, reactory, uiSchema } = props;

  // Infer default options from schema
  const options = getDefaultOptionsFromSchema(schema, uiSchema);  
  const chartData = (Array.isArray(formData) && formData.length > 0) ? formData : defaultData;

  let { line, series = [], xAxis, yAxis = {}, bounds } = options;
  const data = chartData;

  return (
    <Box padding={2} sx={{ backgroundColor: 'background.paper' }}>
      {schema?.title && (
        <Typography variant="h6" sx={{ mb: 1 }}>{schema.title}</Typography>
      )}
      {schema?.description && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>{schema.description}</Typography>
      )}
      <ResponsiveContainer height={bounds?.height ?? 400} width="95%">
        <ComposedChart width={bounds?.width ?? 640} height={bounds?.height ?? 400} data={data}>
          <XAxis {...xAxis} />
          <YAxis {...yAxis} />
          {/*@ts-ignore - Recharts types are not fully compatible with MUI theme*/}
          <Tooltip content={<CustomTooltip reactory={reactory} />}/>
          <Legend />
          <CartesianGrid stroke="#f5f5f5" />
          { /**@ts-ignore - Recharts types are not fully compatible with MUI theme */ }
          {series.length === 0 && <Line {...line} key={0} />}
          {series.length > 0 && series.map((l, k) => <Line {...l} key={k} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default withTheme(withReactory(withContentRect('bounds')(LineChartWidget)));
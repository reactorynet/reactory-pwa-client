import React from 'react';
import {
  Paper,
  Typography,
} from '@mui/material';
import { compose } from 'redux';
import { useTheme } from '@mui/material/styles';
import { withContentRect } from 'react-measure';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartWidgetProps {
  formData?: {
    data?: any[];
    options?: {
      xAxis?: any;
      yAxis?: any;
      bar?: any;
    }
  };
  schema?: any;
  uiSchema?: any;
  contentRect: {
    bounds: {
      height?: number;
      width?: number;
    }
  };
  api: any;
}

const defaultData = [
  { name: 'Category A', value: 400 },
  { name: 'Category B', value: 300 },
  { name: 'Category C', value: 200 },
  { name: 'Category D', value: 278 },
  { name: 'Category E', value: 189 },
];

const getDefaultOptionsFromSchema = (schema: any, uiSchema: any): any => {
  return {
    xAxis: {
      dataKey: 'name'
    },
    bar: {
      dataKey: 'value',
      fill: '#8884d8'
    },
    bounds: {
      width: uiSchema?.['ui:options']?.bounds?.width ?? 345,
      height: uiSchema?.['ui:options']?.bounds?.height ?? 300,
    },
  };
};

const CustomTooltip = ({ active, payload, label, reactory }: any) => {
  if (active && payload) {
    return (
      <Paper square={true} variant={'outlined'} style={{ padding: '8px' }}>
        {payload.map((item: any) => (
          <Typography key={`${label}-${item.name}`}>
            {`${item.name} : ${reactory.utils.humanNumber(item.value)}`}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

const BarChartWidget: React.FC<BarChartWidgetProps> = ({ formData, schema, uiSchema, api: reactory }) => {
  const theme = useTheme();
  const defaultOptions = getDefaultOptionsFromSchema(schema, uiSchema);
  const options = { ...defaultOptions, ...(formData?.options ?? {}) };
  const data = (formData?.data && Array.isArray(formData.data) && formData.data.length > 0)
    ? formData.data
    : defaultData;

  const { bar, xAxis, yAxis, bounds } = options;

  return (
    <div>
      {schema?.title && (
        <Typography variant="h6" sx={{ mb: 1 }}>{schema.title}</Typography>
      )}
      {schema?.description && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>{schema.description}</Typography>
      )}
      <ResponsiveContainer height={bounds?.height ?? 400} width="95%">
        <BarChart
          width={bounds?.width ?? 640}
          height={bounds?.height ?? 400}
          data={data}
        >
          <XAxis {...xAxis} />
          <YAxis {...yAxis} />
          <Tooltip content={<CustomTooltip reactory={reactory} />} />
          <Legend />
          <CartesianGrid stroke="#f5f5f5" />
          <Bar {...bar} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default compose(
  withReactory,
  withContentRect('bounds')
)(BarChartWidget);

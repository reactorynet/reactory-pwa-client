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
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ComposedChartWidgetProps {
  formData?: {
    data?: any[];
    options?: {
      xAxis?: any;
      yAxis?: any;
      area?: any;
      bar?: any;
      line?: any;
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
  { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
  { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
  { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
  { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
];

const getDefaultOptionsFromSchema = (schema: any, uiSchema: any): any => {
  return {
    xAxis: {
      dataKey: 'name',
    },
    yAxis: {},
    area: {
      dataKey: 'amt',
      fill: '#8884d8',
      stroke: '#8884d8',
    },
    bar: {
      barSize: 20,
      fill: '#413ea0',
      dataKey: 'pv'          
    },
    line: {
      type: 'monotone',
      dataKey: 'uv',
      stroke: '#ff7300'
    },
    bounds: {
      width: uiSchema?.['ui:options']?.bounds?.width ?? 345,
      height: uiSchema?.['ui:options']?.bounds?.height ?? 300,
    },
  };
};

const ComposedChartWidget: React.FC<ComposedChartWidgetProps> = (props) => {
  const theme = useTheme();
  const { formData, schema, uiSchema, contentRect, api: reactory } = props;
  const defaultOptions = getDefaultOptionsFromSchema(schema, uiSchema);
  const options = { ...defaultOptions, ...(formData?.options ?? {}) };
  const data = (formData?.data && Array.isArray(formData.data) && formData.data.length > 0)
    ? formData.data
    : defaultData;

  const { area, bar, line, xAxis, yAxis, bounds } = options;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload) {
      return (
        <Paper square={true} variant={'outlined'} style={{ padding: '8px' }}>
          {payload.map((item: any, index: number) => (
            <Typography key={index}>{`${item.name} : ${reactory.utils.humanNumber(item.value)}`}</Typography>
          ))}                    
        </Paper>
      );
    }
    return null;
  };

  return (
    <div>
      {schema?.title && (
        <Typography variant="h6" sx={{ mb: 1 }}>{schema.title}</Typography>
      )}
      {schema?.description && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>{schema.description}</Typography>
      )}
      <ResponsiveContainer height={bounds?.height ?? 400} width="95%">
        <ComposedChart 
          width={bounds?.width ?? 640} 
          height={bounds?.height ?? 400} 
          data={data}
        >
          <XAxis {...xAxis} />
          <YAxis {...yAxis} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <CartesianGrid stroke="#f5f5f5" />
          <Area {...area} />
          <Bar {...bar} />
          <Line {...line} />
        </ComposedChart>    
      </ResponsiveContainer>
    </div>
  );
}

export default compose(
  withReactory,
  withContentRect('bounds')
)(ComposedChartWidget);

import React from 'react';
import {
  Paper,
  Typography,
} from '@mui/material';
import { compose } from 'redux';
import lodash from 'lodash';
import { useTheme } from '@mui/material/styles';
import { withContentRect } from 'react-measure';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import {
  Funnel,
  FunnelChart,
  LabelList,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface FunnelChartWidgetProps {
  formData: any;
  schema?: any;
  uiSchema?: any;
  contentRect: {
    bounds: {
      height?: number;
    }
  }
}

const defaultData = [
  { name: 'Stage 1', value: 100 },
  { name: 'Stage 2', value: 80 },
  { name: 'Stage 3', value: 60 },
  { name: 'Stage 4', value: 40 },
  { name: 'Stage 5', value: 20 },
];

const getDefaultOptionsFromSchema = (schema: any, uiSchema: any): any => {
  return {
    bounds: {
      width: uiSchema?.['ui:options']?.bounds?.width || 345,
      height: uiSchema?.['ui:options']?.bounds?.height || 300,
    },
  };
};

const FunnelChartWidget: React.FC<FunnelChartWidgetProps> = ({ formData, schema, uiSchema, contentRect }) => {
  const theme = useTheme();
  const defaultOptions = getDefaultOptionsFromSchema(schema, uiSchema);
  const options = { ...defaultOptions, ...(formData?.options || {}) };
  const data = (formData?.data && Array.isArray(formData.data) && formData.data.length > 0)
    ? formData.data
    : defaultData;
  
  return (
    <div>
      {schema?.title && (
        <Typography variant="h6" sx={{ mb: 1 }}>{schema.title}</Typography>
      )}
      {schema?.description && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>{schema.description}</Typography>
      )}
      <ResponsiveContainer height={options.bounds?.height || 400} width="95%">
        <FunnelChart>
          <Tooltip />
          <Funnel
            dataKey="value"
            data={data}
            isAnimationActive
          >
            <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}

export default compose(
  withReactory,
  withContentRect('bounds')
)(FunnelChartWidget);

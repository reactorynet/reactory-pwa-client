import React from 'react';
import {
  Box,
  Paper,
  Typography,
} from '@mui/material';
import * as uuid from 'uuid';
import { compose } from 'redux';
import { useTheme } from '@mui/material/styles';
import { withContentRect } from 'react-measure';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import {
  Cell,
  PieChart,
  Pie,
  Sector,
  ResponsiveContainer
} from 'recharts';

const renderSimpleActiveShape = (props: any, value: number) => (
  <g>
    <text
      x={props.cx}
      y={props.cy}
      fontSize="40"
      fontWeight="bold"
      textAnchor="middle"
      dominantBaseline="central"
      fill="#fff"
    >
      {value}
    </text>
    <Sector
      cx={props.cx}
      cy={props.cy}
      innerRadius={props.innerRadius}
      outerRadius={props.outerRadius}
      startAngle={props.startAngle}
      endAngle={props.endAngle}
      fill={props.fill}
    />
  </g>
);

const renderNoDataPie = (cx: string, cy: string, innerRadius: number, outerRadius: number) => (
  <Pie
    activeIndex={0}
    activeShape={props => renderSimpleActiveShape(props, 0)}
    data={[{name: 'data', value: 100}]}
    dataKey="value"
    stroke="none"
    fill="#87a1ca"
    cx={cx}
    cy={cy}
    innerRadius={innerRadius}
    outerRadius={outerRadius}
  />
);

interface PieChartWidgetProps {
  formData: any;
  idSchema?: any;
  uiSchema?: any;
  schema?: any;
  reactory: Reactory.Client.ReactorySDK;  
}

const getDefaultOptionsFromSchema = (schema: any, uiSchema: any, reactory: Reactory.Client.ReactorySDK): any => {
    
  let options: any = {
    title: uiSchema?.['ui:options']?.title || schema?.title,
    description: uiSchema?.['ui:options']?.description || schema?.description,
    dataKey: uiSchema?.['ui:options']?.dataKey || "value",
    nameKey: uiSchema?.['ui:options']?.nameKey || "name",
    colors: uiSchema?.['ui:options']?.colors || [],
    activeItemTextLabel: uiSchema?.['ui:options']?.activeItemTextLabel || null,
    style: uiSchema?.['ui:options']?.style || {},
    cx: "50%",
    cy: "50%",
    data: [
      {
        name: 'Default',
        value: 0
      }
    ],
    bounds: {
      width: uiSchema?.['ui:options']?.width || 345,
      height: uiSchema?.['ui:options']?.height || 300,
    },    
  };

  // set the inner and outer radius based on the bounds
  options.innerRadius = 0; // default to 0
  options.outerRadius = uiSchema?.['ui:options']?.height / 2 - 50;

  if (uiSchema?.['ui:options']?.innerRadius) {
    // do sanity check on size
    if (uiSchema?.['ui:options']?.innerRadius > uiSchema?.['ui:options']?.height / 2) {
      options.innerRadius = 0;
    } else {
      options.innerRadius = uiSchema?.['ui:options']?.innerRadius;
    }
  }

  if (uiSchema?.['ui:options']?.outerRadius) {
    // do sanity check on size
    if (uiSchema?.['ui:options']?.outerRadius > uiSchema?.['ui:options']?.height / 2) {
      options.outerRadius = uiSchema?.['ui:options']?.height / 2 - 50;
    } else {
      options.outerRadius = uiSchema?.['ui:options']?.outerRadius;
    }
  }

  if (options.colors.length === 0) {
    //@ts-ignore
    const colorPalette = reactory.muiTheme?.palette?.primary?.colors;
    if (colorPalette && colorPalette.length > 0) {
      options.colors = colorPalette;
    }
  }
  return options;
};

const PieChartWidget: React.FC<PieChartWidgetProps> = (props) => { 
  const theme = useTheme();
  const { reactory } = props;
  const { template } = reactory.utils;
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [activeElementData, setActiveElementData] = React.useState<any>(null);

  const clearingChartData = (chartData: any[]) => {
    if(!chartData) return [];
    return chartData.filter(item => item.value > 0);
  }

  const onPieEnter = (data: any, index: number) => {
    setActiveIndex(index);
    setActiveElementData(data);
  }

  const renderActiveShape = (shapeProps: any) => {
    const RADIAN = Math.PI / 180;
    const { humanNumber } = props.reactory.utils;
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value, textColor = '#000'
    } = shapeProps;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const activeItemTextLabel = uiSchema?.['ui:options']?.activeItemTextLabel;
    const activeItemTextColor = uiSchema?.['ui:options']?.activeItemTextColor;
    const activeItemTextFormat = uiSchema?.['ui:options']?.activeItemTextFormat || '';

    // Determine label color - use fill color unless specified otherwise
    const labelColor = activeItemTextColor || fill;

    // Determine text styling based on format
    const textStyle: any = {};
    if (activeItemTextFormat.toLowerCase().includes('bold')) textStyle.fontWeight = 'bold';
    if (activeItemTextFormat.toLowerCase().includes('italic')) textStyle.fontStyle = 'italic';
    if (activeItemTextFormat.toLowerCase().includes('underline')) textStyle.textDecoration = 'underline';

    // Define 16 sectors with specific label positioning offsets
    // Each sector covers 22.5 degrees (360/16)
    const sectorOffsets = [
      // Top-right sectors (0-3) -0° to 90°
      { x: 10, y: -20, anchor: 'start' },   // Sector 0 0-22.5°
      { x: 10, y: -10, anchor: 'start' },   // Sector 1: 22.5-45°
      { x: 10, y: 0, anchor: 'start' },   // Sector 2: 45-67.5°
      { x: 10, y: -5, anchor: 'start' },     // Sector 3: 67.5-90°
      // Top-left sectors (4-7) 90° to 180°
      { x: -10, y: -20, anchor: 'end' },    // Sector 4: 90-112.5°
      { x: -10, y: -10, anchor: 'end' },    // Sector 5: 112.5-135°
      { x: -10, y: 0, anchor: 'end' },    // Sector 6: 135-157.5°
      { x: -10, y: 0, anchor: 'end' },      // Sector 7: 157.5-180°  
      // Bottom-left sectors (8-11) 180° to 270°
      { x: -10, y: -5, anchor: 'end' },     // Sector 8: 180-202.5°
      { x: -10, y: 0, anchor: 'end' },     // Sector 9: 202.5-225°
      { x: -10, y: 0, anchor: 'end' },     // Sector 10: 225-247.5°
      { x: -10, y: 0, anchor: 'end' },      // Sector 11: 247.5-270°  
      // Bottom-right sectors (12-15) 270° to 360°
      { x: 10, y: -5, anchor: 'start' },    // Sector 12: 270-292.5°
      { x: 10, y: 0, anchor: 'start' },    // Sector 13: 292.5-315°
      { x: 10, y: 0, anchor: 'start' },    // Sector 14: 315-337.5°
      { x: 10, y: 0, anchor: 'start' }      // Sector 15: 337.5-360°
    ];

    // Calculate which sector the midAngle falls into (0-15)
    const normalizedAngle = ((midAngle + 360) % 360);
    const sectorIndex = Math.floor(normalizedAngle / 22.5);
    const sectorOffset = sectorOffsets[sectorIndex];

    // Prepare the combined label text
    let combinedLabelText = `${humanNumber(value)}`;
    if (activeItemTextLabel) {
      const itemText = template(activeItemTextLabel)({ reactory, value, percent, payload });
      combinedLabelText = `${itemText} ${humanNumber(value)}`;
    }

    // Apply sector-specific positioning for all text elements
    const labelX = ex + sectorOffset.x;
    const labelY = ey + sectorOffset.y;
    const labelAnchor = sectorOffset.anchor;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text 
          x={labelX} 
          y={labelY} 
          textAnchor={labelAnchor} 
          fill={labelColor}
          style={textStyle}
        >
          {combinedLabelText}
        </text>
        <text 
          x={labelX} 
          y={labelY} 
          dy={18} 
          textAnchor={labelAnchor} 
          fill={labelColor} 
          style={{fontSize:'10px', fontWeight: 'bold'}}
        >
          {`${(percent * 100).toFixed(2)}%`}
        </text>
      </g>
    );
  }

  const { formData, schema, uiSchema } = props;
  const defaultOptions = getDefaultOptionsFromSchema(schema, uiSchema, reactory);
  const pieProps = { ...defaultOptions, ...(formData?.options || {}) };
  const data = (Array.isArray(formData) && formData.length > 0) 
    ? formData 
    : defaultOptions.data;

  pieProps.data = data;
  pieProps.onMouseEnter = onPieEnter;
  pieProps.activeIndex = activeIndex;
  pieProps.activeShape = renderActiveShape;

  const renderChart = () => {
    const hasData = pieProps.data.length > 0;
    
    if(hasData) {
      return (
        <PieChart>
          <Pie 
            innerRadius={pieProps.innerRadius} 
            outerRadius={pieProps.outerRadius}
            dataKey={pieProps.dataKey}
            nameKey={pieProps.nameKey}
            data={pieProps.data}
            onMouseEnter={pieProps.onMouseEnter}
            activeIndex={pieProps.activeIndex}
            activeShape={pieProps.activeShape}
          >
            {pieProps.data.map((entry: any, index: number) => (
              <Cell                
                key={entry?.id || index}
                stroke={entry?.stroke || entry?.options?.stroke || pieProps.colors[index % pieProps.colors.length]}
                strokeWidth={entry?.strokeWidth || entry?.options?.strokeWidth || 2}
                fill={entry?.fill || entry?.options?.fill || pieProps.colors[index % pieProps.colors.length]}
              />
            ))}
          </Pie>
        </PieChart>
      );
    }  

    return (
      <PieChart>
        {renderNoDataPie("50%", "50%", pieProps.innerRadius || 70, pieProps.outerRadius || 120)}
      </PieChart>
    );
  }

  return (
    <Box padding={2} sx={{ backgroundColor: 'background.paper' }}>
      <style>
        {`
          .recharts-wrapper g:focus {
            outline: none;
          }
        `}
      </style>
      {schema?.title && (
        <Typography variant="h6" sx={{ mb: 1 }}>{schema.title}</Typography>
      )}
      {schema?.description && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>{schema.description}</Typography>
      )}
      <ResponsiveContainer height={pieProps.bounds?.height || 400} width="95%" style={pieProps.style}>
        {renderChart()}      
      </ResponsiveContainer>
    </Box>
  );
}

export default compose(
  withReactory,
  withContentRect('bounds')
)(PieChartWidget);

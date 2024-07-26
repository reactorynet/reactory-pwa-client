import React, { Component, Fragment, PureComponent } from 'react'
import PropTypes from 'prop-types'
import {
  Chip,
  IconButton,
  Icon,
  InputLabel,
  Input,
  Paper,
  Typography,  
} from '@mui/material';
import * as uuid from 'uuid';
import { compose } from 'redux'
import lodash, { isNull, isArray } from 'lodash';
import { withStyles, withTheme } from '@mui/styles';
import { withContentRect } from 'react-measure';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
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

const data = [
  {
    name: 'Page A', uv: 4000, pv: 2400, amt: 2400,
  },
  {
    name: 'Page B', uv: 3000, pv: 1398, amt: 2210,
  },
  {
    name: 'Page C', uv: 2000, pv: 9800, amt: 2290,
  },
  {
    name: 'Page D', uv: 2780, pv: 3908, amt: 2000,
  },
  {
    name: 'Page E', uv: 1890, pv: 4800, amt: 2181,
  },
  {
    name: 'Page F', uv: 2390, pv: 3800, amt: 2500,
  },
  {
    name: 'Page G', uv: 3490, pv: 4300, amt: 2100,
  },
];


const renderSimpleActiveShape = (props, value) => (
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

const renderNoDataPie = (cx, cy, innerRadius, outerRadius) => (
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



class PieChartWidget extends Component<any, any> {  
  constructor(props) {
    super(props);
    this.state = {
      activeIndex: 0
    };
    this.onPieEnter = this.onPieEnter.bind(this);
    this.renderActiveShape = this.renderActiveShape.bind(this);
    this.renderChart = this.renderChart.bind(this);
    this.renderTitle = this.renderTitle.bind(this);
  }


  clearingChartData(chartData) {
    if(!chartData) return [];

    return chartData.filter(item => item.value > 0);
  }

  onPieEnter(data, index) {
    this.setState({
      activeIndex: index,
      activeElementData: data
    });
  }

  renderActiveShape(props){
    const RADIAN = Math.PI / 180;
    const { humanNumber } = this.props.api.utils;
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value, textColor = '#000'
    } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={textColor}>{payload.name}</text>
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
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill={textColor}>{`${humanNumber(value)}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill={textColor} style={{fontSize:'10px', fontWeight: 'bold'}}>
          {`${(percent * 100).toFixed(2)}%`}
        </text>
      </g>
    );
  }

  renderChart() {

    let options = { multiple:  false }; 
    let data = { data: { } };
    
    let pieProps:any = {
      dataKey:"value", 
      nameKey:"name",
      cx:"50%",
      cy:"50%",
      data:[
        {
          name: 'Sample',
          value: 100
        }
      ],
    };    
    
    const  { formData, idSchema, uiSchema, theme, api } = this.props;
    const pies = [];
    
    pieProps.id = idSchema && idSchema.id ? idSchema.id : uuid.v4();
    if(formData && typeof formData === 'object' ) {
      if(formData.data && isArray(formData.data) === true ) {
        pieProps.data = formData.data;  
        //sanitize if needed
      }

      if(formData.options && typeof formData.options === 'object') pieProps = { ...pieProps, ...formData.options }

    }
    

    if(formData !== null && typeof formData === 'number') {
      pieProps.data = [{
        name: this.props.schema.title,
        value: formData
      }]
    }


    if(uiSchema['ui:options'] !== null && typeof uiSchema['ui:options'] === 'object') {
      pieProps = { ...uiSchema['ui:options'], ...pieProps };
    }

    pieProps.onMouseEnter = this.onPieEnter;
    pieProps.activeIndex= this.state.activeIndex;
    pieProps.activeShape = this.renderActiveShape;

    const isSingleChartValue = options.multiple === true;;
    const hasData = pieProps.data.length > 0;
    if(options.multiple === true) {
      pieProps.data.forEach( props => {
        pies.push(<Pie { ...pieProps }>
          {props.data.map( (entry, index) => {            
            return (<Cell key={index} stroke="#3c7abe" strokeWidth={isSingleChartValue ? 0 : 2} fill={entry.color} />);
          })}          
        </Pie>)
      });
    } else {
      pies.push(
      <Pie { ...pieProps } >
        {pieProps.data.map((entry, index)=>{
            return  (<Cell
            key={index}
            stroke="#3c7abe"
            strokeWidth={isSingleChartValue ? 0 : 2}
            fill={entry.fill}
            />)
          }) }
      </Pie>)
    }
        
    if(hasData) {
      return (
          <PieChart>
            {pies}          
          </PieChart>
      );
    }  
    return (
      <PieChart>
        {renderNoDataPie("50%", "50%", pieProps.innerRadius || 70, pieProps.outerRadius || 120)}
      </PieChart>
    );
  }

  renderTitle() {
    return (<Typography>Chart Title</Typography>)
  }

  render() {
   
    return (
      <div>
      <ResponsiveContainer height={this.props.contentRect.bounds.height || 400} width="95%">
      {this.renderChart()}      
      </ResponsiveContainer>
      <Typography style={{textAlign: 'center'}}>{this.props.schema.title}</Typography>
      </div>
    );
  }
}

class FunnelChartWidget extends PureComponent<any> {


  render(){

    let data = [];
    const { formData, contentRect } = this.props;

    if(lodash.isArray(formData) === true) data = formData;
    // @ts-ignore
    if(lodash.isObject(formData) === true && lodash.isArray(formData.data) === true) data = formData.data; 
    
    return (
      <ResponsiveContainer height={contentRect.bounds.height} width="95%">
         <FunnelChart>
          <Tooltip />
          <Funnel
            dataKey="value"
            data={data}
            isAnimationActive>
            <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>     
    )
  }
}

class ComposedChartWidget extends Component<any, any> {
 
  static defaultProps = {
    formData: {
      data: [],
      options: {
        xAxis: {
          dataKey: 'name',
        },
        yAxis: {
  
        },
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
        }
      }
    }
  }
  

  render() {
    let { formData, contentRect, api: reactory } = this.props;

    if(isNull(formData) === true || formData === undefined) {
      return <Typography>[Composed Chart] - NO DATA</Typography> 
    }

    const CustomTooltip = (props) => {

      const { active, payload, label } = props;      
      if (active) {
        return (
          <Paper square={true} variant={'outlined'} style={{ padding: '8px' }}>
            {payload.map((item) => <Typography>{`${item.name} : ${reactory.utils.humanNumber(item.value)}`}</Typography>)}                    
          </Paper>
        );
      }
    
      return null;
    };

    if(isNull(formData.options) === true || formData.options === undefined) return <Typography>[Composed Chart] - NO OPTIONS</Typography> 
    else {
      let { 
        area, 
        bar, 
        line, 
        xAxis 
      } = formData.options;
          
      const { data = [] } = formData;
      return (      
        <ResponsiveContainer height={contentRect.bounds.height || 400} width="95%">
          <ComposedChart width={contentRect.bounds.width || 640} height={contentRect.bounds.height || 400} data={data}>
            <XAxis {...xAxis} />
            <YAxis />
            <Tooltip content={CustomTooltip} />
            <Legend />
            <CartesianGrid stroke="#f5f5f5" />
            <Area {...area} />
            <Bar {...bar} />
            <Line {...line} />
          </ComposedChart>    
        </ResponsiveContainer>  
      );
    }      
  }
}

class BarChartWidget extends Component<any, any> {
  
}

//@ts-ignore
export const PieChartWidgetComponent = compose(withTheme, withReactory, withContentRect('bounds'))(PieChartWidget)
//@ts-ignore
export const FunnelChartWidgetComponent = compose(withTheme, withReactory, withContentRect('bounds'))(FunnelChartWidget);
//@ts-ignore
export const ComposedChartWidgetComponent = compose(withTheme, withReactory, withContentRect('bounds'))(ComposedChartWidget);
export default { 
  PieChartWidgetComponent,
  FunnelChartWidgetComponent,
  ComposedChartWidgetComponent
}

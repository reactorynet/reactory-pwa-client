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
import { compose } from 'redux'
import lodash, { isNull, isArray } from 'lodash';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withContentRect } from 'react-measure';
import {
  Area,
  Bar,
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
import { isObject } from 'util';

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

class LineChartWidget extends PureComponent {  

  render() {
    return (
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 5, right: 30, left: 20, bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
      </LineChart>
    );
  }
}


/*
class PieChartWidget extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    chip: {
      margin: theme.spacing(1),
    },
    newChipInput: {
      margin: theme.spacing(1)
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
*/


class PieChartWidget extends PureComponent {  

  render() {
    debugger;
    let options = { multiple:  false }; 
    let data = { data: { } };
    let pieProps = {
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
    
    const  { formData, idSchema, uiSchema } = this.props;
    const pies = [];
    
    pieProps.id = idSchema && idSchema.id ? idSchema.id : uuid();
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
        value: formData.data
      }]
    }


    if(uiSchema['ui:options'] !== null && typeof uiSchema['ui:options'] === 'object') {
      pieProps = { ...uiSchema['ui:options'], ...pieProps };
    }

    if(options.multiple === true) {
      pieProps.data.forEach( props => {
        pies.push(<Pie { ...pieProps } />)
      });
    } else {
      pies.push(<Pie { ...pieProps } />)
    }


    return (
      <PieChart width={options.width || 400} height={ options.width || 400}>
        {pies}
      </PieChart>
    );
  }
}

class FunnelChartWidget extends PureComponent {


  render(){

    let data = [];
    const { formData, contentRect } = this.props;

    if(lodash.isArray(formData) === true) data = formData;
    if(lodash.isObject(formData) === true && lodash.isArray(formData.data) === true) data = formData.data; 
    
    return (
      <ResponsiveContainer height={contentRect.bounds.height} width="80%">
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

class ComposedChartWidget extends Component {
 
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
    const { formData } = this.props;

    const { 
      area, 
      bar, 
      line, 
      xAxis 
    } = formData.options;

    const { data = [] } = formData;
    return (
      <ComposedChart width={730} height={250} data={data}>
        <XAxis {...xAxis} />
        <YAxis />
        <Tooltip />
        <Legend />
        <CartesianGrid stroke="#f5f5f5" />
        <Area {...area} />
        <Bar {...bar} />
        <Line {...line} />
      </ComposedChart>
    );    
  }
}


export const PieChartWidgetComponent = compose(withTheme, withContentRect('bounds'))(PieChartWidget)
export const LineChartWidgetComponent = compose(withTheme, withContentRect('bounds'))(LineChartWidget)
export const FunnelChartWidgetComponent = compose(withTheme, withContentRect('bounds'))(FunnelChartWidget);
export const ComposedChartWidgetComponent = compose(withTheme, withContentRect('bounds'))(ComposedChartWidget);
export default { 
  PieChartWidgetComponent,
  LineChartWidgetComponent,
  FunnelChartWidgetComponent,
  ComposedChartWidgetComponent
}

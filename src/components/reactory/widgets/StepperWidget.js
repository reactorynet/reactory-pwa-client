import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, forEach } from 'lodash'
import {
  Chip,
  IconButton,
  Icon,
  InputLabel,
  Input,
  Typography,
  Tooltip,
  Stepper,
  StepButton,
  Step,
  StepLabel
} from '@material-ui/core';


import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';

import { withApi, ReactoryApi } from '../../../api/ApiProvider';

class StepperWidget extends Component {
  
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
    api: PropTypes.instanceOf(ReactoryApi),
    formData: PropTypes.number,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: 0,
    readOnly: false
  }

  constructor(props, context){
    super(props, context)
    this.getSteps = this.getSteps.bind(this);

    this.state = {
      activeStep : props.formData || 0,
    };
  }

  getSteps() {
    
    const self = this;

    const { onChange, uiSchema, api, schema, idSchema } = self.props;
    const options = uiSchema['ui:options'];
    api.log('Getting steps for stepper', { props: this.props }, 'debug' );


    let _options = {
      filter: {
        predicate: { group: 'default' }
      },
      steps: [
        {
          group: 'default', key: 'one', value: 1, label: 'Step 1', step: 1
        },
        {
          group: 'default', key: 'two', value: 2, label: 'Step 2', step: 2
        },
        {
          group: 'default', key: 'three', value: 3, label: 'Step 3', step: 3
        },
        {
          group: 'default', key: 'four', value: 4, label: 'Step 4', step: 4
        },
        {
          group: 'default', key: 'five', value: 5, label: 'Step 5', step: 5
        },

      ],
    };    

    if(options) {
      _options = { ..._options, ...options }
    }
    
    if(_options.filter && _options.filter.predicate) {
      Object.getOwnPropertyNames(_options.filter.predicate).map(property => {
        if(typeof _options.filter.predicate[property] === 'string') {
          try {            
            _options.filter.predicate[property] = _.template( _options.filter.predicate[property], { variable: 'props' } )(self.props);
            api.log(`Predicate Resolved For ${idSchema.$id}`, { predicate: _options.filter.predicate[property] }, 'debug' );  
          } catch (templateError) {
             //
            api.log('core.StepperWidget Could not create generate predicate for filter', { predicate: _options.filter.predicate[property],  property }, 'warning' )
          }          
        }
      });

      _options.steps = _.filter(_options.steps, _options.filter.predicate);
    }
        
    let stepElements = [];
    forEach( _options.steps, (step, stepIndex)=> {      


        const selectStep = () => {  
          self.setState({ activeStep: step.step }, ()=>{
            if(self.props.onChange && typeof self.props.onChange === 'function') {
              self.props.onChange(step.value);
            };
          });          
        };  
        
        stepElements.push((
          <Step key={step.key}>
            <StepButton
              onClick={ selectStep }
              completed={false}
              active={self.state.activeStep === step.step}>
                {step.label}
            </StepButton>            
          </Step>
        ));      
    });

    return stepElements;
  }

  

  render(){
    const self = this;
    const step = 0;    
    const { schema, uiSchema } = this.props;
    
    let title = (<Typography variant="caption">{schema.title}</Typography>)
    let description = (<Typography variant="caption">{schema.description || `Select ${schema.title} step`}</Typography>)
    return (
      <Fragment>
        {title}
        <Stepper alternativeLabel nonLinear activeStep={step}>
        {self.getSteps()}
        </Stepper>
      </Fragment>
    )
    
  }
}
const StepperWidgetComponent = compose(withApi, withTheme, withStyles(StepperWidget.styles))(StepperWidget)
export default StepperWidgetComponent

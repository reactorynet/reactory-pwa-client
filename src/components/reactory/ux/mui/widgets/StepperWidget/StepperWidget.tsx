import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, forEach, isArray, intersection } from 'lodash'
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
} from '@mui/material';


import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';

import { withReactory } from '@reactory/client-core/api/ApiProvider';
import ReactoryApi from "@reactory/client-core/api/ReactoryApi";
import _ from 'lodash';

class StepperWidget extends Component<any, any> {
  
  static styles = (theme):any => ({
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

  constructor(props){
    super(props)
    this.getSteps = this.getSteps.bind(this);

    this.state = {
      activeStep : props.formData || 0,
    };
  }

  getSteps() {
    
    const that = this;

    const { onChange, uiSchema, api, schema, idSchema } = that.props;
    const options = uiSchema['ui:options'];
    const objectMapper = api.utils.objectMapper;
    
    api.log('Getting steps for stepper', { props: that.props }, 'debug' );


    let _options: any = {
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
      Object.getOwnPropertyNames(_options.filter.predicate).map((property) => {
        const allowedFilters = 'group key value $func';

        if(typeof _options.filter.predicate[property] === 'string' && allowedFilters.indexOf(property) >= 0) {
          try { 
            if(_options.filter.predicate[property].indexOf('$ref://') === 0) {
              let __map = {};
              __map[`${_options.filter.predicate[property].replace('$ref://', '')}`] = '_v';
              const mapped = objectMapper(self, __map);                                
              _options.filter.predicate[property] = mapped._v;
            } else {
              _options.filter.predicate[property] = _.template( _options.filter.predicate[property], { variable: 'props' } )(that.props);                                    
            }            
            api.log(`Predicate Resolved For ${idSchema.$id}`, { predicate: _options.filter.predicate }, 'debug' );  
          } catch (templateError) {             
            api.log('core.StepperWidget Could not create generate predicate for filter', { predicate: _options.filter.predicate[property],  property }, 'warning' )
          }          
        }

        /**
        if(allowedFilters.indexOf(property) >= 0) {
          if(property === '$func') {
            api.log('calling api registered function');          
            if(api.$func[_options.filter.predicate.$func]) {
              _options.filter.predicate = api.$func[_options.filter.predicate.$func].bind(self);
            } else {
              _options.filter.predicate = api.$func['core.NullFunction'];
            }          
          } 
          else 
          {
            if(typeof _options.filter.predicate[property] === 'string') {
              try { 
                if(_options.filter.predicate[property].indexOf('$ref://') === 0) {
                  let __map = {};
                  __map[`${_options.filter.predicate[property].replace('$ref://', '')}`] = '_v';
                  const mapped = objectMapper(self, __map);                                
                  _options.filter.predicate[property] = mapped._v;
                } else {
                  _options.filter.predicate[property] = _.template( _options.filter.predicate[property], { variable: 'props' } )(self.props);                                    
                }            
                api.log(`Predicate Resolved For ${idSchema.$id}`, { predicate: _options.filter.predicate }, 'debug' );  
              } catch (templateError) {             
                api.log('core.StepperWidget Could not create generate predicate for filter', { predicate: _options.filter.predicate[property],  property }, 'warning' )
              }          
            }
          }          
        }*/
      });        
      //predicate resolves                        
      const originalSteps: any[] = [..._options.steps];
      //this may include steps that are grouped steps which reference others
      let prefiltered: any[] = _.filter(_options.steps, _options.filter.predicate);
      const groupedFiltered: any[] = _.filter(prefiltered, { isGroup: true });
      if(groupedFiltered.length > 0) {
        groupedFiltered.forEach((groupItem) => {
          let expanded = _.filter(originalSteps, (step: any)=>{
             return _.countBy(groupItem.items, (i) =>  (i.key  === step.key) )[step.key] === 1  
          });

          prefiltered = [...prefiltered, ...expanded];
        })        
      } 

      _options.steps = _.sortBy(prefiltered, ['key']).map((step, sdx) => { 
        step.step = sdx + 1;
        return step;
      });
    }
        
    let stepElements = [];
    forEach( _options.steps, (step, stepIndex)=> {      
        if(step) {

          const selectStep = () => {  
            that.setState({ activeStep: step.step }, ()=>{
              if(that.props.onChange && typeof that.props.onChange === 'function') {
                that.props.onChange(step.value);
              };
            });          
          };  
          
          stepElements.push((
            <Step key={step.key}>
              <StepButton
                onClick={ selectStep }>
                  {step.label}
              </StepButton>            
            </Step>
          ));      
        }        
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
const StepperWidgetComponent = compose(withReactory, withTheme, withStyles(StepperWidget.styles))(StepperWidget)
export default StepperWidgetComponent

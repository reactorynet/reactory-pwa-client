import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt } from 'lodash'
import {
  Chip,
  IconButton,
  Icon,
  InputLabel,
  Input,
  Typography,
  Tooltip,
} from '@mui/material';

import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class ChipArray extends Component<any, any> {
  
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

  constructor(props, context){
    super(props, context)
    this.state = {
      newChipLabelText: ""
    };

    this.onNewChipLabelTextChange = this.onNewChipLabelTextChange.bind(this)
    this.onHandleChipLabelDelete = this.onHandleChipLabelDelete.bind(this)
    this.onNewChipLabelTextKeyPress = this.onNewChipLabelTextKeyPress.bind(this)
    //console.log('Chip Array', {props, context});
  }

  onNewChipLabelTextChange(evt){
    this.setState({ newChipLabelText: evt.target.value })
  }

  onNewChipLabelTextKeyPress(evt){
    if(evt.charCode === 13){
      evt.preventDefault()
      const newText = this.state.newChipLabelText
      this.setState({newChipLabelText: "" }, ()=>{
        if(this.props.onChange) this.props.onChange([...this.props.formData, newText])
      });      
    }
  }

  onHandleChipLabelDelete(label, index){
    let items = [...this.props.formData];
    pullAt(items, [index])
    this.props.onChange([...items])
  }

  render(){
    const self = this
    const { uiSchema, api } = self.props;
    let options: any = {
      labelFormat: '${item}'
    };

    if (uiSchema['ui:options']) {
      options = { ...options, ...uiSchema['ui:options'] };
    }

    const chips = this.props.formData.map((item, index) => { 
      const handleDelete = () => {
        self.onHandleChipLabelDelete(item, index);      
      }

      let labelText = `${item}`;

      try {
        labelText = api.utils.template(options.labelFormat)({ item, index });
      } catch ( templateErr )
      {
        labelText = `💥 ${templateErr.message}`
      }
      
      return (<Chip key={index} onDelete={handleDelete} variant="outlined" label={labelText}/>); 
    });
    

    const AddItemComponentWrapper = (props) => {

      if (options.addComponentFqn) {
        
        let AddItemComponent = api.getComponent(options.addComponentFqn);  
        
        if (AddItemComponent !== null && AddItemComponent !== undefined) {  
          const onAddItemHandler = (item) => {
            if (self.props.onChange) {
              self.props.onChange([...self.props.formData, { ...item.formData }]);
            }
          }; 
          
          let addItemProps: any = {};
          if (options.onAddHandler) {
            addItemProps[options.onAddHandler] = onAddItemHandler;
          } else {
            addItemProps.onSubmit = onAddItemHandler;
          }

          
          if (options.addComponentProps) {
            
            addItemProps = {
              ...api.utils.templateObject(options.addComponentProps, self),
              ...addItemProps
            };
            
          }
          
          return (<AddItemComponent {...addItemProps} />);
        }
      }

      return (<Input
        type="text"
        value={self.state.newChipLabelText}
        onChange={self.onNewChipLabelTextChange}
        onKeyPress={self.onNewChipLabelTextKeyPress}
        className={self.props.classes.newChipInput}
      />)

    };
    
    const clearAll = () => this.props.onChange([]);

    return (
      <Fragment>
        { chips }        
        {this.props.formData.length > 0 ? <Tooltip title="Remove all">
          <IconButton onClick={clearAll} size="large">
            <Icon>delete_outline</Icon>
          </IconButton>
        </Tooltip> : null}
        <AddItemComponentWrapper />
      </Fragment>
    );
  }
}

//@ts-ignore
const ChipArrayComponent = compose(withApi, withTheme, withStyles(ChipArray.styles))(ChipArray)
export default ChipArrayComponent

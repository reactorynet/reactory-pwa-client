import React, { Component, Fragment } from 'react';
import { compose } from 'redux';
import { Button, IconButton, Icon, TextField } from '@mui/material';
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/reactory-core';
import LabelWidget from '@reactory/client-core/components/reactory/ux/mui/widgets/LabelWidget';
import { Typography } from '@mui/material';

export interface PagingResult {
  total: number,
  page: number,
  hasNext: boolean,
  pageSize: number
};

export interface JSS {
  [key: string]: any 
};

export interface DataPageWidgetProps {
  formData: PagingResult,
  onChange: any,
  api: Reactory.Client.IReactoryApi,
  classes: JSS, 
  formContext: any,
  [key: string]: any 
};

export interface DataPageWidgetState {
  currentPageInput: number
};

class DataPageWidget extends Component<DataPageWidgetProps, DataPageWidgetState> {
  componentDefs: any;
  constructor(props, context){
    super(props, context);

    this.state = {
      currentPageInput: props.formData.page
    };    
    this.toggleFilterSelector = this.toggleFilterSelector.bind(this);
    this.componentDefs = props.api.getComponents([
      'core.FullScreenModal'
    ]);

    this.onPrevious = this.onPrevious.bind(this);
    this.onNext = this.onNext.bind(this);
    this.onPageNumberChange = this.onPageNumberChange.bind(this);
    this.onPageNumberKeyPress = this.onPageNumberKeyPress.bind(this);    
  }
  
  static styles = (theme) => {
    return {
      container: {
        display: 'flex'
      }
    }
  };

  static defaultProps = {
    formData: [],    
  };

  toggleFilterSelector(){
    // this.setState({ expanded: !this.state.expanded });
  }

  onPrevious(){
    this.props.api.log('onPrevious()', null);
    const _formData: PagingResult = { ...this.props.formData } 

    _formData.page = _formData.page - 1;

    const rootFormData = { 
      ...this.props.formContext.formData 
    };

    this.props.api.log('Root Form Data', rootFormData);    
    rootFormData.paging = _formData;

    this.props.formContext.setFormData(rootFormData, this.props.formContext.refresh);
  }

  onNext(){
    this.props.api.log('onNext()', {props: this.props});    
    const _paging: PagingResult = { ...this.props.formData } 
    _paging.page = _paging.page + 1;
    const rootFormData = { 
      ...this.props.formContext.formData 
    };
    this.props.api.log('Root Form Data', rootFormData);
    rootFormData.paging = _paging;

    this.props.formContext.setFormData(rootFormData, this.props.formContext.refresh);
  }

  onPageNumberKeyPress(evt){
    const self = this;
    self.props.api.log('onPageNumberKeyPress', { evt, charCode: evt.charCode, keyCode: evt.keyCode });    
    self.setState({ 
      currentPageInput: parseInt(evt.target.value)
     });

     if(evt.charCode === 13) {        
      const _paging: PagingResult = { ...this.props.formData }; 
      _paging.page = self.state.currentPageInput;
      
      const rootFormData = { 
        ...self.props.formContext.formData 
      };

      self.props.api.log('Root Form Data', rootFormData);
      rootFormData.paging = _paging;    
      self.props.formContext.setFormData(rootFormData, self.props.formContext.refresh);
     }
  }
  
  onPageNumberChange(evt){
    this.props.api.log('Page number change on data set', { value: evt.target.value });
    this.setState({ 
      currentPageInput: parseInt(evt.target.value)
    }); 
  }

  render(){
    const { FullScreenModal } = this.componentDefs;

    return (
      <div className={this.props.classes.container}>
        {this.props.formData.page > 1 ? 
          <IconButton onClick={this.onPrevious} size="large">
            <Icon>chevron_left</Icon>
          </IconButton> : null}
          <TextField
            id="filled-number"
            label="Data Page"
            type="number"
            InputLabelProps={{
              shrink: true,
            }}
            value={this.state.currentPageInput}
            onChange={this.onPageNumberChange}
            onKeyPress={this.onPageNumberKeyPress}
            variant="filled"
          />
        <Typography variant={"h6"} style={{ marginLeft: '8px' }}>of {Math.floor(this.props.formData.total / this.props.formData.pageSize)}</Typography>
        <IconButton onClick={this.onNext} size="large">
          <Icon>chevron_right</Icon>
        </IconButton>
      </div>
    );
  }
}



const DataPageWidgetComponent = compose(
  withTheme, 
  withStyles(DataPageWidget.styles),
  withReactory
)(DataPageWidget)

export default DataPageWidgetComponent;
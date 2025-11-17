import React, { useState, useEffect, useRef } from 'react';
import { compose } from 'redux';
import { Button, IconButton, Icon, TextField } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
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
  formContext: any,
  [key: string]: any 
};

const PREFIX = 'DataPageWidget';

const classes = {
  container: `${PREFIX}-container`,
};

const Root = styled('div')(({ theme }) => ({
  [`& .${classes.container}`]: {
    display: 'flex'
  }
}));

const DataPageWidget = (props: DataPageWidgetProps) => {
  const theme = useTheme();
  const [currentPageInput, setCurrentPageInput] = useState(props.formData.page);
  
  const componentDefs = useRef(null);

  useEffect(() => {
    componentDefs.current = props.api.getComponents([
      'core.FullScreenModal'
    ]);
  }, [props.api]);

  const toggleFilterSelector = () => {
    // this.setState({ expanded: !this.state.expanded });
  }

  const onPrevious = () => {
    props.api.log('onPrevious()', null);
    const _formData: PagingResult = { ...props.formData } 

    _formData.page = _formData.page - 1;

    const rootFormData = { 
      ...props.formContext.formData 
    };

    props.api.log('Root Form Data', rootFormData);    
    rootFormData.paging = _formData;

    props.formContext.setFormData(rootFormData, props.formContext.refresh);
  }

  const onNext = () => {
    props.api.log('onNext()', {props});    
    const _paging: PagingResult = { ...props.formData } 
    _paging.page = _paging.page + 1;
    const rootFormData = { 
      ...props.formContext.formData 
    };
    props.api.log('Root Form Data', rootFormData);
    rootFormData.paging = _paging;

    props.formContext.setFormData(rootFormData, props.formContext.refresh);
  }

  const onPageNumberKeyPress = (evt) => {
    props.api.log('onPageNumberKeyPress', { evt, charCode: evt.charCode, keyCode: evt.keyCode });    
    setCurrentPageInput(parseInt(evt.target.value));

     if(evt.charCode === 13) {        
      const _paging: PagingResult = { ...props.formData }; 
      _paging.page = currentPageInput;
      
      const rootFormData = { 
        ...props.formContext.formData 
      };

      props.api.log('Root Form Data', rootFormData);
      rootFormData.paging = _paging;    
      props.formContext.setFormData(rootFormData, props.formContext.refresh);
     }
  }
  
  const onPageNumberChange = (evt) => {
    props.api.log('Page number change on data set', { value: evt.target.value });
    setCurrentPageInput(parseInt(evt.target.value));
  }

  const { FullScreenModal } = componentDefs.current || {};

  return (
    <Root className={classes.container}>
      {props.formData.page > 1 ? 
        <IconButton onClick={onPrevious} size="large">
          <Icon>chevron_left</Icon>
        </IconButton> : null}
        <TextField
          id="filled-number"
          label="Data Page"
          type="number"
          InputLabelProps={{
            shrink: true,
          }}
          value={currentPageInput}
          onChange={onPageNumberChange}
          onKeyPress={onPageNumberKeyPress}
          variant="filled"
        />
      <Typography variant={"h6"} style={{ marginLeft: '8px' }}>of {Math.floor(props.formData.total / props.formData.pageSize)}</Typography>
      <IconButton onClick={onNext} size="large">
        <Icon>chevron_right</Icon>
      </IconButton>
    </Root>
  );
}

const DataPageWidgetComponent = compose(
  withReactory
)(DataPageWidget)

export default DataPageWidgetComponent;
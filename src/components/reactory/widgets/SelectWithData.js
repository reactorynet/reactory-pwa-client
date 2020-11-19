import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find, isNil, isEmpty } from 'lodash'
import objectMapper from 'object-mapper'
import {
  Chip,
  IconButton,
  Icon,
  FormControl,
  InputLabel,
  Input,
  MenuItem,
  Typography,
  Tooltip,
  Select,
  FilledInput,
  FormHelperText,
  OutlinedInput,
} from '@material-ui/core';

import { Query } from 'react-apollo';
import gql from 'graphql-tag';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class SelectWithDataWidget extends Component {

  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  });

  static propTypes = {
    formData: PropTypes.any,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object,
    formContext: PropTypes.object
  }

  static defaultProps = {
    readOnly: false
  }

  constructor(props, context) {
    super(props, context)
    this.state = {
      error: undefined
    };
  }

  componentDidCatch(error) {
    this.setState({ error })
  }

  render() {
    const self = this
    const { classes, formContext, formData, required, api, theme } = this.props;
    if (self.state.error !== undefined && self.state.error !== null) {
      api.log('🚩 core.SelecteWithData Error', { self, error: self.state.error }, 'error')
      return <Typography>🚩 core.SelectWithData Error - see log</Typography>
    }

    api.log('Rendering SelectWithData', { formContext, formData }, 'debug');

    let variant = 'standard'
    if (theme.MaterialInput) {
      variant = theme.MaterialInput.variant || variant;
    }

    let InputComponent = Input;
    let inputLabelProps = {};
    switch (variant) {
      case 'outlined': {
        InputComponent = OutlinedInput;
        if (isNil(formData) === true || `${formData}`.trim() === "" || isEmpty(formData) === true) {
          inputLabelProps.shrink = false;
        } else {
          inputLabelProps.shrink = true;
          inputLabelProps.style = {
            backgroundColor: theme.palette.background.paper,
            // marginTop: '4px',
            padding: '4px'
          };
        }
        break;
      }
      case 'filled': {
        InputComponent = FilledInput;
      }
    }

    if (this.props.uiSchema['ui:options']) {

      const {
        query,
        propertyMap,
        resultsMap,
        resultItem,
        multiSelect,
        selectProps = {},
        labelStyle = {},
        formControlProps = {}
      } = this.props.uiSchema['ui:options'];
      const variables = propertyMap ? objectMapper(this.props, propertyMap) : null;
      const onSelectChanged = (evt) => {
        api.log('Raising onChange for data select', { v: evt.target.value })

        self.props.onChange(evt.target.value)
      }

      const emptySelect = required === false ? <MenuItem value="">
        <em>None</em>
      </MenuItem> : null;

      inputLabelProps.style = { ...inputLabelProps.style, ...labelStyle }
      
      if (formData !== null && formData !== undefined && formData !== '') {
        inputLabelProps.shrink = true;
      }

      return (
        <Query query={gql`${query}`} variables={variables} fetchPolicy="cache-and-network" >
          {(props, context) => {
            const { data, loading, error } = props;
            if (loading === true) return (<p>Loading lookups</p>)
            if (error) return (<p>Error Loading lookup: {error}</p>)

            if (data && data[resultItem]) {
              let menuItems = resultsMap ? objectMapper(data, resultsMap) : data[resultItem]
              return (
                <FormControl {...formControlProps} variant={variant}>
                  <InputLabel {...inputLabelProps} htmlFor={this.props.idSchema.$id} required={required}>{this.props.schema.title}</InputLabel>
                  <Select
                    {...selectProps}
                    multiple={multiSelect === true}
                    value={ this.props.formData }
                    onChange={onSelectChanged}
                    name={this.props.name}
                    variant={variant}
                    input={<InputComponent id={this.props.idSchema.$id} value={this.props.formData ? this.props.formData.trim() : ""} />}
                    renderValue={(selected) => {

                      if (!selected || selected == 'undefined' || selected.length === 0) {
                        return <span style={{ color: 'rgba(150, 150, 150, 0.8)' }}>Select</span>;
                      }

                      if (Array.isArray(selected))
                        return selected.join(', ');
                      else
                        return selected;

                    }}>
                    {emptySelect}
                    {menuItems.map((option, index) => {
                      return (
                        <MenuItem key={option.key || index} value={`${option.value}`}>
                          { option.icon ? <Icon>{option.icon}</Icon> : null}
                          { option.label}
                        </MenuItem>)
                    })}
                  </Select>
                </FormControl>)
            } else {
              return <p>No Data Result</p>
            }
          }}
        </Query>
      )

    } else {
      return <React.Fragment>
        <InputLabel htmlFor={this.props.idSchema.$id}>{this.props.schema.title}</InputLabel>
        <Select
          value={""}
          readOnly={true}
          name={this.props.name}
          input={<Input id={this.props.idSchema.$id} />}>
          <MenuItem value="">
            <em>No Query For Select Defined</em>
          </MenuItem>
        </Select>
      </React.Fragment>
    }
  }
}
const SelectWithDataWidgetComponent = compose(withApi, withTheme, withStyles(SelectWithDataWidget.styles))(SelectWithDataWidget)
export default SelectWithDataWidgetComponent

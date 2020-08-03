import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  Button
} from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';
import { withApi } from '../../api/ApiProvider';
import MaterialTable, { MTableToolbar } from 'material-table';

class FreightRequestProductDetailsWidget extends Component {

  render() {
    let {
      api,
      formData,
      classes
    } = this.props;
    let columns = [];
    let data = [];
    let _isLoading = true;

    const inputChangeHandler = (event, rowData) => {
      const row = formData.find(r => r.code === rowData.code);
      row.qty = +event.target.value;
      this.props.onChange(formData);
      this.forceUpdate();
    }

    columns = [
      { title: 'Stockcode', field: 'code' },
      { title: 'Description', field: 'description' },
      { title: 'Unit of Measure', field: 'unitOfMeasure' },
      { title: 'Selling Price (DDP)', field: 'sellingPrice' },
      { title: 'Quantity', field: 'qty', render: rowData => <input className={classes.input} type="number" value={rowData.qty} onChange={(event) => inputChangeHandler(event, rowData)} /> },
      { title: 'Length (cm)', field: 'length' },
      { title: 'Width (cm)', field: 'height' },
      { title: 'Volume (cm3)', field: 'volume' },
    ];


    if (formData && formData.length > 0) {
      formData.forEach(row => {
        data.push({ ...row })
      })
    }

    _isLoading = false

    let options = {
      toolbar: false,
      showTitle: false,
      search: false
    }

    return (
      <MaterialTable
        columns={columns}
        data={data}
        options={options}
        isLoading={_isLoading} />
    )
  }

  static styles = (theme) => {
    return {
      input: {
        width: '70px',
        outline: 'none',
        padding: theme.spacing(1),
        border: 'solid 1px #cccccc',
        borderRadius: '5px'
    }
  }
}
}

const FreightRequestProductDetailsComponent = compose(withTheme, withApi, withStyles(FreightRequestProductDetailsWidget.styles))(FreightRequestProductDetailsWidget);

export default FreightRequestProductDetailsComponent;

import React, { Component } from 'react';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class TableChildWrapper extends Component {

  render() {
    const { uiSchema } = this.props;

    if (uiSchema) {
      const uiOptions = uiSchema['ui:options'];
    }

    return (
      <div>This is the cell wrapper</div>
    );
    // <Tooltip title={_tooltip} placement="right-start">
    //   <div className={classes.currency} {..._containerProps}>
    //     {_prependText != '' && <span>{_prependText}</span>}
    //     <span className={classes.currencyValue}>
    //       {new Intl.NumberFormat(region, { style: 'currency', currency }).format(isCents ? (_value / 100) : _value)}
    //     </span>
    //     {_postpendText != '' && <span>{_postpendText}</span>}
    //   </div>
    // </Tooltip>
  }
}


TableChildWrapper.styles = (theme) => {
  return {}
};


const TableChildWrapperComponent = compose(
  withApi,
  withTheme,
  withStyles(TableChildWrapper.styles))(TableChildWrapper);

export default TableChildWrapperComponent;


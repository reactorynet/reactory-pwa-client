import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { isArray, indexOf } from 'lodash';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { Tooltip } from '@material-ui/core';
import { withApi } from '@reactory/client-core/api/ApiProvider';


class ToolTipHOC extends Component {

  render() {
    const { backgroundColor = 'rgba(0, 0, 0, 0.7)', color = 'rgba(0, 0, 0, 0.87)' } = this.props;
    const StyledTooltip = withStyles(theme => ({
      tooltip: {
        backgroundColor,
        color,
        boxShadow: theme.shadows[1],
        fontSize: 14,
      },
    }))(Tooltip);

    return (
      <StyledTooltip title={this.props.title} placement={this.props.placement}>
        {this.props.children}
      </StyledTooltip>
    );
  }
}

class StyledCurrencyLabel extends Component {

  render() {
    const {
      value,
      condition,
      currency,
      region,
      classes,
      uiSchema,
      currencies,
      displayAdditionalCurrencies = false,
      displayPrimaryCurrency = true,
      currenciesDisplayed = null,
      options = null,
    } = this.props;

    let isCents = true;
    let _value = value;
    let _prependText = '';
    let _postpendText = '';
    let _containerProps = {};
    let _tooltip = '';
    let _tooltipBackgroundColor = '';
    let _tooltipTextColor = '#fff';
    let _tooltipPlacement = 'left-start';
    let _label = '';
    let inlineLabel = false;
    let _additionalCurrencyMapField = 'list_price_cents';
    let _showZeroValues = true;

    let defaultStyle = {}

    if (uiSchema) {
      const uiOptions = uiSchema['ui:options'];

      if (uiOptions.label && uiOptions.label != '')
        _label = uiOptions.label;

      isCents = uiOptions && uiOptions.isCents === false ? false : isCents;
      _value = uiOptions && (uiOptions.valueProp || this.props.formData) ? this.props[uiOptions.valueProp || 'formData'] : value;

      if (uiOptions.defaultStyle) defaultStyle = { ...uiOptions.defaultStyle };

      _containerProps.style = { ...defaultStyle };

      if (uiOptions.prependText && uiOptions.prependText != '')
        _prependText = uiOptions.prependText;

      if (uiOptions.postpendText && uiOptions.postpendText != '')
        _postpendText = uiOptions.postpendText;

      if (uiOptions.conditionalStyles && condition) {
        const matchingCondition = uiOptions.conditionalStyles.find(option => option.key === condition);
        if (matchingCondition) {
          _containerProps.style = { ...defaultStyle, ...matchingCondition.style };
          if (matchingCondition.tooltip) {
            _tooltip = matchingCondition.tooltip;
            _tooltipBackgroundColor = matchingCondition.style.color
          }
        }
      }

      if (uiOptions.inlineLabel)
        inlineLabel = uiOptions.inlineLabel;

      if (uiOptions.additionalCurrencyMapField && uiOptions.additionalCurrencyMapField != '')
        _additionalCurrencyMapField = uiOptions.additionalCurrencyMapField;

      if (uiOptions.showZeroValues != undefined)
        _showZeroValues = uiOptions.showZeroValues;
    }

    let otherCurrencies = [];

    if (currencies && isArray(currencies) && displayAdditionalCurrencies === true) {
      currencies.forEach((currency) => {
        let $add = true;
        if (isArray(currenciesDisplayed) === true) {

          $add = indexOf(currenciesDisplayed, currency.currency_code) >= 0;
        }

        if ($add === true) {
          otherCurrencies.push((
            <div className={classes.currency} {..._containerProps}>
              <span style={{ fontWeight: "bold" }}>({currency.currency_code})&nbsp;</span>
              <span className={classes.currencyValue}>
                {/* {new Intl.NumberFormat(region, { style: 'currency', currency: currency.currency_code }).format(isCents ? (currency.list_price_cents / 100) : currency.list_price_cents)} */}
                {/* {new Intl.NumberFormat(region, { style: 'currency', currency: currency.currency_code }).format(isCents ? (currency[additionalCurrencyMapField] / 100) : currency[additionalCurrencyMapField])} */}
                {
                  !_showZeroValues && currency[_additionalCurrencyMapField] == 0 ?
                    <span>   -   </span>
                    :
                    new Intl.NumberFormat(region, { style: 'currency', currency: currency.currency_code }).format(isCents ? (currency[_additionalCurrencyMapField] / 100) : currency[_additionalCurrencyMapField])
                }
              </span>
            </div>
          ))
        }
      });
    }

    let primaryCurrency = (<div className={classes.currency} {..._containerProps}>
      {_prependText != '' && <span style="font-weight: bold">{_prependText}</span>}
      <span className={classes.currencyValue}>
        {new Intl.NumberFormat(region, { style: 'currency', currency }).format(isCents ? (_value / 100) : _value)}
      </span>
      {_postpendText != '' && <span>{_postpendText}</span>}
    </div>);


    if (inlineLabel) {
      return (
        <div className={classes.inlineContainer}>
          <div>
            {_label != '' && <label className={classes.label}>{_label}</label>}
          </div>
          <div>
            <ToolTipHOC title={_tooltip} color={_tooltipTextColor} backgroundColor={_tooltipBackgroundColor} placement={_tooltipPlacement}>
              <div>
                {displayPrimaryCurrency === true ? primaryCurrency : null}
                {displayAdditionalCurrencies === true ? otherCurrencies : null}
              </div>
            </ToolTipHOC>
          </div>
        </div>
      )
    }

    return (
      <>
        {_label != '' && <label className={classes.label}>{_label}</label>}
        <ToolTipHOC title={_tooltip} color={_tooltipTextColor} backgroundColor={_tooltipBackgroundColor} placement={_tooltipPlacement}>
          <div>
            {displayPrimaryCurrency === true ? primaryCurrency : null}
            {displayAdditionalCurrencies === true ? otherCurrencies : null}
          </div>
        </ToolTipHOC>
      </>
    );
  }
}

StyledCurrencyLabel.propTypes = {
  value: PropTypes.number,
  currency: PropTypes.string,
  symbol: PropTypes.string,
  region: PropTypes.string
};

StyledCurrencyLabel.defaultProps = {
  value: 0,
  currency: 'ZAR',
  symbol: 'R',
  region: 'en-ZA'
};

StyledCurrencyLabel.styles = (theme) => {
  return {
    label: {
      fontSize: '0.9em',
      color: 'rgba(0, 0, 0, 0.54)',
      display: 'block'
    },
    currency: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
      marginRight: theme.spacing(1),
      whiteSpace: 'nowrap'
    },
    currencyValue: {},
    inlineContainer: {
      display: 'flex',
      '& div': {
        display: 'flex',
        alignItems: 'center',
        '& label': {
          marginRight: theme.spacing(3),
          fontSize: '1em'
        }
      },
    }
  }
};


const StyledCurrencyLabelComponent = compose(withApi, withTheme, withStyles(StyledCurrencyLabel.styles))(StyledCurrencyLabel);
export default StyledCurrencyLabelComponent;


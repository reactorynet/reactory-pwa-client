import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { isArray, template, indexOf } from 'lodash';
import { compose } from 'recompose';
import { makeStyles, withStyles, withTheme } from '@material-ui/core/styles';
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
        fontSize: 14
      },
    }))(Tooltip);

    return (
      <StyledTooltip title={this.props.title} placement={this.props.placement}>
        {this.props.children}
      </StyledTooltip>
    );
  }
}

const StyledCurrencyLabel = (props) => {

  try {

    const {
      value,
      condition,
      currency,
      region,
      uiSchema,
      currencies,
      displayAdditionalCurrencies = false,
      displayPrimaryCurrency = true,
      currenciesDisplayed = null,
      options = null,
      style = {},
      valueStyle = {},
      reactory,
      currenciesOrientation = 'row'
    } = props;

    const classes = makeStyles((theme) => {
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
        currenciesContainer: {
          flex: 1,
          flexDirection: currenciesOrientation || "row"
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
        },
        error: {
          color: theme.palette.error,
          fontSize: 'smaller',
        }
      }
    })();


    let isCents = true;
    let _value = value;
    let _prependText = props.prependText || '';
    let _postpendText = props.postpendText || '';
    let _containerProps = props.containerProps || {};
    let _tooltip = props.tooltip || '';
    let _tooltipBackgroundColor = props.tooltipBackgroundColor || '';
    let _tooltipTextColor = props.tooltipTextColor || '#fff';
    let _tooltipPlacement = props.tooltipPlacement || 'left-start';
    let _label = props.label || '';
    let inlineLabel = props.inlineLabel || false;
    let _additionalCurrencyMapField = props.additionalCurrencyMapField || 'list_price_cents';
    let _showZeroValues = props.showZeroValues || true;
    let _currency = currency;

    let defaultStyle = { ...style }
    let error = null;

    if (!_containerProps.style) _containerProps.style = style;

    if (uiSchema) {
      const uiOptions = uiSchema['ui:options'];

      if (uiOptions.label && uiOptions.label != '')
        _label = uiOptions.label;

      if (uiOptions.currency) _currency = uiOptions.currency;

      isCents = uiOptions && uiOptions.isCents === false ? false : isCents;
      _value = uiOptions && (uiOptions.valueProp || props.formData) ? props[uiOptions.valueProp || 'formData'] : value;

      if (uiOptions.defaultStyle) defaultStyle = { ...uiOptions.defaultStyle };

      _containerProps.style = { ...defaultStyle, ..._containerProps.style };

      if (uiOptions.prependText && uiOptions.prependText != '')
        _prependText = uiOptions.prependText;

      if (uiOptions.postpendText && uiOptions.postpendText != '')
        _postpendText = uiOptions.postpendText;

      if (uiOptions.conditionalStyles && condition) {
        const matchingCondition = uiOptions.conditionalStyles.find(option => option.key === condition);
        if (matchingCondition) {
          _containerProps.style = { ...style, ..._containerProps.style, ...defaultStyle, ...matchingCondition.style, };
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


      currencies.forEach((currency_item) => {
        let $add = true;

        if (!isArray(currenciesDisplayed)) {
          let currenciesArray = template(currenciesDisplayed)(props).split(',');
          $add = indexOf(currenciesArray, currency_item.currency_code) >= 0;
        }

        if (isArray(currenciesDisplayed) === true) {
          $add = indexOf(currenciesDisplayed, currency_item.currency_code) >= 0;
        }

        if ($add === true) {
          otherCurrencies.push((
            <div className={classes.currency} {..._containerProps}>
              <span className={classes.currencyValue}>
                {
                  !_showZeroValues && currency_item[_additionalCurrencyMapField] == 0 ?
                    <span>   -   </span>
                    :
                    new Intl.NumberFormat(region, { style: 'currency', currency: currency_item.currency_code }).format(isCents ? (currency_item[_additionalCurrencyMapField] / 100) : currency_item[_additionalCurrencyMapField])
                }
              </span>
            </div>
          ))
        }
      });
    }

    if (_currency.indexOf('${') >= 0) {
      try {
        _currency = reactory.utils.template(_currency)(props);
        if (_currency === null || _currency === undefined || _currency.trim === '') {
          error = 'Could not get a value based on template input'
          _currency = 'ZAR';
        }
      } catch (templateError) {
        error = 'Could not parse template from input.'
        _currency = 'ZAR';
      }
    };

    let primaryCurrency = (
      <div className={classes.currency} {..._containerProps}>
        {_prependText != '' && <span style={{ fontWeight: "bold" }}>{_prependText}</span>}
        <span className={classes.currencyValue} style={valueStyle}>
          {new Intl.NumberFormat(region, { style: 'currency', currency: _currency }).format(isCents ? (_value / 100) : _value)}
        </span>
        {_postpendText != '' && <span>{_postpendText}</span>}
        { error && <span className={classes.error}>{error}</span>}
      </div>
    );


    if (inlineLabel === true) {
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
          <div className={classes.currenciesContainer} style={props.currenciesContainerStyles}>
            {displayPrimaryCurrency === true ? primaryCurrency : null}
            {displayAdditionalCurrencies === true ? otherCurrencies : null}
          </div>
        </ToolTipHOC>
      </>
    );
  } catch (error) {

    return <span>💥{error.message}</span>

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



const StyledCurrencyLabelComponent = compose(withApi, withTheme)(StyledCurrencyLabel);
export default StyledCurrencyLabelComponent;


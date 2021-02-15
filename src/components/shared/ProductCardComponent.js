import React, { Component } from 'react';
import { compose } from 'recompose';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { withStyles, makeStyles, withTheme } from '@material-ui/core/styles';
import { isArray, template, indexOf } from 'lodash';
// import { withTheme } from '@material-ui/styles';
import PropTypes from 'prop-types';
import {
  Grid,
  Avatar,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Divider,
  Icon,
  Fab,
  Tooltip,
} from '@material-ui/core';

import StyledCurrencyWidget from './StyledCurrencyLabel';

const CutomTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: 'transparent',
    color: theme.palette.primary.main,
    fontSize: theme.spacing(1.8)
  },
}))(Tooltip);

const headerStyles = makeStyles((theme) => ({
  headerContainer: {
    display: 'flex',
    padding: theme.spacing(2),
    paddingBottom: 0
  },
  avatarContainer: {
    flex: '0 0 auto',
    marginRight: '16px'
  },
  titleContainer: {
    flex: '1 1 auto'
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '1rem',
    fontWeight: 'bold',
    marginBottom: theme.spacing(0.5)
  },
  copyIcon: {
    fontSize: '1rem',
    marginLeft: theme.spacing(1)
  },
  subtitle: {
    fontSize: '0.9rem',
    lineHeight: '1rem'
  }

}));

const CustomHeader = props => {
  const classes = headerStyles();

  return (
    <div className={classes.headerContainer}>
      <div className={classes.avatarContainer}><Avatar variant="rounded" src={props.image} /></div>
      <div>
        {props.launcher}
      </div>
      <div className={classes.titleContainer}>
        <Typography variant="h4" classes={{ root: classes.title }} onClick={() => props.copyClick(props.title)}>
          {props.title}
          <Tooltip title="Copy to clipboard" placement="right">
            <Icon color="primary" className={classes.copyIcon}>assignment</Icon>
          </Tooltip>
        </Typography>
        <Typography variant="h6" classes={{ root: classes.subtitle }}>{props.subtitle}</Typography>
      </div>
    </div>
  )
}

class ProductCardWidget extends Component {

  static styles = (theme) => {
    const textDark = 'rgba(0,0,0,0.87)';
    return {
      root: { height: '100%' },
      divider: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2)
      },
      contentContainer: {
        paddingLeft: theme.spacing(1.5)
      },
      fieldLabel: {
        display: 'flex',
        alignItems: 'center',
      },
      fieldLabelIcon: {
        marginRight: theme.spacing(1)
      },
      specialBubble: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#770F99',
        color: '#fff',
        marginTop: theme.spacing(1.3),
        paddingTop: theme.spacing(0.5),
        paddingBottom: theme.spacing(0.5),
        paddingLeft: theme.spacing(1.5),
        paddingRight: theme.spacing(1.5),
        borderRadius: '15px',
        fontSize: theme.spacing(1.5),
        textAlign: 'center',
      },
      bubbleIcon: {
        fontSize: '1rem',
        marginRight: theme.spacing(0.5),
      }
    }
  }

  constructor(props, context) {
    super(props, context);
    this.componentDefs = props.api.getComponents(['core.PricingLineChartComponent', 'core.SlideOutLauncher']);
  }

  render() {
    const { props } = this;
    const { classes, data, cardContent, currency, symbol, api, region, theme } = props;
    const { PricingLineChartComponent, SlideOutLauncher } = this.componentDefs;
    const formData = { ...data };

    let _currenciesDisplayed = ['USD', 'EUR', 'GBP', 'ZAR'];
    let _showSpecialPricing = false;
    let _showPricing = false;

    if (cardContent.showSpecialPricing != undefined) _showSpecialPricing = cardContent.showSpecialPricing;
    if (cardContent.showPricing != undefined) _showPricing = cardContent.showPricing;

    if (cardContent.currenciesDisplayed != undefined) {
      if (!isArray(cardContent.currenciesDisplayed)) {
        let currenciesArray = template(cardContent.currenciesDisplayed)(props).split(',');
        _currenciesDisplayed = currenciesArray;
      } else {
        _currenciesDisplayed = cardContent.currenciesDisplayed;
      }
    }

    const copyClickHandler = (labelText) => {
      var tempInput = document.createElement('input');
      tempInput.value = labelText;
      document.body.appendChild(tempInput)
      tempInput.select()
      document.execCommand('copy');
      tempInput.remove();

      api.createNotification('Copied To Clipboard!', { body: `'${labelText}' successfully copied to your clipboard.`, showInAppNotification: true, type: 'success' });
    }

    const tooltipTitle = (tip) => {
      switch (tip) {
        case 'on_syspro':
          return 'ON SYSPRO'
        case 'not_on_syspro':
          return 'NOT ON SYSPRO'
        case 'on_hold':
          return 'ON HOLD'
        case 'on_partial_hold':
          return 'ON PARTIAL HOLD'
        default:
          '';
      }
    }

    let sysProIconColor = '';
    switch (data.onSyspro) {
      case 'on_syspro':
        sysProIconColor = '#9AD86E';
        break;
      case 'not_on_syspro':
        sysProIconColor = '#D22D2C';
        break;
      case 'on_hold':
        sysProIconColor = '#D22D2C';
        break;
      case 'on_partial_hold':
        sysProIconColor = '#f7b425';
        break;
      case 'on_partial_hold':
        sysProIconColor = '#f7b425';
        break;
    }

    const slideoutprops = {
      data,
      componentFqn: 'lasec-crm.LasecProductDetails@1.0.0',
      componentProps: {
        'data': 'formData',
      },
      childProps: {
        style: {

        }
      },
      slideDirection: 'left',
      buttonVariant: 'button',
      buttonProps: {
        size: 'small',
      },
      buttonIcon: 'launch',
      windowTitle: '${data.code} ${data.name}',
    };

    let IconComponent = theme.extensions['reactory'].icons['OnSyspro'];
    let iconProps = { style: { color: sysProIconColor } }

    const pricingProps = {
      currencies: formData.productPricing ? formData.productPricing.filter(item => _currenciesDisplayed.includes(item.currency_code)) : [],
      value: formData.price,
      displayAdditionalCurrencies: true,
      displayPrimaryCurrency: false,
      currenciesDisplayed: _currenciesDisplayed,
      region: 'en-IN',
      uiSchema: {
        'ui:options': {
          prependText: '(ZAR)',
          defaultStyle: {
            fontSize: '0.9em',
            margin: 0
          },
        }
      }
    }

    return (
      <Card classes={{ root: classes.root }}>
        <CardHeader component={() => <CustomHeader launcher={(<SlideOutLauncher {...slideoutprops} />)} title={data.code} subtitle={data.name} image={data.image} copyClick={copyClickHandler} />} />
        <CardContent>
          <Grid container direction="row" alignItems="center" >
            <Grid item xs={10}>
              <CutomTooltip title="Add To Quote" aria-label="add to quote" placement="right">
                <Fab size="medium" color="primary" className={classes.fab}>
                  <Icon>add</Icon>
                </Fab>
              </CutomTooltip>
            </Grid>
            {
              data.onSyspro != '' && sysProIconColor != '' && <Grid item xs={2}>
                <Tooltip placement="right-start" title={tooltipTitle(data.onSyspro)}>
                  {/* <Icon style={{ color: sysProIconColor }}>info</Icon> */}
                  <div style={{ textAlign: "right" }}>
                    <IconComponent {...iconProps} />
                  </div>
                </Tooltip>
              </ Grid>
            }
            {
              formData.onSpecial && <Grid item xs={12}>
                <div className={classes.specialBubble}>
                  <Icon classes={{ root: classes.bubbleIcon }}>attach_money</Icon>
                  On Special From:&nbsp;{new Intl.NumberFormat(region, { style: 'currency', currency: formData.currencyCode }).format((formData.specialPrice / 100))}</div>
              </Grid>
            }
          </Grid>
          <Divider classes={{ root: classes.divider }} />
          {
            cardContent && cardContent.fields &&
            <div className={classes.contentContainer}>
              <Grid container spacing={1}>
                {
                  cardContent.fields.map(field => {

                    return (<>
                      <Grid item xs={7}>
                        <Typography variant="body2" classes={{ root: classes.fieldLabel }}>
                          {
                            field.icon && field.icon != '' && <Icon classes={{ root: classes.fieldLabelIcon }}>{field.icon}</Icon>
                          }
                          <strong>{field.label}</strong>
                        </Typography>

                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" classes={{ root: classes.fieldLabel }}>
                          {
                            field.isCents ?
                              new Intl.NumberFormat((field.region || region), { style: 'currency', currency: (field.currency || currency) }).format(field.isCents ? (data[field.value] / 100) : data[field.value]) :
                              data[field.value]
                          } {field.unit}
                        </Typography>
                      </Grid>
                    </>
                    )
                  })
                }

                {
                  _showPricing &&
                  <>
                    <Grid item xs={7}>
                      <Typography variant="body2" classes={{ root: classes.fieldLabel }}>
                        <Icon classes={{ root: classes.fieldLabelIcon }}>attach_money</Icon> <strong>Price</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <StyledCurrencyWidget {...pricingProps} />
                    </Grid>
                  </>
                }

                {
                  _showSpecialPricing && formData.onSpecial && <>
                    <Grid item xs={7}>
                      <Typography variant="body2" classes={{ root: classes.fieldLabel }}>
                        <Icon classes={{ root: classes.fieldLabelIcon }}>attach_money</Icon> <strong>Special Price</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      {
                        formData.productPricing.filter(item => _currenciesDisplayed.includes(item.currency_code)).map(currency => (
                          <Typography variant="body2">
                            <strong>{currency.currency_code}: </strong>
                            {
                              new Intl.NumberFormat(region, { style: 'currency', currency: currency.currency_code }).format((currency.special_price_cents / 100))
                            }
                          </Typography>
                        ))
                      }
                    </Grid>
                  </>
                }
              </Grid>
            </div>
          }
          {
            cardContent && cardContent.hasPricingChart && <>
              <div style={{ height: '2rem' }}></div>
              <PricingLineChartComponent formData={formData} />
            </>
          }

        </CardContent>
      </Card>
    );
  }
};

ProductCardWidget.propTypes = {
  currency: PropTypes.string,
  symbol: PropTypes.string,
  region: PropTypes.string
};

ProductCardWidget.defaultProps = {
  currency: 'ZAR',
  symbol: 'R',
  region: 'en-ZA'
};

const ProductCardComponent = compose(withTheme, withApi, withStyles(ProductCardWidget.styles))(ProductCardWidget);
export default ProductCardComponent;

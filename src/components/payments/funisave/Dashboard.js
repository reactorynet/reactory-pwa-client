import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { withRouter } from 'react-router';
import {
  AppBar,
  Badge,
  Button,
  MenuItem,
  FormGroup,
  FormControl,
  FormLabel,
  FormHelperText,
  FormControlLabel,
  InputBase,
  IconButton,
  InputLabel,
  Grid,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  Icon,
  Paper,
  Toolbar,
  Tooltip,
  TextField,
  Typography,
  Switch,
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { fade } from '@material-ui/core/styles/colorManipulator';
import SearchIcon from '@material-ui/icons/Search';
import CachedIcon from '@material-ui/icons/Cached';
import gql from 'graphql-tag';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import { compose } from 'redux';
import { withApi } from '../../../api/ApiProvider'

const DashboardQueries = {
  PaymentGatewayAudit: gql`query PaymentGatewayAudit($from: Date, $till: Date, $target: TargetEnvironment){
    gatewayAuditTrail(from: $from, till: $till, target: $target){
      when
      label
      files {
        inbox {
          path
          count
          files
        }
         outbox {
          path
          count
          files
        }
        qaurantine {
          path
          count
          files
        } 
        sent {
          path
          count
          files
        }
      }
      paymentSchedules {
        payAtNumber
        policyNumber
        paymentDay
        paymentMethod
        paymentAmount
        productName
        productType
        client {
          firstNames
          surname
          idNumber
          homePhone
        }
        paymentBankAccount {
          bankName
          branchCode
          accountNo
          typeOfAccount
        }
      }
    }
  }`
}

const defaultDashboardData = {
  auditTrails: [],
  paymentSchedules: [],
  files: [],
}

class GatewayDashboardData {

  constructor(data = defaultDashboardData) {
    this.auditTrails = data.auditTrails || [];
    this.paymentSchedules = data.paymentSchedules;
    this.files = data.files;
  }

}

const itemsList = (items, 
  primaryBinder=(item)=>(`${item.toString()}`)) => {
  return (
  <List>
      { items.map((item) => {
        return (<ListItem>
          <ListItemText primary={primaryBinder(item)}/>
        </ListItem>)})
      }
  </List>
  );
};

const transactionsList = (transactions) => {
  return itemsList(transactions, (transaction) => (`${transaction.partnerId} [${transaction.transactionId}]`))
};

const paymentSchedulesList = (schedules) => {
  return itemsList(schedules, (schedule) => (`${schedule.client.firstName} ${schedule.client.surname}`))
};

const errorsList = (errors) => {
  return itemsList(errors, (error) => (`${error.message}`));
};

const filesList = (files) => {
  return itemsList(files, (file) => (`${file.name}`));
}

class PaymentGatewayDashboard extends Component {

  static styles = (theme) => {

    return {
      mainContainer: {
        padding: '5px',
        height: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
        backgroundColor: '#F3F2F1',
        overflow: 'hidden'
      },
      columnContainer: {
        width: '100%',
        overflowX: 'scroll',
        maxHeight: (window.innerHeight - 140),
        padding: theme.spacing.unit,
        display: 'flex',
        justifyContent: 'center',
        minWidth: 250 * 5
      },
      general: {
        padding: '5px'
      },
      formControl: {
        margin: theme.spacing.unit,
        minWidth: 120,
      },
      selectEmpty: {
        marginTop: theme.spacing.unit * 2,
      },
      buttonRow: {
        display: 'flex',
        justifyContent: 'flex-end'
      },
      userList: {
        maxHeight: (window.innerHeight - 140) / 2,
        overflow: 'scroll'
      },
      taskList: {

      },
      column: {
        maxHeight: (window.innerHeight - 140),
        overflowY: 'scroll',
        padding: theme.spacing.unit,
        margin: theme.spacing.unit * 2,
        minWidth: '250px',
        maxWidth: '350px',
        width: (window.innerWidth / 5)
      },
      toolbar: {
        marginBottom: theme.spacing.unit * 2
      },
      menuButton: {
        marginLeft: -12,
        marginRight: 20,
      },
      title: {
        display: 'none',
        [theme.breakpoints.up('sm')]: {
          display: 'block',
        },
      },
      search: {
        position: 'relative',
        borderRadius: theme.shape.borderRadius,
        backgroundColor: fade(theme.palette.common.white, 0.15),
        '&:hover': {
          backgroundColor: fade(theme.palette.common.white, 0.25),
        },
        marginRight: theme.spacing.unit * 2,
        marginLeft: 0,
        width: '100%',
        [theme.breakpoints.up('sm')]: {
          marginLeft: theme.spacing.unit * 3,
          width: 'auto',
        },
      },
      searchIcon: {
        width: theme.spacing.unit * 9,
        height: '100%',
        position: 'absolute',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      inputRoot: {
        color: 'inherit',
        width: '100%',
      },
      inputInput: {
        paddingTop: theme.spacing.unit,
        paddingRight: theme.spacing.unit,
        paddingBottom: theme.spacing.unit,
        paddingLeft: theme.spacing.unit * 10,
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('md')]: {
          width: 200,
        },
      },
      sectionDesktop: {
        display: 'none',
        [theme.breakpoints.up('md')]: {
          display: 'flex',
        },
      },
      sectionMobile: {
        display: 'flex',
        [theme.breakpoints.up('md')]: {
          display: 'none',
        },
      },
      fab: {
        float: 'right',
        bottom: theme.spacing.unit * 6,
        right: theme.spacing.unit * 2,
      },
    };
  }

  static propTypes = {
    dashboardData: PropTypes.instanceOf(GatewayDashboardData)
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      lastRefresh: null,
      from: moment(props.api.queryObject.from || moment(), 'YYYY-MM-DD'),
      till: moment(props.api.queryObject.till || moment(), 'YYYY-MM-DD'),
      focusInput: null,
      enableRefresh: false
    }
    this.componentRefs = props.api.getComponents([
      'core.Loading@1.0.0',
      'core.DateSelector@1.0.0',
      'core.Layout@1.0.0',
      'core.ReactoryForm@1.0.0'
    ]);
    this.onDateRangeChanged = this.onDateRangeChanged.bind(this);
    this.onDateFocusChanged = this.onDateFocusChanged.bind(this);
    this.doRefresh = this.doRefresh.bind(this);
  }

  onDateRangeChanged({ startDate, endDate }){ 
    console.log('Date Changed', {startDate, endDate}); 
    const updates = {
      from: moment(this.state.from),
      till: moment(this.state.till),
      enableRefresh: true,
    }

    if(startDate) updates.from = startDate;
    if(endDate) updates.till = endDate;
    if(!startDate && !endDate) updates.enableRefresh = false;
    this.setState({...updates})
  }

  onDateFocusChanged(focusInput){
    this.setState({focusInput});
  }

  doRefresh(){
    const { history, match, api } = this.props;
    const { from, till } = this.state;
    const filter = api.objectToQueryString({...match.params, 
      from: from.format('YYYY-MM-DD'), 
      till: till.format('YYYY-MM-DD')})
    const path = `${match.path}?${filter}`;
    
    history.push(path)
  }

  onPaymentSubmit

  handleChange = name => event => {
    this.setState({ [name]: event.target.checked });
  };

  render() {    
    const { classes, error, loading, audit } = this.props;
    const {from, till, enableRefresh } = this.state;
    const { DateSelector, Loading, Layout, ReactoryForm } = this.componentRefs;
    const that = this;

    return (
      <Grid container spacing={8}>
        <Grid item md={12} xs={12}>
          <AppBar position="static" color="default" className={classes.toolbar}>
            <Toolbar>
              <Typography variant="headline" color="inherit">Payment Gateway{loading === true ? ' - Loading, please wait': null}</Typography>
              <div className={classes.search}>
                <div className={classes.searchIcon}>
                  <SearchIcon />
                </div>
                <InputBase
                  placeholder="Search transaction"
                  classes={{
                    root: classes.inputRoot,
                    input: classes.inputInput,
                  }}
                  disabled={loading}
                />
              </div>
              <div className={classes.sectionDesktop}>                
                <DateSelector 
                 startDate={moment(from)}
                 startDateId="from" // PropTypes.string.isRequired,
                 endDate={moment(till)}
                 endDateId="till" // PropTypes.string.isRequired,
                 onDatesChange={that.onDateRangeChanged} // PropTypes.func.isRequired,
                 focusedInput={null} // PropTypes.oneOf([START_DATE, END_DATE]) or null,
                 onFocusChange={that.onDateFocusChanged} // PropTypes.func.isRequired, 
                 />                  
                  <Tooltip title={`Click to refresh after changing dates`}>
                  <IconButton color="inherit" disabled={!enableRefresh} onClick={that.doRefresh}>
                    <Badge badgeContent={enableRefresh ? '!' : ''} color="secondary">
                      <Icon>cached</Icon>
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title={`Synchronize Members Schedule`}>
                  <IconButton color="inherit">
                      <Icon>auto_renenw</Icon>
                  </IconButton>
                </Tooltip>

                <Tooltip title={`Reset Current Schedule`}>
                  <IconButton color="inherit">
                      <Icon>delete_forever</Icon>
                  </IconButton>
                </Tooltip>                                
              </div>
            </Toolbar>
          </AppBar>
        </Grid>
        
        <Grid item md={6}>
          <Paper className={classes.general}>
            <Typography variant="title">Payment Schedule</Typography>
            { loading === false && !error ? paymentSchedulesList(audit.paymentSchedules || []) : <Loading /> }            
          </Paper>
        </Grid>

        <Grid item md={6}>
          <Paper className={classes.general}>
            <Typography variant="title">Add Payment Schedule</Typography>
            <ReactoryForm formId="password-reset" uiFramework="material" onSubmit={this.onPaymentScheduleSubmit} formData={{}}>          
              <Tooltip title="Click here to add a new payment schedule">
                <Button type="submit" variant="fab" className={classes.fab} color="primary"><Icon>add_to_queue</Icon></Button>
              </Tooltip>              
            </ReactoryForm>
            
          </Paper>
        </Grid>

        <Grid item md={12}>
          <Paper className={classes.general}>
            <Typography variant="title">Transactions</Typography>                  
            { loading === false && !error ? transactionsList(audit.transactions || []) : <Loading /> }
          </Paper>
        </Grid>
                        
        <Grid item md={12}>
          <Paper className={classes.general}>
            <Typography variant="title">Errors</Typography>
              { loading === false && !error ? errorsList(audit.errors || []) : <Loading /> }
          </Paper>
        </Grid>
        
        <Grid item md={12}>
          <Paper className={classes.general}>
            <Typography variant="title">Files</Typography>
              { loading === false && !error ? filesList(audit.files || []) : <Loading /> }
          </Paper>
        </Grid>

        <Grid item md={4}>
          <Paper className={classes.general}>
            <FormControl component="fieldset">
              <FormLabel component="legend">File Sending And Receiving</FormLabel>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={this.state.receive}
                      onChange={this.handleChange('receive')}
                      value="receive"
                    />
                  }
                  label={`Receiving is ${this.state.receive ? 'ENABLED' : 'DISABLED'}`}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={this.state.sending}
                      onChange={this.handleChange('sending')}
                      value="sending"
                    />
                  }
                  label={`Receiving is ${this.state.sending ? 'ENABLED' : 'DISABLED'}`}
                />                
              </FormGroup>
              <FormHelperText>Be careful</FormHelperText>
            </FormControl>
          </Paper>        
        </Grid>        
      </Grid>
    )
  }
}

const PaymentGatewayDashboardComponent = compose(
  withApi,
  withRouter,
  withTheme(),
  withStyles(PaymentGatewayDashboard.styles),
)(PaymentGatewayDashboard)



const DashboardWidget = compose(
  withApi,
  withRouter,
)((props)=>{
  const { location, classes, target, api } = props;
  const variables = {
    from: moment(api.queryObject.from).format('YYYY-MM-DD'),
    till: moment(api.queryObject.till).format('YYYY-MM-DD'),
    target: api.queryObject.target || "LOCAL"
  }  
  return (
    <Query query={DashboardQueries.PaymentGatewayAudit} variables={variables}>
        {(props, context) => {
          const { loading, error, data, variables } = props;
          const { Loading } = api.getComponents(['core.Loading@1.0.0']);
          
          if(loading) return <p>loading</p>
          if(error) return <p>{error}</p>
          const dashProps = {
            audit : data.gatewayAuditTrail,
            loading: loading,
            queryErrors: error
          }
                    

          return (<PaymentGatewayDashboardComponent {...dashProps} />)
        }}
      </Query>
  )
});

export default DashboardWidget


/**
 * 
 * <Tooltip title={`You have (${4}) unpaid debit orders in this period`}>
                  <IconButton color="inherit">
                    <Badge badgeContent={4} color="secondary">
                      <Icon>assignment_ind</Icon>
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title={`You have (${5}) errors during this period`}>
                  <IconButton color="inherit">
                    <Badge badgeContent={5} color="secondary">
                      <Icon>assignment_returned</Icon>
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title={`You have (${17}) transactions during this period`}>
                  <IconButton color="inherit">
                    <Badge badgeContent={17} color="secondary">
                      <Icon>assignment_turned_in</Icon>
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title={`You have (${3}) active payment schedules in this period`}>
                  <IconButton color="inherit">
                    <Badge badgeContent={3} color="secondary">
                      <Icon>delete</Icon>
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title={`Click here to filter by date`}>
                  <IconButton color="inherit">
                    <Icon>calendar_today</Icon>
                  </IconButton>
                </Tooltip>    
 * 
 */
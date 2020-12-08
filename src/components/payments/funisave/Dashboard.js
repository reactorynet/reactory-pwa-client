import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import co from 'co';
import moment from 'moment';
import { isArray } from 'lodash';
import { withRouter } from 'react-router';
import {
  AppBar,
  Badge,
  Fab,
  ExpansionPanel,
  ExpansionPanelDetails,
  AccordionSummary,
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
import { gql } from '@apollo/client';
import { Query, Mutation } from '@apollo/client/react/components';
import { withApollo } from '@apollo/client/react/hoc';
import { compose } from 'redux';
import { withApi } from '../../../api/ApiProvider'
import { styles } from '../../shared/styles'

const endpointForTarget = (target) => {
  switch (target) {
    case 'PRODUCTION':
    case 'STAGING': return 'https://payments.r4.life/';
    case 'LOCAL':
    default: return 'http://localhost:3001/';
  }
};

const DashboardQueries = {
  PaymentGatewayAudit: gql` query PaymentGatewayAudit($from: Date, $till: Date, $target: TargetEnvironment){
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
      errors {
        partnerId
        transactionReference
        message
        process
        severity
      }
      transactions {
        id
        partnerId
        transactionId
        policyNumber
        product
        messages {
          sequence
          direction
          when
          messageType
          payload
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
        proposer {
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
        debitOrder
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
  primaryBinder = (item) => (`${item.toString()}`)) => {
  return (
    <List>
      {items.map((item) => {
        return (<ListItem>
          <ListItemText primary={primaryBinder(item)} />
        </ListItem>)
      })
      }
    </List>
  );
};

/*
<ExpansionPanel expanded={expanded === 'panel1'} onChange={this.handleChange('panel1')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className={classes.heading}>General settings</Typography>
            <Typography className={classes.secondaryHeading}>I am an expansion panel</Typography>
          </AccordionSummary>
          <ExpansionPanelDetails>
            <Typography>
              Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget
              maximus est, id dignissim quam.
            </Typography>
          </ExpansionPanelDetails>
        </ExpansionPanel>
*/

const transactionsList = (audit, itemClick = () => { }, onPanelChange = () => { }) => {
  let fileAuditItems = []
  if (isArray(audit)) {
    fileAuditItems = audit.map((auditEntry) => {
      const items = auditEntry.transactions
      return (
        <div>

          <List dense subheader={<Typography variant="button">{auditEntry.label}</Typography>}>
            {items.map((item, idx) => {
              const transactionClicked = e => itemClick(item)
              return (
                <ListItem key={idx} button onClick={transactionClicked}>
                  <ListItemText primary={`${item.partnerId} -> ${item.transactionId}`} />
                </ListItem>)
            })}
          </List>

        </div>
      )
    });
  }

  return (
    <div>
      {fileAuditItems}
    </div>
  )
};

const paymentSchedulesList = (audit = [], itemClick = () => { }) => {
  let fileAuditItems = []
  if (isArray(audit)) {
    fileAuditItems = audit.map((auditEntry) => {
      const items = auditEntry.paymentSchedules
      return (
        <div>
          <List dense subheader={<Typography variant="button">{auditEntry.label}</Typography>}>
            {items.map((paymentSchedule) => {
              const folderClicked = e => itemClick(paymentSchedule)
              return (
                <ListItem key={paymentSchedule.id} button onClick={folderClicked}>
                  <ListItemText
                    primary={`${paymentSchedule.payAtNumber || 'NO-PAY_AT'} @ ${paymentSchedule.productName}, ${paymentSchedule.productType}`}
                    secondary={`${paymentSchedule.paymentMethod} ${paymentSchedule.debitOrder.status} (${paymentSchedule.paymentDay})`}
                  />
                </ListItem>)
            })}
          </List>
        </div>
      )
    });
  }

  return (
    <div>
      {fileAuditItems}
    </div>
  )
};

const errorsList = (audit = [], itemClick = () => { }) => {
  let fileAuditItems = []
  if (isArray(audit)) {
    fileAuditItems = audit.map((auditEntry) => {
      const items = auditEntry.errors
      return (
        <div>
          <List dense subheader={<Typography variant="button">{auditEntry.label}</Typography>}>
            {items.map((item, eidx) => {
              const folderClicked = e => itemClick(item)
              return (
                <ListItem key={eidx} button onClick={folderClicked}>
                  <ListItemText primary={`${item.partner}`} />
                </ListItem>)
            })}
          </List>
        </div>
      )
    });
  }

  return (
    <div>
      {fileAuditItems}
    </div>
  )
};

const makeCalendarFromAudit = (audit) => {
  return audit.map((audit) => ({
    
  }))
}

const filesList = (audit, itemClick = () => ({})) => {
  let fileAuditItems = []
  if (isArray(audit)) {
    fileAuditItems = audit.map((auditEntry) => {
      const items = Object.keys(auditEntry.files).map((key) => ({ key, ...auditEntry.files[key] }))
      return (
        <div>
          <List dense subheader={<Typography variant="button">{auditEntry.label}</Typography>}>
            {items.map((folder) => {
              const folderClicked = e => itemClick(folder)
              return (
                <ListItem key={folder.key} button onClick={folderClicked}>
                  <ListItemText primary={`${folder.key.toUpperCase()} (${folder.count})`} secondary={`${folder.path}`} />
                </ListItem>)
            })}
          </List>
        </div>
      )
    });
  }

  return (
    <div>
      {fileAuditItems}
    </div>
  )
};

class PaymentGatewayDashboard extends Component {

  static styles = (theme) => {

    return styles(theme, {
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
        padding: theme.spacing(1),
        display: 'flex',
        justifyContent: 'center',
        minWidth: 250 * 5
      },
      general: {
        padding: '5px'
      },
      formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
      },
      selectEmpty: {
        marginTop: theme.spacing(2),
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
        padding: theme.spacing(1),
        margin: theme.spacing(2),
        minWidth: '250px',
        maxWidth: '350px',
        width: (window.innerWidth / 5)
      },
      toolbar: {
        marginBottom: theme.spacing(2)
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
        marginRight: theme.spacing(2),
        marginLeft: 0,
        width: '100%',
        [theme.breakpoints.up('sm')]: {
          marginLeft: theme.spacing(3),
          width: 'auto',
        },
      },
      searchIcon: {
        width: theme.spacing(9),
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
        paddingTop: theme.spacing(1),
        paddingRight: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        paddingLeft: theme.spacing(10),
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
        bottom: theme.spacing(6),
        right: theme.spacing(2),
      },
    });
  }

  static propTypes = {
    dashboardData: PropTypes.instanceOf(GatewayDashboardData),
    refresh: PropTypes.func
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      lastRefresh: null,
      from: moment(props.api.queryObject.from || moment(), 'YYYY-MM-DD'),
      till: moment(props.api.queryObject.till || moment(), 'YYYY-MM-DD'),
      focusInput: null,
      enableRefresh: false,
      gatewayData: null,
      message: null,
      displayMessage: false,
      remoteFolder: null,
      fileData: null,
      selectedTransaction: null,
    }
    this.componentRefs = props.api.getComponents([
      'core.Loading@1.0.0',
      'core.DateSelector@1.0.0',
      'core.Layout@1.0.0',
      'core.ReactoryForm@1.0.0',
      'core.BasicModal@1.0.0',
      'core.FullScreenModal@1.0.0',
      'core.Calendar@1.0.0',
      'core.SpeedDial'
    ]);
    this.onDateRangeChanged = this.onDateRangeChanged.bind(this);
    this.onDateFocusChanged = this.onDateFocusChanged.bind(this);
    this.doRefresh = this.doRefresh.bind(this);
    this.loadData = this.loadData.bind(this);
    this.fileSelected = this.fileSelected.bind(this);
    this.transactionSelected = this.transactionSelected.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.onProductPaymentSubmit = this.onProductPaymentSubmit.bind(this);
    this.synchronizeMembers = this.synchronizeMembers.bind(this);
    this.resetSchedule = this.resetSchedule.bind(this);
    this.synchGateways = this.synchGateways.bind(this);
    this.publishSchedule = this.publishSchedule.bind(this);
    this.downloadRemoteFile = this.downloadRemoteFile.bind(this);
    this.transferFiles = this.transferFiles.bind(this);
  }

  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate() {

  }

  transferSettingsTransform(response) {
    //console.log('transforming result', response);
    const { value } = response;
    return {
      sending: value.disabled === false,
      receiving: value.disable_receive === false,
    }
  }

  loadData() {
    const { api } = this.props;
    const that = this;
    const endpoint = this.props.endpoint || 'http://localhost:3001/'
    let dataRequest = {
      transferSettings: { uri: `${endpoint}settings/transfers`, transform: this.transferSettingsTransform },
      cpsHealth: { uri: `${endpoint}cps` },
      //currentSchedule: `${endpoint}cps/schedule?from=${moment(this.state.from).startOf('day').valueOf}&till=${moment(this.state.till).endOf('day').value()}`
    }
    co.wrap(function* loadDataGenerator(requests) {
      const requestIds = Object.keys(requests);
      const results = {}
      for (let reqid = 0; reqid < requestIds.length; reqid += 1) {
        const request = requests[requestIds[reqid]];
        let result = null;
        if (typeof request === "string") {
          result = yield api.rest.json.get(request)
          results[requestIds[reqid]] = result
        } else {
          result = yield api.rest.json.get(request.uri)
          results[requestIds[reqid]] = request.transform ? request.transform(result) : result
        }
      }
      return results;
    })(dataRequest).then((dataResult) => { that.setState({ gatewayData: { ...dataResult } }) });
  }

  onDateRangeChanged(startDate, endDate) {
    //console.log('Date Changed', { startDate, endDate });
    const updates = {
      from: moment(this.state.from),
      till: moment(this.state.till),
      enableRefresh: true,
    }

    if (startDate) updates.from = startDate;
    if (endDate) updates.till = endDate;
    if (!startDate && !endDate) updates.enableRefresh = false;
    this.setState({ ...updates })
  }

  onDateFocusChanged(focusInput) {
    this.setState({ focusInput });
  }

  doRefresh() {
    const { history, match, api } = this.props;
    const { from, till } = this.state;
    const filter = api.objectToQueryString({
      ...api.queryObject,
      from: from.format('YYYY-MM-DD'),
      till: till.format('YYYY-MM-DD')
    });
    const path = `${match.url}?${filter}`;
    api.queryObject = api.queryString.parse(filter)
    history.push(path)
    this.props.refresh()

  }



  handleChange = name => event => {
    const gatewayData = { ...this.state.gatewayData }
    const { sending, receiving } = gatewayData.transferSettings;
    const { api } = this.props;
    const that = this;
    gatewayData.transferSettings[name] = event.target.checked;
    this.setState({ gatewayData }, () => {
      api.rest.json.post(`${this.props.endpoint}settings/transfers`, {
        disabled: gatewayData.transferSettings.sending === false,
        disable_receive: gatewayData.transferSettings.receiving === false,
        reason: "FuniSave Gateway App"
      }).catch((err) => {
        //console.log(err);
        gatewayData.transferSettings = { sending, receiving };
        that.setState({ gatewayData, message: 'Could not set transfer settigns', displayMessage: true })
      });
    });
  };

  fileSelected(item) {
    //console.log('file item selected', item);
    this.setState({ remoteFolder: item })
  }

  transactionSelected(item) {
    //console.log('transaction item selected', item);
    this.setState({ selectedTransaction: item })
  }

  scheduleItemSelected(item) {
    //console.log('schedule item selected');
  }

  resetSchedule(schedule) {
    //console.log('resetting schedule', schedule);
    const that = this
    this.setState({ displayMessage: true, message: 'Resetting Schedule' }, () => {
      this.props.api.rest.json.post(`${this.props.endpoint}cps/schedule/reset`, {
        deleteFiles: true,
        all: true,
        from: moment(that.state.from).startOf('day').valueOf(),
        till: moment(that.state.till).endOf('day').valueOf()
      }).then((resetResponse) => {
        that.setState({ displayMessage: false, message: 'Schedule Reset Complete', isError: false, }, () => {
          that.loadData()
        });
      }).catch(resetErr => {
        that.setState({ displayMessage: false, message: 'Schedule Reset Encountered Error', isError: true }, () => {
          that.loadData()
        });
      });
    });
  }

  onProductPaymentSubmit(payment) {
    //console.log('Product payment submit', payment);
    const { api, endpoint } = this.props;
    const that = this;
    that.setState({ message: 'Allocating new payment, please wait', displayMessage: true }, () => {
      api.rest.json.post(`${endpoint}admin/product-payment`, payment.formData).then((payment_result) => {
        that.setState({ message: `New payment allocated ref: ${payment_result.referenceNumber}`, displayMessage: true })
      }).catch((payment_error) => {
        console.error(payment_error);
        that.setState({ message: 'Could not allocate the payment due to an error', displayMessage: true, isError: true })
      })
    })
  }

  synchronizeMembers() {
    //console.log('Members Sync');
    const { api, endpoint } = this.props;
    const that = this;
    that.setState({ message: 'Synching members please wait', displayMessage: true }, () => {
      api.rest.json.post(`${endpoint}payment-schedule-sync/`).then((payment_result) => {
        that.setState({ message: `Done`, displayMessage: true }, () => {
          that.loadData();
        })
      }).catch((payment_error) => {
        console.error(payment_error);
        that.setState({ message: 'Could not synch members', displayMessage: true, isError: true })
      })
    })
  }

  synchGateways() {
    //console.log('Gateway Sync');
    const { api, endpoint } = this.props;
    const that = this;
    that.setState({ message: 'Synching gateways please wait', displayMessage: true }, () => {
      api.rest.json.get(`${endpoint}admin/syncgateway`).then((payment_result) => {
        that.setState({ message: `Done`, displayMessage: true }, () => {
          that.loadData();
        })
      }).catch((payment_error) => {
        console.error(payment_error);
        that.setState({ message: 'Could not synch gateway', displayMessage: true, isError: true })
      })
    })
  }

  publishSchedule() {
    //console.log('Publish Schedule');
    const { api, endpoint } = this.props;
    const that = this;
    that.setState({ message: 'Publishing Schedule Please Wait', displayMessage: true }, () => {
      api.rest.json.post(`${endpoint}cps/schedule`).then((payment_result) => {
        that.setState({ message: `Done`, displayMessage: true }, () => {
          that.loadData();
        })
      }).catch((payment_error) => {
        console.error(payment_error);
        that.setState({ message: 'Could not synch gateway', displayMessage: true, isError: true })
      })
    })
  }

  downloadRemoteFile({ folder, file }) {
    const { api, endpoint, target } = this.props;
    const that = this
    let mappedFolder = folder
    if(target.toLowerCase() === 'local') {
      const folderPortions = folder.split('//')
      mappedFolder = folderPortions[folderPortions.length - 1]
    } else {
      mappedFolder = folder.replace('/data/', '')
    }
    
    api.rest.text.get(`${endpoint}cps/file/?path=${mappedFolder}&file=${file}`).then(fileData => {
      this.setState({ fileData: fileData })
    }).catch(downloadError => {
      console.error(downloadError);
      that.setState({ message: 'Could not download file', displayMessage: true, isError: true })
    });
  }

  transferFiles(){
    const that = this;
    const { api, endpoint, target } = this.props;
    api.rest.json.get(`${endpoint}cps/transfers/`).then( response => {
      //this.setState({ fileData: fileData })
      that.setState({ message: `Completed file transfers`, displayMessage: true }, () => {
        that.loadData();
      })
    }).catch(downloadError => {
      console.error(downloadError);
      that.setState({ message: 'Could not download file', displayMessage: true, isError: true })
    });
  }

  render() {
    const { classes, error, loading, audit, target } = this.props;
    const { from, till, enableRefresh, gatewayData, message, displayMessage, isError, remoteFolder, fileData, selectedTransaction } = this.state;
    const { DateSelector, Loading, Layout, ReactoryForm, BasicModal, FullScreenModal, Calendar, SpeedDial } = this.componentRefs;
    const that = this;
    let transferSettings = {
      sending: false,
      receiving: false
    }

    let modal = null;
    if (gatewayData && gatewayData.transferSettings) transferSettings = gatewayData.transferSettings
    if (displayMessage === true) {
      modal = (
        <BasicModal title="Note" open={true}>
          <Typography variant="paragraph">{message}</Typography>
        </BasicModal>)
    }

    if (fileData !== null) {
      const closeFileData = () => this.setState({ fileData: null })
      modal = (
        <FullScreenModal title="File Data" open={true} onClose={closeFileData}>
          <pre>
            <div style={{overflow: 'scroll'}}>{fileData.split(/\r\n/).map( line => { return (<Fragment>{line}<br/></Fragment>) } ) }</div>
          </pre>
        </FullScreenModal>)
    }

    if( selectedTransaction !== null ){
      const closeTransaction = () => this.setState({ selectedTransaction : null });

        modal = (<FullScreenModal title="File Data" open={true} onClose={closeTransaction}>
          <pre>
            <div style={{overflow: 'scroll'}}><pre>{JSON.stringify(selectedTransaction, null, 2)}</pre></div>
          </pre>
        </FullScreenModal>)
    }

    return (
      <Grid container spacing={8}>
        <Grid item md={12} xs={12}>
          <AppBar position="static" color="default" className={classes.toolbar}>
            <Toolbar>
              <Typography variant="h5" color="inherit">Payment Gateway - {target} </Typography>
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
                  disabled={true}
                />
              </div>
              <div className={classes.sectionDesktop}>
                <DateSelector
                  startDate={moment(from)}
                  startDateId="from" // PropTypes.string.isRequired,
                  endDate={moment(till)}
                  endDateId="till" // PropTypes.string.isRequired,
                  onDatesChange={that.onDateRangeChanged} // PropTypes.func.isRequired,
                />
                <Tooltip title={`Click to refresh after changing dates`}>
                  <IconButton color="inherit" onClick={that.doRefresh}>
                    <Badge badgeContent={enableRefresh ? '!' : ''} hidden={enableRefresh === false} color="secondary">
                      <Icon>cached</Icon>
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title={`Synchronize Members Schedule`}>
                  <IconButton color="inherit" onClick={this.synchronizeMembers}>
                    <Icon>autorenew</Icon>
                  </IconButton>
                </Tooltip>

                <Tooltip title={`Reset Current Schedule`}>
                  <IconButton color="inherit" onClick={this.resetSchedule}>
                    <Icon>delete_forever</Icon>
                  </IconButton>
                </Tooltip>
                {target !== 'PRODUCTION' ?
                  <Tooltip title={`Click here to download gateway data`}>
                    <IconButton color="inherit" onClick={this.synchGateways}>
                      <Icon>cloud_download</Icon>
                    </IconButton>
                  </Tooltip> : null}
                <Tooltip title={`Click here to publish current schedule`}>
                  <IconButton color="inherit" onClick={this.publishSchedule}>
                    <Icon>publish</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title={`Click here to force file transfers`}>
                  <IconButton color="inherit" onClick={this.transferFiles}>
                    <Icon>compare_arrows</Icon>
                  </IconButton>
                </Tooltip>
              </div>
            </Toolbar>
          </AppBar>
        </Grid>
        

        <Grid item md={8}>
          <Paper className={classes.general}>
            <Typography variant="h6">Payment Schedule</Typography>
            {paymentSchedulesList(audit)}
          </Paper>
        </Grid>

        <Grid item md={4}>
          <ReactoryForm formId="payment-schedule-add" uiFramework="material" onSubmit={this.onPaymentScheduleSubmit} formData={{
            schedule: []
          }}>
            <Tooltip title="Click here to add a new payment schedule">
              <Button type="submit" color="primary"><Icon>add_to_queue</Icon></Button>
            </Tooltip>
          </ReactoryForm>
        </Grid>

        <Grid item md={8}>
          <Paper className={classes.general}>
            <Typography variant="h6">Transactions</Typography>
            {loading === false && !error ? transactionsList(audit, this.transactionSelected) : <Loading />}
          </Paper>
        </Grid>

        <Grid item md={4}>
          <ReactoryForm formId="new-product-payment" uiFramework="material" onSubmit={this.onProductPaymentSubmit}>
            <Tooltip title="Click here to add a new manual payment">
              <Fab type="submit" color="primary" className={classes.fab}><Icon>payment</Icon></Fab>
            </Tooltip>
          </ReactoryForm>
        </Grid>

        <Grid item md={12}>
          <Paper className={classes.general}>
            <Typography variant="h6">Errors</Typography>
            {loading === false && !error ? errorsList(audit) : <Loading />}
          </Paper>
        </Grid>

        <Grid item md={8}>
          <Paper className={classes.general}>
            <Typography variant="h6">Files</Typography>
            <Grid container spacing={4}>
              <Grid item md={6} sm={12}>
                {loading === false && !error ? filesList(audit, this.fileSelected) : <Loading />}
              </Grid>

              <Grid item md={6} sm={12}>
                {remoteFolder !== null && remoteFolder.files ? (<List>
                  {remoteFolder.files.map((file, idx) => {
                    const doDownload = () => {
                      that.downloadRemoteFile({ folder: remoteFolder.path, file });
                    };
                    return (<ListItem key={idx} dense button onClick={doDownload}><ListItemText primary={file} /><Icon>download</Icon></ListItem>)
                  })}
                </List>) : null}
              </Grid>
            </Grid>
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
                      checked={transferSettings.receiving === true}
                      onChange={this.handleChange('receiving')}
                      value="receive"
                    />
                  }
                  label={`Receiving is ${transferSettings.receiving === true ? 'ENABLED' : 'DISABLED'}`}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={transferSettings.sending}
                      onChange={this.handleChange('sending')}
                      value="sending"
                    />
                  }
                  label={`Sending is ${transferSettings.sending === true ? 'ENABLED' : 'DISABLED'}`}
                />
              </FormGroup>
              <FormHelperText>Be careful</FormHelperText>
            </FormControl>
          </Paper>
        </Grid>
        {modal}
      </Grid>
    )
  }
}

const PaymentGatewayDashboardComponent = compose(
  withApi,
  withRouter,
  withTheme,
  withStyles(PaymentGatewayDashboard.styles),
)(PaymentGatewayDashboard)



const DashboardWidget = compose(
  withApi,
  withRouter,
)((props) => {
  const { target, api, match, params } = props;
  const variables = {
    from: moment(api.queryObject.from).format('YYYY-MM-DD'),
    till: moment(api.queryObject.till).format('YYYY-MM-DD'),
  }
  variables.target = match.params.target || 'PRODUCTION';
  variables.target = variables.target.toUpperCase();
  return (
    <Query query={DashboardQueries.PaymentGatewayAudit} variables={variables}>
      {(props, context) => {
        const { loading, error, data, variables, refetch } = props;
        const { Loading } = api.getComponents(['core.Loading@1.0.0']);

        if (loading) return <Loading message={'Loading Gateway Dashboard Data'} />
        if (error) return <p>{error}</p>
        const dashProps = {
          audit: api.utils.omitDeep(data.gatewayAuditTrail),
          loading: loading,
          queryErrors: error,
          endpoint: endpointForTarget(variables.target),
          target: variables.target
        }


        return (<PaymentGatewayDashboardComponent {...dashProps} refresh={refetch} />)
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
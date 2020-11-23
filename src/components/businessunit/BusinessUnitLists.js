import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Query, Mutation } from '@apollo/client';
import { compose } from 'redux';
import { withRouter } from 'react-router';
import {
  AppBar,
  Badge,
  IconButton,
  InputBase,
  Icon, 
  List,
  ListItem,
  ListItemText,
  Avatar,
  Toolbar,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  VisibilityOff,
  Search as SearchIcon
} from '@material-ui/icons';
import { fade } from '@material-ui/core/styles/colorManipulator';
import { withApi } from '../../api/ApiProvider';
import { ReactoryApi } from "../../api/ReactoryApi";
import styles from '../shared/styles';
import businessUnitApi from './graphql';

const BusinessUnitList = ({organizationId, api, onItemSelect, searchString}) => {  
  return (
    <Query 
      query={businessUnitApi.queries.businessUnitsForOrganization} 
      variables={{ id: organizationId, searchString }} >
      {({ loading, error, data } ) => {

        const { Loading } = api.getComponents(['core.Loading'])

        if(loading === true) return <Loading message="Loading business units" />
        if(error) return error.message        
        const { businessUnitsForOrganization } = data;

        return (
          <List>
            {
              businessUnitsForOrganization.map((businessUnit, bid) => {
              const raiseItemSelect = () => {
                if(onItemSelect) onItemSelect(businessUnit, bid)
              }              
              const displayText = `${businessUnit.name}`;
              return (
                <ListItem onClick={raiseItemSelect} dense button key={bid}>
                  <Avatar alt={displayText}>{businessUnit.name.substring(0,1)}</Avatar>
                  <ListItemText primary={displayText} />
                </ListItem>
              )
            })}            
          </List>
        )
      }}      
    </Query>);
}

const BusinessUnitListsComponent = compose(withApi)(BusinessUnitList)

export class BusinessUnitListWithToolbar extends Component {

  static Styles = theme => {
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
      }
    });
  }

  static propTypes = {
    api: PropTypes.instanceOf(ReactoryApi)
  };

  static defaultProps = {
    api: null
  };


  constructor(props, context) {
    super(props, context);
    this.state = {
      searchString: '',
      inputText: '',
      skip: false,
      businessUnit: null,
      mode: null,
    }

    this.doSearch = this.doSearch.bind(this);
    this.doRefresh = this.doRefresh.bind(this);    
    this.onNewBusinessUnit = this.onNewBusinessUnit.bind(this);
    this.searchStringChanged = this.searchStringChanged.bind(this);
    this.searchStringOnKeyPress = this.searchStringOnKeyPress.bind(this);
    this.onItemSelect = this.onItemSelect.bind(this);
    this.componentDefs = props.api.getComponents([
      'core.SingleColumnLayout',
      'core.FullScreenDialog'])
  }

  doRefresh(){
    this.setState({ skip: false, searchString: this.state.inputText });
  }


  searchStringChanged(evt) {
    this.setState({ inputText: evt.target.value, skip: true });
  }

  searchStringOnKeyPress(evt) {
    if (evt.keyCode === 13) this.doSearch()
  }


  doSearch() {
    this.setState({ searchString: this.state.inputText })
  }

  onItemSelect(businessUnit){
    //console.log('Business Unit Selected', businessUnit);
    const { organizationId } = this.props;
    this.props.history.push(`/admin/org/${organizationId}/business-units/${businessUnit.id}`)
  }

  onNewBusinessUnit(){
    const { organizationId } = this.props;
    this.props.history.push(`/admin/org/${organizationId}/business-units/new/`)
  }

  render() {
    const { SingleColumnLayout } = this.componentDefs;
    const { classes } = this.props;
    const { skip } = this.state;

    return (
      <SingleColumnLayout style={{ maxWidth: 900, margin: 'auto' }}>
        <AppBar position="static" color="default" className={classes.toolbar}>
          <Toolbar>
            <Typography variant="h6" color="inherit">Business Units</Typography>
            <div className={classes.search}>
              <div className={classes.searchIcon}>
                <SearchIcon />
              </div>
              <InputBase
                placeholder="Search…"
                value={this.state.inputText}
                onChange={this.searchStringChanged}
                classes={{
                  root: classes.inputRoot,
                  input: classes.inputInput,
                }}
              />
            </div>
            <Tooltip title={`Click to refresh after changing your search options`}>
              <IconButton color="inherit" onClick={this.doRefresh}>
                <Badge badgeContent={skip ? '!' : ''} hidden={skip === false} color="secondary">
                  <Icon>cached</Icon>
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={`Click to add new business unit`}>
              <IconButton color="inherit" onClick={this.onNewBusinessUnit}>
                <Icon>add_circle_outline</Icon>
              </IconButton>
            </Tooltip>            
          </Toolbar>
        </AppBar>
        <BusinessUnitListsComponent onItemSelect={this.onItemSelect} organizationId={this.props.organizationId} searchString={this.state.searchString} skip={skip} />
      </SingleColumnLayout>
    )
  }
}

export const BusinessUnitListWithToolbarComponent = compose(
  withApi,
  withRouter,
  withStyles(BusinessUnitListWithToolbar.Styles), 
  withTheme)(BusinessUnitListWithToolbar);

export default {
  BusinessUnitList: BusinessUnitListsComponent,
  BusinessUnitListWithToolbar: BusinessUnitListWithToolbarComponent,
};
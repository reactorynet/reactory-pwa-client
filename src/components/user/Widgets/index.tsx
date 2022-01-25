import React, { Component, SyntheticEvent } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import {
  AppBar,
  Badge,
  InputBase,
  Icon,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  Button,
} from '@material-ui/core';

import {
  Search as SearchIcon
} from '@material-ui/icons'
import { fade } from '@material-ui/core/styles/colorManipulator';
import { withTheme, withStyles, makeStyles } from '@material-ui/core/styles';
import { useReactory, withApi } from '@reactory/client-core/api/ApiProvider';
import styles from '@reactory/client-core/components/shared/styles';
import Reactory from '@reactory/client-core/types/reactory';
import ReactoryApi from '@reactory/client-core/api';

type USER_FILTER = string | "search" | "business_unit" | "team" | "demographics";
type USERLIST_VIEWMODE = string | "list" | "grid" | "cards";
interface UserListWithSearchProps {
  onAcceptSelection: (selection: Reactory.IUser | Reactory.IUser[]) => void,
  onUserSelect: (user: Reactory.IUser) => void,
  organization_id: string,
  filters: USER_FILTER[],
  onNewUserClick: (evt: SyntheticEvent) => void,
  onDeleteUsersClick: (evt: SyntheticEvent) => void,
  allowDelete: boolean,
  excluded: Reactory.IUser[],
  selected: Reactory.IUser[],
  multiSelect: boolean,
  mode: USERLIST_VIEWMODE,
  reactory: ReactoryApi,
  page: number,
  pageSize: number,
  onPageChange: (page: number) => void,
  refreshEvents: string[],
  [key: string]: any
};

/*

static defaultProps = {
  businessUnitFilter: true,
  onAcceptSelection: (evt) => {
    //console.log('No selection accept handler');
  },
  onDeleteUsersClick: (evt) => {
    //console.log('No delete handler');
  },
  allowDelete: false,
  selected: [],
  multiSelect: false,


*/

export const UserListWithSearch = (props: UserListWithSearchProps) => {

  const reactory = useReactory();

  const {
    onAcceptSelection = null, //empty handler,
    onNewUserClick = null, //empty handler
    onDeleteUsersClick = null,
    onUserSelect = null,
    organization_id,
    teams = [],
    filters = ["search"],
    allowDelete = false,
    multiSelect = true,
    selected = [],
    excluded = [],
    mode = 'list',
    page = 1,
    pageSize = 25,
    onSearch = null,
    refreshEvents = []
  } = props;


  const Styles = makeStyles((theme) => {
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
    };
  });

  const classes = Styles();

  const { useState, useEffect } = React;

  const [searchString, setSearchString] = useState(props.searchString);
  const [inputText, setInputText] = useState(props.searchString);
  const [skip, setSkip] = useState(false);
  const [show_deleted, setShowDeleted] = useState('');
  const [business_units, setBusinessUnits] = useState([]);

  const [paging, setPaging] = useState({ page, pageSize });


  const { UserList } = reactory.getComponents(['core.UserList'])

  useEffect(()=>{
    if(refreshEvents && refreshEvents.length >0) {
      refreshEvents.forEach((evt) => {
        reactory.on(evt, doRefresh);
      });
    }

    return () => {
      if (refreshEvents && refreshEvents.length > 0) {
        refreshEvents.forEach((evt) => {
          reactory.removeListener(evt, doRefresh);
        });
      }
    }

  },[]);

  const doRefresh = () => {
    //this.setState({ skip: false, searchString: this.state.inputText });
    setSkip(false);
    setSearchString(inputText);
  }

  useEffect(() => {
    if (paging.page > 1) {
      setPaging({ page: 1, pageSize: paging.pageSize });
    }
  }, [searchString])
  
  const onSearchStringChanged = (evt) => {
    setInputText(evt.target.value);
  }

  const doSearch = () => {
    //this.setState({ searchString: this.state.inputText })
    setSearchString(inputText);
  };

  const onSearchStringOnKeyPress = (evt) => {
    if (evt.charCode === 13) doSearch();
  }


  const onShowBusinessUnitFilter = () => {

  }


  const onPageChange = (new_page) => {
    setPaging({ ...paging, page: new_page });
  }

  return (
    <>
      <AppBar position="sticky" color="default" className={classes.toolbar}>
        <Toolbar>
          <Typography variant="h6" color="inherit">Employees</Typography>
          <div className={classes.search}>
            <div className={classes.searchIcon}>
              <SearchIcon />
            </div>
            <InputBase
              placeholder="Search…"
              value={inputText}
              onChange={onSearchStringChanged}
              onKeyPress={onSearchStringOnKeyPress}
              classes={{
                root: classes.inputRoot,
                input: classes.inputInput,
              }}
            />
          </div>
          <Tooltip title={`Click to refresh after changing your search options`}>
            <IconButton color="primary" onClick={doRefresh}>
              <Badge badgeContent={skip ? '!' : ''} hidden={skip === false} color="secondary">
                <Icon>cached</Icon>
              </Badge>
            </IconButton>
          </Tooltip>

          {onNewUserClick && <Tooltip title={`Click to add new employee`}>
            <IconButton color="primary" onClick={onNewUserClick}>
              <Icon>add_circle_outline</Icon>
            </IconButton>
          </Tooltip>}

          {filters.indexOf("business_unit") >= 0 ? <Tooltip title={`Filter By Business Unit`}>
            <IconButton color="inherit" onClick={onShowBusinessUnitFilter}>
              <Icon>filter</Icon>
            </IconButton>
          </Tooltip> : null}

          {allowDelete === true && selected.length > 0 &&
            <Tooltip title={`Click here to delete the ${selected.length > 1 ? `${selected.length} employees` : 'employee'} selected`}>
              <IconButton color="inherit" onClick={onDeleteUsersClick}>
                <Icon>delete</Icon>
              </IconButton>
            </Tooltip>
          }
          {
            selected.length > 0 && <Tooltip title={`Click here to clear your selected`}>
              <IconButton color="primary" onClick={() => { if (props.onClearSelection) props.onClearSelection() }}>
                <Badge badgeContent={selected.length} hidden={skip === false} color="secondary">
                  <Icon>select_all</Icon>
                </Badge>
              </IconButton>
            </Tooltip>
          }
        {onAcceptSelection && selected.length > 0 && <Tooltip title={'Click to accept your selection'}>
            <Button
              onClick={() => { onAcceptSelection(selected) }}
              style={{ marginRight: "4px", marginLeft: '40px', color: '#ffffff', background: '#7d983c' }}
              variant="contained"
            >
              Confirm 
            </Button>
          </Tooltip>}
        </Toolbar>

      </AppBar>

      <UserList
        onUserSelect={onUserSelect}
        organizationId={organization_id}
        searchString={searchString}
        skip={skip === true}
        selected={selected}
        excluded={excluded}
        multiSelect={multiSelect === true || false}
        page={paging.page || 1}
        pageSize={paging.pageSize || 25}
        onPageChange={onPageChange} />
    </>
  )
};
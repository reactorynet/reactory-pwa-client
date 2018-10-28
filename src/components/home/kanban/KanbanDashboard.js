import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter, Route, Switch } from 'react-router';
import { Query, Mutation } from 'react-apollo';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { fade } from '@material-ui/core/styles/colorManipulator';
import { compose } from 'redux';
import uuid from 'uuid';
import { isNil, find, isArray } from 'lodash';
import {
    AppBar,
    Badge,
    MenuItem,
    FormControl,
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
    Typography
} from '@material-ui/core';

import Select from '@material-ui/core/Select';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import ChatIcon from '@material-ui/icons/Chat';
import GroupAddIcon from '@material-ui/icons/GroupAdd';
import PlayIcon from '@material-ui/icons/PlayCircleFilled';
import SearchIcon from '@material-ui/icons/Search';
import Draggable from 'react-draggable';
import ChatCard from '../../chat/ChatCard';
import { TrelloProvider } from '../../tasks/Tasks';
import { TaskListItemComponent, defaultDragProps, TaskDetailComponent } from '../../tasks/Taskboard';
import * as mocks from '../../../models/mock';
import { nilStr, omitDeep } from '../../util';
import { withApi } from '../../../api/ApiProvider';

class AddTask extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            text: ''
        }

        this.onTextChanged = this.onTextChanged.bind(this)
        this.keyPress = this.keyPress.bind(this)
    }

    onTextChanged(e) {
        this.setState({ text: e.target.value })
    }

    keyPress(e) {
        if (e.charCode === 13) {
            this.props.onSave(this.state.text);
        }
    }

    render() {
        return (<TextField
            placeholder="Enter task title"
            value={this.state.text}
            onChange={this.onTextChanged}
            variant="outlined"
            onKeyPress={this.keyPress}
            fullWidth
        />)
    }
}

export const AddTaskComponent = compose(
    withApi
)((props) => {
    const { api, organizationId, userId, onCancel, status = 'new', percentComplete = 0 } = props
    return (
        <Mutation mutation={api.mutations.Tasks.createTask} >
            {(createTask, { loading, error, data }) => {

                let props = {
                    loading,
                    error,
                    onCancel,
                    onSave: (title) => {
                        let taskInput = { title, status, percentComplete };
                        createTask({
                            variables: {
                                id: userId,
                                taskInput
                            },
                            refetchQueries: [{ query: api.queries.Tasks.userTasks, variables: { id: userId, status } }]
                        });
                    }
                }

                if (loading) return (<p>Updating... please wait</p>)
                if (error) return (<p>{error.message}</p>)
                return <AddTask {...props} />
            }}
        </Mutation>
    )
})



const TaskListComponent = compose(
    withApi
)((props) => {
    const { api, organizationId, userId, onCancel, status = 'new', percentComplete = 0, onTaskSelect = () => { }, dragProps = defaultDragProps } = props
    return (
        <Query query={api.queries.Tasks.userTasks} variables={{ id: userId, status }}  >
            {({ loading, error, data }) => {
                if (loading) return (<p>Loading...</p>)
                if (error) return (<p>{error.message}</p>)

                if (isArray(data.userTasks) === true && data.userTasks.length > 0) {
                    return data.userTasks.map((task) => {
                        const taskProps = {
                            task,
                            onTaskSelect,
                        };
                        return (<TaskListItemComponent {...taskProps} />)
                    })
                } else {
                    return <p>No tasks here</p>
                }
            }}
        </Query>
    )
});

const TaskDetailWithData = compose(
    withApi,
    withRouter
)((props) => {
    const { api, taskId } = props

    return (
        <Query query={api.queries.Tasks.taskDetail} variables={{ taskId }}>
            {({ loading, error, data }) => {
                if (loading) return (<p>Loading detail...</p>)
                if (error) return (<p>Error loading the task</p>)

                return <TaskDetailComponent task={data.taskDetail} />
            }}
        </Query>
    )
})

class ChatDashboard extends Component {
    static styles = (theme) => {
        const primaryColor = theme.palette.primary.main;
        const primaryColorDark = theme.palette.primary.dark;

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
            }
        };
    }

    static propTypes = {
        user: PropTypes.object.isRequired,
        projectKey: PropTypes.string,
        chats: PropTypes.array
    }

    static defaultProps = {
        user: { firstName: '', lastName: '', email: '' },
        projectKey: '',
        chats: mocks.loggedInUserActiveChats
    }

    handleProfileMenuOpen = event => {
        this.setState({ anchorEl: event.currentTarget });
    };

    render() {
        const { classes, user, history } = this.props;
        const { isMenuOpen, anchorEl } = this.state;
        const that = this;

       
        return (
            <Grid
                container
                spacing={16}
                className={classes.mainContainer}>
                <Grid item md={12} sm={12} xs={12}>
                    <AppBar position="static" color="default" className={classes.toolbar}>
                        <Toolbar>
                            <Typography variant="h6" color="inherit">Task Board</Typography>
                            <div className={classes.search}>
                                <div className={classes.searchIcon}>
                                    <SearchIcon />
                                </div>
                                <InputBase
                                    placeholder="Search…"
                                    classes={{
                                        root: classes.inputRoot,
                                        input: classes.inputInput,
                                    }}
                                />
                            </div>
                            <div className={classes.sectionDesktop}>
                                <Tooltip title={`You have (${4}) personal tasks in progress`}>
                                    <IconButton color="inherit">
                                        <Badge badgeContent={4} color="secondary">
                                            <Icon>assignment_ind</Icon>
                                        </Badge>
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={`You have (${5}) assgined tasks in progress`}>
                                    <IconButton color="inherit">
                                        <Badge badgeContent={5} color="secondary">
                                            <Icon>assignment_returned</Icon>
                                        </Badge>
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={`You have (${17}) completed tasks`}>
                                    <IconButton color="inherit">
                                        <Badge badgeContent={17} color="secondary">
                                            <Icon>assignment_turned_in</Icon>
                                        </Badge>
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={`You have (${3}) personal tasks in progress`}>
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

                            </div>
                        </Toolbar>
                    </AppBar>
                </Grid>
                <Grid item md={12} sm={12} xs={12} spacing={4} >
                    <Switch>
                        <Route path="/">
                            <div className={classes.columnContainer}>
                                {
                                    ['planned', 'in-progress', 'completed', 'artefacts', 'kudos'].map(status => {
                                        return (<Paper className={classes.column} key={status}>
                                            <Typography variant="heading">{status.toUpperCase()}</Typography>
                                            <List className={classes.taskList}>
                                                <TaskListComponent status={status} user={'self'} />
                                            </List>
                                            <hr />
                                            {status === 'planned' ? <AddTaskComponent status={status} /> : null}
                                        </Paper>)
                                    })
                                }
                            </div>
                        </Route>
                        <Route path="/task/:taskId" render={props => <TaskDetailWithData taskId={props.match.params.taskId} />} />
                    </Switch>
                </Grid>
            </Grid>
        );
    }

    constructor(props, context) {
        super(props, context);
        this.state = {
            isMenuOpen: false,
            anchorEl: null
        };
        this.handleProfileMenuOpen = this.handleProfileMenuOpen.bind(this);
    }
}

const ChatDashboardComponent = compose(
    withApi,
    withRouter,
    withTheme(),
    withStyles(ChatDashboard.styles),
)(ChatDashboard);
export default ChatDashboardComponent;

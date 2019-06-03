import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment, { momentPropTypes } from 'moment';
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
    Fab,
    MenuItem,
    FormControl,
    OutlinedInput,
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
import Slider from '@material-ui/lab/Slider';
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
import { TaskListItemComponent, defaultDragProps, TaskDetailComponent, AddTaskComponent } from '../../tasks/Taskboard';
import * as mocks from '../../../models/mock';
import { nilStr, omitDeep } from '../../util';
import { withApi } from '../../../api/ApiProvider';




export const TaskListComponentWithData = compose(
    withApi
)((props) => {
    const { api, organizationId, userId, onCancel, status = 'new', percentComplete = 0, onTaskSelect = () => { }, dragProps = defaultDragProps } = props;
    return (
        <Query query={api.queries.Tasks.userTasks} variables={{ id: userId, status }}  >
            {({ loading, error, data }) => {
                if (loading) return (<p>Loading...</p>);
                if (error) return (<p>{error.message}</p>);

                if (isArray(data.userTasks) === true && data.userTasks.length > 0) {
                    return data.userTasks.map((task, key) => {
                        const taskProps = {
                            task,
                            onTaskSelect,
                            key,
                        };
                        return (<TaskListItemComponent {...taskProps} />)
                    })
                }

                return null;
            }}
        </Query>
    )
});

export const TaskDetailWithData = compose(
    withApi,
    withRouter
)((props) => {
    const { api, taskId } = props;

    return (
        <Query query={api.queries.Tasks.taskDetail} variables={{ id: taskId }}>
            {({ loading, errors, data }) => {
                if (loading) return (<p>Loading detail...</p>);
                if (errors) return (<p>Error loading the task</p>);
                
                if(data.taskDetail) {
                    return <TaskDetailComponent task={data.taskDetail} />
                } else {
                    const NotFound = api.getComponent('core.NotFound');

                    return <NotFound message="We couldn't find the Task you were looking for" />
                }
                
            }}
        </Query>
    )
});

class KanbanDashboard extends Component {
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
                marginTop: theme.spacing(1),
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
                margin: theme.spacing(1),
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
                marginRight: theme.spacing(1),
                marginLeft: 0,
                width: '100%',
                [theme.breakpoints.up('sm')]: {
                    marginLeft: theme.spacing(1),
                    width: 'auto',
                },
            },
            searchIcon: {
                width: theme.spacing(1),
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
                paddingLeft: theme.spacing(1),
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
    };

    static propTypes = {
        user: PropTypes.object.isRequired,
        projectKey: PropTypes.string,
        from: PropTypes.instanceOf(moment),
        till: PropTypes.instanceOf(moment),
        lanes: PropTypes.array,
    };

    static defaultProps = {
        user: { firstName: '', lastName: '', email: '' },
        projectKey: '',
        from: moment(),
        till: moment(),
        lanes: [
            { status: 'planned', tite: 'Planned Tasks', icon: 'star_border', color: '#7DAEE8' },
            { status: 'in-progress', title: 'In Progress', icon: 'star_half', color: '#A3CDFF', addRoles: [] },
            { status: 'completed', title: 'Complete', icon: 'star', color: '#96E2FF', addRoles: [] },
            { status: 'outputs', title: 'Outputs', icon: 'attachment', color: '#EFD4FF', addRoles: [] },
            { status: 'kudos', title: 'Kudos', icon: 'thumb_up_alt', color: '#BC99D1', addRoles: [] }
        ],
    };

    constructor(props, context) {
        super(props, context);
        this.state = {
            isMenuOpen: false,
            anchorEl: null,
            selectedTask: null,
            projectId: null,
            showProjectModal: false,
            project: null,
            showTaskboardModal: false,
            taskboard: null,
        };
        this.handleProfileMenuOpen = this.handleProfileMenuOpen.bind(this);
        this.showModal = this.showModal.bind(this);
        this.onTaskSelect = this.onTaskSelect.bind(this);
        this.onProjectIdChange = this.onProjectIdChange.bind(this);
        this.componentDefs = this.props.api.getComponents([
            'core.DateSelector', 
            'core.FullScreenModal', 
            'core.SpeedDial',
            'forms.ProjectForm',
            'forms.TaskDetailForm',
        ])
    }

    handleProfileMenuOpen = event => {
        this.setState({ anchorEl: event.currentTarget });
    };

    onProjectIdChange = (evt, b, c,) => {
        //console.log('ProjectId changed', { evt, b, c });
        this.setState({ projectId: evt.target.value })
    };

    onDateRangeChanged(startDate, endDate) {
        //console.log('DateRange changed', { startDate, endDate });
    }

    showModal() {
        this.setState({ showModal: true })
    }

    onTaskSelect(task) {
        this.setState({ selectedTask: task, showModal: true })
    }

    onProjectFormSubmit(projectData){
        //console.log('Submit Project Form Data', projectData)
    }

    render() {
        const { classes, user, history, from, till } = this.props;
        const { isMenuOpen, anchorEl, showModal, selectedTask, projectId } = this.state;
        const that = this;
        const { DateSelector, FullScreenModal, SpeedDial, ProjectForm, TaskDetailForm } = this.componentDefs;

        let modal = null;
        if (showModal === true && selectedTask !== null) {
            const closeTask = () => {
                that.setState({selecteTask: null, showModal: false})
            };

            modal = (
                <FullScreenModal title={selectedTask.title} open={true} onClose={closeTask}>
                    <TaskDetailForm formContext={{}} formData={selectedTask} uiSchemaKey={"detail"} />
                </FullScreenModal>
            )
        }

        if(projectId === "-1") {
            const closeProject = () => {
                that.setState({projectId: null, showModal: false})
            };

            modal = (
               
                <FullScreenModal title={"New Project"} open={true} onClose={closeProject}>
                    <ProjectForm onSubmit={this.onProjectFormSubmit}>
                        <Fab type="submit" color="primary"><Icon>save</Icon></Fab>
                    </ProjectForm>
                </FullScreenModal>)            
        }

        const toolbarRow = (
            <Grid item md={12} sm={12} xs={12}>                    
                    <AppBar position="static" color="default" className={classes.toolbar}>
                        <Toolbar>
                            <FormControl variant="outlined" className={classes.formControl}>
                                <InputLabel
                                    ref={ref => {
                                    this.InputLabelRef = ref;
                                    }} 
                                    htmlFor="outlined-age-native-simple">Project</InputLabel>
                                <Select
                                    value={this.state.projectId}
                                    onChange={this.onProjectIdChange}                                    
                                    autoWidth                           
                                    input={
                                    <OutlinedInput
                                        name="Project"
                                        id="outlined-age-native-simple"
                                    />}>
                                    <option value="" />
                                    <option value={10}>Project A</option>
                                    <option value={20}>Project B</option>
                                    <option value={30}>Project C</option>
                                    <option value={-1}>NEW PROJECT</option>
                                </Select>
                            </FormControl>
                            

                            <FormControl variant="outlined" className={classes.formControl}>
                                <InputLabel
                                    ref={ref => {
                                    this.InputLabelRef = ref;
                                    }} 
                                    htmlFor="outlined-age-native-simple">Board</InputLabel>
                                <Select
                                    native
                                    value={this.state.age}
                                    autoWidth                            
                                    input={
                                    <OutlinedInput
                                        name="Task Board"
                                        id="outlined-age-native-simple"
                                    />}>
                                    <option value="" />
                                    <option value={10}>Task Board A</option>
                                    <option value={20}>Task Board B</option>
                                    <option value={30}>Task Board C</option>
                                    <option value={-1}>NEW BOARD</option>
                                </Select>
                            </FormControl>

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
                            <DateSelector
                                startDate={moment(from)}
                                startDateId="from" // PropTypes.string.isRequired,
                                endDate={moment(till)}
                                endDateId="till" // PropTypes.string.isRequired,
                                onDatesChange={that.onDateRangeChanged} // PropTypes.func.isRequired,
                            />
                            <div className={classes.sectionDesktop}>
                                <Tooltip title={`You have (${0}) personal tasks in progress`}>
                                    <IconButton color="inherit">
                                        <Badge badgeContent={0} color="secondary" onClick={this.showModal}>
                                            <Icon>assignment_ind</Icon>
                                        </Badge>
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={`You have (${0}) assgined tasks in progress`}>
                                    <IconButton color="inherit">
                                        <Badge badgeContent={0} color="secondary">
                                            <Icon>assignment_returned</Icon>
                                        </Badge>
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={`You have (${0}) completed tasks`}>
                                    <IconButton color="inherit">
                                        <Badge badgeContent={0} color="secondary">
                                            <Icon>assignment_turned_in</Icon>
                                        </Badge>
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={`You have (${0}) personal tasks in progress`}>
                                    <IconButton color="inherit">
                                        <Badge badgeContent={0} color="secondary">
                                            <Icon>delete</Icon>
                                        </Badge>
                                    </IconButton>
                                </Tooltip>
                            </div>
                        </Toolbar>
                    </AppBar>
                </Grid>
        )

        return (
            <Grid
                container
                spacing={16}
                className={classes.mainContainer}>
                { false && toolbarRow }
                <Grid item md={12} sm={12} xs={12}>
                    <Switch>
                        <Route exact path="/">
                            <Fragment>
                                <div className={classes.columnContainer}>
                                    {
                                        this.props.lanes.map(lane => {
                                            return (
                                            <Paper className={classes.column} key={lane.status} style={{ backgroundColor: lane.color }}>
                                                <Typography variant="heading"><Icon style={{ marginTop: '5px' }}>{lane.icon}</Icon>&nbsp;{lane.title}</Typography>
                                                <List className={classes.taskList}>
                                                    <TaskListComponentWithData status={lane.status} user={'self'} onTaskSelect={this.onTaskSelect} />
                                                </List>
                                                <hr />
                                                {lane.status === 'planned' ? <AddTaskComponent status={'planned'} /> : null}
                                            </Paper>);
                                        })
                                    }
                                </div>
                                <SpeedDial />
                                {modal}
                            </Fragment>
                        </Route>
                        <Route path="/tasks/:taskId" render={props => <TaskDetailWithData taskId={props.match.params.taskId} />} />
                    </Switch>
                </Grid>
            </Grid>
        );
    }    
}

const KanbanDashboardComponent = compose(
    withApi,
    withRouter,
    withTheme,
    withStyles(KanbanDashboard.styles),
)(KanbanDashboard);
export default KanbanDashboardComponent;

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withRouter, Route, Switch } from 'react-router';
import { Query, Mutation } from 'react-apollo';
import classnames from 'classnames';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import { isNil, find, filter } from 'lodash';
import classNames from 'classnames';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Checkbox from '@material-ui/core/Checkbox';
import { LinearProgress, CircularProgress } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import {
    Button, Chip, Fab,
    Card, CardHeader, CardMedia, CardContent, CardActions,
    ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary, Icon,
    List, ListItem, ListItemSecondaryAction, ListItemText, Popover, TextField
} from '@material-ui/core';
import Collapse from '@material-ui/core/Collapse';
import Paper from '@material-ui/core/Paper';
import Avatar from '@material-ui/core/Avatar';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import AddIcon from '@material-ui/icons/Add';
import red from '@material-ui/core/colors/red';
import FavoriteIcon from '@material-ui/icons/Favorite';
import ShareIcon from '@material-ui/icons/Share';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import IconButtonDropDown from '@material-ui/icons/ArrowDropDown';
import moment from 'moment';
import { withApi, ReactoryApi } from '../../api/ApiProvider'
import Comments from '../shared/Comments';
import * as mocks from '../../models/mock';
import Draggable from 'react-draggable';


class AddTask extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            text: ''
        };

        this.onTextChanged = this.onTextChanged.bind(this);
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
    const { api, organizationId, userId, onCancel, status = 'new', percentComplete = 0 } = props;
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
                };

                if (loading) return (<p>Updating... please wait</p>);
                if (error) return (<p>{error.message}</p>);
                return <AddTask {...props} />
            }}
        </Mutation>
    )
});



const defaultTask = {
    id: 'new',
    project: null,
    shortCodeId: 0, //Number, // https://app.ageofteams.com/tasks/aot/00000001
    title: '', // String,
    description: '', //String,
    percentComplete: 0, //Number,
    slug: '', //String,
    label: [], //[String],
    category: 'new', //String,
    workflowStatus: '', //,
    status: 'new', //,
    externalUrls: [], //[String],
    startDate: moment().startOf('D'), //,
    dueDate: moment().endOf('D').add(2, 'days'),
    completionDate: null,
    links: [
        //{
        //linkId: '',
        //linkedTo: String,
        //linkType: String, // task etc.
        //}, // done in planned section
    ],
    user: null, // set to logged in user //{
    //required: true,
    //type: ObjectId,
    //}, // assigned user
    createdAt: moment(),
    updatedAt: moment(),
};

class TaskItem extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            expanded: false
        };

        this.handleExpandClick = this.handleExpandClick.bind(this);
    }
    static styles = theme => ({
        card: {
            maxWidth: 400,
        },
        media: {
            height: 194,
        },
        actions: {
            display: 'flex',
        },
        expand: {
            transform: 'rotate(0deg)',
            transition: theme.transitions.create('transform', {
                duration: theme.transitions.duration.shortest,
            }),
            marginLeft: 'auto',
        },
        expandOpen: {
            transform: 'rotate(180deg)',
        },
        avatar: {
            backgroundColor: red[500],
        },
    });

    handleExpandClick() {
        this.setState({ expanded: !this.state.expanded });
    }

    render() {
        const { classes, card } = this.props;

        return (
            <div>
                <Card className={classes.card}>
                    <CardHeader
                        avatar={
                            <Avatar aria-label="Recipe" className={classes.avatar}>
                                ?
              </Avatar>
                        }
                        action={
                            <IconButton>
                                <MoreVertIcon />
                            </IconButton>
                        }
                        title={card.name}
                        subheader={moment(card.due).format('DD-MM-YYYY')}
                    />
                    <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>
                        <CardContent>
                            <Typography component="p">
                                {card.desc}
                            </Typography>
                        </CardContent>
                    </Collapse>
                    <CardActions className={classes.actions} disableActionSpacing>
                        <IconButton aria-label="Add to favorites">
                            <FavoriteIcon />
                        </IconButton>
                        <IconButton aria-label="Share">
                            <ShareIcon />
                        </IconButton>
                        <IconButton
                            className={classnames(classes.expand, {
                                [classes.expandOpen]: this.state.expanded,
                            })}
                            onClick={this.handleExpandClick}
                            aria-expanded={this.state.expanded}
                            aria-label="Show more"
                        >
                            <ExpandMoreIcon />
                        </IconButton>
                    </CardActions>
                </Card>
            </div>
        );
    }
}

const TaskItemComponent = withStyles(TaskItem.styles)(TaskItem);

class Taskboard extends Component {
    static styles = (theme) => {
        const primaryColor = theme.palette.primary.main;
        const primaryColorDark = theme.palette.primary.dark;

        return {
            dashboardContainer: {
                padding: '5px',
                height: '100%',
            },
            mainContainer: {
                marginLeft: 'auto',
                marginRight: 'auto',
                minHeight: '300px',
                backgroundColor: primaryColorDark
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
            quadrant: {
                backgroundColor: "#fff",
                textAlign: 'center',
                outline: `1px solid ${theme.palette.secondary.dark}`
            }
        };
    }

    static propTypes = {
        user: PropTypes.object.isRequired,
        projectKey: PropTypes.string,
        chats: PropTypes.array,
        cards: PropTypes.array
    }

    static defaultProps = {
        user: mocks.loggedInUser,
        projectKey: '',
        chats: mocks.loggedInUserActiveChats,
        cards: [],
    }

    constructor(props, context) {
        super(props, context);

        this.state = {
            selectedProject: null
        };


    }

    componentWillMount() {

    }

    render() {
        const { classes, user, history, cards } = this.props;
        const groups = [
            { key: 'hvhp', title: 'High Value - High Probability' },
            { key: 'hvlp', title: 'High Value - Low Probability' },
            { key: 'lvhp', title: 'Low Value - High Probability' },
            { key: 'lvlp', title: 'Low Value - Low Probability' }
        ];

        const quadrants = [];
        groups.map((group) => {
            group.cards = filter(cards, { 'woosparks_quadrant': group.key }) || [];
            quadrants.push((
                <Grid item md={6} sm={3} xs={12} className={classes.quadrant}>
                    <Typography variant="h6">{group.title}</Typography>
                    {group.cards.map((card) => {
                        return (
                            <TaskItemComponent card={card} />
                        )
                    })}
                </Grid>
            ));
        });

        return (
            <Grid
                container
                spacing={16}
                className={classes.dashboardContainer}>
                {quadrants}
            </Grid>
        );
    }




}

const TaskboardComponent = compose(
    withRouter,
    withStyles(Taskboard.styles),
    withTheme
)(Taskboard);

export default TaskboardComponent;

export const defaultDragProps = { draggable: true }

class TaskListItem extends Component {

    static styles = (theme) => {
        return {
            handle: {
                cursor: 'pointer'
            }
        }
    }

    static propTypes = {
        task: PropTypes.object,
        selected: PropTypes.bool,
        draggable: PropTypes.bool,
        onTaskSelect: PropTypes.func,
        draggableBounds: PropTypes.any
    }

    static defaultProps = {
        task: defaultTask,
        selected: false,
        draggable: true,
        draggableBounds: null,
        dragProps: defaultDragProps
    }

    handleStart(e, data) {
        //console.log(`Handle start event ${e.target}`, { e, data });
    }

    handleDrag(e, data) {
        //console.log(`Handle drag event ${e.target}`, { e, data });
    }

    handleStop(e, data) {
        //console.log(`Handle stop event ${e.target}`, { e, data });
    }

    handleToggle() {
        //this.props.history.push(`/actions/${this.props.task.id}`)
        //console.log('Item clicked');
    }

    withDraggable() {
        const { classes } = this.props;
        const draggableProps = {
            handle: `.${classes.handle}`,
            grid: [25, 25],
            bounds: `.${this.props.dragProps.bounds}`
            //onStart: this.handleStart,
            //onDrag: this.handleDrag,
            //onStop: this.handleStop
        };

        return (
            <Draggable {...draggableProps}>
                {this.listItem()}
            </Draggable>)
    }

    handleClick = event => {
        ;
        const that = this;
        //console.log('toggle task', { event });
        this.setState({
            anchorEl: event.currentTarget,
            selected: !that.state.selected
        }, () => {
            if (that.props.onTaskSelect) {
                that.props.onTaskSelect(that.props.task, that.state.selected)
            }
        });
    };

    handleClose = () => {
        this.setState({
            anchorEl: null,
        });
    };

    listItem() {

        const { classes } = this.props;
        const { anchorEl } = this.state;
        const open = Boolean(anchorEl);

        const popover = (<Popover
            id="simple-popper"
            open={open}
            anchorEl={anchorEl}
            onClose={this.handleClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
            }} />);

        return (
            <ListItem
                key={this.props.task.id}
                onClick={this.handleClick}
                button
                className={this.props.classes.listItem}>
                <ListItemText primary={this.props.task.title} />
                <ListItemSecondaryAction>
                    <CircularProgress
                        variant="determinate"
                        size={24}
                        value={this.props.task.percentComplete}
                    />
                </ListItemSecondaryAction>
            </ListItem>
        )
    }

    render() {
        return this.listItem()
    }

    constructor(props, context) {
        super(props, context)
        this.handleToggle = this.handleToggle.bind(this);
        this.withDraggable = this.withDraggable.bind(this);
        this.listItem = this.listItem.bind(this);
        this.handleStart = this.handleStart.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.state = {
            dragging: false,
            anchorEl: null,
        };
    }
}

export const TaskListItemComponent = compose(
    withRouter,
    withStyles(TaskListItem.styles),
    withTheme
)(TaskListItem);

class TaskList extends Component {

    static styles = (theme) => {
        return {
            root: {
                flexGrow: 1,
            },
            heading: {
                fontSize: theme.typography.pxToRem(15),
                flexBasis: '33.33%',
                flexShrink: 0,
            },
            secondaryHeading: {
                fontSize: theme.typography.pxToRem(15),
                color: theme.palette.text.secondary,
            }
        }
    }

    static propTypes = {
        tasks: PropTypes.array,
        onNewTask: PropTypes.function

    }

    static defaultProps = {
        groups: [],
        tasks: [],
        onNewTask: () => { }
    }

    handleChange(panel, expanded) {
        this.setState({
            expanded: expanded ? panel : false,
        });
    };

    render() {
        const { expanded, viewTask } = this.state;
        const { classes, onNewTask } = this.props;
        const that = this;

        let expansionControls = [];

        const expansionFactory = (group) => {
            const toggleExpand = (event, expanded) => {
                that.handleChange(group.id, expanded)
            }

            const newTask = () => {
                onNewTask(group);
            };

            return (
                <ExpansionPanel expanded={expanded === group.id} onChange={toggleExpand}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography className={classes.heading}>{group.title}</Typography>
                        <Typography className={classes.secondaryHeading}>{group.subTitle}</Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <List>
                            {this.props.tasks.map((task) => {
                                const onTaskSelected = () => {
                                    that.setState({ selectedTask: task });
                                }
                                return task.groupId === group.id ? (<TaskListItemComponent task={task}  />) : null
                            })}
                        </List>
                        <AddTaskComponent status='new' />
                    </ExpansionPanelDetails>
                </ExpansionPanel>
            )
        }

        return (
            <div>
                {this.props.groups.map(group => expansionFactory(group))}
            </div>
        )
    }

    constructor(props, context) {
        super(props, context);
        this.state = {
            expanded: [],
            viewTask: null,
            selectedTask: null,
        };
        this.handleChange = this.handleChange.bind(this);
    }
}

export const TaskListComponent = compose(
    withRouter,
    withStyles(TaskList.styles),
    withTheme
)(TaskList);

class TaskDetail extends Component {
    static styles = (theme) => {
        return {
            taskDetailContainer: {
                padding: '15px'
            },
            closeButton: {
                float: 'right'
            },
            taskHeader: {
                marginBottom: theme.spacing(1.5),
                display: 'flex',
                flex: 1,
                justifyContent: 'space-between'
            },
            taskFooter: {
                display: 'flex',
                flex: 1,
                justifyContent: 'space-between',
                marginTop: theme.spacing(1),
            },
            taskDetail: {
                paddingTop: theme.spacing(1),
                paddingBottom: theme.spacing(1),
            },
            createdBy: {
                extend: 'taskDetail',
            }
        };
    };

    static propTypes = {
        task: PropTypes.object,
        
    };


    constructor(props, context) {
        super(props, context);
        this.state = {
            expanded: false,
            task: { ...defaultTask, ...props.task }
        }
        this.toggleExpand = this.toggleExpand.bind(this)
        this.onTitleChanged = this.onTitleChanged.bind(this)
        this.onNewLabelTextChanged = this.onNewLabelTextChanged.bind(this)
        this.onTaskFormSubmit = this.onTaskFormSubmit.bind(this)
        this.addComment = this.addComment.bind(this)
        this.componentDefs = props.api.getComponents(['forms.TaskDetailForm', 'forms.CommentForm'])
    }

    onTaskFormSubmit(taskForm){
        //console.log('Task form submitted', taskForm);
    }

    toggleExpand() {
        this.setState({ expanded: !this.state.expanded })
    }

    onTitleChanged(evt) {
        const { task } = this.state;
        this.setState({ task: { ...task, title: evt.target.value } })
    }

    onDescriptionChange(evt) {
        const { task } = this.state;
        this.setState({ task: { ...task, description: evt.target.value } })
    }

    onNewLabelTextChanged(evt) {
        this.setState({ newLabelText: evt.target.value });
    }

    addComment(commentForm){
        //console.log('Add Comment', commentForm);
    }

    render() {
        const { classes } = this.props;
        const { expanded, task, newLabelText } = this.state;
        const { TaskDetailForm, CommentForm } = this.componentDefs;
    
        return (                                                                        
            <Fragment>
                <TaskDetailForm onSubmit={this.onTaskFormSubmit} formData={{...task}} mode={task.id ? 'edit' : 'new' }>
                    <Fab color="primary" type="submit"><Icon>save</Icon></Fab>
                </TaskDetailForm>
                { task.id && <CommentForm onSubmit={this.addComment} /> }
            </Fragment>
        )
    }
}

export const TaskDetailComponent = compose(
    withApi,
    withRouter,
    withStyles(TaskDetail.styles),
    withTheme
)(TaskDetail);


class TaskDashboard extends Component {

    static styles = (theme) => {
        return {
            centeredMain: {
                width: '100%',
                maxWidth: '1024px',
                marginLeft: 'auto',
                marginRight: 'auto',
            },
            toolbar: {
                justifyContent: 'space-between'
            }
        }
    }

    static propTypes = {
        tasks: PropTypes.array,
        groups: PropTypes.array,
        user: PropTypes.object,
        toolbarTitle: PropTypes.string
    }

    static defaultProps = {
        groups: [
            { id: 1, title: 'General', subTitle: 'Your personal tasks' },
            //{id: 2, title: '360 Assessment', subTitle:'TowerStone Leaders October 2017'},
            //{id: 3, title: '180 Assessment', subTitle:'TowerStone Technical Team October 2017'},
            //{id: 4, title: '180 Assessment', subTitle:'TowerStone Leadership Team October 2017'},
        ],
        tasks: [
        ],
        user: null,
        toolbarTitle: 'Todos'
    }

    toggleShowCompleted() {
        this.setState({ showCompleted: !this.state.showCompleted })
    }

    taskSelected(task) {
        const { history } = this.props;
        this.setState({ viewTask: task }, () => {
            history.push(`/actions/${task.id}`);
        });

    }

    render() {
        const { toolbarTitle, tasks, classes, groups, history } = this.props;

        let viewTask = null;

        const backButtonComponent = ({ history }) => {
            return (
                <IconButton onClick={history.goBack}>
                    <CloseIcon />
                </IconButton>
            )
        }



        const ListComponent = () => <TaskListComponent tasks={tasks} groups={groups} onTaskSelected={this.taskSelected} />
        const DetailComponent = () => <TaskDetailComponent task={tasks[0]} />

        return (
            <Grid container spacing={16} className={classes.centeredMain}>
                <Grid item xs={12}>
                    <AppBar position="static" color="default">
                        <Toolbar className={classes.toolbar}>
                            <Typography variant="h6" color="inherit" >{toolbarTitle}</Typography>
                            <Switch>
                                <Route path={'/actions/:id'} component={backButtonComponent} />
                            </Switch>
                        </Toolbar>
                    </AppBar>
                </Grid>
                <Grid item xs={12}>
                    <Switch>
                        <Route exact path={'/actions'} component={ListComponent} />
                        <Route path={'/actions/:id'} component={DetailComponent} />
                    </Switch>
                </Grid>
            </Grid>
        )
    }

    constructor(props, context) {
        super(props, context);
        this.state = {
            showCompleted: false,
        }

        this.toggleShowCompleted = this.toggleShowCompleted.bind(this);
    }
}

export const TaskDashboardComponent = compose(
    withRouter,
    withStyles(TaskDashboard.styles),
    withTheme
)(TaskDashboard);


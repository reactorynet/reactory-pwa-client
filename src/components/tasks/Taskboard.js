import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter, Route, Switch } from 'react-router';
import classnames from 'classnames';
import {withStyles, withTheme} from 'material-ui/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import {isNil, find, filter} from 'lodash';
import classNames from 'classnames';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import TextField from 'material-ui/TextField';
import Checkbox from 'material-ui/Checkbox';
import { FormGroup, FormControlLabel } from 'material-ui/Form';
import Input, { InputLabel, InputAdornment } from 'material-ui/Input';
import { MenuItem } from 'material-ui/Menu';
import { FormControl, FormHelperText } from 'material-ui/Form';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Card, { CardHeader, CardMedia, CardContent, CardActions } from 'material-ui/Card';
import ExpansionPanel, {
    ExpansionPanelDetails,
    ExpansionPanelSummary,
  } from 'material-ui/ExpansionPanel';
import Collapse from 'material-ui/transitions/Collapse';
import Select from 'material-ui/Select';
import Paper from 'material-ui/Paper';
import Avatar from 'material-ui/Avatar';
import Button from 'material-ui/Button';
import IconButton from 'material-ui/IconButton';
import SendIcon from 'material-ui-icons/Send';
import ChatIcon from 'material-ui-icons/Chat';
import CommentIcon from 'material-ui-icons/Comment';
import GroupAddIcon from 'material-ui-icons/GroupAdd';
import PersonAddIcon from 'material-ui-icons/PersonAdd';
import WhatsHotIcon from 'material-ui-icons/Whatshot'
import AddCircleIcon from 'material-ui-icons/AddCircle';
import PlayIcon from 'material-ui-icons/PlayCircleFilled';
import red from 'material-ui/colors/red';
import FavoriteIcon from 'material-ui-icons/Favorite';
import ShareIcon from 'material-ui-icons/Share';
import ExpandMoreIcon from 'material-ui-icons/ExpandMore';
import MoreVertIcon from 'material-ui-icons/MoreVert';
import List, { ListItem, ListItemSecondaryAction, ListItemText } from 'material-ui/List';
import taskService from './Tasks';
import moment from 'moment';
import * as mocks from '../../models/mock';


class TaskItem extends Component {
    constructor(props, context){
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

    handleExpandClick(){
        this.setState({expanded: !this.state.expanded });
    }

    render(){
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
                minHeight:'300px',
                backgroundColor: primaryColorDark
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

    

    render(){
        const { classes, user, history, cards } = this.props;
        debugger;
        const groups = [
            {key: 'hvhp', title: 'High Value - High Probability'},
            {key: 'hvlp', title: 'High Value - Low Probability'},
            {key: 'lvhp', title: 'Low Value - High Probability'},
            {key: 'lvlp', title: 'Low Value - Low Probability'}
        ];

        const quadrants = [];
        groups.map((group) => {
            group.cards = filter( cards, {'woosparks_quadrant': group.key }) || []; 
            quadrants.push((
                <Grid item md={6} sm={3} xs={12} className={classes.quadrant}>                    
                     <Typography variant="title">{group.title}</Typography>
                     {group.cards.map((card) => {
                         return (
                            <TaskItemComponent card={card}/>
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
    
    constructor(props, context){
        super(props, context);
        
        this.state = {
            selectedProject: null
        };


    }
    
    componentWillMount(){
        
    }
}

const TaskboardComponent = compose(
    withRouter,
    withStyles(Taskboard.styles),
    withTheme()
  )(Taskboard);

export default TaskboardComponent;

class TaskListItem extends Component {

    static styles = ( theme ) => { 
        return {

        }
    }

    static propTypes = {
        task: PropTypes.object
    }

    static defaultProps = {
        task: { id: uuid(), title: 'New Action', description: '', due: null, done: false }
    }

    handleToggle(){
        this.props.history.push(`/actions/${this.props.task.id}`)
    }

    render(){


        return (
            <ListItem
              key={this.props.task.id}
              dense
              button
              onClick={this.handleToggle}
              className={this.props.classes.listItem}>
              <Checkbox
                checked={this.props.task.done === true}
                tabIndex={-1}
                disableRipple
              />
              <ListItemText primary={this.props.task.title} />
              <ListItemSecondaryAction>
                <IconButton aria-label="Comments">
                  <CommentIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
        )
    }

    constructor(props, context){
        super(props, context)
        this.handleToggle = this.handleToggle.bind(this);
    }
}

export const TaskListItemComponent = compose(
    withRouter,
    withStyles(TaskListItem.styles),
    withTheme()
  )(TaskListItem);

class TaskList extends Component {

    static styles = ( theme ) => { 
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
        tasks: PropTypes.array
    }

    static defaultProps = {
        groups: [],
        tasks: []
    }

    handleChange (panel, expanded){        
        this.setState({
          expanded: expanded ? panel : false,
        });
    };

    render(){
        const { expanded, viewTask } = this.state;
        const { classes } = this.props;
        const that = this;

        let expansionControls = [];

        const expansionFactory = (group) => {
            const toggleExpand = ( event, expanded ) => {
                that.handleChange(group.id, expanded)        
            }
            
            
            return (
                <ExpansionPanel expanded={expanded === group.id} onChange={toggleExpand}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography className={classes.heading}>{group.title}</Typography>
                        <Typography className={classes.secondaryHeading}>{group.subTitle}</Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>                        
                        <List>
                            {this.props.tasks.map((task) => {return task.groupId === group.id ? (<TaskListItemComponent task={task}  />) : null})}
                        </List>                        
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

    constructor(props, context){
        super(props, context);
        this.state = {
            expanded: [],
            viewTask: null
        }
        this.handleChange = this.handleChange.bind(this);
    }
}



export const TaskListComponent = compose(
    withRouter,
    withStyles(TaskList.styles),
    withTheme()
  )(TaskList);



class TaskDetail extends Component {
    static styles = (theme) => { 
        return { 
        
        }
    };

    static propTypes = {    
        task: PropTypes.object
    };

    render(){
        return(
            <Paper>
                <Typography variant="title">{this.props.task.title}</Typography>
                <Typography variant="p">{this.props.task.description}</Typography>
            </Paper>
        )
    }
}

export const TaskDetailComponent = compose(
    withRouter,
    withStyles(TaskDetail.styles),
    withTheme()
  )(TaskDetail);

class TaskDashboard extends Component {

    static styles = ( theme ) => { 
        return {
            centeredMain: {
                width:'100%',
                maxWidth: '1024px',
                marginLeft: 'auto',
                marginRight: 'auto',                    
            },
            
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
            {id: 1, title: '360 Assessment', subTitle:'TowerStone Leaders June 2017'},
            {id: 2, title: '360 Assessment', subTitle:'TowerStone Leaders October 2017'},
            {id: 3, title: '180 Assessment', subTitle:'TowerStone Technical Team October 2017'},
            {id: 4, title: '180 Assessment', subTitle:'TowerStone Leadership Team October 2017'},
        ],
        tasks:  [
            { id: uuid(), title: 'Read Good to Great', description: 'Give oral feedback to team on Good to Great', due: moment('12 Oct 2017'), done: false, groupId: 1 },
            { id: uuid(), title: 'Achieve Toastmasters Level 1', description: 'Sign up for toastmasters and complete the first grading', due: moment('12 Oct 2017'), done: false, groupId: 1 },
            { id: uuid(), title: 'Achieve Toastmasters Level 2', description: 'Sign up for toastmasters and complete the second grading', due: moment('13 May 2018'), done: false, groupId: 2 },
        ],
        user: null,
        toolbarTitle: 'Todos'
    }

    toggleShowCompleted(){
        this.setState({showCompleted: !this.state.showCompleted})
    }

    taskSelected(task){
        const { history } = this.props;
        this.setState({viewTask: task}, () => {
            history.push(`/actions/${task.id}`);
        });
        
    }

    render(){
        const { toolbarTitle, tasks, classes, groups } = this.props;
        
        let viewTask = null;
        


        const ListComponent = () => <TaskListComponent tasks={tasks} groups={groups} onTaskSelected={this.taskSelected}/>
        const DetailComponent = () => <TaskDetailComponent task={tasks[0]} />
        return (
            <Grid container spacing={16} className={classes.centeredMain}>
                <Grid item xs={12}>
                    <AppBar position="static" color="default">
                        <Toolbar>
                            <Typography variant="title" color="inherit" >{toolbarTitle}</Typography>                                                                                      
                        </Toolbar>
                    </AppBar>
                </Grid>
                <Grid item xs={12}>
                    <Switch>
                        <Route exact path={'/actions'} component={ ListComponent } />
                        <Route path={'/actions/:id'} component={ DetailComponent } />
                    </Switch>                    
                </Grid>
            </Grid>
        )
    }

    constructor(props, context){
        super(props, context);
        this.state = {
            showCompleted: false
        }

        this.toggleShowCompleted = this.toggleShowCompleted.bind(this);
    }
}

export const TaskDashboardComponent = compose(
    withRouter,
    withStyles(TaskDashboard.styles),
    withTheme()
  )(TaskDashboard);


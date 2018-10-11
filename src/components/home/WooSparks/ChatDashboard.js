import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { Query, Mutation } from 'react-apollo';
import { withStyles, withTheme} from '@material-ui/core/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import { isNil, find, isArray } from 'lodash';
import {
    AppBar, 
    MenuItem,
    FormControl,
    IconButton,
    InputLabel, 
    Grid,
    List, 
    ListItem, 
    ListItemSecondaryAction, 
    ListItemText,
    Paper,
    Toolbar,
    TextField,
    Typography
} from '@material-ui/core';

import Select from '@material-ui/core/Select';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import ChatIcon from '@material-ui/icons/Chat';
import GroupAddIcon from '@material-ui/icons/GroupAdd';
import PlayIcon from '@material-ui/icons/PlayCircleFilled';
import Draggable from 'react-draggable';
import ChatCard from '../../chat/ChatCard';
import { TrelloProvider } from '../../tasks/Tasks';
import { TaskListItemComponent } from '../../tasks/Taskboard';
import * as mocks from '../../../models/mock';
import { nilStr, omitDeep } from '../../util';
import { withApi } from '../../../api/ApiProvider';


class AddTask extends Component {
    constructor(props, context){
        super(props, context);
        this.state = {
            text: ''
        }

        this.onTextChanged = this.onTextChanged.bind(this)
        this.keyPress = this.keyPress.bind(this)
    }

    onTextChanged(e){
        this.setState({ text: e.target.value })
    }

    keyPress(e){
        if(e.charCode === 13){
           this.props.onSave(this.state.text); 
        }
    }

    render(){
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

const AddTaskComponent = compose(
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
                refetchQueries: ['userTasks']
              });
            }
          }
  
          if(loading) return (<p>Updating... please wait</p>)
          if(error) return (<p>{error.message}</p>)  
          return <AddTask {...props} />
        }}
      </Mutation>
    )
  })

const TaskListComponent = compose(
    withApi
  )((props) => {  
    const { api, organizationId, userId, onCancel, status = 'new', percentComplete = 0 } = props  
    return (
      <Query query={api.queries.Tasks.userTasks} variables={{id: userId, status}} >
        {({ loading, error, data }) => {            
          if(loading) return (<p>Loading...</p>)
          if(error) return (<p>{error.message}</p>)  
          
          if(isArray(data.userTasks) === true && data.userTasks.length > 0){
              return data.userTasks.map((task) => <TaskListItemComponent task={task} />)
          } else {
              return <p>No tasks here</p>
          } 
        }}
      </Query>
    )
  })

class ChatDashboard extends Component {
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
                backgroundColor: '#F3F2F1'
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
                maxHeight: (window.innerHeight - 140) / 2,
                overflow: 'scroll'
            },
            column: {
                maxHeight: (window.innerHeight - 140),
                padding: theme.spacing.unit
            },
            toolbar: {
                marginBottom: theme.spacing.unit * 2
            }
        };
    }

    static propTypes = {
        user: PropTypes.object.isRequired, 
        projectKey: PropTypes.string,
        chats: PropTypes.array       
    }

    static defaultProps = {
        user: mocks.loggedInUser,
        projectKey: '',
        chats: mocks.loggedInUserActiveChats        
    }

    onProjectSelectionChanged(evt){
        const selectedProject = evt.target.value;
        window.localStorage.setItem('chatdashboard.selectedProject', selectedProject);
        this.setState({selectedProject}, this.loadProjectData);        
    }

    onChatKeyPress(evt){
        if(evt.keyCode === 13){
            this.sendMessage();
        }
    }

    onChangeMessageChanged(evt){
        this.setState({messageToSend: evt.target.value });
    }

    sendMessage(){
        console.log('Send fake message');
    }

    getProjectMenuItems(){
        const menus = [];        
        this.state.projects.map((project) => {
            menus.push((<MenuItem value={project.id}>{project.name}</MenuItem>));
        });

        return menus;
    }

    getBoardMenuItems(){
        const menus = [];        
        this.state.boards.map((board) => {
            menus.push((<MenuItem value={board.id}>{board.name}</MenuItem>));
        });

        return menus;
    }

    getBoardSelector(){
        const { classes } = this.props;
        if(nilStr(this.state.selectedProject) === false) {
            return (
                <FormControl fullWidth className={classes.formControl}>
                    <InputLabel htmlFor="boardId">Boards</InputLabel>
                    <Select
                        value={this.state.selectedBoard}
                        onChange={this.onSelectedBoardChanged}
                        inputProps={{
                        name: 'boardId',
                        id: 'boardId',
                        }}>
                        {this.getBoardMenuItems()}               
                    </Select>
                </FormControl>
            )
        }

        return null;
    }

    addQuadrantCard(card){
        if(isNil(find(this.state.qaudrantCards,{id:card.id})) === true){
            this.setState({quadrantCards: [...this.state.quadrantCards, card]});
        }
    }

    getTaskList(){
        const { classes } = this.props;
        const that = this;
        return( 
            <List className={classes.taskList}>
            {
                this.state.cards.map((card, cid) => {
                const addCardToQuadrant = () => { that.addQuadrantCard(card); }; 
                if(isNil(find(this.state.qaudrantCards,{id:card.id})) === true){
                    return(
                        <ListItem key={cid} dense button className={classes.listItem}>
                            <Avatar alt={`${card.name}`}>U</Avatar>
                            <ListItemText primary={card.name} secondary={card.shortUrl} />
                            <ListItemSecondaryAction>                                    
                                <IconButton onClick={addCardToQuadrant}>
                                    <PlayIcon />
                                </IconButton>                                                                   
                            </ListItemSecondaryAction>
                        </ListItem>)}
                })                
            }
            </List>);
    }

    render(){
        const { classes, user, history } = this.props;
        const that = this;
    
        return (
            <Grid 
                container
                spacing={16} 
                className={classes.dashboardContainer}>                                
                <Grid item md={3} sm={4} xs={12} style={{height: window.innerHeight - 180}}>                    
                    <FormControl fullWidth className={classes.formControl}>
                        <InputLabel htmlFor="projectKey">Projects</InputLabel>
                        <Select
                            value={this.state.selectedProject}
                            onChange={this.onProjectSelectionChanged}
                            inputProps={{
                            name: 'projectKey',
                            id: 'projectKey',
                            }}>
                            {this.getProjectMenuItems()}                            
                        </Select>
                    </FormControl>                    
                   <List className={classes.userList}>
                        {this.state.projectMembers.map((member, cid) => {
                            return(
                            <ListItem key={cid} dense button className={classes.listItem}>
                            <Avatar alt={`${member.name}`}>{member.initials}</Avatar>
                            <ListItemText primary={member.fullName} secondary={member.email} />
                            <ListItemSecondaryAction>                                    
                                <IconButton>
                                    <ChatIcon />
                                </IconButton>                                                                   
                            </ListItemSecondaryAction>
                        </ListItem>);
                        })}
                    </List>
                
                    <Typography variant="Title">Idea Bucket</Typography>
                    
                    {this.getTaskList()}

                    <div className={classes.buttonRow}>                        
                        <Button variant="fab" color="primary"><GroupAddIcon /></Button>
                    </div>     
                </Grid>

                <Grid item md={9} sm={8} xs={12} className={classes.mainContainer}>
                <AppBar position="static" color="default" className={classes.toolbar}>
                    <Toolbar>
                        <Typography variant="h6" color="inherit">
                            Task Board
                        </Typography>
                    </Toolbar>
                </AppBar>
                    <Grid container spacing={16} direction="row" justify="center" alignItems="stretch">
                        <Grid item md={3}>
                            <Paper className={classes.column}>
                                <Typography variant="heading">Planned</Typography>
                                <List>
                                    <TaskListComponent status="new"/>
                                </List>
                                <AddTaskComponent />
                            </Paper>
                        </Grid>
                        <Grid item md={3}>
                            <Paper className={classes.column}>
                                <Typography variant="heading">In Progress</Typography>
                                <List>
                                    <TaskListComponent status="in-progress"/>
                                </List>
                                <AddTaskComponent status='in-progress'/>
                            </Paper>
                        </Grid>
                        <Grid item md={3}>
                            <Paper className={classes.column}>
                                <Typography variant="heading">Completed</Typography>
                                <List>
                                    <TaskListComponent status="done"/>
                                </List>
                                <AddTaskComponent status='done' />
                            </Paper>
                        </Grid>
                        <Grid item md={3}>
                            <Paper className={classes.column}>
                                <Typography variant="heading">Artifacts</Typography>
                                <List>
                                    <TaskListComponent status="artifact"/>
                                </List>
                                <AddTaskComponent status='team'/>
                            </Paper>
                        </Grid>
                        <Grid item md={3}>
                            <Paper className={classes.column}>
                                <Typography variant="heading">Kudos</Typography>
                                <List>
                                    <TaskListComponent status="team"/>
                                </List>
                                <AddTaskComponent status='team'/>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>                           
            </Grid>
        );
    }

    getTrelloBoards(){
        const self = this;
        this.state.trello.listProjects().then((projectResponse)=>{
            self.setState({projects: projectResponse});
        });
    }

    loadProjectData(){
        const self = this;
        this.state.trello.loadBoardData(self.state.selectedProject).then((boardData)=>{
            console.log('boardData Response', boardData);
            self.setState({projectMembers: boardData.members, cards: boardData.cards});
        });
    }

    getMemberInfo(){
        this.state.trello.getMemberData().then((me) => {
            this.setState({me});
        });
    }

    componentWillMount(){
        this.getMemberInfo();
        this.getTrelloBoards();
        if(nilStr(this.state.selectedProject) === false) this.loadProjectData();
    }
    
    constructor(props, context){
        super(props, context);
        
        this.state = {
            me: null,
            selectedProject: window.localStorage.getItem('chatdashboard.selectedProject') || null,
            projectMembers: [],
            selectedBoard: window.localStorage.getItem('chatboardashboard.selectedBoard') || null,
            quadrantCards: [],
            boards: [],
            cards: [],
            projects : [],            
            trello: new TrelloProvider()
        };        
        this.onProjectSelectionChanged = this.onProjectSelectionChanged.bind(this);
        this.getMemberInfo = this.getMemberInfo.bind(this);    
        this.onChatKeyPress = this.onChatKeyPress.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.getTrelloBoards = this.getTrelloBoards.bind(this);
        this.getProjectMenuItems = this.getProjectMenuItems.bind(this);
        this.getBoardSelector = this.getBoardSelector.bind(this);
        this.getBoardMenuItems = this.getBoardMenuItems.bind(this);
        this.loadProjectData = this.loadProjectData.bind(this);
        this.getTaskList = this.getTaskList.bind(this);
        this.addQuadrantCard = this.addQuadrantCard.bind(this);
    }
}

const ChatDashboardComponent = compose(
    withApi,
    withRouter,
    withTheme(),
    withStyles(ChatDashboard.styles),    
  )(ChatDashboard);
  export default ChatDashboardComponent;

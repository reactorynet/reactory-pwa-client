import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import {withStyles, withTheme} from '@material-ui/core/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import {isNil, find} from 'lodash';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { 
    MenuItem,
    FormControl,
    IconButton,
    InputLabel, 
    List, 
    ListItem, 
    ListItemSecondaryAction, 
    ListItemText 
} from '@material-ui/core';

import Select from '@material-ui/core/Select';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import ChatIcon from '@material-ui/icons/Chat';
import GroupAddIcon from '@material-ui/icons/GroupAdd';
import PlayIcon from '@material-ui/icons/PlayCircleFilled';
import ChatCard from '../../chat/ChatCard';
import { TrelloProvider } from '../../tasks/Tasks';
import * as mocks from '../../../models/mock';
import { nilStr } from '../../util';

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
            userList: {
                maxHeight: (window.innerHeight - 140) / 2,
                overflow: 'scroll'
            },
            taskList: {
                maxHeight: (window.innerHeight - 140) / 2,
                overflow: 'scroll'
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
                    <ChatCard />
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
    withRouter,
    withStyles(ChatDashboard.styles),
    withTheme()
  )(ChatDashboard);
  export default ChatDashboardComponent;

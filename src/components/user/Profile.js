import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import {withStyles, withTheme} from 'material-ui/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import {isNil} from 'lodash';
import classNames from 'classnames';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import Chip from 'material-ui/Chip';
import List, { ListItem, ListItemSecondaryAction, ListItemText } from 'material-ui/List';
import Button from 'material-ui/Button';
import IconButton from 'material-ui/IconButton';
import SaveIcon from 'material-ui-icons/Save';
import SupervisorIcon from 'material-ui-icons/SupervisorAccount';
import RowingIcon from 'material-ui-icons/Rowing';
import VertMoreIcon from 'material-ui-icons/MoreVert';
import ShowChartIcon from 'material-ui-icons/ShowChart';
import PersonIcon from 'material-ui-icons/Person';
import EmailIcon from 'material-ui-icons/Email';
import PlaylistAddCheck from 'material-ui-icons/PlaylistAddCheck';
import PhotoCamera from 'material-ui-icons/PhotoCamera';
import Avatar from 'material-ui/Avatar';
import TextField from 'material-ui/TextField';
import Paper from 'material-ui/Paper';

import staffImages from '../../assets/images/staff';

const defaultProfile = {
    id: uuid(),
    title: 'Mr',
    firstName: 'Werner',
    lastName: 'Weber',
    email: 'werner.weber@gmail.com',
    businessUnit: 'Development',
    peers: [
        { id: uuid(), firstName: 'Thea', lastName: 'Nel', avatar: staffImages.TheaN, email: 'thea.nel@towerstone-global.com', relationship: 'peer' },
        { id: uuid(), firstName: 'Lynne', lastName: 'Klue', avatar: staffImages.LynneK, email: 'lynne.kleu@towerstone-global.com', relationship: 'peer' },
        { id: uuid(), firstName: 'Sue', lastName: 'Bakker', avatar: staffImages.SueB, email: 'sue.bakker@towerstone-global.com', relationship: 'team-member' },
        { id: uuid(), firstName: 'Mandy', lastName: 'Eagar', avatar: staffImages.MandyE, email: 'mandy.eagar@towerstone-global.com', relationship: 'supervisor'},
        { id: uuid(), firstName: 'Yolande', lastName: 'Wheatley', avatar: staffImages.SueB, email: 'yolande.wheatley@towerstone-global.com', relationship: 'peer' },
    ],
    surveys: [
        { id: uuid(), title: 'Annual External Vendor Assessment', overall: 75, complete: true, assessors: 4, completed: '16 Jan 2018', assessmentType: '360' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 73, complete: true, assessors: 18, completed: '21 Oct 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 71, complete: true, assessors: 18, completed: '21 July 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 68, complete: true, assessors: 18, completed: '21 April 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 67, complete: true, assessors: 18, completed: '21 July 2017', assessmentType: 'team' },        
        { id: uuid(), title: 'Annual External Vendor Assessment', overall: 75, complete: true, assessors: 4, completed: '16 Jan 2017', assessmentType: '360' },
    ],
    teams: [
        {id: uuid(), title: 'Developers' },
        {id: uuid(), title: 'Externals' },
        {id: uuid(), title: 'Strategy' },
        {id: uuid(), title: 'Design' }
    ],
    notifications: [],    
    avatar: staffImages.WernerW,
};


class Profile extends Component {


    static styles = (theme) => ({
        mainContainer: {
            width:'100%',
            maxWidth: '1024px',
            marginLeft: 'auto',
            marginRight: 'auto',                    
        },
        textFieldBase: {
            
        },
        avatarContainer: {
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
        },
        avatar: {
            margin: 10,
        },
        bigAvatar: {
            width: 120,
            height: 120,
        },
        general: {
            padding: '5px'
        },
        hiddenInput: {
            display: 'none'
        }
    });

    static propTypes = {
        profile:  PropTypes.object.isRequired
    };

    static defaultProps = {
        profile: defaultProfile 
    };


    onAvatarMouseOver(){
        this.setState({avatarMouseHover: true});
    }

    onAvatarMouseOut(){
        this.setState({avatarMouseHover: false});
    }
    
    render(){

        const { firstName, lastName, title, email, avatar, peers, surveys, teams } = this.props.profile;
        const { classes, history } = this.props;
        const { avatarMouseOver } = this.state;
        const defaultFieldProps = {
            margin: "normal",
            fullWidth: true,
            InputLabelProps: {
                shrink: true
            },
            className: classes.textFieldBase
        };
                                                
        return (
            <Grid container spacing={16} className={classes.mainContainer}>
                <Grid item sm={12} xs={12} offset={4}>
                    <Paper className={classes.general}>
                        <form>        
                        <Typography variant='headline'>Profile</Typography>

                            <div className={classes.avatarContainer}>
                                <Avatar 
                                    src={avatar} alt={`${firstName} ${lastName}`} 
                                    className={classNames(classes.avatar, classes.bigAvatar, avatarMouseOver === true ? classes.avatarHover : '' )} 
                                    onMouseOver={this.onAvatarMouseOver}
                                    onMouseOut={this.onAvatarMouseOut}/> 
                                    <input accept="image/*" className={classes.hiddenInput} id="icon-button-file" type="file" />
                                    <label htmlFor="icon-button-file">
                                        <IconButton color="primary" className={classes.button} component="span">
                                        <PhotoCamera />
                                        </IconButton>
                                    </label>           
                            </div>
                            { TextField({...defaultFieldProps, label: 'Name', value: firstName, helperText: 'Please use your given name'}) }
                            { TextField({...defaultFieldProps, label: 'Surname', value: lastName, helperText: 'Please use your given name'} )} 
                            { TextField({...defaultFieldProps, type:'email', label: 'Email', value: email, helperText: 'Please use your work email address, unless you are an outside provider'})}                                   
                            { TextField({...defaultFieldProps, label: 'Business Unit', helperText: 'Your business unit'}) }
                        </form>
                        <Typography variant='headline'> Your team memberships.</Typography>
                        <div className={classes.avatarContainer} >
                            
                            { teams.map( (team, ti ) => {
                                return (
                                    <Chip key={ti}
                                        label={team.title} />
                                )
                            })}
                        </div>
                        <div className={classes.avatarContainer} style={{justifyContent:'flex-end', marginTop: '5px'}}>
                            <Button variant='raised' color='primary'><SaveIcon />&nbsp;SAVE</Button>
                        </div>
                    </Paper>
                </Grid>
                <Grid  item sm={12} xs={12} offset={4}>
                    <Paper className={classes.general}>
                          
                            <Typography variant='headline'>Colleagues</Typography>
                            <Typography gutterBottom>
                                In order to measure your participation in the business, you need to have some work colleagues nominated that the system will use as a pool of
                                assessors to give constructive and considered feedback.  These should include someone you report to, someone that reports to you and several peers
                                or colleagues.  For best results you should have about seven to eight nominees in total.  Keep in mind that some people may decline your nomination, so 
                                it is better to nominate more than less.
                            </Typography>
                            <List>
                            { peers.map( (peer, pid) => (
                                <ListItem key={pid} dense button className={classes.listItem}>
                                <Avatar alt={`${peer.firstName} ${peer.lastName}`} src={peer.avatar} />
                                <ListItemText primary={window.innerWidth >= 768 ? `${peer.firstName} ${peer.lastName}` : `${peer.firstName.substring(0,1)} ${peer.lastName}` } secondary={ window.innerWidth >= 768 ? `${peer.email}` : ''} />
                                <ListItemSecondaryAction>
                                    <IconButton color={peer.relationship === 'team-member' ? 'primary' : 'default'}>
                                        <RowingIcon />
                                    </IconButton>
                                    <IconButton color={peer.relationship === 'peer' ? 'primary' : 'default'}>
                                        <PersonIcon />
                                    </IconButton>
                                    <IconButton color={peer.relationship === 'supervisor' ? 'primary' : 'default'}>
                                        <SupervisorIcon />
                                    </IconButton>                                
                                </ListItemSecondaryAction>
                            </ListItem>
                            ))}   
                            </List>                         
                        
                        { TextField({...defaultFieldProps, type:'email', label: 'Invite a colleague', helperText: 'Connect with a colleague and ask them to be an assessor'})}           
                        <div className={classes.avatarContainer} style={{justifyContent:'flex-end', marginTop: '5px'}}>
                            <Button variant='raised'><EmailIcon />&nbsp;SEND INVITE</Button>&nbsp;
                            <Button variant='raised' color='primary'><PlaylistAddCheck />&nbsp;CONFIRM</Button>
                        </div>
                    </Paper>
                </Grid>
                <Grid  item sm={12} xs={12} offset={4}>
                    <Paper className={classes.general}>
                            <Typography variant='headline'>Surveys</Typography>
                            <Typography gutterBottom>
                                Below is a list of your past surveys.  Click on the more icon to get an overview your scores, or click the graph link
                                which will take you to the details page for that assessement.  If you want to view current assessments you are part of 
                                please go to the Survey's page for more detail.
                            </Typography>
                            <List>
                            { surveys.map( (survey, pid) => {
                                
                                const surveyShowMoreIconButtonClicked = () => {
                                    history.push('/survey');
                                };
                                
                                return (<ListItem key={pid} dense button className={classes.listItem}>
                                    <Avatar alt={`${survey.title}`}>{survey.overall}</Avatar>
                                    <ListItemText primary={survey.title} secondary={survey.completed} />
                                    <ListItemSecondaryAction>                                    
                                        <IconButton>
                                            <ShowChartIcon />
                                        </IconButton>
                                        <IconButton onClick={surveyShowMoreIconButtonClicked}>
                                            <VertMoreIcon />
                                        </IconButton>                                
                                    </ListItemSecondaryAction>
                                </ListItem>
                            )})}   
                            </List>                         
                    </Paper>
                </Grid>                                                         
            </Grid>
        );
    }

    windowResize(){
        this.forceUpdate();
    }

    constructor(props, context){
        super(props, context);
        this.onAvatarMouseOver = this.onAvatarMouseOver.bind(this);
        this.onAvatarMouseOut = this.onAvatarMouseOut.bind(this);
        this.windowResize = this.windowResize.bind(this);
        this.state = {
            avatarMouseOver: false
        }
        
        window.addEventListener('resize', this.windowResize);
    }
}

const ProfileViewComponent = compose(
    withRouter,
    withStyles(Profile.styles),
    withTheme()
  )(Profile);
  export default ProfileViewComponent;
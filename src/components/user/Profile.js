import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import {withStyles, withTheme} from '@material-ui/core/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import {isNil, isArray} from 'lodash';
import classNames from 'classnames';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Chip from '@material-ui/core/Chip';
import { List, ListItem, ListItemSecondaryAction, ListItemText } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import SaveIcon from '@material-ui/icons/Save';
import TrashIcon from '@material-ui/icons/Delete';
import SupervisorIcon from '@material-ui/icons/SupervisorAccount';
import RowingIcon from '@material-ui/icons/Rowing';
import VertMoreIcon from '@material-ui/icons/MoreVert';
import ShowChartIcon from '@material-ui/icons/ShowChart';
import PersonIcon from '@material-ui/icons/Person';
import EmailIcon from '@material-ui/icons/Email';
import PlaylistAddCheck from '@material-ui/icons/PlaylistAddCheck';
import PhotoCamera from '@material-ui/icons/PhotoCamera';
import Avatar from '@material-ui/core/Avatar';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';

import Tooltip from '@material-ui/core/Tooltip';

import { withApi, ReactoryApi } from '../../api/ApiProvider';
import DefaultAvatar from '../../assets/images/profile/default.png';
import { CDNProfileResource, getAvatar } from '../util';

const defaultProfile = {
    __isnew: true,    
    firstName: '',
    lastName: '',
    email: '',
    businessUnit: '',
    peers: {
        peers: []
    },
    avatar: null,
};

const nilf = () => ({});
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
        profile:  PropTypes.object.isRequired,
        api: PropTypes.instanceOf(ReactoryApi),
        loading: PropTypes.bool,
        mode: PropTypes.string,
        isNew: PropTypes.bool,
        onCancel: PropTypes.func,
        onSave: PropTypes.func
    };

    static defaultProps = {
        profile: defaultProfile,
        loading: false,
        mode: 'user',
        isNew: false,
        onCancel: nilf,
        onSave: nilf
    };

    onAvatarMouseOver(){
        this.setState({ avatarMouseHover: true });
    }

    onAvatarMouseOut(){
        this.setState({ avatarMouseHover: false });
    }

    renderPeers(){
        const { peers, __isnew } = this.state.profile;
        const { classes, history, api, withPeers } = this.props;
        
        if(__isnew) return null
        if(withPeers === false) return null
        
        const defaultFieldProps = {
            margin: "normal",
            fullWidth: true,
            InputLabelProps: {
                shrink: true
            },
            className: classes.textFieldBase
        };

        const doInvite = () => {

        };

        const doConfirm = () => {

        };

        
        
        const peerlist = isNil(peers) === false && isArray(peers.peers) === true ? peers.peers.map( (entry, pid) => { 
            return (
            <ListItem key={pid} dense button>
                <Avatar alt={`${entry.user.firstName} ${entry.user.lastName}`} src={getAvatar(entry.user) }  />
                <ListItemText primary={window.innerWidth >= 768 ? `${entry.user.firstName} ${entry.user.lastName}` : `${entry.user.firstName.substring(0,1)} ${entry.user.lastName}` } secondary={ window.innerWidth >= 768 ? `${entry.user.email}` : ''} />                            
                <ListItemSecondaryAction>
                    <Tooltip title="Mark as direct report">
                        <IconButton color={entry.relationship === 'report' ? 'primary' : 'default'}>
                            <RowingIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Mark as peer">
                        <IconButton color={entry.relationship === 'peer' ? 'primary' : 'default'}>
                            <PersonIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Mark as manager / supervisor">
                        <IconButton color={entry.relationship === 'manager' ? 'primary' : 'default'}>
                            <SupervisorIcon />
                        </IconButton>
                    </Tooltip>         

                    <Tooltip title={`Remove ${entry.user.firstName} as ${entry.relationship}`}>
                        <IconButton>
                            <TrashIcon />
                        </IconButton>                                
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
        )}) : null

       
        const FriendsList = api.getComponent('core.UserList.1.0.0');        
        const friends = isNil(FriendsList) === false ? <FriendsList /> : null
        return (
            <Grid  item sm={12} xs={12} offset={4}>
                <Paper className={classes.general}>                          
                    <Typography variant='headline'>Colleagues</Typography>
                    <Typography gutterBottom>
                        In order to measure your participation in the business, you need to have some work colleagues nominated that the system will use as a pool of
                        assessors to give constructive and considered feedback.  These should include someone you report to, someone that reports to you and several peers
                        or colleagues.  For best results you should have about seven to eight nominees in total.  Keep in mind that some people may decline your nomination, so 
                        it is better to nominate more than less.
                    </Typography>
                    {friends}                    
                    <TextField {...defaultFieldProps} type="email" label="Invite a colleague" helperText="Connect with a colleague and ask them to be an assessor" />           
                    <div className={classes.avatarContainer} style={{justifyContent:'flex-end', marginTop: '5px'}}>                            
                        <Button variant='raised' onClick={doInvite}><EmailIcon />&nbsp;SEND INVITE</Button>&nbsp;
                        <Button variant='raised' color='primary' onClick={doConfirm}><PlaylistAddCheck />&nbsp;CONFIRM</Button>
                    </div>
                </Paper>
            </Grid>)
    }


    renderGeneral(){
        const that = this
        const { profile, avatarUpdated } = this.state;
        const { firstName, lastName, businessUnit, email, avatar, peers, surveys, teams, __isnew, id } = profile;        
        const { mode, classes, history } = this.props;
        const defaultFieldProps = {
            margin: "normal",
            fullWidth: true,
            InputLabelProps: {
                shrink: true
            },
            className: classes.textFieldBase
        };

        const { avatarMouseOver } = this.state;

        const doSave = () => {
            let profile = {...that.state.profile}
            //cleanup for save
            if(profile.peers) delete profile.peers
            if(profile.surveys) delete profile.surveys
            if(profile.teams) delete profile.teams
            if(profile.notifications) delete profile.notifications
            profile.authProvider = 'LOCAL'
            profile.providerId = 'reactory-system'            
            that.props.onSave(profile)
        };

        const back = () => { 
            history.goBack();
        }

        const onFileClick = () => {
            const that = this;
            let preview = null;
            let file    = that.userProfileImageFile.files[0];
            let reader  = new FileReader();
            reader.addEventListener("load", function () {
                preview = reader.result;                
                that.setState({profile: {...that.state.profile, avatar: preview }, avatarUpdated: true });
            }, false);
    
            if (file) {
                reader.readAsDataURL(file);
            }
        }

        const updateFirstname = (evt) => {
            that.setState({profile: {...that.state.profile, firstName: evt.target.value}})
        };
        
        const updateLastname = (evt) => {
            that.setState({profile: {...that.state.profile, lastName: evt.target.value}})
        };

        const updateEmail = (evt) => {
            that.setState({profile: {...that.state.profile, email: evt.target.value}})
        };

        const updateBusinessUnit = (evt) => {
            that.setState({profile: {...that.state.profile, businessUnit: evt.target.value}})
        };

        let avatarComponent = null;        
        avatarComponent = (
            <div className={classes.avatarContainer}>
                <Avatar 
                    src={getAvatar(profile)} alt={`${firstName} ${lastName}`} 
                    className={classNames(classes.avatar, classes.bigAvatar, avatarMouseOver === true ? classes.avatarHover : '' )} 
                    onMouseOver={this.onAvatarMouseOver}
                    onMouseOut={this.onAvatarMouseOut}/> 
                    <input accept="image/*" className={classes.hiddenInput} onChange={onFileClick} id="icon-button-file" type="file" ref={(n) => that.userProfileImageFile = n} />
                    <label htmlFor="icon-button-file">
                        <IconButton color="primary" className={classes.button} component="span">
                            <PhotoCamera />
                        </IconButton>
                    </label>           
            </div>);
        

        return (
            <Grid item sm={12} xs={12} offset={4}>
                <Paper className={classes.general}>
                    <form>        
                        <Typography variant='headline'>Profile</Typography>
                        { avatarComponent }
                        <TextField {...defaultFieldProps} label='Name' value={firstName} helperText='Please use your given name' onChange={updateFirstname} />
                        <TextField {...defaultFieldProps} label='Surname' value={lastName} helperText='Please use your given name' onChange={updateLastname} />
                        <TextField {...defaultFieldProps} label='Email' value={email} helperText='Please use your work email address, unless you are an outside provider' onChange={updateEmail} />                        
                    </form>

                    <div className={classes.avatarContainer} style={{justifyContent:'flex-end', marginTop: '5px'}}>
                        <Button variant='raised' onClick={back}><CloseIcon />&nbsp;BACK</Button>
                        <Button variant='raised' color='primary' onClick={doSave}><SaveIcon />&nbsp;SAVE</Button>
                    </div>
                </Paper>
            </Grid>)
    }   
    
    render(){        
        const { classes, profile } = this.props;                                                                                 
        return (
            <Grid container spacing={16} className={classes.mainContainer}>
                { this.renderGeneral() }
                { this.renderPeers() }
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
        this.renderGeneral = this.renderGeneral.bind(this);
        this.renderPeers = this.renderPeers.bind(this);
        this.state = {
            avatarMouseOver: false,
            profile: { ...props.profile },
            avatarUpdated: false,
        }        
        window.addEventListener('resize', this.windowResize);
    }
}

const ProfileViewComponent = compose(
    withRouter,
    withApi,
    withStyles(Profile.styles),
    withTheme()
  )(Profile);
  export default ProfileViewComponent;
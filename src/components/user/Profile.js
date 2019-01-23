import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { compose } from 'redux';
import MaterialTable from 'material-table';
import om from 'object-mapper';
import uuid from 'uuid';
import { isNil, isArray } from 'lodash';
import classNames from 'classnames';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { CircularProgress , List, ListItem, ListItemSecondaryAction, ListItemText, InputAdornment, Icon } from '@material-ui/core';
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
import { CDNProfileResource, getAvatar, isEmail } from '../util';
import { UserListItem } from '.';
import { UserListWithSearchComponent } from './Widgets'
import gql from 'graphql-tag';
import { isNullOrUndefined } from 'util';

const defaultProfile = {
    __isnew: true,
    firstName: '',
    lastName: '',
    email: '',
    businessUnit: '',
    peers: {
        organization: null,
        user: null,
        peers: []
    },
    memberships: [],
    avatar: null,
};

const UserInviteControl = (props, context) => {

    const { onChange, value } = props;

    return <TextField
        id={'peerInviteByEmail'}
        onChange
        value
    />
}

const nilf = () => ({});

class Profile extends Component {

    static styles = (theme) => ({
        mainContainer: {
            width: '100%',
            maxWidth: '1024px',
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        margin: {
            margin: theme.spacing.unit,
        },
        textField: {
            width: '98%'
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
        profile: PropTypes.object.isRequired,
        profileTitle: PropTypes.string,
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
        profileTitle: 'My Profile',
        mode: 'user',
        isNew: false,
        onCancel: nilf,
        onSave: nilf
    };

    onAvatarMouseOver() {
        this.setState({ avatarMouseHover: true });
    }

    onAvatarMouseOut() {
        this.setState({ avatarMouseHover: false });
    }

    renderUser() {
        return <UserListItem user={this.state.profile} />
    }

    inviteUserByEmail() {
        console.log('Inviting user', this.state.inviteEmail);
        const { api } = this.props;
        const { profile } = this.state;
        const self = this
        const doQuery = () => {
            const options = {
                searchString: this.state.inviteEmail,
                sort: this.state.userSort || 'email'
            };

            api.graphqlQuery(api.queries.Users.searchUser, options).then((userResult) => {
                console.log('Search Result', userResult);
                self.setState({ findPeersResult: userResult, searching: false, showResult: true })
            }).catch((searchError) => {
                console.log('Search Error', searchError);
                self.setState({ searching: false, findPeersResult: [] })
            });
        }

        self.setState({ searching: true, findPeersResult: [] }, doQuery)
    }

    renderMemberships() {
        const { memberships } = this.state.profile
        const data = [];
        const self = this
        if (memberships && memberships.length) {
            memberships.map(m => data.push({ ...m }))
        }
        return (

            <Grid item sm={12} xs={12} offset={4}>
                <MaterialTable
                    columns={[
                        {
                            title: 'Client', render: (rowData) => {
                                return rowData && rowData.client ? rowData.client.name : 'No Client'
                            }
                        },
                        {
                            title: 'Organization', render: (rowData) => {
                                return rowData && rowData.organization ? rowData.organization.name : 'No Organization'
                            }
                        },
                        {
                            title: 'Business Unit', render: (rowData) => {
                                return rowData && rowData.businessUnit ? rowData.businessUnit.name : 'No Business Unit'
                            }
                        },
                        {
                            title: 'Roles', render: (rowData) => {
                                return rowData && rowData.roles ? rowData.roles.map(r => `${r} `) : 'No Roles'
                            }
                        },
                    ]}                    
                    data={data}
                    title="Memberships"
                    actions={[
                        rowData =>({
                            icon: 'repeat',
                            tooltip: 'Click to load the organigram for this membership',
                            disabled: rowData.relationship === 'peer',
                            onClick: (event, rowData) => {
                                self.setState({ selectedMembership: rowData })
                            },

                        })
                    ]}
                     />
            </Grid>

        )
    }

    renderPeers() {
        console.log('render peers')
        const { profile, selectedMembership, showResult, searching, showPeerSelection } = this.state
        const { peers, __isnew } = profile;
        const { BasicModal, Loading } = this.componentDefs        
        
        let content = null

        if(searching === true) content = <Loading title="Looking for peers" />
                 
        const { classes, history, api, withPeers } = this.props;
        if (__isnew) return null
        if (withPeers === false) return null

        const setInviteEmail = evt => { 
            this.setState({ inviteEmail: evt.target.value }) 
        };

        const setPeerRelationShip = (peer, relationship, cb = nilf) => {
            const mutation = gql(`mutation SetPeerRelationShip($id: String!, $peer: String!, $organization: String!, $relationship: PeerType){
                setPeerRelationShip(id: $id, peer: $peer, organization: $organization, relationship: $relationship){
                    user {
                        id
                        firstName
                        lastName
                    }
                    organization {
                        id
                        name
                        avatar                        
                    },
                    peers {
                        user {
                            id
                            firstName
                            lastName
                        }
                        isInternal
                        inviteSent
                        confirmed
                        relationship                        
                    }
                    allowEdit
                    lastConfirm
                }
            }`);

            const variables = { 
                id: this.state.profile.id,
                peer: peer.id, 
                organization: this.state.selectedMembership.organization.id,
                relationship 
            };

            api.graphqlMutation(mutation, variables).then((peerResult) => {
                console.log('Set the user peer relationship', peerResult)
                if(cb) cb(peerResult)
            }).catch((peerSetError) => {
                console.error('Error setting peer relationship', peerSetError)
            })  
        };
 

        const removePeer = (peer) => {
            const mutation = gql(`mutation removePeer($id: String!, $peer: String!, $organization: String!){
                removePeer(id: $id, peer: $peer, organization: $organization){
                    user {
                        id
                        firstName
                        lastName
                    }
                    organization {
                        id
                        name
                        avatar                        
                    },
                    peers {
                        user {
                            id
                            firstName
                            lastName
                        }
                        isInternal
                        inviteSent
                        confirmed
                        relationship                        
                    }
                    allowEdit
                    lastConfirm
                }
            }`);

            const variables = { 
                id: this.state.profile.id,
                peer: peer.id, 
                organization: this.state.selectedMembership.organization.id,
            };

            api.graphqlMutation(mutation, variables).then((peerResult) => {
                console.log('remove user peer relationship', peerResult)
                //if(cb) cb(peerResult)
            }).catch((peerSetError) => {
                console.error('Error removing peer from member', peerSetError)
            })  
        }

        const data = [];

        if (peers && peers.peers) {
            peers.peers.map((entry, index) => {
                data.push({
                    ...entry.user,
                    fullName: `${entry.user.firstName} ${entry.user.lastName}`,
                    email: entry.user.email,
                    relationship: entry.relationship
                });
            })
        }

        const setUserPeerSelection = (selection) => {
            console.log('Set the user peer selection', selection);
            debugger;
            let updatedPeers = []
            let found = false
            if(peers && peers.peers){
                peers.peers.map( p => { 
                    if(p.user.id === selection.id) {
                        found = true                        
                    } else {
                        updatedPeers.push({ ...p });
                    }
                });                                
            }
            
            if(found === false) {
                setPeerRelationShip(selection, 'peer', (result) => {                    
                    console.log('Setting Peer Result', result);
                    this.setState({ profile: { ...profile, peers: { ...peers, peers: updatedPeers } } })
                })
            }
            
            
        };

        const acceptUserSelection = () => {
            this.setState({ showPeerSelection: false });
        }

        const editUserSelection = () => {
            this.setState({ showPeerSelection: true });
        }

        const membershipSelected = selectedMembership && 
        selectedMembership.organization && 
        selectedMembership.organization.id;                         

        const closeSelection = () => {
            this.setState({ showPeerSelection: false });
        }

        return (
            <Fragment>                
                <Grid item sm={12} xs={12} offset={4}>
                    {
                        membershipSelected && this.state.showPeerSelection &&                        
                            <UserListWithSearchComponent 
                                onUserSelect={setUserPeerSelection}
                                onAcceptSelection={acceptUserSelection}
                                organizationId={this.state.selectedMembership.organization.id}
                                selected={peers && peers.peers ? peers.peers.map( p => p.user.id ) : []}
                                multiSelect={true}                            
                            />                        
                    }               
                    {
                        !membershipSelected && 
                        <Typography variant="body2">Select a membership with an organization organization to load peers</Typography> 
                    }
                    {
                        membershipSelected &&
                        !this.state.showPeerSelection && 
                        <MaterialTable
                        columns={[
                            { title: 'Delegate', field: 'fullName' },
                            { title: 'Email', field: 'email' },
                            {
                                title: 'Relationship',
                                field: 'relationship',
                                render: (rowData) => { return rowData.relationship.toUpperCase() }
                            },
                        ]}
                        data={data}
                        title="User Peers"
                        actions={[
                            rowData => ({
                                icon: 'supervisor_account',
                                tooltip: 'Set user as supervisor',
                                disabled: rowData.relationship === 'manager',
                                onClick: (event, rowData) => {
                                    console.log('Making User Supervisor', { event, rowData });
                                    setPeerRelationShip(rowData, 'manager')
                                },
                            }),
                            rowData => ({
                                icon: 'account_box',
                                tooltip: 'Set user as peer',
                                disabled: rowData.relationship === 'peer',
                                onClick: (event, rowData) => {
                                    console.log('Setting User Peer', { event, rowData });
                                    setPeerRelationShip(rowData, 'manager')
                                },
                            }),
                            rowData => ({
                                icon: 'account_circle',
                                tooltip: 'Set user as direct report',
                                disabled: rowData.relationship === 'report',
                                onClick: (event, rowData) => {
                                    console.log('Making User Supervisor', { event, rowData });
                                    setPeerRelationShip(rowData, 'report')
                                },
                            }),
                            rowData => ({
                                icon: 'delete_outline',
                                tooltip: 'Delete user from peers',
                                disabled: false,
                                onClick: (event, rowData) => {
                                    console.log('Delete user from peers', { event, rowData });
                                    removePeer(rowData);
                                },
                            }),
                            {
                                icon: 'check_circle',
                                tooltip: 'Confirm peer selection',
                                disabled: false,
                                isFreeAction: true,
                                onClick: (event, rowData) => {
                                    console.log('Confirm peers', { event, rowData });
                                },
                            },
                            {
                                icon: 'edit',
                                tooltip: 'Edit Selection',
                                disabled: false,
                                isFreeAction: true,
                                onClick: (event, rowData) => {
                                    console.log('Edit peer selection', { event, rowData });
                                    editUserSelection()
                                },
                            }
                        ]}
                    />
                    }                    
                </Grid>

            </Fragment>

        )
    }


    renderGeneral() {
        const that = this
        const { profile, avatarUpdated } = this.state;
        const { firstName, lastName, businessUnit, email, avatar, peers, surveys, teams, __isnew, id } = profile;
        const { mode, classes, history, profileTitle } = this.props;
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
            let profile = { ...that.state.profile }
            //cleanup for save
            if (profile.peers) delete profile.peers
            if (profile.surveys) delete profile.surveys
            if (profile.teams) delete profile.teams
            if (profile.notifications) delete profile.notifications
            if (profile.memberships) delete profile.memberships
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
            let file = that.userProfileImageFile.files[0];
            let reader = new FileReader();
            reader.addEventListener("load", function () {
                preview = reader.result;
                that.setState({ profile: { ...that.state.profile, avatar: preview }, avatarUpdated: true });
            }, false);

            if (file) {
                reader.readAsDataURL(file);
            }
        }

        const updateFirstname = (evt) => {
            that.setState({ profile: { ...that.state.profile, firstName: evt.target.value } })
        };

        const updateLastname = (evt) => {
            that.setState({ profile: { ...that.state.profile, lastName: evt.target.value } })
        };

        const updateEmail = (evt) => {
            that.setState({ profile: { ...that.state.profile, email: evt.target.value } })
        };

        const updateBusinessUnit = (evt) => {
            that.setState({ profile: { ...that.state.profile, businessUnit: evt.target.value } })
        };

        let avatarComponent = null;
        avatarComponent = (
            <div className={classes.avatarContainer}>
                <Avatar
                    src={getAvatar(profile)} alt={`${firstName} ${lastName}`}
                    className={classNames(classes.avatar, classes.bigAvatar, avatarMouseOver === true ? classes.avatarHover : '')}
                    onMouseOver={this.onAvatarMouseOver}
                    onMouseOut={this.onAvatarMouseOut} />
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
                        <Typography variant='caption'>{profileTitle || 'My Profile'}</Typography>
                        {avatarComponent}
                        <TextField {...defaultFieldProps} label='Name' value={firstName} helperText='Please use your given name' onChange={updateFirstname} />
                        <TextField {...defaultFieldProps} label='Surname' value={lastName} helperText='Please use your given name' onChange={updateLastname} />
                        <TextField {...defaultFieldProps} label='Email' value={email} helperText='Please use your work email address, unless you are an outside provider' onChange={updateEmail} />
                    </form>

                    <div className={classes.avatarContainer} style={{ justifyContent: 'flex-end', marginTop: '5px' }}>
                        <Button onClick={back}><CloseIcon />&nbsp;BACK</Button>
                        <Button color='primary' onClick={doSave}><SaveIcon />&nbsp;SAVE</Button>
                    </div>
                </Paper>
            </Grid>)
    }

    renderModal(){
        //
    }

    render() {
        const { classes, profile } = this.props;
        return (
            <Grid container spacing={16} className={classes.mainContainer}>
                {this.renderGeneral()}
                {this.renderMemberships()}
                {this.renderPeers()}                
            </Grid>
        );
    }

    windowResize() {
        this.forceUpdate();
    }

    constructor(props, context) {
        super(props, context);
        this.onAvatarMouseOver = this.onAvatarMouseOver.bind(this);
        this.onAvatarMouseOut = this.onAvatarMouseOut.bind(this);
        this.windowResize = this.windowResize.bind(this);
        this.renderGeneral = this.renderGeneral.bind(this);
        this.renderPeers = this.renderPeers.bind(this);
        this.renderUser = this.renderUser.bind(this);
        this.renderMemberships = this.renderMemberships.bind(this);
        this.inviteUserByEmail = this.inviteUserByEmail.bind(this);
        this.renderModal = this.renderModal.bind(this)
        this.state = {
            avatarMouseOver: false,
            profile: { ...props.profile },
            avatarUpdated: false,
            showPeerSelection: false,
        };
        this.componentDefs = props.api.getComponents(['core.BasicModal'])
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
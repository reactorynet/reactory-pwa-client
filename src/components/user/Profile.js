import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment'
import { withRouter } from 'react-router';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { compose } from 'redux';
import MaterialTable, { MTableToolbar } from 'material-table';
import om from 'object-mapper';
import uuid from 'uuid';
import { isNil, isArray, isString } from 'lodash';
import classNames from 'classnames';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { 
    CircularProgress , List, ListItem, 
    ListItemSecondaryAction, ListItemText, 
    InputAdornment, Icon, IconButton,
    ExpansionPanel, ExpansionPanelActions,
    ExpansionPanelDetails, ExpansionPanelSummary,    
    Toolbar,
} from '@material-ui/core';

import Button from '@material-ui/core/Button';
import CloseIcon from '@material-ui/icons/Close';
import SaveIcon from '@material-ui/icons/Save';
import PhotoCamera from '@material-ui/icons/PhotoCamera';
import Avatar from '@material-ui/core/Avatar';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';

import Tooltip from '@material-ui/core/Tooltip';

import { withApi, ReactoryApi } from '../../api/ApiProvider';
import DefaultAvatar from '../../assets/images/profile/default.png';
import { CDNProfileResource, getAvatar, isEmail } from '../util';
import { UserListWithSearchComponent } from './Widgets'
import gql from 'graphql-tag';
import { isNullOrUndefined } from 'util';
import FullScreenDialog from '../shared/FullScreenDialog';

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

const userPeersQueryFragment = ` 
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
        email
        avatar
    }
    isInternal
    inviteSent
    confirmed
    confirmedAt
    relationship                        
}
allowEdit
confirmedAt
createdAt
updatedAt
`;

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
        confirmed: {            
            color: '#02603B'
        },
        notConfirmed: {
            color: theme.palette.primary.dark
        },
        textField: {
            width: '98%'
        },
        confirmedLabel: {
            margin: theme.spacing.unit,
            marginLeft: theme.spacing.unit * 2
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
            padding: theme.spacing.unit,
        },
        hiddenInput: {
            display: 'none'
        },
        peerToolHeader: {
            ...theme.mixins.gutters(),
            paddingTop: theme.spacing.unit * 2,
            paddingBottom: theme.spacing.unit * 2,
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
        onSave: PropTypes.func,
        withPeers: PropTypes.bool,
        withAvatar: PropTypes.bool,
        withMembership: PropTypes.bool,
        withBackButton: PropTypes.bool,
        firstNameHelperText: PropTypes.string,
        surnameHelperText: PropTypes.string,
        emailHelperText: PropTypes.string,
        headerComponents: PropTypes.func,
        footerComponents: PropTypes.func,
    };

    static defaultProps = {
        profile: defaultProfile,
        loading: false,
        profileTitle: 'My Profile',
        mode: 'user',
        highlight: 'none',
        isNew: false,
        onCancel: nilf,
        onSave: nilf,
        withPeers: true,
        withAvatar: true,
        withMembership: true,
        withBackButton: true,
        firstNameHelperText: null,
        surnameHelperText: null,
        emailHelperText: null,
        headerComponents: (props) => {

        },
        footerComponents: (props) => {

        },
    };

    onAvatarMouseOver() {
        this.setState({ avatarMouseHover: true });
    }

    onAvatarMouseOut() {
        this.setState({ avatarMouseHover: false });
    }

    refreshPeers(){
        const { selectedMembership, profile } = this.state;
        const { api } = this.props;
        const self = this;

        const query = gql`query UserPeers($id: String! $organizationId: String){
            userPeers(id: $id, organizationId: $organizationId){
                ${userPeersQueryFragment}
            }
        }`;

        const variables = {
            id: profile.id,
            organizationId: selectedMembership.organization.id
        }

        api.graphqlQuery(query, variables).then((result) => {
            //console.log('Result for query', result);
            if(result && result.data && result.data.userPeers)
                self.setState({ profile: {...profile, peers: { ...result.data.userPeers } }, loadingPeers: false })
            else {
                self.setState({ 
                    profile: 
                    {
                        ...profile, 
                        peers: {
                            user: profile.id, 
                            organization: selectedMembership.organization.id,
                            allowEdit: true, 
                            confirmedAt: null,
                            confirmed: false,
                            inviteSent: false, 
                            peers: [],
                        } 
                    }, 
                    loadingPeers: false 
                });
            } 
        }).catch((queryError) => {
            console.error('Error querying user peers', queryError)
            self.setState({ showError: true, message: 'Could not load the user peers due to an error', loadingPeers: false })            
        });
    }

    onMembershipSelectionChanged(membership){        
        this.setState({ selectedMembership: membership, loadingPeers: true }, () => {
            this.refreshPeers()
        });
    }

    renderUser() {
        const { UserListItem } = this.componentDefs;
        return <UserListItem user={this.state.profile} />
    }
    
    inviteUserByEmail() {
        //console.log('Inviting user', this.state.inviteEmail);
        const { api } = this.props;
        const { profile } = this.state;
        const self = this
        const doQuery = () => {
            const options = {
                searchString: this.state.inviteEmail,
                sort: this.state.userSort || 'email'
            };

            api.graphqlQuery(api.queries.Users.searchUser, options).then((userResult) => {
                //console.log('Search Result', userResult);
                self.setState({ findPeersResult: userResult, searching: false, showResult: true })
            }).catch((searchError) => {
                //console.log('Search Error', searchError);
                self.setState({ searching: false, findPeersResult: [] })
            });
        }

        self.setState({ searching: true, findPeersResult: [] }, doQuery)
    }

    renderMemberships() {
        const { memberships } = this.state.profile
        const { withMembership, classes } = this.props;
        
        if(withMembership === false) return null;

        const data = [];
        const self = this
        if (memberships && memberships.length) {
            memberships.map(m => data.push({ ...m }))
        }
        const membershipList = (
            <Grid item sm={12} xs={12} offset={4}>
                <Paper className={classes.general}>
                    <Typography variant="h6">Organization Membership(s)</Typography>
                    <Typography variant="body2">
                        If you are registered to participate in other organizations, your memberships will appear here. <br /> 
                        Selecting a membership will load your peer nominations, for that organization or business unit. <br />
                        Most users will only have one membership. <br />These memberships are managed by the administrators of the system.
                    </Typography>
                    <List>
                        {data.map( membership => (
                            membership.organization && 
                            <ListItem>
                                <Avatar>{membership.organization.name.substring(0,2)}</Avatar>
                                <ListItemText secondary={`${membership.client.name}`} primary={!isNil(membership.organization) ? membership.organization.name : 'No organization'}></ListItemText>
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => {self.onMembershipSelectionChanged(membership)}}><Icon>more</Icon></IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>))}
                    </List>
                </Paper>
            </Grid>            
        );

        return membershipList;
       
        /*
        const membersGrid = (
            <Grid item sm={12} xs={12} offset={4}>
                <MaterialTable
                    columns={[
                        {
                            title: 'Client', render: (rowData) => {
                                return rowData && rowData.client ? rowData.client.name : 'No Client'
                            }
                        },
                        {
                            title: 'Organisation', render: (rowData) => {
                                return rowData && rowData.organization ? rowData.organization.name : 'No Organisation'
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
                            disabled: rowData.organization === null,
                            onClick: (event, rowData) => {
                                self.onMembershipSelectionChanged(rowData)
                            },

                        })
                    ]}
                     />
            </Grid>

        )
        */
        
    }

    renderPeers() {
        const { classes, history, api, withPeers } = this.props;
        if (withPeers === false) return null

        const { 
            profile, 
            selectedMembership, 
            loadingPeers, 
            highlight,             
            showConfirmPeersDialog,
            showAddUserDialog
         } = this.state
        const { peers, __isnew } = profile;
        const { 
            BasicModal, 
            Loading, 
            CreateProfile, 
            FullScreenModal,
            UserListItem, 
        } = this.componentDefs        

        const that = this;
        let content = null

        if(loadingPeers === true) return (<Loading title="Looking for peers" />)
               
        //data field for table
        const data = [];
        
        if (peers && peers.peers) {
            peers.peers.map((entry, index) => {
                data.push({
                    ...entry.user,
                    fullName: `${entry.user.firstName} ${entry.user.lastName}`,
                    email: entry.user.email,
                    relationship: entry.relationship,
                    confirmed: entry.confirmed,
                    confirmedAt: entry.confirmedAt,
                    inviteSent: entry.inviteSent
                });
            });
        }

        
        if (__isnew) return null
        

        const setInviteEmail = evt => { 
            this.setState({ inviteEmail: evt.target.value }) 
        };

        const setPeerRelationShip = (peer, relationship, cb = nilf) => {
            const mutation = gql(`mutation SetPeerRelationShip($id: String!, $peer: String!, $organization: String!, $relationship: PeerType){
                setPeerRelationShip(id: $id, peer: $peer, organization: $organization, relationship: $relationship){
                    ${userPeersQueryFragment}
                }
            }`);

            const variables = { 
                id: this.state.profile.id,
                peer: peer.id, 
                organization: this.state.selectedMembership.organization.id,
                relationship 
            };

            api.graphqlMutation(mutation, variables).then((peerResult) => {
                //console.log('Set the user peer relationship', peerResult)
                if(cb && peerResult.setPeerRelationShip) {                    
                    cb(peerResult.setPeerRelationShip)
                } else {
                    that.refreshPeers()
                } 
            }).catch((peerSetError) => {
                console.error('Error setting peer relationship', peerSetError)
                that.refreshPeers()
            })  
        };
 

        const removePeer = (peer) => {

            const mutation = gql(`mutation RemovePeer($id: String!, $peer: String!, $organization: String!){
                removePeer(id: $id, peer: $peer, organization: $organization){
                    ${userPeersQueryFragment}
                }
            }`);

            const variables = { 
                id: that.state.profile.id,
                peer: peer.id, 
                organization: that.state.selectedMembership.organization.id,
            };

            api.graphqlMutation(mutation, variables).then((peerResult) => {
                //console.log('removed user peer relationship', peerResult)
                //if(cb) cb(peerResult)
                that.refreshPeers()
            }).catch((peerSetError) => {
                console.error('Error removing peer from member', peerSetError)
                that.refreshPeers()
            })  
        }        

        const confirmPeers = (confirmed) => {
            ////console.log('Confirming peers for user', this.props, this.state)
            if(confirmed === true) {
                const mutation = gql`mutation ConfirmPeers($id: String!, $organization: String!){
                    confirmPeers(id: $id, organization: $organization){
                        ${userPeersQueryFragment}
                    }
                }`;
        
                const variables = {
                    id: profile.id,
                    organization: selectedMembership.organization.id
                };
        
                api.graphqlMutation(mutation, variables).then( result => {
                    if(result && result.data && result.data.confirmPeers) {
                        that.setState({ showConfirmPeersDialog: false, profile: { ...profile, peers: {...profile.peers, ...result.data.confirmPeers } }}, that.refreshPeers)
                        history.push('/');
                    }
                }).catch( ex => {
                    //console.error( 'Error confirming peers ', ex)
                    that.setState({ showConfirmPeersDialog: false, showMessage: true, message: 'An error occured confirming peer settings' })
                });
            } else {
              that.setState({ showConfirmPeersDialog: true })  
            }
            
        };

        const setUserPeerSelection = (selection) => {
            //console.log('Set the user peer selection', selection);                        
            setPeerRelationShip(selection, 'peer', (result) => {
                // that.setState({ profile: { ...profile, peers: { ...result }  } })
                that.refreshPeers()
            });
        };

        const acceptUserSelection = () => {
            that.setState({ showPeerSelection: false });
        }

        const editUserSelection = () => {
            that.setState({ showAddUserDialog: true });
        }

        const membershipSelected = selectedMembership && 
        selectedMembership.organization && 
        selectedMembership.organization.id;                         

        const closeSelection = () => {
            that.setState({ showPeerSelection: false });
        }

        const onNewPeerClicked = (e) => {
            that.setState({ showAddUserDialog: true });
        };

        let excludedUsers = [profile.id]
        
        if(peers && peers.peers ) peers.peers.forEach( p => (excludedUsers.push(p.user.id)))
        let confirmPeersDialog = null
        if(showConfirmPeersDialog === true) {
            const closeConfirmDialog = () => {
                that.setState({ showConfirmPeersDialog: false });
            }

            const doConfirm = () => {
                confirmPeers(true);
            }

            confirmPeersDialog = (
            <BasicModal open={true}>
                <Typography variant="caption">Thank you for confirming.</Typography>
                <Button color="primary" onClick={doConfirm}>Ok</Button>
            </BasicModal>)
        }

        let addUserDialog = null;
        const closeAddUserDialog = () => {
            that.setState({ showAddUserDialog: false });
        };

        const doConfirm = () => {
            that.setState({ showAddUserDialog: false });
        };

        const onUserCreated = (user) => {
            //console.log("User created", user);
            closeAddUserDialog();
            setUserPeerSelection(user);
        };

        let materialTable = null;        
        if(isNil(membershipSelected) === false) {
            materialTable = (<MaterialTable
                options={{pageSize: 10}}
                components={{
                    Toolbar: props => {
                        return (
                            <div>
                                <MTableToolbar {...props}/>
                                <hr/>
                                <Typography className={peers.confirmedAt ? 
                                    classNames([classes.confirmedLabel, classes.notConfirmed]) : 
                                    classNames([classes.confirmedLabel, classes.confirmed]) } 
                                    variant={"body1"}>{moment(peers.confirmedAt).isValid() === true ? `Last Confirmed: ${moment(peers.confirmedAt).format('YYYY-MM-DD')} (Year Month Day)` : 'Once completed, please confirm your peers' }</Typography>
                            </div>
                        )
                    } 
                }}
                columns={[
                    { title: 'Delegate', field: 'fullName' },
                    { title: 'Email', field: 'email' },
                    {
                        title: 'Relationship',
                        field: 'relationship',
                        render: (rowData) => { 
                            switch(rowData.relationship.toLowerCase()) {
                                case 'manager': {
                                    return 'LEADER'
                                }
                                default: {
                                    return rowData.relationship.toUpperCase()
                                }
                            }                            
                        }
                    },
                ]}
                data={data}
                title={`User Peers in Organisation ${selectedMembership.organization.name}`}
                actions={[
                    rowData => ({
                        icon: 'supervisor_account',
                        tooltip: 'Set user as leader',
                        disabled: rowData.relationship === 'manager',
                        onClick: (event, rowData) => {
                            ////console.log('Making User Supervisor', { event, rowData });
                            setPeerRelationShip(rowData, 'manager')
                        },
                    }),
                    rowData => ({
                        icon: 'account_box',
                        tooltip: 'Set user as peer',
                        disabled: rowData.relationship === 'peer',
                        onClick: (event, rowData) => {
                            ////console.log('Setting User Peer', { event, rowData });
                            setPeerRelationShip(rowData, 'peer')
                        },
                    }),
                    rowData => ({
                        icon: 'account_circle',
                        tooltip: 'Set user as direct report',
                        disabled: rowData.relationship === 'report',
                        onClick: (event, rowData) => {
                            ////console.log('Making User Supervisor', { event, rowData });
                            setPeerRelationShip(rowData, 'report')
                        },
                    }),
                    rowData => ({
                        icon: 'delete_outline',
                        tooltip: 'Delete user from peers',
                        disabled: false,
                        onClick: (event, rowData) => {
                            removePeer(rowData);
                        },
                    }),
                    {
                        icon: 'check_circle',
                        tooltip: data.length < 5 ? 'Remember to nominate a total of at least 5 people' : (peers.confirmedAt ? `Peers last confirmed at ${moment(peers.confirmedAt).format('YYYY-MM-DD')}` : 'Confirm peer selection'),
                        disabled: data.length < 5,
                        isFreeAction: true,
                        onClick: (event, rowData) => {
                            // //console.log('Confirm peers', { event, rowData });
                            confirmPeers(false);
                        },
                    },
                    {
                        icon: 'edit',
                        tooltip: 'Edit Selection',
                        disabled: false,
                        isFreeAction: true,
                        onClick: (event, rowData) => {
                            // //console.log('Edit peer selection', { event, rowData });
                            editUserSelection();
                        },
                    }
                ]}
            />);

            

            materialTable = (
                <Paper className={classes.general}>
                    <Typography variant="h6">Nominees for {this.state.selectedMembership.organization.name}</Typography>
                    <Toolbar>
                        <IconButton onClick={editUserSelection}><Icon>edit</Icon></IconButton>
                        <IconButton disabled={data.length < 5} onClick={e => confirmPeers(false) }><Icon>check_circle</Icon></IconButton>
                    </Toolbar>
                    <Paper className={classes.peerToolHeader} elevation={2}>
                    <Typography variant="body1">
                        Use the list below to manage your nominees.  Click on the <Icon>edit</Icon> above to add a new colleague to your list.
                    </Typography>
                    <Typography variant="body1">
                        If you need to edit the details of an existing colleague you nominated previously, click on their name or the <Icon>expand</Icon> icon. This will enable you to change
                        the relationship type (LEADER, PEER, DIRECT REPORT) or remove the peer by clicking the <Icon>delete_outline</Icon> button.<br/>
                        Once you have selected seven colleagues (a minimum of five if you don't have seven),  please click the <Icon>check_circle</Icon> button to confirm your peer selection.<br />
                        Your nominees will only be notified of their nomination a maximum of once every 30 days.
                    </Typography>
                    <hr/>
                    <Typography className={peers.confirmedAt ? 
                        classNames([classes.confirmedLabel, classes.notConfirmed]) : 
                        classNames([classes.confirmedLabel, classes.confirmed]) } 
                        variant={"body1"}>
                        {moment(peers.confirmedAt).isValid() === true ? `Last Confirmed: ${moment(peers.confirmedAt).format('YYYY-MM-DD')} (Year Month Day)` : 'Once completed, please confirm your peers' }
                    </Typography>
                    </Paper>
                    <div>
                        {
                            data.map(usr => {
                                // console.log('Binding peer user', usr);
                                const makeSupervisor = e => setPeerRelationShip(usr, 'manager');
                                const makePeer = e => setPeerRelationShip(usr, 'peer');
                                const makeDirectReport = e => setPeerRelationShip(usr, 'report');
                                const deletePeer = e => removePeer(usr);

                                const handleChange = event => {
                                    if(this.state.expanded === usr.id) {
                                        this.setState({
                                            expanded: null,
                                        });
                                    }
                                    else 
                                    {
                                        this.setState({
                                            expanded: usr.id,
                                        });
                                    }                                    
                                };

                                const selectorWidget = (
                                    <Fragment>                                        
                                        <List dense fullWidth={true}>
                                            <ListItem>
                                                <Avatar><Icon>mail</Icon></Avatar>
                                                <ListItemText primary={usr.inviteSent ===  true ? 'Confirmation sent' : 'Confirmation not sent'} secondary={usr.inviteSent ===  true ? moment(usr.confirmedAt).format('YYYY-MM-DD') : 'Wil be confirmed with next confirmation'}/>
                                            </ListItem>

                                            <ListItem selected={usr.relationship === 'manager'} onClick={ usr.relationship !== 'manager' ? makeSupervisor : nilf}>
                                                <Avatar><Icon>supervisor_account</Icon></Avatar>
                                                <ListItemText primary={usr.relationship !== 'manager' ? 'Select As Leader' : `${usr.firstName} ${usr.lastName} is flagged as a leader`} />                                                                                                
                                            </ListItem>

                                            <ListItem selected={usr.relationship === 'peer'} onClick={ usr.relationship !== 'peer' ? makePeer : nilf}>
                                                <Avatar><Icon>account_box</Icon></Avatar>
                                                <ListItemText primary={usr.relationship !== 'peer' ? 'Select As Peer' : `${usr.firstName} ${usr.lastName} is flagged as a peer`} />
                                            </ListItem>
                                            
                                            <ListItem selected={usr.relationship === 'report'} onClick={ usr.relationship !== 'report' ? makeDirectReport : nilf}>
                                                <Avatar><Icon>account_circle</Icon></Avatar>
                                                <ListItemText primary={usr.relationship !== 'report' ? 'Select As Report' : `${usr.firstName} ${usr.lastName} is flagged as a report`} />                                                
                                            </ListItem>

                                            <ListItem onClick={deletePeer}>
                                                <Avatar><Icon>delete_outline</Icon></Avatar>
                                                <ListItemText primary={`Remove ${usr.firstName} ${usr.lastName} as nominee`} />
                                            </ListItem>                                                                                 
                                        </List>                                        
                                    </Fragment>
                                );

                                let relationshipBadge = null;
                                switch(usr.relationship.toLowerCase()) {
                                    case 'manager': {
                                        relationshipBadge = "LEADER";
                                        break;
                                    }
                                    default: {
                                        relationshipBadge = usr.relationship.toUpperCase();
                                        break;
                                    }
                                }                            
                        
                                return (<ExpansionPanel
                                        key={usr.id}
                                        square
                                        expanded={this.state.expanded === usr.id}
                                        onChange={handleChange}>
                                        <ExpansionPanelSummary expandIcon={<Icon>expand</Icon>}>
                                            <UserListItem user={usr} message={`${usr.firstName} (${usr.email}) is set as a ${relationshipBadge}`} />
                                        </ExpansionPanelSummary>
                                        <ExpansionPanelDetails>                                            
                                            {selectorWidget}
                                        </ExpansionPanelDetails>
                                        </ExpansionPanel>)
                            })
                        }
                    </div>
                </Paper>
            )
        }

        if(isNil(membershipSelected) === false) {
            addUserDialog = (
                <FullScreenModal open={showAddUserDialog === true} title="Add / Find a new peer" onClose={closeAddUserDialog}>
                    <Typography variant="h3" style={{margin: "25px auto"}}>Add / Find a new peer</Typography>
                    <CreateProfile 
                        onUserCreated={onUserCreated} profileTitle="Invite new peer / colleague"                        
                        formProps={{ withBackButton: false, withAvatar: false, withPeers: false, withMembership: false, mode: 'peer'  }}
                        firstNameHelperText="Firstname for your colleague / peer"
                        surnameHelperText="Surname for your colleague / peer"
                        emailHelperText="Email for your colleague / peer"
                        organizationId={ selectedMembership.organization.id } />
                </FullScreenModal>
            );
        }

        /**
            membershipSelected && this.state.showPeerSelection &&                        
            <UserListWithSearchComponent 
                onUserSelect={setUserPeerSelection}
                onAcceptSelection={acceptUserSelection}
                organizationId={this.state.selectedMembership.organization.id}
                onNewUserClick={onNewPeerClicked}                                
                multiSelect={false}
                selected={excludedUsers}
                excluded={excludedUsers} />                        
         */
        
        const peersComponent = (
            <Fragment>                
                <Grid item sm={12} xs={12} offset={4}>
                    { confirmPeersDialog }
                    { addUserDialog }                                   
                    {
                        !membershipSelected && 
                        <Paper className={this.props.classes.general}><Typography variant="body2">Select a membership with an organization organization to load peers</Typography></Paper> 
                    }
                    {
                        membershipSelected &&
                        !this.state.showPeerSelection && materialTable                        
                    }                    
                </Grid>

            </Fragment>
        )

        if(highlight === "peers"){
            const closePeersHighlight = () => {
                this.setState({ highlight: null });
            }
                        
            return (<FullScreenDialog title="Select your peers" open={true} onClose={closePeersHighlight}>
                        <Paper style={{margin:'16px', padding: '8px'}}>
                            <Typography variant="h5" color="primary">
                                Colleagues / Peer management
                            </Typography>                            
                            {peersComponent}
                        </Paper>                                            
            </FullScreenDialog>)
        } else {
            return peersComponent;
        }        
    }


    renderGeneral() {
        const that = this
        const { profile, avatarUpdated, emailValid } = this.state;
        const { firstName, lastName, businessUnit, email, avatar, peers, surveys, teams, __isnew, id, deleted } = profile;
        const { mode, classes, history, profileTitle } = this.props;
        const defaultFieldProps = {
            margin: "normal",
            fullWidth: true,
            InputLabelProps: {
                shrink: true
            },
            className: classes.textFieldBase
        };

        const saveDisabled =  (emailValid === false || 
        ( (firstName) || isNil(lastName) ) === true ||
        ( (firstName.length < 2 || lastName.length < 2 ) ));

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
            that.setState({ profile: { ...that.state.profile, email: evt.target.value }, emailValid: isEmail(evt.target.value) })
        };

        const updateBusinessUnit = (evt) => {
            that.setState({ profile: { ...that.state.profile, businessUnit: evt.target.value } })
        };

        const onSurnameKeyPress = (evt) => {
            if(evt.charCode === 13 && saveDisabled === false) {
                doSave();
            }
        }

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
                        <Typography variant='h6'>{profileTitle || 'My Profile'}</Typography>
                        { this.props.withAvatar === true ? avatarComponent : null }
                        <TextField {...defaultFieldProps} label={emailValid === true ? 'Email' : 'Email!'} value={email} helperText={this.props.emailHelperText || 'Please use your work email address, unless you are an outside provider'} onChange={updateEmail} />
                        <TextField {...defaultFieldProps} label='Name' value={firstName} helperText={this.props.firstNameHelperText || 'Please use your first name'} onChange={updateFirstname} />
                        <TextField {...defaultFieldProps} label='Surname' value={lastName} helperText={this.props.surnameHelperText || 'Please use your last name'} onChange={updateLastname} onKeyPressCapture={onSurnameKeyPress}/>                        
                    </form>

                    <div className={classes.avatarContainer} style={{ justifyContent: 'flex-end', marginTop: '5px' }}>
                        {this.props.withBackButton && <Button onClick={back}><CloseIcon />&nbsp;BACK</Button> }
                        {deleted === true ? null : <Button color='primary' onClick={doSave} disabled={ saveDisabled }><SaveIcon />&nbsp;SAVE</Button>}                        
                    </div>
                </Paper>
            </Grid>)
    }
     
    renderHeader(){
        const { profile, showConfirmDeleteUser = false } = this.state;
        const { api } = this.props;
        const { BasicModal } = this.componentDefs;
        const that = this;

        if(this.props.mode !== 'admin') return null;

        const onDeleteClick = e => {
            that.setState({ showConfirmDeleteUser: true })
        };

        let confirmDeleteModal = null;

        if(showConfirmDeleteUser === true) {

            const cancelProfileDelete = e => {
                that.setState({ showConfirmDeleteUser: false, userDeleteMessage: null, userDeleted: false, });
            };

            const deleteUserProfile = e => {
                const mutation = gql` mutation DeleteUserMutation($id: String!){
                    deleteUser(id: $id)
                }`;

                api.graphqlMutation(mutation, { id: profile.id }).then( result => {
                    if(result.errors) {
                        that.setState({ userDeleteMessage: "Could not delete the user at this time, please try again later or contact administrator if the problem persists" })
                    } else {
                        that.setState({ showConfirmDeleteUser: false, userDeleted: true, profile: { ...profile, deleted: true } });
                    }
                }).catch(error => {
                    that.setState({ userDeleteMessage: "Could not delete the user due to an unknown error, please contact the administrator if this problem persists" })
                });
            };

            confirmDeleteModal = (
                <BasicModal open={true}>
                    <Typography>Are you sure you want to delete the account for {profile.firstName} {profile.lastName}</Typography>
                    <Button type="button" variant="link" onClick={ cancelProfileDelete }>No, I changed my mind</Button>
                    <Button type="button" variant="raised" onClick={ deleteUserProfile }>Yes, delete user account</Button>
                </BasicModal>
            );

            if(this.state.userDeleteMessage) {
                confirmDeleteModal = (
                    <BasicModal open={true}>
                        <Typography>{this.state.userDeleteMessage}</Typography>
                        <Button type="button" variant="link" onClick={ cancelProfileDelete }>Ok</Button>
                    </BasicModal>
                );  
            }
        }

        return (
            <Fragment>
                <Toolbar>
                    <Typography variant="caption">Admin: {profile.firstName} {profile.lastName} { profile.deleted === true ? "[ User Deleted ]" : "" }</Typography>                    
                    {profile.deleted === true  ? null : <Tooltip title="Click here to delete the user">
                        <IconButton onClick={onDeleteClick}>
                            <Icon>delete_outline</Icon>
                        </IconButton>
                    </Tooltip>}
                </Toolbar>
                {confirmDeleteModal}
            </Fragment>
        )
    }

    renderFooter(){

    }

    render() {
        const { classes } = this.props;
        return (
            <Grid container spacing={16} className={classes.mainContainer}>
                {this.renderHeader()}
                {this.renderGeneral()}
                {this.renderMemberships()}
                {this.renderPeers()}
                {this.renderFooter()}                
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
        this.onMembershipSelectionChanged = this.onMembershipSelectionChanged.bind(this);
        this.windowResize = this.windowResize.bind(this);
        this.renderGeneral = this.renderGeneral.bind(this);
        this.renderPeers = this.renderPeers.bind(this);
        this.renderUser = this.renderUser.bind(this);
        this.refreshPeers = this.refreshPeers.bind(this);
        this.renderHeader = this.renderHeader.bind(this);
        this.renderFooter = this.renderFooter.bind(this);
        this.renderMemberships = this.renderMemberships.bind(this);
        this.inviteUserByEmail = this.inviteUserByEmail.bind(this);

        this.state = {
            avatarMouseOver: false,
            profile: { ...props.profile },
            avatarUpdated: false,
            showPeerSelection: false,
            selectedMembership: null,
            emailValid: false,
            help: props.api.queryObject.help === "true",
            helpTopic: props.api.queryObject.helptopics,
            highlight: props.api.queryObject.peerconfig === "true" ? "peers" : null
        };
                
        const components = [
            'core.BasicModal', 
            'core.Loading',
            'core.FullScreenModal',
            'core.CreateProfile',
            'core.UserListItem'
        ];
                
        this.componentDefs = props.api.getComponents(components);
        window.addEventListener('resize', this.windowResize);
    }

    componentDidMount(){
        if(this.state.profile.memberships && this.state.profile.memberships.length > 0) {
            let membershipWithOrganization = null;
            this.state.profile.memberships.forEach( membership => {
                if(membership.organization !== null && membershipWithOrganization === null) {
                    if(membership.organization.name){
                        membershipWithOrganization = membership;
                    }
                }                
            });

            if(membershipWithOrganization !== null) this.onMembershipSelectionChanged(membershipWithOrganization);
        }
    }
}

const ProfileViewComponent = compose(
    withRouter,
    withApi,
    withStyles(Profile.styles),
    withTheme()
)(Profile);
export default ProfileViewComponent;
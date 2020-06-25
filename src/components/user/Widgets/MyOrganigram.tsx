import React, { Component, Fragment } from "react";
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
    Container,
    CircularProgress , 
    List, 
    ListItem, 
    ListItemText,
    ListItemSecondaryAction, 
    Paper,
    Icon,
    IconButton,
    InputAdornment,    
    ExpansionPanel, 
    ExpansionPanelActions,
    ExpansionPanelDetails, 
    ExpansionPanelSummary,    
    Toolbar, 
    Tooltip, 
    Theme
} from '@material-ui/core';

import Button from '@material-ui/core/Button';
import CloseIcon from '@material-ui/icons/Close';
import SaveIcon from '@material-ui/icons/Save';
import PhotoCamera from '@material-ui/icons/PhotoCamera';
import Avatar from '@material-ui/core/Avatar';
import TextField from '@material-ui/core/TextField';

import { withApi } from '../../../api/ApiProvider';

import gql from 'graphql-tag';
import { isNullOrUndefined } from 'util';
import FullScreenDialog from '../../shared/FullScreenDialog';


const nilf = ( p1 ) => ({});

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


class MyOrganigram extends Component<any, any> {

  static styles = (theme: Theme) => ({
    mainContainer: {
        width: '100%',
        maxWidth: '1024px',
        marginLeft: 'auto',
        marginRight: 'auto',
    },
    margin: {
        margin: theme.spacing(1),
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
        margin: theme.spacing(1),
        marginLeft: theme.spacing(2)
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
        padding: theme.spacing(1),
    },
    hiddenInput: {
        display: 'none'
    },
    peerToolHeader: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
    }
  });

  componentDefs: any;
  refereshPeers: Function

  constructor(props, context){
    super(props, context)

    this.componentDefs = props.api.getComponents([ 'core.BasicModal', 
    'core.Loading',
    'core.FullScreenModal',
    'core.CreateProfile',
    'core.UserListItem',
    'core.Cropper']);

    this.refereshPeers = this.refereshPeers.bind(this);
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


  render() {
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
  
    const setPeerRelationShip = (peer, relationship, cb: Function = nilf) => {
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
            const mutation = gql`mutation ConfirmPeers($id: String!, $organization: String!, $surveyId: String){
                confirmPeers(id: $id, organization: $organization, surveyId: $surveyId){
                    ${userPeersQueryFragment}
                }
            }`;
    
            const variables = {
                id: profile.id,
                organization: selectedMembership.organization.id,
                surveyId: api.queryObject.survey
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
                (rowData: any) => ({
                    icon: 'supervisor_account',
                    tooltip: 'Set user as leader',
                    disabled: rowData.relationship === 'manager',
                    onClick: (event, rowData) => {
                        ////console.log('Making User Supervisor', { event, rowData });
                        setPeerRelationShip(rowData, 'manager')
                    },
                }),
                (rowData: any) => ({
                    icon: 'account_box',
                    tooltip: 'Set user as peer',
                    disabled: rowData.relationship === 'peer',
                    onClick: (event, rowData) => {
                        ////console.log('Setting User Peer', { event, rowData });
                        setPeerRelationShip(rowData, 'peer')
                    },
                }),
                (rowData: any) => ({
                    icon: 'account_circle',
                    tooltip: 'Set user as direct report',
                    disabled: rowData.relationship === 'report',
                    onClick: (event, rowData) => {
                        ////console.log('Making User Supervisor', { event, rowData });
                        setPeerRelationShip(rowData, 'report')
                    },
                }),
                (rowData: any) => ({
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
                                <div style={{width:"100%"}}>                                        
                                    <List dense component="nav">
                                        <ListItem key={0}>
                                            <Avatar><Icon>mail</Icon></Avatar>
                                            <ListItemText primary={usr.inviteSent ===  true ? 'Confirmation sent' : 'Confirmation not sent'} secondary={usr.inviteSent ===  true ? moment(usr.confirmedAt).format('YYYY-MM-DD') : 'Wil be confirmed with next confirmation'}/>
                                        </ListItem>
  
                                        <ListItem key={1} selected={usr.relationship === 'manager'} onClick={ usr.relationship !== 'manager' ? makeSupervisor : nilf}>
                                            <Avatar><Icon>supervisor_account</Icon></Avatar>
                                            <ListItemText primary={usr.relationship !== 'manager' ? 'Select As Leader' : `${usr.firstName} ${usr.lastName} is flagged as a leader`} />                                                                                                
                                        </ListItem>
  
                                        <ListItem key={2} selected={usr.relationship === 'peer'} onClick={ usr.relationship !== 'peer' ? makePeer : nilf}>
                                            <Avatar><Icon>account_box</Icon></Avatar>
                                            <ListItemText primary={usr.relationship !== 'peer' ? 'Select As Peer' : `${usr.firstName} ${usr.lastName} is flagged as a peer`} />
                                        </ListItem>
                                        
                                        <ListItem key={3} selected={usr.relationship === 'report'} onClick={ usr.relationship !== 'report' ? makeDirectReport : nilf}>
                                            <Avatar><Icon>account_circle</Icon></Avatar>
                                            <ListItemText primary={usr.relationship !== 'report' ? 'Select As Report' : `${usr.firstName} ${usr.lastName} is flagged as a report`} />                                                
                                        </ListItem>
  
                                        <ListItem key={4} onClick={deletePeer}>
                                            <Avatar><Icon>delete_outline</Icon></Avatar>
                                            <ListItemText primary={`Remove ${usr.firstName} ${usr.lastName} as nominee`} />
                                        </ListItem>                                                                                 
                                    </List>                                        
                                </div>
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
            <Grid item sm={12} xs={12}>
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

}


const MyOrganigramComponent = compose(
  withRouter,
  withApi,
  withStyles(MyOrganigram.styles),
  withTheme
)(MyOrganigram);

export default MyOrganigramComponent;
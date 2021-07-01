import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment'
import { withRouter } from 'react-router';
import { withStyles, withTheme, Theme } from '@material-ui/core/styles';
import { compose } from 'redux';
import MaterialTable, { MTableToolbar } from 'material-table';
import lodash, { isNil, isArray, isString } from 'lodash';
import classNames from 'classnames';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import {
    Container,
    Badge,
    CircularProgress, List, ListItem,
    ListItemSecondaryAction, ListItemText,
    Paper,
    InputAdornment, Icon, IconButton,
    ExpansionPanel, ExpansionPanelActions,
    ExpansionPanelDetails, AccordionSummary,
    Toolbar, Tooltip, InputLabel, FormControl,
    ListItemAvatar, Table, TableBody, TableCell,
    TableHead, TableRow, FormControlLabel, Switch,
    Select
} from '@material-ui/core';

import Button from '@material-ui/core/Button';
import Avatar from '@material-ui/core/Avatar';
import TextField from '@material-ui/core/TextField';
import { withApi } from '../../api/ApiProvider';
import ReactoryApi from "../../api/ReactoryApi";
import { CDNProfileResource, getAvatar, isEmail } from '../util';
import gql from 'graphql-tag';
import Reactory from 'types/reactory';
import AlertDialog from 'components/shared/AlertDialog';

const defaultProfile = {
    __isnew: true,
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    businessUnit: '',
    peers: {
        organization: null,
        user: null,
        peers: []
    },
    memberships: [],
    avatar: null,
};

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

const nilf = () => { };

const ProfileStyles = (theme: Theme) => ({
    mainContainer: {
        width: '100%',
        maxWidth: '1024px',
        marginLeft: 'auto',
        marginRight: 'auto',
    },
    margin: {
        margin: `${theme.spacing(1)}px`,
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
        margin: `${theme.spacing(1)}px`,
        marginLeft: `${theme.spacing(2)}px`,
    },
    avatarContainer: {
        width: '100%',
        display: 'flex',
        justifyContent: 'left',
        alignItems: 'center'
    },
    saveContainer: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: `${theme.spacing(3)}px`,
        marginBottom: `${theme.spacing(2)}px`,
    },
    nomineesContainerButton: {
        display: 'flex',
        justifyContent: 'center',
        paddingTop: `${theme.spacing(1)}px`,
        paddingBottom: `${theme.spacing(1)}px`
    },
    nomineesContainerBtnLeft: {
        display: 'flex',
        justifyContent: 'left',
        paddingTop: `${theme.spacing(1)}px`,
        paddingBottom: `${theme.spacing(1)}px`
    },
    uploadButton: {
        marginLeft: "12px"
    },
    avatar: {
        margin: 10,
    },
    bigAvatar: {
        width: 80,
        height: 80,
    },
    general: {
        padding: `${theme.spacing(3)}px`,
    },
    hiddenInput: {
        display: 'none'
    },
    peerToolHeader: {
        ...theme.mixins.gutters(),
        paddingTop: `${theme.spacing(2)}px`,
        paddingBottom: `${theme.spacing(2)}px`,
    },
    profileTopMargin: {
        paddingTop: `${theme.spacing(4)}px`,
    },
    sectionHeaderText: {
        //textTransform: "uppercase",
        paddingTop: `${theme.spacing(3)}px`,
        paddingBottom: `${theme.spacing(2)}px`,
        paddingLeft: `${theme.spacing(1)}px`,
        paddingRight: `${theme.spacing(1)}px`,
        color: "#566779",
        fontWeight: 600,
    },
    activeOrganisation: {
        backgroundColor: theme.palette.primary.main,
    },
});

class Profile extends Component<any, any> {

    componentDefs: any = null;



    static propTypes = {
        profile: PropTypes.object.isRequired,
        profileTitle: PropTypes.string,
        reactory: PropTypes.instanceOf(ReactoryApi),
        loading: PropTypes.bool,
        organizationId: PropTypes.string,
        onPeersConfirmed: PropTypes.func,
        surveyId: PropTypes.string,
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
        refetch: PropTypes.func
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
    userProfileImageFile: any;

    onAvatarMouseOver() {
        this.setState({ avatarMouseHover: true });
    }

    onAvatarMouseOut() {
        this.setState({ avatarMouseHover: false });
    }

    activeOrganisation(index: number) {
        this.setState({ activeOrganisationIndex: index });
    }

    refreshPeers() {
        const { selectedMembership, profile } = this.state;
        const { reactory } = this.props;
        const that = this;

        const query = gql`query UserPeers($id: String! $organizationId: String) {
        userPeers(id: $id, organizationId: $organizationId){
            ${userPeersQueryFragment}
        }
    }`;

        const variables = {
            id: profile.id,
            organizationId: selectedMembership && selectedMembership.organization && selectedMembership.organization.id ? selectedMembership.organization.id : '*'
        }

        reactory.graphqlQuery(query, variables).then((result) => {
            //console.log('Result for query', result);
            if (result && result.data && result.data.userPeers)
                that.setState({ profile: { ...profile, peers: { ...result.data.userPeers } }, loadingPeers: false })
            else {
                that.setState({
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
            reactory.log('Error querying user peers', { queryError }, 'error')
            that.setState({ showError: true, message: 'Could not load the user peers due to an error', loadingPeers: false })
        });
    }

    onMembershipSelectionChanged(membership, index) {
        this.setState({ selectedMembership: membership, activeOrganisationIndex: index, loadingPeers: true }, () => {
            this.refreshPeers()
        });
    }

    renderUser() {
        const { UserListItem } = this.componentDefs;
        return <UserListItem user={this.state.profile} />
    }

    inviteUserByEmail() {
        //console.log('Inviting user', this.state.inviteEmail);
        const { reactory } = this.props;
        const { profile } = this.state;
        const that = this
        const doQuery = () => {
            const options = {
                searchString: this.state.inviteEmail,
                sort: this.state.userSort || 'email'
            };

            reactory.graphqlQuery(reactory.queries.Users.searchUser, options).then((userResult) => {
                //console.log('Search Result', userResult);
                that.setState({ findPeersResult: userResult, searching: false, showResult: true })
            }).catch((searchError) => {
                //console.log('Search Error', searchError);
                that.setState({ searching: false, findPeersResult: [] })
            });
        }

        that.setState({ searching: true, findPeersResult: [] }, doQuery)
    }

    renderMemberships() {
        const { memberships } = this.state.profile
        const { withMembership, classes, reactory } = this.props;
        const Content = reactory.getComponent('core.StaticContent');
        const { AlertDialog, ReactoryCreateUserMembership } = this.componentDefs;


        if (withMembership === false) return null;

        const data = [];
        const that = this

        if (memberships && memberships.length) {
            memberships.forEach(m => data.push({ ...m }))
        }

        const defaultMembershipContent = (
            <>
                <Typography variant="h6">Organisation Membership(s)</Typography>
                <Typography variant="body2">
                    If you are registered to participate in other organizations, all your memberships will appear here. <br />
                    Selecting a membership will load your organisation structure, for that organisation or particular business unit. <br />
                </Typography>
                <Typography>
                    * Most users will only have one membership. These memberships are managed by the administrators for your organisation.
                </Typography>
            </>
        )



        const can_edit_roles = reactory.hasRole(['ADMIN']) === true;

        const onAddNewMembership = () => {
            that.setState({ display_add_membership: true });
        };

        const onCloseAddMembership = () => {
            that.setState({ display_add_membership: false });
        }

        const membershipList = (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                <Paper className={classes.general}>
                    <Table className={classes.table} aria-label="simple table">
                        <caption>
                            <Content
                                slug={"core-user-profile-memebership-intro"}
                                editRoles={["DEVELOPER", "ADMIN"]}
                                defaultValue={defaultMembershipContent}
                            ></Content>
                        </caption>
                        <TableHead>
                            <TableRow>
                                <TableCell>Organisation</TableCell>
                                <TableCell>{can_edit_roles === true && <Button color="primary" onClick={onAddNewMembership}>ADD MEMBERSHIP</Button>}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map((membership: Reactory.IMembership, index) => {

                                return (
                                    <TableRow
                                        key={index}
                                        className={this.state.activeOrganisationIndex === index ? classes.activeOrganisation : ""}>
                                        <TableCell>
                                            <ListItem>
                                                <ListItemAvatar>
                                                    <Avatar style={{ marginRight: `8px` }}>
                                                        {membership &&
                                                            membership.organization &&
                                                            membership.organization.name
                                                            ? membership.organization.name.substring(0, 2)
                                                            : membership.client.name.substring(0, 2)}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={`${membership && membership.organization ? membership.organization.name : `${membership.client.name} - APPLICATION MEMBERSHIP`}`}
                                                    secondary={`Roles: ${membership.roles.map((r: string) => `${r}`)}`.trim()}
                                                />
                                            </ListItem>
                                        </TableCell>
                                        <TableCell align="right">
                                            {can_edit_roles === true && that.state.selectedMembership && that.state.selectedMembership.id === membership.id && <IconButton onClick={() => {
                                                that.setState({ display_role_editor: true }, () => {
                                                    if (membership.id !== that.state.selectedMembership.id) {
                                                        that.onMembershipSelectionChanged(membership, index);
                                                    }
                                                })
                                            }}><Icon>edit</Icon></IconButton>}
                                            <IconButton
                                                onClick={() => {
                                                    that.onMembershipSelectionChanged(membership, index);
                                                }}>
                                                <Icon>chevron_right</Icon>
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                            }
                        </TableBody>
                    </Table>
                    {this.state.selectedMembership !== null && <AlertDialog
                        title={`Update membership for ${this.state.selectedMembership && this.state.selectedMembership.organization ? this.state.selectedMembership.organization.name : `${this.state.selectedMembership.client.name} - APPLICATION MEMBERSHIP`}`}
                        open={this.state.display_role_editor === true && this.state.selectedMembership}
                        showCancel={false}
                        acceptTitle={'DONE'}
                        onAccept={() => {
                            that.setState({
                                display_role_editor: false
                            }, () => {
                                debugger
                                if (that.props.refetch) {
                                    that.props.refetch()
                                }
                            });
                        }}
                    >
                        <Grid container>
                            {that.state.selectedMembership && reactory.$user.applicationRoles.map((applicationRole: string) => {

                                if (applicationRole !== 'ANON') {
                                    return (<Grid item xs={12} sm={12} md={12} lg={12}>
                                        <FormControlLabel
                                            control={<Switch size="small" checked={reactory.hasRole([applicationRole], that.state.selectedMembership.roles)} onChange={(evt) => {
                                                let roles = [...that.state.selectedMembership.roles];
                                                if (evt.target.checked === false) {
                                                    //remove the role
                                                    reactory.utils.lodash.remove(roles, r => r === applicationRole);
                                                } else {
                                                    roles.push(applicationRole);
                                                }

                                                that.setState({ selectedMembership: { ...that.state.selectedMembership, roles } }, () => {

                                                    const mutation = `mutation ReactoryCoreSetRolesForMembership($user_id: String!, $id: String!, $roles: [String]!){
                                                        ReactoryCoreSetRolesForMembership(user_id: $user_id, id: $id, roles: $roles) {
                                                            success
                                                            message
                                                            payload
                                                        }
                                                    }`;

                                                    const variables = {
                                                        user_id: that.state.profile.id,
                                                        id: that.state.selectedMembership.id,
                                                        roles: that.state.selectedMembership.roles
                                                    };


                                                    reactory.graphqlMutation(mutation, variables).then(({ data, errors = [] }) => {
                                                        if (errors.length > 0) {
                                                            reactory.createNotification('Could not update the user roles.', { type: 'error', showInAppNotification: true });
                                                        }

                                                        if (data && data.SetMembershipRoles) {
                                                            const { success, message, payload } = data.SetMembershipRoles;
                                                            reactory.createNotification('Could not update the user roles.', { type: 'error', showInAppNotification: true });
                                                        }


                                                    }).catch((error) => {
                                                        reactory.log('Could not process request', { error }, 'error');
                                                        reactory.createNotification('Could not update the user roles.', { type: 'error', showInAppNotification: true })
                                                    })

                                                })
                                            }} />}
                                            label={applicationRole}
                                        />

                                    </Grid>)
                                }

                            })}
                        </Grid>
                    </AlertDialog>}

                    {that.state.display_add_membership === true && <AlertDialog
                        open={true} title={`Add new membership for ${that.state.profile.firstName} ${that.state.profile.lastName}`}
                        showCancel={false}
                        onAccept={() => { that.setState({ display_add_membership: false }) }}
                        acceptTitle={'DONE'}>
                        <ReactoryCreateUserMembership user={that.state.profile} />
                    </AlertDialog>}
                </Paper>
            </Grid>
        );

        return membershipList;

    }

    renderUserDemographics() {

        const { MoresMyPersonalDemographics } = this.componentDefs;
        const { classes } = this.props;

        const userDemographic = (
            <Grid item sm={12} xs={12} >
                <Paper className={this.props.classes.general}>
                    <Typography className={classes.sectionHeaderText}>Demographics</Typography>
                    <MoresMyPersonalDemographics />
                </Paper>
            </Grid>
        );

        // return userDemographic;
        return null;

    }

    renderPeers() {
        const { classes, history, reactory, withPeers } = this.props;
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
            UserListWithSearch
        } = this.componentDefs

        const that = this;
        let content = null

        if (loadingPeers === true) return (<Loading title="Looking for peers" />)

        //data field for table
        const data = [];

        if (peers && peers.peers) {
            peers.peers.map((entry, index) => {
                data.push({
                    ...entry.user,
                    fullName: `${entry.user.firstName} ${entry.user.lastName} `,
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
} `);

            const variables = {
                id: this.state.profile.id,
                peer: peer.id,
                organization: this.state.selectedMembership.organization.id,
                relationship
            };

            reactory.graphqlMutation(mutation, variables).then((peerResult) => {
                //console.log('Set the user peer relationship', peerResult)
                if (cb && peerResult.setPeerRelationShip) {
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
} `);

            const variables = {
                id: that.state.profile.id,
                peer: peer.id,
                organization: that.state.selectedMembership.organization.id,
            };

            reactory.graphqlMutation(mutation, variables).then((peerResult) => {
                //if(cb) cb(peerResult)                
                if (that.state.confirmRemovePeer) {
                    that.setState({ confirmRemovePeer: null }, that.refreshPeers)
                } else {
                    that.refreshPeers();
                }
            }).catch((peerSetError) => {
                console.error('Error removing peer from member', peerSetError)
                that.refreshPeers()
            })
        }

        const confirmPeers = (confirmed) => {
            ////console.log('Confirming peers for user', this.props, this.state)
            if (confirmed === true) {
                const mutation = gql(`mutation ConfirmPeers($id: String!, $organization: String!, $surveyId: String){
                    confirmPeers(id: $id, organization: $organization, surveyId: $surveyId){
                        ${userPeersQueryFragment}
                    }
                } `);

                const variables = {
                    id: profile.id,
                    organization: selectedMembership.organization.id,
                    surveyId: reactory.queryObject.survey
                };

                reactory.graphqlMutation(mutation, variables).then(result => {
                    if (result && result.data && result.data.confirmPeers) {
                        that.setState({ showConfirmPeersDialog: false, profile: { ...profile, peers: { ...profile.peers, ...result.data.confirmPeers } } }, that.refreshPeers)

                    }
                }).catch(ex => {
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

        if (peers && peers.peers) peers.peers.forEach(p => (excludedUsers.push(p.user.id)))
        let confirmPeersDialog = null
        if (showConfirmPeersDialog === true) {
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



        let materialTable = null;
        if (isNil(membershipSelected) === false) {
            materialTable = (<MaterialTable
                options={{ pageSize: 10 }}
                components={{
                    Toolbar: props => {
                        return (
                            <div>
                                <MTableToolbar {...props} />
                                <hr />
                                <Typography className={peers.confirmedAt ?
                                    classNames([classes.confirmedLabel, classes.notConfirmed]) :
                                    classNames([classes.confirmedLabel, classes.confirmed])}
                                    variant={"body1"}>{moment(peers.confirmedAt).isValid() === true ? `Last Confirmed: ${moment(peers.confirmedAt).format('YYYY-MM-DD')} (Year Month Day)` : 'Once completed, please confirm your peers'}</Typography>
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
                            switch (rowData.relationship.toLowerCase()) {
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
                title={`User Peers in Organisation ${selectedMembership.organization.name} `}
                actions={[
                    rowData => ({
                        icon: 'supervisor_account',
                        tooltip: 'Set user as leader',
                        //@ts-ignore
                        disabled: rowData.relationship ? rowData.relationship === 'manager' : false,
                        onClick: (event, rowData) => {
                            ////console.log('Making User Supervisor', { event, rowData });
                            setPeerRelationShip(rowData, 'manager')
                        },
                    }),
                    rowData => ({
                        icon: 'account_box',
                        tooltip: 'Set user as peer',
                        //@ts-ignore
                        disabled: rowData.relationship ? rowData.relationship === 'peer' : false,
                        onClick: (event, rowData) => {
                            ////console.log('Setting User Peer', { event, rowData });
                            setPeerRelationShip(rowData, 'peer')
                        },
                    }),
                    rowData => ({
                        icon: 'account_circle',
                        tooltip: 'Set user as direct report',
                        //@ts-ignore
                        disabled: rowData.relationship ? rowData.relationship === 'report' : false,
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
                        tooltip: data.length < 5 ? 'Remember to nominate a total of at least 5 people' : (peers.confirmedAt ? `Peers last confirmed at ${moment(peers.confirmedAt).format('YYYY-MM-DD')} ` : 'Confirm peer selection'),
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


            const defaultInstructions = (
                <>
                    <Typography variant="body1">
                        Use the list below to manage your nominees.  Click on the <Icon>add_circle_outline</Icon> above to add a new colleague to your list.
                    </Typography>
                    <Typography variant="body1">
                        If you need to edit the details of an existing colleague you nominated previously, click on their name or the <Icon>expand</Icon> icon. This will enable you to change
                        the relationship type (LEADER, PEER, DIRECT REPORT) or remove the peer by clicking the <Icon>delete_outline</Icon> button.<br />
                        Once you have selected a minimum of six assessors (a maximum of 10),  please click the <Icon>check_circle</Icon> button to confirm your peer selection.<br />
                        Your nominees will only be notified of their nomination a maximum of once every 30 days.
                    </Typography>
                    <hr />
                    <Typography className={peers.confirmedAt ?
                        classNames([classes.confirmedLabel, classes.notConfirmed]) :
                        classNames([classes.confirmedLabel, classes.confirmed])}
                        variant={"body1"}>
                        {moment(peers.confirmedAt).isValid() === true ? `Last Confirmed: ${moment(peers.confirmedAt).format('YYYY-MM-DD')} (Year Month Day)` : 'Once completed, please confirm your peers'}
                    </Typography>
                </>
            );

            const Content = reactory.getComponent('core.StaticContent');
            const contentProps = {
                defaultValue: defaultInstructions,
                slug: `core-peers- nomination-instructions-${selectedMembership.client.id}-${selectedMembership.organization && selectedMembership.organization.id ? selectedMembership.organization.id : 'general'} `,
            }

            const { theme } = this.props;

            materialTable = (
                <Paper className={classes.general}>
                    {/* <Typography variant="h6">My nominees - {this.state.selectedMembership.organization.name}</Typography> */}
                    <Toolbar>
                        <Grid container spacing={2}>
                            <Grid container item direction="row">
                                <Grid item xs={12} sm={12} md={12} lg={12} xl={12} className={classes.nomineesContainerButton} style={{ display: data && Object.keys(data).length > 0 ? 'none' : 'flex' }}>
                                    <Typography variant="body2" color={'primary'}>You do not yet have any nominees. Nominees are the employees of your organisation who will be completing surveys for you.</Typography>
                                </Grid>
                                <Grid item xs={12} sm={12} md={12} lg={12} xl={12} className={data && Object.keys(data).length > 0 ? classes.nomineesContainerBtnLeft : classes.nomineesContainerButton}>
                                    <Tooltip title="Click here to add a new employee to your organisation structure">
                                        <Button color="secondary" variant="contained" component="span" onClick={editUserSelection} style={{ marginRight: '12px' }}><Icon>add</Icon>ADD NOMINEES</Button>
                                    </Tooltip>

                                    <Tooltip title={moment(peers.confirmedAt).isValid() === true ? `Last Confirmed: ${moment(peers.confirmedAt).format('YYYY-MM-DD')} (Year Month Day)` : 'Once you have selected all your organisation peers, please confirm by clicking here.'}>
                                        <Button color="secondary" variant="contained" component="span" onClick={e => confirmPeers(false)} >
                                            <Icon>check_circle</Icon> CONFIRM YOUR NOMINATIONS
                                        </Button>
                                    </Tooltip>
                                </Grid>
                            </Grid>
                        </Grid>


                        {/* */}
                    </Toolbar>
                    {/* <Paper className={classes.peerToolHeader} elevation={2}>
                        <Content {...contentProps} />
                    </Paper> */}
                    <div>
                        {
                            data.map(usr => {
                                // console.log('Binding peer user', usr);
                                const makeSupervisor = e => setPeerRelationShip(usr, 'manager');
                                const makePeer = e => setPeerRelationShip(usr, 'peer');
                                const makeDirectReport = e => setPeerRelationShip(usr, 'report');
                                const deletePeer = e => { that.setState({ confirmRemovePeer: usr }) }

                                const handleChange = event => {

                                    if (that.state.expanded === usr.id) {
                                        that.setState({
                                            expanded: null,
                                        });
                                    }
                                    else {
                                        that.setState({
                                            expanded: usr.id,
                                        });
                                    }
                                };

                                const isManager = usr.relationship === 'manager';
                                const isDirectReport = usr.relationship === 'report';
                                const isPeer = usr.relationship === 'peer';

                                const { confirmRemovePeer = { id: '' } } = that.state;

                                let mustConfirmRemovePeer: boolean = false;

                                if (confirmRemovePeer !== null) {
                                    mustConfirmRemovePeer = confirmRemovePeer.id === usr.id;
                                }

                                const selectorWidget = (
                                    <Grid container>

                                        {mustConfirmRemovePeer === false && <Grid item container sm={12} md={12} lg={12} direction="row" justify={'flex-end'}>

                                            <Tooltip title={`${isManager === true ? `${usr.firstName} ${usr.lastName} is flagged as a leader` : `Click to indicate you report to ${usr.firstName} ${usr.lastName}`} `}>
                                                <IconButton key={0} disabled={isManager === true} onClick={isManager === false ? makeSupervisor : nilf}>
                                                    <Icon>supervisor_account</Icon>
                                                </IconButton>
                                            </Tooltip>

                                            <Tooltip key={1} title={`${isPeer === false ? `Click to set ${usr.firstName} as a peer` : `${usr.firstName} ${usr.lastName} is set as a peer`} `}>
                                                <IconButton disabled={isPeer === true} onClick={isPeer === false ? makePeer : nilf}>
                                                    <Icon>account_box</Icon>
                                                </IconButton>
                                            </Tooltip>

                                            <Tooltip key={2} title={`${isDirectReport === false ? `Click to set ${usr.firstName} as a direct report` : `${usr.firstName} ${usr.lastName} is set as a report`} `}>
                                                <IconButton disabled={isDirectReport === true} onClick={isDirectReport === false ? makeDirectReport : nilf}>
                                                    <Icon>account_circle</Icon>
                                                </IconButton>
                                            </Tooltip>

                                            <Tooltip key={3} title={`Click to remove ${usr.firstName} as a colleague`}>
                                                <IconButton onClick={deletePeer} style={{ backgroundColor: theme.palette.error.main, color: theme.palette.error.contrastText }}>
                                                    <Icon>delete_outline</Icon>
                                                </IconButton>
                                            </Tooltip>
                                        </Grid>}
                                        {
                                            mustConfirmRemovePeer === true && <Grid item container sm={12} md={12} lg={12} direction="row" justify={'flex-end'}>
                                                <Typography variant="body1" style={{ marginTop: '6px', marginRight: '14px' }}>Please confirm you wish to remove {usr.firstName} as a {usr.relationship}?</Typography>
                                                <Button onClick={() => {
                                                    that.setState({ confirmRemovePeer: null })
                                                }}>CANCEL</Button>
                                                <Button onClick={() => {
                                                    removePeer(confirmRemovePeer);
                                                }} style={{
                                                    backgroundColor: theme.palette.error.main,
                                                    color: theme.palette.error.contrastText
                                                }}>YES, REMOVE</Button>
                                            </Grid>
                                        }
                                    </Grid>
                                );

                                let relationshipBadge = null;
                                switch (usr.relationship.toLowerCase()) {
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
                                    expanded={that.state.expanded === usr.id}
                                >
                                    <AccordionSummary onClick={handleChange} expandIcon={that.state.expanded === usr.id ? <Icon>expand_less</Icon> : <Icon>expand_more</Icon>}>
                                        <UserListItem user={usr} message={`Configured as a ${relationshipBadge.toLowerCase()} and ${usr.inviteSent === true ? ` a confirmation email was sent to ${usr.email} at ` + moment(usr.confirmedAt).format('YYYY-MM-DD') : 'no confirmation email has been sent'} `} onSecondaryClick={handleChange} onClick={handleChange} />
                                    </AccordionSummary>
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

        if (isNil(membershipSelected) === false) {

            const { selected_peer_list = [], selectedMembership } = this.state;
            const { organization } = selectedMembership;





            /**
             * 
             * 
             * 
             */


            const Content = reactory.getComponent('core.StaticContent');

            const InModal = ({ onDone = () => { } }) => {

                const [selected_peer_list, setSeletedPeerList] = React.useState<any[]>([]);
                const [show_new_user_modal, setShowNewUser] = React.useState<boolean>(false);
                const [page, setPage] = React.useState(1);
                const [page_size, setPageSize] = React.useState(25);
                const [is_updating, setIsUpdating] = React.useState(false);

                const setUserListSelected = (selection) => {
                    setSeletedPeerList(selection);
                };

                const addUserToSelection = (userToAdd) => {
                    if (profile.id === userToAdd.id) {
                        reactory.createNotification(this.props.mode === 'admin' ? 'A user may not be their own peer, the organigram matrix does not permit this. 🧐' : 'You cannot be your own colleague, the organigram matrix will collapse 🧐', { type: 'warning', showInAppNotification: true, timeout: 4500 })
                        return;
                    }
                    let $selected = [...selected_peer_list, userToAdd];
                    $selected = reactory.utils.lodash.sortBy($selected, (user) => { return `${user.firstName} ${user.lastName}` });
                    setSeletedPeerList($selected);
                };

                const onPageChange = (page) => {
                    setPage(page);
                };


                const onUserCreated = (user) => {
                    addUserToSelection(user);
                    setShowNewUser(false);
                };



                return (<>
                    <Content slug={`profile-organigram-${show_new_user_modal ? 'add' : 'find'}`} />
                    {
                        show_new_user_modal === true ?
                            <CreateProfile
                                onUserCreated={onUserCreated} profileTitle="Invite new peer / colleague"
                                formProps={{ withBackButton: false, withAvatar: false, withPeers: false, withMembership: false, mode: 'peer' }}
                                firstNameHelperText="Firstname for your colleague / peer"
                                surnameHelperText="Surname for your colleague / peer"
                                emailHelperText="Email for your colleague / peer"
                                organizationId={selectedMembership.organization.id} /> : <UserListWithSearch
                                onUserSelect={(user, index) => {

                                    const findex = lodash.findIndex(selected_peer_list, (u: any) => { return u.id === user.id });

                                    if (findex === -1)
                                        addUserToSelection(user);
                                    else {
                                        let new_selection = [...selected_peer_list];
                                        lodash.pullAt(new_selection, findex)
                                        setUserListSelected(new_selection);
                                    }

                                }}
                                onClearSelection={() => {
                                    setUserListSelected([]);
                                }}
                                organization_id={organization.id}
                                onNewUserClick={() => {
                                    setShowNewUser(true);
                                }}
                                onAcceptSelection={(selected_users) => {

                                    if (selected_users.length === selected_peer_list.length) {
                                        Promise.all(selected_peer_list.map((user) => {
                                            return new Promise((resolve, reject) => {
                                                setPeerRelationShip(user, 'peer', (result) => {

                                                    resolve(result);
                                                })
                                            });
                                        })).then((results: any[]) => {


                                            reactory.log('Completed all results', { results }, 'debug')

                                        }).catch((error) => {


                                        });


                                    }
                                }}
                                skip={true}
                                allowNew={true}
                                selected={selected_peer_list.map(u => u.id)}
                                excluded={data.map(u => u.id)}
                                multiSelect={true}
                                mode={'list'}
                                page={page || 1}
                                pageSize={page_size || 25}
                                onPageChange={onPageChange} />
                    }</>);

            }

            addUserDialog = (
                <FullScreenModal open={showAddUserDialog === true} title={`${this.props.mode === 'admin' ? 'Manage peer for user' : 'Manage your peers'}`} onClose={closeAddUserDialog}>
                    <InModal />
                </FullScreenModal>
            );
        }

        const peersComponent = (
            <Fragment>
                <Grid item sm={12} xs={12}>
                    {confirmPeersDialog}
                    {addUserDialog}
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

        return peersComponent;
    }

    renderGeneral() {
        const that = this
        const { profile, avatarUpdated, emailValid, imageMustCrop } = this.state;
        const { firstName, lastName, businessUnit, email, mobileNumber, avatar, peers, surveys, teams, __isnew, id, deleted } = profile;
        const { mode, classes, history, profileTitle, reactory } = this.props;
        const { Cropper } = this.componentDefs;
        const defaultFieldProps = {
            fullWidth: true,
            InputLabelProps: {
                shrink: true
            },
            className: classes.textFieldBase
        };

        const saveDisabled = (emailValid === false ||
            ((firstName) || isNil(lastName)) === true ||
            ((firstName.length < 2 || lastName.length < 2)));

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
                that.setState({ profile: { ...that.state.profile, avatar: preview }, imageMustCrop: true, avatarUpdated: true });
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

        const updateMobileNumber = (evt) => {
            that.setState({ profile: { ...that.state.profile, mobileNumber: evt.target.value } })
        };

        const updateBusinessUnit = (evt) => {
            that.setState({ profile: { ...that.state.profile, businessUnit: evt.target.value } })
        };

        const onSurnameKeyPress = (evt) => {
            if (evt.charCode === 13 && saveDisabled === false) {
                doSave();
            }
        }

        let avatarComponent = null;
        avatarComponent = (
            <div className={classes.avatarContainer}>
                <Tooltip title={`Click on the camera icon to upload / add a new picture`}>
                    <Avatar
                        src={that.state.avatarUpdated === false ? getAvatar(profile, null) : that.state.profile.avatar} alt={`${firstName} ${lastName} `}
                        className={classNames(classes.avatar, classes.bigAvatar, avatarMouseOver === true ? classes.avatarHover : '')}
                        onMouseOver={this.onAvatarMouseOver}
                        onMouseOut={this.onAvatarMouseOut} />
                </Tooltip>

                <input accept="image/png" className={classes.hiddenInput} onChange={onFileClick} id="icon-button-file" type="file" ref={(n) => that.userProfileImageFile = n} />
                <label htmlFor="icon-button-file">
                    <Tooltip title={`Select a png image that is less than 350kb in size.`}>
                        <Button color="secondary" variant="outlined" component="span" className={classes.uploadButton} >Upload Photo</Button>
                    </Tooltip>
                </label>
            </div>);


        return (
            <Grid item sm={12} xs={12}>
                <Paper className={classes.general}>
                    <form>
                        <Grid container spacing={4}>
                            <Grid item sm={12} xs={12} >
                                {this.props.withAvatar === true ? avatarComponent : null}
                            </Grid>
                            <Grid item sm={6} xs={6}>
                                <TextField variant='standard' {...defaultFieldProps} label='First Name' value={firstName} onChange={updateFirstname} />
                            </Grid>
                            <Grid item sm={6} xs={6} >
                                <TextField variant='standard' {...defaultFieldProps} label='Last Name' value={lastName} onChange={updateLastname} onKeyPressCapture={onSurnameKeyPress} />
                            </Grid>
                            <Grid item sm={6} xs={6} >
                                <TextField variant='standard' {...defaultFieldProps} label={emailValid === true ? 'Email Address' : 'Email!'} value={email} onChange={updateEmail} />
                            </Grid>
                            <Grid item sm={6} xs={6} >
                                <TextField variant='standard' {...defaultFieldProps} label='Mobile Number' value={mobileNumber} onChange={updateMobileNumber} />
                            </Grid>
                        </Grid>
                    </form>

                    <div className={classes.saveContainer}>
                        <Button color='primary' variant='contained' onClick={doSave} disabled={saveDisabled}>SAVE CHANGES</Button>

                        {/* {this.props.withBackButton && <Button onClick={back}><CloseIcon />&nbsp;BACK</Button> }
                        {deleted === true ? null : <Button color='primary' onClick={doSave} disabled={ saveDisabled }><SaveIcon />&nbsp;SAVE </Button>} */}

                    </div>
                </Paper>
            </Grid>)
    }

    renderHeader() {
        const { profile, showConfirmDeleteUser = false } = this.state;
        const { reactory } = this.props;
        const { BasicModal } = this.componentDefs;
        const that = this;

        if (this.props.mode !== 'admin') return null;

        const onDeleteClick = e => {
            that.setState({ showConfirmDeleteUser: true })
        };

        let confirmDeleteModal = null;

        if (showConfirmDeleteUser === true) {

            const cancelProfileDelete = e => {
                that.setState({ showConfirmDeleteUser: false, userDeleteMessage: null, userDeleted: false });
            };

            const deleteUserProfile = e => {
                const mutation = gql` mutation DeleteUserMutation($id: String!){
                    deleteUser(id: $id)
                } `;

                reactory.graphqlMutation(mutation, { id: profile.id }).then(result => {
                    if (result.errors) {
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
                    <Button type="button" variant="text" onClick={cancelProfileDelete}>No, I changed my mind</Button>
                    <Button type="button" variant="contained" color="primary" onClick={deleteUserProfile}>Yes, delete user account</Button>
                </BasicModal>
            );

            if (this.state.userDeleteMessage) {
                confirmDeleteModal = (
                    <BasicModal open={true}>
                        <Typography>{this.state.userDeleteMessage}</Typography>
                        <Button type="button" variant="contained" color="primary" onClick={cancelProfileDelete}>Ok</Button>
                    </BasicModal>
                );
            }
        }

        return (
            <Fragment>
                <Toolbar>
                    <Typography variant="caption">Admin: {profile.firstName} {profile.lastName} {profile.deleted === true ? "[ User Deleted ]" : ""}</Typography>
                    {profile.deleted === true ? null : <Tooltip title="Click here to delete the user">
                        <IconButton onClick={onDeleteClick}>
                            <Icon>delete_outline</Icon>
                        </IconButton>
                    </Tooltip>}
                </Toolbar>
                {confirmDeleteModal}
            </Fragment>
        )
    }

    renderFooter() {

    }

    renderCropper() {
        const that = this;
        const { Cropper, FullScreenModal } = this.componentDefs;
        const onModalClose = () => {
            this.setState({ imageMustCrop: false })
        };

        const onCropAccept = (avatar) => {
            //;
            let preview: string = null
            let reader = new FileReader();

            reader.addEventListener("load", function () {
                preview = reader.result.toString();
                that.setState({ profile: { ...that.state.profile, avatar: preview }, imageMustCrop: false, imageCropped: true, avatarUpdated: true });
            }, false);

            let xhr = new XMLHttpRequest();
            xhr.open("GET", avatar);
            xhr.responseType = "blob";//force the HTTP response, response-type header to be blob
            xhr.onload = function () {
                reader.readAsDataURL(xhr.response);//xhr.response is now a blob object
            }
            xhr.send();
        }

        return (
            <FullScreenModal title="Adjust your profile image" open={this.state.imageMustCrop} onClose={onModalClose}>
                <Cropper src={this.state.profile.avatar} onCancelCrop={onModalClose} onAccept={onCropAccept} crop={{ unit: '%', aspect: 1, width: '%' }}></Cropper>
            </FullScreenModal>
        );
    }

    render() {
        const { classes, nocontainer = false, isNew = false } = this.props;

        const containerProps = {
            xs: 12,
            sm: 12,
            md: 6,
            lg: 4,
        };

        const ProfileInGrid = (
            <Grid container spacing={2}>
                {this.renderHeader()}
                <Typography className={classes.sectionHeaderText}>Account Details</Typography>
                {this.renderGeneral()}
                {isNew === false && this.renderUserDemographics()}
                {isNew === false && <Typography className={classes.sectionHeaderText}>My Nominees</Typography>}
                {isNew === false ? this.renderMemberships() : null}
                {isNew === false ? this.renderPeers() : null}
                {isNew === false ? this.renderFooter() : null}
                {isNew === false ? this.renderCropper() : null}
            </Grid>
        );

        if (nocontainer === false) {
            return (
                <Container {...containerProps} className={classes.profileTopMargin}>
                    {ProfileInGrid}
                </Container>
            );
        } else {
            return ProfileInGrid
        }
    }

    windowResize() {
        this.forceUpdate();
    }

    constructor(props) {
        super(props);
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
        this.renderUserDemographics = this.renderUserDemographics.bind(this);
        this.renderCropper = this.renderCropper.bind(this);
        this.inviteUserByEmail = this.inviteUserByEmail.bind(this);
        this.activeOrganisation = this.activeOrganisation.bind(this);

        this.state = {
            avatarMouseOver: false,
            profile: { ...props.profile },
            avatarUpdated: false,
            imageCropped: false,
            imageMustCrop: false,
            showPeerSelection: false,
            selectedMembership: null,
            selected_peer_list: [],
            page: 1,
            emailValid: props.profile.email && isEmail(props.profile.email) === true,
            help: props.reactory.queryObject.help === "true",
            helpTopic: props.reactory.queryObject.helptopics,
            highlight: props.reactory.queryObject.peerconfig === "true" ? "peers" : null,
            activeOrganisationIndex: 0,
            display_role_editor: false,
        };


        //check if there is a selec

        const components = [
            'core.AlertDialog',
            'core.BasicModal',
            'core.Loading',
            'core.FullScreenModal',
            'core.CreateProfile',
            'core.UserListItem',
            'core.Cropper',
            'core.UserListWithSearch',
            'core.ReactoryCreateUserMembership',
            'mores.MoresMyPersonalDemographics',
        ];

        this.componentDefs = props.reactory.getComponents(components);
        window.addEventListener('resize', this.windowResize);
    }

    componentDidMount() {
        const { organizationId } = this.props;
        if (this.state.profile.memberships && this.state.profile.memberships.length > 0) {
            let membershipWithOrganization = null;

            let idx = 0;
            this.state.profile.memberships.forEach((membership, index) => {
                if (membership.organization !== null && membershipWithOrganization === null) {
                    if (organizationId === membership.organization.id) {
                        membershipWithOrganization = membership;
                        idx = 0;
                    }
                };
            });

            if (membershipWithOrganization === null) membershipWithOrganization = this.state.profile.memberships[0];

            if (membershipWithOrganization !== null) this.onMembershipSelectionChanged(membershipWithOrganization, idx);
        }
    }
}

const ProfileViewComponent = compose(
    withRouter,
    withApi,
    withStyles(ProfileStyles),
    withTheme
)(Profile);
export default ProfileViewComponent;


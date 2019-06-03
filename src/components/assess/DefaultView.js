import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import moment from 'moment';
import lodash, { isNil, find, isEmpty } from 'lodash';
import classNames from 'classnames';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import gql from 'graphql-tag';
import MobileStepper from '@material-ui/core/MobileStepper';
import {
  Divider,
  Badge,
  Icon,
  IconButton,
  InputBase,
  Fab,
  Menu, MenuItem,
  Input, InputLabel,
  Card, CardHeader, CardMedia, CardContent, CardActions,
  ListItemIcon, ListItemText,
  Stepper, Step, StepButton,
  Tabs, Tab, Tooltip, Toolbar
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Avatar from '@material-ui/core/Avatar';
import TextField from '@material-ui/core/TextField';
import AppBar from '@material-ui/core/AppBar';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import CancelIcon from '@material-ui/icons/Cancel';
import Assessment, { Behaviour } from './Assessment';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import { withApi, ReactoryApi } from '../../api/ApiProvider';
import { isArray } from 'util';

const nil = isNil;

class RatingControl extends Component {

  static styles = (theme) => {
    const primaryColor = theme.palette.primary.main;
    const primaryColorLight = theme.palette.primary.light;
    return {
      behaviourTitle: {
        color: primaryColor,
        textAlign: 'center',
        fontSize: '20px',
        paddingTop: '15px',
        marginLeft: '10px',
        marginRight: '10px'
      },
      textField: {
      },
      ratingContainer: {
        paddingLeft: '5px',
        paddingRight: '5px',
        marginBottom: '16px',
        marginTop: '16px',
      },
      behaviourSelection: {
        fontSize: '18px',
        color: primaryColorLight,
        paddingBottom: '20px',
        textAlign: 'center'
      },
      confirmDeleteContainer: {
        marginTop: '16px',
        padding: '16px',
      }
    }
  };

  ratingClick(score) {
    const { behaviour, rating } = this.props;

    const data = {
      behaviour,
      rating,
      score  
    };
    this.props.onRatingChange(data);
  }

  notifyChange(){
    
    const { behaviour, rating } = this.props;
    const data = {
      behaviour,
      rating,      
      comment: this.state.comment,
      persist: true
    };

    this.props.onCommentChange(data)
  }

  commentChanged(evt) {
    const { behaviour, rating } = this.props;
    const that = this
    const data = {
      behaviour,
      rating,      
      comment: evt.target.value,
    };

    this.setState({ comment:data.comment });
  }

  confirmCustomDelete(){
    this.setState({ confirmDelete: true });
  }

  render() {
    const { behaviour, classes, rating, assessment } = this.props;
    const self = this;
    let steps = [];

    for (let stepId = behaviour.scale.min; stepId < behaviour.scale.max; stepId++) {
      const doRatingClick = () => (self.ratingClick(stepId));

      steps.push((
        <Step key={stepId}>
          <StepButton
            onClick={assessment.complete === false ? doRatingClick : () => {} }
            completed={false}
            active={(rating.rating - 1) === stepId}
          >
          </StepButton>
        </Step>
      ));
    }

    let commentControl = null;
    if ((rating.rating > 0 && rating.rating < 3 || behaviour.custom === true)) {
      commentControl = (<TextField
        id="multiline-flexible"
        label="How does this impact you?"
        multiline
        fullWidth
        rowsMax="4"
        maxLength={5000}
        value={this.state.comment}
        onChange={assessment.complete === false ? this.commentChanged : () => {}}
        onBlur={assessment.complete === false ? this.notifyChange : ()=> {}}
        className={classes.textField}
        disabled={assessment.complete === true}
        margin="normal"
        helperText="Provide some context as to how this affects you personally or your ability to perform your duties (at least 10 words)."
      />)

    }

    let selectedLabel = find(behaviour.scale.entries, (entry) => {
      return entry.rating === rating.rating
    }) ||  { description: 'Please make a selection' };

    let ratingTooltip = rating.rating === 0 ? 
      <Tooltip title="Requires a rating selection"><Icon color="secondary">info</Icon></Tooltip> : 
      <Tooltip title={`You scored ${rating.rating} `}><Icon color="primary">check_circle</Icon></Tooltip>;

    if(rating.rating > 0 && rating.rating <= 2) {
      if(this.state.comment.length < 50) {
        ratingTooltip = (<Tooltip title="You have give a score lower than 3 which requires you to provide some further input that is longer than 50 characters in length"><Icon color="secondary">info</Icon></Tooltip>)
      }     
    }

    const ratingComponent = (
      <Fragment>        
        <Typography variant="caption" className={classes.behaviourTitle}>{behaviour.title}{ratingTooltip}</Typography>
        <Stepper alternativeLabel nonLinear activeStep={rating.rating - 1}>
          {steps}
        </Stepper>
        <p className={`${classes.behaviourSelection}`}>{selectedLabel.description}</p>
          {commentControl}
          {this.props.rating.custom === true ? 
            <Tooltip title="Click to delete this custom behaviour"><IconButton onClick={self.confirmCustomDelete}><Icon>delete</Icon></IconButton></Tooltip> : null }
      </Fragment>
    )

    const onDelete = () => {
      if(lodash.isFunction(this.props.onDelete)) this.props.onDelete(this.props.rating);
    }

    const cancelDelete = e => {
      self.setState({ confirmDelete: false });
    }

    const confirmComponent = (
      <Fragment>
        <div className={this.props.classes.confirmDeleteContainer}>        
          <Typography style={{margin: '0 16px 0 8px'}}>Are you sure you want to delete this custom behaviour?</Typography>
          <Fab color="primary" onClick={onDelete}><Icon>check</Icon></Fab>
          <Button onClick={cancelDelete}>CANCEL</Button>        
        </div>
      </Fragment>
    );

    return (
      <Grid item sm={12} xs={12}>
        <Paper className={classes.ratingContainer}>          
          {this.state.confirmDelete === true ? confirmComponent : ratingComponent }          
        </Paper>
      </Grid>
    )
  }

  static propTypes = {
    behaviour: PropTypes.object,
    api: PropTypes.instanceOf(ReactoryApi),
    rating: PropTypes.object,
    comment: PropTypes.string,
    onRatingChange: PropTypes.func,
    onCommentChange: PropTypes.func,
    onDelete: PropTypes.func,
  };

  static defaultProps = {
    behaviour: {},
    rating: {
      id: null,
      rating: 0,
    },
    comment: '',
    onRatingChange: (rating) => {  },
    onCommentChange: (comment) => {  },
    onDelete: (rating) => {  }
  };

  constructor(props, context) {
    super(props, context);
    this.ratingClick = this.ratingClick.bind(this);
    this.commentChanged = this.commentChanged.bind(this);
    this.notifyChange = this.notifyChange.bind(this);
    this.confirmCustomDelete = this.confirmCustomDelete.bind(this);
    this.state = {
      comment: props.comment
    }
  }
}

export const RatingComponent = compose(withApi, withTheme, withStyles(RatingControl.styles))(RatingControl);

class DefaultView extends Component {

  // #region style definition
  static styles = (theme) => {
    const primaryColor = theme.palette.primary.main;
    const primaryColorLight = theme.palette.primary.light;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    return {

      root: {
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      },
      input: {
        marginLeft: 8,
        flex: 1,
      },
      iconButton: {
        padding: 10,
      },
      divider: {
        width: 1,
        height: 28,
        margin: 4,
      },
      card: {
        width: '100%',
        maxWidth: '1024px',
        marginLeft: 'auto',
        marginRight: 'auto',
        padding: theme.spacing(1),
        color: primaryColorLight,
      },
      media: {
        maxWidth: 375
      },
      button: {
        float: 'right'
      },
      statsCard: {
        minHeight: '150px',
        marginLeft: 'auto',
        marginRight: 'auto',
      },
      welcomeHeader: {
        padding: 0,
        margin: 0,
        textAlign: 'center',
        paddingTop: '5px',
        color: primaryColor
      },
      statsScoreLabel: {
        position: 'relative',
        bottom: '70px',
        width: '100%',
        textAlign: 'center',
        display: 'block',
        color: primaryColor,
        fontWeight: 'bold'
      },
      statsCardAlt: {
        backgroundColor: primaryColorLight,
        minHeight: '150px'
      },
      logo: {
        maxWidth: '370px'
      },
      welcomeContainer: {
        padding: '5px'
      },
      brandStatement: {
        color: primaryColor,
        fontWeight: 'lighter',
        fontStyle: 'italic',
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1),
      },
      delegateHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: 10
      },
      delegateContainer: {
        display: 'flex',
        justifyContent: 'space-between',
      },
      delegateHeaderTitle: {
        color: primaryColor,
        marginTop: '5px',
        marginBottom: '5px',
        marginLeft: theme.spacing(1),
        fontSize: theme.spacing(2.5)
      },
      delegateBusinessUnit: {
        color: primaryColorLight,
        marginLeft: theme.spacing(1),
        marginTop: '5px',
        marginBottom: '5px',
        fontSize: theme.spacing(1.5),
        fontWeight: 'bold'
      },
      delegateAvatar: {
        width: 60,
        height: 60,
        marginLeft: theme.spacing(1)
      },
      assessmentTitle: {
        width: '100%',
        textAlign: 'center'
      },
      paragraph: {
        textAlign: 'justify'
      },
      logo: {
        height: windowWidth < 768 ? '90px' : '110px',
        marginLeft: 'auto',
        marginRight: 'auto'
      },
      stopActivityDescription: {
        color: theme.palette.text.primary,
        padding: theme.spacing(1.5)
      },
      stopBehaviorTextFieldContainer: {
        marginLeft: theme.spacing(1.5),
        marginRight: theme.spacing(1.5),
        width: '100%'
      },
      thankYouScreen: {
        padding: '16px'
      }
    };
  };
  // #endregion 
  componentDidCatch(e) {
    console.error('error defaultview', e);
  }

  welcomeScreen() {
    const { classes, assessment, theme, api } = this.props;
    const { nextStep, prevStep } = this;


    return (
      <Paper className={classes.welcomeContainer}>
        <Typography gutterBottom>Thank you for taking the time to assess {assessment.selfAssessment === true ? 'yourself' : api.getUserFullName(assessment.delegate)}. This assessment should take approximately
          5 - 7 minutes.<br />
          You will be asked to provide a rating against a series of behaviours that are used to measure how we live the organisation's leadership brand:
        </Typography>
        <Typography className={`${classes.brandStatement} ${classes.paragraph}`} gutterBottom variant="h6">"{assessment.survey.leadershipBrand.description}"</Typography>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img src={theme.assets.logo} className={classes.logo} alt={theme} />
        </div>
      </Paper>
    )
  }

  thankYouScreen() {
    const { classes, history, api } = this.props;
    const { completing, assessment } = this.state;
    const that = this;
    const gotoDashboard = () => {
      history.push("/");
    }
    
    const completeAssessment = () => {

      that.setState({ completing: true }, () => {
        api.graphqlMutation(gql`mutation SetAssessmentComplete($id: String!){
          setAssessmentComplete(id: $id) {
            complete
            updatedAt
          }
        }`, {
          id: assessment.id
        }).then(response => {          
          let isComplete = false;
          if(response.data.setAssessmentComplete && response.data.setAssessmentComplete) isComplete = response.data.setAssessmentComplete.complete === true;
          that.setState({ completing: false, complete: isComplete, assessment: {...lodash.cloneDeep(that.state.assessment), complete: isComplete }});
        }).catch( mutateError => {
          that.setState({ completing: false, completeError: 'Could not update the assessment status' });
        })
      });      
    }

    return (
      <Paper className={classes.thankYouScreen}>
        {assessment.complete === false && 
          <Fragment>
            <Typography gutterBottom variant="h4" color="primary">Please note!</Typography>
            <Typography gutterBottom variant="body1">Thank you for taking the time to complete the assessment. If you are happy with the ratings and input you have provided, please click the complete button below.</Typography>
            <Typography variant="body2">If you want to come back later and review your answers, simply click back to Dashboard and return later.</Typography>
            <Button onClick={completeAssessment} color="primary" style={{marginRight: '4px'}}><Icon>save</Icon>&nbsp;Complete</Button>
            <Button onClick={gotoDashboard}><Icon>dashboard</Icon>Dashboard</Button>        
          </Fragment>}
        {assessment.complete === true && 
          <Fragment>
            <Typography gutterBottom variant="body1">You've completed this assessment.</Typography>
            <Button onClick={gotoDashboard}><Icon>dashboard</Icon>Dashboard</Button>        
          </Fragment> }
      </Paper>
    );
  }

  persistRating(ratingEntry, ratingIndex, deleteRating = false) {
    const that = this;
    const { api } = this.props;
    const { assessment } = this.state;
    //debugger;
    api.graphqlMutation(gql`mutation SetRatingForAssessment(
        $id: String, $ratingId: String, 
        $rating: Int, $comment: String, 
        $qualityId: String, $behaviourId: String,
        $custom: Boolean, $behaviourText: String,
        $deleteRating: Boolean
        ){
      setRatingForAssessment(id: $id, ratingId: $ratingId,
        rating: $rating, comment: $comment, 
        qualityId: $qualityId, behaviourId: $behaviourId,
        custom: $custom, behaviourText: $behaviourText, 
        deleteRating: $deleteRating){
          id        
          behaviour {
            id
            title  
          }
          quality {
            id
            title
          }
          rating
          comment          
          custom
          updatedAt        
      }
    }`, {
        id: assessment.id,
        ratingId: ratingEntry.id,
        rating: parseInt(ratingEntry.rating, 10),
        comment: ratingEntry.comment || '',
        qualityId: ratingEntry.quality ? ratingEntry.quality.id : null,
        behaviourId: ratingEntry.behaviour ? ratingEntry.behaviour.id: null,        
        custom: ratingEntry.custom === true,
        behaviourText: ratingEntry.behaviourText,
        deleteRating: deleteRating,
      }, { 'fetch-policy': 'network-only'}).then(response => {
                
        if(ratingIndex === -1) {  
          const assessmentState = lodash.cloneDeep(assessment);
          assessmentState.ratings.push({...response.data.setRatingForAssessment});
          that.setState({ assessment: assessmentState })
        }
        
        if(deleteRating === true) {
          const assessmentState = lodash.cloneDeep(assessment);
          lodash.pullAt(assessmentState.ratings, [ratingIndex]);
          that.setState({ assessment: assessmentState })
        }
      }).catch((persistRatingError) => {
        console.error('Error saving rating value', persistRatingError)
      })
  }

  onBehaviourRatingChanged(data) {
    const { assessment } = this.state;
    const { behaviour, rating, score } = data
    const that = this;
    const { api } = this.props; 
    if(lodash.isNil(rating)) return;      
    let ratingIndex = lodash.findIndex(assessment.ratings, { 'id': rating.id });
    if (ratingIndex === -1) ratingIndex = lodash.findIndex(assessment.ratings, { 'behaviour.id': behaviour.id });

    if (ratingIndex >= 0) {
      const ratingEntry = lodash.cloneDeep(assessment.ratings[ratingIndex]);
      ratingEntry.rating = score + 1;
      const assessmentState = lodash.cloneDeep(assessment);
      assessmentState.ratings[ratingIndex] = ratingEntry;
      assessmentState.dirty = true;
      this.setState({ assessment: assessmentState }, () => {
        that.persistRating(ratingEntry, ratingIndex);
      });
    } else {
      //console.log('Rating Index not found');
    }

  }

  onBehaviourCommentChanged(data) {
    const { assessment } = this.state;
    const { behaviour, rating, comment, persist = false } = data;
    const that = this;
    let ratingIndex = lodash.findIndex(assessment.ratings, { 'id': rating.id });
    if (ratingIndex === -1) ratingIndex = lodash.findIndex(assessment.ratings, { 'behaviour.id': behaviour.id });

    if (ratingIndex >= 0) {
      const ratingEntry = lodash.cloneDeep(assessment.ratings[ratingIndex]);
      ratingEntry.comment = comment;
      const assessmentState = lodash.cloneDeep(assessment);
      assessmentState.ratings[ratingIndex] = ratingEntry;
      assessmentState.dirty = true;
      this.setState({ assessment: assessmentState }, () => {
        if (persist === true) {
          that.persistRating(ratingEntry, ratingIndex);
        }
      });

    } else {
      //console.log('Rating Index not found');
    }
  }

  onNewBehaviour(quality, behaviour) {
    //console.log('Adding a new Quality', { quality, behaviour });  
    this.persistRating({
      id: 'NEW',
      rating: 0,
      behaviour: {
        id: 'CUSTOM',
        title: behaviour,
      },
      behaviourId: 'CUSTOM',
      qualityId: quality.id,
      quality: quality,
      behaviourText: behaviour,
      comment: '',
      custom: true
    }, -1);    
  }

  ratingScreen() {
    const that = this;
    const { classes } = this.props;
    const { step, assessment, newBehaviourText } = this.state;
    const { delegate, ratings } = assessment;
    const quality = assessment.survey.leadershipBrand.qualities[step - 1];
    const behaviours = quality.behaviours.map((behaviour) => {

      let ratingIndex = lodash.findIndex(ratings, (r) => { return behaviour.id === r.behaviour.id && quality.id === r.quality.id });
      let rating = assessment.ratings[ratingIndex];

      if (!rating) {
        //console.log(`No rating object for quality: ${quality.id}, ${behaviour.id}`);
        rating = { rating: 0, comment: '', id: null, custom: false, behaviourText: null };
      }

      const commentBlurred = () => {
        that.persistRating(rating, ratingIndex);
      };

      return (<RatingComponent
        key={`default.${ratingIndex}`}
        behaviour={{ ...behaviour, qualityId: quality.id, quality, scale: assessment.survey.leadershipBrand.scale }}
        rating={rating}
        comment={rating.comment}
        assessment={assessment}
        ratingIndex={ratingIndex}
        onRatingChange={this.onBehaviourRatingChanged}
        onCommentChange={this.onBehaviourCommentChanged}        
        onBlur={commentBlurred}
        />
      );
    });

    const customBehaviours = lodash.filter(ratings, r => { return r.quality.id === quality.id && r.custom === true }).map((rating) => {
      
      const ratingIndex = lodash.findIndex(ratings, r => r.id === rating.id);

      const commentBlurred = () => {
        that.persistRating(rating, ratingIndex);
      };

      const deleteCustomRating = () => {
        that.persistRating(rating, ratingIndex, true);
      }

      return (<RatingComponent
        key={`custom.${ratingIndex}`}
        behaviour={{ 
          ...rating.behaviour, 
          qualityId: rating.quality.id, 
          quality: rating.quality, 
          scale: assessment.survey.leadershipBrand.scale 
        }}
        rating={rating}
        comment={rating.comment}
        assessment={assessment}
        ratingIndex={ratingIndex}
        onRatingChange={this.onBehaviourRatingChanged}
        onCommentChange={this.onBehaviourCommentChanged}
        onDelete={deleteCustomRating}
        onBlur={commentBlurred} />
      );
    });

    const setNewBehaviourText = (evt) => {
      that.setState({ newBehaviourText: evt.target.value });
    };

    const onNewBehaviourClicked = (evt) => {
      const newBehaviourTextToCreate = newBehaviourText;
      that.setState({ newBehaviourText: ""}, ()=>{
        that.onNewBehaviour(quality, newBehaviourTextToCreate);
      })
      
    };

    const onClearCustomText = evt => that.setState({ newBehaviourText: '' });

    return (
      <Grid container spacing={8}>
        <Grid item sm={12} xs={12}>
          <Typography variant="caption" color="primary">System Defined Behaviours for {quality.title}</Typography>
          {behaviours}
          
          {customBehaviours.length > 0 ? 
            <Fragment>
              <hr style={{  marginBottom: `${this.props.theme.spacing(1)}px`, 
                          marginTop: `${this.props.theme.spacing(1)}px` }} />
              <Typography variant="caption" color="primary">Custom Behaviours for {quality.title} added by you</Typography>
              {customBehaviours}
            </Fragment> : null }
          
        </Grid>
        {assessment.complete === false ? (
          <Grid item sm={12} xs={12}>
            <Paper style={{ padding: '5px' }}>
              <Typography>
                If you want to provide a customised behaviour that {delegate.firstName} exhibits that relates to {quality.title}, type it in the box below and then click the add <Icon>add</Icon> button and provide your rating and feedback.<br /><br />
                Please note, these custom ratings will not affect the calculation of {delegate.firstName}'s overall rating for this assessment.
             </Typography>
             <Paper className={classes.root} elevation={1}>              
              <InputBase 
                className={classes.input} 
                placeholder={"Please provide a custom behaviour description"}  
                onChange={setNewBehaviourText}
                fullWidth={true}
                value={newBehaviourText} />
              <IconButton onClick={onNewBehaviourClicked} className={classes.iconButton} aria-label="Search">
                <Icon>add</Icon>
              </IconButton>
              <Divider className={classes.divider} />
              <IconButton onClick={onClearCustomText} color="primary" className={classes.iconButton} aria-label="Directions">
                <Icon>close</Icon>
              </IconButton>
            </Paper>                            
            </Paper>
          </Grid>
        ) : null}

      </Grid>
    );
  }

  prevStep() {
    if (this.state.step > 0)
      this.setState({ step: this.state.step - 1 });
  }

  nextStep() {
    let maxSteps = this.props.assessment.survey.leadershipBrand.qualities.length + 2;
    if (this.state.step < maxSteps)
      this.setState({ step: this.state.step + 1 }, ()=>{
        window.scrollTo({ top: 0 })
      });
  }

  setStep(event, step) {
    //console.log('Step change', step);
    this.setState({ step });
  }

  toolbar(content) {
    let tabs = [(<Tab key={'w'} label="Welcome" />)];
    this.props.assessment.survey.leadershipBrand.qualities.map((quality, kidx) => tabs.push(<Tab key={kidx} label={`${tabs.length}. ${quality.title}`} />));
    tabs.push(<Tab key={'c'} label="Complete" />);
    return (
      <AppBar position="static" color="default">
        <Tabs
          value={this.state.step}
          variant="scrollable"
          scrollButtons="on"
          indicatorColor="primary"
          textColor="primary">
          {tabs}
        </Tabs>
      </AppBar>
    )
  }

  stopActivities() {
    const { classes } = this.props;
    return (
      <Grid container spacing={8}>
        <Grid item sm={12} xs={12}>
          <Paper>
            <Typography>This section is used to add any STOP behaviours</Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  }

  assessmentOptions() {
    const { assessment } = this.state;
    const cancelAssessment = () => {
      this.props.history.goBack()
    };

    const saveAndCloseAssessment = () => {
      this.props.history.push('/survey')
    };

    const viewReport = () => this.props.history.push(`/report/${assessment._id}`)

    const options = (props) => (
      <Menu
        open={props.open}
        id='assessment-options'
        anchorEl={props.anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}>
        <MenuItem onClick={props.cancelClicked}>
          <ListItemIcon><CancelIcon /></ListItemIcon>
          <ListItemText inset primary={"Close"} />
        </MenuItem>      
      </Menu>);

    options.muiName = 'IconMenu';

    return options({ open: this.state.showMenu, anchorEl: this.state.anchorEl, cancelClicked: cancelAssessment, saveAndCloseAssessment: saveAndCloseAssessment, viewReport });
  }

  handleMenu(evt) {
    this.setState({ showMenu: !this.state.showMenu, anchorEl: evt.currentTarget })
  }

  currentStepValid(){    
    const { assessment, step } = this.state;
    if(step === 0) return true;
    
    let maxSteps = assessment.survey.leadershipBrand.qualities.length + 2;
    if(step === maxSteps - 1) return false;

    const { ratings } = assessment;
    const quality = assessment.survey.leadershipBrand.qualities[step - 1];

    
    const invalidRatings = lodash.find(ratings, r => {
      return (r.quality.id === quality.id && r.rating <= 2) && (lodash.isEmpty(r.comment) === true || r.comment.length < 50);
    }) || [];

    if(invalidRatings.length === 0) return true;
    else return false;
  }

  render() {
    const { classes, theme, api } = this.props;
    const { step, valid, assessment, showMenu } = this.state;
    const { delegate, assessor, survey, selfAssessment } = assessment;
    const { nextStep, toolbar, assessmentOptions, handleMenu, prevStep } = this;
    let wizardControl = null;
    let maxSteps = assessment.survey.leadershipBrand.qualities.length + 2;
    const isCurrentStepValid = this.currentStepValid();

    if (step === 0) wizardControl = this.welcomeScreen();
    if (step === maxSteps - 1) wizardControl = this.thankYouScreen();
    if (nil(wizardControl) === true) wizardControl = this.ratingScreen();

    const daysLeft = moment(survey.endDate).diff(moment(), 'days');

    return (
      <Grid container spacing={16} className={classes.card}>
        <Grid item xs={12} sm={12}>
          <Paper>
            <Grid container spacing={8}>
              <Grid item xs={12} sm={12}>
                <CardHeader
                  avatar={<Badge color={"primary"} 
                                badgeContent={ assessment.overdue === true ? "!" : assessment.complete === true ? 'C' : `${daysLeft}` }>
                            <Avatar src={api.getAvatar(delegate)} className={classNames(classes.delegateAvatar)} alt={assessment.delegateTitle}></Avatar>
                          </Badge>}
                  title={assessment.delegate ? `${api.getUserFullName(delegate)} - ${survey.surveyType} ${survey.title} ${selfAssessment === true ? ' [Self Assessment]' : ''}` : `Unknown`}
                  subheader={`Survey valid from ${moment(survey.startDate).format('DD MMMM YYYY')} till ${moment(survey.endDate).format('DD MMMM YYYY')} - ${assessment.complete === true ? 'Completed - Review Only' : 'In progress'}`}
                  action={
                    <IconButton
                      aria-owns={showMenu ? 'assessment-options' : null}
                      aria-haspopup="true"
                      onClick={handleMenu}
                      color="inherit"   >
                      <MoreVertIcon />
                      {assessmentOptions()}
                    </IconButton>
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={12}>
          {toolbar()}
        </Grid>
        <Grid item xs={12} sm={12}>
          {wizardControl}
        </Grid>
        <Grid item xs={12} sm={12}>
          <MobileStepper
            style={{              
              background: '#fff',
              borderTop: `1px solid ${theme.palette.primary.main}`,
            }}
            variant="dots"
            steps={maxSteps}
            position="bottom"
            activeStep={step}
            nextButton={
              <Tooltip title={isCurrentStepValid ? 'Click to proceed to the next section' : 'Please ensure you have completed each rating in full'}><Button size="small" onClick={nextStep} disabled={isCurrentStepValid === false}>
                Next{theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
              </Button></Tooltip>
            }
            backButton={
              <Button size="small" onClick={prevStep} disabled={step === 0}>
                {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
                Back
                </Button>
            }
          />
          <Typography variant="body1" color={"primary"} style={{textAlign: 'right'}}>{isCurrentStepValid ? 'Click next to proceed' : 'Ensure you have completed all ratings and comments in full before proceeding.'}</Typography>
        </Grid>
      </Grid>
    );
  }

  static propTypes = {
    assessment: PropTypes.object,
    api: PropTypes.instanceOf(ReactoryApi)
  };

  static defaultProps = {
    assessment: new Assessment()
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      valid: true,
      step: 0,
      assessment: props.assessment,
      showMenu: false
    };
    this.welcomeScreen = this.welcomeScreen.bind(this);
    this.thankYouScreen = this.thankYouScreen.bind(this);
    this.nextStep = this.nextStep.bind(this);
    this.prevStep = this.prevStep.bind(this);
    this.ratingScreen = this.ratingScreen.bind(this);
    this.toolbar = this.toolbar.bind(this);
    this.setStep = this.setStep.bind(this);
    this.stopActivities = this.stopActivities.bind(this);
    this.handleMenu = this.handleMenu.bind(this);
    this.assessmentOptions = this.assessmentOptions.bind(this);
    this.onBehaviourRatingChanged = this.onBehaviourRatingChanged.bind(this);
    this.onBehaviourCommentChanged = this.onBehaviourCommentChanged.bind(this);
    this.onNewBehaviour = this.onNewBehaviour.bind(this);
    this.persistRating = this.persistRating.bind(this);
    this.currentStepValid = this.currentStepValid.bind(this);
  }
};

const DefaultViewComponent = compose(
  withApi,
  withRouter,
  withStyles(DefaultView.styles),
  withTheme
)(DefaultView);

export default DefaultViewComponent;
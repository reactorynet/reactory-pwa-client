import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import moment from 'moment';
import lodash, { isNil, find, isEmpty, template } from 'lodash';
import classNames from 'classnames';
import { graphql, Query, Mutation } from '@apollo/client';
import { withApollo } from '@apollo/client/react/hoc';
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
import { withApi } from '../../api/ApiProvider';
import { ReactoryApi } from "../../api/ReactoryApi";
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

      behaviourSubTitle: {
        color: theme.palette.secondary.main,
        textAlign: 'center',
        fontSize: '20px',
        paddingTop: '15px',
        marginLeft: '10px',
        marginRight: '10px'
      },

      textField: {
        backgroundColor: 'unset'
      },
      textFieldGood: {

      },
      textFieldWarn: {
        backgroundColor: primaryColorLight
      },
      textFieldDanger: {

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

  constructor(props, context) {
    super(props, context);
    this.ratingClick = this.ratingClick.bind(this);
    this.commentChanged = this.commentChanged.bind(this);
    this.notifyChange = this.notifyChange.bind(this);
    this.confirmCustomDelete = this.confirmCustomDelete.bind(this);
    this.state = {
      comment: props.comment || ''
    }
    this.minWordCount = 10;
  }

  ratingClick(score) {

    const { behaviour, rating } = this.props;

    const data = {
      behaviour,
      rating,
      score
    };
    this.props.onRatingChange(data);
  }

  notifyChange() {

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
      persist: false,
    };

    this.setState({ comment: data.comment }, () => {
      that.props.onCommentChange(data);
    });
  }

  confirmCustomDelete() {
    this.setState({ confirmDelete: true });
  }

  render() {
    const { behaviour, classes, rating, assessment, theme } = this.props;
    const that = this;
    let steps = [];
    let needsAttention = false;
    for (let stepId = behaviour.scale.min; stepId < behaviour.scale.max; stepId++) {
      const doRatingClick = (evt) => {
        evt.stopPropagation();
        that.ratingClick(stepId);
      };

      steps.push((
        <Step key={stepId}>
          <StepButton
            onClick={assessment.complete === false ? doRatingClick : () => { }}
            completed={false}
            active={(rating.rating - 1) === stepId}
          >
          </StepButton>
        </Step>
      ));
    }

    let commentAllowed = true;
    switch (assessment.survey.surveyType) {
      case "culture":
      case "i360":
      case "l360":
      case "team180": {
        commentAllowed = false;
      }
    }

    let commentControl = null;
    //if ((rating.rating > 0 && rating.rating < 3 || behaviour.custom === true)) {
    //const controlClasses = classNames( this.state.comment.split(' ').length < 10 ? classes.)
    const hasError = this.state.comment.split(' ').length < that.minWordCount && rating.rating <= 2;
    const wordCount = this.state.comment.split(' ').length;
    let wordsLeft = ''

    if (wordCount === 0) {
      wordsLeft = ` (at least 10 words ${rating.rating <= 2 ? 'required!' : 'optional'})`;
    }

    if (wordCount > 0 && wordCount < this.minWordCount && this.state.comment.length > 1) {
      wordsLeft = ` (${this.minWordCount - wordCount} words left)`;
    }

    commentControl = (<TextField
      id="multiline-flexible"
      label={this.state.comment.split(' ').length < that.minWordCount && rating.rating <= 2 ? "How does this impact you? - * required" : "How does this impact you?"}
      multiline
      fullWidth
      rowsMax="4"
      variant="outlined"
      error={hasError}
      maxLength={5000}
      value={this.state.comment}
      onChange={assessment.complete === false ? this.commentChanged : () => { }}
      onBlur={assessment.complete === false ? this.notifyChange : () => { }}
      autoFocus={this.state.comment.split(' ').length < 10}
      className={classes.textField}
      disabled={assessment.complete === true}
      margin="normal"
      helperText={`Provide some ${rating.rating <= 2 ? 'required' : 'optional'} context as to how this affects you personally or your ability to perform your duties${wordsLeft}.`}
    />);


    let selectedLabel = find(behaviour.scale.entries, (entry) => {
      return entry.rating === rating.rating
    }) || { description: 'Make a selection' };

    let ratingTooltip = rating.rating === 0 ?
      <Tooltip title="Requires a rating selection"><Icon color="error">info</Icon></Tooltip> :
      <Tooltip title={`You provide a score of ${rating.rating}`}><Icon style={{ color: theme.palette.success.main }}>check_circle</Icon></Tooltip>;

    if (commentAllowed === true && rating.rating > 0 && rating.rating <= 2) {
      if (this.state.comment.length < 50) {
        ratingTooltip = (<Tooltip title="You have give a score lower than 3 which requires you to provide some further input that is longer than 50 characters in length"><Icon color="secondary">info</Icon></Tooltip>)
      }
    }

    let $ratingContent = 'processing';
    let $ratingSubContent = 'processing'
    try {
      $ratingContent = template(behaviour.title)({ employee: assessment.delegate, employeeDemographics: assessment.delegate.demographics || { pronoun: 'his/her' }, assessment, survey: assessment.survey, api: this.props.api })

    } catch (templateErr) {
      that.props.api.log(`Behaviour Template Error`, { template: behaviour.title, templateErr }, 'error');

      $ratingContent = `Error Processing behaviour template text. See logs for details`
    }

    try {
      $ratingSubContent = template(behaviour.description)({ employee: assessment.delegate, employeeDemographics: assessment.delegate.demographics || { pronoun: 'his/her' }, assessment, survey: assessment.survey, api: this.props.api })
    } catch (e) {
      that.props.api.log(`Behaviour Template Error`, { template: behaviour.description, templateErr }, 'error');

      $ratingContent = `Error Processing behaviour template text. See logs for details`
    }

    const contentsDiffer = $ratingContent !== $ratingSubContent


    const ratingComponent = (
      <Fragment>
        <Badge>{ratingTooltip}</Badge>
        <Typography variant="body1" className={classes.behaviourTitle}>
          {$ratingContent}
        </Typography>
        { contentsDiffer && (<Typography variant="body2" className={classes.behaviourSubTitle}>{$ratingSubContent}</Typography>)}

        <Stepper alternativeLabel nonLinear activeStep={rating.rating - 1}>
          {steps}
        </Stepper>
        <p className={`${classes.behaviourSelection}`}>{selectedLabel.description}</p>
        {commentAllowed == true && commentControl}
        {this.props.rating.custom === true ?
          <Tooltip title="Click to delete this custom behaviour"><IconButton onClick={that.confirmCustomDelete}><Icon>delete</Icon></IconButton></Tooltip> : null}
      </Fragment>
    )

    const onDelete = () => {
      if (lodash.isFunction(this.props.onDelete)) this.props.onDelete(this.props.rating);
    }

    const cancelDelete = e => {
      that.setState({ confirmDelete: false });
    }

    const confirmComponent = (
      <Fragment>
        <div className={this.props.classes.confirmDeleteContainer}>
          <Typography style={{ margin: '0 16px 0 8px' }}>Are you sure you want to delete this custom behaviour?</Typography>
          <Fab color="primary" onClick={onDelete}><Icon>check</Icon></Fab>
          <Button onClick={cancelDelete}>CANCEL</Button>
        </div>
      </Fragment>
    );

    return (
      <Grid item sm={12} xs={12}>
        <Paper className={classes.ratingContainer}>
          {this.state.confirmDelete === true ? confirmComponent : ratingComponent}
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
    onRatingChange: (rating) => { },
    onCommentChange: (comment) => { },
    onDelete: (rating) => { }
  };


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
      plcLogo: {
        height: '280px',
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


  constructor(props, context) {
    super(props);
    this.state = {
      valid: true,
      step: 0,
      assessment: props.assessment,
      qualityCustomComment: null,
      qualityAction: null,
      showMenu: false,
      showTeamMembers: false,
      showHelp: false
    };
    this.welcomeScreen = this.welcomeScreen.bind(this);
    this.thankYouScreen = this.thankYouScreen.bind(this);
    this.nextStep = this.nextStep.bind(this);
    this.prevStep = this.prevStep.bind(this);
    this.ratingScreen = this.ratingScreen.bind(this);
    this.loadCustomQualityComment = this.loadCustomQualityComment.bind(this);
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
    this.getDelegateTeamList = this.getDelegateTeamList.bind(this);
    this.componentDefs = this.props.api.getComponents([
      'core.Loading',
      'core.Logo',
      'core.FullScreenModal',
      'core.StaticContent',
      'mores.MoresMyPersonalDemographics',
    ]);
  }
  // #endregion
  componentDidCatch(e) {
    console.error('error defaultview', e);
  }

  is180(survey) {
    if (!survey) return false;
    if (!survey.surveyType) return false;

    switch (survey.surveyType) {
      case 'team180':
      case '180': {
        return true;
      }
      default: {
        return false;
      }
    }
  }

  welcomeScreen() {
    const { classes, assessment, theme, api } = this.props;
    const { nextStep, prevStep, componentDefs } = this;
    const { survey } = assessment;

    const is180 = this.is180(survey);
    const isPLC = survey.surveyType === 'plc';

    const defaultWelcomeMessage = (
      <Typography gutterBottom>Thank you for taking the time to assess {assessment.selfAssessment === true ? 'yourself' : api.getUserFullName(assessment.delegate)}. This assessment should take approximately
      5 - 7 minutes to complete.<br />
      You will be asked to provide a rating against a series of behaviours that are used to measure how { isPLC === true ? `well the ${survey.leadershipBrand.title} are displayed:` : ` we live the organisation's leadership brand:`}
      </Typography>
    )

    if (!is180) {
      return (
        <Paper className={classes.welcomeContainer}>
          <componentDefs.StaticContent
            slug={`mores-assessments-${survey.surveyType}_${survey.id}-welcome-screen`.toLowerCase()}
            title={`Welcome Screen: ${survey.surveyType}`}
            editAction={'link'}
            showEditIcon={true}
            defaultValue={<Typography gutterBottom variant="body1">Thank you for taking the time to complete this {assessment.survey.leadershipBrand.title} survey</Typography>}>
          </componentDefs.StaticContent>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <componentDefs.StaticContent editAction={'link'} slug={`towerstone-CDN-leadershipbrand-main-surveytype_${survey.surveyType}_${survey.leadershipBrand.id}`} defaultValue={<img src={isPLC ? theme.assets.feplmodel : theme.assets.logo} className={!isPLC ? classes.logo : classes.plcLogo} alt={theme} />} />
          </div>
        </Paper>
      )
    } else {
      return (
        <Paper className={classes.welcomeContainer}>

          <componentDefs.StaticContent
            slug={`mores-assessments-${survey.surveyType}_${survey.id}-welcome-screen`.toLowerCase()}
            title={`Welcome Screen: ${survey.surveyType}`}
            propertyBag={{ survey, assessment }}
            showEditIcon={true}
            editAction={'link'}
            defaultValue={<Typography gutterBottom>Thank you for taking the time to assess the {survey.delegateTeamName} team. This assessment should take approximately
            5 - 7 minutes.<br />
            You will be asked to provide a rating against a series of behaviours that are used to measure how we live the organisation's leadership brand:
          </Typography>}>
          </componentDefs.StaticContent>


          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <componentDefs.StaticContent
              editAction={'link'}
              slug={`towerstone-CDN-leadershipbrand-main-surveytype_${survey.surveyType}_${survey.leadershipBrand.id}`}
              defaultValue={<img src={isPLC ? theme.assets.feplmodel : theme.assets.logo}
                className={!isPLC ? classes.logo : classes.plcLogo} alt={theme} />} />
          </div>

        </Paper>
      )
    }
  }

  thankYouScreen() {
    const { classes, history, api } = this.props;
    const { completing, assessment } = this.state;
    const { StaticContent } = this.componentDefs;
    const { survey } = assessment;
    const that = this;

    const { palette } = api.getTheme();

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
          if (response.data.setAssessmentComplete && response.data.setAssessmentComplete) isComplete = response.data.setAssessmentComplete.complete === true;
          that.setState({ completing: false, complete: isComplete, assessment: { ...lodash.cloneDeep(that.state.assessment), complete: isComplete } }, () => {
            gotoDashboard()
          });
        }).catch(mutateError => {
          that.setState({ completing: false, completeError: 'Could not update the assessment status' });
        })
      });
    }

    return (
      <Paper className={classes.thankYouScreen}>
        {assessment.complete === false &&
          <Fragment>
            <StaticContent slug={`mores-assessments-survey-${survey.id}-thank-you`} editAction={'link'} defaultValue={<>
              <Typography gutterBottom variant="body1">Thank you for taking the time to provide your input. If you are comfortable with the ratings and input that you have provided, please click FINISH.</Typography>
              <Typography variant="body1">You may click BACK below to review your input, however once you click FINISH you will not be able to change your input.</Typography>
            </>} />
            <Button onClick={completeAssessment} style={{ marginRight: '4px', color: palette.success.main }}><Icon>check_outline</Icon>&nbsp;Finish</Button>
          </Fragment>}
      </Paper>
    );
  }

  startAssessment = () => {
    // SAVES A TIMELINE ENTY ON SURVEY - SURVEY STARTED
    const { api } = this.props;
    const { assessment } = this.state;
    api.graphqlMutation(gql`mutation assessmentStarted($id: String!){
      assessmentStarted(id: $id)
    }`, {
      id: assessment.id
    }).then(response => {
      api.log(`ASSESSMENT STARTED TIMELINE SAVED`);
    }).catch(mutateError => {
      console.log(`ASSESSMENT STARTED TIMELINE SAVED - ERROR`);
    })
  }

  persistRating(ratingEntry, ratingIndex, deleteRating = false, iteration = 0) {
    const that = this;
    const { api } = this.props;
    const { assessment, assessment_rollback } = this.state;

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
      behaviourId: ratingEntry.behaviour ? ratingEntry.behaviour.id : null,
      custom: ratingEntry.custom === true,
      behaviourText: ratingEntry.behaviourText,
      deleteRating: deleteRating,
    }, { 'fetch-policy': 'cache-and-network' }).then(response => {


      if (response.errors && response.errors.length > 0) {
        api.createNotification('Could not save your last score. The system may be offline, please try again in a few moments.', { showInAppNotification: true, canDismiss: true, type: 'errors' })
      }

      if (ratingIndex === -1) {
        const assessmentState = lodash.cloneDeep(assessment);
        assessmentState.ratings.push({ ...response.data.setRatingForAssessment });
        that.setState({ assessment: assessmentState })
      }

      if (deleteRating === true) {
        const assessmentState = lodash.cloneDeep(assessment);
        lodash.pullAt(assessmentState.ratings, [ratingIndex]);
        that.setState({ assessment: assessmentState })
      }

      if (iteration > 0) {
        const assessmentState = lodash.cloneDeep(assessment);
        assessmentState.ratings[ratingIndex] = ratingEntry;
        that.setState({ assessment: assessmentState })
      }

    }).catch((persistRatingError) => {
      api.log('Error saving rating value', persistRatingError, 'error')

      if (assessment_rollback) {
        that.setState({ assessment: assessment_rollback }, () => {
          if (iteration === 0) {
            api.createNotification('Could not save your last score, the system will automatically retry in a few moments.', { showInAppNotification: true, canDismiss: true, type: 'info' })
            setTimeout(() => {
              that.persistRating(ratingEntry, ratingIndex, deleteRating, iteration + 1)
            }, 3000)
          } else {
            if (iteration < 3) {

              setTimeout(() => {
                that.persistRating(ratingEntry, ratingIndex, deleteRating, iteration + 1)
              }, 3000 * iteration)
            } else {
              api.createNotification('Could not save your last score, the system may be offline, please try again in a few moments.', { showInAppNotification: true, canDismiss: true, type: 'error' })
            }
          }

        })
      }
    })
  }

  onBehaviourRatingChanged(data) {
    const { assessment } = this.state;
    const { behaviour, rating, score } = data
    const that = this;
    const { api } = this.props;
    if (lodash.isNil(rating)) return;
    let ratingIndex = lodash.findIndex(assessment.ratings, { 'id': rating.id });
    if (ratingIndex === -1) ratingIndex = lodash.findIndex(assessment.ratings, { 'behaviour.id': behaviour.id });

    if (ratingIndex >= 0) {
      const ratingEntry = lodash.cloneDeep(assessment.ratings[ratingIndex]);
      ratingEntry.rating = score + 1;
      const assessmentState = lodash.cloneDeep(assessment);
      assessmentState.ratings[ratingIndex] = ratingEntry;
      assessmentState.dirty = true;
      that.setState({ assessment: assessmentState, assessment_rollback: lodash.cloneDeep(assessment) }, () => {
        that.persistRating(ratingEntry, ratingIndex, false, 0);
      });
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
      that.setState({ assessment: assessmentState }, () => {
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

  getDelegateTeamList() {

    const { FullScreenModal, StaticContent } = this.componentDefs;
    const { assessment } = this.props;
    const { survey } = assessment;

    const closeDelegateTeamList = () => {
      this.setState({ showTeamMembers: !this.state.showTeamMembers })
    };

    return (
      <FullScreenModal open={this.state.showTeamMembers === true} onClose={closeDelegateTeamList} title={"Team Details"}>
        <StaticContent slug={`towerstone-team-members-${survey.id}`} editAction='link' />
      </FullScreenModal>
    );
  }

  loadCustomQualityComment() {
    const that = this;
    const { classes, api } = this.props;
    const { step, assessment, newBehaviourText, qualityCustomComment } = this.state;
    const { delegate, ratings, survey } = assessment;
    const { StaticContent } = this.componentDefs;
    const quality = assessment.survey.leadershipBrand.qualities[step - 1];
    const { slugify } = api.utils;


    const commentSlug = `mores-survey-${survey.id}-assessment_${assessment.id}-section_${quality.id}-assessor_${assessment.assessor.id}-CustomComment`;
    const adminCommentSlug = `mores-survey-${survey.id}-section_${quality.id}-AdminCustomAction`;

    const contentQuery = `
    query ReactoryGetContentBySlug($slug: String!) {
      ReactoryGetContentBySlug(slug: $slug){
        slug,
        title,
        content
      }
    }
  `;

    api.graphqlQuery(contentQuery, { slug: commentSlug }).then((result) => {
      const { data, errors } = result;
      let qualityCustomComment = ''
      let qualityAction = ''

      api.log(`Results from fetching custom comment`, { data, errors }, 'debug');

      if (data.ReactoryGetContentBySlug) {
        qualityCustomComment = data.ReactoryGetContentBySlug.content;
      }

      api.graphqlQuery(contentQuery, { slug: adminCommentSlug }).then((adminCommentResult) => {
        let adminComment = adminCommentResult.data.ReactoryGetContentBySlug;
        qualityAction = adminComment ? adminComment.content : '';
        that.setState({ qualityCustomComment, qualityAction });
      }).catch((adminCommentGetError) => {

        api.log(`Could not load the admin action ${adminCommentGetError.message}`)
        that.setState({ qualityCustomComment, qualityAction });
      });

    }).catch((graphError) => {
      api.log(`Could not load Custom comment`, { graphError }, 'error')
      that.setState({ qualityCustomComment, qualityAction });
    });
  }

  ratingScreen() {
    const that = this;
    const { classes, api } = this.props;
    const { step, assessment, newBehaviourText, qualityCustomComment, qualityAction } = this.state;
    const { delegate, ratings, survey } = assessment;
    const { StaticContent } = this.componentDefs;
    const quality = assessment.survey.leadershipBrand.qualities[step - 1];
    const { slugify } = api.utils;

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
      that.setState({ newBehaviourText: "" }, () => {
        that.onNewBehaviour(quality, newBehaviourTextToCreate);
      })

    };

    const toggleShowTeam = () => {
      that.setState({ showTeamMembers: !that.state.showTeamMembers })
    }

    const onClearCustomText = evt => that.setState({ newBehaviourText: '' });

    let CustomFeedbackComponent = (
      <Grid item sm={12} xs={12}>
        <Paper style={{ padding: '5px' }}>
          <Typography>
            If you want to provide a customised behaviour that {assessment.survey.surveyType === '180' ? `the ${assessment.survey.delegateTeamName} team` : delegate.firstName} exhibits that relates to {quality.title}, type it in the box below and then click the add <Icon>add</Icon> button and provide your rating and feedback.<br /><br />
            Note, these custom ratings will not affect the calculation of {assessment.survey.surveyType === '180' ? `the ${assessment.survey.delegateTeamName} team` : delegate.firstName}'s overall rating for this assessment.
         </Typography>
          <Paper className={classes.root} elevation={1}>
            <InputBase
              className={classes.input}
              placeholder={"Provide a custom behaviour description"}
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
    );


    const updateAdminActionContent = (evt) => {
      const content = evt.target.value;
      api.log(`Update Content For Custom Comment`, { content }, 'debug');

      api.graphqlMutation(gql`
        mutation ReactoryCreateContent($createInput: CreateContentInput!){
          ReactoryCreateContent(createInput: $createInput){
            id
            slug
            title
            content
            topics
            published
            createdBy {
              id
              fullName
            }
            createdAt
          }
        }
      `, {
        createInput: {
          slug: `mores-survey-${survey.id}-section_${quality.id}-AdminCustomAction`,
          title: `Section ${quality.title} Action by ${api.$user.firstName} ${api.$user.lastName} on ${assessment.survey.title}`,
          content: content,
          updatedAt: new Date().valueOf(),
          published: true
        }
      }).then((contentUpdateResult) => {
        api.log(`Result from Content Create Update`, { contentUpdateResult }, 'debug')
        const { data, errors } = contentUpdateResult;

      }).catch((exc) => {
        api.log(`Error Updating Custom Comment `, { exc }, 'error');
      });
    };

    const patchCustomActionState = evt => {
      that.setState({ qualityAction: evt.target.value })
    }

    let AdminActionInputComponent = (
      <Paper>
        <TextField
          label={`Provide custom action content for: ${quality.title}`}
          multiline
          InputLabelProps={{ shrink: true }}
          rows={8}
          onBlur={updateAdminActionContent}
          fullWidth={true}
          placeholder={`Type here if you want add a admin for this section: ${quality.title}`}
          value={qualityAction}
          onChange={patchCustomActionState}
          variant="outlined"
        />
      </Paper>
    )

    let includeAdminComment = false;

    switch (assessment.survey.surveyType) {
      case "i360":
      case "l360":
      case "culture":
      case "team180": {

        includeAdminComment = true && this.props.mode === 'admin';

        const enableComment = () => {
          that.setState({ comment_for_section: quality.id });
        };

        const staticContentProps = {
          canEdit: ["owner"],
          editRoles: ['USER', 'DEVELOPER'],
          viewMode: "minimal",
          autoSave: ['onChange'],
          throttle: 500,
          isEditing: true,
          showEditIcon: false,
          helpTopics: [`mores-assessment-help-personalized-comment-${api.utils.slugify(quality.title)}`],
          helpTitle: `Adding a comment to ${quality.title}`,
          mode: that.state.comment_for_section === quality.id ? "edit" : "view",
          title: `Section ${quality.title} Comment by ${assessment.assessor.firstName} ${assessment.assessor.lastName} on ${assessment.survey.title}`,
          slug: `mores-survey-${assessment.survey.id}-assessment_${assessment.id}-section_${quality.id}-assessor_${assessment.assessor.id}-CustomComment`,
          placeHolder: `Type here if you want add a comment for this section: ${quality.title}`,
        };

        /**
         * <StaticContent {...staticContentProps} />
         */

        const updateCustomContent = (evt) => {
          const content = evt.target.value;
          api.log(`Update Content For Custom Comment`, { content }, 'debug');

          api.graphqlMutation(gql`
            mutation ReactoryCreateContent($createInput: CreateContentInput!){
              ReactoryCreateContent(createInput: $createInput){
                id
                slug
                title
                content
                topics
                published
                createdBy {
                  id
                  fullName
                }
                createdAt
              }
            }
          `, {
            createInput: {
              slug: `mores-survey-${assessment.survey.id}-assessment_${assessment.id}-section_${quality.id}-assessor_${assessment.assessor.id}-CustomComment`,
              title: `Section ${quality.title} Comment by ${assessment.assessor.firstName} ${assessment.assessor.lastName} on ${assessment.survey.title}`,
              content: content,
              updatedAt: new Date().valueOf(),
              published: true
            }
          }).then((contentUpdateResult) => {
            api.log(`Result from Content Create Update`, { contentUpdateResult }, 'debug')
            const { data, errors } = contentUpdateResult;

          }).catch((exc) => {
            api.log(`Error Updating Custom Comment `, { exc }, 'error');
          });
        };

        const patchCustomContentState = evt => {
          that.setState({ qualityCustomComment: evt.target.value })
        }


        CustomFeedbackComponent = (
          <Paper>
            <TextField
              label={`Provide a custom comment for: ${quality.title}* [required]`}
              multiline
              InputLabelProps={{ shrink: true }}
              rows={4}
              onBlur={updateCustomContent}
              fullWidth={true}
              placeholder={`Type here if you want add a comment for this section: ${quality.title}`}
              value={qualityCustomComment}
              onChange={patchCustomContentState}
              variant="outlined"
              error={qualityCustomComment === null || qualityCustomComment === undefined || qualityCustomComment.length < 10}
              helperText="Ensure you add a custom comment that is at least 10 characters or longer."
            />
          </Paper>
        )
      }
    }

    const assessmetnInstructionsDefaultContent = (<Typography variant="caption" color="primary">*System Defined Behaviours for {quality.title} - These are mandatory and have to be completed.
    </Typography>)

    const contentId = `mores-assessments-instructions-${slugify(quality.id)}-survey-${survey.id}`;

    return (
      <Grid container spacing={8}>
        <Grid item sm={12} xs={12}>
          <StaticContent
            id={contentId}
            slug={contentId}
            title={`Mores Assessment Survey Instruction Header - ${survey.title} [${quality.title}]`}
            defaultValue={assessmetnInstructionsDefaultContent}
            viewMode='default'
            editAction='link'
          />
          {this.is180(assessment.survey) === true ? (<Typography variant="caption" color="primary">&nbsp;Provide ratings in context of the entire team <IconButton onClick={toggleShowTeam}><Icon>supervised_user_circle</Icon></IconButton></Typography>) : null}
          {this.is180(assessment.survey) === true ? this.getDelegateTeamList() : null}
          {behaviours}
          {customBehaviours.length > 0 ?
            <Fragment>
              <hr style={{
                marginBottom: `${this.props.theme.spacing(1)}px`,
                marginTop: `${this.props.theme.spacing(1)}px`
              }} />
              <Typography variant="caption" color="primary">Custom Behaviours for {quality.title} added by you</Typography>
              {customBehaviours}
            </Fragment> : null}

        </Grid>
        {CustomFeedbackComponent && <Grid item sm={12} xs={12}>
          {CustomFeedbackComponent}
        </Grid>}

        {includeAdminComment === true && <Grid item sm={12} xs={12}>
          {AdminActionInputComponent}
        </Grid>}
      </Grid>
    );
  }

  prevStep() {
    const that = this;
    if (that.state.step > 0) {
      const nextStepIndex = this.state.step - 1;
      this.setState({ step: nextStepIndex }, () => {
        if (nextStepIndex > 0) {
          that.loadCustomQualityComment();
        }
      });
    }

  }

  nextStep() {
    let maxSteps = this.props.assessment.survey.leadershipBrand.qualities.length + 2;
    if (this.state.step < maxSteps) {
      if (this.state.step == 0) this.startAssessment(); // TIMELINE ENTRY - ASSESSMENT STARTED
      const nextStepIndex = this.state.step + 1;
      this.setState({ step: nextStepIndex }, () => {
        window.scrollTo({ top: 0 })
        if (nextStepIndex < maxSteps - 1) {
          this.loadCustomQualityComment();
        }
      });
    }
  }

  setStep(event, step) {
    //console.log('Step change', step);
    this.setState({ step });
  }

  toolbar(content) {
    const alphaindex = 'A,B,C,D,E,F,G,H,I,J,K,L'.split(',');

    let tabs = [(<Tab key={'w'} label="Welcome" />)];
    this.props.assessment.survey.leadershipBrand.qualities.map((quality, kidx) => tabs.push(<Tab key={kidx} label={`${alphaindex[kidx]}. ${quality.title}`} style={{ cursor: 'default' }} />));
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
      this.props.history.push('/')
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
          Close
        </MenuItem>
      </Menu>);

    options.muiName = 'IconMenu';

    return options({ open: this.state.showMenu, anchorEl: this.state.anchorEl, cancelClicked: cancelAssessment, saveAndCloseAssessment: saveAndCloseAssessment, viewReport });
  }

  handleMenu(evt) {
    this.setState({ showMenu: !this.state.showMenu, anchorEl: evt.currentTarget })
  }

  currentStepValid() {
    const { mode } = this.props;
    const { assessment, step, qualityCustomComment } = this.state;

    if (mode === 'admin') return true;

    if (step === 0) return true;

    let maxSteps = assessment.survey.leadershipBrand.qualities.length + 2;
    if (step === maxSteps - 1) return false;

    const { ratings } = assessment;
    const quality = assessment.survey.leadershipBrand.qualities[step - 1];

    if (qualityCustomComment === null || qualityCustomComment === undefined || qualityCustomComment === "") {
      return false;
    }

    const invalidRatings = lodash.find(ratings, r => {

      let commentRequired = true;

      switch (assessment.survey.surveyType) {
        case "i360":
        case "l360":
        case "culture":
        case "team180": {
          commentRequired = false;
          break;
        }
      }

      if (commentRequired === true) return (r.quality.id === quality.id && r.rating <= 2) && (lodash.isEmpty(r.comment) === true || r.comment.length < 50);
      return (r.quality.id === quality.id && r.rating === 0)
    }) || [];

    if (invalidRatings.length === 0) return true;
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

    const is180 = this.is180(survey);

    let headerTitle = assessment.delegate ? `${api.getUserFullName(delegate)} - ${survey.title} ${selfAssessment === true ? ' [Self Assessment]' : ''}` : `Unknown`;
    if (is180 === true) {
      headerTitle = `180° Leadership Brand Assessment for the ${survey.delegateTeamName}`;
    }

    if (survey.surveyType === 'culture') {
      headerTitle = `${survey.title}`;
    }

    const isThankYou = step === maxSteps - 1;
    const { palette } = theme;

    const nextButtonStyle = {
      // backgroundColor: (step > 0 && isCurrentStepValid === false && isThankYou === false) ? 'unset' : palette.secondary.main,
    };

    let buttonColor = (step > 0 && isCurrentStepValid === false && isThankYou === false) ? "default" : "secondary";

    let nextText = 'NEXT';
    let showNext = true;
    let nextIcon = (<Icon>keyboard_arrow_right</Icon>)

    if (step > 0 && isCurrentStepValid === false && isThankYou === false) {
      nextText = 'INCOMPLETE';
      nextIcon = (<Icon>priority_high</Icon>);
    }

    if (step > 0 && isThankYou) {
      nextText = 'DONE'
      showNext = false;
      nextIcon = (<Icon>block</Icon>)
    }


    let nextButton = (<Tooltip title={isCurrentStepValid ? 'Click to proceed to the next section' : 'Complete all ratings and comments in full before proceeeding.'}>
      <Button
        size="large"
        variant={"contained"}
        size="small"
        color="secondary"
        onClick={nextStep}
        disabled={isCurrentStepValid === false || isThankYou === true}
        style={nextButtonStyle}
      >
        {nextText}{nextIcon}
      </Button></Tooltip>);


    return (
      <Grid container spacing={1} className={classes.card}>
        <Grid item xs={12} sm={12}>
          <Paper>
            <Grid container spacing={8}>
              <Grid item xs={12} sm={12}>
                <CardHeader
                  avatar={<Avatar src={api.getAvatar(delegate)} className={classNames(classes.delegateAvatar)} alt={assessment.delegateTitle}></Avatar>}
                  title={headerTitle}
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
        <Grid item xs={12} sm={12} style={{ marginBottom: '48px' }}>
          {wizardControl}
        </Grid>
        <Grid item xs={12} sm={12} md={12} lg={12}>

          <MobileStepper
            variant="dots"
            steps={maxSteps}
            position="bottom"
            activeStep={step}
            nextButton={
              nextButton}
            backButton={
              <Button variant="outlined" size="small" onClick={prevStep} disabled={step === 0}>
                {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
                Back
                </Button>
            }
          />
        </Grid>
      </Grid>
    );
  }

  static propTypes = {
    assessment: PropTypes.object,
    api: PropTypes.instanceOf(ReactoryApi),
    mode: PropTypes.objectOf(['assessor', 'delegate', 'admin'])
  };

  static defaultProps = {
    assessment: new Assessment(),
    mode: 'assessor'
  };


};

const DefaultViewComponent = compose(
  withApi,
  withRouter,
  withStyles(DefaultView.styles),
  withTheme
)(DefaultView);

export default DefaultViewComponent;

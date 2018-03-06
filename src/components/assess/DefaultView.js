import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {isNil} from 'lodash';
import classNames from 'classnames';
import {withStyles, withTheme} from 'material-ui/styles';
import Paper from 'material-ui/Paper';
import Button from 'material-ui/Button';
import Grid from 'material-ui/Grid';
import Avatar from 'material-ui/Avatar';
import TextField from 'material-ui/TextField';
import AppBar from 'material-ui/AppBar';
import Tabs, { Tab } from 'material-ui/Tabs';
import Stepper, { Step, StepButton } from 'material-ui/Stepper';
import ArrowForward from 'material-ui-icons/ArrowForward'
import Assessment, {Behaviour} from './Assessment';
import StaffImages from '../../assets/images/staff';
import {StyleHelper} from '../../themes';
import Tooltip from 'material-ui/Tooltip';

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
        paddingRight: '5px'
      },
      behaviourSelection :{
        fontSize: '18px',
        color: primaryColorLight
      }
    }
  };

  ratingClick( rating ) {
    this.props.onRatingChange(this.props.behaviour, rating);
  }

  commentChanged( evt ) {
    this.props.onCommentChange(this.props.behaviour, evt.target.value);
  }

  render() {
    const { behaviour, classes } = this.props;
    const self = this;
    let steps = [];

    for(let stepId = behaviour.scale.min; stepId <= behaviour.scale.max; stepId++){
      const doRatingClick = () => (self.ratingClick(stepId));
      steps.push((        
          <Step key={stepId}>
            <StepButton
              onClick={doRatingClick}
              completed={false}>              
            </StepButton>
          </Step>        
      ));
    }

    let commentControl = null;
    if( (behaviour.rating > 0 && behaviour.rating < 3) ){
      commentControl = (<TextField
        id="multiline-flexible"
        label="How does this impact you?"
        multiline
        fullWidth
        rowsMax="4"
        value={behaviour.comment}
        onChange={this.commentChanged}
        className={classes.textField}
        margin="normal"
        helperText="Provide some context as to how this affects you personally or your ability to perform your duties."
      />)      
    }

    let selectedLabel = behaviour.scale.labels[behaviour.rating-1] || 'None';

    return (
      <Grid item sm={12} xs={12}>
        <Paper className={classes.ratingContainer}>
          <p className={classes.behaviourTitle}>{behaviour.title}</p>          
          <Stepper alternativeLabel nonLinear activeStep={behaviour.rating-1}>
            {steps}
          </Stepper>
          <p  className={`${classes.behaviourTitle} ${classes.behaviourSelection}`}>Your Selection: {selectedLabel}</p>
          {commentControl}
        </Paper>
      </Grid>
    )
  }

  static propTypes = {
    behaviour: PropTypes.instanceOf(Behaviour),
    rating: PropTypes.number,
    comment: PropTypes.string,
    onRatingChange: PropTypes.func,
    onCommentChange: PropTypes.func,
  };

  static defaultProps = {
    behaviour: new Behaviour(),
    rating: 0,
    comment: '',
    onRatingChange: (rating)=>{ console.log('onRatingChange not implemented', rating); },
    onCommentChange: (comment)=> {console.log('onCommentChange not implemented', comment) }
  };

  constructor(props, context){
    super(props, context);
    this.ratingClick = this.ratingClick.bind(this);
    this.commentChanged = this.commentChanged.bind(this);
  }
}

export const RatingComponent = withStyles(RatingControl.styles)(withTheme()(RatingControl));

class DefaultView extends Component {

  static styles = (theme) => {
    const primaryColor = theme.palette.primary.main;
    const primaryColorLight = theme.palette.primary.light;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;


        
    return {
      card: {
        maxWidth: '765px',
        marginLeft: 'auto',
        marginRight: 'auto',
        ...StyleHelper.lrPadding(5)
      },
      media: {
        maxWidth: 375
      },
      button : {
        float:'right'
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
        ...StyleHelper.height(300)

      },      
      brandStatement: {
        color: primaryColor,
        fontWeight: 'lighter',
        fontStyle: 'italic'
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
        marginLeft: theme.spacing.unit,
        fontSize: theme.spacing.unit * 2.5
      },
      delegateBusinessUnit: {
        color: primaryColorLight,
        marginLeft: theme.spacing.unit,
        marginTop: '5px',
        marginBottom: '5px',
        fontSize: theme.spacing.unit * 1.5,
        fontWeight: 'bold'
      },
      delegateAvatar: {
        width: 60,
        height: 60
      },
      assessmentTitle: {
        width: '100%',
        textAlign: 'center'
      },
      paragraph: {
        textAlign: 'justify'
      }
    };
  };

  welcomeScreen() {
    const {classes, assessment} = this.props;
    return (
      <Paper className={classes.welcomeContainer}>
        <p className={classes.paragraph}>Thank you for taking the time to assess {assessment.delegateTitle}. This assessment should take approximately
          5 - 7 minutes.<br/>
          You will be asked to provide a rating against a series of behaviours that espouse the organizational
          leadership brand:</p>

        <blockquote className={`${classes.brandStatement} ${classes.paragraph}`}>"{assessment.survey.leadershipBrand.title}"</blockquote>        
      </Paper>
    )
  }

  thankYouScreen() {
    const {classes, assessment} = this.props;

    return (
      <div className={classes.welcomeContainer}>
        <h4 className={classes.welcomeHeader}>Welcome</h4>
        <p>Thank you for taking the time to assess {assessment.delegateTitle}.</p>
        <Button>Dashboard</Button>
        <Button>Complete the next available assessment</Button>
      </div>
    );
  }

  onBehaviourRatingChanged(behaviour, rating){
    console.log('Rating to be updated', {behaviour, rating});
    const { assessment } = this.state;
    assessment.survey.leadershipBrand.qualities.map((quality) => {
      if(quality.id === behaviour.qualityId){
        quality.behaviours.map((_behaviour) => {
          if(_behaviour.id === behaviour.id) _behaviour.rating = rating;
        });
      }
    });

    this.setState({assessment});
  }

  onBehaviourCommentChanged(behaviour, comment){
    console.log('Rating to be updated', {behaviour, comment});
    const { assessment } = this.state;
    assessment.survey.leadershipBrand.qualities.map((quality) => {
      if(quality.id === behaviour.qualityId){
        quality.behaviours.map((_behaviour) => {
          if(_behaviour.id === behaviour.id) _behaviour.comment = comment;
        });
      }
    });

    this.setState({assessment});
  }

  ratingScreen() {
    const {classes} = this.props;
    const {step, assessment} = this.state;
    const quality = assessment.survey.leadershipBrand.qualities[step - 1];
    const behaviours = quality.behaviours.map((behaviour) => (
      <RatingComponent
        behaviour={new Behaviour( {...behaviour, scale: assessment.survey.scales[0]} )}
        rating={0}
        comment={''}
        onRatingChange={this.onBehaviourRatingChanged}
      />
    ));
    return (
      <Grid container spacing={8}>
        <Grid item sm={12} xs={12}>          
          {behaviours}
        </Grid>
      </Grid>
    );
  }

  nextStep() {
    let maxSteps = this.props.assessment.survey.leadershipBrand.qualities.length + 2;
    if (this.state.step < maxSteps)
      this.setState({step: this.state.step + 1})
  }

  setStep(event, step){
    console.log('Step change', step);
    this.setState({step});
  }

  toolbar(content){
    let tabs = [(<Tab label="1. Welcome" />)];
    this.props.assessment.survey.leadershipBrand.qualities.map((quality)=> tabs.push(<Tab label={`${tabs.length+1}. ${quality.title}`}/>));
    tabs.push(<Tab label="Complete"/>);    
    return (
      <AppBar position="static" color="default">      
          <Tabs
            value={this.state.step}
            onChange={this.setStep}
            scrollable
            scrollButtons="on"
            indicatorColor="primary"
            textColor="primary"
          >
            {tabs}            
          </Tabs>
        </AppBar>
    )
  }

  render() {
    const {classes, theme} = this.props;
    const {step, valid, assessment} = this.state;
    const {nextStep, toolbar} = this;
    let wizardControl = null;
    let maxSteps = assessment.survey.leadershipBrand.qualities.length + 1;
    if (step === 0) wizardControl = this.welcomeScreen();
    if (step === maxSteps) wizardControl = this.thankYouScreen();
    if (nil(wizardControl) === true) wizardControl = this.ratingScreen();
    return (
      <Grid container spacing={16}>
        <Grid item xs={12} sm={12}>
          <div className={classes.assessmentTitle}>{assessment.survey.title}</div>                
        </Grid>
        <Grid item xs={12} sm={12}>        
          <Paper className={classes.card}>
            <Grid container spacing={8}>
              <Grid item xs={12} sm={12} className={classes.delegateContainer}>
                <Avatar src={StaffImages.TheaN} className={classNames(classes.delegateAvatar)} alt={assessment.delegateTitle}></Avatar>
                <div>
                  <p className={classes.delegateHeaderTitle}>{assessment.delegateTitle}</p>
                  <p className={classes.delegateBusinessUnit}>{assessment.delegate.businessUnit.title}</p>
                </div>
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
      </Grid>
    );
  }

  static propTypes = {
    assessment: PropTypes.instanceOf(Assessment)
  };

  static defaultProps = {
    assessment: new Assessment()
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      valid: true,
      step: 0,
      assessment: props.assessment
    };
    this.welcomeScreen = this.welcomeScreen.bind(this);
    this.thankYouScreen = this.thankYouScreen.bind(this);
    this.nextStep = this.nextStep.bind(this);
    this.ratingScreen = this.ratingScreen.bind(this);
    this.toolbar = this.toolbar.bind(this);
    this.setStep = this.setStep.bind(this);
    this.onBehaviourRatingChanged = this.onBehaviourRatingChanged.bind(this);
    this.onBehaviourCommentChanged = this.onBehaviourCommentChanged.bind(this);

  }
};

const DefaultViewComponent = DefaultView;
export default withStyles(DefaultViewComponent.styles)(withTheme()(DefaultViewComponent));


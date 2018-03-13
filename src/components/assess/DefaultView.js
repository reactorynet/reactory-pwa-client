import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import uuid from 'uuid';
import {isNil} from 'lodash';
import classNames from 'classnames';
import MobileStepper from 'material-ui/MobileStepper';
import Card, { CardHeader, CardMedia, CardContent, CardActions } from 'material-ui/Card';
import {withStyles, withTheme} from 'material-ui/styles';
import Typography from 'material-ui/Typography';
import Paper from 'material-ui/Paper';
import Button from 'material-ui/Button';
import Grid from 'material-ui/Grid';
import IconButton from 'material-ui/IconButton';
import Menu, { MenuItem } from 'material-ui/Menu';
import Avatar from 'material-ui/Avatar';
import TextField from 'material-ui/TextField';
import AppBar from 'material-ui/AppBar';
import Tabs, { Tab } from 'material-ui/Tabs';
import Input, { InputLabel } from 'material-ui/Input';
import { FormControl, FormHelperText } from 'material-ui/Form';
import Select from 'material-ui/Select';
import { ListItemIcon, ListItemText } from 'material-ui/List';
import Stepper, { Step, StepButton } from 'material-ui/Stepper';
import FavoriteIcon from 'material-ui-icons/Favorite';
import AddIcon from 'material-ui-icons/Add';
import ShareIcon from 'material-ui-icons/Share';
import ExpandMoreIcon from 'material-ui-icons/ExpandMore';
import MoreVertIcon from 'material-ui-icons/MoreVert';
import SaveIcon from 'material-ui-icons/Save';
import CancelIcon from 'material-ui-icons/Cancel';
import ArrowForward from 'material-ui-icons/ArrowForward';
import ArrowBackward from 'material-ui-icons/ArrowBack';
import Assessment, {Behaviour} from './Assessment';
import StaffImages from '../../assets/images/staff';
import {StyleHelper} from '../../themes';
import Tooltip from 'material-ui/Tooltip';
import KeyboardArrowLeft from 'material-ui-icons/KeyboardArrowLeft';
import KeyboardArrowRight from 'material-ui-icons/KeyboardArrowRight';

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
        color: primaryColorLight,
        paddingBottom: '20px',
        textAlign: 'center'
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
    if( (behaviour.rating > 0 && behaviour.rating < 3 || behaviour.custom === true) ){
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

    let selectedLabel = behaviour.scale.labels[behaviour.rating-1] || 'No rating selected';

    return (
      <Grid item sm={12} xs={12}>
        <Paper className={classes.ratingContainer}>
          <p className={classes.behaviourTitle}>{behaviour.title}</p>          
          <Stepper alternativeLabel nonLinear activeStep={behaviour.rating-1}>
            {steps}
          </Stepper>
          <p  className={`${classes.behaviourSelection}`}>{selectedLabel}</p>
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

  // #region style definition
  static styles = (theme) => {
    const primaryColor = theme.palette.primary.main;
    const primaryColorLight = theme.palette.primary.light;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;


        
    return {
      card: {
        width:'100%',
        maxWidth: '1024px',
        marginLeft: 'auto',
        marginRight: 'auto',        
        padding: theme.spacing.unit,        
        color: primaryColorLight,
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
        padding:'5px'
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
        height: 60,
        marginLeft: theme.spacing.unit
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
      stopActivityDescription : {
        color: theme.palette.text.primary,
        padding: theme.spacing.unit * 1.5
      },
      stopBehaviorTextFieldContainer : {
        marginLeft: theme.spacing.unit * 1.5,
        marginRight: theme.spacing.unit * 1.5,
        width: '100%'
      }
    };
  };
  // #endregion 

  welcomeScreen() {
    const {classes, assessment, theme} = this.props;
    const { nextStep, prevStep } = this;
    return (
      <Paper className={classes.welcomeContainer}>
        <Typography gutterBottom>Thank you for taking the time to assess {assessment.delegateTitle}. This assessment should take approximately
          5 - 7 minutes.<br/>
          You will be asked to provide a rating against a series of behaviours that espouse the organizational
          leadership brand:
            <blockquote className={`${classes.brandStatement} ${classes.paragraph}`}>"{assessment.survey.leadershipBrand.title}"</blockquote>     
        </Typography>
        <div style={{display:'flex', justifyContent: 'center'}}>
          <img src={theme.assets.login.logo} className={classes.logo} alt={theme}/>       
        </div>        
      </Paper>
    )
  }

  thankYouScreen() {
    const {classes, assessment, history} = this.props;
    
    const gotoDashboard = () => {
      history.push("/");
    }

    return (
      <Paper className={classes.welcomeContainer}>        
        <Typography gutterBottom>Thank you for taking the time to assess {assessment.delegateTitle}.</Typography>
        <Button onClick={gotoDashboard}>Dashboard</Button>
        <Button>Complete the next available assessment</Button>
      </Paper>
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

  onNewBehaviour(quality, behaviour){    
    console.log('Adding a new Quality', {quality, behaviour});
    const { assessment } = this.state;
    const that = this;
    assessment.survey.leadershipBrand.qualities.map((q) => {
      if(quality.id === q.id){
        q.behaviours.push({ 
          id: uuid(),
          title: behaviour, 
          custom: true,           
          scale: assessment.survey.scale,
          required: false,
          ordinal: quality.behaviours.length,
          qualityId: q.id,
          comment: ''
        });
      }
    });

    that.setState({ assessment, newBehaviourText: '' });
  }

  ratingScreen() {
    const that = this;
    const { classes } = this.props;    
    const { step, assessment, newBehaviourText } = this.state;
    const { delegate } = assessment;
    const quality = assessment.survey.leadershipBrand.qualities[step - 1];
    const behaviours = quality.behaviours.map((behaviour) => (
      <RatingComponent
        behaviour={new Behaviour( {...behaviour, scale: assessment.survey.scales[0]} )}
        rating={0}
        comment={''}
        onRatingChange={this.onBehaviourRatingChanged}
      />
    ));

    const setNewBehaviourText = (evt) => {
      that.setState({ newBehaviourText: evt.target.value });
    };

    const onNewBehaviourClicked = (evt) => {
      that.onNewBehaviour(quality, newBehaviourText);      
    };

    return (
      <Grid container spacing={8}>
        <Grid item sm={12} xs={12}>          
          {behaviours}          
        </Grid>
        <Grid item sm={12} xs={12}>
          <Paper style={{padding:'5px'}}>
             <Typography>
               If you want to provide a customized behaviour that {delegate.firstName} exhibits that relates to {quality.title} click the add button and provide your rating and feedback.<br/><br/>
               Please note, these custom ratings will not affect the calculation of {delegate.firstName} overall rating for this assessment.
             </Typography>             
             <TextField                 
                fullWidth 
                helperText='Add a short behavior description' 
                label={'Custom Behaviour'} 
                onChange={setNewBehaviourText}/>
                <div style={{display:'flex', justifyContent:'flex-end'}}> 
                  <Button onClick={onNewBehaviourClicked} variant='raised' color='primary'><AddIcon />Add Custom Behaviour</Button>                   
                </div>
          </Paper>
        </Grid>
      </Grid>
    );
  }

  prevStep(){    
    if (this.state.step > 0)
      this.setState({step: this.state.step - 1});
  }

  nextStep() {
    let maxSteps = this.props.assessment.survey.leadershipBrand.qualities.length + 2;
    if (this.state.step < maxSteps)
      this.setState({step: this.state.step + 1});
  }

  setStep(event, step){
    console.log('Step change', step);
    this.setState({step});
  }

  toolbar(content){
    let tabs = [(<Tab label="Welcome" />)];
    this.props.assessment.survey.leadershipBrand.qualities.map((quality)=> tabs.push(<Tab label={`${tabs.length}. ${quality.title}`}/>));
    tabs.push(<Tab label="Complete"/>);    
    return (
      <AppBar position="static" color="default">      
          <Tabs
            value={this.state.step}
            onChange={this.setStep}
            scrollable
            scrollButtons="on"
            indicatorColor="primary"
            textColor="primary">
            {tabs}            
          </Tabs>
      </AppBar>
    )
  }

  stopActivities(){
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

  assessmentOptions(){

    const cancelAssessment = () => {

    };

    const saveAndCloseAssessment = () => {

    };

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
          <MenuItem onClick={ props.cancelClicked }>
              <ListItemIcon><CancelIcon/></ListItemIcon>
              <ListItemText inset primary="Cancel assessment" />
          </MenuItem>
          <MenuItem onClick={ props.saveAndCloseClicked }>
              <ListItemIcon><SaveIcon /></ListItemIcon>
              <ListItemText inset primary="Save Progress and close" />        
          </MenuItem>
  
      </Menu>);
  
    options.muiName = 'IconMenu';

    return options({open: this.state.showMenu, anchorEl: this.state.anchorEl, cancelClicked: cancelAssessment, saveAndCloseAssessment: saveAndCloseAssessment});
  }

  handleMenu(evt){
    this.setState({ showMenu: !this.state.showMenu, anchorEl: evt.currentTarget })
  }

  render() {
    const { classes, theme } = this.props;
    const { step, valid, assessment, showMenu } = this.state;
    const { nextStep, toolbar, assessmentOptions, handleMenu, prevStep } = this;
    let wizardControl = null;
    let maxSteps = assessment.survey.leadershipBrand.qualities.length + 2;
    if (step === 0) wizardControl = this.welcomeScreen();
    if (step === maxSteps - 1) wizardControl = this.thankYouScreen();
    if (nil(wizardControl) === true) wizardControl = this.ratingScreen();
    return (
      <Grid container spacing={16} className={classes.card}>        
        <Grid item xs={12} sm={12}>        
          <Paper>
            <Grid container spacing={8}>
              <Grid item xs={12} sm={12}>
                <CardHeader  
                  avatar={<Avatar src={StaffImages.TheaN} className={classNames(classes.delegateAvatar)} alt={assessment.delegateTitle}></Avatar>}
                  title={assessment.delegateTitle}
                  subheader={assessment.delegate.businessUnit.title}
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
              variant="dots"
              steps={maxSteps}
              position="static"
              activeStep={step}            
              nextButton={
                <Button size="small" onClick={nextStep} disabled={step === maxSteps}>
                  Next{theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
                </Button>
              }
              backButton={
                <Button size="small" onClick={prevStep} disabled={step === 0}>
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

  }
};

const DefaultViewComponent = compose(
  withRouter,
  withStyles(DefaultView.styles),
  withTheme()
)(DefaultView);
export default DefaultViewComponent;



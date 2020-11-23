import React, { Component } from 'react';
import PropTypes from 'prop-types';
import gql from 'graphql-tag';
import { compose } from 'redux';
import { Query, Mutation } from '@apollo/client/react/components';
import { withApollo } from '@apollo/client/react/hoc';
import {
  Avatar,
  Button,
  Card, CardActions,
  CardHeader, CardContent,
  Collapse, Checkbox,
  IconButton,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Input,
  InputLabel,
  FormHelperText,
  FormControl,
  Select,    
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Typography,
} from '@material-ui/core';
import AddCircleIcon from '@material-ui/icons/AddCircle'
import DeleteIcon from '@material-ui/icons/DeleteSweep'
import DetailIcon from '@material-ui/icons/Details'
import SaveIcon from '@material-ui/icons/Save'
import CopyIcon from '@material-ui/icons/ControlPoint'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import CheckCircle from '@material-ui/icons/CheckCircle'
import CloseIcon from '@material-ui/icons/Close'
import KeyboardArrowDown from '@material-ui/icons/KeyboardArrowDown'
import KeyboardArrowUp from '@material-ui/icons/KeyboardArrowUp'

import { withTheme, withStyles } from '@material-ui/core/styles';
import { isArray, pullAt, isNil } from 'lodash'
import { TableFooter } from '@material-ui/core/Table';
// import { select } from 'async';
import { withApi } from '../../api/ApiProvider';
import { ReactoryApi } from "../../api/ReactoryApi";
import { omitDeep } from '../util';
const nilf = () => ({})

const newBehaviour = {
  title: null,
  description: null,
  ordinal: 1
}

const newQuality = {
  title: null,
  description: null,
  ordinal: 1,
  behaviours: []
}

export const newBrand = {
  id: null,
  title: null,
  scale: null,
  description: null,
  qualities: [{ ...newQuality }]
}



class QualityCard extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      updated: false,
      dirty: false,
      quality: props.quality || newQuality,
      behaviourIndex: 0,
      expanded: false
    };

    this.patchTitle = this.patchTitle.bind(this)
    this.patchDescription = this.patchDescription.bind(this)
    this.addBehaviour = this.addBehaviour.bind(this)
    this.cancelEditBehaviour = this.cancelEditBehaviour.bind(this)
    this.deleteBehaviour = this.deleteBehaviour.bind(this)
    this.sendQualityUpdated = this.sendQualityUpdated.bind(this)
    this.patchBehaviourDescription = this.patchBehaviourDescription.bind(this)
  }

  componentWillUnmount(){
    this.sendQualityUpdated()
  }

  static styles = (theme) => {
    return {
      card: {},
      avatar: {
        margin: 10
      }
    }
  }

  patchTitle = (evt) => {
    this.setState({ quality: { ...this.state.quality, title: evt.target.value }, dirty: true })
  }

  patchDescription = (evt) => {
    this.setState({ quality: { ...this.state.quality, description: evt.target.value }, dirty: true })
  }

  patchBehaviourTitle = (evt) => {
    let _behaviours = [...this.state.quality.behaviours]
    _behaviours[this.state.behaviourIndex].title = evt.target.value
    this.setState({ quality: { ...this.state.quality, behaviours: _behaviours }, dirty: true });
  }

  patchBehaviourDescription = (evt) => {
    let _behaviours = [...this.state.quality.behaviours]
    _behaviours[this.state.behaviourIndex].description = evt.target.value
    this.setState({ quality: { ...this.state.quality, behaviours: _behaviours }, dirty: true },);
  }

  addBehaviour = (evt) => {
    let _behaviours = [...this.state.quality.behaviours, { ...newBehaviour }]
    this.setState({ quality: { ...this.state.quality, behaviours: _behaviours }, behaviourIndex: _behaviours.length - 1, dirty: true }, this.sendQualityUpdated)
  }

  editBehaviour = (behaviour, index) => {
    this.setState({ behaviourIndex: index })
  }

  toggleQualityDetail = (evt) => {
    this.setState({ expanded: !this.state.expanded })
  }

  cancelEditBehaviour = (evt) => {
    this.setState({ behaviourIndex: null })
  }

  deleteBehaviour = () => {
    let behaviours = [...this.state.quality.behaviours];
    pullAt(behaviours, this.state.behaviourIndex)
    this.setState({ quality: { ...this.state.quality, behaviours }, dirty: true }, this.sendQualityUpdated)
  }

  sendQualityUpdated(){
    if(this.props.updated) this.props.updated(this.state.quality)
  }

  render() {
    const self = this;
    const { classes } = this.props;
    const { quality, behaviourIndex } = this.state;
    const { behaviours } = quality;  
    const avatar = (<Avatar className={classes.avatar} onClick={self.toggleQualityDetail}>{quality.ordinal+1}</Avatar>)
    const action = (<IconButton><MoreVertIcon /></IconButton>)
    const title = (<Typography variant='subheading'>{quality.title}</Typography>)
    return (
      <Card className={classes.card}>
        <CardHeader
          onClick={self.toggleQualityDetail}
          avatar={avatar}
          title={title}
          action={action}
          style={{cursor: 'pointer'}}        
        />        
        <CardContent>
          <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>
            <Grid container>
              <Grid item xs={12}>
                <TextField title={'Title'}
                  value={quality.title}
                  placeholder="Provide a title for this quality"
                  onChange={this.patchTitle}
                  onBlur={this.sendQualityUpdated}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl  fullWidth={true}>
                  <InputLabel htmlFor="qualityDescription">Quality Description</InputLabel>
                  <Input fullWidth={true} id="qualityDescription" onBlur={this.sendQualityUpdated} multiline rowsmax={5} value={quality.description} onChange={this.patchDescription} />                
                </FormControl>                
              </Grid>
              <Grid item xs={12}>
                <Typography variant={'subheading'} style={{marginTop:'10px'}}>Behaviours</Typography>
                <Grid item xs={12}>
                  <List>
                    {
                      behaviours.map((behaviour, index) => {
                        const editBehaviour = () => {
                          self.editBehaviour(behaviour, index);
                        };

                        const updateDescription = (evt) => {
                          let _behaviours = [...behaviours];
                          _behaviours[index].description = evt.target.value
                          self.setState({quality: {...self.state.quality, behaviours: _behaviours}})
                        }

                        const moveUp = () => {
                          if(index > 0){
                            let previous = behaviours[index-1];
                            previous.ordinal = behaviour.ordinal
                            let _behaviour = { ...behaviour, ordinal: index -1 }
                            let _behaviours = [...behaviours];
                            behaviours[index - 1] = _behaviour;
                            behaviours[index] = previous;

                            self.setState({quality: {...self.state.quality, behaviours: _behaviours}}, self.sendQualityUpdated)
                          }
                        }

                        const moveDown = () => {
                          if(index < behaviours.length - 1){
                            let next = behaviours[index+1];
                            next.ordinal = behaviour.ordinal
                            let _behaviour = { ...behaviour, ordinal: index + 1 }
                            let _behaviours = [...behaviours];
                            behaviours[index + 1] = _behaviour;
                            behaviours[index] = next;

                            self.setState({quality: {...self.state.quality, behaviours: _behaviours}}, self.sendQualityUpdated)
                          }
                        }

                        let control = null
                        if (index === behaviourIndex) {                        
                          control = (
                            <Paper elevation={4} style={{ padding: '10px', width: '100%' }}>                              
                              <form>                                
                                {!isNil(behaviours[index]) ? (
                                <FormControl  fullWidth={true} aria-describedby="LeadershipBrandStatementHelper">
                                  <InputLabel htmlFor="behaviourDescription" >Behavior</InputLabel>
                                  <Input fullWidth={true} id="qualityDescription" onBlur={this.sendQualityUpdated} value={behaviour.description} onChange={updateDescription} multiline rowsmax={5}  />
                                  <FormHelperText id="LeadershipBrandStatementHelper">Provide a behavior description</FormHelperText>                
                                </FormControl>                                  
                                ) : null}
                              </form>
                              <IconButton onClick={moveUp}><KeyboardArrowUp /></IconButton>
                              <IconButton onClick={moveDown}><KeyboardArrowDown /></IconButton>
                              <IconButton onClick={self.cancelEditBehaviour}><CloseIcon /></IconButton>
                              <IconButton onClick={self.deleteBehaviour}><DeleteIcon /></IconButton>
                            </Paper>
                          )
                        }

                        if (isNil(control) === false) {
                          return control
                        } else return (
                          <ListItem key={index} dense button onClick={editBehaviour}>
                            <ListItemText primary={behaviour.description  || 'Not set'} secondary={'Click to edit'} />
                          </ListItem>)
                      })}
                  </List>
                  <Button onClick={this.addBehaviour}><AddCircleIcon />&nbsp;NEW BEHAVIOUR</Button>
                </Grid>
              </Grid>
            </Grid>          
          </Collapse>
        </CardContent>        
        <CardActions>
          <IconButton onClick={this.props.moveup || nilf }><KeyboardArrowUp /></IconButton>
          <IconButton onClick={this.props.movedown || nilf }><KeyboardArrowDown /></IconButton>
          <IconButton onClick={this.props.deleted || nilf } ><DeleteIcon /></IconButton>
        </CardActions>
      </Card>
    );

  }
}

const QualityCardComponent = compose(
  withTheme,
  withStyles(QualityCard.styles),
)(QualityCard)

const ScaleSelector = compose(withApi) (( props, context ) => {
  const { api, onChange, selectedKey } = props;
  return (
    <Query query={api.queries.Surveys.allScales}>
    {({ loading, error, data }) => {
      if (loading) return "Loading...";
      if (error) return `Error! ${error.message}`;

      return (
        <Select name="Scale" onChange={onChange} value={selectedKey}>
          {data.allScales.map(scale => (
            <option key={scale.id} value={scale.id}>
              {scale.title}
            </option>
          ))}
        </Select>
      );
    }}
  </Query>
  )  
});

export class BrandEdit extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      editBrand: props.leadershipBrand || { ...newBrand }
    };

    this.onTitleChanged = this.onTitleChanged.bind(this);
    this.onDescriptionChanged = this.onDescriptionChanged.bind(this);
    this.onNewQuality = this.onNewQuality.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onSave = this.onSave.bind(this);
    this.onScaleSelect = this.onScaleSelect.bind(this);
  }

  static styles = (theme) => {
    return {

    }
  }

  onTitleChanged = (evt) => this.setState({ editBrand: { ...this.state.editBrand, title: evt.target.value } });
  onDescriptionChanged = (evt) => this.setState({ editBrand: { ...this.state.editBrand, description: evt.target.value } });
  onNewQuality = (evt) => this.setState({ editBrand: { ...this.state.editBrand, qualities: [...this.state.editBrand.qualities, { ...newQuality, ordinal: this.state.editBrand.qualities.length + 1 }] } })
  onScaleSelect = (evt, option) => { 
    //console.log('survey type change', option)    
    this.setState({editBrand: { ...this.state.editBrand, scale: option.props.value }});
  }

  onCancel = (evt) => {
    if(this.props.onCancel) this.props.onCancel()    
  }

  onCopy = (evt) => {

  }

  editQualityClick = () => {

  }

  onSave = (evt) => {    
    if(this.props.mode === 'new'){
      if(this.props.onCreate) this.props.onCreate(this.state.editBrand)      
    } else {
      if(this.props.onSave) this.props.onSave(this.state.editBrand)
    }
  }

  render() {
    const self = this;
    const { id, title, description, qualities, scale } = this.state.editBrand;
    const { classes, mode, scales } = this.props;
    const isNew = mode === 'new'

    return (
      <Paper style={{ padding: '5px' }}>
        <Typography variant={'headline'}>{isNew ? 'Edit' : 'Create'} Leadership Brand: {title}</Typography>
        <form>
          <Grid container>
            <Grid item xs={12}>
              <TextField
                value={title} onChange={this.onTitleChanged}
                name={'Title'} label={'Title'}
                fullWidth={true}
                required
                helperText='Title for the leadership brand'
              />

              <FormControl className={classes.formControl} fullWidth aria-describedby="LeadershipBrandStatementHelper">
                <InputLabel fullWidth htmlFor="LeadershipBrandStatement">Brand Statement</InputLabel>
                <Input id="LeadershipBrandStatement" required multiline rowsmax={5} value={description} onChange={this.onDescriptionChanged} />
                <FormHelperText id="LeadershipBrandStatementHelper">Enter the leadership brand statement</FormHelperText>
              </FormControl> 

              <FormControl fullWidth className={classes.formControl}>
                <InputLabel htmlFor="assessmentScale">Assessment Scale</InputLabel>
                <ScaleSelector onChange={this.onScaleSelect} selectedKey={scale ? scale : null }/>                
              </FormControl>   
            </Grid>            
            <Grid item xs={12}>
              {
                qualities.map((quality, qi) => {
                  const patchQuality = (patched) => {

                    let qualities = [...self.state.editBrand.qualities]
                    qualities[qi] = { ...self.state.editBrand.qualities[qi], ...patched }
                    self.setState({ editBrand: { ...self.state.editBrand, qualities }, dirty: true })
                  };

                  const deleteQuality = () => {
                    let qualities = [...self.state.editBrand.qualities]
                    pullAt(qualities, qi)
                    self.setState({ editBrand: { ...self.state.editBrand, qualities } })
                  };

                  const moveUp = () => {
                    if(qi > 0){
                      let qualities = [...self.state.editBrand.qualities]
                      let updated = { ...quality, ordinal: qi - 1 }
                      let next = { ...qualities[qi-1], ordinal: qi } 
                      qualities[qi] = next
                      qualities[qi-1] = updated                                           
                      self.setState({ editBrand: { ...self.state.editBrand, qualities } })
                    }
                  }

                  const moveDown = () => {
                    let qualities = [...self.state.editBrand.qualities]
                    if(qi < qualities.length - 1){                      
                      let updated = { ...quality, ordinal: qi + 1 }
                      let next = { ...qualities[qi + 1], ordinal: qi }
                      qualities[qi] = next
                      qualities[qi+1] = updated                      
                      self.setState({ editBrand: { ...self.state.editBrand, qualities } })
                    }
                  }

                  return (<QualityCardComponent key={quality.id} quality={quality} updated={patchQuality} deleted={deleteQuality} moveup={moveUp} movedown={moveDown} />);
                })
              }
            </Grid>
            <Grid item xs={12}>
              <Button onClick={this.onSave}><SaveIcon />&nbsp;{ isNew ? 'CREATE' : 'SAVE'}</Button>
              { !isNew ? <Button onClick={this.onCopy}><CopyIcon />&nbsp;COPY</Button> : null }
              <Button onClick={this.onNewQuality}><AddCircleIcon />&nbsp;NEW QUALITY</Button>
              <Button onClick={this.onCancel}><CloseIcon />&nbsp;CANCEL</Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    )
  }
}

BrandEdit.propTypes = {
  leadershipBrand: PropTypes.object,
  mode: PropTypes.string,
  scales: PropTypes.array
};

BrandEdit.defaultProps = {
  mode: 'new',
  leadershipBrand: {
    id: null,
    title: '',
    description: '',
    qualities: []
  }  
};



export const BrandEditComponent = compose(
  withTheme,
  withStyles(BrandEdit.styles),
)(BrandEdit);


export const CreateBrand = compose(
  withApi
)((props, context) => {
  const { api, leadershipBrand, onCancel, organizationId  } = props

  return (
    <Mutation mutation={api.mutations.Organization.createBrand}>
      {(createBrand, { data }) => {

        const create = (leadershipBrand) => {
          createBrand({variables: { 
            brandInput: { ...leadershipBrand, organizationId },
            organizationId
          }})
        };

        return <BrandEditComponent leadershipBrand={omitDeep(leadershipBrand)} organizationId={organizationId} onCreate={create} mode='new' onCancel={onCancel}/>
      }}
    </Mutation>
  )
})

export const EditBrand = compose(
  withApi
)((props, context) => {
  const { api, leadershipBrand, onCancel, organizationId  } = props

  return (
    <Mutation mutation={api.mutations.Organization.updateBrand}>
      {(updateBrand, { data }) => {

        const update = (leadershipBrand) => {
          updateBrand({variables: omitDeep({ 
            brandInput: { ...leadershipBrand, organizationId },
            organizationId
          }, '__typename')})
        };

        return <BrandEditComponent leadershipBrand={omitDeep(leadershipBrand)} organizationId={organizationId} onSave={update} mode='edit' onCancel={onCancel}/>
      }}
    </Mutation>
  )
})

/**
 * List component for user entries
 * @param {*} param0 
 */
const BrandList = ({organizationId, api, onSelect = nilf, onNewSelected = nilf, selectionOnly = false, selected}) => {  
  return (
  <Query query={api.queries.Organization.leadershipBrands} variables={{organizationId}}>
    {({ loading, error, data }) => {
      const brandListForOrganization = data ? data.brandListForOrganization : undefined

      if (loading === true) {
        return <p>Loading ...</p>;
      }
  
      if (error) {
        return <p>{error.message}</p>;
      }
                                    
      let brands = brandListForOrganization || []
      return (      
        <List>
          {brands.map((brand, index) => {
            const selectBrand = () => {
              onSelect(brand)
            }            
            const isSelected = selected === brand.id
                 
            return (
              <ListItem key={brand.id} dense button>
                <ListItemText primary={brand.title} />
                <Checkbox
                  checked={isSelected}
                  tabIndex={-1}
                  disableRipple
                  onClick={selectBrand} />
              </ListItem>)
          })}
          {selectionOnly === false ? (<ListItem key={brands.length+1} dense button onClick={onNewSelected}>
            <ListItemText primary={'NEW BRAND'} secondary={'Click here to create a new leadership brand'} />
          </ListItem>) : null }          
          
        </List>      
        );
    }}
  </Query>

)};


BrandList.propTypes = {
  organizationId: PropTypes.string,
  data: PropTypes.object,
  api: PropTypes.instanceOf(ReactoryApi).isRequired
};

BrandList.defaultProps = {
  organizationId: null,
  data: {
    loading: true,
    error: null,
    brandListForOrganization: []
  }
};


export const BrandListWithData = compose(
  withTheme,
  withApi  
)(BrandList);

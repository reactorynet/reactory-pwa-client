import moment from 'moment';
import uuid from 'uuid';
import PropTypes from 'prop-types';
import {isNil} from 'lodash';

let defaultInstance = require("./defaultInstance.json");
defaultInstance.id = uuid();
defaultInstance.survey.leadershipBrand.qualities.map((quality)=> {
  quality.id = uuid();
  quality.behaviours.map((behaviour)=>{
    behaviour.qualityId = quality.id;
    behaviour.id = uuid();
  });
});
const nil = isNil;


export class Behaviour {
  constructor(instanceData = { title: '', scale: null, required: true, ordinal: 0, id: '', qualityId: ''}) {
    this._title = instanceData.title;
    this._qualityId = instanceData.qualityId;
    this._scale = instanceData.scale;
    this._required = instanceData.required === true;
    this._ordinal = instanceData.ordinal;
    this._rating = instanceData.rating;
    this._comment = instanceData.comment;
    this._id = instanceData.id || uuid();
    this._custom = instanceData.custom || false;
  }


  get title() {
    return this._title;
  }

  set title(value) {
    this._title = value;
  }

  get scale() {
    return this._scale;
  }

  set scale(value) {
    this._scale = value;
  }

  get required() {
    return this._required;
  }

  set required(value) {
    this._required = value;
  }

  get ordinal() {
    return this._ordinal;
  }

  set ordinal(value) {
    this._ordinal = value;
  }

  get id() {
    return this._id;
  }

  set id(value) {
    this._id = value;
  }

  get qualityId() {
    return this._qualityId;
  }

  set qualityId(value) {
    this._qualityId = value;
  }


  get rating() {
    return this._rating;
  }

  set rating(value) {
    this._rating = value;
  }

  get comment() {
    return this._comment;
  }

  set comment(value) {
    this._comment = value;
  }

  get custom() {
    return this._custom;
  }

  set custom(value) {
    this._custom = value;
  }
}

export class Survey {
  constructor(defaultSurveyInstance = defaultInstance.survey) {
    this._title = defaultSurveyInstance.title;
    this._leadershipBrand = defaultSurveyInstance.leadershipBrand;
    this._scales = defaultSurveyInstance.scales;
    this._theme = defaultSurveyInstance.theme;
  }

  get title() {
    return this._title;
  }

  set title(value) {
    this._title = value;
  }

  get leadershipBrand() {
    return this._leadershipBrand;
  }

  set leadershipBrand(value) {
    this._leadershipBrand = value;
  }

  get scales() {
    return this._scales;
  }

  set scales(value) {
    this._scales = value;
  }

  get theme() {
    return this._theme;
  }

  set theme(value) {
    this._theme = value;
  }

  static SurveyTypes = {
    //enum: ['180', '360', 'plc', 'custom'],
    TowerStone180: '180',
    TowerStone360: '360',
    PLCDefault: 'plc',
    Custom: 'custom'
  }

  toJSON(){
    return {
      title: this.title,
      leadershipBrand: this.leadershipBrand,
      scales: this.scales,
      theme: this.theme
    }
  }
}

export default class Assessment {

  get id() {
    return this.m_id;
  }

  set id(value) {
    this.m_id = value;
  }

  get assessor() {
    return this.m_assessor;
  }

  set assessor(value) {
    this.m_assessor = value;
  }

  get assessorTitle() {
    if (nil(this.assessor) === false) {
      return `${this.assessor.firstName} ${this.assessor.lastName}`
    } else {
      return 'NO ASSESSOR SET';
    }
  }

  get delegate() {
    return this.m_delegate;
  }

  set delegate(value) {
    this.m_delegate = value;
  }

  get delegateTitle() {
    if (nil(this.delegate) === false) {
      return `${this.delegate.firstName} ${this.delegate.lastName}`
    } else {
      return 'NO DELEGATE SET';
    }
  }

  get validFrom() {
    return this.m_validFrom;
  }

  set validFrom(value) {
    this.m_validFrom = moment(value);
  }

  get validTill() {
    return this.m_validTill;
  }

  set validTill(value) {
    this.m_validTill = moment(value);
  }

  get survey() {
    return this.m_survey;
  }

  set survey(value) {
    this.m_survey = value;
  }

  get answers() {
    return this.m_answers;
  }

  set answers(value) {
    this.m_answers = value;
  }

  static propTypes = {
    id: PropTypes.string.isRequired,
    assessor: PropTypes.object,
    delegate: PropTypes.object,
    validFrom: PropTypes.instanceOf(moment).isRequired,
    validTill: PropTypes.instanceOf(moment).isRequired,
    survey: PropTypes.object,
    answers: PropTypes.object
  };

  static defaultProps = {...defaultInstance};

  constructor(props = defaultInstance) {
    this.id = props.id;
    this.assessor = props.assessor;
    this.delegate = props.delegate;
    this.validFrom = moment(props.validFrom);
    this.validTill = moment(props.validTill);
    this.survey = props.survey;
    this.answers = props.ratings;
  }
}
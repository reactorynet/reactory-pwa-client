import React, { PureComponent } from 'react';

const defaultUser = {
  __isnew: true,
  firstName: '',
  lastName: '',
  email: '',
  businessUnit: '',
  peers: {
      peers: []
  },
  avatar: null,
};

export default class User {
  constructor(user = defaultUser){
    this.$isNew = user.isNew || true;    
    this.$isSelected = user.isSelected || false;
    this.$isDirty = user.isDirty || false;
    
    this.$id = user.id || "";
    this.$firstName = user.firstName;
    this.$lastName = user.lastName;
    this.$email = user.email;
    this.$businessUnit = user.businessUnit;
    this.$avatar = user.avatar;
  }

  get firstName(){ return this.$firstName; }
  set firstName(value){ this.$firstName = value; }

  get lastName() { return this.$lastName; }
  set lastName(value) { this.$lastName = value }

  get email() { return this.$email; }
  set email(value) { this.$lastName = value }

  get avatar() { return this.$avatar; }
  set avatar(value) { this.$lastName = value; }

  get businessUnit() { return this.$businessUnit; }
  set businessUnit(value) { this.$businessUnit = value; }
}

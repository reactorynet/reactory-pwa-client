import { Typography } from '@mui/material'
import React, { Component } from 'react'

const UnsupportedField = (props) => (
<Typography>
  Field {props.schema.title} type "{props.schema.type}" not supported by the Material UI Package
</Typography>)

export default UnsupportedField;
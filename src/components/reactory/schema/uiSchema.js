import React from 'react'

const isFilled = (fieldName) => ({ formData }) => (formData[fieldName] && formData[fieldName].length) ? true : false
const isTrue = (fieldName) => ({ formData }) => (formData[fieldName])

const complexUiSchema = {
  'ui:field': 'layout',
  'ui:layout': [
    {
      firstName: { md: 6 },
      lastName: { md: 6, doShow: isFilled('firstName') }
    }, {
      image: { md: 3, doShow: isFilled('lastName')  },
      user: { md: 9 ,  doShow: isFilled('lastName') }
    }, {
      details: { md: 12 }
    }, {
      'description': {
        md: 12,
        doShow: isFilled('lastName'),
        render: (props) => {
          const { formData, errorSchema } = props
          const { firstName, lastName } = formData

          return (
            <div>
              <h3>Hello, {firstName} {lastName}!</h3>
              <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sad</p>
            </div>
          )
        }
      }
    }, {
      age: { md: 12, doShow: isTrue('details') }
    }, {
      bio: { md: 12, doShow: isTrue('details')  }
    }
  ],
  'bio': {
    'ui:widget': 'textarea'
  },  
  'user': {
    'ui:field': 'layout',
    'ui:layout': [
      { username: { md: 12 } }, { password: { md: 12 } },
    ],
  }
}

export default [
  {
    id: 'complex',
    schema: complexUiSchema
  }
];

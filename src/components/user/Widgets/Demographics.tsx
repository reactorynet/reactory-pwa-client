'use strict'
import React from 'react';
import MoresMyPersonalDemographics from "../../organization/forms/MyPersonalDemographics";
import schema from "../../organization/forms/MyPersonalDemographics/schema";
import { withApi } from '@reactory/client-core/api';
import $uiSchema, {
  ageUISchema,
  raceUISchema,
  genderUISchema,
  pronounUISchema,
  positionUISchema,
  businessUnitUISchema,
  operationalGroupUISchema,
  teamUISchema,
  regionUISchema,
} from "../../organization/forms/MyPersonalDemographics/uiSchema";

const Demographics = (props: any) => {

  debugger;

  const { reactory, organisationId, user, membership } = props;
  const { id, memberships = [] } = user
  const { ReactoryForm, MaterialCore, MaterialStyles } = reactory.getComponents([
    "core.ReactoryForm",
    "material-ui.MaterialCore",
    "material-ui.MaterialStyles"
  ]);
  const { Button, Typography } = MaterialCore
  const { makeStyles } = MaterialStyles
  const classes = makeStyles((theme) => {
    return {
      button_container: {
        display: 'flex',
        justifyContent: 'flex-end',
        paddingBottom: '26px',
        marginTop: '20px',
        marginRight: '26px',
        '& button': {
          padding: '10px 30px',
        },
      },
    }
  })()

  const [demographicsEnabled, setDemographicState] = React.useState({
    age: false,
    gender: false,
    race: false,
    position: false,
    region: false,
    operationalGroup: false,
    businessUnit: false,
    teams: false,
  });

  /**
   * 
   * @param formSubmit - contains { formData, formContext, schema, uiSchema and Error Schema }
   */
  const updateDemographic = ({ formData }) => {
    debugger;

    const _membershipId = membership ? membership.id : ''
    const input = {
      userId: id,
      organisationId: organisationId,
      membershipId: _membershipId,
    }
    for (const [key, value] of Object.entries(formData)) {
      if (value) input[key] = value
    }
    reactory.graphqlMutation(`
      mutation MoresUpdateUserDemographic($input: UserDemographicInput!){
        MoresUpdateUserDemographic(input:$input){
          demographics{
            id
            type
          }
        }
      }`, { input }).then(({ data, errors = [] }) => {
      if (errors.length > 0) {
        reactory.createNotification('Mutation indicates errors occured, check logs for details', { type: 'warning' });
        reactory.log('Errors in mutation result', { errors, data }, 'error');
      }
    }).catch((err) => {
      reactory.createNotification('Network or related API error occured, please check logs', { type: 'warning' });
      reactory.log('Errors in API call', { err }, 'error');
    });
  }

  const [demographicsAvail, setDemographicsAvail] = React.useState(false)
  const formRef = React.useRef()
  const _schema = {
    type: 'object',
    properties: {
      id: {
        type: "string",
        title: "Client Id",
      },
    },
  };
  const _uiSchema = {}
  const getDemographicsEnabled = () => {

    if (!organisationId || organisationId === '') return;

    reactory.graphqlQuery(
      `query MoresGetOrgnizationDemographicsSetting($id: String!){
      MoresGetOrganizationDemographicsSetting(id: $id) {
        age
        gender
        race
        position
        region
        operationalGroup
        businessUnit
        teams
      }
    }`,
      { id: organisationId },
      { fetchPolicy: "network-only" }
    )
      .then(({ data, errors = [] }) => {
        if (errors.length > 0) {
          reactory.createNotification(
            "Could not retrieve the demographics settings for the organizaion",
            { type: "warning" }
          );
          reactory.log(
            "MoresGetOrganizationDemographicsSetting returned errors",
            { errors },
            "error"
          );
        }

        if (data && data.MoresGetOrganizationDemographicsSetting) {
          setDemographicState({
            ...demographicsEnabled,
            ...data.MoresGetOrganizationDemographicsSetting,
          });
          setDemographicsAvail(true)
        }

      })
      .catch((error) => {
        reactory.log(
          "MoresGetOrganizationDemographicsSetting returned errors",
          { error },
          "error"
        );
        reactory.createNotification(
          "Could not retrieve the demographics settings for the organizaion",
          { type: "error" }
        );
      });
  };
  Object.keys(demographicsEnabled).map((key) => {
    const field = schema[key];

    if (demographicsEnabled[key]) {
      _schema.properties[`${key}`] = { ...field };
      return _schema;
    }
  });
  React.useEffect(() => {
    getDemographicsEnabled();
  }, [organisationId, membership]);

  const formDef = {
    ...MoresMyPersonalDemographics,
    schema: { ..._schema },
    uiSchema: {
      ...$uiSchema,
      age: { ...ageUISchema },
      race: { ...raceUISchema },
      gender: { ...genderUISchema },
      position: { ...positionUISchema },
      pronoun: { ...pronounUISchema },
      region: { ...regionUISchema },
      operationalGroup: { ...operationalGroupUISchema },
      businessUnit: { ...businessUnitUISchema },
      team: { ...teamUISchema },
    },
  };

  if (membership === null || membership === undefined) return (<Typography variant="body1">No membership available</Typography>)
  if (organisationId === null || organisationId === '' || organisationId === undefined) return (<Typography variant="body1">Demographic Selection Only Available within an organisation context</Typography>)
  if (demographicsAvail === false) return (<h1>Loading...</h1>)
  return (
    <React.Fragment>
      {props.heading}
      <ReactoryForm
        formDef={formDef}
        organisationId={organisationId}
        userId={user.id}
        refCallback={(ref: any) => { formRef.current = ref }}
        onSubmit={updateDemographic}
      >
        <div className={classes.button_container}>
          <Button variant="contained" color="secondary" onClick={() => {
            if (formRef !== null && formRef !== undefined && formRef.current !== null && formRef.current !== undefined) {
              //@ts-ignore
              formRef.current.submit();
            }
          }}>
            Save Changes
          </Button>
        </div>
      </ReactoryForm>
    </React.Fragment>

  )
};
export default withApi(Demographics);

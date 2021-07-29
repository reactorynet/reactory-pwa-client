import MoresMyPersonalDemographics from "./forms/MyPersonalDemographics";
import schema from "./forms/MyPersonalDemographics/schema";
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
} from "./forms/MyPersonalDemographics/uiSchema";
const Demographics = (props) => {
  const { reactory, organisationId, user, membershipId } = props;
  const {id, memberships = []} = user 
  const { React, ReactoryForm, MaterialCore, MaterialStyles } = reactory.reactory.getComponents([
    "react.React",
    "core.ReactoryForm",
    "material-ui.MaterialCore",
    "material-ui.MaterialStyles"
  ]);
  const {Button} = MaterialCore
  const { makeStyles } = MaterialStyles 
  const classes = makeStyles((theme) =>{
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
  const { graphqlQuery, createNotification, log } = reactory.reactory;
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
  const updateDemogrpahic = ({formData})=>{
    const membership = memberships.find(membership =>
      membership.organization.id === organisationId
    )
    const _membershipId = membership ? membership.id: ''
    const input = {
      userId: id, 
      organisationId: organisationId,
      membershipId: _membershipId,
    }
    for(const [key,value] of Object.entries(formData)){
      if(value) input[key] = value
    }
    reactory.reactory.graphqlMutation(`
    mutation MoresUpdateUserDemographic($input: UserDemographicInput!){
      MoresUpdateUserDemographic(input:$input){
        demographics{
          id
          type
        }
      }
    }
        `,
        {
          input
        },
    )
  }
  const [demographicsAvail, setDemographicsAvail] = React.useState(false)
  const formRef = React.useRef()
  const _schema = {
    type: 'object',
    title: '',
    properties: {
      id: {
        type: "string",
        title: "Client Id",
      },
    },
  };
  const _uiSchema = {}
  const getDemographicsEnabled = () => {
    graphqlQuery(
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
          createNotification(
            "Could not retrieve the demographics settings for the organizaion",
            { type: "warning" }
          );
          log(
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
        log(
          "MoresGetOrganizationDemographicsSetting returned errors",
          { error },
          "error"
        );
        createNotification(
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
  }, [organisationId]);

  const formDef = {
    ...MoresMyPersonalDemographics,
    schema: { ..._schema },
    uiSchema: {
      ...$uiSchema,
      age: { ...ageUISchema },
      race: { ...raceUISchema },
      gender: { ...genderUISchema },
      position: {...positionUISchema},
      pronoun: { ...pronounUISchema },
      region: { ...regionUISchema },
      operationalGroup: { ...operationalGroupUISchema },
      businessUnit: { ...businessUnitUISchema },
      team: { ...teamUISchema },
    },
  };
  if(demographicsAvail === false) return <h1>Loading...</h1>
  debugger
  return (
    <ReactoryForm 
      formDef={formDef} 
      organisationId={organisationId} 
      userId={user.id}
      refCallback={(ref: any)=> {formRef.current = ref}}
      onSubmit={updateDemogrpahic}
    >
      <div className={classes.button_container}>
        <Button variant="contained" color="secondary" onClick={()=>{
          if(formRef.current) formRef.current.submit();
        }}>
          Save Changes
        </Button>
      </div>
    </ReactoryForm>
  )
};
export default Demographics;

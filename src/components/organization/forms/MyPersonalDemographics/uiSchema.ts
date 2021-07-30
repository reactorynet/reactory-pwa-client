import Reactory from "@reactory/client-core/types/reactory";
const paging: Reactory.PagingRequest = {
  page: 1,
  pageSize: 100,
};

const race = {
  "ui:widget": "SelectWithDataWidget",
  "ui:options": {
    multiSelect: false,
    query: `query MoresRaceDemographics($id: String!, $paging: PagingRequest){
      MoresRaceDemographics(organization_id: $id, paging: $paging) {
        success
        message
        items{
          id
          title
          description
        }
      }
    }`,
    propertyMap: {
      "formContext.organisationId": [
        "id",
        {
          key: "paging",
          transform: (value) => {
            return { page: 1, pageSize: 100 };
          },
        },
      ],
    },
    resultItem: "MoresRaceDemographics",
    resultsMap: {
      "MoresRaceDemographics.items.[].id": ["[].key", "[].value"],
      "MoresRaceDemographics.items.[].title": "[].label",
    },
  },
};
const age = {
  "ui:widget": "DateSelectorWidget",
};
const gender = {
  "ui:widget": "SelectWithDataWidget",
  "ui:options": {
    multiSelect: false,
    query: `query MoresGenderDemographics($id: String!, $paging: PagingRequest){
      MoresGenderDemographics(organization_id: $id, paging: $paging) {
        success
        message
        items{
          id
          title
          description
        }
      }
    }`,
    propertyMap: {
      "formContext.organisationId": [
        "id",
        {
          key: "paging",
          transform: () => {
            return paging
          },
        },
      ],
    },
    resultItem: "MoresGenderDemographics",
    resultsMap: {
      "MoresGenderDemographics.items.[].id": ["[].key", "[].value"],
      "MoresGenderDemographics.items.[].title": "[].label",
    },
  },
};
const position = {
  "ui:widget": "SelectWithDataWidget",
  "ui:options": {
    multiSelect: false,
    query: `query MoresPositionDemographics($id: String!, $paging: PagingRequest){
      MoresPositionDemographics(organization_id: $id, paging: $paging) {
        success
        message
        items{
          id
          title
          description
        }
      }
    }`,
    propertyMap: {
      "formContext.organisationId": [
        "id",
        {
          key: "paging",
          transform: () => {
            return paging;
          },
        },
      ],
    },
    resultItem: "MoresPositionDemographics",
    resultsMap: {
      "MoresPositionDemographics.items.[].id": ["[].key", "[].value"],
      "MoresPositionDemographics.items.[].title": "[].label",
    },
  },
};
const pronoun = {
  "ui:widget": "SelectWithDataWidget",
  "ui:options": {
    multiSelect: false,
    query: `query MoresPronounDemographics($id: String!, $paging: RequestPaging) {
      MoresPronounDemographics(organization_id: $id, paging: $paging) {
        message
        success
        items{
          id
          title
          description

        }
      }
    }`,
    propertyMap: {
      'formContext.organisationId': [
        'id',
        {
          key: 'paging', transform: (value) => {
            return paging
          }
        }
      ]
    },
    resultItem: "MoresPronounDemographics",
    resultsMap: {
      "MoresPronounDemographics.items.[].id": ["[].key", "[].value"],
      "MoresPronounDemographics.items.[].title": "[].label",
    },
  },
};

const region = {
  "ui:widget": "SelectWithDataWidget",
  "ui:options": {
    multiSelect: false,
    query: `query MoresRegionDemographics($id: String!, $paging: PagingRequest) {
      MoresRegionDemographics(organization_id: $id, paging: $paging) {
        message
        success
        items{
          id
          title
          description
        }
      }
    }`,
    propertyMap: {
      'formContext.organisationId': [
        'id',
        {
          key: 'paging',
          transform: () => {
            return paging
          }
        }
      ]
    },
    resultItem: "MoresRegionDemographics",
    resultsMap: {
      "MoresRegionDemographics.items.[].id": ["[].key", "[].value"],
      "MoresRegionDemographics.items.[].title": "[].label",
    },
  },
};
const operationalGroup = {
  "ui:widget": "SelectWithDataWidget",
  "ui:options": {
    multiSelect: false,
    query: `query MoresOperationalGroups($id: String!, $paging: PagingRequest) {
      MoresOperationalGroups(organization_id: $id, paging:$paging) {
        message
        success
        items{
          id
          title
          description
        }
      }
    }`,
    propertyMap: {
      'formContext.organisationId': [
        'id',
        {
          key: 'paging',
          transform: () => {
            return paging
          }
        }
      ]
    },
    resultItem: "MoresOperationalGroups",
    resultsMap: {
      "MoresOperationalGroups.items.[].id": ["[].key", "[].value"],
      "MoresOperationalGroups.items.[].title": "[].label",
    },
  },
};
const businessUnit = {
  "ui:widget": "SelectWithDataWidget",
  "ui:options": {
    multiSelect: false,
    query: `query MoresBusinessUnits($id: String!, $paging: PagingRequest) {
      MoresBusinessUnits(organization_id: $id, paging: $paging) {
        message
        success
        items{
          id
          name
          description
        }
      }
    }`,
    propertyMap: {
      'formContext.organisationId': [
        'id',
        {
          key: 'paging',
          transform: () => {
            return paging
          }
        }
      ]
    },
    resultItem: "MoresBusinessUnits",
    resultsMap: {
      "MoresBusinessUnits.items.[].id": ["[].key", "[].value"],
      "MoresBusinessUnits.items.[].name": "[].label",
    },
  },
};
const team = {
  "ui:widget": "SelectWithDataWidget",
  "ui:options": {
    multiSelect: false,
    query: `query MoresTeams($id: String!, $paging: PagingRequest) {
      MoresTeams(organization_id: $id, paging:$paging) {
        message
        success
        items{
          id
          title
          description
        }
      }
    }`,
    resultItem: "MoresTeams",
    resultsMap: {
      "MoresTeams.items.[].id": ["[].key", "[].value"],
      "MoresTeams.tiems.[].title": "[].label",
    },
  },
};
const uiSchema: any = {
  // submitIcon: 'refresh',
  "ui:options": {
    // toolbarPosition: 'none',
    showRefresh: false,
    showSubmit: false,
    componentType: "form",
    submitProps: {
      variant: "contained",
      color: "primary",
      text: "SAVE CHANGES",
      iconAlign: "none",
    },
    style: {
      marginTop: "16px",
      marginBottom: "16px",
    },
  },
  "ui:field": "GridLayout",
  "ui:grid-options": {
    spacing: 2,
    container: "Paper",
  },
  "ui:grid-layout": [
    {
      age: { xs: 12, sm: 6, md: 6 },
      gender: { xs: 12, sm: 6, md: 6 },
      race: { xs: 12, sm: 6, md: 6 },
      position: { xs: 12, sm: 6, md: 6 },
      region: { xs: 12, sm: 6, md: 6 },
      operationalGroup: { xs: 12, sm: 6 },
      businessUnit: { xs: 12, sm: 6 },
      team: { xs: 12, sm: 6 },
    },
  ],
};

export default uiSchema;
export {
  race as raceUISchema,
  age as ageUISchema,
  gender as genderUISchema,
  position as positionUISchema,
  pronoun as pronounUISchema,
  region as regionUISchema,
  businessUnit as businessUnitUISchema,
  operationalGroup as operationalGroupUISchema,
  team as teamUISchema,
};

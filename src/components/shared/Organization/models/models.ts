import queries from '../graph/queries';
import GRAPHQL from '../graph/queries';

export const LoadingOrganisation = {
  id: 'loading',
  name: 'loading',
  avatarURL: null,
  avatar: null,
  logoURL: null,
  logo: null,
};

export const NewOrganisation = {
  id: 'new',
  name: '',
  avatarURL: null,
  avatar: null,
  logoURL: null,
  logo: null,
}

/**
 * Utility class for loading and managing a Mores Scoped Organisation Object.
 * 
 */
export class CoreOrganisationModel {
  id: string
  name: string
  avatarURL: string
  avatar: string
  logoURL: string
  logo: string


  reactory: any // ReactoryApi-

  isLoading: boolean = false;
  isNew: boolean = false;
  isSaving: boolean = false;
  isDirty: boolean = false;
  isCached: boolean = false;
  hasError: boolean = false;
  canEdit: boolean = true;

  lastMessage: string = null;

  version: number = 0;
  lastSynch: number = null;

  error: any = null;

  constructor(props) {
    const { reactory, id, name, avatar, avatarURL, logo, logoURL, $skip_load = false } = props;
    this.reactory = reactory;
    this.id = id;
    this.name = name;
    this.avatar = avatar;
    this.avatarURL = avatarURL;
    this.logo = logo;
    this.logoURL = logoURL;
    this.error = null;

    if (id === 'new') {
      this.isNew = true;
      this.isDirty = false;
    }

    if (id === 'loading') this.isLoading = true;

    if (reactory.utils.lodash.isNil(id) === false && id !== 'loading') {
      if ($skip_load === false) {
        this.load();
        this.isLoading = true;
      }
    }

    this.version += 1;
  }

  toJSON() {
    const {
      id, name, avatarURL,
      avatar, logoURL, logo,

      isLoading, isNew, isSaving,
      isDirty, isCached, hasError,
      canEdit, lastMessage, version,
      lastSynch } = this;
    return {
      isLoading,
      isNew,
      isSaving,
      isDirty,
      isCached,
      hasError,
      canEdit,
      lastMessage,
      version,
      lastSynch,

      id,
      name,
      avatarURL,
      avatar,
      logoURL,
      logo
    }
  }

  setName(name: string) {
    this.name = name;
    this.onUpdated(false);
  }

  setAvatar(avatar: string) {
    this.avatar = avatar;
    this.onUpdated(false);
  }

  setData(data: any) {
    if (data.name) this.name = data.name;
    if (data.avatarURL) this.avatarURL = data.avatarURL;
    if (data.avatar) this.avatar = data.avatar;
    if (data.id) this.id = data.id;
    if (data.logo) this.logo = data.logo;
    if (data.logoURL) this.logoURL = data.logoURL;

    this.version + 1;
  }

  getSetActiveOrganizationVariables() {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
    }
  }

  async persist() {
    const { reactory, getSetActiveOrganizationVariables } = this;
    if (this.isDirty === false) return;

    try {
      this.isSaving = true;
      const mutationResult = await reactory.graphqlMutation(GRAPHQL.SetActiveOrganisationMutation, getSetActiveOrganizationVariables()).then();
      // use deconstructor with initializer to avoid null / undefined check 
      const { errors = [], data } = mutationResult;
      if (errors.length > 0) {
        reactory.log('Graph reported errors', { errors, severity: 5 }, 'error');
      }

      if (data && data.CoreSetOrganisationInfo) {
        const { success, message, organisation } = data.MoresSetOrganisationInfo;

        if (success === true) {
          this.lastMessage = message;
          this.setData(organisation);
          this.isDirty = false;
        } else {
          this.lastMessage = message;
          // set a lower severity rating as the error should already be logged on the server side as we 
          // gave the failed response message. This would only be an indicator for the client side as 
          // to the error, we can log it so we can tie back on the reporting side that the user response
          // has been delivered and processed.
          reactory.log('MoresSetOrganisationInfo operation returned failed', { message, severity: 1 }, 'error');
          this.hasError = true;
        }
      }

      this.isSaving = false;
    } catch (mutationError) {
      reactory.log(`Unable to update organisation information`, { mutationError, severity: 10 }, 'error');
    }
  }

  load() {
    const { reactory } = this;

    if (this.id === 'loading' || this.id === 'new') return;

    reactory.graphqlQuery(`query CoreOrganisationWithId($id: String!){
      CoreOrganization(id: $id) {
        id
        name
        avatar
        avatarURL
        logo
        logoURL
      }
    }`, { id: this.id }, { fetchPolicy: 'network-only' }).then(({ data, errors = [] }) => {
      if (errors.length > 0) {
        this.hasError = true;
        this.error = errors;
      }

      if (data && data.CoreOrganization) {
        this.setData(data.CoreOrganization);
      }

      this.isLoading = false;
      this.version += 1;

    }).catch((error) => {
      this.hasError = true;
      this.error = error;
    });
  }

  onUpdated(synchronize: boolean = false) {
    // 1. update cache - reactory gives us access to the cache    
    // 2. update the remote version? 
    // 3. invalidate queries that may have this result?

    if (synchronize) {
      this.persist().then(() => {
        this.version++;
      }).catch((error) => {
        this.reactory.log('Error while persisting organisation information', { error, severity: 5 }, 'error');
      });
    } else {
      if (this.isLoading === false) {
        this.isDirty = true;
        this.version++;
      }

      if (this.isNew === true) {

      }
    }
  }
}


interface IRecentOrganisations {
  id: string,
  count: number,
  last: number
}
export class CoreOrganizationList {

  readonly local_storage_key: string = "CoreOrganisationList";

  organisations: CoreOrganisationModel[] = [];
  organisation: CoreOrganisationModel = null;

  default_organisation_id: string = null;
  last_organisation_id: string = null;
  recent_organisations: IRecentOrganisations[] = [];
  top_organisations: string[] = null;

  active_organization_id: string = null;

  reactory: any;
  error: Error = null;

  loading: boolean;

  onOrganisationSelected: (organisation: CoreOrganisationModel) => void;
  onOrganisationUpdated: (organisation: CoreOrganisationModel) => void;
  onLoadComplete: (organisation: CoreOrganisationModel, organisations: CoreOrganisationModel[]) => void;

  __v: number = 0;

  static LoadingOrganisation = {
    id: 'loading',
    name: 'loading',
    avatarURL: null,
    avatar: null,
    logoURL: null,
    logo: null,
  };

  static NewOrganisation = {
    id: 'new',
    name: '',
    avatarURL: null,
    avatar: null,
    logoURL: null,
    logo: null,
  };

  constructor(props) {
    const {
      reactory,
      onLoadComplete = () => { },
      onOrganisationSelected = () => { },
      onOrganisationUpdated = () => { },
      active_organization_id = null
    } = props;

    this.reactory = reactory;
    this.onLoadComplete = onLoadComplete;
    this.onOrganisationSelected = onOrganisationSelected;
    this.onOrganisationUpdated = onOrganisationUpdated;
    this.organisation = new CoreOrganisationModel({ reactory, ...LoadingOrganisation, id: active_organization_id });
    this.active_organization_id = active_organization_id;
    this.hydrate(active_organization_id);
  }

  async hydrate(active_organization_id) {
    const { utils } = this.reactory;

    utils.localForage.getItem(this.local_storage_key, (strdata) => {
      if (strdata && strdata.indexOf("{") >= 0) {
        const $local = JSON.parse(strdata);

        this.default_organisation_id = $local.default_organisation_id;
        this.last_organisation_id = $local.last_organisation_id;
        this.recent_organisations = $local.recent_organisations || [];
        this.top_organisations = $local.top_organisations || [];
        this.organisations = $local.organisations || [];
        this.organisation = $local.organisation || this.organisation;
      }

      if (active_organization_id) {
        this.setActiveOrganisation(active_organization_id);
        this.load(active_organization_id);
      } else {
        if (this.last_organisation_id) {
          this.setActiveOrganisation(this.last_organisation_id);
          this.load(this.last_organisation_id);
        }
      }
    })
  }

  persist() {
    const { utils } = this.reactory;
    const { default_organisation_id, last_organisation_id, recent_organisations, top_organisations, organisation, organisations, active_organization_id } = this;



    utils.localForage.setItem(this.local_storage_key, JSON.stringify({
      default_organisation_id,
      last_organisation_id,
      recent_organisations,
      top_organisations,
      organisations,
      organisation,
    }), () => {
      this.__v += 1;
    });
  }

  updateOrganisation(updated_organization) {
    const { utils } = this.reactory;

    if (updated_organization.id) {
      const idx = utils.lodash.findIndex(this.organisations, { id: updated_organization.id });
      if (idx >= 0) {
        this.organisations[idx] = { ...this.organisations[idx], ...updated_organization };
        this.organisations[idx].version += 1;
        this.persist();
      }
    }
  }



  /**
   * Loads the organisations for the Logged In user and selects the default 
   * or specified organisation id to activate if the user has more than 
   * one organisation membership.
   * 
   * @param organisation_id - The default organisation id to be loaded. If not set
   * the default / first one is loaded.
   * 
   */
  async load(organisation_id: string = 'default') {
    const { reactory } = this;
    const { errors = [], data } = await reactory.graphqlQuery(queries.CoreOrganizations, {}).then();


    if (errors.length > 0) {
      this.error = new Error()
      return;
    }

    if (data && data.CoreOrganizations && data.CoreOrganizations.length > 0) {
      //overwrite the existing organisation collection.
      this.organisations = data.CoreOrganizations.map((organisation_data) => {
        return new CoreOrganisationModel({ reactory, ...organisation_data, $skip_load: true });
      });



      if (this.organisations.length > 0) {
        let found = null;

        //Given a organisation id, find the item.
        if (organisation_id !== 'default') {
          found = reactory.utils.lodash.find(this.organisations, { id: organisation_id });
        }

        //We must use the default, but the default id flag is null or it === 'default', we return this first organisation in the list.
        if (!found && organisation_id === 'default' && (this.default_organisation_id === null || this.default_organisation_id === 'default') && this.organisations.length > 0) {
          found = this.organisations[0];
        }

        //We must use the default and there is a default id value that is not !== 'default'
        if (!found && organisation_id === 'default' && this.default_organisation_id !== null && this.default_organisation_id !== 'default') {
          found = reactory.utils.lodash.find(this.organisations, { id: this.default_organisation_id });
        }


        if (found) {
          this.last_organisation_id = found.id;
          let recent_entry = reactory.utils.lodash.find(this.recent_organisations, { id: found.id });
          if (recent_entry === null || recent_entry === undefined) this.recent_organisations.push({ id: found.id, count: 1, last: new Date().valueOf() });
          else {
            recent_entry.count += 1;
            recent_entry.last = new Date().valueOf();
          }

          if (this.default_organisation_id === null) this.default_organisation_id = organisation_id;
          this.organisation = new CoreOrganisationModel({ reactory, ...found })
          this.organisation.isLoading = false;
          this.organisation.version += 1;
        }

      }
      this.__v += 1;
      this.persist();
    }

    if (this.onLoadComplete) {
      this.onLoadComplete(this.organisation, this.organisations);
    }
  }



  setActiveOrganisation(organisation: string | CoreOrganisationModel) {
    let $organisation: CoreOrganisationModel = null;

    if (typeof organisation === 'string') {
      $organisation = this.reactory.utils.lodash.find(this.organisations, { id: organisation });
    } else {
      $organisation = organisation;
    }

    if ($organisation) {
      this.last_organisation_id = $organisation.id;
      this.organisation = $organisation;
    }
  }

  async getActiveOrganisation() {
    this.reactory.graphqlQuery(queries.LoggedInOrganisationQuery).then();
  }
}


export default {
  LoadingOrganisation,
  NewOrganisation,
  CoreOrganisationModel,
  CoreOrganizationList
}


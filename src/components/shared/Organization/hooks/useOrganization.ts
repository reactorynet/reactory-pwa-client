import { ReactoryClientCore } from "../types";
import { 
  CoreOrganisationWithId,
  CreateOrganization
} from "../graph/queries"

const LOCAL_STORAGE_KEY = 'CoreOrganisationList';
const LOCAL_STORAGE_DEFAULT_ORG = 'CoreDefaultOrganization';

type OrganizationCreateMutationResult = {
  CreateOrganization: ReactoryClientCore.Models.IOrganization;
}

export const useOrganization: ReactoryClientCore.Hooks.OrganizationHook = 
(props): ReactoryClientCore.Hooks.OrganizationHookReturn => {
  const { reactory, organizationId } = props;

  const { React } = reactory.getComponents<{ React: Reactory.React }>(["react.React"]);
  const {
    useState,
    useEffect,
    useCallback
  } = React;

  const [organization, setOrganization] = useState<Partial<ReactoryClientCore.Models.IOrganization>>(null);
  const [dirty, setIsDirty] = useState<boolean>(false);
  const [deleted, setIsDeleted] = useState<boolean>(false);
  const [error, setError] = useState<string>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const updateOrganisation = (next: ReactoryClientCore.Models.IOrganization) => {
    if(reactory.utils.deepEquals(next, organization)) return;
    setIsDirty(true);
    setOrganization(next);
  }

  const saveOrganisation = useCallback(async (): Promise<void> => {
    setLoading(true);
    const { data, errors } = await reactory.graphqlMutation<
      OrganizationCreateMutationResult, 
      { input: Partial<ReactoryClientCore.Models.IOrganization> 
    }>(
      CreateOrganization, 
      { 
        input: organization
      });
    setLoading(false);
    if(errors && errors.length > 0) {
      const errorString: string = errors.map(e => e.message).join('\n');
      setError(errorString);
      return;
    }

    if(!data.CreateOrganization) {
      setError(`No organization found for id ${organizationId}`);        
      return;
    }

    setOrganization(data.CreateOrganization);
  }, [organization])

  const deleteOrganisation = async (next: ReactoryClientCore.Models.IOrganization): Promise<void> => {

  }

  const load = useCallback(
    async () => {
      if(!organizationId) return;
      if(organization && organization.id === organizationId) return;
      if(organizationId === 'new') {
        setOrganization({
          name: '',
          code: '',
          logo: '',          
        });
        return;
      }
      setLoading(true);
      const { data, error, errors } = await reactory.graphqlQuery<{ CoreOrganizationWithId: ReactoryClientCore.Models.IOrganization }, { id: string }>(CoreOrganisationWithId, { id: organizationId });
      setLoading(false);
      if(error || errors) {
        const errorString: string = error ? error.message : errors.map(e => e.message).join('\n');
        setError(errorString);
        return;
      }

      if (!data.CoreOrganizationWithId) {
        setError(`No organization found for id ${organizationId}`);        
        return;
      }

      setOrganization(data.CoreOrganizationWithId);
    },
    [reactory, organizationId],
  );

  useEffect(() => {
    load();
  }, [load, organizationId]);

  return {
    organization,
    loading,
    error,
    dirty,
    deleted,
    setOrganization: updateOrganisation,
    update: updateOrganisation,
    create: saveOrganisation,
    delete: deleteOrganisation,
    setDefaultOrganization(organizationId) {
      localStorage.setItem(LOCAL_STORAGE_DEFAULT_ORG, organizationId);
    },
    defaultOrganizationId: localStorage.getItem(LOCAL_STORAGE_DEFAULT_ORG),
  }
}

export const useOrganizationReactoryRegistration: Reactory.Client.IReactoryComponentRegistryEntry<ReactoryClientCore.Hooks.OrganizationHook> = {
  name: 'useOrganization',
  nameSpace: 'core',
  version: '1.0.0',
  component: useOrganization,
  componentType: 'hook',
  title: 'Organization Hook',  
  description: 'A hook to manage organization state',
  tags: ['hook', 'organization', 'state'],
};

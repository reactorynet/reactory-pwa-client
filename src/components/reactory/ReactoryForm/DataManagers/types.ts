
export interface IReactoryFormDataManager {
  onSubmit: () => void
  onChange: () => void
}

export interface IReactoryFormDataManagerProvider {
  get: (props: Reactory.Forms.IReactoryForm) => IReactoryFormDataManager
}
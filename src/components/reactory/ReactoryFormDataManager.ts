import ReactoryApi from "@reactory/client-core/api/ReactoryApi";
import { isArray } from "lodash";
import Reactory from "@reactory/client-core/types/reactory";

export default (reactory: ReactoryApi) => ({
  /**
   * Returns the next data set from the input params
   */
  fromGraphResult: (data: any, formData: any, graphElement: Reactory.IReactoryFormGraphElement) => {

    let nextFormData = null;

    if (data && data[graphElement.name]) {

      let _strategy = graphElement.mergeStrategy || 'merge';

      switch (graphElement.resultType) {
        case 'array': {
          debugger
          nextFormData = []; //start with empty array
          if (isArray(formData) === true && _strategy === 'merge') nextFormData = [...reactory.utils.lodash.cloneDeep(formData)];

          if (graphElement.resultKey) {
            let property = data[graphElement.name][graphElement.resultKey] || [];
            if (isArray(property) === true) {
              switch (_strategy) {
                case "replace": {
                  nextFormData = [...property];
                  break;
                }
                case "merge":
                default: {
                  nextFormData = [...reactory.utils.lodash.cloneDeep(formData), ...property];
                  break;
                }
              }
            } else {
              //not using the key from the result item the default behaviour, this implies
              //that the result from the query is an array of data and not a object containing elements.
              if (isArray(data[graphElement.name]) === true && reactory.utils.lodash.isNil(graphElement.resultMap) === true)
                switch (_strategy) {
                  case "replace": {
                    nextFormData = [...reactory.utils.lodash.cloneDeep(data[graphElement.name])];
                  }
                  case "merge":
                  default: {
                    nextFormData = [...nextFormData, ...reactory.utils.lodash.cloneDeep(data[graphElement.name])];
                    break;
                  }
                }
            }
          }

          if (graphElement.resultMap && Object.getOwnPropertyNames(graphElement.resultMap).length > 0) {
            nextFormData = reactory.utils.objectMapper(nextFormData, graphElement.resultMap);
          } else {
            nextFormData = nextFormData;
          }

          break;
        }

        default: {
          switch (_strategy) {
            case "replace": {

              if (graphElement.resultMap && Object.getOwnPropertyNames(graphElement.resultMap).length > 0) {

                try {

                  nextFormData = reactory.utils.objectMapper({
                    ...reactory.utils.lodash.cloneDeep(data[graphElement.name])
                  }, graphElement.resultMap);

                } catch (mappError) {
                  reactory.log("Could not map the object data", { mappError }, 'error')
                }

              } else {
                nextFormData = { ...data[graphElement.name] };
              }

              break;
            }
            case "merge":
            default:
              {

                if (graphElement.resultMap && Object.getOwnPropertyNames(graphElement.resultMap).length > 0) {

                  try {
                    
                    nextFormData = reactory.utils.objectMapper({ 
                      ...reactory.utils.lodash.cloneDeep(formData), 
                      ...reactory.utils.lodash.cloneDeep(data[graphElement.name]) 
                    }, graphElement.resultMap);

                  } catch (mappError) {                    
                    reactory.log("Could not map the object data", { mappError }, 'error')
                  }

                } else {
                  nextFormData = { ...formData, ...data[graphElement.name] };
                }
              }
          }


        }
      }
    }

    return nextFormData;

  }

});
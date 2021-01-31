
import { useState, useEffect } from 'react';
import Reactory from '@reactory/client-core/types/reactory';
import { useReactory } from '@reactory/client-core/api/ApiProvider';


export const useSizeSpec = () => {
  const reactory = useReactory();
  const [sizeSpec, setSizeSpec] = useState(reactory.getSizeSpec());

  const onWindowResize = (sizeSpec) => {
    setSizeSpec(sizeSpec);
  };

  useEffect(() => {

    reactory.on('onWindowResize', onWindowResize);
    return () => {
      reactory.removeListener('onWindowResize', onWindowResize);
    }
  }, []);


  return sizeSpec;
};

export default useSizeSpec
import React, { Fragment } from 'react'
import {
  Button,
  Icon,
} from '@mui/material';

import { compose } from 'redux'
import { withReactory } from '@reactory/client-core/api/ApiProvider'

const RecordLookup = (props: any) => {
  const [showLookup, setShowLookup] = React.useState(false);
  const componentDefs = props.api.getComponents(['core.BasicModal']);
  const { BasicModal } = componentDefs;

  const openLookup = () => setShowLookup(true);
  const closeLookup = () => setShowLookup(false);

  return (
    <Fragment>
      <Button type="button" variant="contained" color="primary" onClick={openLookup}>
        {props.title}
        <Icon>search</Icon>
      </Button>
      <BasicModal open={showLookup === true} onClose={closeLookup}><p>Lookup</p></BasicModal>
    </Fragment>
  );
}

const RecordLookupWidgetComponent = compose(withReactory)(RecordLookup)
export default RecordLookupWidgetComponent

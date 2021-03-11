

export default ({ formData, schema, idSchema, formContext, uiSchema, reactory, onChange, theme }) => {

  const { MaterialStyles, MaterialUIColor, MaterialCore, React } = reactory.getComponents(['react.React', 'material-ui.MaterialUIColor', 'material-ui.MaterialStyles', 'material-ui.MaterialCore']);
  const classes = MaterialStyles.makeStyles((theme) => {
    return {
      color_picker_root: {
        outline: '1px solid black'
      }
    }
  })();

  const uiOptions = uiSchema && uiSchema['ui-options'] ? uiSchema['ui-options'] : {};

  const { ColorPicker, ColorBox } = MaterialUIColor;

  const {
    Button,
    Icon,
    IconButton,
    InputAdornment,
    Input,
    OutlinedInput,
    Popover,
    FilledInput,
    Typography
  } = MaterialCore;

  const { muiTheme } = reactory;

  const [show_selector, setShowSelector] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);


  let themeDefaults: any = {};
  if (theme.MaterialInput) {
    themeDefaults = theme.MaterialInput;
  }

  let COMPONENT = Input;

  switch (themeDefaults.variant) {
    case "outlined":
    case "outline": {
      COMPONENT = OutlinedInput;
      break;
    }
    case "filled":
    case "fill": {
      COMPONENT = FilledInput;
      break;
    }
  }

  const colors = {
    background: formData || theme.palette.primary.main,
    color: reactory.muiTheme.palette.getContrastText(formData || theme.palette.primary.main),
  };

  const onButtonClick = (evt) => {
    const { currentTarget } = evt;
    setAnchorEl(currentTarget);
    setShowSelector(!show_selector);
  };

  const ColorAdornment = () => {



    return (
      <InputAdornment position={'end'}>
        <Button size="small" aria-describedby={`${idSchema.$id}_popover`} style={{ backgroundColor: colors.background }} onClick={onButtonClick}>
          <Icon style={{ color: colors.color }}>palette</Icon>
        </Button>
      </InputAdornment>);
  }

  return (
    <>
      <COMPONENT type={'text'} id={idSchema.$id} readOnly={uiOptions.readOnly === true} onClick={onButtonClick} value={formData || schema.default} onChange={onChange} endAdornment={<ColorAdornment />} />
      <Popover
        id={`${idSchema.$id}_popover`}
        open={show_selector}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
          setShowSelector(false);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <ColorBox deferred onChange={(color) => {
          onChange(`#${color.hex}`)
        }} />
      </Popover>
    </>
  )





};
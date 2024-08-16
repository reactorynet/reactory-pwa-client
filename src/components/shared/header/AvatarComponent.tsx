import { useReactory } from "@reactory/client-core/api";
import { getAvatar } from "@reactory/client-core/components/util";

export const ReactoryAvatar = () => {
  const reactory = useReactory();

  const {
    getComponents,
    $user
  } = reactory;
  const apiStatus: Reactory.Models.IApiStatus = $user as Reactory.Models.IApiStatus;
  const {
    React,
    Material
  } = getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>([
    "react.React",
    "material-ui.Material",
  ]);

  const {
    MaterialCore,
  } = Material

  const {
    Avatar,
    Box,
    Typography,
  } = MaterialCore;

  return (
  <Box sx={{
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  }}>
    <Typography
        variant="subtitle1"
        color="secondary"
        style={{
          textAlign: 'center',
          marginLeft: 'auto',
          marginRight: '10px',
        }}>{reactory.getUserFullName(apiStatus.loggedIn.user as Reactory.Models.IUser)}
      </Typography>
    <Avatar
      src={getAvatar(apiStatus.loggedIn.user)}
      alt={`${apiStatus.loggedIn.user.firstName} ${apiStatus.loggedIn.user.lastName}`}
      sx={{ width: 32, height: 32 }}
      style={{
        cursor: "pointer",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    />
  </Box>);
};

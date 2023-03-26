import { useReactory } from "@reactory/client-core/api";

const FroalaComponentSelector = ({ onSelectionChange, onCancel }) => {
  const reactory = useReactory();

  const { MaterialCore } = reactory.getComponents<{ MaterialCore: Reactory.Client.Web.MaterialCore }>(["material.MaterialCore"])
  const { Select, MenuItem } = MaterialCore;

  let menuItems: any[] = [];

  {
    Object.keys(reactory.componentRegister).forEach((key) => {
      const {
        nameSpace,
        name,
        version,
        description,
        roles,
        tags,
        title,
        componentType,
      } = reactory.componentRegister[key];

      menuItems.push({ title, description, componentType, name, nameSpace, version })
    })
  }

  const onSelectionChanged = e => {
    debugger
  }

  const onMenuClicked = e => {
    debugger
  }

  return (
    <Select onChange={onSelectionChanged}>
      {menuItems.map(({ title, description }) => {
        return <MenuItem title={title} onClick={onMenuClicked}></MenuItem>
      })}
    </Select>
  )
}

export default FroalaComponentSelector;
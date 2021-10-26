import { createContext, useContext } from "react";
import { IMorphCast } from "./types";

const MorphCASTContext = createContext<IMorphCast>(null);

export const useMorphCAST = () => {
  const morphcast = useContext(MorphCASTContext);
  return morphcast;
}


export default MorphCASTContext


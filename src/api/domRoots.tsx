import React, { useLayoutEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';

/**
 * React 18 replaced `ReactDOM.render(element, node)` / `unmountComponentAtNode(node)`
 * with roots. The plugin-facing `reactory.mountComponent` / `unmountComponent`
 * and `attachComponent` are addressed by DOM node, so keep one root per node
 * here: rendering into a node again updates its root, and unmounting by node
 * still works without the caller holding the root.
 */
const roots = new Map<Element | DocumentFragment, Root>();

const RenderCallback: React.FC<{ onRendered: () => void; children?: React.ReactNode }> = ({ onRendered, children }) => {
  // ReactDOM.render invoked its callback after each render it was given.
  useLayoutEffect(() => {
    onRendered();
  }, [onRendered]);
  return <>{children}</>;
};

export const renderIntoNode = (
  node: Element | DocumentFragment,
  element: React.ReactNode,
  callback?: () => void,
): Root => {
  let root = roots.get(node);
  if (!root) {
    root = createRoot(node);
    roots.set(node, root);
  }
  root.render(callback ? <RenderCallback onRendered={callback}>{element}</RenderCallback> : element);
  return root;
};

/** Returns true when a root was mounted on `node`, like `unmountComponentAtNode`. */
export const unmountNode = (node: Element | DocumentFragment): boolean => {
  const root = roots.get(node);
  if (!root) return false;
  root.unmount();
  roots.delete(node);
  return true;
};

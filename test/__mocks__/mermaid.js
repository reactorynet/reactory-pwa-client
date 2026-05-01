// Stub for the `mermaid` ESM package which ts-jest's transform pipeline
// cannot consume. Tests that pull in MermaidDiagram (transitively via the
// widgets barrel) trigger this import chain; the stub returns no-op
// helpers so module resolution succeeds without altering any actual
// rendering behaviour (jsdom tests don't render Mermaid diagrams).
const noopRender = () => Promise.resolve({ svg: '', bindFunctions: () => {} });
const stub = {
  initialize: () => {},
  render: noopRender,
  contentLoaded: () => {},
  parse: () => Promise.resolve(true),
  default: undefined,
};
stub.default = stub;
module.exports = stub;

// Stub for `apollo-upload-client/createUploadLink.mjs` — the published
// .mjs file is ESM that Jest's ts-jest transform cannot consume in this
// project. Tests that pull the widgets barrel trigger this import via
// the Apollo client init chain; the stub returns a no-op link factory
// so module resolution succeeds without altering any actual upload
// behaviour (jsdom tests don't perform uploads).
//
// Real production builds use the genuine ESM file via the Webpack bundle.
module.exports = function createUploadLink() {
  return {
    request: () => null,
    concat: () => ({ request: () => null }),
  };
};
module.exports.default = module.exports;

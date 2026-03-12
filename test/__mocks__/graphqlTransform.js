// Jest transform for .graphql files
// Exports the raw GraphQL source as a string so that
// String(doc).includes('MutationName') checks work in tests.
'use strict';

module.exports = {
  process(src) {
    return { code: `module.exports = ${JSON.stringify(src)};` };
  },
};

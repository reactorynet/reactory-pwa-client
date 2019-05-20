module.exports = function (api) {  
  api.cache(true);

  const presets = [ 
    "@babel/react",     
    ["@babel/env", { "modules": "commonjs" }],    
   ];

  const plugins = [             
    "add-module-exports",
    // "babel-plugin-transform-class-properties",
    //stage 0
    ["@babel/plugin-proposal-class-properties", { "loose": true }],
    "@babel/plugin-proposal-function-bind",
    "@babel/plugin-proposal-export-default-from",
    "@babel/plugin-proposal-json-strings",

    // Stage 2
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    "@babel/plugin-proposal-function-sent",
    "@babel/plugin-proposal-export-namespace-from",
    "@babel/plugin-proposal-numeric-separator",
    "@babel/plugin-proposal-throw-expressions",

    // Stage 3
    "@babel/plugin-transform-classes",
    "@babel/plugin-syntax-dynamic-import",
    "@babel/plugin-syntax-import-meta",            
    "@babel/plugin-transform-object-set-prototype-of-to-assign", 
    "@babel/plugin-transform-runtime",
    "@babel/plugin-transform-arrow-functions",
    "@babel/plugin-transform-modules-commonjs",
    // "@babel/plugin-transform-react-jsx-compat",
    "@babel/plugin-transform-react-jsx",    
    "@babel/plugin-transform-react-inline-elements",
    "@babel/plugin-transform-react-constant-elements"    
  ];

  return {
    presets,
    plugins
  };
}
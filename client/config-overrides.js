const { removeModuleScopePlugin, override, babelInclude, useBabelRc, addExternalBabelPlugin } = require("customize-cra");
const path = require("path");

module.exports = override(
  removeModuleScopePlugin(), // (1)
  babelInclude([
    path.resolve("src"),
    path.resolve("../backend/types")
    // path.resolve("../lib"),  // (2)
  ]),

  // This shit is because of the IPFS module
  // https://github.com/paulmillr/noble-ed25519/issues/34
  addExternalBabelPlugin("@babel/plugin-proposal-nullish-coalescing-operator"),
  addExternalBabelPlugin("@babel/plugin-proposal-optional-chaining"),
  addExternalBabelPlugin("@babel/plugin-syntax-bigint")
);
// vue.config.js
const fs = require('fs');
const path = require('path');
const { defineConfig } = require('@vue/cli-service');
const webpack = require('webpack');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

function loadEnvFiles() {
  const envFiles = ['.env.local', '.env'];
  return envFiles.reduce((acc, file) => {
    const filePath = path.resolve(__dirname, file);
    if (!fs.existsSync(filePath)) {
      return acc;
    }

    const result = dotenv.config({ path: filePath });
    dotenvExpand.expand(result);

    if (result.parsed) {
      Object.entries(result.parsed).forEach(([key, value]) => {
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
        acc[key] = process.env[key];
      });
    }

    return acc;
  }, {});
}

function createEnvDefinitions() {
  const loadedEnv = loadEnvFiles();
  const entries = Object.entries(loadedEnv).filter(([key]) =>
    key.startsWith('VUE_APP_')
  );

  return entries.reduce((definitions, [key, value]) => {
    definitions[`process.env.${key}`] = JSON.stringify(value);
    return definitions;
  }, {});
}

module.exports = defineConfig({
  transpileDependencies: true,

  // esm-bundler용 Vue feature flags 주입
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        ...createEnvDefinitions(),
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
      }),
    ],
  },
});

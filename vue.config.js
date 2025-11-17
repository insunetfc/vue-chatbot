// vue.config.js
const { defineConfig } = require("@vue/cli-service");
const webpack = require("webpack");

module.exports = defineConfig({
  transpileDependencies: true,

  // esm-bundler용 Vue feature flags 주입
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
      }),
    ],
  },

  devServer: {
    host: "0.0.0.0",
    port: 8080,
    // proxy: {
    //   "/api/v_1": {
    //     target: "http://15.165.60.45:5000",
    //     changeOrigin: true,
    //     ws: true,
    //     secure: false,
    //     pathRewrite: { "^/api/v_1": "" },
    //     selfHandleResponse: false,
    //   },
    // },
  },
});

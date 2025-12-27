module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Ignore source map warnings for MediaPipe
      webpackConfig.ignoreWarnings = [
        function ignoreSourcemapWarnings(warning) {
          return !!(
            warning &&
            warning.module &&
            warning.module.resource &&
            warning.module.resource.includes("node_modules") &&
            warning.details &&
            warning.details.includes("source-map-loader")
          );
        },
      ];
      return webpackConfig;
    },
  },
};

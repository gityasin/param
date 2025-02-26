module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-runtime',
      'react-native-reanimated/plugin',
      ['@babel/plugin-proposal-private-methods', { loose: true }],
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "blacklist": null,
        "whitelist": null,
        "safe": false,
        "allowUndefined": true
      }]
    ],
    env: {
      production: {
        plugins: ['react-native-paper/babel']
      }
    }
  };
};

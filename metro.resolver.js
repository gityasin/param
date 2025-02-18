const path = require('path');

module.exports = {
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName.startsWith('node:')) {
      return {
        filePath: path.resolve(__dirname, 'node_modules', moduleName.slice(5)),
        type: 'sourceFile',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
}; 
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force axios to use the browser version instead of Node.js version
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'axios') {
        return {
            filePath: require.resolve('axios/dist/browser/axios.cjs'),
            type: 'sourceFile',
        };
    }

    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

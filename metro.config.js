const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const defaults = getDefaultConfig(__dirname);
const existing = defaults.resolver.blockList;
const blockList = Array.isArray(existing) ? existing : existing ? [existing] : [];

module.exports = mergeConfig(defaults, {
  maxWorkers: 2,
  resolver: {
    blockList: [
      ...blockList,
      /[/\\]\.cache[/\\]/,
      /[/\\]artifacts[/\\]/,
      /[/\\]\.memory[/\\]/,
      /[/\\]\.vibe-wise[/\\]/,
      /[/\\]android[/\\].*[/\\]build[/\\]/,
    ],
  },
});

/**
 * `react-native-web` ships no TypeScript types. Its public surface mirrors
 * React Native's, so the app's existing RN types describe it accurately enough
 * for the preview harness. Only files under `web/` import it directly.
 */
declare module 'react-native-web' {
  export * from 'react-native';
}

declare module 'react-native-web/dist/modules/AssetRegistry' {
  export function registerAsset(asset: object): number;
  export function getAssetByID(assetId: number): object | undefined;
}

/**
 * Browser stand-in for the Android `CalcNoirNotebookDatabase` TurboModule.
 *
 * Metro resolves `.web.ts` only for the web platform, so the Android and iOS
 * builds keep using `NativeNotebookDatabase.ts` and the real SQLite module.
 * `react-native-web` has no `TurboModuleRegistry`, so importing the real spec
 * in the browser would throw at module load.
 *
 * Returning `null` matches what `TurboModuleRegistry.get` returns on a platform
 * without the module. `createDatabaseStorage` is already called with
 * `Platform.OS === 'android'`, so the browser falls through to the AsyncStorage
 * driver (localStorage) and the notebook stays fully usable in the preview.
 */
export default null;

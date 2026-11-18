/**
 * Browser entry point for the CalcNoir preview.
 *
 * This mounts the unmodified `App.tsx` through react-native-web's AppRegistry,
 * so every screen, navigator and component is the same code the Android build
 * runs. Nothing here is referenced by Metro, Gradle or the native projects.
 */
import { AppRegistry } from 'react-native';
import App from '../App';
import { name as appName } from '../app.json';

const rootTag = document.getElementById('root');

if (!rootTag) {
  throw new Error('CalcNoir preview: #root container is missing from index.html.');
}

/**
 * react-native-web mounts into a DOM element, while React Native's types
 * describe `rootTag` as a native view handle. Only the type differs — this is
 * the documented react-native-web call.
 */
const runApplication = AppRegistry.runApplication as unknown as (
  name: string,
  options: { rootTag: HTMLElement },
) => void;

AppRegistry.registerComponent(appName, () => App);
runApplication(appName, { rootTag });

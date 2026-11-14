import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  readNotebook(): Promise<string | null>;
  writeNotebook(serialized: string): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('CalcNoirNotebookDatabase');

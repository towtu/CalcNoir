import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { NotebookProvider } from './src/shared/storage';
import { ThemeProvider, useTheme } from './src/shared/theme';

function MainApp(): React.JSX.Element {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NotebookProvider>
          <MainApp />
        </NotebookProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;

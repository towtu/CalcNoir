import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
  useNavigation,
} from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { ICONS } from '../../shared/assets/icons';
import { MeshBackground } from '../../shared/ui/MeshBackground';
import { RaisedTabBar } from './RaisedTabBar';
import { defaultProblem, methodInfo } from '../../core/methods';
import { calculate } from '../../core/numerics';
import { HomeScreen } from '../../features/home/HomeScreen';
import { MethodsScreen } from '../../features/methods/MethodsScreen';
import { SolverScreen } from '../../features/solver';
import { ResultScreen } from '../../features/solver/ResultScreen';
import { StepsScreen } from '../../features/solver/StepsScreen';
import { GraphScreen } from '../../features/solver/GraphScreen';
import { TableScreen } from '../../features/solver/TableScreen';
import { ComparisonScreen } from '../../features/comparison/ComparisonScreen';
import {
  NotebookScreen,
  NotebookPageScreen,
  NotebookEditorScreen,
} from '../../features/notebook';
import { LearnScreen } from '../../features/learn/LearnScreen';
import { LessonScreen } from '../../features/learn/LessonScreen';
import { IntroAnimation } from '../../features/intro/IntroAnimation';
import { NavigationTour } from '../../features/intro/NavigationTour';
import { useTour } from '../../features/intro/useTour';
import { PracticeScreen } from '../../features/practice/PracticeScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { useNotebook } from '../../shared/storage';
import {
  headerTitle,
  minTouch,
  radius,
  space,
  useTheme,
} from '../../shared/theme';
import { useReducedMotion } from '../../shared/ui/useReducedMotion';
import type { RootStack, RootTabs } from './types';

const Tab = createBottomTabNavigator<RootTabs>();
const Stack = createNativeStackNavigator<RootStack>();
const icons: Record<keyof RootTabs, string> = {
  Home: ICONS.home,
  Solve: ICONS.calculator,
  Learn: ICONS.graduationCap,
  Notebook: ICONS.journal,
};
function TabIcon({ name, color }: { name: keyof RootTabs; color: string }) {
  return (
    <>
      <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
        <Path d={icons[name]} fill={color} fillRule="evenodd" />
      </Svg>
    </>
  );
}
const tabIcons = {
  Home: ({ color }: { color: string }) => (
    <TabIcon name="Home" color={color} />
  ),
  Solve: ({ color }: { color: string }) => (
    <TabIcon name="Solve" color={color} />
  ),
  Learn: ({ color }: { color: string }) => (
    <TabIcon name="Learn" color={color} />
  ),
  Notebook: ({ color }: { color: string }) => (
    <TabIcon name="Notebook" color={color} />
  ),
};
function renderTabBar(props: BottomTabBarProps) {
  return <RaisedTabBar {...props} />;
}
function MainTabs({
  navigation,
  warning,
}: NativeStackScreenProps<RootStack, 'Main'> & { warning?: string | null }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: reducedMotion ? 'none' : 'shift',
        transitionSpec: { animation: 'timing', config: { duration: 220 } },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: tabIcons[route.name],
      })}
    >
      <Tab.Screen name="Home">
        {({ navigation: tabs }) => (
          <HomeScreen
            warning={warning}
            onSolve={() => tabs.navigate('Solve')}
            onLearn={() => tabs.navigate('Learn')}
            onNotebook={() => tabs.navigate('Notebook')}
            onOpenSaved={entryId => navigation.push('SavedPage', { entryId })}
            onSettings={() => navigation.push('Settings')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Solve">
        {() => (
          <MethodsScreen
            onChoose={method =>
              navigation.push('Problem', { problem: defaultProblem(method) })
            }
            onSettings={() => navigation.push('Settings')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Learn">
        {() => (
          <LearnScreen
            onLesson={method => navigation.push('Lesson', { method })}
            onSettings={() => navigation.push('Settings')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Notebook">
        {({ navigation: tabs }) => (
          <NotebookScreen
            onOpen={entryId => navigation.push('SavedPage', { entryId })}
            onCreate={() => tabs.navigate('Solve')}
            onSettings={() => navigation.push('Settings')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
function LessonRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'Lesson'>) {
  return (
    <LessonScreen
      method={route.params.method}
      onPractice={method => navigation.push('Practice', { method })}
      onSolve={method =>
        navigation.push('Problem', { problem: defaultProblem(method) })
      }
    />
  );
}
function PracticeRoute({
  route,
}: NativeStackScreenProps<RootStack, 'Practice'>) {
  return <PracticeScreen method={route.params?.method} />;
}
function ProblemRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'Problem'>) {
  return (
    <SolverScreen
      initialProblem={route.params.problem}
      onCalculated={calculation =>
        navigation.push('Result', {
          calculation,
          savedId: route.params.savedId,
        })
      }
    />
  );
}
function ResultRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'Result'>) {
  const { readOnly, loading, warning } = useNotebook();
  const { calculation, savedId } = route.params;
  return (
    <ResultScreen
      calculation={calculation}
      savedId={savedId}
      notebookReadOnly={readOnly || loading}
      notebookWarning={loading ? 'Opening your saved problems…' : warning}
      onSave={() =>
        navigation.push('SavedEditor', {
          entryId: savedId,
          initialProblem: calculation.problem,
        })
      }
      onSteps={() => navigation.push('Steps', { calculation })}
      onGraph={() => navigation.push('Graph', { calculation })}
      onTable={() => navigation.push('Table', { calculation })}
      onCompare={() =>
        navigation.push('Comparison', { problem: calculation.problem })
      }
    />
  );
}
function StepsRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'Steps'>) {
  return (
    <StepsScreen
      {...route.params}
      onGraph={initialStep =>
        navigation.push('Graph', {
          calculation: route.params.calculation,
          initialStep,
        })
      }
    />
  );
}
function GraphRoute({ route }: NativeStackScreenProps<RootStack, 'Graph'>) {
  return <GraphScreen {...route.params} />;
}
function TableRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'Table'>) {
  return (
    <TableScreen
      calculation={route.params.calculation}
      onStep={initialStep =>
        navigation.push('Steps', {
          calculation: route.params.calculation,
          initialStep,
        })
      }
    />
  );
}
function ComparisonRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'Comparison'>) {
  return (
    <ComparisonScreen
      problem={route.params.problem}
      onOpen={problem =>
        navigation.push('Result', { calculation: calculate(problem) })
      }
    />
  );
}
function SavedPageRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'SavedPage'>) {
  return (
    <NotebookPageScreen
      entryId={route.params.entryId}
      onEdit={entryId => navigation.push('SavedEditor', { entryId })}
      onCalculate={(problem, savedId) =>
        navigation.push('Result', { calculation: calculate(problem), savedId })
      }
      onOpen={entryId => navigation.push('SavedPage', { entryId })}
      onDeleted={() => navigation.popTo('Main', { screen: 'Notebook' })}
    />
  );
}
function SavedEditorRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'SavedEditor'>) {
  return (
    <NotebookEditorScreen
      {...route.params}
      onChooseMethod={current =>
        navigation.push('SavedMethod', {
          editor: { ...route.params, selectedMethod: current },
        })
      }
      onSaved={entryId => navigation.popTo('SavedPage', { entryId })}
    />
  );
}
function SavedMethodRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'SavedMethod'>) {
  return (
    <MethodsScreen
      picker
      selectedMethod={route.params.editor.selectedMethod}
      onChoose={method =>
        navigation.popTo('SavedEditor', {
          ...route.params.editor,
          selectedMethod: method,
        })
      }
    />
  );
}
function BackButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={styles.back}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
        <Path
          d="M14.7 4.3a1.1 1.1 0 0 1 0 1.56L8.56 12l6.14 6.14a1.1 1.1 0 1 1-1.56 1.56l-6.92-6.92a1.1 1.1 0 0 1 0-1.56l6.92-6.92a1.1 1.1 0 0 1 1.56 0Z"
          fill={colors.text}
        />
      </Svg>
    </Pressable>
  );
}
/**
 * The way out of a deep stack.
 *
 * Solve a problem, open its steps, open the graph from a step, compare the
 * methods: four screens, and the only way back to a tab was four taps on Back.
 * This pops the whole stack in one, so no screen is ever more than one tap
 * from the app's root. It is hidden on `Main` itself, where there is nothing
 * to pop and the Home tab is already in the bar.
 */
function HeaderHomeControl() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { colors } = useTheme();
  if (!navigation.canGoBack()) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to home"
      onPress={() => navigation.popTo('Main', { screen: 'Home' })}
      style={({ pressed }) => [styles.home, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.homeCircle,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
          <Path d={ICONS.home} fill={colors.text} fillRule="evenodd" />
        </Svg>
      </View>
    </Pressable>
  );
}
function HeaderBackControl() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  return navigation.canGoBack() ? (
    <BackButton onPress={navigation.goBack} />
  ) : null;
}
export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const tour = useTour();
  const navigationRef = useNavigationContainerRef<RootStack>();
  /**
   * The opening plays over the app rather than in front of it, so the
   * navigator mounts and lays out while the curtain is still down. The tour
   * waits for the curtain to lift — it points at a tab bar that has to be
   * on screen to be pointed at.
   */
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  const focusTab = useCallback(
    (tab: keyof RootTabs) => {
      if (navigationRef.isReady()) navigationRef.navigate('Main', { screen: tab });
    },
    [navigationRef],
  );
  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: 'transparent',
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
      notification: colors.accent,
    },
  };
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MeshBackground />
      <NavigationContainer ref={navigationRef} theme={theme}>
      <Stack.Navigator
        screenOptions={() => ({
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: colors.text,
          headerTitleStyle: headerTitle,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: 'transparent' },
          headerBackVisible: false,
          animation: reducedMotion ? 'none' : 'slide_from_right',
          animationDuration: 220,
          headerLeft: HeaderBackControl,
          headerRight: HeaderHomeControl,
        })}
      >
        <Stack.Screen name="Main" options={{ headerShown: false }}>
          {props => <MainTabs {...props} warning={tour.warning} />}
        </Stack.Screen>
        <Stack.Screen
          name="Problem"
          component={ProblemRoute}
          options={({ route }) => ({
            title: methodInfo(route.params.problem.method).title,
          })}
        />
        <Stack.Screen
          name="Result"
          component={ResultRoute}
          options={{
            title: 'Result',
            animation: reducedMotion ? 'none' : 'fade_from_bottom',
          }}
        />
        <Stack.Screen
          name="Steps"
          component={StepsRoute}
          options={{ title: 'Steps' }}
        />
        <Stack.Screen
          name="Graph"
          component={GraphRoute}
          options={{ title: 'Graph' }}
        />
        <Stack.Screen
          name="Table"
          component={TableRoute}
          options={{ title: 'Table' }}
        />
        <Stack.Screen
          name="Comparison"
          component={ComparisonRoute}
          options={{ title: 'Compare methods' }}
        />
        <Stack.Screen
          name="SavedPage"
          component={SavedPageRoute}
          options={{ title: 'Notebook' }}
        />
        <Stack.Screen
          name="SavedEditor"
          component={SavedEditorRoute}
          options={({ route }) => ({
            title: route.params.entryId ? 'Edit problem' : 'Save problem',
            animation: reducedMotion ? 'none' : 'slide_from_bottom',
          })}
        />
        <Stack.Screen
          name="SavedMethod"
          component={SavedMethodRoute}
          options={{ title: 'Change method' }}
        />
        <Stack.Screen
          name="Lesson"
          component={LessonRoute}
          options={({ route }) => ({
            title: methodInfo(route.params.method).title,
          })}
        />
        <Stack.Screen
          name="Practice"
          component={PracticeRoute}
          options={{ title: 'Practice' }}
        />
        <Stack.Screen name="Settings" options={{ title: 'Settings' }}>
          {({ navigation }) => (
            <SettingsScreen
              /**
               * Back to the tabs first: the tour points at the tab bar and the
               * header shortcut, and neither is on screen while Settings is
               * pushed over them.
               */
              onTutorial={() => {
                navigation.popTo('Main', { screen: 'Home' });
                tour.replay();
              }}
            />
          )}
        </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
      {introDone ? null : <IntroAnimation onDone={finishIntro} />}
      {introDone && !tour.loading && tour.needed ? (
        <NavigationTour
          warning={tour.warning}
          onFocusTab={focusTab}
          onDone={tour.finish}
        />
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  /**
   * The header's own left and right containers sit flush against the screen
   * edge, so both controls carry the content inset themselves. A `minTouch`
   * box inset by `space.edge` puts each glyph in the same column as the
   * settings shortcut on the four tab screens: nothing jumps sideways when a
   * screen is pushed.
   */
  back: {
    minHeight: minTouch,
    width: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: space.edge,
  },
  /** The touch target stays 48; only the drawn circle inside it is smaller. */
  home: {
    height: minTouch,
    width: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: space.edge,
  },
  homeCircle: {
    height: 40,
    width: 40,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

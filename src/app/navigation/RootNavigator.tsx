import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
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
import { RaisedTabBar } from './RaisedTabBar';
import { defaultProblem, methodInfo } from '../../core/methods';
import { calculate } from '../../core/numerics';
import type { Calculation } from '../../core/numerics/types';
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
import { GettingStartedScreen } from '../../features/learn/GettingStartedScreen';
import { LearnScreen } from '../../features/learn/LearnScreen';
import { useGettingStarted } from '../../features/learn/useGettingStarted';
import { PracticeScreen } from '../../features/practice/PracticeScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { useNotebook } from '../../shared/storage';
import { useTheme } from '../../shared/theme';
import { useReducedMotion } from '../../shared/ui/useReducedMotion';
import { Brand, Body, Screen } from '../../shared/ui';
import type { RootStack, RootTabs } from './types';

const Tab = createBottomTabNavigator<RootTabs>();
const Stack = createNativeStackNavigator<RootStack>();
const icons: Record<keyof RootTabs, string> = {
  Methods: 'M3 18C7 18 8 5 12 5S17 18 21 18M3 21H21M4 3V21',
  Notebook: 'M5 3H20V21H5ZM8 3V21M11 8H17M11 12H17',
  Learn: 'M3 4H10L12 6L14 4H21V20H14L12 22L10 20H3ZM12 6V22',
  Settings: 'M4 6H20M4 12H20M4 18H20M8 3V9M16 9V15M10 15V21',
};
function TabIcon({ name, color }: { name: keyof RootTabs; color: string }) {
  return (
    <>
      <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
        <Path
          d={icons[name]}
          stroke={color}
          strokeWidth={1.7}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </>
  );
}
const tabIcons = {
  Methods: ({ color }: { color: string }) => (
    <TabIcon name="Methods" color={color} />
  ),
  Notebook: ({ color }: { color: string }) => (
    <TabIcon name="Notebook" color={color} />
  ),
  Learn: ({ color }: { color: string }) => (
    <TabIcon name="Learn" color={color} />
  ),
  Settings: ({ color }: { color: string }) => (
    <TabIcon name="Settings" color={color} />
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
      <Tab.Screen name="Methods">
        {() => (
          <MethodsScreen
            warning={warning}
            onChoose={method =>
              navigation.push('Problem', { problem: defaultProblem(method) })
            }
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Notebook">
        {({ navigation: tabs }) => (
          <NotebookScreen
            onOpen={entryId => navigation.push('SavedPage', { entryId })}
            onCreate={() => tabs.navigate('Methods')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Learn">
        {() => (
          <LearnScreen
            onGuide={() => navigation.push('GettingStarted')}
            onPractice={() => navigation.push('Practice')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Settings">
        {() => (
          <SettingsScreen
            onTutorial={() => navigation.push('GettingStarted')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
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
function GuideRoute({
  navigation,
}: NativeStackScreenProps<RootStack, 'GettingStarted'>) {
  return (
    <GettingStartedScreen
      onSkip={() => navigation.goBack()}
      onComplete={calculation => navigation.replace('Result', { calculation })}
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
      <Text style={[styles.backText, { color: colors.text }]}>‹ Back</Text>
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
  const onboarding = useGettingStarted();
  const navigationRef = useNavigationContainerRef<RootStack>();
  const [pendingCalculation, setPendingCalculation] =
    useState<Calculation | null>(null);
  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
      notification: colors.accent,
    },
  };
  if (onboarding.loading)
    return (
      <Screen>
        <Brand />
        <Body muted>Opening CalcNoir…</Body>
      </Screen>
    );
  if (onboarding.needed)
    return (
      <GettingStartedScreen
        warning={onboarding.warning}
        onSkip={onboarding.finish}
        onComplete={calculation => {
          setPendingCalculation(calculation);
          onboarding.finish();
        }}
      />
    );
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={theme}
      onReady={() => {
        if (pendingCalculation) {
          navigationRef.navigate('Result', { calculation: pendingCalculation });
          setPendingCalculation(null);
        }
      }}
    >
      <Stack.Navigator
        screenOptions={() => ({
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: 17, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerBackVisible: false,
          animation: reducedMotion ? 'none' : 'slide_from_right',
          animationDuration: 220,
          headerLeft: HeaderBackControl,
        })}
      >
        <Stack.Screen name="Main" options={{ headerShown: false }}>
          {props => <MainTabs {...props} warning={onboarding.warning} />}
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
          options={{ title: 'Notebook page' }}
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
          name="GettingStarted"
          component={GuideRoute}
          options={{
            title: 'Getting started',
            headerShown: false,
            animation: reducedMotion ? 'none' : 'fade',
          }}
        />
        <Stack.Screen
          name="Practice"
          component={PracticeScreen}
          options={{ title: 'Practice' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({
  backText: { fontSize: 16 },
  back: {
    minHeight: 48,
    minWidth: 64,
    justifyContent: 'center',
    paddingRight: 12,
  },
});

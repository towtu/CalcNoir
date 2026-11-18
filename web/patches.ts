/**
 * Parity patches for `react-native-web` 0.21.
 *
 * These close the gaps where RNW's API shape differs from React Native's in a
 * way that breaks app code. They run once, before the app renders, and touch
 * nothing in `src/` so the native build is unaffected.
 */
// Imported from react-native-web directly: importing 'react-native' here would
// cycle back through the shim that calls into this module.
import { AccessibilityInfo, Alert, TextInput } from 'react-native-web';

type Removable = { remove: () => void };

/**
 * RN's `AccessibilityInfo.addEventListener` returns an `EmitterSubscription`
 * with `remove()`. RNW returns a value without it, so `useReducedMotion`'s
 * cleanup (`subscription.remove()`) throws on every unmount — which means
 * navigating away from any screen tears down the app.
 */
function patchAccessibilityInfo(): void {
  const target = AccessibilityInfo as unknown as {
    addEventListener: (event: string, handler: (value: boolean) => void) => unknown;
  };
  const original = target.addEventListener.bind(AccessibilityInfo);

  target.addEventListener = (event, handler): Removable => {
    const subscription = original(event, handler) as Partial<Removable> | null | undefined;
    return {
      remove: () => {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      },
    };
  };
}

type AlertButton = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: (() => void) | (() => Promise<void>);
};

/**
 * `Alert.alert` is a no-op in react-native-web — the class is exported, the
 * method does nothing. Every confirmation in the app therefore vanished in the
 * preview: deleting a notebook page called `Alert.alert`, nothing appeared, and
 * nothing was deleted. Android and iOS were never affected.
 *
 * `window.confirm` is the browser's own two-button dialog, which is the shape
 * these call sites use: a cancel and a destructive action. Choosing OK runs the
 * destructive handler, cancelling runs the cancel handler, so the `confirming`
 * guards in the notebook screens are released either way.
 */
function patchAlert(): void {
  const target = Alert as unknown as {
    alert: (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: { onDismiss?: () => void },
    ) => void;
  };

  target.alert = (title, message, buttons, options) => {
    const prompt = message ? `${title}\n\n${message}` : title;
    const list = buttons?.length ? buttons : [{ text: 'OK' }];
    const cancel = list.find(button => button.style === 'cancel');
    const confirm =
      list.find(button => button.style !== 'cancel') ?? list[list.length - 1];

    if (list.length === 1) {
      window.alert(prompt);
      void confirm?.onPress?.();
      return;
    }
    if (window.confirm(prompt)) {
      void confirm?.onPress?.();
      return;
    }
    // Cancelling is a choice, not a dismissal, so only the cancel handler runs.
    if (cancel?.onPress) void cancel.onPress();
    else options?.onDismiss?.();
  };
}

/**
 * A hardware-back handler calls `TextInput.State.currentlyFocusedInput()`.
 * RNW exposes `TextInput.State` but not that method. The browser has no
 * hardware back button, so this is defensive only.
 */
function patchTextInputState(): void {
  const state = (TextInput as unknown as {
    State?: { currentlyFocusedInput?: () => unknown };
  }).State;

  if (state && typeof state.currentlyFocusedInput !== 'function') {
    state.currentlyFocusedInput = () =>
      typeof document === 'undefined' ? null : document.activeElement;
  }
}

export function applyWebPatches(): void {
  patchAccessibilityInfo();
  patchAlert();
  patchTextInputState();
}

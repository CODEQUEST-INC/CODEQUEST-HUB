import { Alert, Platform } from 'react-native';

// RN's Alert.alert with a multi-button array doesn't work reliably on web —
// react-native-web either no-ops or only partially maps it to
// window.confirm(), so a destructive action wired through Alert.alert alone
// can silently do nothing in a browser. This is the one place that decides
// per-platform, so every confirm dialog in the app behaves the same way
// everywhere instead of quietly breaking on web one screen at a time.
export function confirmAction(options: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  destructive?: boolean;
}) {
  const { title, message, confirmLabel, onConfirm, cancelLabel = 'Cancel' } = options;

  if (Platform.OS === 'web') {
    // window.confirm can't customize button text (always OK/Cancel per
    // browser chrome), so cancelLabel only applies on native.
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: options.destructive === false ? 'default' : 'destructive', onPress: onConfirm },
  ]);
}

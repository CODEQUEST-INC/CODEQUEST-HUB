import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Text from '../components/Text';
import Button from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { spacing, useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PdfViewer'>;

// iOS's WKWebView renders PDFs natively when given a direct URL. Android's
// WebView doesn't — it needs a viewer wrapped around the URL, so this routes
// through Google's public PDF viewer there instead.
function viewerUri(url: string): string {
  if (Platform.OS === 'android') {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
  }
  return url;
}

export default function PdfViewerScreen({ route }: Props) {
  const { url } = route.params;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Couldn't load this PDF.</Text>
        <Button label="Try again" onPress={() => setError(false)} style={styles.retryButton} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <WebView
        source={{ uri: viewerUri(url) }}
        onLoadEnd={() => setLoading(false)}
        onError={() => setError(true)}
        onHttpError={() => setError(true)}
        style={{ flex: 1 }}
      />
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xxl, gap: spacing.md },
    errorText: { color: colors.textMuted },
    retryButton: { marginTop: spacing.sm },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
    },
  });
}

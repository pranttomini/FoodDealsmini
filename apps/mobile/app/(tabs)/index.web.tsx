import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { theme } from '../../constants/theme';

export default function MapScreenWeb() {
  return (
    <View style={styles.webPlaceholder}>
      <Text style={styles.webTitle}>Map View on mobile app</Text>
      <Text style={styles.webText}>Interactive map rendering is available in native Expo Go builds.</Text>
      <Text style={styles.webText}>Use the List tab in web preview to browse and open full deal details.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  webTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  webText: { fontSize: 14, color: theme.colors.muted, textAlign: 'center' },
});

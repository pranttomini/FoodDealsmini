import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View, Alert, Platform, Text } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { DealDetailModal } from '../../components/DealDetailModal';
import { theme } from '../../constants/theme';

const BERLIN_CENTER = {
  latitude: 52.52,
  longitude: 13.405,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

interface Deal {
  id: string;
  title: string;
  description: string;
  restaurant_name: string;
  address: string;
  latitude: number;
  longitude: number;
  deal_price: number;
  original_price: number;
  discount_percentage: number;
  image_url: string | null;
  cuisine_type: string;
  deal_type: string;
  upvotes: number;
  downvotes: number;
  vote_score: number;
  user_id: string;
  created_at: string;
}

export default function MapScreen() {
  const [location, setLocation] = useState(BERLIN_CENTER);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({});
          setLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }
      } catch (error) {
        console.log('Location error:', error);
      }
    })();
  }, []);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase.from('deals').select('*').eq('is_active', true);
      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      Alert.alert('Error', 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webPlaceholder}>
        <Text style={styles.webTitle}>Map View on mobile app</Text>
        <Text style={styles.webText}>Map rendering is available in native Expo Go builds.</Text>
        <Text style={styles.webText}>Open List tab for full deal browsing in web preview.</Text>
      </View>
    );
  }

  // keep runtime require for native only (avoid web static resolution)
  // eslint-disable-next-line no-eval
  const nativeRequire = eval('require');
  const Maps = nativeRequire('react-native-maps');
  const MapView = Maps.default;
  const Marker = Maps.Marker;
  const PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={location}
        showsUserLocation
        showsMyLocationButton
      >
        {deals.map((deal) => (
          <Marker
            key={deal.id}
            coordinate={{ latitude: Number(deal.latitude), longitude: Number(deal.longitude) }}
            title={deal.title}
            description={`${deal.restaurant_name} - €${deal.deal_price}`}
            onPress={() => {
              setSelectedDeal(deal);
              setModalVisible(true);
            }}
          />
        ))}
      </MapView>

      <DealDetailModal
        visible={modalVisible}
        deal={selectedDeal}
        onClose={() => {
          setModalVisible(false);
          setSelectedDeal(null);
        }}
        onDealUpdated={fetchDeals}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  loadingText: { marginTop: 10, color: theme.colors.muted },
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

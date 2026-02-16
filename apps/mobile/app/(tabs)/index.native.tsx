import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View, Alert, Text } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
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
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View as RNView, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Text, View } from '@/components/Themed';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DealDetailModal } from '../../components/DealDetailModal';

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
  const { user } = useAuth();
  const [location, setLocation] = useState(BERLIN_CENTER);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Request location permission and get user location
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

  // Fetch deals from Supabase
  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      Alert.alert('Error', 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (deal: Deal) => {
    setSelectedDeal(deal);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedDeal(null);
  };

  const handleDealUpdated = () => {
    fetchDeals();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading deals...</Text>
      </View>
    );
  }

  return (
    <RNView style={styles.container}>
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
            coordinate={{
              latitude: Number(deal.latitude),
              longitude: Number(deal.longitude),
            }}
            title={deal.title}
            description={`${deal.restaurant_name} - €${deal.deal_price}`}
            onPress={() => handleMarkerPress(deal)}
          />
        ))}
      </MapView>

      <DealDetailModal
        visible={modalVisible}
        deal={selectedDeal}
        onClose={handleModalClose}
        onDealUpdated={handleDealUpdated}
      />
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: 10,
  },
});

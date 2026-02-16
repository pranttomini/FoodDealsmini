import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, RefreshControl, View, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { DealDetailModal } from '../../components/DealDetailModal';
import { theme } from '../../constants/theme';

interface Deal {
  id: string;
  title: string;
  description: string;
  restaurant_name: string;
  address: string;
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

export default function ListScreen() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('is_active', true)
        .order('vote_score', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  const handleDealPress = (deal: Deal) => {
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

  const renderDealCard = ({ item }: { item: Deal }) => {
    const score = (item.upvotes || 0) - (item.downvotes || 0);

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleDealPress(item)} activeOpacity={0.9}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>FoodDeal</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.rowTop}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <View style={styles.priceWrap}>
              <Text style={styles.price}>€{Number(item.deal_price).toFixed(2)}</Text>
              {!!item.original_price && <Text style={styles.originalPrice}>€{Number(item.original_price).toFixed(2)}</Text>}
            </View>
          </View>

          <Text style={styles.restaurant} numberOfLines={1}>{item.restaurant_name}</Text>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

          <View style={styles.rowBottom}>
            <View style={styles.tagsRow}>
              <View style={styles.tag}><Text style={styles.tagText}>{item.cuisine_type || 'food'}</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>{item.deal_type || 'deal'}</Text></View>
            </View>

            <View style={styles.votePill}>
              <Text style={styles.voteText}>▲ {item.upvotes || 0}</Text>
              <Text style={styles.voteDot}>•</Text>
              <Text style={styles.voteScore}>{score}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading deals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FoodDeals Berlin</Text>
        <Text style={styles.headerSub}>Best local offers right now</Text>
      </View>

      <FlatList
        data={deals}
        renderItem={renderDealCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No deals available</Text>
          </View>
        }
      />

      <DealDetailModal visible={modalVisible} deal={selectedDeal} onClose={handleModalClose} onDealUpdated={handleDealUpdated} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  headerSub: { fontSize: 13, color: theme.colors.muted, marginTop: 3 },
  listContent: { paddingHorizontal: 14, paddingBottom: 110, paddingTop: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  loadingText: { marginTop: 10, color: theme.colors.muted },

  card: {
    marginBottom: 14,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  image: { width: '100%', height: 170 },
  imageFallback: { backgroundColor: '#fde7d7', justifyContent: 'center', alignItems: 'center' },
  imageFallbackText: { color: '#9a3412', fontWeight: '700' },
  cardContent: { padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 18, lineHeight: 22, fontWeight: '800', color: theme.colors.text },
  priceWrap: { alignItems: 'flex-end' },
  price: { fontSize: 24, fontWeight: '900', color: theme.colors.success },
  originalPrice: { fontSize: 12, color: '#9ca3af', textDecorationLine: 'line-through' },
  restaurant: { marginTop: 6, fontSize: 14, color: '#374151', fontWeight: '600' },
  description: { marginTop: 6, fontSize: 14, lineHeight: 20, color: '#4b5563' },

  rowBottom: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tagsRow: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  tag: { backgroundColor: theme.colors.chipBg, borderColor: '#fed7aa', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { color: theme.colors.chipText, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  votePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  voteText: { fontSize: 12, fontWeight: '700', color: '#9a3412' },
  voteDot: { marginHorizontal: 6, color: '#fdba74' },
  voteScore: { fontSize: 12, fontWeight: '800', color: '#c2410c' },

  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.colors.muted, fontSize: 15 },
});

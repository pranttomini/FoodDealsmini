import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { Pill, PrimaryButton, SurfaceCard } from '../../components/ui/MobilePrimitives';
import { theme } from '../../constants/theme';

const BERLIN_CENTER = { latitude: 52.52, longitude: 13.405 };

const DEAL_TYPES = [
  { value: 'happy_hour', label: 'Happy Hour' },
  { value: 'student', label: 'Student Deal' },
  { value: 'lunch', label: 'Lunch Special' },
  { value: 'early_bird', label: 'Early Bird' },
  { value: 'late_night', label: 'Late Night' },
];

const CUISINE_TYPES = [
  { value: 'italian', label: 'Italian' },
  { value: 'asian', label: 'Asian' },
  { value: 'german', label: 'German' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'american', label: 'American' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'fast_food', label: 'Fast Food' },
  { value: 'other', label: 'Other' },
];

export default function PostScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    restaurantName: '',
    address: '',
    dealPrice: '',
    originalPrice: '',
    dealType: 'lunch',
    cuisineType: 'other',
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `${user!.id}_${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from('deal-images').upload(fileName, blob, {
        contentType: `image/${ext}`,
        upsert: false,
      });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('deal-images').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return BERLIN_CENTER;

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      return BERLIN_CENTER;
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.restaurantName || !formData.dealPrice) {
      Alert.alert('Missing fields', 'Please fill in all required fields');
      return;
    }

    if (!user) {
      Alert.alert('Not logged in', 'Please log in to post deals');
      return;
    }

    const dealPrice = parseFloat(formData.dealPrice);
    const originalPrice = formData.originalPrice ? parseFloat(formData.originalPrice) : null;

    if (isNaN(dealPrice) || dealPrice <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid deal price');
      return;
    }

    if (originalPrice && dealPrice >= originalPrice) {
      Alert.alert('Invalid price', 'Deal price must be less than original price');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
        if (!imageUrl) {
          Alert.alert('Upload failed', 'Failed to upload image');
          setLoading(false);
          return;
        }
      }

      const location = await getCurrentLocation();

      const { error } = await supabase.from('deals').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        restaurant_name: formData.restaurantName,
        address: formData.address,
        deal_price: dealPrice,
        original_price: originalPrice,
        deal_type: formData.dealType,
        cuisine_type: formData.cuisineType,
        latitude: location.latitude,
        longitude: location.longitude,
        image_url: imageUrl,
        is_active: true,
      });

      if (error) throw error;

      Alert.alert('Success!', 'Your deal has been posted', [
        {
          text: 'OK',
          onPress: () => {
            setFormData({
              title: '',
              description: '',
              restaurantName: '',
              address: '',
              dealPrice: '',
              originalPrice: '',
              dealType: 'lunch',
              cuisineType: 'other',
            });
            setImageUri(null);
            router.push('/(tabs)');
          },
        },
      ]);
    } catch (error) {
      console.error('Error posting deal:', error);
      Alert.alert('Error', 'Failed to post deal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.authFallback}>
        <Text style={styles.authTitle}>Post a New Deal</Text>
        <Text style={styles.authText}>Please log in to share deals with the community.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create Deal</Text>
        <Text style={styles.subtitle}>Highlight the value fast: offer, place, and proof.</Text>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Cover Photo</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions} activeOpacity={0.9}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderTitle}>📷 Add a photo</Text>
                <Text style={styles.imagePlaceholderSub}>Deals with photos get more votes.</Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri ? (
            <PrimaryButton title="Change Photo" onPress={showImageOptions} secondary />
          ) : null}
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Core Details</Text>
          <FieldLabel text="Deal Title *" />
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="2-for-1 Pizza after 18:00"
            placeholderTextColor={theme.colors.textSoft}
          />

          <FieldLabel text="Description" />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="What exactly is included? Mention time, terms, and quality."
            placeholderTextColor={theme.colors.textSoft}
            multiline
            numberOfLines={4}
          />

          <FieldLabel text="Restaurant Name *" />
          <TextInput
            style={styles.input}
            value={formData.restaurantName}
            onChangeText={(text) => setFormData({ ...formData, restaurantName: text })}
            placeholder="Restaurant name"
            placeholderTextColor={theme.colors.textSoft}
          />

          <FieldLabel text="Address" />
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Street + area (Berlin)"
            placeholderTextColor={theme.colors.textSoft}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <FieldLabel text="Deal Price (€) *" />
              <TextInput
                style={styles.input}
                value={formData.dealPrice}
                onChangeText={(text) => setFormData({ ...formData, dealPrice: text })}
                placeholder="9.90"
                placeholderTextColor={theme.colors.textSoft}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.halfWidth}>
              <FieldLabel text="Original Price (€)" />
              <TextInput
                style={styles.input}
                value={formData.originalPrice}
                onChangeText={(text) => setFormData({ ...formData, originalPrice: text })}
                placeholder="15.90"
                placeholderTextColor={theme.colors.textSoft}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Deal Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DEAL_TYPES.map((type) => (
              <Pill
                key={type.value}
                label={type.label}
                selected={formData.dealType === type.value}
                onPress={() => setFormData({ ...formData, dealType: type.value })}
              />
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, styles.secondarySectionTitle]}>Cuisine Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CUISINE_TYPES.map((cuisine) => (
              <Pill
                key={cuisine.value}
                label={cuisine.label}
                selected={formData.cuisineType === cuisine.value}
                onPress={() => setFormData({ ...formData, cuisineType: cuisine.value })}
              />
            ))}
          </ScrollView>
        </SurfaceCard>

        <PrimaryButton title={loading ? 'Posting...' : 'Publish Deal'} onPress={handleSubmit} disabled={loading} rightMeta="Berlin" />

        {loading ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}

        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: 120,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.type.h1,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    color: theme.colors.text,
    fontSize: theme.type.h3,
    fontWeight: '800',
  },
  secondarySectionTitle: {
    marginTop: 16,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  imagePlaceholderTitle: {
    color: '#9a3412',
    fontSize: 18,
    fontWeight: '800',
  },
  imagePlaceholderSub: {
    marginTop: 6,
    color: '#b45309',
    fontSize: 13,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    backgroundColor: '#fff',
    color: theme.colors.text,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  chipRow: {
    paddingBottom: 2,
  },
  authFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
    padding: 24,
  },
  authTitle: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  authText: {
    marginTop: 10,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 15,
  },
  loader: {
    marginTop: 4,
  },
  spacer: {
    height: 20,
  },
});

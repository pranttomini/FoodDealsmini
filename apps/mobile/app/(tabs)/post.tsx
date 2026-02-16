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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Text, View } from '@/components/Themed';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

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
  const { user, session } = useAuth();
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

      const { data, error } = await supabase.storage
        .from('deal-images')
        .upload(fileName, blob, {
          contentType: `image/${ext}`,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('deal-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return BERLIN_CENTER;
      }

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
    // Validation
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
      // Upload image if provided
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
        if (!imageUrl) {
          Alert.alert('Upload failed', 'Failed to upload image');
          setLoading(false);
          return;
        }
      }

      // Get current location
      const location = await getCurrentLocation();

      // Insert deal into Supabase
      const { data, error } = await supabase.from('deals').insert({
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
            // Reset form
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

            // Navigate to map or list tab
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
      <View style={styles.container}>
        <Text style={styles.title}>Post a Deal</Text>
        <Text style={styles.notLoggedIn}>Please log in to post deals</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Post a New Deal</Text>

        {/* Image Picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>📷 Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deal Title *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="e.g., 2-for-1 Pizza"
            placeholderTextColor="#999"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe the deal..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Restaurant */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Restaurant Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.restaurantName}
            onChangeText={(text) => setFormData({ ...formData, restaurantName: text })}
            placeholder="Restaurant name"
            placeholderTextColor="#999"
          />
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Street address, Berlin"
            placeholderTextColor="#999"
          />
        </View>

        {/* Prices */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Deal Price (€) *</Text>
            <TextInput
              style={styles.input}
              value={formData.dealPrice}
              onChangeText={(text) => setFormData({ ...formData, dealPrice: text })}
              placeholder="9.99"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Original Price (€)</Text>
            <TextInput
              style={styles.input}
              value={formData.originalPrice}
              onChangeText={(text) => setFormData({ ...formData, originalPrice: text })}
              placeholder="19.99"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Deal Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deal Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
            {DEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.chip,
                  formData.dealType === type.value && styles.chipSelected,
                ]}
                onPress={() => setFormData({ ...formData, dealType: type.value })}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.dealType === type.value && styles.chipTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Cuisine Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cuisine Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
            {CUISINE_TYPES.map((cuisine) => (
              <TouchableOpacity
                key={cuisine.value}
                style={[
                  styles.chip,
                  formData.cuisineType === cuisine.value && styles.chipSelected,
                ]}
                onPress={() => setFormData({ ...formData, cuisineType: cuisine.value })}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.cuisineType === cuisine.value && styles.chipTextSelected,
                  ]}
                >
                  {cuisine.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Post Deal</Text>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  imagePicker: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#6b7280',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  notLoggedIn: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
  spacer: {
    height: 40,
  },
});

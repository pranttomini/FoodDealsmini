import React, { useState, useRef } from 'react';
import { X, Loader2, ImagePlus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { DealType, DietaryTag, CuisineType, Language } from '../types';
import { analyzeSpam } from '../services/geminiService';
import { getTranslation } from '../translations';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface PostDealFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  lang: Language;
  userLocation: { lat: number; lng: number };
}

export const PostDealForm: React.FC<PostDealFormProps> = ({ onClose, onSubmit, lang, userLocation }) => {
  const { user, session } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    restaurantName: '',
    address: '',
    type: DealType.LUNCH,
    cuisine: CuisineType.OTHER,
    tags: [] as DietaryTag[]
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: any) => getTranslation(lang, key);

  // Derived price validation
  const hasPriceError =
    formData.originalPrice && formData.price &&
    parseFloat(formData.price) >= parseFloat(formData.originalPrice);

  const toggleTag = (tag: DietaryTag) => {
    setFormData(prev => ({
        ...prev,
        tags: prev.tags.includes(tag) 
            ? prev.tags.filter(t => t !== tag)
            : [...prev.tags, tag]
    }));
  };

  // --- Image Handling ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t('imageTooLarge'));
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openImagePicker = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt, // Lets user choose camera or gallery
        });
        if (!image.base64Data) return;
        const binary = atob(image.base64Data);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: `image/${image.format}` });
        const file = new File([blob], `photo.${image.format}`, { type: `image/${image.format}` });
        setImageFile(file);
        setImagePreview(`data:image/${image.format};base64,${image.base64Data}`);
      } catch {
        // User cancelled
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const token = session?.access_token || supabaseKey;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user!.id}_${Date.now()}.${ext}`;

    const res = await fetch(`${supabaseUrl}/storage/v1/object/deal-images/${fileName}`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed: ${errText}`);
    }

    return `${supabaseUrl}/storage/v1/object/public/deal-images/${fileName}`;
  };

  // --- Geocoding (Nominatim) ---
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const query = encodeURIComponent(address.includes('Berlin') ? address : address + ', Berlin, Germany');
      // Use CORS proxy or fallback to random Berlin coordinates
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'FoodDeals Berlin App'
          },
          mode: 'cors'
        }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch (err) {
      console.warn('Geocoding failed, using random Berlin coordinates:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError(t('notLoggedIn'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check for spam before submitting
      const isSpam = await analyzeSpam(formData.title, formData.description);

      if (isSpam) {
        alert(t('spamWarning'));
        setLoading(false);
        return;
      }

      // Upload image if selected
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Try to geocode address, fallback to user's current location
      const geocoded = await geocodeAddress(formData.address);
      const latitude = geocoded?.lat ?? userLocation.lat;
      const longitude = geocoded?.lng ?? userLocation.lng;

      // Map frontend enums to database values
      const dealTypeMap: Record<string, string> = {
        [DealType.HAPPY_HOUR]: 'happy_hour',
        [DealType.LUNCH]: 'lunch',
        [DealType.OPENING]: 'early_bird',
        [DealType.LAST_MINUTE]: 'late_night',
        [DealType.DAILY]: 'lunch',
      };

      const cuisineTypeMap: Record<string, string> = {
        [CuisineType.ITALIAN]: 'italian',
        [CuisineType.ASIAN]: 'asian',
        [CuisineType.GERMAN]: 'german',
        [CuisineType.DONER]: 'other',
        [CuisineType.BURGER]: 'american',
        [CuisineType.INDIAN]: 'asian',
        [CuisineType.MEXICAN]: 'other',
        [CuisineType.PIZZA]: 'italian',
        [CuisineType.OTHER]: 'other',
      };

      // Create deal via raw fetch
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const token = session?.access_token || supabaseKey;

      const dealPayload: Record<string, any> = {
        title: formData.title,
        description: formData.description,
        restaurant_name: formData.restaurantName,
        address: formData.address,
        deal_type: dealTypeMap[formData.type] || 'other',
        cuisine_type: cuisineTypeMap[formData.cuisine] || 'other',
        original_price: parseFloat(formData.originalPrice),
        deal_price: parseFloat(formData.price),
        latitude,
        longitude,
        user_id: user.id,
        is_active: true,
      };

      if (imageUrl) {
        dealPayload.image_url = imageUrl;
      }

      // Default expiry: 24 hours from now
      dealPayload.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Note: discount_percentage is auto-calculated by the database

      const res = await fetch(`${supabaseUrl}/rest/v1/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dealPayload),
      });

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }

      onSubmit(formData);
      onClose();
    } catch (err: any) {
      console.error('Error creating deal:', err);
      setError(err.message || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col`}>
        <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : ''}`}>{t('postDeal')}</h2>
            <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100'}`}><X size={20}/></button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form id="post-deal-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-1`}>{t('dealTitle')}</label>
                    <input
                        required
                        type="text"
                        placeholder={t('placeholderTitle')}
                        className={`w-full p-3 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-black`}
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                </div>

                {/* Deal Photo */}
                <div>
                    <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-2`}>{t('dealPhoto')}</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageSelect}
                    />
                    {!imagePreview ? (
                        <button
                            type="button"
                            onClick={openImagePicker}
                            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors cursor-pointer"
                        >
                            <ImagePlus size={28} />
                            <span className="text-sm font-medium">{t('addPhoto')}</span>
                        </button>
                    ) : (
                        <div className="relative">
                            <img src={imagePreview} alt="Preview" className="w-full h-44 object-cover rounded-xl border border-gray-200" />
                            <button
                                type="button"
                                onClick={() => { setImageFile(null); setImagePreview(null); }}
                                className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors"
                            >
                                <X size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={openImagePicker}
                                className="absolute bottom-2 left-2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-black/80 transition-colors"
                            >
                                {t('changePhoto')}
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-1`}>{t('originalPrice')}</label>
                        <input
                            required
                            type="number"
                            step="0.10"
                            placeholder="12.00"
                            className={`w-full p-3 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-black`}
                            value={formData.originalPrice}
                            onChange={e => setFormData({...formData, originalPrice: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-1`}>{t('dealPriceLabel')}</label>
                        <input
                            required
                            type="number"
                            step="0.10"
                            placeholder="7.50"
                            className={`w-full p-3 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-black`}
                            value={formData.price}
                            onChange={e => setFormData({...formData, price: e.target.value})}
                        />
                    </div>
                </div>
                {hasPriceError && (
                    <p className="text-red-500 text-xs -mt-2">{t('priceError')}</p>
                )}

                <div>
                    <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-1`}>{t('dealType')}</label>
                    <select
                        className={`w-full p-3 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-black`}
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as DealType})}
                    >
                        {Object.values(DealType).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                 <div>
                    <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-2`}>{t('cuisine')}</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.values(CuisineType).map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setFormData({...formData, cuisine: c})}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                    formData.cuisine === c
                                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                                        : isDark
                                            ? 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-1`}>{t('restaurant')}</label>
                    <input 
                        required
                        type="text" 
                        placeholder={t('placeholderRestaurant')}
                        className={`w-full p-3 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-black`}
                        value={formData.restaurantName}
                        onChange={e => setFormData({...formData, restaurantName: e.target.value})}
                    />
                </div>

                <div>
                    <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-1`}>{t('address')}</label>
                    <input 
                        required
                        type="text" 
                        placeholder={t('placeholderAddress')}
                        className={`w-full p-3 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-black`}
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                </div>

                <div>
                    <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-1`}>{t('description')}</label>
                    <textarea
                        required
                        rows={3}
                        placeholder={t('placeholderDescription')}
                        className={`w-full p-3 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-black resize-none`}
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>

                <div>
                    <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-2`}>{t('dietaryTags')}</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.values(DietaryTag).map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                    formData.tags.includes(tag)
                                        ? 'bg-black text-white border-black'
                                        : isDark
                                            ? 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </form>
        </div>

        <div className={`p-4 border-t ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <button 
                type="submit" 
                form="post-deal-form"
                disabled={loading || !!hasPriceError}
                className="w-full bg-black text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" /> {t('posting')}
                    </>
                ) : t('shareDeal')}
            </button>
        </div>
      </div>
    </div>
  );
};
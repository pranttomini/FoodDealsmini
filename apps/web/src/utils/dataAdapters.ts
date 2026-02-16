import { Tables } from '../types/supabase';
import { Deal, DealType, CuisineType, DietaryTag } from '../types';

type SupabaseDeal = Tables<'deals'> & {
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
};

/**
 * Convert Supabase deal to legacy Deal format
 */
export function convertSupabaseDealToLegacy(supabaseDeal: SupabaseDeal): Deal {
  // Map deal_type from DB to legacy enum
  const dealTypeMap: Record<string, DealType> = {
    'happy_hour': DealType.HAPPY_HOUR,
    'student': DealType.LUNCH,
    'lunch': DealType.LUNCH,
    'early_bird': DealType.OPENING,
    'late_night': DealType.LAST_MINUTE,
    'senior': DealType.DAILY,
  };

  // Map cuisine_type from DB to legacy enum
  const cuisineTypeMap: Record<string, CuisineType> = {
    'italian': CuisineType.ITALIAN,
    'asian': CuisineType.ASIAN,
    'german': CuisineType.GERMAN,
    'mediterranean': CuisineType.OTHER,
    'american': CuisineType.BURGER,
    'vegetarian': CuisineType.OTHER,
    'vegan': CuisineType.OTHER,
    'fast_food': CuisineType.BURGER,
    'other': CuisineType.OTHER,
  };

  return {
    id: supabaseDeal.id,
    title: supabaseDeal.title,
    description: supabaseDeal.description,
    restaurantName: supabaseDeal.restaurant_name,
    cuisine: cuisineTypeMap[supabaseDeal.cuisine_type] || CuisineType.OTHER,
    price: Number(supabaseDeal.deal_price),
    originalPrice: Number(supabaseDeal.original_price),
    currency: '€',
    dealType: dealTypeMap[supabaseDeal.deal_type] || DealType.HAPPY_HOUR,
    location: {
      lat: Number(supabaseDeal.latitude),
      lng: Number(supabaseDeal.longitude),
      address: supabaseDeal.address,
    },
    distance: '0km', // Will be calculated
    imageUrl: supabaseDeal.image_url || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
    tags: deriveTags(supabaseDeal.cuisine_type, supabaseDeal.deal_type),
    validFrom: supabaseDeal.created_at || new Date().toISOString(),
    validUntil: supabaseDeal.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    votes: (supabaseDeal.upvotes || 0) - (supabaseDeal.downvotes || 0),
    verified: false, // Can be added later
    postedBy: supabaseDeal.profiles?.username || 'Anonymous',
    userId: supabaseDeal.user_id,
    comments: [], // Will be loaded separately
    userVote: 0, // Will be loaded from votes table
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Derive dietary tags from cuisine_type and deal_type
 */
function deriveTags(cuisineType: string, dealType: string): DietaryTag[] {
  const tags: DietaryTag[] = [];

  // Cuisine-based tags
  if (cuisineType === 'vegan') tags.push(DietaryTag.VEGAN, DietaryTag.VEGETARIAN);
  else if (cuisineType === 'vegetarian') tags.push(DietaryTag.VEGETARIAN);

  // Deal-type-based tags — "student" lunch deals are often halal-friendly
  // Keep it conservative: only assign tags we're confident about
  return tags;
}

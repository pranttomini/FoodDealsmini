export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export enum DealType {
  OPENING = 'Neueröffnung',
  LUNCH = 'Mittagstisch',
  HAPPY_HOUR = 'Happy Hour',
  DAILY = 'Tagesangebot',
  LAST_MINUTE = 'Last Minute'
}

export enum DietaryTag {
  VEGAN = 'Vegan',
  VEGETARIAN = 'Vegetarisch',
  HALAL = 'Halal',
  GLUTEN_FREE = 'Glutenfrei'
}

export enum CuisineType {
  ASIAN = 'Asian',
  ITALIAN = 'Italian',
  DONER = 'Döner & Kebab',
  BURGER = 'Burger',
  GERMAN = 'German',
  INDIAN = 'Indian',
  MEXICAN = 'Mexican',
  PIZZA = 'Pizza',
  OTHER = 'Other'
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
  userId?: string; // author's user_id — used to show delete button
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  restaurantName: string;
  location: Location;
  tags: DietaryTag[];
  cuisine: CuisineType;
  dealType: DealType;
  validFrom: string; // ISO date string
  validUntil: string; // ISO date string
  imageUrl: string;
  votes: number;
  userVote?: number; // -1 for down, 0 for none, 1 for up
  distance?: string; // Calculated at runtime
  verified: boolean;
  postedBy?: string;  // username of deal author
  userId?: string;   // UUID of deal author — used to check ownership
  comments: Comment[];
}

export interface FilterState {
  maxPrice: number;
  maxDistance: number;
  tags: DietaryTag[];
  types: DealType[];
  cuisines: CuisineType[];
  onlyActiveNow: boolean;
}

export interface Badge {
  id: string;
  name: string;
  icon: string; // Emoji or Lucide icon name
  description: string;
  unlocked: boolean;
}

export interface UserProfile {
  name: string;
  level: number;
  xp: number;
  dealsPosted: number;
  moneySaved: number;
  foodAlerts: string[];
  badges: Badge[];
}

export type Language = 'en' | 'de';
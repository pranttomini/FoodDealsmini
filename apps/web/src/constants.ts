import { Deal, DealType, DietaryTag, CuisineType, UserProfile } from './types';

export const BERLIN_CENTER = { lat: 52.5200, lng: 13.4050 };

export const INITIAL_FILTERS = {
  maxPrice: 30, // Set to max by default
  maxDistance: 10, // Default 10km radius
  tags: [],
  types: [],
  cuisines: [],
  onlyActiveNow: false,
};

export const MOCK_USER: UserProfile = {
  name: "Alex Berlin",
  level: 5,
  xp: 450,
  dealsPosted: 12,
  moneySaved: 124.50,
  foodAlerts: ['Ramen', 'Burger', 'Matcha'],
  badges: [
    { id: '1', name: 'Early Bird', icon: '🐦', description: 'Joined in the first month', unlocked: true },
    { id: '2', name: 'Deal Hunter', icon: '🕵️', description: 'Found 10 deals', unlocked: true },
    { id: '3', name: 'Spicy Fan', icon: '🌶️', description: 'Saved 5 spicy deals', unlocked: true },
    { id: '4', name: 'Influencer', icon: '📢', description: 'Post reached 100 votes', unlocked: false },
    { id: '5', name: 'Critic', icon: '✍️', description: 'Wrote 10 comments', unlocked: false },
  ]
};

export const MOCK_DEALS: Deal[] = [
  {
    id: '1',
    title: 'Döner Kebab Opening Special',
    description: 'Celebration of our new opening! Classic Döner for an unbeatable price. Only today.',
    price: 2.50,
    originalPrice: 6.50,
    currency: '€',
    restaurantName: 'Mustafa\'s Cousin',
    location: {
      lat: 52.5200,
      lng: 13.4050,
      address: 'Mehringdamm 32, 10961 Berlin'
    },
    tags: [DietaryTag.HALAL],
    cuisine: CuisineType.DONER,
    dealType: DealType.OPENING,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    imageUrl: 'https://picsum.photos/400/300?random=1',
    votes: 142,
    userVote: 0,
    verified: true,
    comments: [
        { id: 'c1', author: 'Hans M.', text: 'Is the line long?', date: new Date(Date.now() - 3600000).toISOString() },
        { id: 'c2', author: 'Foodie_Berlin', text: 'Best deal in town right now!', date: new Date(Date.now() - 7200000).toISOString() }
    ]
  },
  {
    id: '2',
    title: 'Vegan Falafel Plate',
    description: 'Large mixed plate with hummus, falafel, and salad. Valid for lunch hours.',
    price: 5.90,
    originalPrice: 9.50,
    currency: '€',
    restaurantName: 'Green Kiez',
    location: {
      lat: 52.5240,
      lng: 13.4100,
      address: 'Torstraße 50, 10119 Berlin'
    },
    tags: [DietaryTag.VEGAN, DietaryTag.VEGETARIAN],
    cuisine: CuisineType.DONER,
    dealType: DealType.LUNCH,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 43200000).toISOString(),
    imageUrl: 'https://picsum.photos/400/300?random=2',
    votes: 89,
    userVote: 0,
    verified: true,
    comments: []
  },
  {
    id: '3',
    title: '2-for-1 Pizza Slices',
    description: 'Happy Hour deal! Buy one slice, get one free. Perfect for a quick snack.',
    price: 3.00,
    originalPrice: 6.00,
    currency: '€',
    restaurantName: 'Pizza Punks',
    location: {
      lat: 52.5180,
      lng: 13.3950,
      address: 'Friedrichstraße 100, 10117 Berlin'
    },
    tags: [DietaryTag.VEGETARIAN],
    cuisine: CuisineType.PIZZA,
    dealType: DealType.HAPPY_HOUR,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 100000000).toISOString(),
    imageUrl: 'https://picsum.photos/400/300?random=3',
    votes: 45,
    userVote: 0,
    verified: false,
    comments: [
        { id: 'c3', author: 'Lisa', text: 'Does this apply to the vegan options too?', date: new Date(Date.now() - 1800000).toISOString() }
    ]
  },
  {
    id: '4',
    title: 'Chicken Curry Bowl',
    description: 'Spicy chicken curry with rice. 50% off for the first 50 customers today.',
    price: 4.50,
    originalPrice: 9.00,
    currency: '€',
    restaurantName: 'Curry 61',
    location: {
      lat: 52.5280,
      lng: 13.4020,
      address: 'Oranienburger Str. 1, 10178 Berlin'
    },
    tags: [DietaryTag.GLUTEN_FREE],
    cuisine: CuisineType.ASIAN,
    dealType: DealType.LAST_MINUTE,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86400000 * 2).toISOString(),
    imageUrl: 'https://picsum.photos/400/300?random=4',
    votes: 12,
    userVote: 0,
    verified: true,
    comments: []
  },
  {
    id: '5',
    title: 'Seitan Burrito',
    description: 'Massive burrito filled with homemade seitan and beans. Late night snack deal.',
    price: 6.00,
    originalPrice: 8.50,
    currency: '€',
    restaurantName: 'Dolores',
    location: {
      lat: 52.5150,
      lng: 13.4200,
      address: 'Rosa-Luxemburg-Straße 7, 10178 Berlin'
    },
    tags: [DietaryTag.VEGAN],
    cuisine: CuisineType.MEXICAN,
    dealType: DealType.DAILY,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    imageUrl: 'https://picsum.photos/400/300?random=5',
    votes: 230,
    userVote: 0,
    verified: true,
    comments: [
        { id: 'c4', author: 'BurritoLover', text: 'Absolute massive portion. Highly recommend!', date: new Date().toISOString() },
        { id: 'c5', author: 'Klaus', text: 'Too spicy for me.', date: new Date().toISOString() }
    ]
  }
];
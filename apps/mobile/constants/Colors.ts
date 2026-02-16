/**
 * Colors matching the FoodDeals web app design
 */

const tintColorLight = '#ef4444'; // Primary red from web
const tintColorDark = '#fca5a5';   // Light red for dark mode

export default {
  light: {
    text: '#111827',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorLight,

    // Extended colors matching web
    primary: '#ef4444',
    primaryLight: '#fecaca',
    success: '#10b981',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    border: '#e5e7eb',
    backgroundSecondary: '#f9fafb',
    backgroundTertiary: '#f3f4f6',
  },
  dark: {
    text: '#f1f5f9',
    background: '#0f172a',
    tint: tintColorDark,
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,

    // Extended colors for dark mode
    primary: '#ef4444',
    primaryLight: '#b91c1c',
    success: '#10b981',
    textSecondary: '#cbd5e1',
    textTertiary: '#64748b',
    border: '#334155',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#334155',
  },
};

// Deal type colors (matching web)
export const DealTypeColors = {
  light: {
    opening: { bg: '#f3e8ff', text: '#7c3aed' },       // purple
    last_minute: { bg: '#fee2e2', text: '#dc2626' },   // red
    happy_hour: { bg: '#fed7aa', text: '#ea580c' },    // orange
    lunch: { bg: '#dbeafe', text: '#2563eb' },         // blue
    early_bird: { bg: '#d1fae5', text: '#059669' },    // green
    late_night: { bg: '#e0e7ff', text: '#4f46e5' },    // indigo
    student: { bg: '#fce7f3', text: '#db2777' },       // pink
    default: { bg: '#f3f4f6', text: '#6b7280' },       // gray
  },
  dark: {
    opening: { bg: '#3b1f6b', text: '#c4b5fd' },
    last_minute: { bg: '#5c1a1a', text: '#fca5a5' },
    happy_hour: { bg: '#6b3a1a', text: '#fdba74' },
    lunch: { bg: '#1e3a8a', text: '#93c5fd' },
    early_bird: { bg: '#064e3b', text: '#6ee7b7' },
    late_night: { bg: '#312e81', text: '#a5b4fc' },
    student: { bg: '#831843', text: '#f9a8d4' },
    default: { bg: '#374151', text: '#9ca3af' },
  },
};

export function getDealTypeColor(dealType: string, isDark: boolean = false) {
  const colors = isDark ? DealTypeColors.dark : DealTypeColors.light;
  const normalizedType = dealType.toLowerCase().replace(/ /g, '_');

  return colors[normalizedType as keyof typeof colors] || colors.default;
}

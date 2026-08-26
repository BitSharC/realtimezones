// Chronos Desktop Prototype - Unified Raycast Quick Action Launcher, Workspaces Management, Meeting Quality & Export Engine

export interface CityTime {
  id: string;
  name: string;
  country: string;
  flag: string;
  timezone: string;
  offsetHours: number; // relative to London (Base: Europe/London, GMT+1)
  badge: string;
  statusLabel: string;
  isBase?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  cities: CityTime[];
}

// 110+ Comprehensive Global Cities Dataset across all 7 Continents
export const POPULAR_AVAILABLE_CITIES: CityTime[] = [
  // Europe & UK
  { id: 'lon', name: 'London', country: 'United Kingdom', flag: '🇬🇧', timezone: 'Europe/London', offsetHours: 0, badge: 'Base', statusLabel: 'BST, GMT+1', isBase: true },
  { id: 'man', name: 'Manchester', country: 'United Kingdom', flag: '🇬🇧', timezone: 'Europe/London', offsetHours: 0, badge: '+0h', statusLabel: 'BST, GMT+1' },
  { id: 'edi', name: 'Edinburgh', country: 'United Kingdom', flag: '🇬🇧', timezone: 'Europe/London', offsetHours: 0, badge: '+0h', statusLabel: 'BST, GMT+1' },
  { id: 'dub', name: 'Dublin', country: 'Ireland', flag: '🇮🇪', timezone: 'Europe/Dublin', offsetHours: 0, badge: '+0h', statusLabel: 'IST, GMT+1' },
  { id: 'par', name: 'Paris', country: 'France', flag: '🇫🇷', timezone: 'Europe/Paris', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'lyo', name: 'Lyon', country: 'France', flag: '🇫🇷', timezone: 'Europe/Paris', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'ber', name: 'Berlin', country: 'Germany', flag: '🇩🇪', timezone: 'Europe/Berlin', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'muc', name: 'Munich', country: 'Germany', flag: '🇩🇪', timezone: 'Europe/Berlin', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'fra', name: 'Frankfurt', country: 'Germany', flag: '🇩🇪', timezone: 'Europe/Berlin', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'ams', name: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱', timezone: 'Europe/Amsterdam', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'bru', name: 'Brussels', country: 'Belgium', flag: '🇧🇪', timezone: 'Europe/Brussels', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'zrh', name: 'Zurich', country: 'Switzerland', flag: '🇨🇭', timezone: 'Europe/Zurich', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'gva', name: 'Geneva', country: 'Switzerland', flag: '🇨🇭', timezone: 'Europe/Zurich', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'vie', name: 'Vienna', country: 'Austria', flag: '🇦🇹', timezone: 'Europe/Vienna', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'mad', name: 'Madrid', country: 'Spain', flag: '🇪🇸', timezone: 'Europe/Madrid', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'bcn', name: 'Barcelona', country: 'Spain', flag: '🇪🇸', timezone: 'Europe/Madrid', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'lis', name: 'Lisbon', country: 'Portugal', flag: '🇵🇹', timezone: 'Europe/Lisbon', offsetHours: 0, badge: '+0h', statusLabel: 'WEST, GMT+1' },
  { id: 'rom', name: 'Rome', country: 'Italy', flag: '🇮🇹', timezone: 'Europe/Rome', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'mil', name: 'Milan', country: 'Italy', flag: '🇮🇹', timezone: 'Europe/Rome', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'sto', name: 'Stockholm', country: 'Sweden', flag: '🇸🇪', timezone: 'Europe/Stockholm', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'osl', name: 'Oslo', country: 'Norway', flag: '🇳🇴', timezone: 'Europe/Oslo', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'cph', name: 'Copenhagen', country: 'Denmark', flag: '🇩🇰', timezone: 'Europe/Copenhagen', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'hel', name: 'Helsinki', country: 'Finland', flag: '🇫🇮', timezone: 'Europe/Helsinki', offsetHours: 2, badge: '+2h', statusLabel: 'EEST, GMT+3' },
  { id: 'waw', name: 'Warsaw', country: 'Poland', flag: '🇵🇱', timezone: 'Europe/Warsaw', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'prg', name: 'Prague', country: 'Czech Republic', flag: '🇨🇿', timezone: 'Europe/Prague', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'bud', name: 'Budapest', country: 'Hungary', flag: '🇭🇺', timezone: 'Europe/Budapest', offsetHours: 1, badge: '+1h', statusLabel: 'CEST, GMT+2' },
  { id: 'ath', name: 'Athens', country: 'Greece', flag: '🇬🇷', timezone: 'Europe/Athens', offsetHours: 2, badge: '+2h', statusLabel: 'EEST, GMT+3' },
  { id: 'ist', name: 'Istanbul', country: 'Turkey', flag: '🇹🇷', timezone: 'Europe/Istanbul', offsetHours: 2, badge: '+2h', statusLabel: 'TRT, GMT+3' },
  { id: 'kyv', name: 'Kyiv', country: 'Ukraine', flag: '🇺🇦', timezone: 'Europe/Kyiv', offsetHours: 2, badge: '+2h', statusLabel: 'EEST, GMT+3' },
  { id: 'mow', name: 'Moscow', country: 'Russia', flag: '🇷🇺', timezone: 'Europe/Moscow', offsetHours: 2, badge: '+2h', statusLabel: 'MSK, GMT+3' },

  // Americas (North, Central & South)
  { id: 'nyc', name: 'New York', country: 'United States', flag: '🇺🇸', timezone: 'America/New_York', offsetHours: -5, badge: '-5h', statusLabel: 'EDT, GMT-4' },
  { id: 'bos', name: 'Boston', country: 'United States', flag: '🇺🇸', timezone: 'America/New_York', offsetHours: -5, badge: '-5h', statusLabel: 'EDT, GMT-4' },
  { id: 'was', name: 'Washington D.C.', country: 'United States', flag: '🇺🇸', timezone: 'America/New_York', offsetHours: -5, badge: '-5h', statusLabel: 'EDT, GMT-4' },
  { id: 'mia', name: 'Miami', country: 'United States', flag: '🇺🇸', timezone: 'America/New_York', offsetHours: -5, badge: '-5h', statusLabel: 'EDT, GMT-4' },
  { id: 'atl', name: 'Atlanta', country: 'United States', flag: '🇺🇸', timezone: 'America/New_York', offsetHours: -5, badge: '-5h', statusLabel: 'EDT, GMT-4' },
  { id: 'chi', name: 'Chicago', country: 'United States', flag: '🇺🇸', timezone: 'America/Chicago', offsetHours: -6, badge: '-6h', statusLabel: 'CDT, GMT-5' },
  { id: 'atx', name: 'Austin', country: 'United States', flag: '🇺🇸', timezone: 'America/Chicago', offsetHours: -6, badge: '-6h', statusLabel: 'CDT, GMT-5' },
  { id: 'dal', name: 'Dallas', country: 'United States', flag: '🇺🇸', timezone: 'America/Chicago', offsetHours: -6, badge: '-6h', statusLabel: 'CDT, GMT-5' },
  { id: 'hou', name: 'Houston', country: 'United States', flag: '🇺🇸', timezone: 'America/Chicago', offsetHours: -6, badge: '-6h', statusLabel: 'CDT, GMT-5' },
  { id: 'den', name: 'Denver', country: 'United States', flag: '🇺🇸', timezone: 'America/Denver', offsetHours: -7, badge: '-7h', statusLabel: 'MDT, GMT-6' },
  { id: 'phx', name: 'Phoenix', country: 'United States', flag: '🇺🇸', timezone: 'America/Phoenix', offsetHours: -8, badge: '-8h', statusLabel: 'MST, GMT-7' },
  { id: 'sfo', name: 'San Francisco', country: 'United States', flag: '🇺🇸', timezone: 'America/Los_Angeles', offsetHours: -8, badge: '-8h', statusLabel: 'PDT, GMT-7' },
  { id: 'lax', name: 'Los Angeles', country: 'United States', flag: '🇺🇸', timezone: 'America/Los_Angeles', offsetHours: -8, badge: '-8h', statusLabel: 'PDT, GMT-7' },
  { id: 'sea', name: 'Seattle', country: 'United States', flag: '🇺🇸', timezone: 'America/Los_Angeles', offsetHours: -8, badge: '-8h', statusLabel: 'PDT, GMT-7' },
  { id: 'pdx', name: 'Portland', country: 'United States', flag: '🇺🇸', timezone: 'America/Los_Angeles', offsetHours: -8, badge: '-8h', statusLabel: 'PDT, GMT-7' },
  { id: 'anc', name: 'Anchorage', country: 'United States', flag: '🇺🇸', timezone: 'America/Anchorage', offsetHours: -9, badge: '-9h', statusLabel: 'AKDT, GMT-8' },
  { id: 'hnl', name: 'Honolulu', country: 'United States', flag: '🇺🇸', timezone: 'Pacific/Honolulu', offsetHours: -11, badge: '-11h', statusLabel: 'HST, GMT-10' },
  { id: 'tor', name: 'Toronto', country: 'Canada', flag: '🇨🇦', timezone: 'America/Toronto', offsetHours: -5, badge: '-5h', statusLabel: 'EDT, GMT-4' },
  { id: 'mtl', name: 'Montreal', country: 'Canada', flag: '🇨🇦', timezone: 'America/Toronto', offsetHours: -5, badge: '-5h', statusLabel: 'EDT, GMT-4' },
  { id: 'van', name: 'Vancouver', country: 'Canada', flag: '🇨🇦', timezone: 'America/Vancouver', offsetHours: -8, badge: '-8h', statusLabel: 'PDT, GMT-7' },
  { id: 'cal', name: 'Calgary', country: 'Canada', flag: '🇨🇦', timezone: 'America/Edmonton', offsetHours: -7, badge: '-7h', statusLabel: 'MDT, GMT-6' },
  { id: 'mex', name: 'Mexico City', country: 'Mexico', flag: '🇲🇽', timezone: 'America/Mexico_City', offsetHours: -7, badge: '-7h', statusLabel: 'CST, GMT-6' },
  { id: 'gdl', name: 'Guadalajara', country: 'Mexico', flag: '🇲🇽', timezone: 'America/Mexico_City', offsetHours: -7, badge: '-7h', statusLabel: 'CST, GMT-6' },
  { id: 'bog', name: 'Bogotá', country: 'Colombia', flag: '🇨🇴', timezone: 'America/Bogota', offsetHours: -6, badge: '-6h', statusLabel: 'COT, GMT-5' },
  { id: 'lim', name: 'Lima', country: 'Peru', flag: '🇵🇪', timezone: 'America/Lima', offsetHours: -6, badge: '-6h', statusLabel: 'PET, GMT-5' },
  { id: 'scl', name: 'Santiago', country: 'Chile', flag: '🇨🇱', timezone: 'America/Santiago', offsetHours: -5, badge: '-5h', statusLabel: 'CLT, GMT-4' },
  { id: 'bue', name: 'Buenos Aires', country: 'Argentina', flag: '🇦🇷', timezone: 'America/Argentina/Buenos_Aires', offsetHours: -4, badge: '-4h', statusLabel: 'ART, GMT-3' },
  { id: 'sao', name: 'São Paulo', country: 'Brazil', flag: '🇧🇷', timezone: 'America/Sao_Paulo', offsetHours: -4, badge: '-4h', statusLabel: 'BRT, GMT-3' },
  { id: 'rio', name: 'Rio de Janeiro', country: 'Brazil', flag: '🇧🇷', timezone: 'America/Sao_Paulo', offsetHours: -4, badge: '-4h', statusLabel: 'BRT, GMT-3' },

  // Asia (South, East & Southeast)
  { id: 'bom', name: 'Mumbai', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 4.5, badge: '+4.5h', statusLabel: 'IST, GMT+5:30' },
  { id: 'del', name: 'New Delhi', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 4.5, badge: '+4.5h', statusLabel: 'IST, GMT+5:30' },
  { id: 'blr', name: 'Bengaluru', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 4.5, badge: '+4.5h', statusLabel: 'IST, GMT+5:30' },
  { id: 'hyd', name: 'Hyderabad', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 4.5, badge: '+4.5h', statusLabel: 'IST, GMT+5:30' },
  { id: 'maa', name: 'Chennai', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 4.5, badge: '+4.5h', statusLabel: 'IST, GMT+5:30' },
  { id: 'pun', name: 'Pune', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 4.5, badge: '+4.5h', statusLabel: 'IST, GMT+5:30' },
  { id: 'ccu', name: 'Kolkata', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 4.5, badge: '+4.5h', statusLabel: 'IST, GMT+5:30' },
  { id: 'khi', name: 'Karachi', country: 'Pakistan', flag: '🇵🇰', timezone: 'Asia/Karachi', offsetHours: 4, badge: '+4h', statusLabel: 'PKT, GMT+5' },
  { id: 'lhe', name: 'Lahore', country: 'Pakistan', flag: '🇵🇰', timezone: 'Asia/Karachi', offsetHours: 4, badge: '+4h', statusLabel: 'PKT, GMT+5' },
  { id: 'dac', name: 'Dhaka', country: 'Bangladesh', flag: '🇧🇩', timezone: 'Asia/Dhaka', offsetHours: 5, badge: '+5h', statusLabel: 'BST, GMT+6' },
  { id: 'cmb', name: 'Colombo', country: 'Sri Lanka', flag: '🇱🇰', timezone: 'Asia/Colombo', offsetHours: 4.5, badge: '+4.5h', statusLabel: 'IST, GMT+5:30' },
  { id: 'ktm', name: 'Kathmandu', country: 'Nepal', flag: '🇳🇵', timezone: 'Asia/Kathmandu', offsetHours: 4.75, badge: '+4.75h', statusLabel: 'NPT, GMT+5:45' },
  { id: 'sin', name: 'Singapore', country: 'Singapore', flag: '🇸🇬', timezone: 'Asia/Singapore', offsetHours: 7, badge: '+7h', statusLabel: 'SGT, GMT+8' },
  { id: 'kul', name: 'Kuala Lumpur', country: 'Malaysia', flag: '🇲🇾', timezone: 'Asia/Kuala_Lumpur', offsetHours: 7, badge: '+7h', statusLabel: 'MYT, GMT+8' },
  { id: 'bkk', name: 'Bangkok', country: 'Thailand', flag: '🇹🇭', timezone: 'Asia/Bangkok', offsetHours: 6, badge: '+6h', statusLabel: 'ICT, GMT+7' },
  { id: 'jkt', name: 'Jakarta', country: 'Indonesia', flag: '🇮🇩', timezone: 'Asia/Jakarta', offsetHours: 6, badge: '+6h', statusLabel: 'WIB, GMT+7' },
  { id: 'dps', name: 'Bali', country: 'Indonesia', flag: '🇮🇩', timezone: 'Asia/Makassar', offsetHours: 7, badge: '+7h', statusLabel: 'WITA, GMT+8' },
  { id: 'mnl', name: 'Manila', country: 'Philippines', flag: '🇵🇭', timezone: 'Asia/Manila', offsetHours: 7, badge: '+7h', statusLabel: 'PHT, GMT+8' },
  { id: 'sgn', name: 'Ho Chi Minh City', country: 'Vietnam', flag: '🇻🇳', timezone: 'Asia/Ho_Chi_Minh', offsetHours: 6, badge: '+6h', statusLabel: 'ICT, GMT+7' },
  { id: 'han', name: 'Hanoi', country: 'Vietnam', flag: '🇻🇳', timezone: 'Asia/Ho_Chi_Minh', offsetHours: 6, badge: '+6h', statusLabel: 'ICT, GMT+7' },
  { id: 'hkg', name: 'Hong Kong', country: 'Hong Kong', flag: '🇭🇰', timezone: 'Asia/Hong_Kong', offsetHours: 7, badge: '+7h', statusLabel: 'HKT, GMT+8' },
  { id: 'tpe', name: 'Taipei', country: 'Taiwan', flag: '🇹🇼', timezone: 'Asia/Taipei', offsetHours: 7, badge: '+7h', statusLabel: 'CST, GMT+8' },
  { id: 'tyo', name: 'Tokyo', country: 'Japan', flag: '🇯🇵', timezone: 'Asia/Tokyo', offsetHours: 8, badge: '+8h', statusLabel: 'JST, GMT+9 (+1d)' },
  { id: 'osa', name: 'Osaka', country: 'Japan', flag: '🇯🇵', timezone: 'Asia/Tokyo', offsetHours: 8, badge: '+8h', statusLabel: 'JST, GMT+9 (+1d)' },
  { id: 'sel', name: 'Seoul', country: 'South Korea', flag: '🇰🇷', timezone: 'Asia/Seoul', offsetHours: 8, badge: '+8h', statusLabel: 'KST, GMT+9 (+1d)' },
  { id: 'bjs', name: 'Beijing', country: 'China', flag: '🇨🇳', timezone: 'Asia/Shanghai', offsetHours: 7, badge: '+7h', statusLabel: 'CST, GMT+8' },
  { id: 'sha', name: 'Shanghai', country: 'China', flag: '🇨🇳', timezone: 'Asia/Shanghai', offsetHours: 7, badge: '+7h', statusLabel: 'CST, GMT+8' },
  { id: 'szx', name: 'Shenzhen', country: 'China', flag: '🇨🇳', timezone: 'Asia/Shanghai', offsetHours: 7, badge: '+7h', statusLabel: 'CST, GMT+8' },

  // Middle East
  { id: 'dxb', name: 'Dubai', country: 'UAE', flag: '🇦🇪', timezone: 'Asia/Dubai', offsetHours: 3, badge: '+3h', statusLabel: 'GST, GMT+4' },
  { id: 'auh', name: 'Abu Dhabi', country: 'UAE', flag: '🇦🇪', timezone: 'Asia/Dubai', offsetHours: 3, badge: '+3h', statusLabel: 'GST, GMT+4' },
  { id: 'doh', name: 'Doha', country: 'Qatar', flag: '🇶🇦', timezone: 'Asia/Qatar', offsetHours: 2, badge: '+2h', statusLabel: 'AST, GMT+3' },
  { id: 'ruh', name: 'Riyadh', country: 'Saudi Arabia', flag: '🇸🇦', timezone: 'Asia/Riyadh', offsetHours: 2, badge: '+2h', statusLabel: 'AST, GMT+3' },
  { id: 'jed', name: 'Jeddah', country: 'Saudi Arabia', flag: '🇸🇦', timezone: 'Asia/Riyadh', offsetHours: 2, badge: '+2h', statusLabel: 'AST, GMT+3' },
  { id: 'kwi', name: 'Kuwait City', country: 'Kuwait', flag: '🇰🇼', timezone: 'Asia/Kuwait', offsetHours: 2, badge: '+2h', statusLabel: 'AST, GMT+3' },
  { id: 'mct', name: 'Muscat', country: 'Oman', flag: '🇴🇲', timezone: 'Asia/Muscat', offsetHours: 3, badge: '+3h', statusLabel: 'GST, GMT+4' },
  { id: 'tlv', name: 'Tel Aviv', country: 'Israel', flag: '🇮🇱', timezone: 'Asia/Jerusalem', offsetHours: 2, badge: '+2h', statusLabel: 'IDT, GMT+3' },
  { id: 'bey', name: 'Beirut', country: 'Lebanon', flag: '🇱🇧', timezone: 'Asia/Beirut', offsetHours: 2, badge: '+2h', statusLabel: 'EEST, GMT+3' },
  { id: 'amm', name: 'Amman', country: 'Jordan', flag: '🇯🇴', timezone: 'Asia/Amman', offsetHours: 2, badge: '+2h', statusLabel: 'EEST, GMT+3' },

  // Australia & Oceania
  { id: 'syd', name: 'Sydney', country: 'Australia', flag: '🇦🇺', timezone: 'Australia/Sydney', offsetHours: 9, badge: '+9h', statusLabel: 'AEST, GMT+10' },
  { id: 'mel', name: 'Melbourne', country: 'Australia', flag: '🇦🇺', timezone: 'Australia/Melbourne', offsetHours: 9, badge: '+9h', statusLabel: 'AEST, GMT+10' },
  { id: 'bne', name: 'Brisbane', country: 'Australia', flag: '🇦🇺', timezone: 'Australia/Brisbane', offsetHours: 9, badge: '+9h', statusLabel: 'AEST, GMT+10' },
  { id: 'per', name: 'Perth', country: 'Australia', flag: '🇦🇺', timezone: 'Australia/Perth', offsetHours: 7, badge: '+7h', statusLabel: 'AWST, GMT+8' },
  { id: 'adl', name: 'Adelaide', country: 'Australia', flag: '🇦🇺', timezone: 'Australia/Adelaide', offsetHours: 8.5, badge: '+8.5h', statusLabel: 'ACST, GMT+9:30' },
  { id: 'akl', name: 'Auckland', country: 'New Zealand', flag: '🇳🇿', timezone: 'Pacific/Auckland', offsetHours: 11, badge: '+11h', statusLabel: 'NZST, GMT+12' },
  { id: 'wlg', name: 'Wellington', country: 'New Zealand', flag: '🇳🇿', timezone: 'Pacific/Auckland', offsetHours: 11, badge: '+11h', statusLabel: 'NZST, GMT+12' },
  { id: 'fji', name: 'Fiji', country: 'Fiji', flag: '🇫🇯', timezone: 'Pacific/Fiji', offsetHours: 11, badge: '+11h', statusLabel: 'FJT, GMT+12' },

  // Africa
  { id: 'cai', name: 'Cairo', country: 'Egypt', flag: '🇪🇬', timezone: 'Africa/Cairo', offsetHours: 2, badge: '+2h', statusLabel: 'EEST, GMT+3' },
  { id: 'jnb', name: 'Johannesburg', country: 'South Africa', flag: '🇿🇦', timezone: 'Africa/Johannesburg', offsetHours: 1, badge: '+1h', statusLabel: 'SAST, GMT+2' },
  { id: 'cpt', name: 'Cape Town', country: 'South Africa', flag: '🇿🇦', timezone: 'Africa/Johannesburg', offsetHours: 1, badge: '+1h', statusLabel: 'SAST, GMT+2' },
  { id: 'nbo', name: 'Nairobi', country: 'Kenya', flag: '🇰🇪', timezone: 'Africa/Nairobi', offsetHours: 2, badge: '+2h', statusLabel: 'EAT, GMT+3' },
  { id: 'los', name: 'Lagos', country: 'Nigeria', flag: '🇳🇬', timezone: 'Africa/Lagos', offsetHours: 0, badge: '+0h', statusLabel: 'WAT, GMT+1' },
  { id: 'cas', name: 'Casablanca', country: 'Morocco', flag: '🇲🇦', timezone: 'Africa/Casablanca', offsetHours: 0, badge: '+0h', statusLabel: 'WEST, GMT+1' },
  { id: 'add', name: 'Addis Ababa', country: 'Ethiopia', flag: '🇪🇹', timezone: 'Africa/Addis_Ababa', offsetHours: 2, badge: '+2h', statusLabel: 'EAT, GMT+3' },
  { id: 'acc', name: 'Accra', country: 'Ghana', flag: '🇬🇭', timezone: 'Africa/Accra', offsetHours: -1, badge: '-1h', statusLabel: 'GMT, GMT+0' },
  { id: 'kgl', name: 'Kigali', country: 'Rwanda', flag: '🇷🇼', timezone: 'Africa/Kigali', offsetHours: 1, badge: '+1h', statusLabel: 'CAT, GMT+2' },
];

export function detectUserLocalCity(): CityTime {
  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    if (userTz) {
      // 1. Normalized alias mappings
      let normalizedTz = userTz;
      if (userTz === 'Asia/Calcutta') normalizedTz = 'Asia/Kolkata';
      if (userTz === 'Europe/Belfast') normalizedTz = 'Europe/London';

      // 2. Exact timezone match in dataset
      const exactMatch = POPULAR_AVAILABLE_CITIES.find(
        (c) => c.timezone.toLowerCase() === normalizedTz.toLowerCase()
      );
      if (exactMatch) {
        return { ...exactMatch, offsetHours: 0, badge: 'Base', isBase: true };
      }

      // 3. City name segment from timezone string (e.g. "Asia/Kolkata", "America/New_York", "Europe/Paris")
      const parts = normalizedTz.split('/');
      const rawCity = parts[parts.length - 1].replace(/_/g, ' ');

      const fuzzyMatch = POPULAR_AVAILABLE_CITIES.find(
        (c) =>
          c.timezone.toLowerCase().includes(rawCity.toLowerCase()) ||
          c.name.toLowerCase().includes(rawCity.toLowerCase())
      );
      if (fuzzyMatch) {
        return { ...fuzzyMatch, offsetHours: 0, badge: 'Base', isBase: true };
      }

      // 4. Country Flag heuristic
      let flag = '📍';
      if (normalizedTz.startsWith('Asia/Kolkata') || normalizedTz.startsWith('Asia/Calcutta')) flag = '🇮🇳';
      else if (normalizedTz.startsWith('America/')) flag = '🇺🇸';
      else if (normalizedTz.startsWith('Europe/London')) flag = '🇬🇧';
      else if (normalizedTz.startsWith('Europe/')) flag = '🇪🇺';
      else if (normalizedTz.startsWith('Asia/Tokyo')) flag = '🇯🇵';
      else if (normalizedTz.startsWith('Australia/')) flag = '🇦🇺';

      const region = parts[0] || 'Local';
      return {
        id: 'local-home',
        name: rawCity || 'Your Location',
        country: region,
        flag: flag,
        timezone: userTz,
        offsetHours: 0,
        badge: 'Base',
        statusLabel: 'Home Base',
        isBase: true,
      };
    }
  } catch (_) {}

  // Safe fallback default (Mumbai)
  return { id: 'bom', name: 'Mumbai', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 0, badge: 'Base', statusLabel: 'IST', isBase: true };
}

let WORKSPACES: Workspace[] = [
  {
    id: 'ws-main',
    name: 'My Workspace',
    cities: [
      { id: 'bom', name: 'Mumbai', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 0, badge: 'Base', statusLabel: 'IST', isBase: true },
    ],
  },
];

let activeWorkspaceId = 'ws-main';
let selectedMeetingDurationMinutes = 60;
let isIntelligenceDockOpen = false;

// Keyboard navigation indexes
let focusedWsIndex = 0;
let focusedOmniIndex = 0;

// Settings & Preferences State (Persisted in localStorage)
let currentTheme = typeof window !== 'undefined' ? localStorage.getItem('chronos-theme') || 'midnight' : 'midnight';
let workStartHour = typeof window !== 'undefined' ? parseInt(localStorage.getItem('chronos-work-start') || '8', 10) : 8;
let workEndHour = typeof window !== 'undefined' ? parseInt(localStorage.getItem('chronos-work-end') || '18', 10) : 18;
let scrubStepMinutes = typeof window !== 'undefined' ? parseInt(localStorage.getItem('chronos-scrub-step') || '15', 10) : 15;

export function initChronosDesktop() {
  // Real-time current live time on launch
  const now = new Date();
  let focusHour = now.getHours() + now.getMinutes() / 60;
  let is24Hour = true;
  let activeSelectedDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Load or initialize workspaces
  if (typeof window !== 'undefined') {
    const savedWs = localStorage.getItem('rtz-workspaces-v3');
    if (savedWs) {
      try {
        const parsed = JSON.parse(savedWs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          WORKSPACES = parsed;
          const savedActiveId = localStorage.getItem('rtz-active-workspace-id');
          if (savedActiveId && WORKSPACES.some((w) => w.id === savedActiveId)) {
            activeWorkspaceId = savedActiveId;
          } else {
            activeWorkspaceId = WORKSPACES[0].id;
          }

          // If active workspace is empty, auto-seed with detected local city
          const currentWs = WORKSPACES.find((w) => w.id === activeWorkspaceId);
          if (currentWs && currentWs.cities.length === 0) {
            currentWs.cities = [detectUserLocalCity()];
            saveWorkspacesToStorage();
          }
        }
      } catch (_) {}
    } else {
      // Clean First-Time Launch: Only the user's detected live location, pristine empty workspace
      const localBaseCity = detectUserLocalCity();
      WORKSPACES = [
        {
          id: 'ws-main',
          name: 'My Workspace',
          cities: [localBaseCity],
        },
      ];
      activeWorkspaceId = 'ws-main';
      saveWorkspacesToStorage();
    }
  }

  // DOM elements
  const scrubberLine = document.getElementById('chronos-focus-line');
  const scrubberTag = document.getElementById('chronos-focus-tag');
  const scrubberHeader = document.getElementById('chronos-scrubber-header');
  const canvasContainer = document.getElementById('chronos-canvas-container');
  const cityRowsContainer = document.getElementById('chronos-city-rows');
  const emptyStateEl = document.getElementById('chronos-empty-state');
  const sliderScrubber = document.getElementById('chronos-slider-scrubber') as HTMLInputElement | null;
  const toggle24hBtn = document.getElementById('chronos-toggle-24h');
  const toggle12hBtn = document.getElementById('chronos-toggle-12h');
  const copySlotBtn = document.getElementById('chronos-copy-slot');
  const btnNow = document.getElementById('chronos-btn-now');
  const overlapTextEl = document.getElementById('chronos-overlap-text');
  const overlapDotEl = document.getElementById('chronos-overlap-dot');

  // Intelligence Dock DOM
  const intelligencePanel = document.getElementById('chronos-intelligence-panel');
  const toggleIntelligenceBtn = document.getElementById('chronos-toggle-intelligence');
  const dockChevron = document.getElementById('chronos-dock-chevron');
  const qualityStars = document.getElementById('chronos-quality-stars');
  const qualityBadge = document.getElementById('chronos-quality-badge');
  const qualityTitle = document.getElementById('chronos-quality-title');
  const qualityDesc = document.getElementById('chronos-quality-desc');
  const durationBadge = document.getElementById('chronos-selected-duration-badge');
  const durationPillsContainer = document.getElementById('chronos-duration-pills');
  const durationSlider = document.getElementById('chronos-duration-slider') as HTMLInputElement | null;
  const durationTextInput = document.getElementById('chronos-duration-text') as HTMLInputElement | null;
  const recPillsContainer = document.getElementById('chronos-recommendation-pills');
  const shareBtn = document.getElementById('chronos-btn-share');

  // Calendar Dropdown DOM
  const calendarSelectBtn = document.getElementById('chronos-calendar-select-btn');
  const calendarDropdownMenu = document.getElementById('chronos-calendar-dropdown-menu');
  const calChevron = document.getElementById('chronos-cal-chevron');
  const exportGoogleBtn = document.getElementById('chronos-export-google');
  const exportOutlookBtn = document.getElementById('chronos-export-outlook');
  const exportAppleBtn = document.getElementById('chronos-export-apple');
  const exportIcsFileBtn = document.getElementById('chronos-export-ics-file');

  // Workspace Dropdown DOM
  const workspaceBtn = document.getElementById('chronos-workspace-btn');
  const workspaceDropdown = document.getElementById('chronos-workspace-dropdown');
  const workspaceListEl = document.getElementById('chronos-workspace-list');
  const workspaceNameEl = document.getElementById('chronos-workspace-name');
  const workspaceChevron = document.getElementById('chronos-workspace-chevron');

  // Create Workspace Modal DOM
  const btnCreateWs = document.getElementById('chronos-create-workspace-btn');
  const newWsModal = document.getElementById('chronos-new-workspace-modal');
  const closeWsModalBtn = document.getElementById('chronos-close-ws-modal');
  const cancelWsBtn = document.getElementById('chronos-cancel-ws-btn');
  const saveWsBtn = document.getElementById('chronos-save-ws-btn');
  const newWsNameInput = document.getElementById('chronos-new-ws-name') as HTMLInputElement | null;

  // Edit/Rename Workspace Modal DOM
  const editWsModal = document.getElementById('chronos-edit-workspace-modal');
  const closeEditWsModalBtn = document.getElementById('chronos-close-edit-ws-modal');
  const cancelEditWsBtn = document.getElementById('chronos-cancel-edit-ws-btn');
  const saveEditWsBtn = document.getElementById('chronos-save-edit-ws-btn');
  const editWsIdInput = document.getElementById('chronos-edit-ws-id') as HTMLInputElement | null;
  const editWsNameInput = document.getElementById('chronos-edit-ws-name') as HTMLInputElement | null;

  // Date Selector & Calendar DOM
  const dateBtn = document.getElementById('chronos-date-btn');
  const dateDropdown = document.getElementById('chronos-date-dropdown');
  const currentDateLabel = document.getElementById('chronos-current-date-label');
  const calendarDaysContainer = document.getElementById('chronos-calendar-days');
  const calMonthSelect = document.getElementById('chronos-cal-month-select') as HTMLSelectElement | null;
  const calYearSelect = document.getElementById('chronos-cal-year-select') as HTMLSelectElement | null;
  const calPrevMonthBtn = document.getElementById('chronos-cal-prev-month');
  const calNextMonthBtn = document.getElementById('chronos-cal-next-month');
  const calTodayBtn = document.getElementById('chronos-cal-today');
  const calTomorrowBtn = document.getElementById('chronos-cal-tomorrow');
  const calNextWeekBtn = document.getElementById('chronos-cal-next-week');

  // Settings Modal DOM
  const settingsBtn = document.getElementById('chronos-btn-settings');
  const settingsModal = document.getElementById('chronos-settings-modal');
  const closeSettingsBtn = document.getElementById('chronos-close-settings-btn');
  const cancelSettingsBtn = document.getElementById('chronos-btn-cancel-settings');
  const saveSettingsBtn = document.getElementById('chronos-btn-save-settings');
  const resetDefaultsBtn = document.getElementById('chronos-btn-reset-defaults');
  const themeOptionsContainer = document.getElementById('chronos-theme-options');
  const settingWorkStartText = document.getElementById('chronos-setting-work-start-text') as HTMLInputElement | null;
  const settingWorkEndText = document.getElementById('chronos-setting-work-end-text') as HTMLInputElement | null;
  const stepOptionsContainer = document.getElementById('chronos-step-options');
  const settingStepCustom = document.getElementById('chronos-setting-step-custom') as HTMLInputElement | null;
  const exportJsonBtn = document.getElementById('chronos-btn-export-json');
  const importJsonInput = document.getElementById('chronos-input-import-json') as HTMLInputElement | null;
  const settingToggleMenubar = document.getElementById('setting-toggle-menubar') as HTMLInputElement | null;
  const settingToggleAutostart = document.getElementById('setting-toggle-autostart') as HTMLInputElement | null;

  // Unified Raycast Omnibar Modal DOM
  const commandPaletteModal = document.getElementById('chronos-command-modal');
  const commandInput = document.getElementById('chronos-command-input') as HTMLInputElement | null;
  const omnibarResults = document.getElementById('chronos-omnibar-results');
  const closeCmdBtn = document.getElementById('chronos-close-cmd');

  const btnAddCity = document.getElementById('chronos-btn-add-city');
  const btnAddCityEmpty = document.getElementById('chronos-btn-add-city-empty');

  // Menu Bar Companion DOM Elements
  const menubarWsName = document.getElementById('menubar-ws-name');
  const menubarCitiesList = document.getElementById('menubar-cities-list');
  const menubarOverlapText = document.getElementById('menubar-overlap-text');
  const menubarOverlapBar = document.getElementById('menubar-overlap-bar');
  const menubarBtnCopy = document.getElementById('menubar-btn-copy-overlap');
  const menubarCopyLabel = document.getElementById('menubar-copy-label');
  const menubarBtnAdd = document.getElementById('menubar-btn-add');
  const menubarBtnExpand = document.getElementById('menubar-btn-expand');
  const menubarOverlay = document.getElementById('view-menubar-overlay');
  const btnToggleMenubar = document.getElementById('chronos-btn-toggle-menubar-view');

  // Welcome / Onboarding Modal DOM
  const welcomeModal = document.getElementById('chronos-welcome-modal');
  const welcomeStartBtn = document.getElementById('chronos-btn-welcome-start');
  const welcomeSkipBtn = document.getElementById('chronos-btn-welcome-skip');
  const welcomeGuideBtn = document.getElementById('chronos-btn-open-welcome-guide');
  const welcomeBaseCityName = document.getElementById('welcome-base-city-name');
  const welcomeBaseCityTz = document.getElementById('welcome-base-city-tz');

  // First-Run Intro Splash DOM
  const introSplash = document.getElementById('chronos-intro-splash');

  function showToast(_message: string) {
    // Disabled toast popup per user request
  }

  function fallbackCopy(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy error', err);
    }
    document.body.removeChild(textArea);
  }

  function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
      return Promise.resolve();
    }
  }

  function getActiveWorkspace(): Workspace {
    return WORKSPACES.find((w) => w.id === activeWorkspaceId) || WORKSPACES[0];
  }

  function formatTime(hourFloat: number, is24: boolean): string {
    const normalized = ((hourFloat % 24) + 24) % 24;
    const h = Math.floor(normalized);
    const m = Math.round((normalized - h) * 60);
    const paddedM = m.toString().padStart(2, '0');
    if (is24) {
      return `${h.toString().padStart(2, '0')}:${paddedM}`;
    }
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH.toString().padStart(2, '0')}:${paddedM} ${period}`;
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function parseDurationString(text: string): number | null {
    const cleaned = text.trim().toLowerCase();
    if (!cleaned) return null;

    if (/^\d+$/.test(cleaned)) {
      return parseInt(cleaned, 10);
    }

    const decimalHours = cleaned.match(/^(\d+(?:\.\d+)?)h?$/);
    if (decimalHours && cleaned.includes('.')) {
      return Math.round(parseFloat(decimalHours[1]) * 60);
    }

    let total = 0;
    const hMatch = cleaned.match(/(\d+)\s*h/);
    const mMatch = cleaned.match(/(\d+)\s*m/);

    if (hMatch) total += parseInt(hMatch[1], 10) * 60;
    if (mMatch) total += parseInt(mMatch[1], 10);

    return total > 0 ? total : null;
  }

  function getHourStatusClass(localHour: number): string {
    if (localHour >= workStartHour && localHour < workEndHour) {
      return 'bg-emerald-950/40 border-r border-emerald-900/30 hover:bg-emerald-900/60';
    }
    const borderMorningStart = Math.max(0, workStartHour - 2);
    const borderEveningEnd = Math.min(24, workEndHour + 4);
    if ((localHour >= borderMorningStart && localHour < workStartHour) || (localHour >= workEndHour && localHour < borderEveningEnd)) {
      return 'bg-amber-950/30 border-r border-amber-900/25 hover:bg-amber-900/50';
    }
    return 'bg-[#08080b] border-r border-[#14141a] hover:bg-zinc-900/60';
  }

  function getContextualTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 8) return 'starting their day';
    if (hour >= 8 && hour < 12) return 'in morning hours';
    if (hour >= 12 && hour < 17) return 'in afternoon hours';
    if (hour >= 17 && hour < 19) return 'approaching evening';
    if (hour >= 19 && hour < 22) return 'winding down their day';
    return 'sleeping'; // 22:00 to 05:59
  }

  // --- Official Website Scoring & Recommendations Algorithm ---
  function calculateBestTimes(): { hour: number; score: number; numWorking: number }[] {
    const ws = getActiveWorkspace();
    const results: { hour: number; score: number; numWorking: number }[] = [];
    const totalCities = Math.max(1, ws.cities.length);

    for (let h = 0; h < 24; h++) {
      let numWorking = 0;
      let numBorder = 0;
      let numSleep = 0;

      ws.cities.forEach((c) => {
        const localHour = (Math.floor(h + c.offsetHours) + 24) % 24;
        if (localHour >= workStartHour && localHour < workEndHour) {
          numWorking++;
        } else {
          const borderMorningStart = Math.max(0, workStartHour - 2);
          const borderEveningEnd = Math.min(24, workEndHour + 4);
          if ((localHour >= borderMorningStart && localHour < workStartHour) || (localHour >= workEndHour && localHour < borderEveningEnd)) {
            numBorder++;
          } else {
            numSleep++;
          }
        }
      });

      const score = (100 * numWorking + 60 * numBorder + -20 * numSleep) / totalCities;
      results.push({ hour: h, score, numWorking });
    }

    // Rank and Sort
    results.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 1e-9) {
        return b.score - a.score;
      }
      if (b.numWorking !== a.numWorking) {
        return b.numWorking - a.numWorking;
      }
      const distA = Math.abs(a.hour - 12);
      const distB = Math.abs(b.hour - 12);
      if (distA !== distB) {
        return distA - distB;
      }
      return a.hour - b.hour;
    });

    return results.slice(0, 3);
  }

  // Update Meeting Quality, Recommendations & Bottom Pill
  function updateMeetingQuality() {
    const ws = getActiveWorkspace();
    if (ws.cities.length === 0) return;

    let numWorking = 0;
    let numBorder = 0;
    let numSleep = 0;
    const nonWorkingDetails: string[] = [];

    ws.cities.forEach((c) => {
      const localHour = (Math.floor(focusHour + c.offsetHours) + 24) % 24;
      const formattedLocal = formatTime(localHour, is24Hour);
      const phrase = getContextualTimeOfDay(localHour);

      if (localHour >= workStartHour && localHour < workEndHour) {
        numWorking++;
      } else {
        const borderMorningStart = Math.max(0, workStartHour - 2);
        const borderEveningEnd = Math.min(24, workEndHour + 4);
        if ((localHour >= borderMorningStart && localHour < workStartHour) || (localHour >= workEndHour && localHour < borderEveningEnd)) {
          numBorder++;
          nonWorkingDetails.push(`${c.name} is ${phrase} (${formattedLocal})`);
        } else {
          numSleep++;
          nonWorkingDetails.push(`${c.name} is ${phrase} (${formattedLocal})`);
        }
      }
    });

    const total = ws.cities.length;
    const score = Math.round((100 * numWorking + 60 * numBorder + -20 * numSleep) / total);

    let stars = 3;
    let label = 'Fair';
    let badgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';

    if (numWorking === total) {
      stars = 5;
      label = 'EXCELLENT';
      badgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    } else if (score >= 80) {
      stars = 4;
      label = 'GREAT';
      badgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    } else if (score >= 60 && numWorking > 0) {
      stars = 3;
      label = 'FAIR';
      badgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    } else if (score >= 35) {
      stars = 2;
      label = 'POOR';
      badgeClass = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    } else {
      stars = 1;
      label = 'AVOID';
      badgeClass = 'bg-red-500/15 text-red-400 border-red-500/30';
    }

    let starsStr = '';
    for (let i = 0; i < 5; i++) starsStr += i < stars ? '★' : '☆';

    if (qualityStars) qualityStars.textContent = starsStr;
    if (qualityBadge) {
      qualityBadge.textContent = label;
      qualityBadge.className = `text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${badgeClass}`;
    }
    if (qualityTitle) {
      qualityTitle.textContent = `${numWorking} of ${total} participant${total > 1 ? 's' : ''} inside working hours.`;
    }
    if (qualityDesc) {
      qualityDesc.textContent =
        nonWorkingDetails.length > 0
          ? nonWorkingDetails.join(', ') + '.'
          : 'All participants are inside optimal working hours.';
    }

    // --- Smart Recommendations Rendering ---
    const bestSlots = calculateBestTimes();
    if (recPillsContainer) {
      recPillsContainer.innerHTML = bestSlots
        .map((slot, index) => {
          const rank = index === 0 ? 'Best' : index === 1 ? '2nd' : '3rd';
          const isSelected = Math.abs(slot.hour - Math.floor(focusHour)) === 0;
          const formatted = formatTime(slot.hour, is24Hour);
          return `
            <button 
              type="button" 
              data-snap-hour="${slot.hour}" 
              data-rank="${rank}"
              class="px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'bg-[#181822] text-zinc-300 border border-[#272734] hover:bg-[#20202c] hover:text-white'
              }"
            >
              ${rank}: ${formatted}
            </button>
          `;
        })
        .join('');

      const recBtns = recPillsContainer.querySelectorAll('[data-snap-hour]');
      recBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const h = parseInt((btn as HTMLElement).dataset.snapHour || '13', 10);
          const rank = (btn as HTMLElement).dataset.rank || 'Best';
          focusHour = h;
          updateClocks();
        });
      });
    }

    // --- Dynamic Bottom Floating Pill (Golden / Silver / Bronze / Custom Overlap) ---
    const startH = formatTime(focusHour, is24Hour);
    const endHourFloat = focusHour + selectedMeetingDurationMinutes / 60;
    const endH = formatTime(endHourFloat, is24Hour);

    const baseCity = ws.cities.find((c) => c.isBase) || ws.cities[0];
    const baseName = baseCity?.name || 'Local';
    const baseCode = baseCity?.badge && baseCity.badge !== 'Base' ? baseCity.badge : baseName.slice(0, 3).toUpperCase();

    // 1-City Initial Launch State
    if (ws.cities.length === 1) {
      if (overlapTextEl && overlapDotEl) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]';
        overlapTextEl.textContent = `Base Set (${baseName}): ${startH} – ${endH} • Add Teammate (⌘K)`;
      }
      if (qualityTitle) {
        qualityTitle.textContent = `Home location active (${baseName}).`;
      }
      if (qualityDesc) {
        qualityDesc.textContent = `Press ⌘K or click "+ Add Teammate" to add coworkers and discover mutual Golden Overlap windows.`;
      }
      if (qualityBadge) {
        qualityBadge.textContent = 'BASE SET';
        qualityBadge.className = 'text-[10px] font-mono px-2 py-0.5 rounded border font-semibold bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      }
      if (recPillsContainer) {
        recPillsContainer.innerHTML = `<span class="text-xs text-zinc-500 font-mono py-1">Add another city to view smart recommendations</span>`;
      }
      return;
    }

    const isRank1 = bestSlots[0] && Math.abs(bestSlots[0].hour - Math.floor(focusHour)) === 0;
    const isRank2 = bestSlots[1] && Math.abs(bestSlots[1].hour - Math.floor(focusHour)) === 0;
    const isRank3 = bestSlots[2] && Math.abs(bestSlots[2].hour - Math.floor(focusHour)) === 0;

    if (overlapTextEl && overlapDotEl) {
      if (isRank1) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.9)]';
        overlapTextEl.textContent = `Golden Overlap: ${startH} – ${endH} ${baseCode}`;
      } else if (isRank2) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]';
        overlapTextEl.textContent = `Silver Window: ${startH} – ${endH} ${baseCode}`;
      } else if (isRank3) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)]';
        overlapTextEl.textContent = `Bronze Window: ${startH} – ${endH} ${baseCode}`;
      } else if (numWorking === total) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
        overlapTextEl.textContent = `Golden Slot: ${startH} – ${endH} ${baseCode}`;
      } else if (score >= 60) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]';
        overlapTextEl.textContent = `Meeting Slot: ${startH} – ${endH} ${baseCode}`;
      } else {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]';
        overlapTextEl.textContent = `Suboptimal Slot: ${startH} – ${endH} ${baseCode}`;
      }
    }
  }

  // --- Dynamic City Rows Rendering ---
  function renderCityRows() {
    const ws = getActiveWorkspace();
    if (!cityRowsContainer) return;

    // Always ensure the detected local city is populated if workspace is empty
    if (ws.cities.length === 0) {
      ws.cities = [detectUserLocalCity()];
      saveWorkspacesToStorage();
    }

    if (emptyStateEl) {
      emptyStateEl.classList.add('hidden');
      emptyStateEl.classList.remove('flex');
    }
    if (scrubberLine) scrubberLine.classList.remove('hidden');
    if (scrubberTag) scrubberTag.classList.remove('hidden');

    cityRowsContainer.innerHTML = ws.cities
      .map((city) => {
        let timelineBlocks = '';
        for (let h = 0; h < 24; h++) {
          const localHour = (Math.floor(h + city.offsetHours) + 24) % 24;
          const statusClass = getHourStatusClass(localHour);
          timelineBlocks += `
            <div class="h-full transition-colors ${statusClass} flex flex-col justify-end p-1 select-none" title="${localHour}:00 ${city.name}">
              <span class="text-[9px] font-mono text-zinc-600 pointer-events-none select-none">${localHour}</span>
            </div>
          `;
        }

        return `
          <div class="chronos-row-draggable h-[120px] border-b border-[#202024] flex items-stretch transition-all duration-150 relative" id="row-${city.id}" data-city-id="${city.id}">
            <!-- Left City Card with Hover Actions & Drag Handle -->
            <div class="chronos-city-card w-[280px] p-5 flex flex-col justify-between border-r border-[#202024] bg-[#0c0c0f] shrink-0 cursor-grab active:cursor-grabbing relative select-none" draggable="true">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-base leading-none shrink-0">${city.flag}</span>
                  <span class="text-sm font-semibold text-white tracking-tight truncate">${city.name}</span>
                </div>

                <!-- Hover Actions: Shift Up, Shift Down, Delete (Revealed on card hover) -->
                <div class="flex items-center gap-0.5 shrink-0">
                  <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 mr-0.5">
                    ${city.badge}
                  </span>
                  <button 
                    type="button" 
                    data-action="shift-city-up" 
                    data-city-id="${city.id}" 
                    class="chronos-delete-btn p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer" 
                    title="Move ${city.name} up"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>
                  </button>
                  <button 
                    type="button" 
                    data-action="shift-city-down" 
                    data-city-id="${city.id}" 
                    class="chronos-delete-btn p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer" 
                    title="Move ${city.name} down"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  <button 
                    type="button" 
                    data-action="delete-city" 
                    data-city-id="${city.id}" 
                    class="chronos-delete-btn p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all cursor-pointer" 
                    title="Remove ${city.name} from workspace"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              <!-- Clock Display -->
              <div id="clock-${city.id}" class="font-mono text-3xl font-bold tracking-tight text-white">
                --:--
              </div>

              <!-- Status Dot and Label -->
              <div class="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                <span id="dot-${city.id}" class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                <span id="status-${city.id}">--</span>
              </div>
            </div>

            <!-- Right 24-Hour Bento Timeline -->
            <div class="flex-1 grid grid-cols-[repeat(24,minmax(0,1fr))] h-full bg-[#0a0a0c]">
              ${timelineBlocks}
            </div>
          </div>
        `;
      })
      .join('');

    // Delete Button Listeners
    const deleteBtns = cityRowsContainer.querySelectorAll('[data-action="delete-city"]');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cityId = (btn as HTMLElement).dataset.cityId;
        if (cityId) {
          deleteCityFromWorkspace(cityId);
        }
      });
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
      btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    });

    // Shift Up Button Listeners
    const shiftUpBtns = cityRowsContainer.querySelectorAll('[data-action="shift-city-up"]');
    shiftUpBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cityId = (btn as HTMLElement).dataset.cityId;
        if (cityId) {
          shiftCityPosition(cityId, 'up');
        }
      });
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
      btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    });

    // Shift Down Button Listeners
    const shiftDownBtns = cityRowsContainer.querySelectorAll('[data-action="shift-city-down"]');
    shiftDownBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cityId = (btn as HTMLElement).dataset.cityId;
        if (cityId) {
          shiftCityPosition(cityId, 'down');
        }
      });
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
      btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    });

    // Wire Bulletproof Drag and Drop City Reordering
    let draggedCityId: string | null = null;
    let currentDropTargetRow: HTMLElement | null = null;
    const draggableCards = cityRowsContainer.querySelectorAll<HTMLElement>('.chronos-city-card');

    draggableCards.forEach((card) => {
      const row = card.closest('.chronos-row-draggable') as HTMLElement | null;
      const cityId = row?.dataset.cityId;
      if (!row || !cityId) return;

      card.addEventListener('dragstart', (e) => {
        draggedCityId = cityId;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', cityId);
          try {
            e.dataTransfer.setData('application/json', JSON.stringify({ cityId }));
          } catch (_) {}
        }
        setTimeout(() => {
          row.classList.add('opacity-30', 'scale-[0.99]');
        }, 10);
      });

      card.addEventListener('dragend', () => {
        draggedCityId = null;
        if (currentDropTargetRow) {
          currentDropTargetRow.classList.remove('border-t-2', 'border-b-2', 'border-emerald-400');
          currentDropTargetRow = null;
        }
        cityRowsContainer.querySelectorAll<HTMLElement>('.chronos-row-draggable').forEach((r) => {
          r.classList.remove('opacity-30', 'scale-[0.99]', 'border-t-2', 'border-b-2', 'border-emerald-400');
        });
      });
    });

    cityRowsContainer.ondragover = (e: DragEvent) => {
      if (!draggedCityId) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      const targetRow = (e.target as HTMLElement).closest('.chronos-row-draggable') as HTMLElement | null;
      if (!targetRow || targetRow.dataset.cityId === draggedCityId) {
        if (currentDropTargetRow && currentDropTargetRow !== targetRow) {
          currentDropTargetRow.classList.remove('border-t-2', 'border-b-2', 'border-emerald-400');
          currentDropTargetRow = null;
        }
        return;
      }

      if (currentDropTargetRow && currentDropTargetRow !== targetRow) {
        currentDropTargetRow.classList.remove('border-t-2', 'border-b-2', 'border-emerald-400');
      }

      currentDropTargetRow = targetRow;
      const rect = targetRow.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (e.clientY < midY) {
        targetRow.classList.add('border-t-2', 'border-t-emerald-400');
        targetRow.classList.remove('border-b-2', 'border-b-emerald-400');
      } else {
        targetRow.classList.add('border-b-2', 'border-b-emerald-400');
        targetRow.classList.remove('border-t-2', 'border-t-emerald-400');
      }
    };

    cityRowsContainer.ondragleave = (e: DragEvent) => {
      if (e.relatedTarget && !cityRowsContainer.contains(e.relatedTarget as Node)) {
        if (currentDropTargetRow) {
          currentDropTargetRow.classList.remove('border-t-2', 'border-b-2', 'border-emerald-400');
          currentDropTargetRow = null;
        }
      }
    };

    cityRowsContainer.ondrop = (e: DragEvent) => {
      if (!draggedCityId) return;
      e.preventDefault();

      const targetRow = (e.target as HTMLElement).closest('.chronos-row-draggable') as HTMLElement | null;
      if (currentDropTargetRow) {
        currentDropTargetRow.classList.remove('border-t-2', 'border-b-2', 'border-emerald-400');
        currentDropTargetRow = null;
      }

      if (!targetRow || targetRow.dataset.cityId === draggedCityId) return;
      const targetCityId = targetRow.dataset.cityId;
      if (!targetCityId) return;

      const ws = getActiveWorkspace();
      const srcIdx = ws.cities.findIndex((c) => c.id === draggedCityId);
      let targetIdx = ws.cities.findIndex((c) => c.id === targetCityId);

      if (srcIdx !== -1 && targetIdx !== -1) {
        const rect = targetRow.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY >= midY && srcIdx > targetIdx) {
          targetIdx += 1;
        } else if (e.clientY < midY && srcIdx < targetIdx) {
          // targetIdx remains same
        }

        const [movedCity] = ws.cities.splice(srcIdx, 1);
        ws.cities.splice(targetIdx, 0, movedCity);
        saveWorkspacesToStorage();
        renderCityRows();
        updateClocks();
      }
    };

    updateClocks();
  }

  function shiftCityPosition(cityId: string, direction: 'up' | 'down') {
    const ws = getActiveWorkspace();
    const idx = ws.cities.findIndex((c) => c.id === cityId);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const temp = ws.cities[idx];
      ws.cities[idx] = ws.cities[idx - 1];
      ws.cities[idx - 1] = temp;
      saveWorkspacesToStorage();
      renderCityRows();
      updateClocks();
    } else if (direction === 'down' && idx < ws.cities.length - 1) {
      const temp = ws.cities[idx];
      ws.cities[idx] = ws.cities[idx + 1];
      ws.cities[idx + 1] = temp;
      saveWorkspacesToStorage();
      renderCityRows();
      updateClocks();
    }
  }

  function saveWorkspacesToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rtz-workspaces-v3', JSON.stringify(WORKSPACES));
      localStorage.setItem('rtz-active-workspace-id', activeWorkspaceId);
    }
  }

  function deleteCityFromWorkspace(cityId: string) {
    const ws = getActiveWorkspace();
    const removedCity = ws.cities.find((c) => c.id === cityId);
    ws.cities = ws.cities.filter((c) => c.id !== cityId);
    saveWorkspacesToStorage();
    renderCityRows();
  }

  function addCityToActiveWorkspace(city: CityTime) {
    const ws = getActiveWorkspace();
    if (ws.cities.some((c) => c.id === city.id)) {
      return;
    }
    ws.cities.push({ ...city, isBase: false });
    saveWorkspacesToStorage();
    renderCityRows();
    closeCommandPalette();

    setTimeout(() => {
      const newRow = document.getElementById(`row-${city.id}`);
      if (newRow) {
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 60);
  }

  // --- Workspace Switcher & Management Dropdown ---
  function updateWorkspaceFocus() {
    if (!workspaceListEl) return;
    const items = workspaceListEl.querySelectorAll<HTMLElement>('[data-ws-row]');
    items.forEach((item, idx) => {
      if (idx === focusedWsIndex) {
        item.classList.add('bg-[#1e1e28]', 'text-white');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('bg-[#1e1e28]', 'text-white');
      }
    });
  }

  function renderWorkspaceList() {
    if (!workspaceListEl) return;
    const totalBadge = document.getElementById('chronos-ws-total-badge');
    if (totalBadge) totalBadge.textContent = `${WORKSPACES.length} teams`;

    workspaceListEl.innerHTML = WORKSPACES.map((w, index) => {
      const isActive = w.id === activeWorkspaceId;
      return `
        <div 
          data-ws-row="${index}"
          class="w-full px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors group ${
            isActive ? 'bg-[#1e1e28] text-white font-medium' : 'text-zinc-400 hover:text-white hover:bg-[#181820]'
          }"
        >
          <button 
            type="button" 
            data-ws-id="${w.id}" 
            class="flex items-center gap-2 flex-1 text-left cursor-pointer overflow-hidden truncate"
          >
            <span class="w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'}"></span>
            <span class="truncate">${w.name}</span>
          </button>

          <!-- Right side: City count & Hover Actions (Rename + Delete) -->
          <div class="flex items-center gap-1 shrink-0 ml-2">
            <span class="text-[10px] font-mono text-zinc-500 group-hover:hidden">${w.cities.length} cities</span>
            
            <!-- Rename Action Button -->
            <button 
              type="button" 
              data-action="rename-ws" 
              data-ws-id="${w.id}"
              class="hidden group-hover:flex p-1 rounded hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition-colors cursor-pointer" 
              title="Rename workspace"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>

            <!-- Delete Action Button -->
            <button 
              type="button" 
              data-action="delete-ws" 
              data-ws-id="${w.id}"
              class="hidden group-hover:flex p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer" 
              title="Delete workspace"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to switch workspace
    const wsButtons = workspaceListEl.querySelectorAll('[data-ws-id]:not([data-action])');
    wsButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const wsId = (btn as HTMLElement).dataset.wsId;
        if (wsId) {
          activeWorkspaceId = wsId;
          focusedWsIndex = idx;
          const currentWs = getActiveWorkspace();
          if (workspaceNameEl) workspaceNameEl.textContent = currentWs.name;
          closeWorkspaceDropdown();
          renderCityRows();
        }
      });
    });

    // Attach Rename workspace listeners
    const renameBtns = workspaceListEl.querySelectorAll('[data-action="rename-ws"]');
    renameBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wsId = (btn as HTMLElement).dataset.wsId;
        if (wsId) {
          openEditWorkspaceModal(wsId);
        }
      });
    });

    // Attach Delete workspace listeners
    const deleteWsBtns = workspaceListEl.querySelectorAll('[data-action="delete-ws"]');
    deleteWsBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wsId = (btn as HTMLElement).dataset.wsId;
        if (wsId) {
          deleteWorkspace(wsId);
        }
      });
    });

    updateWorkspaceFocus();
  }

  function deleteWorkspace(wsId: string) {
    if (WORKSPACES.length <= 1) {
      return;
    }
    WORKSPACES = WORKSPACES.filter((w) => w.id !== wsId);

    if (activeWorkspaceId === wsId) {
      activeWorkspaceId = WORKSPACES[0].id;
      focusedWsIndex = 0;
      const currentWs = getActiveWorkspace();
      if (workspaceNameEl) workspaceNameEl.textContent = currentWs.name;
    }

    renderWorkspaceList();
    renderCityRows();
  }

  function openEditWorkspaceModal(wsId: string) {
    closeWorkspaceDropdown();
    const ws = WORKSPACES.find((w) => w.id === wsId);
    if (!ws || !editWsModal) return;

    if (editWsIdInput) editWsIdInput.value = ws.id;
    if (editWsNameInput) editWsNameInput.value = ws.name;

    editWsModal.classList.remove('hidden');
    editWsModal.classList.add('flex');
    if (editWsNameInput) editWsNameInput.focus();
  }

  function closeEditWorkspaceModal() {
    if (editWsModal) {
      editWsModal.classList.add('hidden');
      editWsModal.classList.remove('flex');
    }
  }

  if (closeEditWsModalBtn) closeEditWsModalBtn.addEventListener('click', closeEditWorkspaceModal);
  if (cancelEditWsBtn) cancelEditWsBtn.addEventListener('click', closeEditWorkspaceModal);

  if (saveEditWsBtn) {
    saveEditWsBtn.addEventListener('click', () => {
      const wsId = editWsIdInput?.value;
      const targetWs = WORKSPACES.find((w) => w.id === wsId);
      if (targetWs) {
        targetWs.name = editWsNameInput?.value.trim() || 'Workspace';

        if (activeWorkspaceId === wsId) {
          if (workspaceNameEl) workspaceNameEl.textContent = targetWs.name;
        }

        closeEditWorkspaceModal();
        renderWorkspaceList();
      }
    });
  }

  function toggleWorkspaceDropdown() {
    if (!workspaceDropdown) return;
    const isHidden = workspaceDropdown.classList.contains('hidden');
    if (isHidden) {
      const activeIdx = WORKSPACES.findIndex((w) => w.id === activeWorkspaceId);
      focusedWsIndex = activeIdx >= 0 ? activeIdx : 0;
      renderWorkspaceList();
      workspaceDropdown.classList.remove('hidden');
      workspaceDropdown.classList.add('flex');
      if (workspaceChevron) workspaceChevron.style.transform = 'rotate(180deg)';
      if (workspaceBtn) workspaceBtn.blur();
    } else {
      closeWorkspaceDropdown();
    }
  }

  function closeWorkspaceDropdown() {
    if (workspaceDropdown) {
      workspaceDropdown.classList.add('hidden');
      workspaceDropdown.classList.remove('flex');
      if (workspaceChevron) workspaceChevron.style.transform = 'rotate(0deg)';
    }
  }

  if (workspaceBtn) {
    workspaceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDateDropdown();
      closeCalendarDropdown();
      toggleWorkspaceDropdown();
    });
  }

  // --- Interactive Calendar Datepicker ---
  function toggleDateDropdown() {
    if (!dateDropdown) return;
    const isHidden = dateDropdown.classList.contains('hidden');
    if (isHidden) {
      closeWorkspaceDropdown();
      closeCalendarDropdown();
      dateDropdown.classList.remove('hidden');
      dateDropdown.classList.add('flex');
    } else {
      closeDateDropdown();
    }
  }

  function closeDateDropdown() {
    if (dateDropdown) {
      dateDropdown.classList.add('hidden');
      dateDropdown.classList.remove('flex');
    }
  }

  // Date Selector & Calendar State
  let selectedDateObj: Date = new Date();
  let calendarViewDate: Date = new Date();

  function formatDateToPill(d: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }

  function renderCalendar() {
    if (!calendarDaysContainer) return;
    
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    
    // Sync Month & Year Dropdown Values
    if (calMonthSelect) calMonthSelect.value = month.toString();
    if (calYearSelect) calYearSelect.value = year.toString();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    let html = '';

    // 1. Previous month trailing days
    for (let x = firstDayIndex; x > 0; x--) {
      const prevDay = daysInPrevMonth - x + 1;
      html += `
        <button 
          type="button" 
          data-cal-action="prev-month-day" 
          data-day="${prevDay}" 
          class="p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 text-center text-xs transition-colors cursor-pointer"
        >
          ${prevDay}
        </button>
      `;
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = 
        selectedDateObj.getDate() === day &&
        selectedDateObj.getMonth() === month &&
        selectedDateObj.getFullYear() === year;

      const isToday = 
        today.getDate() === day &&
        today.getMonth() === month &&
        today.getFullYear() === year;

      let btnClass = 'text-zinc-300 hover:bg-zinc-800 hover:text-white';
      if (isSelected) {
        btnClass = 'bg-emerald-500 text-zinc-950 font-bold shadow-sm';
      } else if (isToday) {
        btnClass = 'text-emerald-400 border border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/20 font-semibold';
      }

      html += `
        <button 
          type="button" 
          data-calendar-day="${day}" 
          class="p-1 rounded-md transition-colors cursor-pointer text-center text-xs ${btnClass}"
        >
          ${day}
        </button>
      `;
    }

    // 3. Next month leading days to complete full grid row
    const totalSlots = firstDayIndex + daysInMonth;
    const remainingSlots = (totalSlots % 7 === 0) ? 0 : 7 - (totalSlots % 7);
    for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
      html += `
        <button 
          type="button" 
          data-cal-action="next-month-day" 
          data-day="${nextDay}" 
          class="p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 text-center text-xs transition-colors cursor-pointer"
        >
          ${nextDay}
        </button>
      `;
    }

    calendarDaysContainer.innerHTML = html;

    // Attach click listeners to current month days
    const dayBtns = calendarDaysContainer.querySelectorAll<HTMLButtonElement>('[data-calendar-day]');
    dayBtns.forEach((b) => {
      b.addEventListener('click', () => {
        const d = parseInt(b.dataset.calendarDay || '1', 10);
        selectDateObj(new Date(year, month, d));
      });
    });

    // Attach click listeners to prev month trailing days
    const prevDayBtns = calendarDaysContainer.querySelectorAll<HTMLButtonElement>('[data-cal-action="prev-month-day"]');
    prevDayBtns.forEach((b) => {
      b.addEventListener('click', () => {
        const d = parseInt(b.dataset.day || '1', 10);
        calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
        selectDateObj(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), d));
      });
    });

    // Attach click listeners to next month leading days
    const nextDayBtns = calendarDaysContainer.querySelectorAll<HTMLButtonElement>('[data-cal-action="next-month-day"]');
    nextDayBtns.forEach((b) => {
      b.addEventListener('click', () => {
        const d = parseInt(b.dataset.day || '1', 10);
        calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
        selectDateObj(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), d));
      });
    });
  }

  function selectDateObj(d: Date) {
    selectedDateObj = new Date(d);
    calendarViewDate = new Date(d);
    activeSelectedDate = formatDateToPill(selectedDateObj);
    if (currentDateLabel) {
      currentDateLabel.textContent = activeSelectedDate;
    }
    renderCalendar();
    closeDateDropdown();
  }

  if (calMonthSelect) {
    calMonthSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      const newMonth = parseInt(calMonthSelect.value, 10);
      calendarViewDate.setMonth(newMonth);
      renderCalendar();
    });
  }

  if (calYearSelect) {
    calYearSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      const newYear = parseInt(calYearSelect.value, 10);
      calendarViewDate.setFullYear(newYear);
      renderCalendar();
    });
  }

  if (dateBtn) {
    dateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderCalendar();
      toggleDateDropdown();
    });
  }

  if (calPrevMonthBtn) {
    calPrevMonthBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (calNextMonthBtn) {
    calNextMonthBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
      renderCalendar();
    });
  }

  if (calTodayBtn) {
    calTodayBtn.addEventListener('click', () => selectDateObj(new Date()));
  }
  if (calTomorrowBtn) {
    calTomorrowBtn.addEventListener('click', () => selectDateObj(new Date(Date.now() + 86400000)));
  }
  if (calNextWeekBtn) {
    calNextWeekBtn.addEventListener('click', () => selectDateObj(new Date(Date.now() + 7 * 86400000)));
  }

  // Initial date label sync
  if (currentDateLabel) {
    currentDateLabel.textContent = formatDateToPill(selectedDateObj);
  }
  renderCalendar();

  // --- Expandable Bottom Intelligence Dock Logic ---
  function toggleIntelligenceDock() {
    if (!intelligencePanel) return;
    isIntelligenceDockOpen = !isIntelligenceDockOpen;
    if (isIntelligenceDockOpen) {
      intelligencePanel.classList.remove('hidden');
      intelligencePanel.classList.add('flex');
      if (dockChevron) dockChevron.style.transform = 'rotate(180deg)';
      updateMeetingQuality();
    } else {
      intelligencePanel.classList.add('hidden');
      intelligencePanel.classList.remove('flex');
      if (dockChevron) dockChevron.style.transform = 'rotate(0deg)';
    }
  }

  if (toggleIntelligenceBtn) {
    toggleIntelligenceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeCalendarDropdown();
      toggleIntelligenceDock();
    });
  }

  // Set Meeting Duration & sync all inputs
  function setMeetingDuration(minutes: number) {
    selectedMeetingDurationMinutes = Math.max(15, Math.min(720, minutes));
    const formatted = formatDuration(selectedMeetingDurationMinutes);

    if (durationBadge) {
      durationBadge.textContent = `Duration: ${formatted}`;
    }
    if (durationTextInput) {
      durationTextInput.value = formatted;
    }
    if (durationSlider) {
      durationSlider.value = selectedMeetingDurationMinutes.toString();
    }

    if (durationPillsContainer) {
      const durBtns = durationPillsContainer.querySelectorAll('[data-duration]');
      durBtns.forEach((b) => {
        const d = parseInt((b as HTMLElement).dataset.duration || '60', 10);
        if (d === selectedMeetingDurationMinutes) {
          b.className = 'py-1 rounded-lg bg-white text-zinc-950 font-bold border border-white text-xs font-mono transition-colors cursor-pointer text-center shadow-sm';
        } else {
          b.className = 'py-1 rounded-lg bg-[#181822] text-zinc-400 hover:text-white border border-[#252532] text-xs font-mono transition-colors cursor-pointer text-center';
        }
      });
    }

    updateMeetingQuality();
  }

  // Duration Pills selection
  if (durationPillsContainer) {
    const durBtns = durationPillsContainer.querySelectorAll('[data-duration]');
    durBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const dur = parseInt((btn as HTMLElement).dataset.duration || '60', 10);
        setMeetingDuration(dur);
      });
    });
  }

  // Custom Duration Slider
  if (durationSlider) {
    durationSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val)) {
        setMeetingDuration(val);
      }
    });
  }

  // Custom Duration Manual Text Input
  if (durationTextInput) {
    durationTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const parsed = parseDurationString(durationTextInput.value);
        if (parsed !== null && parsed >= 15 && parsed <= 720) {
          setMeetingDuration(parsed);
        } else {
          durationTextInput.value = formatDuration(selectedMeetingDurationMinutes);
        }
        durationTextInput.blur();
      }
    });

    durationTextInput.addEventListener('blur', () => {
      const parsed = parseDurationString(durationTextInput.value);
      if (parsed !== null && parsed >= 15 && parsed <= 720) {
        setMeetingDuration(parsed);
      } else {
        durationTextInput.value = formatDuration(selectedMeetingDurationMinutes);
      }
    });
  }

  // --- Select Calendar Dropdown Engine ---
  function toggleCalendarDropdown() {
    if (!calendarDropdownMenu) return;
    const isHidden = calendarDropdownMenu.classList.contains('hidden');
    if (isHidden) {
      calendarDropdownMenu.classList.remove('hidden');
      calendarDropdownMenu.classList.add('flex');
      if (calChevron) calChevron.style.transform = 'rotate(180deg)';
    } else {
      closeCalendarDropdown();
    }
  }

  function closeCalendarDropdown() {
    if (calendarDropdownMenu) {
      calendarDropdownMenu.classList.add('hidden');
      calendarDropdownMenu.classList.remove('flex');
      if (calChevron) calChevron.style.transform = 'rotate(0deg)';
    }
  }

  if (calendarSelectBtn) {
    calendarSelectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCalendarDropdown();
    });
  }

  // Google Calendar Export
  if (exportGoogleBtn) {
    exportGoogleBtn.addEventListener('click', () => {
      const ws = getActiveWorkspace();
      const title = encodeURIComponent(`Team Sync (${ws.name})`);
      const startH = Math.floor(focusHour);
      const startM = Math.round((focusHour - startH) * 60);
      const endTotalM = startH * 60 + startM + selectedMeetingDurationMinutes;
      const endH = Math.floor(endTotalM / 60) % 24;
      const endM = endTotalM % 60;

      const dateStr = '20260824';
      const startIso = `${dateStr}T${startH.toString().padStart(2, '0')}${startM.toString().padStart(2, '0')}00Z`;
      const endIso = `${dateStr}T${endH.toString().padStart(2, '0')}${endM.toString().padStart(2, '0')}00Z`;

      const details = encodeURIComponent(
        `Scheduled with Chronos Timezones (${ws.name})\n\n` +
        ws.cities.map((c) => `${formatTime((focusHour + c.offsetHours + 24) % 24, is24Hour)} ${c.name}`).join('\n')
      );

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
      window.open(url, '_blank');
      closeCalendarDropdown();
    });
  }

  // Outlook Web Calendar Export
  if (exportOutlookBtn) {
    exportOutlookBtn.addEventListener('click', () => {
      const ws = getActiveWorkspace();
      const title = encodeURIComponent(`Team Sync (${ws.name})`);
      const startH = Math.floor(focusHour);
      const startM = Math.round((focusHour - startH) * 60);
      const endTotalM = startH * 60 + startM + selectedMeetingDurationMinutes;
      const endH = Math.floor(endTotalM / 60) % 24;
      const endM = endTotalM % 60;

      const startIso = `2026-08-24T${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}:00Z`;
      const endIso = `2026-08-24T${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00Z`;

      const details = encodeURIComponent(
        `Scheduled with Chronos Timezones (${ws.name})\n\n` +
        ws.cities.map((c) => `${formatTime((focusHour + c.offsetHours + 24) % 24, is24Hour)} ${c.name}`).join('\n')
      );

      const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startIso}&enddt=${endIso}&body=${details}`;
      window.open(url, '_blank');
      closeCalendarDropdown();
    });
  }

  // Apple & .ICS Export
  function triggerIcsDownload() {
    const ws = getActiveWorkspace();
    const startH = Math.floor(focusHour);
    const startM = Math.round((focusHour - startH) * 60);
    const endTotalM = startH * 60 + startM + selectedMeetingDurationMinutes;
    const endH = Math.floor(endTotalM / 60) % 24;
    const endM = endTotalM % 60;

    const startIso = `20260824T${startH.toString().padStart(2, '0')}${startM.toString().padStart(2, '0')}00Z`;
    const endIso = `20260824T${endH.toString().padStart(2, '0')}${endM.toString().padStart(2, '0')}00Z`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Chronos//Timezone Workspace//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@chronos.local`,
      `DTSTAMP:${startIso}`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:Team Sync (${ws.name})`,
      `DESCRIPTION:Scheduled via Chronos Timezones (${ws.name})`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `team-sync-${ws.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    closeCalendarDropdown();
  }

  if (exportAppleBtn) exportAppleBtn.addEventListener('click', triggerIcsDownload);
  if (exportIcsFileBtn) exportIcsFileBtn.addEventListener('click', triggerIcsDownload);

  // Share Meeting Link & Formatted Participant Local Times
  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ws = getActiveWorkspace();
      const bestSlots = calculateBestTimes();
      const topSlot = bestSlots[0];
      const slotHour = topSlot ? topSlot.hour : focusHour;
      const startH = formatTime(slotHour, is24Hour);
      const endH = formatTime(slotHour + selectedMeetingDurationMinutes / 60, is24Hour);
      const baseCity = ws.cities.find((c) => c.isBase) || ws.cities[0];

      const inviteText = [
        `🗓️ Proposed Meeting: ${ws.name} (${activeSelectedDate})`,
        `⏰ Time Window: ${startH} – ${endH} (${baseCity?.name || 'Local'} Time)`,
        '',
        '👥 Local Times for Participants:',
        ...ws.cities.map((c) => {
          const t = formatTime((slotHour + c.offsetHours + 24) % 24, is24Hour);
          return `  • ${c.name} (${c.flag || ''}): ${t} (${c.statusLabel || ''})`;
        }),
        '',
        `⚡ Coordinated via RealTimeZones • https://realtimezones.com`,
      ].join('\n');

      copyToClipboard(inviteText).then(() => {
        const originalHtml = shareBtn.innerHTML;
        shareBtn.classList.add('border-emerald-500/40', 'bg-emerald-950/20');
        shareBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-75 duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="text-emerald-400 font-semibold text-xs">Copied Invite!</span>
        `;
        setTimeout(() => {
          shareBtn.classList.remove('border-emerald-500/40', 'bg-emerald-950/20');
          shareBtn.innerHTML = originalHtml;
        }, 1600);
      });
    });
  }

  window.addEventListener('click', (e) => {
    if (workspaceDropdown && !workspaceDropdown.contains(e.target as Node)) {
      closeWorkspaceDropdown();
    }
    if (dateDropdown && !dateDropdown.contains(e.target as Node)) {
      closeDateDropdown();
    }
    if (calendarDropdownMenu && !calendarDropdownMenu.contains(e.target as Node) && e.target !== calendarSelectBtn) {
      closeCalendarDropdown();
    }
  });

  // --- UNIFIED RAYCAST QUICK LAUNCHER ENGINE ---
  function getOmniNavigableItems(): HTMLElement[] {
    if (!omnibarResults) return [];
    return Array.from(
      omnibarResults.querySelectorAll<HTMLElement>(
        '[data-omni-row], [data-omni-action]'
      )
    );
  }

  function updateOmniFocus() {
    const items = getOmniNavigableItems();
    if (items.length === 0) return;

    if (focusedOmniIndex < 0) focusedOmniIndex = 0;
    if (focusedOmniIndex >= items.length) focusedOmniIndex = items.length - 1;

    items.forEach((item, idx) => {
      if (idx === focusedOmniIndex) {
        item.classList.add('bg-[#1e1e28]', 'text-white');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('bg-[#1e1e28]', 'text-white');
      }
    });
  }

  function openCommandPalette(defaultQuery: string = '') {
    if (commandPaletteModal) {
      closeWorkspaceDropdown();
      closeDateDropdown();
      closeCalendarDropdown();
      commandPaletteModal.classList.remove('hidden');
      commandPaletteModal.classList.add('flex');
      focusedOmniIndex = 0;
      if (commandInput) {
        commandInput.value = defaultQuery;
        renderOmnibarResults(defaultQuery);
        commandInput.focus();
        commandInput.select();
      }
    }
  }

  function closeCommandPalette() {
    if (commandPaletteModal) {
      commandPaletteModal.classList.add('hidden');
      commandPaletteModal.classList.remove('flex');
    }
  }

  function renderOmnibarResults(query: string) {
    if (!omnibarResults) return;
    const q = query.trim().toLowerCase();
    const currentWs = getActiveWorkspace();

    const isTimeQuery = /\d/.test(q) && (q.includes('in') || q.includes('to') || q.includes('pm') || q.includes('am') || q.includes('equals'));

    if (isTimeQuery) {
      omnibarResults.innerHTML = `
        <div class="flex flex-col gap-2">
          <div class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1">
            CONVERTED TIME MATRIX:
          </div>
          <div class="rounded-xl border border-[#1e1e26] bg-[#0f0f13] divide-y divide-[#181820] overflow-hidden">
            <div class="p-3 flex items-center justify-between hover:bg-[#14141a] transition-colors">
              <div class="flex items-center gap-3">
                <span class="text-base leading-none">🇯🇵</span>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-white">Tokyo</span>
                  <span class="text-[10px] text-zinc-500 font-mono">Night</span>
                </div>
              </div>
              <div class="flex flex-col items-end font-mono">
                <span class="text-xs font-semibold text-white">11:00 PM</span>
                <span class="text-[10px] text-zinc-500">JST, GMT+9</span>
              </div>
            </div>
            <div class="p-3 flex items-center justify-between hover:bg-[#14141a] transition-colors">
              <div class="flex items-center gap-3">
                <span class="text-base leading-none">🇺🇸</span>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-white">New York</span>
                  <span class="text-[10px] text-zinc-500 font-mono">Working Hours</span>
                </div>
              </div>
              <div class="flex flex-col items-end font-mono">
                <span class="text-xs font-semibold text-white">10:00 AM</span>
                <span class="text-[10px] text-zinc-500">EDT, GMT-4</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1 mt-1">
          <div class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1">ACTIONS</div>
          <button id="omni-action-copy-converted" data-omni-action="copy-converted" type="button" class="w-full p-2.5 rounded-xl bg-[#16161e] border border-[#272734] text-white flex items-center justify-between text-xs hover:bg-[#1f1f2a] transition-colors cursor-pointer">
            <div class="flex items-center gap-2.5">
              <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span class="font-medium text-zinc-200">Copy: '3:00 PM BST = 11:00 PM JST / 10:00 AM EDT'</span>
            </div>
            <span class="text-zinc-500 font-mono text-[10px]">↵</span>
          </button>
        </div>
      `;

      const copyBtn = document.getElementById('omni-action-copy-converted');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          copyToClipboard("3:00 PM BST = 11:00 PM JST / 10:00 AM EDT").then(() => {
            closeCommandPalette();
          });
        });
      }
      focusedOmniIndex = 0;
      updateOmniFocus();
      return;
    }

    const matchingCities = POPULAR_AVAILABLE_CITIES.filter((c) =>
      c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) || c.timezone.toLowerCase().includes(q) || c.statusLabel.toLowerCase().includes(q)
    );

    let citiesHtml = '';
    if (matchingCities.length > 0) {
      citiesHtml = `
        <div class="flex flex-col gap-1.5">
          <div class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1 flex items-center justify-between">
            <span>Cities Directory</span>
            <span>${matchingCities.length} matches</span>
          </div>
          <div class="rounded-xl border border-[#1e1e26] bg-[#0f0f13] divide-y divide-[#181820] overflow-hidden" id="omni-cities-list">
            ${matchingCities
              .slice(0, 10)
              .map((city) => {
                const alreadyInWs = currentWs.cities.some((c) => c.id === city.id);
                return `
                  <div 
                    data-omni-row="${city.id}"
                    class="p-2.5 sm:p-3 flex items-center justify-between hover:bg-[#15151c] transition-all cursor-pointer"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-lg leading-none">${city.flag}</span>
                      <div class="flex flex-col">
                        <span class="text-xs font-medium text-white">${city.name}, <span class="text-zinc-400 font-normal">${city.country}</span></span>
                        <span class="text-[10px] text-zinc-500 font-mono">${city.timezone} • ${city.statusLabel}</span>
                      </div>
                    </div>
                    ${
                      alreadyInWs
                        ? '<span class="text-[10px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">In Workspace</span>'
                        : `<button type="button" data-omni-add-city="${city.id}" class="h-7 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Add</span>
                          </button>`
                    }
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    const actionsHtml = `
      <div class="flex flex-col gap-1.5">
        <div class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1">
          Quick Actions & Workspaces
        </div>
        <div class="flex flex-col gap-1">
          <button id="omni-act-now" data-omni-action="now" type="button" class="w-full p-2.5 rounded-xl hover:bg-[#16161e] border border-transparent hover:border-[#272734] text-zinc-300 hover:text-white flex items-center justify-between text-xs transition-colors cursor-pointer">
            <div class="flex items-center gap-2.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Snap Timeline to Current Live Time (Now)</span>
            </div>
            <kbd class="text-[10px] font-mono text-zinc-500">N</kbd>
          </button>

          <button id="omni-act-copy-overlap" data-omni-action="copy-overlap" type="button" class="w-full p-2.5 rounded-xl hover:bg-[#16161e] border border-transparent hover:border-[#272734] text-zinc-300 hover:text-white flex items-center justify-between text-xs transition-colors cursor-pointer">
            <div class="flex items-center gap-2.5">
              <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Copy Common Overlap Slot to Clipboard</span>
            </div>
            <kbd class="text-[10px] font-mono text-zinc-500">⌘C</kbd>
          </button>

          <button id="omni-act-toggle-time" data-omni-action="toggle-time" type="button" class="w-full p-2.5 rounded-xl hover:bg-[#16161e] border border-transparent hover:border-[#272734] text-zinc-300 hover:text-white flex items-center justify-between text-xs transition-colors cursor-pointer">
            <div class="flex items-center gap-2.5">
              <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>Toggle Time Format (12h / 24h)</span>
            </div>
            <span class="text-[10px] font-mono text-zinc-500">${is24Hour ? 'Currently 24h' : 'Currently 12h'}</span>
          </button>
        </div>
      </div>
    `;

    omnibarResults.innerHTML = citiesHtml + (q.length === 0 ? actionsHtml : '');

    // Clicking city rows
    const omniRows = omnibarResults.querySelectorAll('[data-omni-row]');
    omniRows.forEach((row) => {
      row.addEventListener('click', () => {
        const cityId = (row as HTMLElement).dataset.omniRow;
        const target = POPULAR_AVAILABLE_CITIES.find((c) => c.id === cityId);
        if (target) {
          addCityToActiveWorkspace(target);
        }
      });
    });

    const omniAddBtns = omnibarResults.querySelectorAll('[data-omni-add-city]');
    omniAddBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cityId = (btn as HTMLElement).dataset.omniAddCity;
        const target = POPULAR_AVAILABLE_CITIES.find((c) => c.id === cityId);
        if (target) {
          addCityToActiveWorkspace(target);
        }
      });
    });

    const actNow = document.getElementById('omni-act-now');
    if (actNow) {
      actNow.addEventListener('click', () => {
        closeCommandPalette();
        snapToNow();
      });
    }

    const actCopyOverlap = document.getElementById('omni-act-copy-overlap');
    if (actCopyOverlap) {
      actCopyOverlap.addEventListener('click', () => {
        closeCommandPalette();
        if (copySlotBtn) copySlotBtn.click();
      });
    }

    const actToggleTime = document.getElementById('omni-act-toggle-time');
    if (actToggleTime) {
      actToggleTime.addEventListener('click', () => {
        is24Hour = !is24Hour;
        closeCommandPalette();
        updateClocks();
      });
    }

    focusedOmniIndex = 0;
    updateOmniFocus();
  }

  if (commandInput) {
    commandInput.addEventListener('input', (e) => {
      renderOmnibarResults((e.target as HTMLInputElement).value);
    });

    commandInput.addEventListener('keydown', (e) => {
      const items = getOmniNavigableItems();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
          focusedOmniIndex = (focusedOmniIndex + 1) % items.length;
          updateOmniFocus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) {
          focusedOmniIndex = (focusedOmniIndex - 1 + items.length) % items.length;
          updateOmniFocus();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items.length > 0 && items[focusedOmniIndex]) {
          items[focusedOmniIndex].click();
        } else {
          const q = commandInput.value.trim().toLowerCase();
          const matchingCity = POPULAR_AVAILABLE_CITIES.find((c) =>
            c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
          );
          if (matchingCity) {
            addCityToActiveWorkspace(matchingCity);
          }
        }
      }
    });
  }

  if (closeCmdBtn) closeCmdBtn.addEventListener('click', closeCommandPalette);

  if (btnAddCity) {
    btnAddCity.addEventListener('click', () => openCommandPalette(''));
    btnAddCity.addEventListener('mousedown', (e) => e.stopPropagation());
    btnAddCity.addEventListener('pointerdown', (e) => e.stopPropagation());
  }
  if (btnAddCityEmpty) {
    btnAddCityEmpty.addEventListener('click', () => openCommandPalette(''));
    btnAddCityEmpty.addEventListener('mousedown', (e) => e.stopPropagation());
    btnAddCityEmpty.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  // --- Create Workspace Modal Logic ---
  function openCreateWsModal() {
    closeWorkspaceDropdown();
    if (newWsModal) {
      newWsModal.classList.remove('hidden');
      newWsModal.classList.add('flex');
      if (newWsNameInput) {
        newWsNameInput.value = '';
        newWsNameInput.focus();
      }
    }
  }

  function closeCreateWsModal() {
    if (newWsModal) {
      newWsModal.classList.add('hidden');
      newWsModal.classList.remove('flex');
    }
  }

  if (btnCreateWs) btnCreateWs.addEventListener('click', openCreateWsModal);
  if (closeWsModalBtn) closeWsModalBtn.addEventListener('click', closeCreateWsModal);
  if (cancelWsBtn) cancelWsBtn.addEventListener('click', closeCreateWsModal);

  if (saveWsBtn) {
    saveWsBtn.addEventListener('click', () => {
      const name = newWsNameInput?.value.trim() || 'New Workspace';
      const newWsId = `ws-${Date.now()}`;

      const newWorkspace: Workspace = {
        id: newWsId,
        name,
        cities: [detectUserLocalCity()],
      };

      WORKSPACES.push(newWorkspace);
      activeWorkspaceId = newWsId;
      saveWorkspacesToStorage();
      if (workspaceNameEl) workspaceNameEl.textContent = name;
      renderWorkspaceList();
      closeCreateWsModal();
      renderCityRows();
    });
  }

  // Update clocks, availability & intelligence panel
  function updateClocks() {
    const ws = getActiveWorkspace();
    ws.cities.forEach((city) => {
      const localHourFloat = (focusHour + city.offsetHours + 24) % 24;
      const clockEl = document.getElementById(`clock-${city.id}`);
      const statusDot = document.getElementById(`dot-${city.id}`);
      const statusText = document.getElementById(`status-${city.id}`);

      if (clockEl) {
        clockEl.textContent = formatTime(localHourFloat, is24Hour);
      }

      let status: 'working' | 'border' | 'sleep' = 'sleep';
      let statusName = 'Sleep';
      const offsetInfo = city.statusLabel;

      if (localHourFloat >= workStartHour && localHourFloat < workEndHour) {
        status = 'working';
        statusName = 'Working';
      } else {
        const borderMorningStart = Math.max(0, workStartHour - 2);
        const borderEveningEnd = Math.min(24, workEndHour + 4);
        if ((localHourFloat >= borderMorningStart && localHourFloat < workStartHour) || (localHourFloat >= workEndHour && localHourFloat < borderEveningEnd)) {
          status = 'border';
          statusName = 'Border';
        } else {
          status = 'sleep';
          statusName = 'Sleep';
        }
      }

      if (statusDot) {
        statusDot.className = `w-2 h-2 rounded-full ${
          status === 'working'
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
            : status === 'border'
            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
            : 'border border-zinc-600 bg-zinc-800'
        }`;
      }
      if (statusText) {
        statusText.textContent = `${statusName} • ${offsetInfo}`;
      }
    });

    if (scrubberTag) {
      scrubberTag.textContent = formatTime(focusHour, is24Hour);
    }

    if (sliderScrubber && document.activeElement !== sliderScrubber) {
      sliderScrubber.value = focusHour.toString();
    }

    updateMeetingQuality();
    renderMenuBarGlance();
    syncTauriDesktopIntegration();

    const container = canvasContainer || scrubberHeader;
    if (container) {
      const rect = container.getBoundingClientRect();
      const leftOffset = 280;
      const gridWidth = rect.width - leftOffset;
      if (gridWidth > 0) {
        const fraction = focusHour / 24;
        const currentPx = leftOffset + fraction * gridWidth;

        if (scrubberLine) {
          scrubberLine.style.left = `${currentPx}px`;
          const inner = document.getElementById('chronos-canvas-inner') || canvasContainer;
          if (inner) {
            const totalH = Math.max(inner.scrollHeight, inner.clientHeight, 600);
            scrubberLine.style.height = `${totalH}px`;
          }
        }
        if (scrubberTag) {
          scrubberTag.style.left = `${currentPx}px`;
        }
      }
    }
  }

  // --- Synchronize Live System Tray Hover Tooltip with Current Cities and Time ---
  function syncTauriDesktopIntegration() {
    if (typeof window === 'undefined') return;
    const ws = getActiveWorkspace();
    const bestSlots = calculateBestTimes();
    const topSlot = bestSlots[0];
    const baseCity = ws.cities.find((c) => c.isBase) || ws.cities[0];
    const baseCode = baseCity ? (baseCity.badge === 'Base' ? baseCity.name : baseCity.badge) : 'Local';
    const overlapStr = topSlot
      ? `${formatTime(topSlot.hour, is24Hour)} – ${formatTime(topSlot.hour + selectedMeetingDurationMinutes / 60, is24Hour)} (${baseCode})`
      : 'All Day';

    const lines = [
      `RealTimeZones • ${ws.name}`,
      ...ws.cities.map((c) => {
        const localH = (focusHour + c.offsetHours + 24) % 24;
        const isWorking = localH >= workStartHour && localH < workEndHour;
        const status = isWorking ? 'Working' : 'Sleep';
        return `• ${c.name}: ${formatTime(localH, is24Hour)} (${status})`;
      }),
      `⭐ Golden Overlap: ${overlapStr}`,
    ];

    const tooltipText = lines.join('\n');

    try {
      const tauri = (window as any).__TAURI__;
      if (tauri && tauri.core && tauri.core.invoke) {
        tauri.core.invoke('update_tray_tooltip', { tooltip: tooltipText });
      }
    } catch (_) {}
  }

  // --- Dynamic Live Menu Bar Glance Rendering ---
  function renderMenuBarGlance() {
    const ws = getActiveWorkspace();
    if (menubarWsName) menubarWsName.textContent = ws.name;

    if (menubarCitiesList) {
      if (ws.cities.length === 0) {
        menubarCitiesList.innerHTML = `
          <div class="p-4 text-center text-xs text-zinc-500 font-mono">
            No cities in workspace. Click Add below.
          </div>
        `;
      } else {
        menubarCitiesList.innerHTML = ws.cities
          .map((city) => {
            const localHourFloat = (focusHour + city.offsetHours + 24) % 24;
            const isWorking = localHourFloat >= workStartHour && localHourFloat < workEndHour;
            const isBorder =
              (localHourFloat >= Math.max(0, workStartHour - 2) && localHourFloat < workStartHour) ||
              (localHourFloat >= workEndHour && localHourFloat < Math.min(24, workEndHour + 4));

            let dotClass = 'border border-zinc-600 bg-zinc-800';
            if (isWorking) {
              dotClass = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
            } else if (isBorder) {
              dotClass = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
            }

            const formattedTime = formatTime(localHourFloat, is24Hour);
            const badgeText = city.isBase ? 'Base' : (city.badge || `+${city.offsetHours}h`);

            return `
              <div class="p-3 px-3.5 flex items-center justify-between hover:bg-[#16161c] transition-colors select-none">
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${dotClass}"></span>
                    <span class="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
                      <span>${city.name}</span>
                      <span class="text-xs">${city.flag || ''}</span>
                    </span>
                  </div>
                  <span class="text-[10px] text-zinc-500 font-mono pl-4">${badgeText}</span>
                </div>
                <div class="flex flex-col items-end font-mono">
                  <span class="text-xs font-bold text-white tracking-tight">${formattedTime}</span>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    // Dynamic Overlap Ribbon
    const baseCity = ws.cities.find((c) => c.isBase) || ws.cities[0];
    const baseCode = baseCity ? (baseCity.badge === 'Base' ? baseCity.name.slice(0, 3).toUpperCase() : baseCity.badge) : '';
    const bestSlots = calculateBestTimes();

    if (menubarOverlapText) {
      if (ws.cities.length <= 1) {
        menubarOverlapText.textContent = `Base Set (${baseCity?.name || 'Local'})`;
      } else if (bestSlots.length > 0) {
        const topSlot = bestSlots[0];
        const startH = formatTime(topSlot.hour, is24Hour);
        const endH = formatTime(topSlot.hour + selectedMeetingDurationMinutes / 60, is24Hour);
        menubarOverlapText.textContent = `${startH} – ${endH} ${baseCode}`;
      } else {
        menubarOverlapText.textContent = 'All Day Available';
      }
    }

    if (menubarOverlapBar && bestSlots.length > 0) {
      const topHour = bestSlots[0].hour;
      const leftPercent = (topHour / 24) * 100;
      const widthPercent = (selectedMeetingDurationMinutes / (24 * 60)) * 100;
      menubarOverlapBar.style.left = `${Math.max(0, Math.min(90, leftPercent))}%`;
      menubarOverlapBar.style.width = `${Math.max(5, Math.min(50, widthPercent))}%`;
    }
  }

  // Native Menu Bar Companion Popover Logic
  function openMenuBarPopover() {
    renderMenuBarGlance();
    if (menubarOverlay) {
      menubarOverlay.classList.remove('hidden');
      menubarOverlay.classList.add('flex');
    }
  }

  function closeMenuBarPopover() {
    if (menubarOverlay) {
      menubarOverlay.classList.add('hidden');
      menubarOverlay.classList.remove('flex');
    }
  }

  function toggleMenuBarPopover() {
    if (menubarOverlay && !menubarOverlay.classList.contains('hidden')) {
      closeMenuBarPopover();
    } else {
      openMenuBarPopover();
    }
  }

  if (btnToggleMenubar) {
    btnToggleMenubar.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenuBarPopover();
    });
  }

  // Menubar button handlers
  if (menubarBtnExpand) {
    menubarBtnExpand.addEventListener('click', () => {
      closeMenuBarPopover();
    });
  }

  if (menubarOverlay) {
    menubarOverlay.addEventListener('click', (e) => {
      if (e.target === menubarOverlay) {
        closeMenuBarPopover();
      }
    });
  }

  if (menubarBtnAdd) {
    menubarBtnAdd.addEventListener('click', () => {
      closeMenuBarPopover();
      openCommandPalette();
    });
  }

  if (menubarBtnCopy) {
    menubarBtnCopy.addEventListener('click', () => {
      const ws = getActiveWorkspace();
      const bestSlots = calculateBestTimes();
      const topSlot = bestSlots[0];
      const startH = formatTime(topSlot ? topSlot.hour : focusHour, is24Hour);
      const endH = formatTime((topSlot ? topSlot.hour : focusHour) + selectedMeetingDurationMinutes / 60, is24Hour);
      const baseCity = ws.cities.find((c) => c.isBase) || ws.cities[0];

      const lines = [
        `🗓️ Meeting Slot (${ws.name}): ${startH} – ${endH} ${baseCity?.name || 'Base'}`,
        '',
        ...ws.cities.map((c) => {
          const t = formatTime((topSlot ? topSlot.hour : focusHour) + c.offsetHours, is24Hour);
          return `• ${c.name} (${c.flag || ''}): ${t}`;
        }),
      ];
      copyToClipboard(lines.join('\n'));

      if (menubarCopyLabel) {
        const orig = menubarCopyLabel.textContent;
        menubarCopyLabel.textContent = 'COPIED!';
        setTimeout(() => {
          if (menubarCopyLabel) menubarCopyLabel.textContent = orig;
        }, 1500);
      }
    });
  }

  // --- Mouse Dragging & Wheel Engine ---
  let isDragging = false;

  function calculateHourFromX(clientX: number) {
    const container = canvasContainer || scrubberHeader;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const leftOffset = 280;
    const gridLeft = rect.left + leftOffset;
    const gridWidth = rect.width - leftOffset;
    if (gridWidth <= 0) return;

    const rawX = clientX - gridLeft;
    const clampedX = Math.max(0, Math.min(gridWidth, rawX));
    const fraction = clampedX / gridWidth;

    const stepMinutes = Math.max(1, scrubStepMinutes);
    const totalMinutes = Math.round((fraction * 24 * 60) / stepMinutes) * stepMinutes;
    focusHour = Math.min(23.75, Math.max(0, totalMinutes / 60));
    updateClocks();
  }

  function startDrag(e: MouseEvent | PointerEvent) {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.closest('button') ||
        target.closest('input') ||
        target.closest('a') ||
        target.closest('#chronos-empty-state') ||
        target.closest('#chronos-command-modal') ||
        target.closest('#chronos-new-workspace-modal') ||
        target.closest('#chronos-edit-workspace-modal') ||
        target.closest('#chronos-date-dropdown') ||
        target.closest('#chronos-intelligence-panel') ||
        (target.closest('.group') && target.closest('[data-action="delete-city"]')))
    ) {
      return;
    }

    const ws = getActiveWorkspace();
    if (ws.cities.length === 0 && e.currentTarget === canvasContainer) {
      return;
    }

    const container = canvasContainer || scrubberHeader;
    if (container) {
      const rect = container.getBoundingClientRect();
      if (e.clientX < rect.left + 280 && e.target !== scrubberTag) {
        return;
      }
    }

    e.preventDefault();
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
    document.body.classList.add('is-scrubbing');

    isDragging = true;
    calculateHourFromX(e.clientX);
  }

  function onMouseMove(e: MouseEvent | PointerEvent) {
    if (!isDragging) return;
    e.preventDefault();
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
    calculateHourFromX(e.clientX);
  }

  function stopDrag() {
    isDragging = false;
    document.body.classList.remove('is-scrubbing');
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('pointermove', onMouseMove);
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('pointerup', stopDrag);

  if (scrubberHeader) {
    scrubberHeader.addEventListener('mousedown', startDrag);
    scrubberHeader.addEventListener('pointerdown', startDrag);
  }

  if (canvasContainer) {
    canvasContainer.addEventListener('mousedown', startDrag);
    canvasContainer.addEventListener('pointerdown', startDrag);
  }

  // Mouse Wheel Scrubbing Support
  function onWheel(e: WheelEvent) {
    const target = e.target as HTMLElement | null;
    if (
      (settingsModal && !settingsModal.classList.contains('hidden')) ||
      (welcomeModal && !welcomeModal.classList.contains('hidden')) ||
      (commandPaletteModal && !commandPaletteModal.classList.contains('hidden')) ||
      (newWsModal && !newWsModal.classList.contains('hidden')) ||
      (editWsModal && !editWsModal.classList.contains('hidden')) ||
      (dateDropdown && !dateDropdown.classList.contains('hidden')) ||
      (target && (target.closest('#chronos-omnibar-results') || target.closest('.overflow-y-auto') || target.closest('#chronos-settings-modal') || target.closest('#chronos-welcome-modal') || target.closest('#chronos-workspace-dropdown') || target.closest('#chronos-date-dropdown') || target.closest('#chronos-intelligence-panel') || target.closest('#chronos-calendar-dropdown-menu')))
    ) {
      return;
    }

    const container = canvasContainer || scrubberHeader;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top - 60 &&
      e.clientY <= rect.bottom + 60
    ) {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 1) return;
      const direction = delta > 0 ? 1 : -1;
      const stepFraction = e.shiftKey ? 1.0 : (Math.max(1, scrubStepMinutes) / 60);
      focusHour = Math.min(23.75, Math.max(0, focusHour + direction * stepFraction));
      updateClocks();
    }
  }

  window.addEventListener('wheel', onWheel, { passive: false });

  // Slider Input
  if (sliderScrubber) {
    sliderScrubber.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        focusHour = val;
        updateClocks();
      }
    });
  }

  // Window Resize
  window.addEventListener('resize', () => {
    updateClocks();
  });

  // Snap to NOW
  function snapToNow() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/London',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hPart = parts.find((p) => p.type === 'hour')?.value || '12';
    const mPart = parts.find((p) => p.type === 'minute')?.value || '0';
    const currentLondonHour = parseInt(hPart, 10);
    const currentLondonMin = parseInt(mPart, 10);

    focusHour = currentLondonHour + Math.round(currentLondonMin / 15) * 0.25;
    updateClocks();
  }

  if (btnNow) btnNow.addEventListener('click', snapToNow);

  // 12h / 24h Toggle
  if (toggle12hBtn && toggle24hBtn) {
    toggle12hBtn.addEventListener('click', () => {
      is24Hour = false;
      toggle12hBtn.classList.add('bg-zinc-800', 'text-white');
      toggle12hBtn.classList.remove('text-zinc-400');
      toggle24hBtn.classList.remove('bg-zinc-800', 'text-white');
      toggle24hBtn.classList.add('text-zinc-400');
      updateClocks();
    });

    toggle24hBtn.addEventListener('click', () => {
      is24Hour = true;
      toggle24hBtn.classList.add('bg-zinc-800', 'text-white');
      toggle24hBtn.classList.remove('text-zinc-400');
      toggle12hBtn.classList.remove('bg-zinc-800', 'text-white');
      toggle12hBtn.classList.add('text-zinc-400');
      updateClocks();
    });
  }

  // Copy Formatted Slot
  if (copySlotBtn) {
    copySlotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ws = getActiveWorkspace();
      const parts = ws.cities.map((c) => {
        const time = formatTime((focusHour + c.offsetHours + 24) % 24, is24Hour);
        return `${time} ${c.name}`;
      });
      const text = `Meeting Slot: ${parts.join(' | ')}`;
      copyToClipboard(text).then(() => {
        const originalHtml = copySlotBtn.innerHTML;
        copySlotBtn.classList.add('border-emerald-500/40', 'bg-emerald-950/20');
        copySlotBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-75 duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="text-emerald-400 font-semibold text-xs">Copied!</span>
        `;
        setTimeout(() => {
          copySlotBtn.classList.remove('border-emerald-500/40', 'bg-emerald-950/20');
          copySlotBtn.innerHTML = originalHtml;
        }, 1600);
      });
    });
  }

  // --- Settings & Appearance Controller (Staged Apply / Cancel Pattern) ---
  let stagedTheme = currentTheme;
  let stagedWorkStart = workStartHour;
  let stagedWorkEnd = workEndHour;
  let stagedScrubStep = scrubStepMinutes;

  function parseTimeStringToHour(text: string): number | null {
    const cleaned = text.trim().toLowerCase();
    if (!cleaned) return null;

    // Matches e.g. "9am", "5pm", "11:30pm", "8:00 am"
    const ampmMatch = cleaned.match(/^(\d+(?:\.\d+)?|\d+:\d+)\s*(am|pm)$/);
    if (ampmMatch) {
      let raw = ampmMatch[1];
      const isPm = ampmMatch[2] === 'pm';
      let h = 0;
      let m = 0;
      if (raw.includes(':')) {
        const [hStr, mStr] = raw.split(':');
        h = parseInt(hStr, 10);
        m = parseInt(mStr, 10);
      } else {
        const floatVal = parseFloat(raw);
        h = Math.floor(floatVal);
        m = Math.round((floatVal - h) * 60);
      }
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return (h + m / 60) % 24;
    }

    // Matches e.g. "08:30", "17:00", "9:15"
    if (cleaned.includes(':')) {
      const [hStr, mStr] = cleaned.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h) && !isNaN(m)) {
        return (h + m / 60) % 24;
      }
    }

    // Matches e.g. "8", "17.5", "18"
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 0 && num <= 24) {
      return num % 24;
    }

    return null;
  }

  function formatHourToLabel(h: number): string {
    const intHour = Math.floor(h);
    const mins = Math.round((h - intHour) * 60);
    const minStr = mins < 10 ? `0${mins}` : `${mins}`;
    const hStr = intHour < 10 ? `0${intHour}` : `${intHour}`;
    return `${hStr}:${minStr}`;
  }

  function applyTheme(theme: string) {
    currentTheme = theme;
    localStorage.setItem('chronos-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }
  applyTheme(currentTheme);

  function renderSettingsModalUI() {
    // 1. Theme Option Highlights
    if (themeOptionsContainer) {
      const themeBtns = themeOptionsContainer.querySelectorAll<HTMLElement>('[data-theme-val]');
      themeBtns.forEach((btn) => {
        if (btn.dataset.themeVal === stagedTheme) {
          btn.classList.add('border-white/40', 'shadow-sm');
          btn.classList.remove('border-[#272734]');
        } else {
          btn.classList.remove('border-white/40', 'shadow-sm');
          btn.classList.add('border-[#272734]');
        }
      });
    }

    // 2. Working hours inputs
    if (settingWorkStartText) settingWorkStartText.value = formatHourToLabel(stagedWorkStart);
    if (settingWorkEndText) settingWorkEndText.value = formatHourToLabel(stagedWorkEnd);

    // 3. Scrub step buttons & custom input
    if (settingStepCustom) settingStepCustom.value = stagedScrubStep.toString();
    if (stepOptionsContainer) {
      const stepBtns = stepOptionsContainer.querySelectorAll<HTMLElement>('[data-step-val]');
      stepBtns.forEach((btn) => {
        if (parseInt(btn.dataset.stepVal || '15', 10) === stagedScrubStep) {
          btn.className = 'flex-1 min-w-[50px] py-1.5 rounded-lg border border-white/40 bg-white text-zinc-950 font-bold text-xs font-mono transition-all cursor-pointer text-center shadow-sm';
        } else {
          btn.className = 'flex-1 min-w-[50px] py-1.5 rounded-lg border border-[#272734] bg-[#14141c] text-zinc-300 text-xs font-mono hover:text-white transition-all cursor-pointer text-center';
        }
      });
    }

    // 4. Desktop & System Integration Toggles
    if (settingToggleMenubar) {
      settingToggleMenubar.checked = localStorage.getItem('rtz-setting-menubar') !== 'false';
    }
    if (settingToggleAutostart) {
      settingToggleAutostart.checked = localStorage.getItem('rtz-setting-autostart') !== 'false';
    }
  }

  function openSettingsModal() {
    closeCommandPalette();
    closeWorkspaceDropdown();
    closeDateDropdown();
    closeCalendarDropdown();
    // Copy active settings to staged
    stagedTheme = currentTheme;
    stagedWorkStart = workStartHour;
    stagedWorkEnd = workEndHour;
    stagedScrubStep = scrubStepMinutes;
    renderSettingsModalUI();

    if (settingsModal) {
      settingsModal.classList.remove('hidden');
      settingsModal.classList.add('flex');
    }
  }

  function closeSettingsModal() {
    if (settingsModal) {
      settingsModal.classList.add('hidden');
      settingsModal.classList.remove('flex');
    }
  }

  function saveAndApplySettings() {
    // Read and parse manual inputs before saving
    if (settingWorkStartText) {
      const parsed = parseTimeStringToHour(settingWorkStartText.value);
      if (parsed !== null) stagedWorkStart = parsed;
    }
    if (settingWorkEndText) {
      const parsed = parseTimeStringToHour(settingWorkEndText.value);
      if (parsed !== null) stagedWorkEnd = parsed;
    }
    if (settingStepCustom) {
      const val = parseInt(settingStepCustom.value, 10);
      if (!isNaN(val) && val >= 1 && val <= 120) {
        stagedScrubStep = val;
      }
    }

    // Apply staged settings to live state
    currentTheme = stagedTheme;
    workStartHour = stagedWorkStart;
    workEndHour = stagedWorkEnd;
    scrubStepMinutes = stagedScrubStep;

    // Persist all settings
    localStorage.setItem('chronos-theme', currentTheme);
    localStorage.setItem('chronos-work-start', workStartHour.toString());
    localStorage.setItem('chronos-work-end', workEndHour.toString());
    localStorage.setItem('chronos-scrub-step', scrubStepMinutes.toString());

    const isMenubarEnabled = settingToggleMenubar ? settingToggleMenubar.checked : true;
    const isAutostartEnabled = settingToggleAutostart ? settingToggleAutostart.checked : true;

    if (settingToggleMenubar) {
      localStorage.setItem('rtz-setting-menubar', isMenubarEnabled.toString());
    }
    if (settingToggleAutostart) {
      localStorage.setItem('rtz-setting-autostart', isAutostartEnabled.toString());
    }

    // Direct Native Desktop Integration (Tauri)
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri && tauri.core && tauri.core.invoke) {
        tauri.core.invoke('set_tray_visible', { visible: isMenubarEnabled });
        tauri.core.invoke('set_close_to_tray', { enabled: isMenubarEnabled });
      }
    } catch (_) {}

    // Update Header Menu Bar Glance Button
    if (btnToggleMenubar) {
      if (isMenubarEnabled) {
        btnToggleMenubar.classList.remove('hidden');
        btnToggleMenubar.classList.add('flex');
      } else {
        btnToggleMenubar.classList.add('hidden');
        btnToggleMenubar.classList.remove('flex');
      }
    }

    // Apply live effects immediately
    applyTheme(currentTheme);
    renderCityRows();
    updateClocks();
    closeSettingsModal();
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
  }
  if (cancelSettingsBtn) {
    cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  }
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveAndApplySettings);
  }
  if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener('click', () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chronos-workspaces');
        localStorage.removeItem('chronos-active-workspace-id');
        localStorage.removeItem('rtz-workspaces-v3');
        localStorage.removeItem('rtz-active-workspace-id');
      }
      const localBaseCity = detectUserLocalCity();
      WORKSPACES = [
        {
          id: 'ws-main',
          name: 'My Workspace',
          cities: [localBaseCity],
        },
      ];
      activeWorkspaceId = 'ws-main';
      saveWorkspacesToStorage();
      renderCityRows();
      updateClocks();
      closeSettingsModal();
    });
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }

  // Theme Staging
  if (themeOptionsContainer) {
    const themeBtns = themeOptionsContainer.querySelectorAll<HTMLElement>('[data-theme-val]');
    themeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.themeVal;
        if (val) {
          stagedTheme = val;
          renderSettingsModalUI();
        }
      });
    });
  }

  // Workday Starts Manual Typing
  if (settingWorkStartText) {
    settingWorkStartText.addEventListener('input', () => {
      const parsed = parseTimeStringToHour(settingWorkStartText.value);
      if (parsed !== null) stagedWorkStart = parsed;
    });
  }

  // Workday Ends Manual Typing
  if (settingWorkEndText) {
    settingWorkEndText.addEventListener('input', () => {
      const parsed = parseTimeStringToHour(settingWorkEndText.value);
      if (parsed !== null) stagedWorkEnd = parsed;
    });
  }

  // Scrub Step Presets
  if (stepOptionsContainer) {
    const stepBtns = stepOptionsContainer.querySelectorAll<HTMLElement>('[data-step-val]');
    stepBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.stepVal || '15', 10);
        stagedScrubStep = step;
        renderSettingsModalUI();
      });
    });
  }

  // Custom Step Minutes Input
  if (settingStepCustom) {
    settingStepCustom.addEventListener('input', () => {
      const val = parseInt(settingStepCustom.value, 10);
      if (!isNaN(val) && val >= 1 && val <= 120) {
        stagedScrubStep = val;
        // Un-highlight preset buttons if custom value doesn't match
        if (stepOptionsContainer) {
          const stepBtns = stepOptionsContainer.querySelectorAll<HTMLElement>('[data-step-val]');
          stepBtns.forEach((btn) => {
            if (parseInt(btn.dataset.stepVal || '15', 10) === stagedScrubStep) {
              btn.className = 'flex-1 min-w-[50px] py-1.5 rounded-lg border border-white/40 bg-white text-zinc-950 font-bold text-xs font-mono transition-all cursor-pointer text-center shadow-sm';
            } else {
              btn.className = 'flex-1 min-w-[50px] py-1.5 rounded-lg border border-[#272734] bg-[#14141c] text-zinc-300 text-xs font-mono hover:text-white transition-all cursor-pointer text-center';
            }
          });
        }
      }
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      const jsonStr = JSON.stringify(WORKSPACES, null, 2);
      
      // 1. Copy JSON to clipboard
      copyToClipboard(jsonStr);

      // 2. Trigger native blob file download
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const blobUrl = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = blobUrl;
        downloadAnchor.download = `realtimezones-workspaces-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } catch (_) {}

      // 3. Visual button feedback
      const originalText = exportJsonBtn.innerHTML;
      exportJsonBtn.classList.add('border-emerald-500/40', 'bg-emerald-950/20');
      exportJsonBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span class="text-emerald-400 font-semibold text-xs">Exported & Copied JSON!</span>
      `;
      setTimeout(() => {
        exportJsonBtn.classList.remove('border-emerald-500/40', 'bg-emerald-950/20');
        exportJsonBtn.innerHTML = originalText;
      }, 2000);
    });
  }

  if (importJsonInput) {
    importJsonInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].cities) {
            WORKSPACES.splice(0, WORKSPACES.length, ...parsed);
            activeWorkspaceId = WORKSPACES[0].id;
            if (workspaceNameEl) workspaceNameEl.textContent = WORKSPACES[0].name;
            renderWorkspaceList();
            renderCityRows();
            closeSettingsModal();
          } else {
            alert('Invalid workspaces JSON format.');
          }
        } catch (err) {
          alert('Could not parse JSON file.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');

    // If Workspace dropdown is open, handle ArrowUp / ArrowDown / Enter
    if (workspaceDropdown && !workspaceDropdown.classList.contains('hidden')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusedWsIndex = (focusedWsIndex + 1) % WORKSPACES.length;
        updateWorkspaceFocus();
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusedWsIndex = (focusedWsIndex - 1 + WORKSPACES.length) % WORKSPACES.length;
        updateWorkspaceFocus();
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (WORKSPACES[focusedWsIndex]) {
          activeWorkspaceId = WORKSPACES[focusedWsIndex].id;
          const currentWs = getActiveWorkspace();
          if (workspaceNameEl) workspaceNameEl.textContent = currentWs.name;
          closeWorkspaceDropdown();
          renderCityRows();
        }
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (commandPaletteModal && !commandPaletteModal.classList.contains('hidden')) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleMenuBarPopover();
    } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      if (settingsModal && !settingsModal.classList.contains('hidden')) {
        closeSettingsModal();
      } else {
        openSettingsModal();
      }
    } else if (e.key === 'Escape') {
      closeMenuBarPopover();
      closeWelcomeModal();
      closeCommandPalette();
      closeSettingsModal();
      closeCreateWsModal();
      closeEditWorkspaceModal();
      closeWorkspaceDropdown();
      closeDateDropdown();
      closeCalendarDropdown();
    } else if (e.key === 'Enter' && welcomeModal && !welcomeModal.classList.contains('hidden')) {
      e.preventDefault();
      closeWelcomeModal();
    } else if (!isInputActive) {
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        snapToNow();
      } else if (e.key === 'ArrowLeft') {
        const stepFraction = scrubStepMinutes / 60;
        focusHour = Math.max(0, focusHour - (e.shiftKey ? 1 : stepFraction));
        updateClocks();
      } else if (e.key === 'ArrowRight') {
        const stepFraction = scrubStepMinutes / 60;
        focusHour = Math.min(23.75, focusHour + (e.shiftKey ? 1 : stepFraction));
        updateClocks();
      }
    }
  });

  // Welcome Modal Logic
  function openWelcomeModal() {
    if (!welcomeModal) return;
    const currentWs = getActiveWorkspace();
    const baseCity = currentWs.cities.find((c) => c.isBase) || currentWs.cities[0] || detectUserLocalCity();

    if (welcomeBaseCityName) {
      welcomeBaseCityName.textContent = `${baseCity.name}, ${baseCity.country}`;
    }
    if (welcomeBaseCityTz) {
      welcomeBaseCityTz.textContent = `${baseCity.timezone} • ${baseCity.statusLabel || 'Local Time'}`;
    }

    welcomeModal.classList.remove('hidden');
    welcomeModal.classList.add('flex');
  }

  function closeWelcomeModal() {
    if (welcomeModal) {
      welcomeModal.classList.add('hidden');
      welcomeModal.classList.remove('flex');
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('rtz-welcome-seen-v1', 'true');
    }
  }

  if (welcomeStartBtn) {
    welcomeStartBtn.addEventListener('click', closeWelcomeModal);
  }
  if (welcomeSkipBtn) {
    welcomeSkipBtn.addEventListener('click', closeWelcomeModal);
  }
  if (welcomeGuideBtn) {
    welcomeGuideBtn.addEventListener('click', () => {
      closeSettingsModal();
      openWelcomeModal();
    });
  }
  if (welcomeModal) {
    welcomeModal.addEventListener('click', (e) => {
      if (e.target === welcomeModal) closeWelcomeModal();
    });
  }

  const cmdTriggers = document.querySelectorAll('.trigger-cmd-k');
  cmdTriggers.forEach((btn) => {
    btn.addEventListener('click', () => openCommandPalette(''));
  });

  if (commandPaletteModal) {
    commandPaletteModal.addEventListener('click', (e) => {
      if (e.target === commandPaletteModal) closeCommandPalette();
    });
  }

  // First-Run Pure Native SVG Intro Splash Sequence
  function playIntroSequence(onComplete?: () => void) {
    if (!introSplash) {
      if (onComplete) onComplete();
      return;
    }

    introSplash.classList.remove('hidden', 'opacity-0');
    introSplash.classList.add('flex', 'opacity-100');

    let hasFinished = false;
    const finishIntro = () => {
      if (hasFinished) return;
      hasFinished = true;
      introSplash.classList.remove('opacity-100');
      introSplash.classList.add('opacity-0');
      setTimeout(() => {
        introSplash.classList.remove('flex');
        introSplash.classList.add('hidden');
        if (typeof window !== 'undefined') {
          localStorage.setItem('rtz-intro-seen-v1', 'true');
        }
        if (onComplete) onComplete();
      }, 700);
    };

    // Auto-advance after 2.6s pure SVG animation sequence
    setTimeout(() => {
      finishIntro();
    }, 2600);
  }

  // Initial render on boot: Synchronize active workspace name, dropdown list, city rows and clocks
  const currentBootWs = getActiveWorkspace();
  if (workspaceNameEl) workspaceNameEl.textContent = currentBootWs.name;
  renderWorkspaceList();
  renderCityRows();
  updateClocks();

  // Initialize Desktop & System Integration Settings on Boot
  if (typeof window !== 'undefined') {
    const isMenubarEnabled = localStorage.getItem('rtz-setting-menubar') !== 'false';
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri && tauri.core && tauri.core.invoke) {
        tauri.core.invoke('set_tray_visible', { visible: isMenubarEnabled });
        tauri.core.invoke('set_close_to_tray', { enabled: isMenubarEnabled });
      }
    } catch (_) {}

    if (btnToggleMenubar) {
      if (isMenubarEnabled) {
        btnToggleMenubar.classList.remove('hidden');
        btnToggleMenubar.classList.add('flex');
      } else {
        btnToggleMenubar.classList.add('hidden');
        btnToggleMenubar.classList.remove('flex');
      }
    }
  }

  // First-Time Launch Sequence (Intro Splash -> Welcome Modal)
  if (typeof window !== 'undefined') {
    const hasSeenIntro = localStorage.getItem('rtz-intro-seen-v1');
    const hasSeenWelcome = localStorage.getItem('rtz-welcome-seen-v1');

    if (!hasSeenIntro) {
      // First-ever launch: Play smooth SVG reveal once, then show welcome guide
      playIntroSequence(() => {
        if (!hasSeenWelcome) {
          openWelcomeModal();
        }
      });
    } else if (!hasSeenWelcome) {
      openWelcomeModal();
    }
  }
}

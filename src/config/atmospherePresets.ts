export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeOfDay = 'morning' | 'golden' | 'night';
export const seasonPresets = {
  spring: { label: '春樱', short: '春', english: 'SPRING', phrase: '樱花落在光华楼下', sky: '#dce8df', horizon: '#f4ebdf', sun: '#fff0d8', foliage: '#e8afb4', grass: '#90aa72', fog: 0.0042, number: '01' },
  summer: { label: '夏荫', short: '夏', english: 'SUMMER', phrase: '把午后的风留在光草', sky: '#c8e3e5', horizon: '#eef2df', sun: '#fff9ec', foliage: '#518363', grass: '#73915a', fog: 0.0035, number: '02' },
  autumn: { label: '秋银杏', short: '秋', english: 'AUTUMN', phrase: '银杏把小径染成金色', sky: '#e2dccb', horizon: '#f3dfc4', sun: '#ffd9a0', foliage: '#d7a443', grass: '#9a9d64', fog: 0.0045, number: '03' },
  winter: { label: '冬雪', short: '冬', english: 'WINTER', phrase: '等一场落在复旦的雪', sky: '#cbd9e4', horizon: '#edf1f2', sun: '#dfebff', foliage: '#71878a', grass: '#b4c4bd', fog: 0.0050, number: '04' },
} as const;
export const timePresets = {
  morning: { label: '晨光', short: '晨', english: 'MORNING', night: 0, exposure: 1.05, sunIntensity: 2.7, ambient: 1.6 },
  golden: { label: '黄昏', short: '昏', english: 'GOLDEN HOUR', night: 0.5, exposure: 1.1, sunIntensity: 2.4, ambient: 1.45 },
  night: { label: '星夜', short: '夜', english: 'STARRY NIGHT', night: 1, exposure: 1.25, sunIntensity: 1.15, ambient: 0.9 },
} as const;

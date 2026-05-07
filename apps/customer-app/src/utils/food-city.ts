export interface FoodCity {
  code: string;
  name: string;
}

export const FOOD_CITY_STORAGE_KEY = 'food:cityCode';
export const FOOD_CITY_NAME_STORAGE_KEY = 'food:cityName';

export const FOOD_CITIES: FoodCity[] = [
  { code: 'BJ', name: '北京' },
  { code: 'SH', name: '上海' },
  { code: 'GZ', name: '广州' },
  { code: 'SZ', name: '深圳' },
];

export const DEFAULT_FOOD_CITY: FoodCity = { code: 'BJ', name: '北京' };

export function resolveFoodCityName(code: string): string {
  return FOOD_CITIES.find((c) => c.code === code)?.name ?? code;
}

export function readStoredFoodCity(): FoodCity {
  const code = (uni.getStorageSync(FOOD_CITY_STORAGE_KEY) as string) || DEFAULT_FOOD_CITY.code;
  const storedName = (uni.getStorageSync(FOOD_CITY_NAME_STORAGE_KEY) as string) || '';
  return { code, name: storedName || resolveFoodCityName(code) };
}

export function writeStoredFoodCity(city: FoodCity): void {
  uni.setStorageSync(FOOD_CITY_STORAGE_KEY, city.code);
  uni.setStorageSync(FOOD_CITY_NAME_STORAGE_KEY, city.name);
}

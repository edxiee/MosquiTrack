export interface WeatherData {
  temperature: number;
  humidity: number;
}

// Cache to prevent spamming the API for the same location
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();

export async function getTrapWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  
  // Cache for 15 minutes
  if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const weather = {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m
    };
    
    weatherCache.set(cacheKey, { data: weather, timestamp: Date.now() });
    return weather;
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    return null;
  }
}

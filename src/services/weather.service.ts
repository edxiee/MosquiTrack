export interface WeatherData {
  temperature: number;
  humidity: number;
}

export async function getTrapWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m
    };
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    return null;
  }
}

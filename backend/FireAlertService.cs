using System;
using System.Globalization;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace backend
{
    public class FireAlertDto
    {
        public bool HasFireWarning { get; set; }
        public string EventName { get; set; } = "None";
        public string Description { get; set; } = string.Empty;
    }

    public class FireAlertService
    {
        private static readonly HttpClient _httpClient = new HttpClient();

        public FireAlertService()
        {
            if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
            {
                _httpClient.DefaultRequestHeaders.Add("User-Agent", "(WeatherApp, contact@weatherapp.com)");
            }
        }

        public async Task<FireAlertDto> CheckFireAlertsAsync(double lat, double lon)
        {
            // Format coordinates safely using InvariantCulture
            string latStr = lat.ToString(CultureInfo.InvariantCulture);
            string lonStr = lon.ToString(CultureInfo.InvariantCulture);
            string url = $"https://api.weather.gov/alerts/active?point={latStr},{lonStr}";

            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) 
                {
                    return new FireAlertDto();
                }

                string jsonString = await response.Content.ReadAsStringAsync();
                using JsonDocument doc = JsonDocument.Parse(jsonString);
                
                if (doc.RootElement.TryGetProperty("features", out JsonElement features) && features.GetArrayLength() > 0)
                {
                    foreach (JsonElement feature in features.EnumerateArray())
                    {
                        if (feature.TryGetProperty("properties", out JsonElement props))
                        {
                            string eventName = props.GetProperty("event").GetString() ?? "";

                            if (eventName.Contains("Red Flag", StringComparison.OrdinalIgnoreCase) || 
                                eventName.Contains("Fire Weather", StringComparison.OrdinalIgnoreCase))
                            {
                                return new FireAlertDto
                                {
                                    HasFireWarning = true,
                                    EventName = eventName,
                                    Description = props.GetProperty("description").GetString() ?? "High fire danger conditions present."
                                };
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error checking NWS fire alerts: {ex.Message}");
            }

            return new FireAlertDto 
            { 
                HasFireWarning = false, 
                EventName = "Normal", 
                Description = "No active fire weather warnings for this location." 
            };
        }
    }
}
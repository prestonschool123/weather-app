using System;
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
            // Weather.gov requires a User-Agent header or it blocks the request
            if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
            {
                _httpClient.DefaultRequestHeaders.Add("User-Agent", "(WeatherApp, contact@weatherapp.com)");
            }
        }

        public async Task<FireAlertDto> CheckFireAlertsAsync(double lat, double lon)
        {
            // Query active alerts directly for these coordinates
            string url = $"https://api.weather.gov/alerts/active?point={lat},{lon}";

            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) 
                {
                    return new FireAlertDto();
                }

                string jsonString = await response.Content.ReadAsStringAsync();
                using JsonDocument doc = JsonDocument.Parse(jsonString);
                
                // Check if any active alerts returned match fire conditions
                if (doc.RootElement.TryGetProperty("features", out JsonElement features) && features.GetArrayLength() > 0)
                {
                    foreach (JsonElement feature in features.EnumerateArray())
                    {
                        if (feature.TryGetProperty("properties", out JsonElement props))
                        {
                            string eventName = props.GetProperty("event").GetString() ?? "";

                            // Look for Red Flag Warnings or Fire Weather Watches
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

            // Default response if no fire warnings are active
            return new FireAlertDto 
            { 
                HasFireWarning = false, 
                EventName = "Normal", 
                Description = "No active fire weather warnings for this location." 
            };
        }
    }
}
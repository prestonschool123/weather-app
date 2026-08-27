using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddHttpClient();

var app = builder.Build();

app.UseCors("AllowFrontend");

<<<<<<< HEAD
// 1. Endpoint for current weather AND 7-day forecast
app.MapGet("/api/weather", async (string city, IHttpClientFactory clientFactory) =>
{
    string apiKey = "0ce8922ee4dc4c3b981174603262108";
    // Changed to forecast.json with days=7 parameter
    string url = $"https://api.weatherapi.com/v1/forecast.json?key={apiKey}&q={city}&days=7";
=======
app.MapGet("/api/weather", async (string city, IHttpClientFactory clientFactory) =>
{
    string apiKey = "0ce8922ee4dc4c3b981174603262108"; 
    string weatherApiUrl = $"https://api.weatherapi.com/v1/current.json?key={apiKey}&q={city}";
>>>>>>> mistakjes-and-pain

    var client = clientFactory.CreateClient();

    try
    {
        var response = await client.GetAsync(weatherApiUrl);
        if (!response.IsSuccessStatusCode)
        {
            return Results.NotFound(new { message = "City not found" });
        }

        var jsonString = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(jsonString);
        var root = doc.RootElement;

<<<<<<< HEAD
        // Extract the array of forecast days
        var forecastDays = root.GetProperty("forecast").GetProperty("forecastday").EnumerateArray();
        var dailyList = new List<object>();

        foreach (var day in forecastDays)
        {
            dailyList.Add(new
            {
                date = day.GetProperty("date").GetString(),
                maxTemp = day.GetProperty("day").GetProperty("maxtemp_f").GetDouble(),
                minTemp = day.GetProperty("day").GetProperty("mintemp_f").GetDouble(),
                condition = day.GetProperty("day").GetProperty("condition").GetProperty("text").GetString()
            });
=======
        var cityName = root.GetProperty("location").GetProperty("name").GetString();
        var tempF = root.GetProperty("current").GetProperty("temp_f").GetDouble();
        var conditionText = root.GetProperty("current").GetProperty("condition").GetProperty("text").GetString();

        double lat = root.GetProperty("location").GetProperty("lat").GetDouble();
        double lon = root.GetProperty("location").GetProperty("lon").GetDouble();

        string fireAlertEvent = "Normal";
        string fireAlertDesc = "No active fire weather warnings.";
        bool hasFireWarning = false;

        try
        {
            var fireRequest = new HttpRequestMessage(HttpMethod.Get, $"https://api.weather.gov/alerts/active?point={lat},{lon}");
            fireRequest.Headers.Add("User-Agent", "(WeatherApp, contact@weatherapp.com)");

            var fireResponse = await client.SendAsync(fireRequest);
            if (fireResponse.IsSuccessStatusCode)
            {
                var fireJson = await fireResponse.Content.ReadAsStringAsync();
                using var fireDoc = JsonDocument.Parse(fireJson);
                
                if (fireDoc.RootElement.TryGetProperty("features", out var features) && features.GetArrayLength() > 0)
                {
                    foreach (var feature in features.EnumerateArray())
                    {
                        var props = feature.GetProperty("properties");
                        string eventName = props.GetProperty("event").GetString() ?? "";

                        if (eventName.Contains("Red Flag", StringComparison.OrdinalIgnoreCase) || 
                            eventName.Contains("Fire Weather", StringComparison.OrdinalIgnoreCase))
                        {
                            hasFireWarning = true;
                            fireAlertEvent = eventName;
                            fireAlertDesc = props.GetProperty("description").GetString() ?? "";
                            break;
                        }
                    }
                }
            }
        }
        catch
        {
            fireAlertDesc = "Fire danger data unavailable for this region.";
>>>>>>> mistakjes-and-pain
        }

        var result = new
        {
<<<<<<< HEAD
            cityName = root.GetProperty("location").GetProperty("name").GetString(),
            temperature = root.GetProperty("current").GetProperty("temp_f").GetDouble(),
            condition = root.GetProperty("current").GetProperty("condition").GetProperty("text").GetString(),
            forecast = dailyList // Returns the list of daily estimates
=======
            cityName = cityName,
            temperature = tempF,
            condition = conditionText,
            fireDanger = new
            {
                hasWarning = hasFireWarning,
                eventName = fireAlertEvent,
                description = fireAlertDesc
            }
>>>>>>> mistakjes-and-pain
        };

        return Results.Ok(result);
    }
    catch (Exception)
    {
        return Results.Problem("Error fetching weather data.");
    }
});

// 2. Endpoint for dynamic city autocomplete suggestions
app.MapGet("/api/weather/search", async (string query, IHttpClientFactory clientFactory) =>
{
    if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
    {
        return Results.Ok(new object[] { });
    }

    string apiKey = "0ce8922ee4dc4c3b981174603262108";
    string url = $"https://api.weatherapi.com/v1/search.json?key={apiKey}&q={query}";

    var client = clientFactory.CreateClient();
    try
    {
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode) return Results.Ok(new object[] { });

        var jsonString = await response.Content.ReadAsStringAsync();
        return Results.Content(jsonString, "application/json");
    }
    catch
    {
        return Results.Ok(new object[] { });
    }
});

app.Run();
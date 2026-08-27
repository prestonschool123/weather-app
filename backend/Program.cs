using System.Text.Json;
using backend;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddHttpClient();
builder.Services.AddSingleton<FireAlertService>();

var app = builder.Build();

app.UseCors("AllowFrontend");

// 1. Weather and Fire Danger Endpoint
app.MapGet("/api/weather", async (string city, IHttpClientFactory clientFactory, FireAlertService fireService) =>
{
    string apiKey = "0ce8922ee4dc4c3b981174603262108"; 
    string weatherApiUrl = $"https://api.weatherapi.com/v1/forecast.json?key={apiKey}&q={city}&days=7";

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

        var cityName = root.GetProperty("location").GetProperty("name").GetString();
        var tempF = root.GetProperty("current").GetProperty("temp_f").GetDouble();
        var conditionText = root.GetProperty("current").GetProperty("condition").GetProperty("text").GetString();

        double lat = root.GetProperty("location").GetProperty("lat").GetDouble();
        double lon = root.GetProperty("location").GetProperty("lon").GetDouble();

        // Delegate NWS alert parsing to FireAlertService
        var fireAlert = await fireService.CheckFireAlertsAsync(lat, lon);

        // Parse 7-day forecast array
        var forecastList = new List<object>();
        var forecastDays = root.GetProperty("forecast").GetProperty("forecastday");

        foreach (var day in forecastDays.EnumerateArray())
        {
            forecastList.Add(new
            {
                date = day.GetProperty("date").GetString(),
                maxTemp = day.GetProperty("day").GetProperty("maxtemp_f").GetDouble(),
                minTemp = day.GetProperty("day").GetProperty("mintemp_f").GetDouble(),
                condition = day.GetProperty("day").GetProperty("condition").GetProperty("text").GetString()
            });
        }

        var result = new
        {
            cityName = cityName,
            temperature = tempF,
            condition = conditionText,
            forecast = forecastList,
            fireDanger = new
            {
                hasWarning = fireAlert.HasFireWarning,
                eventName = string.IsNullOrWhiteSpace(fireAlert.EventName) || fireAlert.EventName == "None" 
                    ? "No Active Fire Warnings" 
                    : fireAlert.EventName,
                description = string.IsNullOrWhiteSpace(fireAlert.Description) 
                    ? $"No active fire weather alerts or Red Flag warnings for {cityName}." 
                    : fireAlert.Description
            }
        };

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error fetching weather: {ex.Message}");
        return Results.Problem("Error fetching weather data.");
    }
});

// 2. City Search / Autocomplete Endpoint
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
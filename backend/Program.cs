using System.Text.Json;
using backend;

// Disable file watchers globally before builder initialization to prevent inotify crashes on cloud environments
Environment.SetEnvironmentVariable("DOTNET_USE_POLLING_FILE_WATCHER", "true");

var builderOptions = new WebApplicationOptions
{
    Args = args
};

var builder = WebApplication.CreateBuilder(builderOptions);

// Clear default configuration sources and add them without file reloading
builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();

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
    string weatherApiUrl = $"https://api.weatherapi.com/v1/forecast.json?key={apiKey}&q={city}&days=5";

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
        var feelsLikeF = root.GetProperty("current").GetProperty("feelslike_f").GetDouble();
        var conditionText = root.GetProperty("current").GetProperty("condition").GetProperty("text").GetString();
        var currentDate = root.GetProperty("location").GetProperty("localtime").GetString()?.Split(' ')[0];

        double lat = root.GetProperty("location").GetProperty("lat").GetDouble();
        double lon = root.GetProperty("location").GetProperty("lon").GetDouble();

        // Delegate NWS alert parsing to FireAlertService
        var fireAlert = await fireService.CheckFireAlertsAsync(lat, lon);

        // Parse 7-day forecast array
        var forecastList = new List<object>();
        var forecastDays = root.GetProperty("forecast").GetProperty("forecastday");

        var dayIndex = 0;
        foreach (var day in forecastDays.EnumerateArray())
        {
            if (dayIndex >= 3)
            {
                break;
            }

            double avgFeelsLike = 0;
            int feelsLikeCount = 0;

            if (day.TryGetProperty("hour", out JsonElement hourlyForecast))
            {
                foreach (var hour in hourlyForecast.EnumerateArray())
                {
                    if (hour.TryGetProperty("feelslike_f", out JsonElement hourlyFeelsLike))
                    {
                        avgFeelsLike += hourlyFeelsLike.GetDouble();
                        feelsLikeCount++;
                    }
                }
            }

            if (feelsLikeCount > 0)
            {
                avgFeelsLike /= feelsLikeCount;
            }

            var forecastDate = day.GetProperty("date").GetString();
            var dayFeelsLike = (forecastDate == currentDate) ? feelsLikeF : avgFeelsLike;

            forecastList.Add(new
            {
                date = forecastDate,
                maxTemp = day.GetProperty("day").GetProperty("maxtemp_f").GetDouble(),
                minTemp = day.GetProperty("day").GetProperty("mintemp_f").GetDouble(),
                feelsLike = dayFeelsLike,
                condition = day.GetProperty("day").GetProperty("condition").GetProperty("text").GetString()
            });

            dayIndex++;
        }

        var result = new
        {
            cityName = cityName,
            temperature = tempF,
            feelsLike = feelsLikeF,
            condition = conditionText,
            forecast = forecastList,
            fireDanger = new
            {
                hasWarning = fireAlert.HasFireWarning
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
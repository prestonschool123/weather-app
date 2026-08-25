
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


app.MapGet("/api/weather", async (string city, IHttpClientFactory clientFactory) =>
{
    string apiKey = "0ce8922ee4dc4c3b981174603262108"; // Paste the key here
    string url = $"https://api.weatherapi.com/v1/current.json?key={apiKey}&q={city}";

    var client = clientFactory.CreateClient();

    try
    {
        var response = await client.GetAsync(url);

        if (!response.IsSuccessStatusCode)
        {
            return Results.NotFound(new { message = "City not found" });
        }

        var jsonString = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(jsonString);
        var root = doc.RootElement;

        
        var result = new
        {
            cityName = root.GetProperty("location").GetProperty("name").GetString(),
            temperature = root.GetProperty("current").GetProperty("temp_f").GetDouble(),
            condition = root.GetProperty("current").GetProperty("condition").GetProperty("text").GetString()
        };

        return Results.Ok(result);
    }
    catch (Exception)
    {
        return Results.Problem("Error fetching weather data.");
    }
});

app.Run();
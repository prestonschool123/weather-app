var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("AllowFrontend");

app.MapGet("/api/weather", (string city) =>
{
    return Results.Ok(new
    {
        CityName = city,
        Temperature = 72,
        Condition = "Sunny"
    });
});

app.Run();
console.log("app.js is connected and running!");

// Define backend host URL
const API_BASE_URL = 'https://weather-app-backend-sorh.onrender.com';

// Assign the html ids
const cityInput = document.getElementById('cityInput');
const citySuggestions = document.getElementById('citySuggestions');
const searchBtn = document.getElementById('searchBtn');
const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const feelsLike = document.getElementById('feelsLike');
const currentWind = document.getElementById('currentWind');
const condition = document.getElementById('condition');
const forecastContainer = document.getElementById('forecastContainer');
const windUnit = document.getElementById('windUnit');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const bookmarksContainer = document.getElementById('bookmarksContainer');
const searchStatus = document.getElementById('searchStatus');
const locationHelp = document.getElementById('locationHelp');
const temperatureChart = document.getElementById('temperatureChart');

// Fire Status Text element
const fireStatusText = document.getElementById('fireStatusText');

// Track the active city and loaded bookmarks
let currentCityName = '';
let savedBookmarks = JSON.parse(localStorage.getItem('weatherBookmarks')) || [];
let weatherRequestId = 0;
let loadingMessageTimer;
let latestWeatherData = null;

function getWindText(mph, kph) {
  const unit = windUnit?.value === 'kph' ? 'kph' : 'mph';
  const speed = unit === 'kph' ? kph : mph;
  return `${Number(speed).toFixed(1)} ${unit}`;
}

function renderWindAndForecast(data) {
  if (currentWind) {
    currentWind.textContent = `Wind: ${getWindText(data.windMph, data.windKph)}`;
  }

  if (!forecastContainer || !data.forecast) return;

  forecastContainer.innerHTML = '';
  data.forecast.forEach((day, dayIndex) => {
    const dayOfWeek = getForecastDayLabel(day.date);
    const roundedHigh = Number(day.maxTemp).toFixed(1);
    const roundedLow = Number(day.minTemp).toFixed(1);
    const roundedFeelsLike = Number(day.feelsLike).toFixed(1);
    const dayWindMph = dayIndex === 0 ? data.windMph : day.windMph;
    const dayWindKph = dayIndex === 0 ? data.windKph : day.windKph;

    const dayCard = document.createElement('div');
    dayCard.className = 'forecast-card';
    dayCard.innerHTML = `
      <p class="forecast-day"><strong>${dayOfWeek}</strong></p>
      <p class="forecast-date">${day.date}</p>
      <p class="forecast-temp">High: ${roundedHigh} °F</p>
      <p class="forecast-temp">Low: ${roundedLow} °F</p>
      <p class="forecast-temp">Feels like: ${roundedFeelsLike} °F</p>
      <p class="forecast-temp">Wind: ${getWindText(dayWindMph, dayWindKph)}</p>
      <p class="forecast-cond">${day.condition}</p>
    `;
    forecastContainer.appendChild(dayCard);
  });
}

function setSearchStatus(message) {
  if (!searchStatus) return;

  searchStatus.hidden = !message;
  searchStatus.innerHTML = message ? `<span class="loading-spinner" aria-hidden="true"></span>${message}` : '';
}

function getForecastDayLabel(dateString) {
  if (!dateString) return 'N/A';

  const utcDate = new Date(`${dateString}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC'
  }).format(utcDate);
}

function getDisplayedCondition(conditionText, isNight) {
  if (!isNight || !conditionText) return conditionText;

  const condition = conditionText.toLowerCase();

  if (/sunny|clear|fair|mainly clear/.test(condition)) return 'Clear Night';
  if (/partly cloudy|few clouds|scattered clouds/.test(condition)) return 'Partly Cloudy Night';
  if (/mostly clear/.test(condition)) return 'Mostly Clear Night';
  if (/broken clouds/.test(condition)) return 'Broken Clouds at Night';
  if (/mostly cloudy/.test(condition)) return 'Mostly Cloudy Night';
  if (/overcast/.test(condition)) return 'Overcast Night';
  if (/cloudy/.test(condition)) return 'Cloudy Night';

  return `${conditionText} at Night`;
}

function getIsNight(data) {
  if (typeof data.isDay === 'boolean') return !data.isDay;
  if (!data.localTime) return false;

  const localHour = Number(data.localTime.split(' ')[1]?.split(':')[0]);
  return Number.isFinite(localHour) && (localHour < 6 || localHour >= 18);
}

function formatChartHour(timeString) {
  const hour = Number(timeString?.split(' ')[1]?.split(':')[0]);
  if (!Number.isFinite(hour)) return '--';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${suffix}`;
}

function renderTemperatureChart(hourlyTemperatures) {
  if (!temperatureChart) return;

  const points = (hourlyTemperatures || []).filter(point => Number.isFinite(Number(point.temperature)));
  if (points.length < 2) {
    temperatureChart.innerHTML = '<p class="chart-empty">Hourly temperature data is unavailable.</p>';
    return;
  }

  const width = 760;
  const height = 260;
  const padding = { top: 28, right: 18, bottom: 42, left: 42 };
  const temperatures = points.map(point => Number(point.temperature));
  const minTemperature = Math.floor(Math.min(...temperatures) - 2);
  const maxTemperature = Math.ceil(Math.max(...temperatures) + 2);
  const temperatureRange = Math.max(maxTemperature - minTemperature, 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = index => padding.left + (index / (points.length - 1)) * chartWidth;
  const getY = value => padding.top + ((maxTemperature - value) / temperatureRange) * chartHeight;
  const chartPoints = points.map((point, index) => `${getX(index)},${getY(Number(point.temperature))}`);
  const linePath = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point}`).join(' ');
  const areaPath = `${linePath} L ${getX(points.length - 1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`;
  const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  temperatureChart.innerHTML = `
    <div class="chart-tooltip" id="chartTooltip" hidden></div>
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="temperatureArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f97316" stop-opacity="0.28"></stop>
          <stop offset="100%" stop-color="#f97316" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <line class="chart-grid-line" x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}"></line>
      <line class="chart-grid-line" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
      <path class="chart-area" d="${areaPath}"></path>
      <path class="chart-line" d="${linePath}"></path>
      ${labelIndexes.map(index => `<text class="chart-axis-label" x="${getX(index)}" y="${height - 14}" text-anchor="middle">${formatChartHour(points[index].time)}</text>`).join('')}
      <text class="chart-axis-label chart-temp-label" x="${padding.left - 10}" y="${padding.top + 4}" text-anchor="end">${maxTemperature}°</text>
      <text class="chart-axis-label chart-temp-label" x="${padding.left - 10}" y="${height - padding.bottom + 4}" text-anchor="end">${minTemperature}°</text>
      <rect class="chart-hit-area" x="${padding.left}" y="${padding.top}" width="${chartWidth}" height="${chartHeight}"></rect>
      <line class="chart-guide" id="chartGuide" y1="${padding.top}" y2="${height - padding.bottom}" hidden></line>
      <circle class="chart-dot" id="chartDot" r="5" hidden></circle>
    </svg>
  `;

  const hitArea = temperatureChart.querySelector('.chart-hit-area');
  const tooltip = temperatureChart.querySelector('#chartTooltip');
  const guide = temperatureChart.querySelector('#chartGuide');
  const dot = temperatureChart.querySelector('#chartDot');

  hitArea.addEventListener('pointermove', event => {
    const bounds = hitArea.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const index = Math.round(position * (points.length - 1));
    const point = points[index];
    const x = getX(index);
    const y = getY(Number(point.temperature));
    const svg = temperatureChart.querySelector('svg');
    const viewBoxPoint = svg.createSVGPoint();
    viewBoxPoint.x = x;
    viewBoxPoint.y = y;
    const screenPoint = viewBoxPoint.matrixTransform(svg.getScreenCTM());
    const chartBounds = temperatureChart.getBoundingClientRect();

    tooltip.textContent = `${formatChartHour(point.time)}  ${Number(point.temperature).toFixed(1)}°F`;
    tooltip.hidden = false;
    tooltip.style.left = `${screenPoint.x - chartBounds.left}px`;
    tooltip.style.top = `${screenPoint.y - chartBounds.top - 12}px`;
    guide.setAttribute('x1', x);
    guide.setAttribute('x2', x);
    guide.hidden = false;
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.hidden = false;
  });

  hitArea.addEventListener('pointerleave', () => {
    tooltip.hidden = true;
    guide.hidden = true;
    dot.hidden = true;
  });
}

// Render any existing saved bookmarks on page load
renderBookmarks();

// Helper function to fetch and display weather for any city name or coordinates
async function fetchWeatherForCity(city, isAutomaticLocation = false) {
  const requestId = ++weatherRequestId;
  if (locationHelp) {
    locationHelp.hidden = !isAutomaticLocation;
  }
  setSearchStatus('Waking up the weather service...');
  clearTimeout(loadingMessageTimer);
  loadingMessageTimer = setTimeout(() => {
    if (requestId === weatherRequestId) {
      setSearchStatus('The weather service is taking a little longer to start. Still waiting...');
    }
  }, 4000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/weather?city=${encodeURIComponent(city)}`);
    
    if (!response.ok) {
      throw new Error('City not found or server error');
    }

    const data = await response.json();
    latestWeatherData = data;

    // Track city name for bookmarking
    currentCityName = data.cityName;
    const isNight = getIsNight(data);
    const displayedCondition = getDisplayedCondition(data.condition, isNight);

    // 1. Update current weather details
    cityName.textContent = data.cityName;
    const todayForecast = data.forecast?.[0];
    const todayHigh = todayForecast ? Number(todayForecast.maxTemp).toFixed(1) : '--';
    const todayLow = todayForecast ? Number(todayForecast.minTemp).toFixed(1) : '--';
    temperature.textContent = `${data.temperature} °F | High: ${todayHigh} °F | Low: ${todayLow} °F`;
    feelsLike.textContent = `Feels like: ${data.feelsLike} °F`;
    renderTemperatureChart(data.hourlyTemperatures);
    renderWindAndForecast(data);
    condition.textContent = displayedCondition;

    // 2. Handle Fire Status Text
    if (fireStatusText && data.fireDanger) {
      fireStatusText.style.display = 'block';

      if (data.fireDanger.hasWarning) {
        fireStatusText.className = 'fire-status-text danger';
        fireStatusText.textContent = 'There is fire near here';
      } else {
        fireStatusText.className = 'fire-status-text safe';
        fireStatusText.textContent = 'No fire near here';
      }
    }

  } catch (error) {
    console.error('Fetch error:', error);
    if (requestId === weatherRequestId) {
      setSearchStatus('Unable to reach the weather service. Please try again.');
    }
    alert('Could not get weather data. Check if backend is running!');
  } finally {
    if (requestId === weatherRequestId) {
      clearTimeout(loadingMessageTimer);
      if (locationHelp) {
        locationHelp.hidden = true;
      }
      if (!searchStatus?.textContent.startsWith('Unable')) {
        setSearchStatus('');
      }
    }
  }
}

if (windUnit) {
  windUnit.addEventListener('change', () => {
    if (latestWeatherData) renderWindAndForecast(latestWeatherData);
  });
}

// Search input handler
async function handleSearch() {
  const city = cityInput.value.trim();

  if (!city) {
    alert('Please enter a city name.');
    return;
  }

  await fetchWeatherForCity(city);

  // Clear input box and suggestion list
  cityInput.value = '';
  if (citySuggestions) {
    citySuggestions.innerHTML = '';
  }
}

// Render bookmark buttons into the container
function renderBookmarks() {
  if (!bookmarksContainer) return;
  
  bookmarksContainer.innerHTML = '';
  
  savedBookmarks.forEach(city => {
    const btn = document.createElement('button');
    btn.className = 'bookmark-chip';
    btn.textContent = city;
    
    // Search city when bookmark chip is clicked
    btn.addEventListener('click', () => {
      fetchWeatherForCity(city);
    });

    bookmarksContainer.appendChild(btn);
  });
}

// Save current city to bookmarks
if (bookmarkBtn) {
  bookmarkBtn.addEventListener('click', () => {
    if (!currentCityName) {
      alert('Search for a city first before bookmarking!');
      return;
    }

    if (!savedBookmarks.includes(currentCityName)) {
      savedBookmarks.push(currentCityName);
      localStorage.setItem('weatherBookmarks', JSON.stringify(savedBookmarks));
      renderBookmarks();
    }
  });
}

// Fetch live suggestions as the user types
if (cityInput && citySuggestions) {
  let validMatches = [];

  // Handle typing and fetching suggestions
  cityInput.addEventListener('input', async () => {
    const query = cityInput.value.trim();
    if (query.length < 2) {
      citySuggestions.innerHTML = '';
      validMatches = [];
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/weather/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) return;

      const matches = await response.json();
      validMatches = matches.map(item => `${item.name}, ${item.region}`);
      citySuggestions.innerHTML = '';

      validMatches.forEach(cityString => {
        const option = document.createElement('option');
        option.value = cityString;
        citySuggestions.appendChild(option);
      });
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  });

  // Handle selection using the 'change' event (standard for datalists)
  cityInput.addEventListener('change', () => {
    const currentValue = cityInput.value;
    if (validMatches.includes(currentValue)) {
      citySuggestions.innerHTML = '';
      validMatches = []; // Clear so it doesn't re-trigger
      handleSearch();
    }
  });
}

// Event listeners for searching
if (searchBtn) searchBtn.addEventListener('click', handleSearch);
if (cityInput) {
  cityInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  });
}

// Automatically load weather based on user location when the page loads
window.addEventListener('DOMContentLoaded', () => {
  if (navigator.geolocation) {
    setSearchStatus('Waking up the weather service...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherForCity(`${lat},${lon}`, true);
      },
      (error) => {
        console.log("Geolocation permission denied or unavailable:", error.message);
        if (locationHelp) {
          locationHelp.hidden = true;
        }
        setSearchStatus('');
      }
    );
  }
});
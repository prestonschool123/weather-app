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
const condition = document.getElementById('condition');
const forecastContainer = document.getElementById('forecastContainer');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const bookmarksContainer = document.getElementById('bookmarksContainer');
const searchStatus = document.getElementById('searchStatus');

// Fire Status Text element
const fireStatusText = document.getElementById('fireStatusText');

// Track the active city and loaded bookmarks
let currentCityName = '';
let savedBookmarks = JSON.parse(localStorage.getItem('weatherBookmarks')) || [];
let weatherRequestId = 0;
let loadingMessageTimer;

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

// Render any existing saved bookmarks on page load
renderBookmarks();

// Helper function to fetch and display weather for any city name or coordinates
async function fetchWeatherForCity(city) {
  const requestId = ++weatherRequestId;
  setSearchStatus('Waking up the weather service...');
  clearTimeout(loadingMessageTimer);
  loadingMessageTimer = setTimeout(() => {
    if (requestId === weatherRequestId) {
      setSearchStatus('The weather service is taking a little longer to start. Still waiting...');
    }
  }, 4000);

  try {
    // CHANGED: Replaced localhost URL with API_BASE_URL
    const response = await fetch(`${API_BASE_URL}/api/weather?city=${encodeURIComponent(city)}`);
    
    if (!response.ok) {
      throw new Error('City not found or server error');
    }

    const data = await response.json();

    // Track city name for bookmarking
    currentCityName = data.cityName;

    // 1. Update current weather details
    cityName.textContent = data.cityName;
    temperature.textContent = `${data.temperature} °F`;
    feelsLike.textContent = `Feels like: ${data.feelsLike} °F`;
    condition.textContent = data.condition;

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

    // 3. Clear existing forecast cards and render new ones
    if (forecastContainer && data.forecast) {
      forecastContainer.innerHTML = '';
      
      data.forecast.forEach(day => {
        const dayOfWeek = getForecastDayLabel(day.date);
        const roundedHigh = Number(day.maxTemp).toFixed(1);
        const roundedLow = Number(day.minTemp).toFixed(1);
        const roundedFeelsLike = Number(day.feelsLike).toFixed(1);

        const dayCard = document.createElement('div');
        dayCard.className = 'forecast-card';
        dayCard.innerHTML = `
          <p class="forecast-day"><strong>${dayOfWeek}</strong></p>
          <p class="forecast-date">${day.date}</p>
          <p class="forecast-temp">High: ${roundedHigh} °F</p>
          <p class="forecast-temp">Low: ${roundedLow} °F</p>
          <p class="forecast-temp">Feels like: ${roundedFeelsLike} °F</p>
          <p class="forecast-cond">${day.condition}</p>
        `;
        forecastContainer.appendChild(dayCard);
      });
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
      if (!searchStatus?.textContent.startsWith('Unable')) {
        setSearchStatus('');
      }
    }
  }
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
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherForCity(`${lat},${lon}`);
      },
      (error) => {
        console.log("Geolocation permission denied or unavailable:", error.message);
      }
    );
  }
});
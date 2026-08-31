console.log("app.js is connected and running!");

// Define backend host URL
const API_BASE_URL = 'https://weather-app-backend-sorh.onrender.com';

// Assign the html ids
const cityInput = document.getElementById('cityInput');
const citySuggestions = document.getElementById('citySuggestions');
const searchBtn = document.getElementById('searchBtn');
const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const condition = document.getElementById('condition');
const forecastContainer = document.getElementById('forecastContainer');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const bookmarksContainer = document.getElementById('bookmarksContainer');

// Fire Status Text element
const fireStatusText = document.getElementById('fireStatusText');

// Track the active city and loaded bookmarks
let currentCityName = '';
let savedBookmarks = JSON.parse(localStorage.getItem('weatherBookmarks')) || [];

// Render any existing saved bookmarks on page load
renderBookmarks();

// Helper function to fetch and display weather for any city name or coordinates
async function fetchWeatherForCity(city) {
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
        const dateObj = new Date(`${day.date}T00:00:00`); 
        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

        const dayCard = document.createElement('div');
        dayCard.className = 'forecast-card';
        dayCard.innerHTML = `
          <p class="forecast-day"><strong>${dayOfWeek}</strong></p>
          <p class="forecast-date">${day.date}</p>
          <p class="forecast-temp">High: ${day.maxTemp} °F</p>
          <p class="forecast-temp">Low: ${day.minTemp} °F</p>
          <p class="forecast-cond">${day.condition}</p>
        `;
        forecastContainer.appendChild(dayCard);
      });
    }

  } catch (error) {
    console.error('Fetch error:', error);
    alert('Could not get weather data. Check if backend is running!');
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
      const response = await fetch(`http://localhost:5203/api/weather/search?query=${encodeURIComponent(query)}`);
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
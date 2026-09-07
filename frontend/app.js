console.log("app.js is connected and running!");

// Define backend host URL
const API_BASE_URL = 'https://weather-app-backend-sorh.onrender.com';

// Assign the html ids
const cityInput = document.getElementById('cityInput');
const citySuggestions = document.getElementById('citySuggestions');
const searchBtn = document.getElementById('searchBtn');
const cityName = document.getElementById('cityName');
const weatherImage = document.getElementById('weatherImage');
const temperature = document.getElementById('temperature');
const feelsLike = document.getElementById('feelsLike');
const condition = document.getElementById('condition');
const forecastContainer = document.getElementById('forecastContainer');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const bookmarksContainer = document.getElementById('bookmarksContainer');
const searchStatus = document.getElementById('searchStatus');
const locationHelp = document.getElementById('locationHelp');

// Fire Status Text element
const fireStatusText = document.getElementById('fireStatusText');

// Track the active city and loaded bookmarks
let currentCityName = '';
let savedBookmarks = JSON.parse(localStorage.getItem('weatherBookmarks')) || [];
let weatherRequestId = 0;
let weatherImageRequestId = 0;
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

const weatherImageSearchTerms = {
  sunny: 'scenic landscape photography bright open green field sunlight vivid blue sky',
  clear: 'scenic landscape photography still mountain lake midday reflecting clear blue sky',
  fair: 'scenic landscape photography rolling green hills bright blue sky sunlight',
  mainlyClear: 'scenic landscape photography wide ocean horizon bright sky distant clouds',
  partlyCloudy: 'scenic landscape photography fluffy cumulus clouds blue sky valley',
  fewClouds: 'scenic landscape photography expansive desert horizon wispy white clouds',
  scatteredClouds: 'scenic landscape photography dramatic coastline blue sky clouds water',
  mostlyClear: 'scenic landscape photography sunny prairie thin high clouds',
  cloudy: 'scenic landscape photography quiet alpine lake textured gray clouds',
  overcast: 'scenic landscape photography moody gray sky quiet pine forest',
  brokenClouds: 'scenic landscape photography dark clouds shafts sunlight distant mountains',
  mostlyCloudy: 'scenic landscape photography woodland dark clouds filling sky',
  rain: 'scenic landscape photography raindrops rippling woodland lake wet evergreen trees',
  lightRain: 'scenic landscape photography gentle rain lush green rainforest canopy',
  heavyRain: 'scenic landscape photography stormy mountain valley gray downpour',
  drizzle: 'scenic landscape photography wet meadow light mist water droplets grass',
  showers: 'scenic landscape photography rain curtain in distance wide plains landscape',
  freezingRain: 'scenic landscape photography ice coated tree branches wet winter forest',
  thunderstorm: 'scenic landscape photography storm clouds open canyon distant flashes',
  heavyThunderstorm: 'scenic landscape photography black storm clouds turbulent ocean coast',
  thundershower: 'scenic landscape photography heavy rain clouds mountain pass glowing edge',
  lightning: 'scenic landscape photography fork lightning remote empty desert ridge',
  snow: 'scenic landscape photography pristine snow covered pine forest untouched drifts',
  lightSnow: 'scenic landscape photography soft snowfall quiet frosted birch forest',
  heavySnow: 'scenic landscape photography whiteout snowstorm rugged mountain range',
  flurries: 'scenic landscape photography snow flurries rocky forest floor',
  sleet: 'scenic landscape photography icy gray winter landscape slushy pine branches',
  hail: 'scenic landscape photography ice stones wet grassy meadow',
  blizzard: 'scenic landscape photography snow blowing frozen tundra frosty sky',
  fog: 'scenic landscape photography dense fog tall redwood forest',
  mist: 'scenic landscape photography morning mist tranquil lake',
  haze: 'scenic landscape photography golden sun hazy distant mountain horizon',
  smoke: 'scenic landscape photography muted sunset atmospheric haze canyon',
  dust: 'scenic landscape photography wall of dust desert sand dunes',
  windy: 'scenic landscape photography golden prairie grasses dynamic sky',
  tornado: 'scenic landscape photography funnel cloud empty plains distance',
  hurricane: 'scenic landscape photography crashing ocean waves rocky shore storm clouds'
};

const weatherImageFallbackTerms = {
  sunny: 'sunny landscape photography',
  clear: 'clear sky mountain lake photography',
  fair: 'sunny green hills landscape photography',
  mainlyClear: 'ocean horizon landscape photography',
  partlyCloudy: 'cloudy blue sky valley photography',
  fewClouds: 'desert sky landscape photography',
  scatteredClouds: 'coastline clouds landscape photography',
  mostlyClear: 'sunny prairie landscape photography',
  cloudy: 'gray clouds alpine lake photography',
  overcast: 'overcast pine forest photography',
  brokenClouds: 'sun rays mountains clouds photography',
  mostlyCloudy: 'dark clouds woodland photography',
  rain: 'rainy landscape photography',
  lightRain: 'rainforest rain photography',
  heavyRain: 'heavy rain mountain photography',
  drizzle: 'misty meadow photography',
  showers: 'rain shower landscape photography',
  freezingRain: 'icy winter forest photography',
  thunderstorm: 'thunderstorm landscape photography',
  heavyThunderstorm: 'stormy ocean photography',
  thundershower: 'rainy mountain storm photography',
  lightning: 'lightning desert photography',
  snow: 'snowy pine forest photography',
  lightSnow: 'snowy birch forest photography',
  heavySnow: 'snowstorm mountain photography',
  flurries: 'snow flurries forest photography',
  sleet: 'icy winter landscape photography',
  hail: 'hail meadow photography',
  blizzard: 'blizzard tundra photography',
  fog: 'foggy redwood forest photography',
  mist: 'misty lake photography',
  haze: 'hazy mountain sunset photography',
  smoke: 'hazy canyon sunset photography',
  dust: 'dust storm desert photography',
  windy: 'windy prairie photography',
  tornado: 'tornado plains photography',
  hurricane: 'stormy ocean waves photography'
};

function getWeatherImageCategory(conditionText) {
  const condition = conditionText.toLowerCase();

  if (/tornado/.test(condition)) return 'tornado';
  if (/hurricane|tropical storm/.test(condition)) return 'hurricane';
  if (/windy|breezy/.test(condition)) return 'windy';
  if (/heavy thunderstorm/.test(condition)) return 'heavyThunderstorm';
  if (/thundershower/.test(condition)) return 'thundershower';
  if (/lightning/.test(condition)) return 'lightning';
  if (/thunderstorm|storm/.test(condition)) return 'thunderstorm';
  if (/blizzard/.test(condition)) return 'blizzard';
  if (/heavy snow/.test(condition)) return 'heavySnow';
  if (/light snow/.test(condition)) return 'lightSnow';
  if (/flurr/.test(condition)) return 'flurries';
  if (/sleet/.test(condition)) return 'sleet';
  if (/hail/.test(condition)) return 'hail';
  if (/snow/.test(condition)) return 'snow';
  if (/freezing rain/.test(condition)) return 'freezingRain';
  if (/heavy rain/.test(condition)) return 'heavyRain';
  if (/light rain/.test(condition)) return 'lightRain';
  if (/drizzle/.test(condition)) return 'drizzle';
  if (/shower/.test(condition)) return 'showers';
  if (/rain/.test(condition)) return 'rain';
  if (/fog/.test(condition)) return 'fog';
  if (/mist/.test(condition)) return 'mist';
  if (/haze/.test(condition)) return 'haze';
  if (/smoke/.test(condition)) return 'smoke';
  if (/dust|sandstorm/.test(condition)) return 'dust';
  if (/partly cloudy/.test(condition)) return 'partlyCloudy';
  if (/few clouds/.test(condition)) return 'fewClouds';
  if (/scattered clouds/.test(condition)) return 'scatteredClouds';
  if (/mostly clear/.test(condition)) return 'mostlyClear';
  if (/broken clouds/.test(condition)) return 'brokenClouds';
  if (/mostly cloudy/.test(condition)) return 'mostlyCloudy';
  if (/overcast/.test(condition)) return 'overcast';
  if (/cloudy/.test(condition)) return 'cloudy';
  if (/fair/.test(condition)) return 'fair';
  if (/mainly clear/.test(condition)) return 'mainlyClear';
  if (/clear/.test(condition)) return 'clear';
  return 'sunny';
}

function getDisplayedCondition(conditionText, isNight) {
  if (!isNight || !conditionText) return conditionText;

  const category = getWeatherImageCategory(conditionText);
  const nightLabels = {
    sunny: 'Clear Night',
    clear: 'Clear Night',
    fair: 'Clear Night',
    mainlyClear: 'Clear Night',
    partlyCloudy: 'Partly Cloudy Night',
    fewClouds: 'Partly Cloudy Night',
    scatteredClouds: 'Partly Cloudy Night',
    mostlyClear: 'Mostly Clear Night',
    cloudy: 'Cloudy Night',
    overcast: 'Overcast Night',
    brokenClouds: 'Broken Clouds at Night',
    mostlyCloudy: 'Mostly Cloudy Night'
  };

  return nightLabels[category] || `${conditionText} at Night`;
}

function getIsNight(data) {
  if (typeof data.isDay === 'boolean') return !data.isDay;
  if (!data.localTime) return false;

  const localHour = Number(data.localTime.split(' ')[1]?.split(':')[0]);
  return Number.isFinite(localHour) && (localHour < 6 || localHour >= 18);
}

async function updateWeatherImage(conditionText, isNight, requestId) {
  if (!weatherImage) return;

  const imageRequestId = ++weatherImageRequestId;
  weatherImage.hidden = true;
  weatherImage.removeAttribute('src');

  try {
    const category = getWeatherImageCategory(conditionText || '');
    const excludedWords = /\b(people|person|portrait|crowd|protest|selfie|illustration|drawing|painting|cartoon|vector|icon|diagram|artwork)\b/i;
    const searchQueries = isNight
      ? ['nighttime landscape photography scenic', 'night sky landscape photography']
      : [weatherImageSearchTerms[category], weatherImageFallbackTerms[category]];
    let imagePage;

    for (const query of searchQueries) {
      const searchTerms = `${query} -people -person -portrait -crowd -illustration -drawing -painting -cartoon -vector -icon -diagram`;
      const response = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=${encodeURIComponent(searchTerms)}&prop=imageinfo&iiprop=url&iiurlwidth=480&format=json&origin=*`
      );

      if (!response.ok) continue;

      const data = await response.json();
      const pages = Object.values(data.query?.pages || {});
      imagePage = pages.find(page => page.title && !excludedWords.test(page.title) && page.imageinfo?.[0]?.thumburl);
      if (imagePage) break;
    }

    if (requestId !== weatherRequestId || imageRequestId !== weatherImageRequestId || !imagePage) return;

    weatherImage.onerror = () => {
      weatherImage.hidden = true;
      weatherImage.removeAttribute('src');
    };
    weatherImage.src = imagePage.imageinfo[0].thumburl;
    weatherImage.alt = `${getDisplayedCondition(conditionText, isNight)} weather`;
    weatherImage.hidden = false;
  } catch (error) {
    console.error('Error fetching weather image:', error);
  }
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

    // Track city name for bookmarking
    currentCityName = data.cityName;
    const isNight = getIsNight(data);
    const displayedCondition = getDisplayedCondition(data.condition, isNight);
    updateWeatherImage(data.condition, isNight, requestId);

    // 1. Update current weather details
    cityName.textContent = data.cityName;
    const todayForecast = data.forecast?.[0];
    const todayHigh = todayForecast ? Number(todayForecast.maxTemp).toFixed(1) : '--';
    const todayLow = todayForecast ? Number(todayForecast.minTemp).toFixed(1) : '--';
    temperature.textContent = `${data.temperature} °F | High: ${todayHigh} °F | Low: ${todayLow} °F`;
    feelsLike.textContent = `Feels like: ${data.feelsLike} °F`;
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
      if (locationHelp) {
        locationHelp.hidden = true;
      }
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
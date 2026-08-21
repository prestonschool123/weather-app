console.log("app.js is connected and running!");

// Assign the html ids
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const condition = document.getElementById('condition');

async function handleSearch() {
  const city = cityInput.value.trim();

  if (!city) {
    alert('Please enter a city name.');
    return;
  }

  try {
    // 1. Fetch data from your friend's C# server URL
    // Note: Make sure the port (e.g. 5000) matches what printed in his terminal!
    const response = await fetch(`http://localhost:5203/api/weather?city=${city}`);
    
    if (!response.ok) {
      throw new Error('City not found or server error');
    }

    const data = await response.json();

    // 2. Update the HTML elements with the real data returned from C#
    cityName.textContent = data.cityName;
    temperature.textContent = `${data.temperature} °F`;
    condition.textContent = data.condition;

  } catch (error) {
    console.error('Fetch error:', error);
    alert('Could not get weather data. Check if backend is running!');
  }

  // Clear input box
  cityInput.value = '';
}
//Search for input for city
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSearch();
    }
})

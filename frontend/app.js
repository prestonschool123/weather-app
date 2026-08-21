console.log("app.js is connected and running!");

// Assign the html ids
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const condition = document.getElementById('condition');

function handleSearch() {
    const city = cityInput.value.trim();

    if (!city) {
        alert('Please enter a city name.');
        return;
    }

    // temporary
    cityName.textContent = city;
    temperature.textContent = '72 °F';
    condition.textContent = 'Sunny';

    cityInput.value = '';
}
//Search for input for city
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSearch();
    }
})

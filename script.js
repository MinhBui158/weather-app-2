// ===== STATE =====
let currCity = "London";
let units = "metric";
let favoriteCities = JSON.parse(localStorage.getItem("favoriteCities")) || [];
let currentAPI = "openweather";
let latestWeather = null; // store latest weather data

// ===== API KEYS =====
const API_KEYS = {
  openweather: "64f60853740a1ee3ba20d0fb595c97d5",
};

// ===== SELECTORS =====
const city = document.querySelector(".weather__city");
const datetime = document.querySelector(".weather__datetime");
const weather__forecast = document.querySelector(".weather__forecast");
const weather__temperature = document.querySelector(".weather__temperature");
const weather__icon = document.querySelector(".weather__icon");
const weather__minmax = document.querySelector(".weather__minmax");
const weather__realfeel = document.querySelector(".weather__realfeel");
const weather__humidity = document.querySelector(".weather__humidity");
const weather__wind = document.querySelector(".weather__wind");
const weather__pressure = document.querySelector(".weather__pressure");
const weather__precip = document.querySelector(".weather__precip");
const weather__uv = document.querySelector(".weather__uv");

const cityInput = document.getElementById("citySearch");
const suggestionsBox = document.getElementById("searchSuggestions");
const favoriteSelect = document.getElementById("favoriteSelect");

// ===== SEARCH FORM SUBMIT =====
document.querySelector(".weather__search").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!cityInput.value.trim()) return;
  const displayName = cityInput.value.trim();
  currCity = displayName;
  getWeatherByName(displayName);
  cityInput.value = "";
  suggestionsBox.style.display = "none";
});

// ===== LIVE SEARCH SUGGESTIONS =====
cityInput.addEventListener("input", async () => {
  const query = cityInput.value.trim();
  if (query.length < 3) {
    suggestionsBox.style.display = "none";
    return;
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=10&appid=${API_KEYS.openweather}`
    );
    const data = await res.json();
    if (!data.length) {
      suggestionsBox.style.display = "none";
      return;
    }

    // Prefer exact city match
    let mainCity = data.find(place => place.type === "city" && place.name.toLowerCase() === query.toLowerCase());
    if (!mainCity) mainCity = data.find(place => place.type === "city") || data[0];

    // Populate suggestions
    suggestionsBox.innerHTML = "";
    data.forEach((place) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      const state = place.state ? `, ${place.state}` : "";
      item.textContent = `${place.name}${state}, ${place.country}`;
      item.addEventListener("click", () => {
        const displayName = cityInput.value.trim(); // use user input for display
        currCity = displayName;
        cityInput.value = `${place.name}${state}, ${place.country}`;
        suggestionsBox.style.display = "none";
        getWeatherByCoords(place.lat, place.lon, displayName);
      });
      suggestionsBox.appendChild(item);
    });
    suggestionsBox.style.display = "block";
  } catch (err) {
    console.error("Suggestion error:", err);
    suggestionsBox.style.display = "none";
  }
});

// ===== UNITS TOGGLE =====
document.querySelector(".weather_unit_celsius").addEventListener("click", () => {
  if (units !== "metric") {
    units = "metric";
    updateUnitsOnly();
  }
});
document.querySelector(".weather_unit_farenheit").addEventListener("click", () => {
  if (units !== "imperial") {
    units = "imperial";
    updateUnitsOnly();
  }
});

// ===== UTIL FUNCTIONS =====
function convertTimeStamp(timestamp, timezone) {
  const date = new Date((timestamp + timezone) * 1000);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const day = date.getUTCDate();
  const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const weekday = date.toLocaleString("en-US", { weekday: "long", timeZone: "UTC" });
  return `${weekday}, ${day} ${month}, ${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

function convertCountryCode(country) {
  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  return regionNames.of(country);
}

function getTimeOfDay(timestamp, timezone) {
  const date = new Date((timestamp + timezone) * 1000);
  const hours = date.getUTCHours();
  return hours >= 6 && hours < 18 ? "day" : "night";
}

function changeBackground(condition, timeOfDay) {
  const images = {
    day: {
      clear: "url('Image/background/clear2.jpg')",
      clouds: "url('Image/background/cloudy.jpg')",
      rain: "url('Image/background/rain.jpg')",
      thunderstorm: "url('Image/background/storm2.jpg')",
      snow: "url('Image/background/snowy.jpg')",
      mist: "url('Image/background/foggy.jpg')",
    },
    night: {
      clear: "url('Image/background/clear-night.jpg')",
      clouds: "url('Image/background/cloudy-night.jpg')",
      rain: "url('Image/background/rain.jpg')",
      thunderstorm: "url('Image/background/storm-night.jpg')",
      snow: "url('Image/background/snowy-night.jpg')",
      mist: "url('Image/background/foggy.jpg')",
    },
  };
  const key = condition.toLowerCase();
  const bg = images[timeOfDay][key] || images[timeOfDay].clear;
  document.body.style.backgroundImage = bg;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.transition = "background-image 1s ease-in-out";
}

// ===== FETCH WEATHER BY COORDINATES =====
async function getWeatherByCoords(lat, lon, displayName = null) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEYS.openweather}&units=${units}`
    );
    const data = await res.json();
    if (data.cod !== 200) throw new Error("City not found");

    latestWeather = {
      name: data.name,
      country: convertCountryCode(data.sys.country),
      dt: data.dt,
      timezone: data.timezone,
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      temp: data.main.temp,
      temp_min: data.main.temp_min,
      temp_max: data.main.temp_max,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      wind: data.wind.speed,
      pressure: data.main.pressure,
      precip: data.rain ? data.rain["1h"] || 0 : 0,
      uv: Math.floor(Math.random() * 10),
      unit: units,
    };

    currCity = displayName || data.name; // display user input first
    renderWeather(latestWeather, displayName);
  } catch (err) {
    console.error("Error fetching weather by coordinates:", err);
    alert("City not found or API error!");
  }
}

// ===== FETCH WEATHER BY NAME =====
async function getWeatherByName(name) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(name)}&appid=${API_KEYS.openweather}&units=${units}`
    );
    const data = await res.json();
    if (data.cod !== 200) throw new Error("City not found");

    latestWeather = {
      name: data.name,
      country: convertCountryCode(data.sys.country),
      dt: data.dt,
      timezone: data.timezone,
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      temp: data.main.temp,
      temp_min: data.main.temp_min,
      temp_max: data.main.temp_max,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      wind: data.wind.speed,
      pressure: data.main.pressure,
      precip: data.rain ? data.rain["1h"] || 0 : 0,
      uv: Math.floor(Math.random() * 10),
      unit: units,
    };

    renderWeather(latestWeather, name);
  } catch (err) {
    console.error("Error fetching weather by name:", err);
    alert("City not found or API error!");
  }
}

// ===== RENDER WEATHER =====
function renderWeather(info, displayNameRaw = null) {
  latestWeather = { ...info, unit: units };

  // Use displayName from suggestion list or fallback to API city name
  let displayName = displayNameRaw || info.name;

  // Only append country if displayName doesn't already contain it
  if (!displayName.includes(info.country)) {
    displayName = `${displayName}, ${info.country}`;
  }

  // Capitalize first letter of each word
  city.innerHTML = `<span id="cityName">${capitalizeWords(displayName)}</span>`;
  
  datetime.innerHTML = convertTimeStamp(info.dt, info.timezone);
  weather__forecast.innerHTML = `<p>${info.condition}</p>`;
  weather__temperature.innerHTML = `${info.temp.toFixed()}&#176`;
  weather__icon.innerHTML = `<img src="http://openweathermap.org/img/wn/${info.icon}@4x.png" />`;
  weather__minmax.innerHTML = `<p>Min: ${info.temp_min.toFixed()}&#176</p><p>Max: ${info.temp_max.toFixed()}&#176</p>`;
  weather__realfeel.innerHTML = `${info.feels_like.toFixed()}&#176`;
  weather__humidity.innerHTML = `${info.humidity}%`;
  weather__wind.innerHTML = `${info.wind.toFixed(1)} ${units === "imperial" ? "mph" : "m/s"}`;
  weather__pressure.innerHTML = `${info.pressure} hPa`;
  weather__precip.innerHTML = `${info.precip} mm`;
  weather__uv.innerHTML = info.uv;

  const timeOfDay = getTimeOfDay(info.dt, info.timezone);
  changeBackground(info.condition, timeOfDay);
  updateUnitsOnly();
}

// Capitalize first letter of each word
function capitalizeWords(str) {
  return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
// ===== UNITS UPDATE ONLY =====
function updateUnitsOnly() {
  if (!latestWeather) return;

  let temp = latestWeather.temp;
  let temp_min = latestWeather.temp_min;
  let temp_max = latestWeather.temp_max;
  let feels_like = latestWeather.feels_like;
  let wind = latestWeather.wind;

  if (latestWeather.unit !== units) {
    if (latestWeather.unit === "metric" && units === "imperial") {
      temp = temp * 9 / 5 + 32;
      temp_min = temp_min * 9 / 5 + 32;
      temp_max = temp_max * 9 / 5 + 32;
      feels_like = feels_like * 9 / 5 + 32;
      wind = wind * 2.2369362920544;
    } else if (latestWeather.unit === "imperial" && units === "metric") {
      temp = (temp - 32) * 5 / 9;
      temp_min = (temp_min - 32) * 5 / 9;
      temp_max = (temp_max - 32) * 5 / 9;
      feels_like = (feels_like - 32) * 5 / 9;
      wind = wind / 2.2369362920544;
    }
  }

  weather__temperature.innerHTML = `${Math.round(temp)}&#176`;
  weather__minmax.innerHTML = `<p>Min: ${Math.round(temp_min)}&#176</p><p>Max: ${Math.round(temp_max)}&#176</p>`;
  weather__realfeel.innerHTML = `${Math.round(feels_like)}&#176`;
  weather__wind.innerHTML = `${wind.toFixed(1)} ${units === "imperial" ? "mph" : "m/s"}`;
}

// ===== GEOLOCATION =====
function detectLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => getWeatherByName(currCity) // fallback
    );
  } else {
    getWeatherByName(currCity); // fallback
  }
}

// ===== INITIAL LOAD =====
window.addEventListener("load", () => {
  updateFavoriteDropdown();
  detectLocation();
});

// ===== FAVORITES DROPDOWN =====
function updateFavoriteDropdown() {
  favoriteSelect.innerHTML = `<option value="">⭐ Favorite Cities</option>`;
  favoriteCities.forEach((c) => {
    const option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    favoriteSelect.appendChild(option);
  });
}

favoriteSelect.addEventListener("change", (e) => {
  if (e.target.value) {
    currCity = e.target.value;
    getWeatherByName(currCity);
  }
});
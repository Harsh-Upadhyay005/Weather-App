
const apiKey = "4ade23ed50008f3fbf05af667cf54c52";
const apiUrl =
  "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";
const forecastUrl =
  "https://api.openweathermap.org/data/2.5/forecast?units=metric&q=";

const searchBox = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");

const cityEl = document.getElementById("city");
const countryEl = document.getElementById("country");
const tempEl = document.getElementById("temp");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const localTimeEl = document.getElementById("localTime");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");

// AQI elements
const aqiValueEl = document.getElementById("aqiValue");
const aqiDescEl = document.getElementById("aqiDesc");
const pm25El = document.getElementById("pm25");
const aqiBarEl = document.getElementById("aqiBar");
const aqiBlock = document.getElementById("aqiBlock");

// Forecast container
const forecastContainer = document.getElementById("forecast");
const forecastScroll = document.getElementById("forecastScroll");

//  simple timezone formatter (old, less robust) 
//  robust timezone formatter (use this, replace any old formatTime) 
function formatTimeWithOffset(unixSeconds, tzOffsetSeconds = 0) {
  // unixSeconds and tzOffsetSeconds are in seconds
  // Compute milliseconds for the target local instant
  const ms = (Number(unixSeconds) + Number(tzOffsetSeconds || 0)) * 1000;
  const d = new Date(ms);

  // Use UTC getters because we already baked the tz offset into ms
  let h = d.getUTCHours();
  let m = d.getUTCMinutes();

  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  m = m < 10 ? "0" + m : m;

  return `${h}:${m} ${ampm}`;
}

// Main weather function
async function checkWeather(city) {
  try {
    const response = await fetch(apiUrl + city + `&appid=${apiKey}`);
    if (response.status == 404) {
      document.getElementById("error").hidden = false;
      return;
    }

    const data = await response.json();
    document.getElementById("error").hidden = true;
    document.getElementById("weather").hidden = false;

    // Basic details
    cityEl.textContent = data.name;
    countryEl.textContent = `Country: ${data.sys.country}`;
    tempEl.textContent = Math.round(data.main.temp) + "°C";
    humidityEl.textContent = data.main.humidity;
    windEl.textContent = data.wind.speed + " km/h";

    // Local Time
    // timezone offset in seconds from API
    const tz = Number(data.timezone || 0);

    // 1) Local time now for the city (use nowUTC + tz)
    const nowUtcSec = Math.floor(Date.now() / 1000);
    localTimeEl.textContent =
      "Local Time: " + formatTimeWithOffset(nowUtcSec, tz);

    // 2) Sunrise & Sunset (use API sys.* values + tz)
    sunriseEl.textContent = formatTimeWithOffset(data.sys.sunrise, tz);
    sunsetEl.textContent = formatTimeWithOffset(data.sys.sunset, tz);

    // Debug logs to verify (remove later)
    console.log("TIME DEBUG:", {
      city: data.name,
      timezone_seconds: tz,
      localNow: formatTimeWithOffset(nowUtcSec, tz),
      sunrise: formatTimeWithOffset(data.sys.sunrise, tz),
      sunset: formatTimeWithOffset(data.sys.sunset, tz),
    });

    // AQI + Forecast
    getAQI(data.coord.lat, data.coord.lon);
    getForecast(city);
  } catch (err) {
    console.log(err);
    alert("Something went wrong!");
  }
}

// AQI function

async function getAQI(lat, lon) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
    );
    const data = await res.json();

    if (!data.list || !data.list[0]) {
      aqiDescEl.textContent = "Air Quality: Not Available";
      return;
    }

    const aqi = data.list[0].main.aqi; // 1 to 5
    const pm25 = data.list[0].components.pm2_5; // PM2.5 value

    // Debug check — ensure AQI is received
    console.log("AQI Value:", aqi);

    aqiValueEl.textContent = `AQI: ${aqi}`;
    pm25El.textContent = pm25.toFixed(1);

    // Status text
    const statusText = {
      1: "Good 😊",
      2: "Fair 🙂",
      3: "Moderate 😐",
      4: "Poor 😷",
      5: "Very Poor ☠️",
    };

    // FIX: Use object instead of array to avoid undefined
    aqiDescEl.textContent = `Air Quality: ${statusText[aqi] || "Unknown"}`;

    // Bar width (1to20% … 5to100%)
    aqiBarEl.style.width = (aqi / 5) * 100 + "%";

    // Remove old classes
    aqiBarEl.classList.remove(
      "aqi-good",
      "aqi-fair",
      "aqi-moderate",
      "aqi-poor",
      "aqi-very-poor"
    );

    // Add correct color
    if (aqi === 1) aqiBarEl.classList.add("aqi-good");
    else if (aqi === 2) aqiBarEl.classList.add("aqi-fair");
    else if (aqi === 3) aqiBarEl.classList.add("aqi-moderate");
    else if (aqi === 4) aqiBarEl.classList.add("aqi-poor");
    else if (aqi === 5) aqiBarEl.classList.add("aqi-very-poor");

    aqiBlock.hidden = false;
  } catch (error) {
    console.error("AQI error:", error);
    aqiDescEl.textContent = "Air Quality: Not Available";
  }
}

// Forecast (3-day)
async function getForecast(city) {
  const res = await fetch(forecastUrl + city + `&appid=${apiKey}`);
  const data = await res.json();

  const filtered = data.list.filter((x) => x.dt_txt.includes("12:00:00"));

  forecastScroll.innerHTML = "";
  filtered.slice(0, 3).forEach((day) => {
    const card = document.createElement("div");
    card.className = "forecast-card";

    card.innerHTML = `
      <img src="https://openweathermap.org/img/wn/${
        day.weather[0].icon
      }@2x.png">
      <p class="day">${day.dt_txt.split(" ")[0]}</p>
      <p class="desc">${day.weather[0].description}</p>
      <p class="t">${Math.round(day.main.temp)}°C</p>
    `;

    forecastScroll.appendChild(card);
  });

  forecastContainer.hidden = false;
}

// Search + Enter key
searchBtn.addEventListener("click", () => checkWeather(searchBox.value));
searchBox.addEventListener("keyup", (e) => {
  if (e.key === "Enter") checkWeather(searchBox.value);
});

// ---- THEME TOGGLE: robust listener + remember preference ----
(function () {
  const themeBtn = document.querySelector(".theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  if (!themeBtn || !themeIcon) return; // if HTML missing, do nothing

  // helper to apply theme and icon
  function applyTheme(dark) {
    document.body.classList.toggle("dark-mode", dark);
    // adjust icon paths to your files (change names if needed)
    if (dark) {
      themeIcon.src = "dark theme icon/moon.png";
      themeIcon.alt = "Switch to light mode";
    } else {
      themeIcon.src = "dark theme icon/sun.png";
      themeIcon.alt = "Switch to dark mode";
    }
  }

  // restore saved preference (if any)
  try {
    const saved = localStorage.getItem("weather_theme");
    if (saved === "dark") applyTheme(true);
    else if (saved === "light") applyTheme(false);
    else {
      // optional: respect system preference if no saved choice
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark);
    }
  } catch (e) {
    // ignore localStorage errors (private mode)
  }

  // ensure listener after DOM ready (if script loaded in head)
  themeBtn.addEventListener("click", () => {
    const nowDark = document.body.classList.toggle("dark-mode");
    applyTheme(nowDark); // set icon correctly
    try {
      localStorage.setItem("weather_theme", nowDark ? "dark" : "light");
    } catch (e) {}
  });
})();

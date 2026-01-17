        const cityInput = document.getElementById('cityInput');
        const searchBtn = document.getElementById('searchBtn');
        const weatherDisplay = document.getElementById('weatherDisplay');
        const infoBox = document.getElementById('infoBox');

        const weatherCodes = {
            0: { desc: 'Clear', icon: 'fa-sun' },
            1: { desc: 'Mainly Clear', icon: 'fa-cloud-sun' },
            2: { desc: 'Partly Cloudy', icon: 'fa-cloud-sun' },
            3: { desc: 'Overcast', icon: 'fa-cloud' },
            45: { desc: 'Foggy', icon: 'fa-smog' },
            51: { desc: 'Drizzle', icon: 'fa-cloud-rain' },
            61: { desc: 'Rainy', icon: 'fa-cloud-showers-heavy' },
            71: { desc: 'Snowy', icon: 'fa-snowflake' },
            95: { desc: 'Thunderstorm', icon: 'fa-bolt' }
        };

        const getWMO = (code) => weatherCodes[code] || { desc: 'Cloudy', icon: 'fa-cloud' };

        searchBtn.addEventListener('click', () => fetchAllData(cityInput.value));
        cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') fetchAllData(cityInput.value); });

        async function fetchAllData(city) {
            if (!city) return;
            searchBtn.textContent = '...';

            try {
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
                const geoData = await geoRes.json();
                if (!geoData.results) throw new Error('City not found');

                const { latitude, longitude, name, country } = geoData.results[0];
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
                const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm10,pm2_5`;

                const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);
                const wData = await wRes.json();
                const aData = await aRes.json();

                updateUI(name, country, wData, aData);
            } catch (err) {
                console.error(err);
            } finally {
                searchBtn.textContent = 'Search';
            }
        }

        function updateUI(name, country, weather, aqi) {
            infoBox.classList.add('hidden');
            weatherDisplay.classList.remove('hidden');

            const cur = weather.current;
            const wmo = getWMO(cur.weather_code);

            document.getElementById('cityName').textContent = `${name}, ${country}`;
            document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
            document.getElementById('temp').textContent = Math.round(cur.temperature_2m);
            document.getElementById('weatherDesc').textContent = wmo.desc;
            document.getElementById('weatherIconLarge').innerHTML = `<i class="fas ${wmo.icon}"></i>`;
            document.getElementById('humidity').textContent = `${cur.relative_humidity_2m}%`;
            document.getElementById('windSpeed').textContent = `${cur.wind_speed_10m} km/h`;
            document.getElementById('feelsLike').textContent = `${Math.round(cur.apparent_temperature)}°`;
            document.getElementById('pressure').textContent = `${Math.round(cur.pressure_msl)} hPa`;

            const aqiVal = aqi.current.european_aqi;
            document.getElementById('aqiValue').textContent = aqiVal;
            document.getElementById('pm25').textContent = aqi.current.pm2_5;
            document.getElementById('pm10').textContent = aqi.current.pm10;

            const badge = document.getElementById('aqiBadge');
            const status = document.getElementById('aqiStatus');

            if(aqiVal <= 20) {
                badge.textContent = 'Excellent';
                status.textContent = 'Air quality is great today.';
            } else if(aqiVal <= 40) {
                badge.textContent = 'Fair';
                status.textContent = 'Air quality is average.';
            } else {
                badge.textContent = 'Moderate';
                status.textContent = 'Caution for sensitive groups.';
            }

            const container = document.getElementById('forecastContainer');
            container.innerHTML = '';
            for(let i = 1; i <= 5; i++) {
                const dayCode = weather.daily.weather_code[i];
                const dayWmo = getWMO(dayCode);
                const dayName = new Date(weather.daily.time[i]).toLocaleDateString('en-US', { weekday: 'short' });

                const card = document.createElement('div');
                card.className = 'bg-white/5 p-4 rounded-2xl text-center border border-white/5';
                card.innerHTML = `
                    <p class="text-[10px] font-bold text-white/30 uppercase mb-3">${dayName}</p>
                    <i class="fas ${dayWmo.icon} text-lg mb-3"></i>
                    <p class="text-lg font-bold">${Math.round(weather.daily.temperature_2m_max[i])}°</p>
                    <p class="text-[9px] text-white/20 uppercase">${Math.round(weather.daily.temperature_2m_min[i])}°</p>
                `;
                container.appendChild(card);
            }
        }
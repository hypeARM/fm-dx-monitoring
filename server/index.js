const axios = require('axios');
const path = require('path');
const express = require('express');
const fs = require('fs');
const app = express();

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json')));

let ipData = null;
let frequencyData = [];
let localStorageInfo = [];
const dataFilePath = path.join(__dirname, 'frequencyData.json');

const europe_programmes = [
    "No PTY", "News", "Current Affairs", "Info",
    "Sport", "Education", "Drama", "Culture", "Science", "Varied",
    "Pop Music", "Rock Music", "Easy Listening", "Light Classical",
    "Serious Classical", "Other Music", "Weather", "Finance",
    "Children's Programmes", "Social Affairs", "Religion", "Phone-in",
    "Travel", "Leisure", "Jazz Music", "Country Music", "National Music",
    "Oldies Music", "Folk Music", "Documentary", "Alarm Test"
];

console.log(`
    \x1b[32m.  .        ,              
    \x1b[34m|\/| _ ._ *-+- _ ._.*._  _ 
    \x1b[33m|  |(_)[ )| | (_)[  |[ )(_]
    \x1b[35m                        ._|
    \x1b[0mby Noobish @ FMDX.org
`);

try {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        frequencyData = JSON.parse(data);
        console.log('[INFO] Loaded frequency data from file:', dataFilePath);
    }
} catch (error) {
    console.error('Error reading frequency data file:', error);
}

async function fetchIPData() {
    try {
        const response = await axios.get(config.webserverLink + '/api');
        const ipData = response.data;
        const pty = ipData.pty;
        const ptyString = europe_programmes[pty] || 'Unknown';
        const currentDate = new Date().toISOString();
        const roundedFreq = parseFloat(ipData.freq).toFixed(1);
        const ant = ipData.ant || 0; // Default `ant` to 0 if not provided

        // Handle the case where the antenna is 0
        if (ant === 0) {
            // Overwrite any dataset with the same frequency but without `ant`
            const existingFreqIndex = frequencyData.findIndex(item => item.freq === roundedFreq && !item.ant);

            if (existingFreqIndex !== -1) {
                frequencyData[existingFreqIndex] = { ...ipData, freq: roundedFreq, pty: ptyString, date: currentDate, ant };
            } else {
                // No matching entry, push the new data
                frequencyData.push({ ...ipData, freq: roundedFreq, pty: ptyString, date: currentDate, ant });
            }
        } else {
            // Handle case where `ant` is non-zero: Allow multiple `ant` values for the same frequency
            const existingFreqIndex = frequencyData.findIndex(item => item.freq === roundedFreq && item.ant === ant);

            if (existingFreqIndex !== -1) {
                // Update existing entry for the same `ant`
                frequencyData[existingFreqIndex] = { ...ipData, freq: roundedFreq, pty: ptyString, date: currentDate, ant };
            } else {
                // No matching entry, add a new entry for this `ant`
                frequencyData.push({ ...ipData, freq: roundedFreq, pty: ptyString, date: currentDate, ant });
            }
        }

        // Sort frequencyData by frequency
        frequencyData.sort((a, b) => parseFloat(a.freq) - parseFloat(b.freq));

    } catch (error) {
        console.error('Error fetching IP data:', error);
    }
}

setInterval(fetchIPData, 5000);
setInterval(() => {
    fs.writeFile(dataFilePath, JSON.stringify(frequencyData, null, 2), (err) => {
        if (err) {
            console.error('Error saving frequency data:', err);
        } else {
            console.log('[INFO] Data backed up successfully.');
        }
    });
}, 5 * 60 * 1000);

async function fetchLocalStorageData() {
    try {
        const response = await axios.get(config.webserverLink + '/static_data');
        localStorageInfo = response.data;
    } catch (error) {
        console.error('Error fetching local storage data:', error);
    }
}

fetchLocalStorageData();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../web')));
app.set('views', path.join(__dirname, '../web'));

const endpoints = express.Router();
endpoints.get('/', (req, res) => {
    res.render('index', { data: frequencyData, info: localStorageInfo });
});

endpoints.get('/data', (req, res) => {
    res.json(frequencyData);
});

app.use('/', endpoints);
app.listen(config.monitoringPort, () => {
    console.log(`[INFO] Server is running on http://localhost:${config.monitoringPort}`);
});

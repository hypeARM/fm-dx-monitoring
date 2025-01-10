const axios = require('axios');
const puppeteer = require('puppeteer');
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
        ipData = response.data;
        const pty = ipData.pty;
        const ptyString = europe_programmes[pty] || 'Unknown';
        
        const currentDate = new Date().toISOString();
        
        if (ipData.rds !== true && ipData.ps === "") {
            const roundedFreq = parseFloat(ipData.freq).toFixed(1);
            frequencyData.push({ freq: roundedFreq, sig: ipData.sig, pty: ptyString, date: currentDate });
            return;
        }
        
        const roundedFreq = parseFloat(ipData.freq).toFixed(1);
        const existingFreqIndex = frequencyData.findIndex(item => item.freq === roundedFreq);
        
        if (existingFreqIndex !== -1) {
            frequencyData[existingFreqIndex] = { ...ipData, freq: roundedFreq, pty: ptyString, date: currentDate };
        } else {
            frequencyData.push({ ...ipData, freq: roundedFreq, pty: ptyString, date: currentDate });
        }
        
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
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto(config.webserverLink);
    
    const localStorageData = await page.evaluate(() => {
        let data = {};
        
        for (let key in localStorage) {
            data[key] = localStorage.getItem(key);
        }
        
        const tunerNameElement = document.querySelector('#tuner-name');
        let tunerName = tunerNameElement ? tunerNameElement.textContent : null;
        
        if (tunerName) {
            tunerName = tunerName.trim();
            const outerBracketsRemoved = tunerName.replace(/^\[(.*)\]$/, '$1').trim();
            tunerName = outerBracketsRemoved;
        }
        data['tunerName'] = tunerName;
        delete data['sd0'];
        delete data['sd1'];
        delete data['sd'];
        delete data['ad'];
        
        return data;
    });
    
    //console.log('LocalStorage data:', localStorageData);
    
    await browser.close();
    return localStorageData;
}

fetchLocalStorageData().then(data => {
    localStorageInfo = data;
}).catch(error => {
    console.error('Error fetching localStorage data:', error);
});

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

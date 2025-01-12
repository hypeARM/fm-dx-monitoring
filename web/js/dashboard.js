/* Info that is supposed to be there per antenna:
PTY donut chart  - ok
most distant reception - ok
closest reception 
how many stations use stereo/mono (horizontal bar graph)
total stations with RDS - ok
country donut chart - ok
*/

var antValue;
let cachedData = null; // Variable to store the fetched data

// Fetch the data once and store it in cachedData
function fetchData() {
    return fetch('./data')
        .then(response => response.json())
        .then(data => {
            cachedData = data;
            return data;
        })
        .catch(error => console.error('Error fetching data:', error));
}

// Function to filter data based on the selected antenna
function filterDataByAntenna(activeAnt = 0) {
    if (!cachedData) return [];

    return cachedData.filter(item => {
        if (activeAnt == 0) {
            return !item.ant || item.ant == activeAnt;
        } else {
            return item.ant == activeAnt;
        }
    });
}

function preparePanelData(filteredData) {
    let stationsWithPiAndPs = filteredData.filter(station => 
        station.pi.length === 4 && station.ps !== ""
    ).length;
    $("#total-stations").text(stationsWithPiAndPs);

    // Ensure we get the valid station for the highest distance
    let highestDistance = filteredData
        .filter(station => station.txInfo.dist !== "" && !isNaN(station.txInfo.dist)) // Filter out invalid distances
        .reduce((maxStation, station) => {
            const dist = parseFloat(station.txInfo.dist); // Convert to number
            const maxDist = parseFloat(maxStation.txInfo.dist); // Convert to number
            return dist > maxDist ? station : maxStation;
        }, { txInfo: { dist: -Infinity } }); // Initialize with a very low value

    // Filter out stations with invalid or empty dist values before applying reduce
    let validStationsWithDist = filteredData.filter(station => {
        const dist = parseFloat(station.txInfo.dist);
        return !isNaN(dist) && station.txInfo.dist !== ""; // Ensure valid number
    });
    
    // Only proceed with reduce if there are valid stations
    let lowestDistance = validStationsWithDist.length > 0 ? validStationsWithDist.reduce((minStation, station) => {
        const dist = parseFloat(station.txInfo.dist); // Convert to number
        const minDist = parseFloat(minStation.txInfo.dist); // Convert to number
        return dist < minDist ? station : minStation;
    }) : null;

    if (lowestDistance) {
        $("#closest-station").text(lowestDistance.txInfo.dist + " km");
        $("#closest-station-details").html(`${lowestDistance.txInfo.city}, ${lowestDistance.txInfo.itu} - ${lowestDistance.txInfo.azi}°`);
    } else {
        $("#closest-station").text('N/A');
    }

    if (highestDistance.txInfo.dist !== -Infinity) {
        $("#distant-station").text(highestDistance.txInfo.dist + " km");
        $("#distant-station-details").html(`${highestDistance.txInfo.city}, ${highestDistance.txInfo.itu} - ${highestDistance.txInfo.azi}°`);
    } else {
        $("#distant-station").text('N/A');
    }
}



function prepareItuChart(filteredData) {
    const ctx = document.getElementById('ituDonutChart').getContext('2d');
    if (window.ituChart) {
        window.ituChart.destroy();
    }

    // Initialize a map to aggregate the itu values
    const ituMap = new Map();

    // Iterate over each item in the filteredData array
    filteredData.forEach(item => {
        const ituData = item.txInfo.itu; // Assuming each item has a txInfo object with itu data

        // Aggregate the ituData values
        if (ituData) {
            // Count occurrences of each itu country code
            if (ituMap.has(ituData)) {
                ituMap.set(ituData, ituMap.get(ituData) + 1);
            } else {
                ituMap.set(ituData, 1);
            }
        }
    });

    // Prepare chartData from the aggregated map
    const chartData = {
        labels: Array.from(ituMap.keys()), // Extract unique itu country codes
        data: Array.from(ituMap.values())  // Extract count of occurrences
    };

    // Create the doughnut chart
    window.ituChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'ITU Distribution',
                data: chartData.data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.4)',
                    'rgba(54, 162, 235, 0.4)',
                    'rgba(255, 206, 86, 0.4)',
                    'rgba(75, 192, 192, 0.4)',
                    'rgba(153, 102, 255, 0.4)',
                    'rgba(255, 159, 64, 0.4)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'ITU Distribution per Antenna'
                }
            }
        }
    });
}

function preparePtyChart(filteredData) {
    const ctx = document.getElementById('ptyDonutChart').getContext('2d');
    if (window.ptyChart) {
        window.ptyChart.destroy();
    }

    const ptyMap = new Map();

    // Iterate over each item in the filteredData array
    filteredData.forEach(item => {
        const ptyData = item.pty;

        if (ptyData && item.rds == true && item.pi.length === 4) {
            if (ptyMap.has(ptyData)) {
                ptyMap.set(ptyData, ptyMap.get(ptyData) + 1);
            } else {
                ptyMap.set(ptyData, 1);
            }
        }
    });

    // Prepare chartData from the aggregated map
    const chartData = {
        labels: Array.from(ptyMap.keys()), // Extract unique pty country codes
        data: Array.from(ptyMap.values())  // Extract count of occurrences
    };

    // Create the doughnut chart
    window.ptyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'pty Distribution',
                data: chartData.data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.4)',
                    'rgba(54, 162, 235, 0.4)',
                    'rgba(255, 206, 86, 0.4)',
                    'rgba(75, 192, 192, 0.4)',
                    'rgba(153, 102, 255, 0.4)',
                    'rgba(255, 159, 64, 0.4)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'pty Distribution per Antenna'
                }
            }
        }
    });
}

function preparePolChart(filteredData) {
    const ctx = document.getElementById('polBarChart').getContext('2d');
    if (window.polChart) {
        window.polChart.destroy();
    }

    // Force canvas resize before redrawing the chart
    const canvas = document.getElementById('polBarChart');
    canvas.width = canvas.parentElement.offsetWidth;  // Reset canvas width to match parent width
    canvas.height = canvas.parentElement.offsetHeight; // Reset canvas height to match parent height

    const polMap = new Map();
    const polTypes = ['V', 'H', 'M', 'C'];  // Define the possible values for pol

    // Initialize the map with 0 values for each type
    polTypes.forEach(type => {
        polMap.set(type, 0);
    });

    // Iterate over each item in the filteredData array
    filteredData.forEach(item => {
        const polData = item.txInfo && item.txInfo.pol;

        if (polData && item.rds === true) {
            if (polMap.has(polData)) {
                polMap.set(polData, polMap.get(polData) + 1);
            }
        }
    });

    // Prepare chartData with values for each polarity type
    const chartData = {
        labels: [''], // Single label for the bar
        datasets: polTypes.map((type, index) => {
            const count = polMap.get(type);
            return {
                label: getFullLabel(type),  // Use the full label here
                data: [count], // Raw count of each polarity type
                backgroundColor: getColorByType(type, 0.4),  // Background with opacity of 0.4
                borderColor: getColorByType(type, 1),  // Border with opacity of 1
                borderWidth: 3
            };
        })
    };

    // Create the horizontal stacked bar chart
    window.polChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            indexAxis: 'y', // Horizontal bars
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'Polarity Distribution per Antenna'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,  // Ensure bars start from zero
                    stacked: true,      // Stack the bars within the same bar
                },
                y: {
                    stacked: true,      // Stack vertically to combine all values in one bar
                }
            }
        }
    });
}

function getColorByType(type, opacity) {
    // Define CSS variable names for each polarity type
    let colorVar = '';
    let transparentColorVar = '';

    switch(type) {
        case 'V': 
            colorVar = '--color-2';
            transparentColorVar = '--color-2-transparent';
            break; // Vertical
        case 'H': 
            colorVar = '--color-3';
            transparentColorVar = '--color-3-transparent';
            break; // Horizontal
        case 'M': 
            colorVar = '--color-4';
            transparentColorVar = '--color-4-transparent';
            break; // Mixed
        case 'C': 
            colorVar = '--color-5';
            transparentColorVar = '--color-5-transparent';
            break; // Circular
    }

    // Get the color from CSS variable
    const color = getCSSVarValue(colorVar);
    const transparentColor = getCSSVarValue(transparentColorVar);

    // Return the appropriate color based on opacity
    return opacity === 1 ? color : transparentColor;
}

// Function to map short strings to full labels
function getFullLabel(type) {
    switch(type) {
        case 'V': return 'Vertical';
        case 'H': return 'Horizontal';
        case 'M': return 'Mixed';
        case 'C': return 'Circular';
        default: return type;
    }
}

function getCSSVarValue(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// Get the color values from the CSS variables
const color1 = getCSSVarValue('--color-1');
const color1Transparent = getCSSVarValue('--color-1-transparent');
const color2 = getCSSVarValue('--color-2');
const color2Transparent = getCSSVarValue('--color-2-transparent');
const color3 = getCSSVarValue('--color-3');
const color3Transparent = getCSSVarValue('--color-3-transparent');
const color4 = getCSSVarValue('--color-4');
const color4Transparent = getCSSVarValue('--color-4-transparent');
const color5 = getCSSVarValue('--color-5');
const color5Transparent = getCSSVarValue('--color-5-transparent');
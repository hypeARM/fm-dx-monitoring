var antValue;
let cachedData = null; // Variable to store the fetched data
var colorsListBorder = [
    'rgb(88, 219, 171)',
    'rgb(203, 202, 165)',
    'rgb(169, 255, 112)',
    'rgb(104, 247, 238)',
    'rgb(245, 182, 66)',
    'rgb(250, 82, 141)',
    'rgb(128, 105, 250)',
    'rgb(252, 186, 3)',
    'rgb(100, 200, 255)',
    'rgb(150, 180, 230)',
]

var colorsListBg = [
    'rgba(88, 219, 171, 0.4)',
    'rgba(203, 202, 165, 0.4)',
    'rgba(169, 255, 112, 0.4)',
    'rgba(104, 247, 238, 0.4)',
    'rgba(245, 182, 66, 0.4)',
    'rgba(250, 82, 141, 0.4)',
    'rgba(128, 105, 250, 0.4)',
    'rgba(252, 186, 3, 0.4)',
    'rgba(100, 200, 255, 0.4)',
    'rgba(150, 180, 230, 0.4)'
]

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
    let stereoStationsWithoutRds = filteredData.filter(station => 
        station.pi.length !== 4 && station.st === true
    ).length;
    $("#total-stations").text(stationsWithPiAndPs + stereoStationsWithoutRds);
    $("#total-stations-rds").text(stationsWithPiAndPs);

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
        const ituData = item.txInfo?.itu;

        if (ituData) {
            if (ituMap.has(ituData)) {
                ituMap.set(ituData, ituMap.get(ituData) + 1);
            } else {
                ituMap.set(ituData, 1);
            }
        }
    });

    // Prepare chartData from the aggregated map
    const chartData = {
        labels: Array.from(ituMap.keys()),
        data: Array.from(ituMap.values())
    };

    // Create the doughnut chart
    window.ituChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'ITU Distribution',
                data: chartData.data,
                backgroundColor: colorsListBg,
                borderColor: colorsListBorder,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,  // Ensures fixed aspect ratio
            aspectRatio: 1,  // Keeps the doughnut circular
            plugins: {
                legend: {
                    display: false,  // Hide default legend inside the chart
                },
                title: {
                    display: false,
                    text: 'ITU Distribution per Antenna'
                }
            }
        }
    });

    const legendHtml = chartData.labels.map((label, index) => {
        const backgroundColor = colorsListBg[index % colorsListBg.length]; 
        const borderColor = colorsListBorder[index % colorsListBorder.length];
        const value = chartData.data[index];
        return `
            <div style="display: flex; align-items: center;margin: 5px;">
                <span style="width: 12px; height: 12px; background-color: ${backgroundColor}; border: 2px solid ${borderColor}; margin-right: 8px;"></span>
                <span>${label} <span style="opacity: 0.7">(${value})</span></span>
            </div>
        `;
    }).join('');
    

    // Insert the generated legend HTML into the separate div
    document.getElementById('ituLegend').innerHTML = legendHtml;
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
                backgroundColor: colorsListBg,
                borderColor: colorsListBorder,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
                    text: 'pty Distribution per Antenna'
                }
            }
        }
    });

    const legendHtml = chartData.labels.map((label, index) => {
        // Use modulo operator to cycle through color arrays
        const backgroundColor = colorsListBg[index % colorsListBg.length]; 
        const borderColor = colorsListBorder[index % colorsListBorder.length];
        const value = chartData.data[index]; // Get the data value for the label
        return `
            <div style="display: flex; align-items: center;margin: 5px;">
                <span style="width: 12px; height: 12px; background-color: ${backgroundColor}; border: 2px solid ${borderColor}; margin-right: 8px;"></span>
                <span>${label} <span style="opacity: 0.7">(${value})</span></span>
            </div>
        `;
    }).join('');    

    // Insert the generated legend HTML into the separate div
    document.getElementById('ptyLegend').innerHTML = legendHtml;
}

function preparePolChart(filteredData) {
    const ctx = document.getElementById('polBarChart').getContext('2d');
    if (window.polChart) {
        window.polChart.destroy();
    }

    // Force canvas resize before redrawing the chart
    const canvas = document.getElementById('polBarChart');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;

    const polMap = new Map();
    const polTypes = ['V', 'H', 'M', 'C'];

    polTypes.forEach(type => {
        polMap.set(type, 0);
    });

    filteredData.forEach(item => {
        const polData = item.txInfo && item.txInfo?.pol;
        if (polData && item.rds === true) {
            if (polMap.has(polData)) {
                polMap.set(polData, polMap.get(polData) + 1);
            }
        }
    });

    const total = Array.from(polMap.values()).reduce((sum, count) => sum + count, 0);

    const chartData = {
        labels: [''], // Single label for the entire bar
        datasets: polTypes.map((type, index) => {
            const count = polMap.get(type);
            const percentage = ((count / total) * 100).toFixed(2);
            return {
                label: getFullLabel(type), // Just the label name here
                data: [percentage], // Percentage for the stacked bar
                backgroundColor: colorsListBg[index],
                borderColor: colorsListBorder[index],
                borderWidth: 3
            };
        })
    };

    window.polChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false, // Show the legend with just the label name
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataset = context.dataset;
                            const index = context.dataIndex; // The index of the current hovered item in the dataset
                            const count = polMap.get(polTypes[context.datasetIndex]); // Get the count for the corresponding pol type
                            const percentage = ((count / total) * 100).toFixed(2);
                            return `${dataset.label}: ${percentage}% (${count})`; // Only show the relevant dataset information
                        }
                    }
                }
                
            },
            scales: {
                x: {
                    beginAtZero: true,
                    stacked: true,
                    max: 100,  // Set the max value of the x-axis to 100 to represent percentage
                    ticks: {
                        callback: function(value) {
                            return value + '%';  // Show percentages on the x-axis
                        }
                    }
                },
                y: {
                    stacked: true
                }
            }
        }
    });

    const legendHtml = chartData.datasets.map((dataset, index) => {
        const percentage = dataset.data[0]; // Percentage is the first value in the `data` array
        const count = polMap.get(polTypes[index]); // Get the count for each category
    
        return `
            <div style="display: flex; align-items: center; margin: 5px;">
                <span style="width: 12px; height: 12px; background-color: ${dataset.backgroundColor}; border: 2px solid ${dataset.borderColor}; margin-right: 8px;"></span>
                <span>${dataset.label} <span style="opacity: 0.7">(${parseFloat(percentage).toFixed(0)}% - ${count})</span></span>
            </div>
        `;
    }).join('');    
    
    document.getElementById('polLegend').innerHTML = legendHtml;
}

function getFullLabel(type) {
    switch(type) {
        case 'V': return 'Vertical';
        case 'H': return 'Horizontal';
        case 'M': return 'Mixed';
        case 'C': return 'Circular';
        default: return type;
    }
}
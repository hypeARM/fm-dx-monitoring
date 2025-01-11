// Function to fetch and generate the chart based on active antenna
function fetchAndGenerateChart(activeAnt = null) {
  fetch('./data')
    .then(response => response.json())
    .then(data => {
      // Filter data based on active antenna (default to 0 if no active antenna is passed)
      const filteredData = activeAnt === null ? data.filter(item => item.ant === 0) : data.filter(item => item.ant == activeAnt);

      const frequencies = filteredData.map(item => parseFloat(item.freq));
      const sigValues = filteredData.map(item => parseFloat(item.sig));
      const psValues = filteredData.map(item => item.ps);
      const piValues = filteredData.map(item => item.pi);

      const allFrequencies = [];
      for (let freq = 87.5; freq <= 108.0; freq += 0.1) {
        allFrequencies.push(parseFloat(freq.toFixed(1)));
      }

      const sigValuesWithZeros = allFrequencies.map(freq => {
        const closestIndex = frequencies.findIndex(f => Math.abs(f - freq) < 0.05);
        return closestIndex !== -1 ? sigValues[closestIndex] : 0;
      });

      const annotations = [];
      allFrequencies.forEach((freq, index) => {
        const closestIndex = frequencies.findIndex(f => Math.abs(f - freq) < 0.05);
        if (closestIndex !== -1 && sigValuesWithZeros[index] !== 0 && typeof psValues[closestIndex] !== "undefined" && psValues[closestIndex].length > 0) {
          annotations.push({
            type: 'label',
            xValue: freq,
            yValue: sigValuesWithZeros[index] + 10,
            color: '#ccc',
            content: `${freq.toFixed(1)} ${psValues[closestIndex]}`,
            font: {
              size: 12,
              family: 'Titillium Web'
            },
            rotation: 270,
            position: 'right',
            yAdjust: -25,
            animation: false,
          });
        }
      });

      const pointData = allFrequencies.map((freq, index) => {
        const closestIndex = frequencies.findIndex(f => Math.abs(f - freq) < 0.05);
        const ps = closestIndex !== -1 ? psValues[closestIndex] : null;
        const pi = closestIndex !== -1 ? piValues[closestIndex] : null;

        return {
          x: freq,
          y: sigValuesWithZeros[index],
          ps: ps,
          pi: pi,
        };
      });

      const ctx = document.getElementById('signal-chart').getContext('2d');
      if (window.myChart) {
        window.myChart.destroy();  // Destroy the old chart before creating a new one
      }
      
      window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: 'Signal Strength (dBuV)',
            data: pointData,
            fill: true,
            backgroundColor: 'rgba(88, 219, 171, 0.05)',
            borderColor: 'rgb(88, 219, 171)',
            tension: 0.15,
            pointRadius: function(context) {
              const dataPoint = context.raw;
              return (dataPoint.y === 0 || (!dataPoint.ps || !dataPoint.pi)) ? 0 : 5;
            },
            pointHoverRadius: 8,
            pointHitRadius: 10,
            spanGaps: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: true,
              mode: 'nearest',
              intersect: false,
              position: 'nearest',
              callbacks: {
                label: function(tooltipItem) {
                  const dataPoint = tooltipItem.raw;
                  const ps = dataPoint.ps || 'N/A';
                  const pi = dataPoint.pi || 'N/A';
                  const freq = dataPoint.x.toFixed(1);
                  return `${dataPoint.y.toFixed(0)} dBf • ${ps} • ${pi}`;
                }
              }
            },
            annotation: {
              annotations: annotations,
              animation: false
            },
          },
          scales: {
            x: {
              type: 'linear',
              min: 87.3,
              max: 108.0,
              ticks: {
                stepSize: 0.1,
                maxTicksLimit: 25,
                callback: function(value) {
                  return value.toFixed(1);
                }
              },
              title: {
                display: true,
                text: 'Frequency (MHz)'
              }
            },
            y: {
              min: 0,
              max: 130,
              title: {
                display: true,
                text: 'Signal Strength (dBf)'
              }
            }
          }
        }
      });
    })
    .catch(error => console.error('Error fetching data:', error));
}

// Initially load data for the first antenna (ant-0), if no antenna is selected
fetchAndGenerateChart();  // No activeAnt passed, so it defaults to `ant: 0`

// Add event listeners for the antenna buttons
document.querySelectorAll('.antenna-button').forEach(button => {
  button.addEventListener('click', () => {
    // Get the antenna ID from the clicked button (e.g., 'ant-0')
    const activeAnt = parseInt(button.id.split('-')[1]); // Extract the number after "ant-"

    // Update the active class on the buttons
    document.querySelectorAll('.antenna-button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');

    // Fetch and generate the chart based on the selected antenna
    fetchAndGenerateChart(activeAnt);
  });
});

// Check if no antenna buttons are enabled
function checkEnabledAntennas() {
  const enabledButtons = document.querySelectorAll('.antenna-button');
  const activeButton = Array.from(enabledButtons).find(button => button.classList.contains('active'));
  
  // If no active antenna, load default data for antenna 0
  if (!activeButton) {
    fetchAndGenerateChart(0);  // Load data for antenna 0 by default
  }
}

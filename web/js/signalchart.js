fetch('./data')
.then(response => response.json())
.then(data => {
  const frequencies = data.map(item => parseFloat(item.freq));
  const sigValues = data.map(item => parseFloat(item.sig));
  const psValues = data.map(item => item.ps);
  const piValues = data.map(item => item.pi);
  
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
  const myChart = new Chart(ctx, {
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
      transitions: {
        zoom: {
          animation: {
            duration: 0
          }
        }
      },
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
              const freq = dataPoint.x.toFixed(1);  // Format the frequency value (x value) with one decimal point
              return `${dataPoint.y.toFixed(0)} dBf • ${ps} • ${pi}`;
            }
          }
        },
        annotation: {
          annotations: annotations,
          animation: false
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
            speed: 5,
          },
          limits: {
            x: { min: 87.3, max: 108.2 },
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            mode: 'x',
          },
        }
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
              return value.toFixed(1);  // Format tick values with one decimal
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

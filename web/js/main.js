$(document).ready(function() {
    initPanels();
    checkImageFormat();
    // Function to fetch and generate the chart based on active antenna
    function fetchAndGenerateChart(activeAnt = 0) {
        fetch('./data')
            .then(response => response.json())
            .then(data => {
                // Filter data based on the selected antenna
                const filteredData = data.filter(item => {
                    // If 'ant-0' is selected, include data with matching antenna or data without an antenna
                    if (activeAnt == 0) {
                        return !item.ant || item.ant == activeAnt; // Include data with 'ant: 0' or no 'ant' parameter
                    } else {
                        // If other antennas are selected, include only data with the selected 'ant' parameter
                        return item.ant == activeAnt;
                    }
                });

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

    fetchAndGenerateChart(0);

    $('[id^="ant-"]').on('click', function() {
        const antValue = $(this).attr('id').split('-')[1];

        $('[id^="ant-"]').removeClass('active'); 
        $(this).addClass('active'); 
        fetchAndGenerateChart(antValue);

        $('.station-panel-container').each(function() {
            if ($(this).data('ant') == antValue || antValue == 'all') {
                $(this).show(); // Show this panel
            } else {
                $(this).hide(); // Hide this panel
            }
        })
    });

    // If no active antenna button is selected, default to showing data for antenna 0
    if ($('[id^="ant-"].active').length === 0) {
        fetchAndGenerateChart(0);
    }
});


function checkImageFormat() {
    $(".frequency-logo").each(function() {
        var $img = $(this);
        var imgSrc = $img.data('src');  // Get the PNG URL stored in the data-src attribute

        // Try to load the PNG image first
        $.ajax({
            url: imgSrc,
            type: 'HEAD', // Only check the headers, no need to download the full image
            success: function() {
                // PNG is available, set it as the source
                $img.attr('src', imgSrc);
            },
            error: function() {
                // PNG is not available, so use SVG instead
                var svgSrc = imgSrc.replace('.png', '.svg');
                $img.attr('src', svgSrc); // Update to SVG
            }
        });
    });
}

function initPanels() {
    $('.station-panel-container').each(function() {
        const container = $(this);
        const panel = container.find('.station-panel');
    
        if (panel.length === 0) return;
    
        panel.on('click', function(event) {
            event.stopPropagation();
            const details = container.find('.station-panel-details');
    
            if (details.length === 0) return;
    
            const isVisible = details.css('display') === 'block';
            details.css('display', isVisible ? 'none' : 'block');
            container.toggleClass('active', !isVisible);
        });
    });
    
}
var antValue = 0;
var customLogoDomain = "https://test.fmtuner.org";

$(document).ready(function() {
    initPanels();
    checkImageFormat();
    loadPanels(antValue);
    
    // Initial fetch and chart generation
    fetchData().then(() => {
        refreshCharts(0);
    });
    
    $('[id^="ant-"]').on('click', function() {
        antValue = $(this).attr('id').split('-')[1];
        
        $('[id^="ant-"]').removeClass('active'); 
        $(this).addClass('active'); 
        refreshCharts(antValue);
        loadPanels(antValue);
    });
    
    // If no active antenna button is selected, default to showing data for antenna 0
    if ($('[id^="ant-"].active').length === 0) {
        generateChart(filterDataByAntenna(0));
    }
    
    $('#signal-chart').on('click', function(evt) {
        const points = window.myChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
        if (points.length) {
            const firstPoint = points[0];
            const freq = window.myChart.data.datasets[firstPoint.datasetIndex].data[firstPoint.index].x;
            handleChartClick(freq);
        }
    });
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
    
    $('.chart-panel-more').click(function() {
        const panel = $(this).next();
        event.stopPropagation();
        if (panel.length === 0) return;
        
        const isVisible = panel.css('display') === 'block';
        panel.css('display', isVisible ? 'none' : 'block');
        $(this).toggleClass('active', !isVisible);
        
        if(!isVisible) {
            preparePolChart(filterDataByAntenna(antValue));
            prepareItuChart(filterDataByAntenna(antValue));
            preparePtyChart(filterDataByAntenna(antValue));
        }
    });
    
}

function loadPanels(antValue) {
    $('.station-panel-container').each(function() {
        if ($(this).data('ant') == antValue || antValue == 'all') {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
};

function refreshCharts(antValue) {
    generateChart(filterDataByAntenna(antValue));
    prepareItuChart(filterDataByAntenna(antValue));
    preparePtyChart(filterDataByAntenna(antValue));
    preparePanelData(filterDataByAntenna(antValue));
    preparePolChart(filterDataByAntenna(antValue));
}

// Function to generate the chart
function generateChart(filteredData) {
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
        if (closestIndex !== -1 && sigValuesWithZeros[index] !== 0 && psValues[closestIndex] && psValues[closestIndex].length > 0) {
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
        
        // Adjust the y-value for the point data
        const yValue = sigValuesWithZeros[index] - 11.25;
        
        return {
            x: freq,
            y: yValue,
            ps: ps,
            pi: pi,
        };
    });
    
    const ctx = document.getElementById('signal-chart').getContext('2d');
    if (window.myChart) {
        window.myChart.destroy();
    }
    
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Signal Strength (dBuV)',
                data: pointData,
                fill: {
                    target: 'start'
                },
                backgroundColor: 'rgba(88, 219, 171, 0.05)',
                borderColor: 'rgb(88, 219, 171)',
                tension: 0.15,
                pointRadius: function(context) {
                    const dataPoint = context.raw;
                    return (dataPoint && dataPoint.y === 0 || (!dataPoint.ps || !dataPoint.pi)) ? 0 : 5;
                },
                pointHoverRadius: 8,
                pointHitRadius: 10,
                spanGaps: true,
                segment: {
                    borderDash: (ctx) => {
                        const { p0, p1 } = ctx;
                        if (p0.parsed.y === -11.25 && p1.parsed.y === -11.25) {
                            return [5, 5]; // Dashed line between zero points
                        }
                        return []; // Solid line otherwise
                    },
                },
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            transitions: {
                zoom: {
                    animation: {
                        duration: 0
                    },
                },
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
                            const freq = dataPoint.x.toFixed(1);
                            return `${(dataPoint.y).toFixed(0)} dBμV • ${ps} • ${pi}`;
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
                        speed: 10,
                        threshold: 10
                    },
                    limits: {
                        x: { min: 87.3, max: 108.2 },
                    },
                    zoom: {
                        enabled: true,
                        mode: 'x',
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                    }
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
                            return value.toFixed(1);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Frequency (MHz)'
                    }
                },
                y: {
                    min: -15,
                    max: 120,
                    title: {
                        display: true,
                        text: 'Signal Strength (dBμV)'
                    }
                }
            }
        }
    });
}


function handleChartClick(freq) {
    const $panel = $(`.station-panel-container[data-ant='${antValue}'] .station-panel[data-freq='${freq}']`);
    
    if ($panel.length) {
        $('html, body').animate({
            scrollTop: $panel.offset().top - ($(window).height() / 2) + ($panel.outerHeight() / 2)
        }, 300);
        
        $panel.click();
    }
}


function handleImageError(img) {
    const currentSrc = img.src;
    const path = currentSrc.replace(/^https?:\/\/[^\/]+/, ''); 
    const svgSrc = currentSrc.replace('.png', '.svg');

    // Try to load the SVG image from the original domain first
    img.onerror = function() {
        // If the SVG from the original domain fails, try the custom domain
        img.src = customLogoDomain + path.replace('.png', '.svg');
        
        img.onerror = function() {
            // If both original and custom domain SVGs fail, try the PNG from the custom domain
            img.src = customLogoDomain + path;

            img.onerror = function() {
                // If both PNG and SVG fail from both domains, hide the image
                img.style.display = 'none';
            };
        };
    };

    img.src = svgSrc;
}

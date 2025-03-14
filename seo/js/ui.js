// This file extends the SEOFibUIController with chart rendering capabilities
// Make sure to include Chart.js before using these functions

// Extend the createChartVisualization method
export function createChartVisualization(chartData, container) {
    // If container is a canvas element, use it directly
    // Otherwise, create a canvas and append it to the container
    let canvas = container;
    if (!(container instanceof HTMLCanvasElement)) {
        canvas = document.createElement('canvas');
        container.appendChild(canvas);
    }
    
    const ctx = canvas.getContext('2d');
    
    // Data preparation
    const dates = chartData.positions.map(p => new Date(p.date).toLocaleDateString());
    const positions = chartData.positions.map(p => p.position);
    
    // Create datasets for the Fibonacci levels
    const fibDatasets = Object.entries(chartData.fibLevels).map(([level, value]) => {
        const fibLevel = parseFloat(level);
        return {
            label: `Fib ${fibLevel * 100}%`,
            data: Array(dates.length).fill(value),
            borderColor: getFibLevelColor(fibLevel),
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0
        };
    });
    
    // Create dataset for pattern points
    const patternPoints = {
        label: 'Fib Bounces',
        data: dates.map((date, index) => {
            const pattern = chartData.patterns.find(p => 
                new Date(p.date).toLocaleDateString() === date);
            return pattern ? positions[index] : null;
        }),
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        pointRadius: 6,
        pointStyle: 'rectRot',
        fill: false
    };
    
    // Create prediction point if available
    const predictionPoint = chartData.prediction ? {
        label: 'Next Target',
        data: dates.map((_, index) => index === dates.length - 1 ? 
            chartData.prediction.value : null),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        pointRadius: 8,
        pointStyle: 'star',
        fill: false
    } : null;
    
    // Combine all datasets
    const datasets = [
        {
            label: 'Keyword Position',
            data: positions,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            pointRadius: 3,
            fill: false,
            tension: 0.2
        },
        ...fibDatasets,
        patternPoints
    ];
    
    if (predictionPoint) {
        datasets.push(predictionPoint);
    }
    
    // Create the chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    reverse: true, // Lower is better for SEO rankings
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Ranking Position'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Fibonacci Analysis - Reliability: ${chartData.reliability.toFixed(2)}%`
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            
                            if (label === 'Fib Bounces') {
                                const dataIndex = context.dataIndex;
                                const date = dates[dataIndex];
                                const pattern = chartData.patterns.find(p => 
                                    new Date(p.date).toLocaleDateString() === date);
                                
                                if (pattern) {
                                    return `${label}: ${value} (${pattern.bounceType} at ${pattern.fibLevel * 100}%)`;
                                }
                            }
                            
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

// Helper function to get color for Fibonacci level
function getFibLevelColor(level) {
    // Different colors for different Fibonacci levels
    const colors = {
        0: 'rgba(128, 128, 128, 0.5)',
        0.236: 'rgba(255, 99, 132, 0.5)',
        0.382: 'rgba(255, 159, 64, 0.5)',
        0.5: 'rgba(255, 205, 86, 0.5)',
        0.618: 'rgba(75, 192, 192, 0.5)',
        0.786: 'rgba(54, 162, 235, 0.5)',
        1: 'rgba(153, 102, 255, 0.5)'
    };
    
    return colors[level] || 'rgba(201, 203, 207, 0.5)';
}

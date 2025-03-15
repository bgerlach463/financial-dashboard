// Import our analyzer classes
import { SEOFibonacciAnalyzer, SEOFibUIController } from './analyzer.js';
import { transformSEMrushData } from './semrush-adapter.js';

// DOM elements
const csvFileInput = document.getElementById('csv-file');
const uploadButton = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const keywordSection = document.getElementById('keyword-selection');
const keywordListContainer = document.getElementById('keyword-list-container');
const analyzeButton = document.getElementById('analyze-btn');
const resultsSection = document.getElementById('results');
const chartsContainer = document.getElementById('charts-container');
const summaryContainer = document.getElementById('summary-container');

// Create instances of our classes
const analyzer = new SEOFibonacciAnalyzer();
const uiController = new SEOFibUIController(analyzer);

// Event listeners
uploadButton.addEventListener('click', handleFileUpload);
analyzeButton.addEventListener('click', analyzeSelectedKeywords);

// Handle file upload
async function handleFileUpload() {
    const file = csvFileInput.files[0];
    if (!file) {
        showStatus('Please select a CSV file first.', 'error');
        return;
    }

    try {
        showStatus('<div class="loading-spinner"></div> Processing file... This might take a minute for large datasets.', 'info');
        
        // Read the file
        const fileContent = await readFile(file);
        
        // Parse the CSV file
        const parsedResult = Papa.parse(fileContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });
        
        // Transform the complex SEMrush format to the format expected by the analyzer
        const transformedData = transformSEMrushData(parsedResult.data);
        
        // Process the transformed data
        analyzer.processRawData(transformedData);
        
        // Calculate volatility to identify keywords for analysis
        analyzer.calculateVolatility();
        
        if (analyzer.volatileKeywords.length === 0) {
            showStatus('No volatile keywords found in the data. Try uploading a file with more historical data points.', 'error');
            return;
        }
        
        // Render the keyword selection list
        uiController.renderVolatileKeywordsList(keywordListContainer);
        
        // Show the keyword selection section
        keywordSection.style.display = 'block';
        
        showStatus(`Successfully processed ${analyzer.keywords.length} keywords. ${analyzer.volatileKeywords.length} keywords show significant volatility.`, 'success');
    } catch (error) {
        console.error('Error processing file:', error);
        showStatus(`Error processing file: ${error.message}`, 'error');
    }
}

// Read file content
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            resolve(event.target.result);
        };
        
        reader.onerror = (error) => {
            reject(error);
        };
        
        reader.readAsText(file);
    });
}

// Analyze selected keywords
function analyzeSelectedKeywords() {
    // Get selected keywords
    const selectedKeywords = uiController.getSelectedKeywords();
    
    if (selectedKeywords.length === 0) {
        showStatus('Please select at least one keyword to analyze.', 'error');
        return;
    }
    
    // Clear previous results
    chartsContainer.innerHTML = '';
    summaryContainer.innerHTML = '';
    
    // Create a summary table
    const summaryTable = document.createElement('table');
    summaryTable.className = 'keyword-table';
    summaryTable.innerHTML = `
        <tr>
            <th>Keyword</th>
            <th>Volatility Score</th>
            <th>Fibonacci Reliability</th>
            <th>Next Support/Resistance</th>
            <th>Current Trend</th>
        </tr>
    `;
    
    // Process each selected keyword
    selectedKeywords.forEach(keyword => {
        // Create a chart container for this keyword
        const chartCard = document.createElement('div');
        chartCard.className = 'chart-card';
        
        const chartHeader = document.createElement('div');
        chartHeader.className = 'chart-header';
        
        const chartTitle = document.createElement('div');
        chartTitle.className = 'chart-title';
        chartTitle.textContent = keyword;
        
        chartHeader.appendChild(chartTitle);
        chartCard.appendChild(chartHeader);
        
        // Create canvas for chart
        const chartCanvas = document.createElement('canvas');
        chartCanvas.height = 300;
        chartCard.appendChild(chartCanvas);
        
        chartsContainer.appendChild(chartCard);
        
        // Render chart
        uiController.renderFibonacciChart(keyword, chartCanvas);
        
        // Add row to summary table
        const keywordData = analyzer.keywords.find(k => k.keyword === keyword);
        const reliability = analyzer.calculateFibonacciReliability(keyword);
        const prediction = analyzer.predictNextRanking(keyword);
        
        // Get current position and trend
        const positions = keywordData.positions;
        const currentPosition = positions[positions.length - 1].position;
        const previousPosition = positions[positions.length - 2]?.position || currentPosition;
        const trendDirection = currentPosition < previousPosition ? 'Improving' : 'Declining';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${keyword}</td>
            <td>${keywordData.volatilityScore.toFixed(2)}</td>
            <td>${reliability.toFixed(2)}%</td>
            <td>${prediction ? `${prediction.value.toFixed(2)} (${prediction.level * 100}%)` : 'N/A'}</td>
            <td>${trendDirection}</td>
        `;
        summaryTable.appendChild(row);
    });
    
    summaryContainer.appendChild(summaryTable);
    
    // Show results section
    resultsSection.style.display = 'block';
}

// Show status message
function showStatus(message, type) {
    uploadStatus.innerHTML = message;
    uploadStatus.className = '';
    
    if (type === 'error') {
        uploadStatus.classList.add('status-error');
    } else if (type === 'success') {
        uploadStatus.classList.add('status-success');
    } else {
        uploadStatus.classList.add('status-info');
    }
}

// SEO Fibonacci Retracement Analyzer
// This code forms the core of the analysis tool

import { createChartVisualization } from './ui.js';

// Main class for the analyzer
class SEOFibonacciAnalyzer {
  constructor() {
    this.keywords = [];
    this.volatileKeywords = [];
    this.fibonacciLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  }

  // Parse SEMrush CSV report
  parseCSV(fileContent) {
    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          this.processRawData(results.data);
          resolve(this.keywords);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  // Process the raw data from SEMrush
  processRawData(data) {
    // Group by keyword to collect all historical data points
    const keywordGroups = _.groupBy(data, 'Keyword');
    
    // Transform data into our internal format with proper date sorting
    this.keywords = Object.keys(keywordGroups).map(keyword => {
      const entries = keywordGroups[keyword];
      // Sort by date (assuming SEMrush has a Date column)
      const sortedEntries = _.sortBy(entries, 'Date');
      
      return {
        keyword: keyword,
        searchVolume: entries[0].Volume || 0,
        positions: sortedEntries.map(entry => ({
          date: new Date(entry.Date),
          position: entry.Position,
          url: entry.URL
        }))
      };
    });
  }

  // Calculate volatility score for each keyword
  calculateVolatility() {
    this.keywords.forEach(keyword => {
      const positions = keyword.positions.map(p => p.position);
      
      // Skip keywords with insufficient data points
      if (positions.length < 10) {
        keyword.volatilityScore = 0;
        return;
      }
      
      // Calculate standard deviation of positions
      const mean = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
      const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate range (highest - lowest position)
      const range = Math.max(...positions) - Math.min(...positions);
      
      // Calculate rate of change between consecutive data points
      let totalChange = 0;
      for (let i = 1; i < positions.length; i++) {
        totalChange += Math.abs(positions[i] - positions[i-1]);
      }
      const avgChange = totalChange / (positions.length - 1);
      
      // Combined volatility score (weighted components)
      keyword.volatilityScore = (stdDev * 0.4) + (range * 0.3) + (avgChange * 0.3);
      
      // Add min and max values for Fibonacci calculations
      keyword.minPosition = Math.min(...positions);
      keyword.maxPosition = Math.max(...positions);
    });
    
    // Sort by volatility score (descending)
    this.keywords = _.orderBy(this.keywords, ['volatilityScore'], ['desc']);
    
    // Filter keywords with meaningful volatility (score > 1)
    this.volatileKeywords = this.keywords.filter(k => k.volatilityScore > 1);
    
    return this.volatileKeywords;
  }

  // Calculate Fibonacci retracement levels for a keyword
  calculateFibonacciLevels(keyword) {
    const keywordData = this.keywords.find(k => k.keyword === keyword);
    if (!keywordData) return null;
    
    // For SEO positions, lower is better (reverse of financial charts)
    // So our "uptrend" is actually positions improving (getting lower)
    const lowestPosition = keywordData.minPosition; // Best ranking achieved
    const highestPosition = keywordData.maxPosition; // Worst ranking
    
    // Calculate Fibonacci retracement levels
    const range = highestPosition - lowestPosition;
    const levels = {};
    
    this.fibonacciLevels.forEach(level => {
      // For SEO positions: lower = better
      levels[level] = lowestPosition + (range * level);
    });
    
    return {
      keyword: keywordData.keyword,
      positions: keywordData.positions,
      fibLevels: levels
    };
  }

  // Identify patterns where rankings respect Fibonacci levels
  identifyFibonacciPatterns(keywordData) {
    const positions = keywordData.positions.map(p => p.position);
    const fibLevels = Object.values(keywordData.fibLevels);
    const patterns = [];
    
    // Look for bounces off Fibonacci levels
    // A "bounce" is when ranking approaches a level and then reverses direction
    for (let i = 1; i < positions.length - 1; i++) {
      const prev = positions[i-1];
      const current = positions[i];
      const next = positions[i+1];
      
      // Check if current position is near a Fibonacci level
      fibLevels.forEach((level, index) => {
        const proximityThreshold = 0.5; // How close to consider it a hit
        
        if (Math.abs(current - level) <= proximityThreshold) {
          // Check if direction changed after hitting this level
          const beforeDirection = current - prev; // Positive = ranking worsening
          const afterDirection = next - current; // Negative = ranking improving
          
          if (beforeDirection * afterDirection < 0) { // Direction changed
            patterns.push({
              date: keywordData.positions[i].date,
              position: current,
              fibLevel: this.fibonacciLevels[index],
              levelValue: level,
              bounceType: beforeDirection > 0 ? 'resistance' : 'support'
            });
          }
        }
      });
    }
    
    return patterns;
  }

  // Predict potential future rankings based on Fibonacci patterns
  predictNextRanking(keyword) {
    const keywordData = this.keywords.find(k => k.keyword === keyword);
    if (!keywordData || keywordData.positions.length < 5) return null;
    
    const fibData = this.calculateFibonacciLevels(keyword);
    const patterns = this.identifyFibonacciPatterns(fibData);
    
    // Get current position and trend
    const recentPositions = keywordData.positions.slice(-5);
    const currentPosition = recentPositions[recentPositions.length - 1].position;
    
    // Calculate recent trend direction (true = improving/lower numbers)
    const trendDirection = recentPositions[0].position > currentPosition;
    
    // Find next Fibonacci level based on current trend
    const fibLevels = Object.entries(fibData.fibLevels)
      .map(([level, value]) => ({ level: parseFloat(level), value }));
    
    if (trendDirection) {
      // If improving (going to lower positions), next resistance is lower
      const nextLevels = fibLevels
        .filter(level => level.value < currentPosition)
        .sort((a, b) => b.value - a.value); // Descending
      
      return nextLevels.length > 0 ? nextLevels[0] : null;
    } else {
      // If worsening, next support is higher
      const nextLevels = fibLevels
        .filter(level => level.value > currentPosition)
        .sort((a, b) => a.value - b.value); // Ascending
      
      return nextLevels.length > 0 ? nextLevels[0] : null;
    }
  }

  // Calculate how frequently a keyword respects Fibonacci levels
  calculateFibonacciReliability(keyword) {
    const keywordData = this.keywords.find(k => k.keyword === keyword);
    if (!keywordData || keywordData.positions.length < 10) return 0;
    
    const fibData = this.calculateFibonacciLevels(keyword);
    const patterns = this.identifyFibonacciPatterns(fibData);
    
    // Calculate how many significant ranking changes respected Fib levels
    let totalDirectionChanges = 0;
    let fibRespectingChanges = 0;
    
    const positions = keywordData.positions.map(p => p.position);
    for (let i = 1; i < positions.length - 1; i++) {
      const prev = positions[i-1];
      const current = positions[i];
      const next = positions[i+1];
      
      // Check for direction change
      const beforeDirection = current - prev;
      const afterDirection = next - current;
      
      if (beforeDirection * afterDirection < 0 && Math.abs(beforeDirection) >= 1) {
        totalDirectionChanges++;
        
        // Check if this change is in our patterns list
        const matchingPattern = patterns.find(p => 
          p.date.getTime() === keywordData.positions[i].date.getTime());
        
        if (matchingPattern) {
          fibRespectingChanges++;
        }
      }
    }
    
    return totalDirectionChanges > 0 
      ? (fibRespectingChanges / totalDirectionChanges) * 100 
      : 0;
  }
}

// UI Controller for handling user interactions
class SEOFibUIController {
  constructor(analyzer) {
    this.analyzer = analyzer;
    this.selectedKeywords = [];
  }
  
  // Render list of volatile keywords for user selection
  renderVolatileKeywordsList(container) {
    const volatileKeywords = this.analyzer.volatileKeywords;
    
    // Clear container
    container.innerHTML = '';
    
    // Create table of keywords with checkboxes
    const table = document.createElement('table');
    table.className = 'keyword-table';
    
    // Add header
    const header = document.createElement('tr');
    header.innerHTML = `
      <th><input type="checkbox" id="select-all"></th>
      <th>

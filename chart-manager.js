// Chart Manager - Handles chart operations and data management
class ChartManager {
  constructor(chartContainerId) {
    this.chartContainer = document.getElementById(chartContainerId);
    this.chart = null;
    this.candleSeries = null;
    this.indicatorSeries = {};
    this.currentData = [];
    this.websocket = null;
    
    this.initChart();
  }

  // Initialize the chart
  initChart() {
    this.chart = LightweightCharts.createChart(this.chartContainer, {
      layout: { 
        backgroundColor: '#000000', 
        textColor: '#ffffff' 
      },
      grid: { 
        vertLines: { color: '#333333' }, 
        horLines: { color: '#333333' } 
      },
      timeScale: { 
        timeVisible: true, 
        secondsVisible: false 
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#333333',
      },
    });

    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350'
    });

    // Handle chart resize
    window.addEventListener('resize', () => {
      this.chart.applyOptions({ width: this.chartContainer.clientWidth });
    });
  }

  // Fetch historical data
  async fetchData(symbol, interval = '1m', limit = 5000) {
    let allCandles = [];
    let endTime = Date.now();
    const batchSize = 1000; // Binance's max per request
    const loops = Math.ceil(limit / batchSize);

    console.log(`Fetching up to ${limit} candles for ${symbol}...`);

    for (let i = 0; i < loops; i++) {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${batchSize}&endTime=${endTime}`;
      
      try {
        const res = await fetch(url);
        const raw = await res.json();

        if (!raw.length) break;

        const candles = raw.map(d => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }));

        allCandles = [...candles, ...allCandles];
        endTime = raw[0][0] - 1;

        console.log(`Fetched ${candles.length} candles, total: ${allCandles.length}`);

        if (candles.length < batchSize) break;
      } catch (error) {
        console.error('Error fetching data:', error);
        break;
      }
    }

    console.log(`Total candles fetched: ${allCandles.length}`);
    
    this.currentData = allCandles;
    this.candleSeries.setData(allCandles);
    
    return allCandles;
  }

  // Setup real-time data stream
  setupWebSocket(symbol, interval = '1m') {
    if (this.websocket) {
      this.websocket.close();
    }

    this.websocket = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`);
    
    this.websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const k = message.k;
      
      const liveCandle = {
        time: k.t / 1000,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v)
      };

      this.candleSeries.update(liveCandle);
      
      // Update current data array
      const lastIndex = this.currentData.length - 1;
      if (this.currentData[lastIndex] && this.currentData[lastIndex].time === liveCandle.time) {
        this.currentData[lastIndex] = liveCandle;
      } else {
        this.currentData.push(liveCandle);
      }
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.websocket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  // Add indicator overlay
  addIndicator(type, data, options = {}) {
    const defaultOptions = {
      color: '#2196F3',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false
    };

    const seriesOptions = { ...defaultOptions, ...options };
    
    let series;
    switch (type) {
      case 'line':
        series = this.chart.addLineSeries(seriesOptions);
        break;
      case 'area':
        series = this.chart.addAreaSeries(seriesOptions);
        break;
      case 'histogram':
        series = this.chart.addHistogramSeries(seriesOptions);
        break;
      default:
        throw new Error(`Unknown indicator type: ${type}`);
    }

    series.setData(data);
    return series;
  }

  // Add moving average
  addMovingAverage(period, type = 'sma', options = {}) {
    const data = this.calculateMovingAverage(period, type);
    const seriesId = `${type}${period}`;
    
    this.indicatorSeries[seriesId] = this.addIndicator('line', data, {
      color: options.color || this.getRandomColor(),
      ...options
    });

    return this.indicatorSeries[seriesId];
  }

  // Add RSI
  addRSI(period = 14, options = {}) {
    const data = this.calculateRSI(period);
    const seriesId = `rsi${period}`;
    
    this.indicatorSeries[seriesId] = this.addIndicator('line', data, {
      color: options.color || '#FF9800',
      ...options
    });

    return this.indicatorSeries[seriesId];
  }

  // Add MACD
  addMACD(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9, options = {}) {
    const macdData = this.calculateMACD(fastPeriod, slowPeriod, signalPeriod);
    
    // Add MACD line
    this.indicatorSeries['macd'] = this.addIndicator('line', macdData.macd, {
      color: options.macdColor || '#2196F3',
      ...options
    });

    // Add signal line
    this.indicatorSeries['macdSignal'] = this.addIndicator('line', macdData.signal, {
      color: options.signalColor || '#FF5722',
      ...options
    });

    // Add histogram
    this.indicatorSeries['macdHistogram'] = this.addIndicator('histogram', macdData.histogram, {
      color: options.histogramColor || '#4CAF50',
      ...options
    });

    return {
      macd: this.indicatorSeries['macd'],
      signal: this.indicatorSeries['macdSignal'],
      histogram: this.indicatorSeries['macdHistogram']
    };
  }

  // Add Bollinger Bands
  addBollingerBands(period = 20, stdDev = 2, options = {}) {
    const bbData = this.calculateBollingerBands(period, stdDev);
    
    this.indicatorSeries['bbUpper'] = this.addIndicator('line', bbData.upper, {
      color: options.upperColor || '#FF5722',
      ...options
    });

    this.indicatorSeries['bbMiddle'] = this.addIndicator('line', bbData.middle, {
      color: options.middleColor || '#9E9E9E',
      ...options
    });

    this.indicatorSeries['bbLower'] = this.addIndicator('line', bbData.lower, {
      color: options.lowerColor || '#FF5722',
      ...options
    });

    return {
      upper: this.indicatorSeries['bbUpper'],
      middle: this.indicatorSeries['bbMiddle'],
      lower: this.indicatorSeries['bbLower']
    };
  }

  // Set markers (buy/sell signals)
  setMarkers(markers) {
    this.candleSeries.setMarkers(markers);
  }

  // Clear all indicators
  clearIndicators() {
    Object.values(this.indicatorSeries).forEach(series => {
      this.chart.removeSeries(series);
    });
    this.indicatorSeries = {};
  }

  // Clear markers
  clearMarkers() {
    this.candleSeries.setMarkers([]);
  }

  // Get current data
  getCurrentData() {
    return this.currentData;
  }

  // Calculate moving average
  calculateMovingAverage(period, type = 'sma') {
    const result = [];
    
    for (let i = 0; i < this.currentData.length; i++) {
      if (i < period - 1) {
        result.push({ time: this.currentData[i].time, value: null });
      } else {
        const slice = this.currentData.slice(i - period + 1, i + 1);
        let value;
        
        if (type === 'sma') {
          value = slice.reduce((sum, candle) => sum + candle.close, 0) / period;
        } else if (type === 'ema') {
          const k = 2 / (period + 1);
          if (i === period - 1) {
            value = slice.reduce((sum, candle) => sum + candle.close, 0) / period;
          } else {
            value = this.currentData[i].close * k + result[i - 1].value * (1 - k);
          }
        }
        
        result.push({ time: this.currentData[i].time, value });
      }
    }
    
    return result;
  }

  // Calculate RSI
  calculateRSI(period = 14) {
    const result = [];
    const gains = [];
    const losses = [];

    // Calculate price changes
    for (let i = 1; i < this.currentData.length; i++) {
      const change = this.currentData[i].close - this.currentData[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI
    for (let i = 0; i < this.currentData.length; i++) {
      if (i < period) {
        result.push({ time: this.currentData[i].time, value: null });
      } else {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push({ time: this.currentData[i].time, value: rsi });
      }
    }

    return result;
  }

  // Calculate MACD
  calculateMACD(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.calculateMovingAverage(fastPeriod, 'ema');
    const slowEMA = this.calculateMovingAverage(slowPeriod, 'ema');
    
    const macdLine = fastEMA.map((fast, i) => ({
      time: fast.time,
      value: fast.value && slowEMA[i].value ? fast.value - slowEMA[i].value : null
    }));

    const signalLine = this.calculateMovingAverage(signalPeriod, 'ema', macdLine);
    
    const histogram = macdLine.map((macd, i) => ({
      time: macd.time,
      value: macd.value && signalLine[i].value ? macd.value - signalLine[i].value : null
    }));

    return { macd: macdLine, signal: signalLine, histogram };
  }

  // Calculate Bollinger Bands
  calculateBollingerBands(period = 20, stdDev = 2) {
    const sma = this.calculateMovingAverage(period, 'sma');
    const upper = [];
    const lower = [];

    for (let i = 0; i < this.currentData.length; i++) {
      if (i < period - 1) {
        upper.push({ time: this.currentData[i].time, value: null });
        lower.push({ time: this.currentData[i].time, value: null });
      } else {
        const slice = this.currentData.slice(i - period + 1, i + 1);
        const mean = sma[i].value;
        const variance = slice.reduce((acc, candle) => acc + Math.pow(candle.close - mean, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        upper.push({ 
          time: this.currentData[i].time, 
          value: mean + (standardDeviation * stdDev) 
        });
        lower.push({ 
          time: this.currentData[i].time, 
          value: mean - (standardDeviation * stdDev) 
        });
      }
    }

    return { upper, middle: sma, lower };
  }

  // Get random color for indicators
  getRandomColor() {
    const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Destroy chart
  destroy() {
    if (this.websocket) {
      this.websocket.close();
    }
    if (this.chart) {
      this.chart.remove();
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartManager;
} 
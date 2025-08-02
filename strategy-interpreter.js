// Strategy Interpreter - Handles custom trading strategy logic
class StrategyInterpreter {
  constructor() {
    this.indicators = {};
    this.data = [];
    this.trades = [];
    this.buyMarkers = [];
    this.sellMarkers = [];
  }

  // Parse and execute strategy from string or object
  interpret(strategy) {
    if (typeof strategy === 'string') {
      return this.parseStringStrategy(strategy);
    } else if (typeof strategy === 'object') {
      return this.executeStrategy(strategy);
    }
    throw new Error('Invalid strategy format');
  }

  // Parse strategy from string (for future use)
  parseStringStrategy(strategyString) {
    // This can be extended to parse natural language or custom syntax
    // For now, we'll use JSON-like format
    try {
      const strategy = JSON.parse(strategyString);
      return this.executeStrategy(strategy);
    } catch (error) {
      throw new Error('Invalid strategy string format');
    }
  }

  // Execute strategy object
  executeStrategy(strategy) {
    this.reset();
    this.data = strategy.data || [];
    
    // Calculate indicators
    this.calculateIndicators(strategy);
    
    // Execute trading logic
    this.executeTradingLogic(strategy);
    
    // Calculate statistics
    const stats = this.calculateStatistics();
    
    return {
      trades: this.trades,
      buyMarkers: this.buyMarkers,
      sellMarkers: this.sellMarkers,
      stats: stats,
      strategyName: strategy.name || 'Custom Strategy'
    };
  }

  // Calculate all required indicators
  calculateIndicators(strategy) {
    this.indicators = {};

    // Moving Averages
    if (strategy.indicators?.sma) {
      strategy.indicators.sma.forEach(period => {
        this.indicators[`sma${period}`] = this.calculateSMA(period);
      });
    }

    if (strategy.indicators?.ema) {
      strategy.indicators.ema.forEach(period => {
        this.indicators[`ema${period}`] = this.calculateEMA(period);
      });
    }

    // RSI
    if (strategy.indicators?.rsi) {
      this.indicators.rsi = this.calculateRSI(strategy.indicators.rsi.period || 14);
    }

    // MACD
    if (strategy.indicators?.macd) {
      const macdConfig = strategy.indicators.macd;
      const macdResult = this.calculateMACD(
        macdConfig.fastPeriod || 12,
        macdConfig.slowPeriod || 26,
        macdConfig.signalPeriod || 9
      );
      this.indicators.macd = macdResult.macd;
      this.indicators.macdSignal = macdResult.signal;
      this.indicators.macdHistogram = macdResult.histogram;
    }

    // Bollinger Bands
    if (strategy.indicators?.bollinger) {
      const bbConfig = strategy.indicators.bollinger;
      const bbResult = this.calculateBollingerBands(
        bbConfig.period || 20,
        bbConfig.stdDev || 2
      );
      this.indicators.bbUpper = bbResult.upper;
      this.indicators.bbMiddle = bbResult.middle;
      this.indicators.bbLower = bbResult.lower;
    }

    // Volume indicators
    if (strategy.indicators?.volume) {
      this.indicators.volumeSMA = this.calculateVolumeSMA(strategy.indicators.volume.period || 20);
    }
  }

  // Execute trading logic
  executeTradingLogic(strategy) {
    let inPosition = false;
    let entryPrice = 0;
    let entryTime = 0;

    const startIndex = this.getStartIndex(strategy);
    
    for (let i = startIndex; i < this.data.length; i++) {
      const currentData = this.data[i];
      const indicatorValues = this.getIndicatorValues(i);

      // Check buy condition
      if (!inPosition && this.evaluateCondition(strategy.conditions.buy, indicatorValues, i)) {
        this.trades.push({
          time: currentData.time,
          action: 'BUY',
          price: currentData.close,
          index: i
        });

        this.buyMarkers.push({
          time: currentData.time,
          position: 'belowBar',
          color: 'green',
          shape: 'arrowUp',
          text: 'Buy',
          size: 1
        });

        inPosition = true;
        entryPrice = currentData.close;
        entryTime = currentData.time;
      }
      
      // Check sell condition
      else if (inPosition && this.evaluateCondition(strategy.conditions.sell, indicatorValues, i)) {
        this.trades.push({
          time: currentData.time,
          action: 'SELL',
          price: currentData.close,
          index: i,
          profit: currentData.close - entryPrice,
          profitPercent: ((currentData.close - entryPrice) / entryPrice) * 100
        });

        this.sellMarkers.push({
          time: currentData.time,
          position: 'aboveBar',
          color: 'red',
          shape: 'arrowDown',
          text: 'Sell',
          size: 1
        });

        inPosition = false;
      }
    }
  }

  // Evaluate condition function or expression
  evaluateCondition(condition, indicatorValues, index) {
    if (typeof condition === 'function') {
      return condition(indicatorValues, this.data, index);
    } else if (typeof condition === 'string') {
      return this.evaluateExpression(condition, indicatorValues, index);
    }
    return false;
  }

  // Evaluate mathematical/logical expressions
  evaluateExpression(expression, indicatorValues, index) {
    // Create a safe evaluation context
    const context = {
      ...indicatorValues,
      price: this.data[index].close,
      high: this.data[index].high,
      low: this.data[index].low,
      open: this.data[index].open,
      index: index
    };

    try {
      // Replace indicator names with values
      let evalExpression = expression;
      Object.keys(context).forEach(key => {
        evalExpression = evalExpression.replace(new RegExp(key, 'g'), context[key]);
      });

      return eval(evalExpression);
    } catch (error) {
      console.error('Error evaluating expression:', expression, error);
      return false;
    }
  }

  // Get indicator values for current index
  getIndicatorValues(index) {
    const values = {};
    Object.keys(this.indicators).forEach(key => {
      if (this.indicators[key] && this.indicators[key][index] !== undefined) {
        values[key] = this.indicators[key][index];
      }
    });
    return values;
  }

  // Get starting index based on strategy requirements
  getStartIndex(strategy) {
    const periods = [];
    
    if (strategy.indicators?.sma) {
      periods.push(...strategy.indicators.sma);
    }
    if (strategy.indicators?.ema) {
      periods.push(...strategy.indicators.ema);
    }
    if (strategy.indicators?.rsi) {
      periods.push(strategy.indicators.rsi.period || 14);
    }
    if (strategy.indicators?.bollinger) {
      periods.push(strategy.indicators.bollinger.period || 20);
    }

    return Math.max(...periods, 0);
  }

  // Calculate statistics
  calculateStatistics() {
    const stats = {
      totalTrades: this.trades.length,
      buyTrades: this.trades.filter(t => t.action === 'BUY').length,
      sellTrades: this.trades.filter(t => t.action === 'SELL').length,
      wins: 0,
      losses: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
      maxDrawdown: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0
    };

    let currentDrawdown = 0;
    let peak = 0;

    // Calculate profit/loss for each completed trade
    for (let i = 1; i < this.trades.length; i += 2) {
      if (i < this.trades.length) {
        const buy = this.trades[i - 1];
        const sell = this.trades[i];
        
        if (buy.action === 'BUY' && sell.action === 'SELL') {
          const profit = sell.price - buy.price;
          const profitPercent = ((sell.price - buy.price) / buy.price) * 100;
          
          stats.totalProfit += profit;
          stats.totalProfitPercent += profitPercent;
          
          if (profit > 0) {
            stats.wins++;
            stats.avgWin += profit;
          } else {
            stats.losses++;
            stats.avgLoss += Math.abs(profit);
          }

          // Calculate drawdown
          if (stats.totalProfit > peak) {
            peak = stats.totalProfit;
          }
          currentDrawdown = peak - stats.totalProfit;
          if (currentDrawdown > stats.maxDrawdown) {
            stats.maxDrawdown = currentDrawdown;
          }
        }
      }
    }

    // Calculate averages
    stats.winRate = stats.wins + stats.losses > 0 ? (stats.wins / (stats.wins + stats.losses)) * 100 : 0;
    stats.avgWin = stats.wins > 0 ? stats.avgWin / stats.wins : 0;
    stats.avgLoss = stats.losses > 0 ? stats.avgLoss / stats.losses : 0;

    return stats;
  }

  // Reset interpreter state
  reset() {
    this.indicators = {};
    this.data = [];
    this.trades = [];
    this.buyMarkers = [];
    this.sellMarkers = [];
  }

  // Technical indicator calculations
  calculateSMA(period) {
    const sma = [];
    for (let i = 0; i < this.data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
      } else {
        const sum = this.data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  }

  calculateEMA(period) {
    const k = 2 / (period + 1);
    const ema = [];
    let prevEma = this.data[0].close;
    
    for (let i = 0; i < this.data.length; i++) {
      const close = this.data[i].close;
      const nextEma = i === 0 ? close : close * k + prevEma * (1 - k);
      ema.push(nextEma);
      prevEma = nextEma;
    }
    return ema;
  }

  calculateRSI(period = 14) {
    const rsi = [];
    const gains = [];
    const losses = [];

    // Calculate price changes
    for (let i = 1; i < this.data.length; i++) {
      const change = this.data[i].close - this.data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI
    for (let i = 0; i < this.data.length; i++) {
      if (i < period) {
        rsi.push(null);
      } else {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }

    return rsi;
  }

  calculateMACD(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.calculateEMA(fastPeriod);
    const slowEMA = this.calculateEMA(slowPeriod);
    
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
    const signalLine = this.calculateEMA(signalPeriod, macdLine.map((val, i) => ({ close: val })));
    const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

    return { macd: macdLine, signal: signalLine, histogram };
  }

  calculateBollingerBands(period = 20, stdDev = 2) {
    const sma = this.calculateSMA(period);
    const upper = [];
    const lower = [];

    for (let i = 0; i < this.data.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        lower.push(null);
      } else {
        const slice = this.data.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((acc, candle) => acc + Math.pow(candle.close - mean, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        upper.push(mean + (standardDeviation * stdDev));
        lower.push(mean - (standardDeviation * stdDev));
      }
    }

    return { upper, middle: sma, lower };
  }

  calculateVolumeSMA(period = 20) {
    // Note: This assumes volume data is available in the candle data
    // You may need to modify based on your data structure
    const volumeSMA = [];
    for (let i = 0; i < this.data.length; i++) {
      if (i < period - 1) {
        volumeSMA.push(null);
      } else {
        const sum = this.data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + (candle.volume || 0), 0);
        volumeSMA.push(sum / period);
      }
    }
    return volumeSMA;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StrategyInterpreter;
} 
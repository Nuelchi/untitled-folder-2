// Strategy Library - Predefined trading strategies
class StrategyLibrary {
  constructor() {
    this.strategies = {
      // Moving Average Crossover Strategies
      ma_crossover: {
        name: "Moving Average Crossover",
        description: "Buy when short MA crosses above long MA, sell when it crosses below",
        indicators: {
          sma: [5, 20]
        },
        conditions: {
          buy: (values, data, index) => values.sma5 > values.sma20,
          sell: (values, data, index) => values.sma5 < values.sma20
        }
      },

      ma_crossover_aggressive: {
        name: "Aggressive MA Crossover",
        description: "More sensitive moving average crossover with shorter periods",
        indicators: {
          sma: [3, 8]
        },
        conditions: {
          buy: (values, data, index) => values.sma3 > values.sma8,
          sell: (values, data, index) => values.sma3 < values.sma8
        }
      },

      // RSI Strategies
      rsi_oversold_overbought: {
        name: "RSI Oversold/Overbought",
        description: "Buy when RSI crosses above 30, sell when it crosses below 70",
        indicators: {
          rsi: { period: 14 }
        },
        conditions: {
          buy: (values, data, index) => values.rsi > 30,
          sell: (values, data, index) => values.rsi < 70
        }
      },

      rsi_aggressive: {
        name: "Aggressive RSI",
        description: "More frequent RSI signals with wider ranges",
        indicators: {
          rsi: { period: 14 }
        },
        conditions: {
          buy: (values, data, index) => values.rsi > 35,
          sell: (values, data, index) => values.rsi < 65
        }
      },

      // MACD Strategies
      macd_crossover: {
        name: "MACD Crossover",
        description: "Buy when MACD crosses above signal line, sell when below",
        indicators: {
          macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
        },
        conditions: {
          buy: (values, data, index) => values.macd > values.macdSignal,
          sell: (values, data, index) => values.macd < values.macdSignal
        }
      },

      macd_aggressive: {
        name: "Aggressive MACD",
        description: "Faster MACD with shorter periods for more signals",
        indicators: {
          macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 }
        },
        conditions: {
          buy: (values, data, index) => values.macd > values.macdSignal,
          sell: (values, data, index) => values.macd < values.macdSignal
        }
      },

      // Bollinger Bands Strategies
      bollinger_bounce: {
        name: "Bollinger Bands Bounce",
        description: "Buy when price touches lower band, sell when it touches upper band",
        indicators: {
          bollinger: { period: 20, stdDev: 2 }
        },
        conditions: {
          buy: (values, data, index) => data[index].close <= values.bbLower,
          sell: (values, data, index) => data[index].close >= values.bbUpper
        }
      },

      bollinger_squeeze: {
        name: "Bollinger Bands Squeeze",
        description: "Buy when price breaks above upper band, sell when below lower band",
        indicators: {
          bollinger: { period: 20, stdDev: 2 }
        },
        conditions: {
          buy: (values, data, index) => data[index].close > values.bbUpper,
          sell: (values, data, index) => data[index].close < values.bbLower
        }
      },

      // Combined Strategies
      rsi_ma_combined: {
        name: "RSI + MA Combined",
        description: "Combines RSI oversold/overbought with moving average trend",
        indicators: {
          rsi: { period: 14 },
          sma: [20]
        },
        conditions: {
          buy: (values, data, index) => values.rsi < 30 && data[index].close > values.sma20,
          sell: (values, data, index) => values.rsi > 70 || data[index].close < values.sma20
        }
      },

      macd_rsi_combined: {
        name: "MACD + RSI Combined",
        description: "Combines MACD momentum with RSI confirmation",
        indicators: {
          macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
          rsi: { period: 14 }
        },
        conditions: {
          buy: (values, data, index) => values.macd > values.macdSignal && values.rsi < 40,
          sell: (values, data, index) => values.macd < values.macdSignal && values.rsi > 60
        }
      },

      // High Frequency Strategies
      high_frequency: {
        name: "High Frequency Strategy",
        description: "Very short-term strategy for maximum signals",
        indicators: {
          sma: [3, 8],
          rsi: { period: 7 }
        },
        conditions: {
          buy: (values, data, index) => values.sma3 > values.sma8 || values.rsi < 25,
          sell: (values, data, index) => values.sma3 < values.sma8 || values.rsi > 75
        }
      },

      // Mean Reversion Strategies
      mean_reversion: {
        name: "Mean Reversion",
        description: "Buy when price is far below moving average, sell when far above",
        indicators: {
          sma: [50]
        },
        conditions: {
          buy: (values, data, index) => data[index].close < values.sma50 * 0.95,
          sell: (values, data, index) => data[index].close > values.sma50 * 1.05
        }
      },

      // Momentum Strategies
      momentum: {
        name: "Momentum Strategy",
        description: "Buy on strong upward momentum, sell on downward momentum",
        indicators: {
          ema: [10, 20]
        },
        conditions: {
          buy: (values, data, index) => values.ema10 > values.ema20 && 
                                        data[index].close > data[index-1].close,
          sell: (values, data, index) => values.ema10 < values.ema20 && 
                                        data[index].close < data[index-1].close
        }
      },

      // Simple Test Strategy
      simple_test: {
        name: "Simple Test Strategy",
        description: "Simple strategy that should generate both buy and sell signals",
        indicators: {
          sma: [10]
        },
        conditions: {
          buy: (values, data, index) => data[index].close > values.sma10,
          sell: (values, data, index) => data[index].close < values.sma10
        }
      }
    };
  }

  // Get all available strategies
  getAllStrategies() {
    return Object.keys(this.strategies).map(key => ({
      id: key,
      ...this.strategies[key]
    }));
  }

  // Get a specific strategy by ID
  getStrategy(strategyId) {
    return this.strategies[strategyId];
  }

  // Add a custom strategy to the library
  addStrategy(id, strategy) {
    this.strategies[id] = strategy;
  }

  // Remove a strategy from the library
  removeStrategy(strategyId) {
    delete this.strategies[strategyId];
  }

  // Get strategies by category
  getStrategiesByCategory(category) {
    const categories = {
      'moving_average': ['ma_crossover', 'ma_crossover_aggressive'],
      'rsi': ['rsi_oversold_overbought', 'rsi_aggressive'],
      'macd': ['macd_crossover', 'macd_aggressive'],
      'bollinger': ['bollinger_bounce', 'bollinger_squeeze'],
      'combined': ['rsi_ma_combined', 'macd_rsi_combined'],
      'high_frequency': ['high_frequency'],
      'mean_reversion': ['mean_reversion'],
      'momentum': ['momentum']
    };

    return categories[category] || [];
  }

  // Validate strategy format
  validateStrategy(strategy) {
    const required = ['name', 'indicators', 'conditions'];
    const missing = required.filter(field => !strategy[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!strategy.conditions.buy || !strategy.conditions.sell) {
      throw new Error('Strategy must have both buy and sell conditions');
    }

    return true;
  }

  // Create a custom strategy from parameters
  createCustomStrategy(params) {
    const strategy = {
      name: params.name || 'Custom Strategy',
      description: params.description || 'User-defined strategy',
      indicators: params.indicators || {},
      conditions: {
        buy: params.buyCondition || (() => false),
        sell: params.sellCondition || (() => false)
      }
    };

    this.validateStrategy(strategy);
    return strategy;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StrategyLibrary;
} 
const { loadCustomRingStyles } = require('../graphing/customRings')
const ringStyles = require('./ringStyles.json')

function loadRingStylesConfig() {
  try {
    loadCustomRingStyles(ringStyles)
  } catch (error) {
    console.warn('Failed to load custom ring styles:', error.message)
  }
}

module.exports = {
  loadRingStylesConfig
}
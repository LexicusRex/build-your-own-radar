require('./common')
require('./images/logo.png')
require('./images/radar_legend.png')
require('./analytics.js')

const Factory = require('./util/factory')
const { loadRingStylesConfig } = require('./config/ringStylesLoader')

// Initialize custom ring styles before building the radar
loadRingStylesConfig()

// Build the radar after styles are loaded
Factory().build()

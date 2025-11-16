const d3 = require('d3')
const config = require('../config')

let customRingStyles = {}

/**
 * Segments a path into dashed sections
 * @param {string} pathData - The SVG path data string
 * @param {number} dashLength - Length of each dash segment
 * @param {number} gapLength - Length of gap between dashes
 * @returns {string} New path data with segments
 */
function createDashedPath(pathData) {
  // Parse the path commands
  const commands = pathData.match(/[a-zA-Z][^a-zA-Z]*/g) || []
  const segments = []
  let dashLength = 10 // Length of each dash
  let gapLength = 5   // Length of gap between dashes
  
  // Process each command and create segments
  let currentX = 0, currentY = 0
  
  commands.forEach(cmd => {
    const type = cmd[0]
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number)
    
    if (type === 'M' || type === 'm') {
      currentX = type === 'M' ? coords[0] : currentX + coords[0]
      currentY = type === 'M' ? coords[1] : currentY + coords[1]
    } else if (type === 'L' || type === 'l') {
      const endX = type === 'L' ? coords[0] : currentX + coords[0]
      const endY = type === 'L' ? coords[1] : currentY + coords[1]
      
      // Calculate vector between points
      const dx = endX - currentX
      const dy = endY - currentY
      const length = Math.sqrt(dx * dx + dy * dy)
      
      // Create dash segments
      let distance = 0
      while (distance < length) {
        const t1 = distance / length
        const t2 = Math.min((distance + dashLength) / length, 1)
        
        const x1 = currentX + dx * t1
        const y1 = currentY + dy * t1
        const x2 = currentX + dx * t2
        const y2 = currentY + dy * t2
        
        segments.push(`M${x1},${y1} L${x2},${y2}`)
        distance += dashLength + gapLength
      }
      
      currentX = endX
      currentY = endY
    }
    // Add more command types (C, Q, etc.) as needed
  })
  
  return segments.join(' ')
}

/**
 * Load custom ring styles from configuration
 * @param {Object} styles - Object containing custom ring style definitions
 */
function loadCustomRingStyles(styles) {
  if (!styles || typeof styles !== 'object') {
    console.warn('Invalid custom ring styles provided:', styles)
    return
  }
  customRingStyles = styles
  console.log('Custom ring styles loaded:', Object.keys(customRingStyles))
}

/**
 * Extract the hone direction from the blip status
 * @param {string} blipStatus - Status of the blip
 * @return {string|null} 'in', 'out', or null if not specified
 */
function extractHoneDirection(blipStatus) {
  if (typeof blipStatus !== 'string') return null
  const lowerStatus = blipStatus.toLowerCase()
  // use regex to check that the status ends with ' in' or ' out'
  const inMatch = lowerStatus.match(/ in$/)
  const outMatch = lowerStatus.match(/ out$/)
  if (inMatch) return 'in'
  if (outMatch) return 'out'
  return null
}

function extractBlipStyleName(blipStatus) {
  if (typeof blipStatus !== 'string') return null
  return blipStatus.replace(/ (in|out)$/, '');
}

/**
 * Get custom ring style for a blip if available
 * @param {string} blipStatus - Status of the blip
 * @returns {Object|null} Custom style object or null if not found
 */
function getCustomRingStyle(blipStatus) {
  // a cool use case, if the status contains the blip style name and "in" or "out", extract the style name
  // use regex to remove ' in' or ' out' from the end of the status
  const honeDirection = extractHoneDirection(blipStatus)
  const styleName = honeDirection ? blipStatus.slice(0, blipStatus.length - honeDirection.length - 1).trim() : blipStatus
  const style = customRingStyles[styleName]
  return style || null
}

/**
 * Draw a custom ring for a blip
 * @param {d3.Selection} group - D3 selection for the blip group
 * @param {Object} blip - Blip object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} order - CSS class for the blip order
 * @param {Object} style - Custom style configuration
 */
function drawCustomRing(group, blip, x, y, order, style, isLegend = false) {
  const honeDirection = extractHoneDirection(blip.status())
  const _styleName = extractBlipStyleName(blip.status())

  group
    .attr('transform', `translate(${x - 11}, ${y - 11})`)
    .attr('data-blip-id', blip.id())

  if (style.path) {
    let pathData = style.path
    
    // when using mask we want the path to be filled (the mask uses luminance)
    pathData = style.path
    const path = group
      .append('path')
      .attr('d', pathData)
      .attr('class', `blip ${order} ${honeDirection ? honeDirection === 'in' ? 'hone-in' : 'hone-out' : ''}`)
      .attr('fill', style.fill || '#003d4f')


    if (blip.scale) {
      path.style('transform', `scale(${blip.scale})`)
    }

    // If a pattern is specified, create a pattern + mask and apply it
    if (style.pattern && style.pattern.enabled) {
      try {
        // sanitize id
        const sanitize = (s) => String(s).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '').toLowerCase()
        const patternId = isLegend ? `pattern-${_styleName}-legend` : `pattern-${_styleName}`
        const maskId = isLegend ? `mask-${_styleName}-legend` : `mask-${_styleName}`

        // get root svg element to attach defs
        const svgNode = group.node() && group.node().ownerSVGElement
        if (svgNode) {
          const svg = d3.select(svgNode)
          let defs = svg.select('defs')
          if (defs.empty()) defs = svg.append('defs')

          // create pattern if it doesn't already exist
          if (defs.select(`#${patternId}`).empty()) {
            const p = defs
              .append('pattern')
              .attr('id', patternId)
              .attr('patternUnits', style.pattern.patternUnits || 'userSpaceOnUse')
              .attr('patternTransform', isLegend 
                ? `${style.pattern.patternTransform} rotate(-45 18 18)` 
                : `${style.pattern.patternTransform}`
              )
              .attr('width', style.pattern.width || 2)
              .attr('height', style.pattern.height || 2)
              

            // choose pattern shape: rect (default) or circle
            const shape = style.pattern.circle ? 'circle' : 'rect'
            if (shape === 'circle') {
              const circ = style.pattern.circle || {}
              // defaults: center the circle inside the pattern tile
              const pw = style.pattern.width || 2
              const ph = style.pattern.height || 2
              const cx = circ.cx != null ? circ.cx : pw / 2
              const cy = circ.cy != null ? circ.cy : ph / 2
              const r = circ.r != null ? circ.r : Math.min(pw, ph) / 4
              const fill = circ.fill || style.pattern.fill || 'white'
              p.append('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', r)
                .attr('fill', fill)
            } else {
              // simple rect-based pattern; allow custom rect props
              const rectProps = style.pattern.rect || { width: 1, height: style.pattern.height || 2, fill: style.pattern.fill || 'white' }
              p.append('rect')
                .attr('width', rectProps.width)
                .attr('height', rectProps.height)
                .attr('fill', rectProps.fill)
            }
          }

          // create mask using the pattern
          if (defs.select(`#${maskId}`).empty()) {
            const m = defs.append('mask').attr('id', maskId)
            m.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', `url(#${patternId})`)
          }

          path.attr('mask', `url(#${maskId})`) 
        }
      } catch (e) {
        console.warn('Failed to apply pattern mask, falling back to normal path', e)
      }
    }

    // Apply scale if specified in the blip
    if (blip.scale) {
      path.style('transform', `scale(${blip.scale})`)
    }
  }

}

/**
 * Validate collated statuses against allowed statuses (custom + hardcoded).
 * If any extra statuses are present, alert the user.
 * @param {Array<string>} collatedStatuses
 * @returns {Array<string>} allowedStatuses
 */
function validateAllowedStatuses(collatedStatuses) {
  const hardcoded = ['no change', 'moved', 'new']
  const customKeys = Object.keys(customRingStyles || {})
  const allowedStatuses = customKeys.concat(hardcoded)

  const normalize = (s) => (s || '').toString().trim().toLowerCase()
  const allowedSet = new Set(allowedStatuses.map(normalize))

  const extras = (collatedStatuses || []).filter((s) => !allowedSet.has(normalize(s)))

  if (extras.length) {
    const msg =
      'Unrecognized status(es) found in your data: ' +
      extras.join(', ') +
      '.\nAllowed statuses are: ' +
      allowedStatuses.join(', ') +
      '.\nPlease update your data or add corresponding entries in ringStyles.json.'
    try {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg)
      } else {
        // If no window (e.g., tests), throw an error so it surfaces
        throw new Error(msg)
      }
    } catch (e) {
      // ensure we at least log
      console.warn(msg)
    }
  }

  return allowedStatuses
}
module.exports = {
  loadCustomRingStyles,
  getCustomRingStyle,
  drawCustomRing,
  validateAllowedStatuses
}
const customRingStyles = {}

function loadCustomRingStyles(stylesJson) {
  Object.assign(customRingStyles, stylesJson)
}

function getCustomRingStyle(labelName) {
  return customRingStyles[labelName] || null
}

function drawCustomRing(group, blip, xValue, yValue, order, customStyle) {
  group
    .attr('transform', `scale(1) translate(${xValue - 16}, ${yValue - 16})`)
    .attr('aria-label', blipAssistiveText(blip))
    
  if (customStyle.path) {
    group
      .append('path')
      .attr('d', customStyle.path)
      .attr('class', order)
      .style('transform', `scale(${blip.scale || 1})`)
  }

  // Add hone indicator if specified
  if (customStyle.hone) {
    const honeGroup = group.append('g')
    if (customStyle.hone === 'in') {
      honeGroup
        .append('path')
        .attr('d', 'M16.5 1.56c0 .86.7 1.56 1.56 1.56c8.16 0 14.8 6.64 14.8 14.8c0 .86.7 1.56 1.56 1.56c.86 0 1.56-.7 1.56-1.56C36 8.04 27.96 0 18.07 0C17.2 0 16.5.7 16.5 1.56z')
        .attr('class', `${order}-hone-in`)
    } else {
      honeGroup
        .append('path') 
        .attr('d', 'M19.5 34.44c0-.86-.7-1.56-1.56-1.56c-8.16 0-14.8-6.64-14.8-14.8c0-.86-.7-1.56-1.56-1.56S0 17.2 0 18.07C0 27.96 8.04 36 17.93 36C18.8 36 19.5 35.3 19.5 34.44z')
        .attr('class', `${order}-hone-out`)
    }
  }
}

module.exports = {
  loadCustomRingStyles,
  getCustomRingStyle,
  drawCustomRing
}
const d3 = require('d3')
const { getElementWidth, getElementHeight, decodeHTML } = require('../../util/htmlUtil')
const { toRadian } = require('../../util/mathUtils')
const { getRingIdString } = require('../../util/stringUtil')
const {
  graphConfig,
  getGraphSize,
  getScaledQuadrantWidth,
  getScaledQuadrantHeightWithGap,
  getScale,
  uiConfig,
} = require('../config')

const ANIMATION_DURATION = 1000

const { getCustomRingStyle, drawCustomRing } = require('../customRings')

const { quadrantHeight, quadrantWidth, quadrantsGap, effectiveQuadrantWidth } = graphConfig

let prevLeft, prevTop
let quadrantScrollHandlerReference
let scrollFlag = false

function selectRadarQuadrant(order, startAngle, name) {
  const noOfBlips = d3.selectAll('.quadrant-group-' + order + ' .blip-link').size()
  d3.select('#radar').classed('no-blips', noOfBlips === 0)

  d3.select('.graph-header').node().scrollIntoView({
    behavior: 'smooth',
  })

  d3.selectAll(`.quadrant-group rect`).attr('tabindex', undefined)

  const svg = d3.select('svg#radar-plot')
  svg.attr('data-quadrant-selected', order)

  svg.classed('sticky', false)
  svg.classed('enable-transition', true)

  const size = getGraphSize()

  d3.selectAll('.quadrant-table').classed('selected', false)
  d3.selectAll('.quadrant-table.' + order).classed('selected', true)

  d3.selectAll('.blip-item-description').classed('expanded', false)

  const scale = getScale()

  const adjustX = Math.sin(toRadian(startAngle)) - Math.cos(toRadian(startAngle))
  const adjustY = Math.cos(toRadian(startAngle)) + Math.sin(toRadian(startAngle))

  const translateXAll = (((1 - adjustX) / 2) * size * scale) / 2 + ((1 - adjustX) / 2) * (1 - scale / 2) * size
  const translateYAll = (((1 + adjustY) / 2) * size * scale) / 2

  const radarContainer = d3.select('#radar')
  const parentWidth = getElementWidth(radarContainer)

  const translateLeftRightValues = {
    first: {
      left: parentWidth - quadrantWidth * scale,
      top: 0,
      right: 'unset',
    },
    second: {
      left: parentWidth - quadrantWidth * scale,
      top: 0,
      right: 'unset',
    },
    third: {
      left: 0,
      top: 0,
      right: 'unset',
    },
    fourth: {
      left: 0,
      top: 0,
      right: 'unset',
    },
  }

  svg
    .style(
      'left',
      window.innerWidth < uiConfig.tabletViewWidth
        ? `calc((100% - ${quadrantWidth * scale}px) / 2)`
        : translateLeftRightValues[order].left + 'px',
    )
    .style('top', translateLeftRightValues[order].top + 'px')
    .style('right', translateLeftRightValues[order].right)
    .style('box-sizing', 'border-box')

  if (window.innerWidth < uiConfig.tabletViewWidth) {
    svg.style('margin', 'unset')
  }

  svg
    .attr('transform', `scale(${scale})`)
    .style('transform', `scale(${scale})`)
    .style('transform-origin', `0 0`)
    .attr('width', quadrantWidth)
    .attr('height', quadrantHeight + quadrantsGap)
  svg.classed('quadrant-view', true)

  const quadrantGroupTranslate = {
    first: { x: 0, y: 0 },
    second: { x: 0, y: -quadrantHeight },
    third: { x: -(quadrantWidth + quadrantsGap), y: 0 },
    fourth: { x: -(quadrantWidth + quadrantsGap), y: -quadrantHeight },
  }

  d3.select('.quadrant-group-' + order)
    .transition()
    .duration(ANIMATION_DURATION)
    .style('left', 'unset')
    .style('right', 0)
    .style('transform', `translate(${quadrantGroupTranslate[order].x}px, ${quadrantGroupTranslate[order].y}px)`)
    .attr('transform', `translate(${quadrantGroupTranslate[order].x}px, ${quadrantGroupTranslate[order].y}px)`)

  d3.selectAll('.quadrant-group-' + order + ' .blip-link text').each(function () {
    d3.select(this.parentNode).transition().duration(ANIMATION_DURATION)
  })

  const otherQuadrants = d3.selectAll('.quadrant-group:not(.quadrant-group-' + order + ')')
  otherQuadrants
    .transition()
    .duration(ANIMATION_DURATION)
    .style('pointer-events', 'none')
    .attr('transform', 'translate(' + translateXAll + ',' + translateYAll + ')scale(0)')
    .style('transform', null)
    .on('end', function () {
      otherQuadrants.style('display', 'none')
    })

  d3.selectAll('.quadrant-group').style('opacity', 0)
  d3.selectAll('.quadrant-group-' + order)
    .style('display', 'block')
    .style('opacity', '1')

  d3.select('li.quadrant-subnav__list-item.active-item').classed('active-item', false)
  d3.select(`li#subnav-item-${getRingIdString(name)}`).classed('active-item', true)

  d3.selectAll(`li.quadrant-subnav__list-item button`).attr('aria-selected', null)
  d3.select(`li#subnav-item-${getRingIdString(name)} button`).attr('aria-selected', true)

  d3.select('.quadrant-subnav__dropdown-selector').text(name)

  d3.select('#radar').classed('mobile', true) // shows the table
  d3.select('.all-quadrants-mobile').classed('show-all-quadrants-mobile', false) // hides the quadrants

  if (order === 'first' || order === 'second') {
    d3.select('.radar-legends').classed('right-view', true)
  } else {
    d3.select('.radar-legends').classed('left-view', true)
  }

  if (window.innerWidth < uiConfig.tabletViewWidth) {
    d3.select('#radar').style('height', null)
  }

  const radarLegendsContainer = d3.select('.radar-legends')
  radarLegendsContainer.style('top', `${getScaledQuadrantHeightWithGap(scale)}px`)

  d3.selectAll('.quadrant-table.selected button').attr('aria-hidden', null).attr('tabindex', null)
  d3.selectAll('.quadrant-table:not(.selected) button').attr('aria-hidden', 'true').attr('tabindex', -1)

  d3.selectAll('svg#radar-plot a').attr('aria-hidden', 'true').attr('tabindex', -1)

  d3.selectAll('.blip-list__item-container__name').attr('aria-expanded', 'false')

  if (window.innerWidth >= uiConfig.tabletViewWidth) {
    if (order === 'first' || order === 'second') {
      radarLegendsContainer.style(
        'left',
        `${
          parentWidth -
          getScaledQuadrantWidth(scale) +
          (getScaledQuadrantWidth(scale) / 2 - getElementWidth(radarLegendsContainer) / 2)
        }px`,
      )
    } else {
      radarLegendsContainer.style(
        'left',
        `${getScaledQuadrantWidth(scale) / 2 - getElementWidth(radarLegendsContainer) / 2}px`,
      )
    }

    prevLeft = d3.select('#radar-plot').style('left')
    prevTop = d3.select('#radar-plot').style('top')
    stickQuadrantOnScroll()
  } else {
    radarLegendsContainer.style('left', `${window.innerWidth / 2 - getElementWidth(radarLegendsContainer) / 2}px`)
  }
}

function wrapQuadrantNameInMultiLine(elem, isTopQuadrants, quadrantNameGroup, tip) {
  const maxWidth = 150
  const element = elem.node()
  const text = decodeHTML(element.innerHTML)
  const dy = isTopQuadrants ? 0 : -20

  const words = text.split(' ')
  let line = ''

  element.innerHTML = `<tspan id="text-width-check">${text}</tspan >`
  const testElem = document.getElementById('text-width-check')

  function maxCharactersToFit(testLine, suffix) {
    let j = 1
    let firstLineWidth = 0
    const testElem1 = document.getElementById('text-width-check')
    testElem1.innerHTML = testLine
    if (testElem1.getBoundingClientRect().width < maxWidth) {
      return testLine.length
    }
    while (firstLineWidth < maxWidth && testLine.length > j) {
      testElem1.innerHTML = testLine.substring(0, j) + suffix
      firstLineWidth = testElem1.getBoundingClientRect().width

      j++
    }
    return j - 1
  }

  function ellipsis(lineBreakIndex, secondLine) {
    if (lineBreakIndex >= secondLine.length) {
      return ''
    } else {
      quadrantNameGroup.on('mouseover', () => tip.show(text, quadrantNameGroup.node()))
      quadrantNameGroup.on('mouseout', () => tip.hide(text, quadrantNameGroup.node()))
      return '...'
    }
  }

  if (testElem.getBoundingClientRect().width > maxWidth) {
    for (let i = 0; i < words.length; i++) {
      let testLine = line + words[i] + ' '
      testElem.innerHTML = testLine
      const textWidth = testElem.getBoundingClientRect().width

      if (textWidth > maxWidth) {
        if (i === 0) {
          let lineBreakIndex = maxCharactersToFit(testLine, '-')
          element.innerHTML += '<tspan x="0" dy="' + dy + '">' + words[i].substring(0, lineBreakIndex) + '-</tspan>'
          const secondLine = words[i].substring(lineBreakIndex, words[i].length) + ' ' + words.slice(i + 1).join(' ')
          lineBreakIndex = maxCharactersToFit(secondLine, '...')
          element.innerHTML +=
            '<tspan x="0" dy="' +
            20 +
            '">' +
            secondLine.substring(0, lineBreakIndex) +
            ellipsis(lineBreakIndex, secondLine) +
            '</tspan>'
          break
        } else {
          element.innerHTML += '<tspan x="0" dy="' + dy + '">' + line + '</tspan>'
          const secondLine = words.slice(i).join(' ')
          const lineBreakIndex = maxCharactersToFit(secondLine, '...')
          element.innerHTML +=
            '<tspan x="0" dy="' +
            20 +
            '">' +
            secondLine.substring(0, lineBreakIndex) +
            ellipsis(lineBreakIndex, secondLine) +
            '</tspan>'
        }
        line = words[i] + ' '
      } else {
        line = testLine
      }
    }
  } else {
    element.innerHTML += '<tspan x="0">' + text + '</tspan>'
  }

  document.getElementById('text-width-check').remove()
}

function renderRadarQuadrantName(quadrant, parentGroup, tip) {
  const adjustX = Math.sin(toRadian(quadrant.startAngle)) - Math.cos(toRadian(quadrant.startAngle))
  const adjustY = -Math.cos(toRadian(quadrant.startAngle)) - Math.sin(toRadian(quadrant.startAngle))
  const quadrantNameGroup = parentGroup.append('g').classed('quadrant-name-group', true)

  let quadrantNameToDisplay = quadrant.quadrant.name()
  let translateX,
    translateY,
    anchor,
    ctaArrowXOffset,
    ctaArrowYOffset = -12

  const quadrantName = quadrantNameGroup.append('text').attr('data-quadrant-name', quadrantNameToDisplay)
  const ctaArrow = quadrantNameGroup
    .append('polygon')
    .attr('class', 'quadrant-name-cta')
    .attr('points', '5.2105e-4 11.753 1.2874 13 8 6.505 1.2879 0 0 1.2461 5.4253 6.504')
    .attr('fill', '#e16a7c')
  quadrantName.text(quadrantNameToDisplay).attr('font-weight', 'bold')

  wrapQuadrantNameInMultiLine(quadrantName, adjustY < 0, quadrantNameGroup, tip)
  const quadrantTextElement = document.querySelector(`.quadrant-group-${quadrant.order} .quadrant-name-group text`)
  const renderedText = quadrantTextElement.getBoundingClientRect()
  ctaArrowXOffset = renderedText.width + 10
  anchor = 'start'

  if (adjustX < 0) {
    translateX = 60
  } else {
    translateX = quadrantWidth * 2 - quadrantsGap - renderedText.width
  }
  if (adjustY < 0) {
    ctaArrowYOffset = quadrantTextElement.childElementCount > 1 ? 8 : ctaArrowYOffset
    translateY = 60
  } else {
    translateY = effectiveQuadrantWidth * 2 - 60
  }
  quadrantName.attr('text-anchor', anchor)
  quadrantNameGroup.attr('transform', 'translate(' + translateX + ', ' + translateY + ')')
  ctaArrow.attr('transform', `translate(${ctaArrowXOffset}, ${ctaArrowYOffset})`)
}

function renderRadarQuadrants(size, svg, quadrant, rings, ringCalculator, tip) {
  const quadrantGroup = svg
    .append('g')
    .attr('class', 'quadrant-group quadrant-group-' + quadrant.order)
    .on('mouseover', mouseoverQuadrant.bind({}, quadrant.order))
    .on('mouseout', mouseoutQuadrant.bind({}, quadrant.order))
    .on('click', selectRadarQuadrant.bind({}, quadrant.order, quadrant.startAngle, quadrant.quadrant.name()))
    .on('keydown', function (e) {
      if (e.key === 'Enter') selectRadarQuadrant(quadrant.order, quadrant.startAngle, quadrant.quadrant.name())
    })

  const rectCoordMap = {
    first: { x: 0, y: 0, strokeDashArray: `0, ${quadrantWidth}, ${quadrantHeight + quadrantWidth}, ${quadrantHeight}` },
    second: {
      x: 0,
      y: quadrantHeight + quadrantsGap,
      strokeDashArray: `${quadrantWidth + quadrantHeight}, ${quadrantWidth + quadrantHeight}`,
    },
    third: {
      x: quadrantWidth + quadrantsGap,
      y: 0,
      strokeDashArray: `0, ${quadrantWidth + quadrantHeight}, ${quadrantWidth + quadrantHeight}`,
    },
    fourth: {
      x: quadrantWidth + quadrantsGap,
      y: quadrantHeight + quadrantsGap,
      strokeDashArray: `${quadrantWidth}, ${quadrantWidth + quadrantHeight}, ${quadrantHeight}`,
    },
  }

  quadrantGroup
    .append('rect')
    .attr('width', `${quadrantWidth}px`)
    .attr('height', `${quadrantHeight}px`)
    .attr('fill', '#edf1f3')
    .attr('x', rectCoordMap[quadrant.order].x)
    .attr('y', rectCoordMap[quadrant.order].y)
    .style('pointer-events', 'none')

  rings.forEach(function (ring, i) {
    const arc = d3
      .arc()
      .innerRadius(ringCalculator.getRingRadius(i))
      .outerRadius(ringCalculator.getRingRadius(i + 1))
      .startAngle(toRadian(quadrant.startAngle))
      .endAngle(toRadian(quadrant.startAngle - 90))

    quadrantGroup
      .append('path')
      .attr('d', arc)
      .attr('class', 'ring-arc-' + ring.order())
      .attr(
        'transform',
        'translate(' + graphConfig.effectiveQuadrantWidth + ', ' + graphConfig.effectiveQuadrantHeight + ')',
      )
  })

  quadrantGroup
    .append('rect')
    .classed('quadrant-rect', true)
    .attr('width', `${quadrantWidth}px`)
    .attr('height', `${quadrantHeight}px`)
    .attr('fill', 'transparent')
    .attr('stroke', 'black')
    .attr('x', rectCoordMap[quadrant.order].x)
    .attr('y', rectCoordMap[quadrant.order].y)
    .attr('stroke-dasharray', rectCoordMap[quadrant.order].strokeDashArray)
    .attr('stroke-width', 2)
    .attr('stroke', '#71777d')
    .attr('tabindex', 0)

  renderRadarQuadrantName(quadrant, quadrantGroup, tip)
  return quadrantGroup
}

function renderRadarLegends(radarElement, hasMovements, allStatuses) {
  const legendsContainer = radarElement.append('div').classed('radar-legends', true)

  function createLegendItem(label) {
    const item = legendsContainer.append('span').classed('legend-item', true)
    const svg = item
      .append('svg')
      .attr('width', '37')
      .attr('height', '37')
      .attr('viewBox', '0 0 36 36')
      .attr('role', 'img')
      .attr('aria-label', `${label} blip legend icon`)

    const g = svg.append('g').attr('transform', 'translate(0, 0)')
    return { item, svg, g, label }
  }

  function addOuterCircle(parentSvg, order, scale = 1) {
    parentSvg
      .append('path')
      .attr('opacity', '1')
      .attr('class', order)
      .attr(
        'd',
        'M18 36C8.07 36 0 27.93 0 18S8.07 0 18 0c9.92 0 18 8.07 18 18S27.93 36 18 36zM18 3.14C9.81 3.14 3.14 9.81 3.14 18S9.81 32.86 18 32.86S32.86 26.19 32.86 18S26.19 3.14 18 3.14z',
      )
      .attr('fill', '#003d4f')  
      .style('transform', `scale(${scale})`)
  }

  function addMovedLine(parentSvg, order, scale = 1) {
    const cx = 18; // center x of your parent circle (adjust as needed)
    const cy = 18; // center y of your parent circle
    // const r = 20; // roughly outer radius from your path
    
    // Create a quarter circle path starting from top
    parentSvg
      .append('path')
      .attr('opacity', '1')
      .attr('class', order)
      .attr(
        'd',
        'M19.5 1.56c0 0.86-0.7 1.56-1.56 1.56c-8.16 0-14.8 6.64-14.8 14.8c0 0.86-0.7 1.56-1.56 1.56S0 18.8 0 17.93C0 8.04 8.04 0 17.93 0C18.8 0 19.5 0.7 19.5 1.56z'
      )
      .attr('fill', '#003d4f')  
      .style('transform-origin', `${cx}px ${cy}px`)
      .style('transform', `rotate(45deg) scale(${scale})`);
  }

  function drawBlipCircle(group, order, scale = 1) {
    group
      .append('circle')
      .attr('r', '12')
      .attr('cx', '18')
      .attr('cy', '18')
      .attr('fill', '#003d4f')  
      .attr('class', order)
      .style('transform', `scale(${scale})`)
  }

  function centerRingLine(parentSvg, order, scale = 1) {
    const cx = 18; // center x of your parent circle (adjust as needed)
    const cy = 18; // center y of your parent circle
    
    parentSvg
      .style('transform-origin', `${cx}px ${cy}px`)
      .style('transform', `rotate(45deg) scale(${scale})`);

  }

  // Create new blip legend
  const newLegend = createLegendItem('new')
  drawBlipCircle(newLegend.g, 'first')
  newLegend.item.append('span').text('New')

  console.log("🚀 ~ renderRadarLegends ~ hasMovements:", hasMovements)
  if (hasMovements) {
    // Create moved blip legend
    const movedLegend = createLegendItem('moved')
    drawBlipCircle(movedLegend.g, 'second')
    addMovedLine(movedLegend.g, 'second')
    movedLegend.item.append('span').text('Moved in/out')

    // Create no change blip legend
    const noChangeLegend = createLegendItem('no-change')
    drawBlipCircle(noChangeLegend.g, 'third')
    addOuterCircle(noChangeLegend.g, 'third')
    noChangeLegend.item.append('span').text('No change')
  } else {
    // Create existing blip legend
    const existingLegend = createLegendItem('existing')
    drawBlipCircle(existingLegend.g, 'second')
    addOuterCircle(existingLegend.g, 'second')
    existingLegend.item.append('span').text('Existing')
  }

  // Draw legends for custom statuses (those not covered by the default set)
  // `allStatuses` contains the collated statuses passed from radar; filter out defaults
  try {
    const defaults = ['new', 'moved', 'no change', 'existing']
    const normalized = (allStatuses || []).map((s) => (s || '').toString().trim())
    const customStatuses = normalized.filter((s) => !defaults.includes(s.toLowerCase()))

    customStatuses.forEach((status) => {
      // get style for this status (if present)
      const style = getCustomRingStyle(status)
      const legend = createLegendItem(status)

      if (style) {
        // create a small fake blip object compatible with drawCustomRing
        const fakeBlip = {
          id: () => `legend-${String(status).replace(/\s+/g, '-')}`,
          status: () => status,
          // drawCustomRing checks blip.scale as a property in some places
          scale: 1,
        }

        // draw the custom ring into the legend group's coordinate space (center at 18,18)
        try {
          console.log("🚀 ~ renderRadarLegends ~ style:", style)
          drawBlipCircle(legend.g, 'custom')
          drawCustomRing(legend.g, fakeBlip, 10, 11, 'custom', style, isLegend=true)
          centerRingLine(legend.g, 'custom')
          
        } catch (e) {
          console.warn('Failed to draw custom legend for', status, e)
          // fallback to simple circle
          drawBlipCircle(legend.g, 'custom')
        }
      } else {
        // If no style found, fallback to default circle
        drawBlipCircle(legend.g, 'custom')
      }

      legend.item.append('span').text(status)
    })
  } catch (e) {
    console.warn('Error rendering custom legends', e)
  }
}

function renderMobileView(quadrant) {
  const quadrantBtn = d3.select('.all-quadrants-mobile').append('button')
  quadrantBtn
    .attr('class', 'all-quadrants-mobile--btn')
    .style('background-image', `url('/images/${quadrant.order}-quadrant-btn-bg.svg')`)
    .attr('id', quadrant.order + '-quadrant-mobile')
    .append('div')
    .attr('class', 'btn-text-wrapper')
    .text(quadrant.quadrant.name().replace(/[^a-zA-Z0-9\s!&]/g, ' '))
  quadrantBtn.node().onclick = () => {
    selectRadarQuadrant(quadrant.order, quadrant.startAngle, quadrant.quadrant.name())
  }
}

function mouseoverQuadrant(order) {
  d3.select('.quadrant-group-' + order).style('opacity', 1)
  d3.selectAll('.quadrant-group:not(.quadrant-group-' + order + ')').style('opacity', 0.3)
}

function mouseoutQuadrant(order) {
  d3.selectAll('.quadrant-group:not(.quadrant-group-' + order + ')').style('opacity', 1)
}

function quadrantScrollHandler(
  scale,
  radarElement,
  offset,
  selectedOrder,
  leftQuadrantLeftValue,
  rightQuadrantLeftValue,
  radarHeight,
  selectedQuadrantTable,
  radarLegendsContainer,
  radarLegendsWidth,
) {
  const quadrantTableHeight = getElementHeight(selectedQuadrantTable)
  const quadrantTableOffset = offset + quadrantTableHeight

  if (window.scrollY >= offset) {
    radarElement.classed('enable-transition', false)
    radarElement.classed('sticky', true)
    radarLegendsContainer.classed('sticky', true)

    if (window.scrollY + uiConfig.subnavHeight + radarHeight >= quadrantTableOffset) {
      radarElement.classed('sticky', false)
      radarLegendsContainer.classed('sticky', false)

      radarElement.style('top', `${quadrantTableHeight - radarHeight - uiConfig.subnavHeight}px`)
      radarElement.style('left', prevLeft)

      radarLegendsContainer.style(
        'top',
        `${quadrantTableHeight - radarHeight - uiConfig.subnavHeight + getScaledQuadrantHeightWithGap(scale)}px`,
      )
      radarLegendsContainer.style(
        'left',
        `${parseFloat(prevLeft.slice(0, -2)) + (getScaledQuadrantWidth(scale) / 2 - radarLegendsWidth / 2)}px`,
      )
    } else {
      if (selectedOrder === 'first' || selectedOrder === 'second') {
        radarElement.style('left', `${leftQuadrantLeftValue}px`)
        radarLegendsContainer.style(
          'left',
          `${
            leftQuadrantLeftValue + (getScaledQuadrantWidth(scale) / 2 - getElementWidth(radarLegendsContainer) / 2)
          }px`,
        )
      } else {
        radarElement.style('left', `${rightQuadrantLeftValue}px`)
        radarLegendsContainer.style(
          'left',
          `${
            rightQuadrantLeftValue + (getScaledQuadrantWidth(scale) / 2 - getElementWidth(radarLegendsContainer) / 2)
          }px`,
        )
      }

      radarLegendsContainer.style('top', `${getScaledQuadrantHeightWithGap(scale) + uiConfig.subnavHeight}px`)
    }
  } else {
    radarElement.style('top', prevTop)
    radarElement.style('left', prevLeft)
    radarElement.classed('sticky', false)

    radarLegendsContainer.style('top', `${parseFloat(prevTop.slice(0, -2)) + getScaledQuadrantHeightWithGap(scale)}px`)
    radarLegendsContainer.style(
      'left',
      `${parseFloat(prevLeft.slice(0, -2)) + (getScaledQuadrantWidth(scale) / 2 - radarLegendsWidth / 2)}px`,
    )
    radarLegendsContainer.classed('sticky', false)
  }
}

function stickQuadrantOnScroll() {
  if (!scrollFlag) {
    const scale = getScale()

    const radarContainer = d3.select('#radar')
    const radarElement = d3.select('#radar-plot')
    const selectedQuadrantTable = d3.select('.quadrant-table.selected')
    const radarLegendsContainer = d3.select('.radar-legends')

    const radarHeight = quadrantHeight * scale + quadrantsGap * scale
    const offset = radarContainer.node().offsetTop - uiConfig.subnavHeight
    const radarWidth = radarContainer.node().getBoundingClientRect().width
    const selectedOrder = radarElement.attr('data-quadrant-selected')

    const leftQuadrantLeftValue =
      (window.innerWidth + radarWidth) / 2 - effectiveQuadrantWidth * scale + (quadrantsGap / 2) * scale
    const rightQuadrantLeftValue = (window.innerWidth - radarWidth) / 2

    const radarLegendsWidth = getElementWidth(radarLegendsContainer)

    quadrantScrollHandlerReference = quadrantScrollHandler.bind(
      this,
      scale,
      radarElement,
      offset,
      selectedOrder,
      leftQuadrantLeftValue,
      rightQuadrantLeftValue,
      radarHeight,
      selectedQuadrantTable,
      radarLegendsContainer,
      radarLegendsWidth,
    )

    if (
      uiConfig.subnavHeight + radarHeight + quadrantsGap * 2 + uiConfig.legendsHeight <
      getElementHeight(selectedQuadrantTable)
    ) {
      window.addEventListener('scroll', quadrantScrollHandlerReference)
      scrollFlag = true
    } else {
      removeScrollListener()
    }
  }
}

function removeScrollListener() {
  window.removeEventListener('scroll', quadrantScrollHandlerReference)
  scrollFlag = false
}

module.exports = {
  selectRadarQuadrant,
  renderRadarQuadrants,
  renderRadarLegends,
  renderMobileView,
  mouseoverQuadrant,
  mouseoutQuadrant,
  stickQuadrantOnScroll,
  removeScrollListener,
  wrapQuadrantNameInMultiLine,
}

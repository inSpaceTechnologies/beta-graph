/*
Copyright (c) 2018 inSpace Technologies Ltd
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/
import Hammer from 'hammerjs';

// https://github.com/facebook/fixed-data-table/blob/master/src/vendor_upstream/dom/normalizeWheel.js
/**
 * Mouse wheel (and 2-finger trackpad) support on the web sucks.  It is
 * complicated, thus this doc is long and (hopefully) detailed enough to answer
 * your questions.
 *
 * If you need to react to the mouse wheel in a predictable way, this code is
 * like your bestest friend. * hugs *
 *
 * As of today, there are 4 DOM event types you can listen to:
 *
 *   'wheel'                -- Chrome(31+), FF(17+), IE(9+)
 *   'mousewheel'           -- Chrome, IE(6+), Opera, Safari
 *   'MozMousePixelScroll'  -- FF(3.5 only!) (2010-2013) -- don't bother!
 *   'DOMMouseScroll'       -- FF(0.9.7+) since 2003
 *
 * So what to do?  The is the best:
 *
 *   normalizeWheel.getEventType();
 *
 * In your event callback, use this code to get sane interpretation of the
 * deltas.  This code will return an object with properties:
 *
 *   spinX   -- normalized spin speed (use for zoom) - x plane
 *   spinY   -- " - y plane
 *   pixelX  -- normalized distance (to pixels) - x plane
 *   pixelY  -- " - y plane
 *
 * Wheel values are provided by the browser assuming you are using the wheel to
 * scroll a web page by a number of lines or pixels (or pages).  Values can vary
 * significantly on different platforms and browsers, forgetting that you can
 * scroll at different speeds.  Some devices (like trackpads) emit more events
 * at smaller increments with fine granularity, and some emit massive jumps with
 * linear speed or acceleration.
 *
 * This code does its best to normalize the deltas for you:
 *
 *   - spin is trying to normalize how far the wheel was spun (or trackpad
 *     dragged).  This is super useful for zoom support where you want to
 *     throw away the chunky scroll steps on the PC and make those equal to
 *     the slow and smooth tiny steps on the Mac. Key data: This code tries to
 *     resolve a single slow step on a wheel to 1.
 *
 *   - pixel is normalizing the desired scroll delta in pixel units.  You'll
 *     get the crazy differences between browsers, but at least it'll be in
 *     pixels!
 *
 *   - positive value indicates scrolling DOWN/RIGHT, negative UP/LEFT.  This
 *     should translate to positive value zooming IN, negative zooming OUT.
 *     This matches the newer 'wheel' event.
 *
 * Why are there spinX, spinY (or pixels)?
 *
 *   - spinX is a 2-finger side drag on the trackpad, and a shift + wheel turn
 *     with a mouse.  It results in side-scrolling in the browser by default.
 *
 *   - spinY is what you expect -- it's the classic axis of a mouse wheel.
 *
 *   - I dropped spinZ/pixelZ.  It is supported by the DOM 3 'wheel' event and
 *     probably is by browsers in conjunction with fancy 3D controllers .. but
 *     you know.
 *
 * Implementation info:
 *
 * Examples of 'wheel' event if you scroll slowly (down) by one step with an
 * average mouse:
 *
 *   OS X + Chrome  (mouse)     -    4   pixel delta  (wheelDelta -120)
 *   OS X + Safari  (mouse)     -  N/A   pixel delta  (wheelDelta  -12)
 *   OS X + Firefox (mouse)     -    0.1 line  delta  (wheelDelta  N/A)
 *   Win8 + Chrome  (mouse)     -  100   pixel delta  (wheelDelta -120)
 *   Win8 + Firefox (mouse)     -    3   line  delta  (wheelDelta -120)
 *
 * On the trackpad:
 *
 *   OS X + Chrome  (trackpad)  -    2   pixel delta  (wheelDelta   -6)
 *   OS X + Firefox (trackpad)  -    1   pixel delta  (wheelDelta  N/A)
 *
 * On other/older browsers.. it's more complicated as there can be multiple and
 * also missing delta values.
 *
 * The 'wheel' event is more standard:
 *
 * http://www.w3.org/TR/DOM-Level-3-Events/#events-wheelevents
 *
 * The basics is that it includes a unit, deltaMode (pixels, lines, pages), and
 * deltaX, deltaY and deltaZ.  Some browsers provide other values to maintain
 * backward compatibility with older events.  Those other values help us
 * better normalize spin speed.  Example of what the browsers provide:
 *
 *                          | event.wheelDelta | event.detail
 *        ------------------+------------------+--------------
 *          Safari v5/OS X  |       -120       |       0
 *          Safari v5/Win7  |       -120       |       0
 *         Chrome v17/OS X  |       -120       |       0
 *         Chrome v17/Win7  |       -120       |       0
 *                IE9/Win7  |       -120       |   undefined
 *         Firefox v4/OS X  |     undefined    |       1
 *         Firefox v4/Win7  |     undefined    |       3
 *
 */
function normalizeWheel(event) {
  // Reasonable defaults
  const PIXEL_STEP = 10;
  const LINE_HEIGHT = 40;
  const PAGE_HEIGHT = 800;

  let sX = 0; // spinX, spinY
  let sY = 0;
  let pX = 0; // pixelX, pixelY
  let pY = 0;

  // Legacy
  if ('detail' in event) { sY = event.detail; }
  if ('wheelDelta' in event) { sY = -event.wheelDelta / 120; }
  if ('wheelDeltaY' in event) { sY = -event.wheelDeltaY / 120; }
  if ('wheelDeltaX' in event) { sX = -event.wheelDeltaX / 120; }

  // side scrolling on FF with DOMMouseScroll
  if ('axis' in event && event.axis === event.HORIZONTAL_AXIS) {
    sX = sY;
    sY = 0;
  }

  pX = sX * PIXEL_STEP;
  pY = sY * PIXEL_STEP;

  if ('deltaY' in event) { pY = event.deltaY; }
  if ('deltaX' in event) { pX = event.deltaX; }

  if ((pX || pY) && event.deltaMode) {
    if (event.deltaMode === 1) { // delta in LINE units
      pX *= LINE_HEIGHT;
      pY *= LINE_HEIGHT;
    } else { // delta in PAGE units
      pX *= PAGE_HEIGHT;
      pY *= PAGE_HEIGHT;
    }
  }

  // Fall-back if spin cannot be determined
  if (pX && !sX) { sX = (pX < 1) ? -1 : 1; }
  if (pY && !sY) { sY = (pY < 1) ? -1 : 1; }

  return {
    spinX: sX,
    spinY: sY,
    pixelX: pX,
    pixelY: pY,
  };
}

export default class Input {
  constructor(container) {
    this._container = container;

    this._startPinchScale = null;
    this._pinchScale = null;
    this._pinchPosition = null;

    this._mousePosition = null;

    this._dragInfo = null; // other objects can attach data to this
    this._finishedDrags = [];

    this._finishedClicks = [];
    this._finishedPresses = [];

    this._finishedKeyPresses = [];

    this._wheelDelta = 0;

    this._swipes = [];

    document.addEventListener('keydown', (event) => {
      this._finishedKeyPresses.push(event);
    });

    container.addEventListener('mousemove', (event) => {
      this._mousePosition = this.relativePosition(event.clientX, event.clientY);
    });

    container.addEventListener('wheel', (event) => {
      this._wheelDelta += normalizeWheel(event).spinY;
      event.preventDefault();
    });

    const hammer = new Hammer(container);

    // let the pan gesture support all directions.
    // this will block the vertical scrolling on a touch-device while on the element
    hammer.get('pan').set({
      direction: Hammer.DIRECTION_ALL,
      threshold: 0,
    });

    hammer.get('press').set({
      time: 0,
    });

    hammer.get('pinch').set({ enable: true });

    hammer.on('press', (event) => {
      // prevent mouse move event
      event.preventDefault();
      const info = this.relativePosition(event.center.x, event.center.y);
      // press event only firest on left mouse click
      info.button = 0;
      // add keyboard modifiers
      info.shiftKey = event.srcEvent.shiftKey;
      this._finishedPresses.push(info);
    });

    hammer.on('tap', (event) => {
      // prevent mouse move event
      event.preventDefault();
      const info = this.relativePosition(event.center.x, event.center.y);
      // tap event only fires on left mouse click
      info.button = 0;
      // add keyboard modifiers
      info.shiftKey = event.srcEvent.shiftKey;
      this._finishedClicks.push(info);
    });

    hammer.on('swipeleft', (/* event */) => {
      this._swipes.push('left');
    });

    hammer.on('swiperight', (/* event */) => {
      this._swipes.push('right');
    });

    hammer.on('panstart', (event) => {
      if (!this._dragInfo) {
        // start of drag
        this._dragInfo = {
          touch: true,
          startPosition: this.relativePosition(event.center.x, event.center.y),
        };
      }
    });

    hammer.on('panend', (event) => {
      if (this._dragInfo && this._dragInfo.touch) {
        // end of drag
        const endPosition = this.relativePosition(event.center.x, event.center.y);
        this._dragInfo.endPosition = endPosition;
        this._finishedDrags.push(this._dragInfo);
        this._dragInfo = null;
      }
    });

    hammer.on('pan', (event) => {
      if (this._dragInfo && this._dragInfo.touch) {
        this._dragInfo.currentPosition = this.relativePosition(event.center.x, event.center.y);
      }
    });

    hammer.on('pinchstart', (event) => {
      this._startPinchScale = 1;
      this._pinchPosition = this.relativePosition(event.center.x, event.center.y);
    });

    hammer.on('pinch', (event) => {
      this._pinchScale = event.scale;
    });

    hammer.on('pinchend', (/* event */) => {
      this._startPinchScale = null;
      this._pinchScale = null;
    });
  }

  relativePosition(x, y) {
    // see comments in http://www.html5canvastutorials.com/advanced/html5-canvas-mouse-coordinates/
    const rect = this._container.getBoundingClientRect();
    return {
      x: Math.round((x - rect.left) / (rect.right - rect.left) * this._container.clientWidth),
      y: Math.round((y - rect.top) / (rect.bottom - rect.top) * this._container.clientHeight),
      absoluteX: x,
      absoluteY: y,
      normalisedX: ((x - rect.left) / (rect.right - rect.left)) * 2 - 1,
      normalisedY: ((y - rect.top) / (rect.bottom - rect.top)) * 2 - 1,
    };
  }

  popPinchScale() {
    if (this._startPinchScale && this._pinchScale) {
      const ret = this._pinchScale / this._startPinchScale;
      this._startPinchScale = this._pinchScale;
      return {
        scale: ret,
        position: this._pinchPosition,
      };
    }
    return null;
  }

  mousePosition() {
    return this._mousePosition;
  }

  currentDragInfo() {
    return this._dragInfo;
  }

  popFinishedClicks() {
    const ret = this._finishedClicks;
    this._finishedClicks = [];
    return ret;
  }

  popFinishedPresses() {
    const ret = this._finishedPresses;
    this._finishedPresses = [];
    return ret;
  }

  popFinishedKeyPresses() {
    const ret = this._finishedKeyPresses;
    this._finishedKeyPresses = [];
    return ret;
  }

  popFinishedDrags() {
    const ret = this._finishedDrags;
    this._finishedDrags = [];
    return ret;
  }

  popWheelDelta() {
    const ret = this._wheelDelta;
    this._wheelDelta = 0;
    return ret;
  }

  popSwipes() {
    const ret = this._swipes;
    this._swipes = [];
    return ret;
  }
}

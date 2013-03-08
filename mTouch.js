/*global window,setInterval,clearInterval,console*/

(function (w) {
    "use strict";

    var options, helpers, handlers;

    options = {

        /**
         * Touch wrapper element class.
         * @type {String}
         */
        touchWrapperElem: 'js-mtw',

         /**
         * Content wrapper element id.
         * This element will be `shifting` over navigation.
         * @type {String}
         */
        contentWrapperElem: 'js-mtcw',

        /**
         * Navigation toggle button id.
         * @type {String}
         */
        navigationToggleButton: 'js-mtnb',

         /**
         * Element on which touch event handlers will listen to.
         * @type {HTMLDocument}
         */
        elemEventHandler: w.document,

         /**
         * Maximum indentation shift (in pixels).
         * @type {Number}
         */
        maxNavIndentation: 550,

         /**
         * Step for animating navigation (in pixels).
         * @type {Number}
         */
        indentationAnimationStep: 10,

         /**
         * Allowed directions for each handler.
         * @type {Object}
         */
        allowedHandlerDirections: {
            'onNavigationSwipe': ['left', 'right'],
            'onOverthrowSwipe': ['up', 'down']
        },

        /**
         * Pointer to Window object.
         * @type {Object}
         */
        w: w,

        /**
         * Pointer to Window.document object.
         * @type {HTMLDocument}
         */
        doc: w.document,

        /**
         * Indicates whether a document recognizes touches or not.
         * @type {Boolean}
         */
        docRecognizesTouches: w.document.ontouchmove !== undefined
    };

    helpers = {
        /**
         * Handler name for touch start event.
         * @type {String}
         */
        startingTouchHandlerName: "",

        /**
         * Indicates whether a touch is currently running.
         * @type {Boolean}
         */
        touchInProgress: false,

        /**
         * Current navigation indentation.
         * Initialized to 0, so the navigation is initially closed.
         */
        curNavIndentation: 0,

        /**
         * Keeper of intervals.
         * @type {id_of_setinterval}
         */
        timeKeeper: null,


        /**
         * Content wrapper element.
         * This element will be `shifting` above the navigation element.
         * @type {[type]}
         */
        contentWrapperElem: options.w.document.getElementById(options.contentWrapperElem),

        /**
         * Intercept any throw in progress.
         */
        interceptTimer: function () {
            clearInterval(helpers.timeKeeper);
        },

        /**
         * Finds the closest touch wrapper element,
         * if there is no such, <#html> element is returned.
         * @param  {HTMLElement} target
         * @return {HTMLElement}
         */
        getTouchWrapper: function (target) {
            var tgt = target;
            while (!(tgt.className && tgt.className.indexOf(options.touchWrapperElem) > -1 && tgt)) {
                if (tgt.parentNode === null) {
                    return tgt;
                }

                tgt = tgt.parentNode;
            }

            return tgt;
        },

        /**
         * Calculates the angle between two points.
         * @param  {Number} dx Difference between start point x1 and end point x2
         * @param  {Number} dy Difference between start point y1 and end point y2
         * @return {Number} Angle in radians
         */
        getAngle: function (dx, dy) {
            return Math.atan2(dy, dx);
        },

        /**
         * Gets the directions of the current angle.
         * @param  {Number} angle Angle in radians
         * @return {String} Direction identifier
         */
        getTouchDirection: function (angle) {
            var touchDirection = 'unknown'; // init value
            if (angle > 2.8 || angle < -2.8) {
                touchDirection = 'right';
            } else if (angle < 0.35 && angle > -0.35) {
                touchDirection = 'left';
            } else if (angle > 1.26 && angle < 1.89) {
                touchDirection = 'up';
            } else if (angle < -1.26 && angle > -1.89) {
                touchDirection = 'down';
            }

            return touchDirection;
        },

        /**
         * Checks whether a current direction is present (and thus allowed) in allowedChanges object.
         * @param  {String}  currentDirection Current direction identifier.
         * @param  {Array}  allowedChanges Array containing all allowed directions identifiers.
         * @return {Boolean}
         */
        isAllowedDirection: function (currentDirection, allowedChanges) {
            if (allowedChanges && allowedChanges.indexOf(currentDirection) !== -1) {
                return true;
            }

            return false;
        },

        /**
         * Wraps given touch handler with some default operations.
         * @param  {Object} handler Touch handler object to extend.
         * @return {Object} Extended touch handler object.
         */
        extendWithDefault: function (handler) {
            return {
                touchMove: function (swipeOpts, touchWrapperElem, touchStartElem, touchMoveElem) {
                    if (!helpers.touchInProgress) {
                        // initialize me on first call
                        helpers.startingTouchHandlerName = handler.name;
                    }

                    if (helpers.isAllowedDirection(swipeOpts.touchDirection,
                            options.allowedHandlerDirections[helpers.startingTouchHandlerName])) {
                        handler.touchMove(!helpers.touchInProgress, swipeOpts, touchWrapperElem, touchStartElem, touchMoveElem);
                    }

                    helpers.touchInProgress = true;
                },
                touchEnd: function (swipeOpts, touchWrapperElem, touchStartElem, touchMoveElem) {
                    if (helpers.isAllowedDirection(swipeOpts.touchDirection,
                            options.allowedHandlerDirections[helpers.startingTouchHandlerName])) {
                        handler.touchEnd(swipeOpts, touchWrapperElem, touchStartElem, touchMoveElem);
                    }

                    // initialize again for another use
                    helpers.touchInProgress = false;
                    helpers.startingTouchHandlerName = '';
                }
            };
        }
    };

    handlers = {
        /**
         * Ease-out-cubic easing (http://www.robertpenner.com/easing_terms_of_use.html).
         * @param  {int} t current iteration
         * @param  {int} b initial value
         * @param  {int} c end value
         * @param  {int} d total iterations
         */
        _eocEasing: function (t, b, c, d) {
            return c * ((t = t / d - 1) * t * t + 1) + b;
        },

        /**
         * Scrolls an element with easing.
         * @param  {Element} elem The element to scroll
         * @param  {Object} opts Desired options to scroll
         */
        _overthrow: function (elem, opts) {
            var i = 0,
                sTop = elem.scrollTop,

                // Toss defaults
                o = {
                    top: opts.top,
                    duration: opts.duration
                },
                endTop = o.top + sTop;

            helpers.timeKeeper = setInterval(function () {
                if (i++ < o.duration) {
                    elem.scrollTop = handlers._eocEasing(i, sTop, o.top, o.duration);
                } else {
                    if (endTop !== elem.scrollTop) {
                        elem.scrollTop = endTop;
                    }
                    helpers.interceptTimer();
                }
            }, 1);
        },

        /**
         * Scroll given element, depending on momentum.
         * @param  {Object} opts Touch options.
         * @param  {HTMLElement} touchWrapper Element to scroll.
         * @param  {Function} cb Callback called after the end of scrolling.
         */
        _finishScroll: function (opts, touchWrapper) {
            // Come up with a distance and duration based on how
            // Multipliers are tweaked to a comfortable balance across platforms
            var top = (opts.lastTops[0] - opts.lastTops[opts.lastTops.length - 1]) * 8,
                topAbs = Math.abs(top),
                duration = topAbs / 8;

            // Make sure there's a significant amount of throw involved, otherwise, just stay still
            if (!isNaN(duration) && duration > 0 && (topAbs > 80)) {
                handlers._overthrow(touchWrapper, { top: top, duration: duration });
            }
        },

        /**
         * Toggle content wrapper so the navigation is shown/hidden.
         * @param  {String} touchDirection
         */
        _toggleNavigation: function (touchDirection) {
            helpers.timeKeeper = setInterval(function () {
                if (touchDirection === 'right' &&
                        helpers.curNavIndentation < options.maxNavIndentation) {

                    // opening
                    helpers.curNavIndentation += options.indentationAnimationStep;
                    helpers.contentWrapperElem.style.left = helpers.curNavIndentation + 'px';
                } else if (touchDirection === 'left' &&
                        helpers.curNavIndentation > 0) {

                    // closing
                    helpers.curNavIndentation -= options.indentationAnimationStep;
                    helpers.contentWrapperElem.style.left = helpers.curNavIndentation + 'px';
                } else {
                    // make sure we have not moven it too much
                    if (helpers.curNavIndentation < 0) {
                        helpers.curNavIndentation = 0;
                    } else if (helpers.curNavIndentation > options.maxNavIndentation) {
                        helpers.curNavIndentation = options.maxNavIndentation;
                    }
                    helpers.contentWrapperElem.style.left = helpers.curNavIndentation + 'px';

                    // and reset the timer for future use
                    helpers.interceptTimer();
                }
            }, 1);
        },
        /**
         * Special handler which is called on every touch start.
         */
        onTouchStart: function () {
            helpers.interceptTimer();
        },

        /**
         * On navigation button click
         */
        onNavButtonClick: function () {
            if (helpers.curNavIndentation === 0) {
                handlers._toggleNavigation('right');
            } else {
                handlers._toggleNavigation('left');
            }
        },

        /**
         * Navigation swipe event handler
         * @return {Object}
         */
        onNavigationSwipe: (function () {
            // remember some closures
            var onNavigationSwipe = {},
                prevNavIndentation = 0, // remember last navigation indentation

                moveNavigation = function (newIndentation) {
                    // update only on change
                    if (newIndentation !== prevNavIndentation) {
                        prevNavIndentation = newIndentation; // update previous nav indentation
                        helpers.contentWrapperElem.style.left = newIndentation + 'px';
                    }
                };

            onNavigationSwipe.name = 'onNavigationSwipe';
            onNavigationSwipe.touchMove = function (firstTimeCall, swipeOpts) {
                helpers.disableSwipeUp = true;
                helpers.disableSwipeDown = true;

                helpers.curNavIndentation -= swipeOpts.dx;
                if (helpers.curNavIndentation < 0) {
                    // do not allow negative indentation
                    helpers.curNavIndentation = 0;
                }

                moveNavigation(helpers.curNavIndentation);
            };
            onNavigationSwipe.touchEnd = function (swipeOpts) {
                handlers._toggleNavigation(swipeOpts.touchDirection);
                if (helpers.curNavIndentation === 0) {
                    // navigation is closed
                    helpers.disableSwipeUp = false;
                    helpers.disableSwipeDown = false;
                }
            };

            return helpers.extendWithDefault(onNavigationSwipe);
        }()),

        /**
         * Overthrow event handler.
         * @return {Object}
         */
        onOverthrowSwipe: (function () {
            // remember some closures
            var overthrowOpts = {},
                onOverthrowSwipe = {},

                initializeMe = function () {
                    overthrowOpts = {};
                    overthrowOpts.lastTops = [];
                },

                // For a new gesture, or change in direction, reset the values from last scroll
                resetVerticalTracking = function (opts) {
                    opts.lastTops = [];
                    opts.lastDown = null;
                };

            onOverthrowSwipe.name = 'onOverthrowSwipe';
            onOverthrowSwipe.touchMove = function (firstTimeCall, swipeOpts, touchWrapperElem, touchStartElem, touchMoveElem) {
                if (firstTimeCall) {
                    // touch move is called for the first time,
                    // remember some closures on first call so it
                    // would not be necessary to compute them on each call
                    overthrowOpts.startY = touchStartElem.touches[0].pageY;
                    overthrowOpts.scrollT = touchWrapperElem.scrollTop;
                    overthrowOpts.scrollHeight = touchWrapperElem.scrollHeight;

                    resetVerticalTracking(overthrowOpts);
                }

                var ty = overthrowOpts.scrollT + overthrowOpts.startY - touchMoveElem.touches[0].pageY,
                    down = ty >= (overthrowOpts.lastTops.length ? overthrowOpts.lastTops[0] : 0);

                // if down and lastdown are not equal, the y scroll has changed direction. reset tracking.
                if (overthrowOpts.lastDown && down !== overthrowOpts.lastDown) {
                    resetVerticalTracking(overthrowOpts);
                }

                // remember the last direction in which we were headed
                // and set the container's scroll
                overthrowOpts.lastDown = down;
                touchWrapperElem.scrollTop = ty;

                overthrowOpts.lastTops.unshift(ty);

                if (overthrowOpts.lastTops.length > 3) {
                    overthrowOpts.lastTops.pop();
                }
            };
            onOverthrowSwipe.touchEnd = function (swipeOpts, touchWrapperElem, touchStartElem, touchMoveElem) {
                handlers._finishScroll(overthrowOpts, touchWrapperElem);
                initializeMe();
            };

            return helpers.extendWithDefault(onOverthrowSwipe);
        }())
    };

    /**
     * Init function.
     * @param  {Object} onTouchStart Event handler.
     * @param  {Object} onSwipeLeft Event handler.
     * @param  {Object} onSwipeUp Event handler.
     * @param  {Object} onSwipeRight Event handler.
     * @param  {Object} onSwipeDown Event handler.
     */
    (function (onTouchStart, onSwipeLeft, onSwipeUp, onSwipeRight, onSwipeDown, onNavigationButtonClick) {
        var lastX,
            lastY,
            touchWrapperElem,
            touchStartElem,
            touchMoveElem,
            swipeOpts = {},
            touchHandler,
            navToggleBtn,

            // On webkit, touch events hardly trickle through textareas and inputs
            // Disabling CSS pointer events makes sure they do, but it also makes the controls innaccessible
            // Toggling pointer events at the right moments seems to do the trick
            // Thanks Thomas Bachem http://stackoverflow.com/a/5798681 for the following
            inputs,
            setPointers = function (val) {
                var i, il;
                inputs = options.elemEventHandler.querySelectorAll("textarea, input");
                for (i = 0, il = inputs.length; i < il; i++) {
                    inputs[i].style.pointerEvents = val;
                }
            },

            touchStart = function (e) {
                touchStartElem = e;

                // Get closest touch wrapper elem
                touchWrapperElem = helpers.getTouchWrapper(touchStartElem.target);
                if (!touchWrapperElem || touchStartElem.touches.length > 1) {
                    return;
                }

                // do some initializations
                onTouchStart();

                setPointers('none');

                // last X and last Y are now equal to start X and start Y
                lastX = touchStartElem.touches[0].pageX;
                lastY = touchStartElem.touches[0].pageY;
            },

            touchMove = function (e) {
                touchMoveElem = e;

                var nx = touchMoveElem.touches[0].pageX,        // current x value
                    ny = touchMoveElem.touches[0].pageY,        // current y value
                    dx = lastX - nx,                            // delta x between current and previous x value
                    dy = lastY - ny,                            // delta x between current and previous x value
                    touchDirection = helpers.getTouchDirection(helpers.getAngle(dx, dy));

                // we will be using polyfilled overthrow
                touchMoveElem.preventDefault();

                switch (touchDirection) {
                case 'left':
                    touchHandler = onSwipeLeft;
                    break;
                case 'up':
                    touchHandler = onSwipeUp;
                    break;
                case 'right':
                    touchHandler = onSwipeRight;
                    break;
                case 'down':
                    touchHandler = onSwipeDown;
                    break;
                }

                if (touchHandler) {
                    swipeOpts.dx = dx;
                    swipeOpts.dy = dy;
                    swipeOpts.touchDirection = touchDirection;

                    touchHandler.touchMove(swipeOpts, touchWrapperElem, touchStartElem, touchMoveElem);
                }

                // update last x and y values
                lastX = nx;
                lastY = ny;
            },
            touchEnd = function () {
                if (touchHandler) {
                    touchHandler.touchEnd(swipeOpts, touchWrapperElem, touchStartElem, touchMoveElem);
                }

                // Bring the pointers back
                setPointers('auto');
                setTimeout(function () {
                    setPointers('none');
                }, 450);
            };

        if (options.docRecognizesTouches) {
            // Register touch listeners
            options.elemEventHandler.addEventListener('touchstart', touchStart, false);
            options.elemEventHandler.addEventListener('touchmove', touchMove, false);
            options.elemEventHandler.addEventListener('touchend', touchEnd, false);
        }

        navToggleBtn = options.doc.getElementById(options.navigationToggleButton);
        navToggleBtn.addEventListener('click', onNavigationButtonClick, false);

    }(handlers.onTouchStart, handlers.onNavigationSwipe, handlers.onOverthrowSwipe, handlers.onNavigationSwipe, handlers.onOverthrowSwipe, handlers.onNavButtonClick));

}(this));
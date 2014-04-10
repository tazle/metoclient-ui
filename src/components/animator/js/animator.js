"use strict";

// Requires lodash
if ("undefined" === typeof _ || !_) {
    throw "ERROR: Lodash is required for fi.fmi.metoclient.ui.animator.Animator!";
}

// Requires jQuery
if ("undefined" === typeof jQuery || !jQuery) {
    throw "ERROR: jQuery is required for fi.fmi.metoclient.ui.animator.Animator!";
}

// Requires OpenLayers
if ("undefined" === typeof OpenLayers || !OpenLayers) {
    throw "ERROR: OpenLayers is required for fi.fmi.metoclient.ui.animator.Animator!";
}

if ("undefined" === typeof OpenLayers.Layer || "undefined" === typeof OpenLayers.Layer.Animation || "undefined" === typeof OpenLayers.Layer.Animation.Utils || !OpenLayers.Layer.Animation.Utils) {
    throw "ERROR: OpenLayers.Layer.Animation.Utils is required for fi.fmi.metoclient.ui.animator.Animator!";
}

// "Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.ui = fi.fmi.metoclient.ui || {};
fi.fmi.metoclient.ui.animator = fi.fmi.metoclient.ui.animator || {};

if ("undefined" === typeof fi.fmi.metoclient.ui.animator.Factory2 || !fi.fmi.metoclient.ui.animator.Factory2) {
    throw "ERROR: fi.fmi.metoclient.ui.animator.Factory2 is required for fi.fmi.metoclient.ui.animator.Animator!";
}

if ("undefined" === typeof fi.fmi.metoclient.ui.animator.Controller || !fi.fmi.metoclient.ui.animator.Controller) {
    throw "ERROR: fi.fmi.metoclient.ui.animator.Controller is required for fi.fmi.metoclient.ui.animator.Animator!";
}

/**
 * API functions are defined in the end of the constructor as priviledged functions.
 * See API description there.
 *
 * Example:
 * (new fi.fmi.metoclient.ui.animator.Animator()).init({
 *     // Animator content is inserted into container.
 *     // Default animator element structures are used here.
 *     animatorContainerDivId : "animatorContainerId",
 *     // Configuration defines map and layers for animator.
 *     // Notice, fi.fmi.metoclient.ui.animator.Config object is also used
 *     // as a default if config is not provided. But, this is shown here
 *     // as an example. Another config object may also be provided here.
 *     // See comments in fi.fmi.metoclient.ui.animator.Config for more detailed
 *     // description of the config object.
 *     config : fi.fmi.metoclient.ui.animator.Config,
 *     // Callback is mandatory if getConfig function needs to be used.
 *     callback : function(animator, errors) {
 *         // For example, animator map object may be used after initialization.
 *         var map = animator.getFactory().getMap();
 *     }
 * });
 */
fi.fmi.metoclient.ui.animator.Animator = (function() {
    /**
     * Deep clone callback function for lodash.
     *
     * Same clone function for all the Animator instances.
     *
     * @param value Value that should be deep cloned.
     * @return Clone value. {undefined} if lodash should handle value.
     */
    function cloneDeepCallback(value) {
        var cloneValue;
        if (_.isObject(value) && _.isFunction(value.clone)) {
            cloneValue = value.clone();
        }
        return cloneValue;
    }

    /**
     * Constructor for the instance.
     *
     * Notice, this constructor is returned from {fi.fmi.metoclient.ui.animator.Animator}
     * and can be used for instantiation later.
     */
    var _constructor = function() {
        // Private variables.
        //-------------------

        // Reference to this instance object.
        var _me = this;

        // Options that contain for example div IDS.
        var _options;
        var _config;
        var _factory;

        // Coordinate time, ranges and visibility of temporally dependent layers
        var _coordinator;

        // Set when operation is going on.
        var _requestAnimationTime;

        // Keeps track of the current time.
        var _currentTime;

        // Animation listeners are added here during registration.
        var _animationEventsListeners = [];

        // Legend resize function is set to this member variable
        // when new legends are created. By using this member variable,
        // multiple functions are not set if legends are created multiple times.
        var _legendResize;

        // Keeps track of the layers that are loading data.
        // Then, progress bar can be shown accordingly.
        var _loadingLayers = [];

        // Animation controller is set here during initialization.
        var _animationController;
        // Time controller must be available to animator code so that period changes can happen
        var _timeController;
        // Resize function is set to this member variable
        // when new controller is created. By using this member variable,
        // multiple functions are not set if controllers are created multiple times.
        var _animationControllerResize;

        // List of timeouts that should be cleared
        // if reset occurs before timeouts finish.
        var _resetClearTimeouts = [];

        // OpenLayers Animation events and corresponding callbacks.
        // Animation events are forwarded to these functions.
        var _events = {
            scope : _me,
            // These are defined here to show which events are used.
            // Actual functions are set for these parameters later.
            // animationloadstarted : undefined,
            frameloadstarted : undefined,
            frameloadcomplete : undefined,
            // animationloadgroupprogress : undefined,
            // animationloadcomplete : undefined,
            // animationframecontentreleased : undefined,
            framechanged : undefined
        };

        // OpenLayers Animation layer event callbacks.
        //--------------------------------------------

        // TODO Trace functionality
        // _events.animationloadstarted = function(event) {
        //     progressbarLoadStarted(event.layer);
        //     firePause();
        //     jQuery.each(_animationEventsListeners, function(index, value) {
        //         value.loadAnimationStartedCb(event);
        //     });
        // };

        _events.frameloadstarted = function(event) {
            jQuery.each(_animationEventsListeners, function(index, value) {
                value.loadFrameStartedCb(event);
            });
        };

        _events.frameloadcomplete = function(event) {
            jQuery.each(_animationEventsListeners, function(index, value) {
                value.loadFrameCompleteCb(event);
            });
        };

        // TODO Trace functionality
        // _events.animationloadgroupprogress = function(event) {
        //     jQuery.each(_animationEventsListeners, function(index, value) {
        //         value.loadGroupProgressCb(event);
        //     });
        // };

        // TODO Trace functionality
        // _events.animationloadcomplete = function(event) {
        //     progressbarLoadComplete(event.layer);
        //     firePlay();
        //     jQuery.each(_animationEventsListeners, function(index, value) {
        //         value.loadCompleteCb(event);
        //     });
        // };

        // TODO Trace functionality
        // _events.animationframecontentreleased = function(event) {
        //     progressbarLoadComplete(event.layer);
        //     jQuery.each(_animationEventsListeners, function(index, value) {
        //         value.animationFrameContentReleasedCb(event);
        //     });
        // };

        _events.framechanged = function(event) {
            jQuery.each(_animationEventsListeners, function(index, value) {
                value.frameChangedCb(event);
            });
        };

        // Set and handle window events in this single place.
        //---------------------------------------------------

        jQuery(window).resize(function(e) {
            // Use the function wrappers if they have been set.
            if (_legendResize) {
                _legendResize();
            }
            if (_animationControllerResize) {
                _animationControllerResize();
            }
        });

        // Private functions.
        //-------------------

        /**
         * Asynchronously handles the callback and possible error situations there.
         *
         * @param {function(data, errors)} callback Callback function that is called.
         *                                          Operation is ignored if {undefined} or {null}.
         * @param [] errors Array that contains possible errors that occurred during the asynchronous flow.
         *                  May be {undefined} or {null}.
         */
        var handleCallback = function(callback, errors) {
            if (callback) {
                setTimeout(function() {
                    callback(_me, errors);
                }, 0);
            }
        };

        function updateCapabilitiesCallback() {
            var newConfig = new fi.fmi.metoclient.ui.animator.ConfigLoader(_.cloneDeep(_options.config || fi.fmi.metoclient.ui.animator.Config, cloneDeepCallback));
            
            console.log("Updated capabilities");
            fi.fmi.metoclient.ui.animator.WmsCapabilities.getDataMultiple(newConfig.getCapabilitiesUrls(), function(capabilities, errors) {
                console.log("Got capabilities update");
                if (!errors.length) {
                    // Asynchronous initialization is successful
                    newConfig.init(capabilities);

                    // TODO Extract animation data
                    // TODO Update layer ranges to coordinator
                    // TODO Update timeline (how?)
                    _config = newConfig;
                    _timeController.proposeTimePeriodChange(getBeginDate(), getEndDate(), getResolution());
                } else {
                    // TODO Report errors
                    console.error("Got async errors during config update");
                }
            });

        }

        /**
         * Callback for configuration {init} function call.
         *
         * See more details from {init} function for {options} and {errors} parameters.
         *
         * @param {Object} capabilities Capabilities object from the server.
         * @param {Array} errors Array that contains possible errors that occurred during the flow.
         */
        function configInitCallback(capabilities, errors) {
            // Create structure only if initialization was a total success.
            if (errors && errors.length) {
                // Inform that animation structure is not created at all.
                // Just highlight this by showing text in a console.
                // Callback itself passes the errors.
                if ("undefined" !== typeof console && console) {
                    console.error("ERROR: Animator config init errors. Animation is not created!");
                }

            } else {
                // Asynchronous initialization is successful
                console.log("Got data");
                _config.init(capabilities);

                // Hide the progressbar.
                jQuery(".animatorLoadProgressbar").hide();

                _factory = new fi.fmi.metoclient.ui.animator.Factory2(_config);
                var layers = _factory.getLayers();
                var controllableLayers = _.filter(layers, function(l) {return l.setTime && l.setRange;});

                var constraints = _factory.getConstraints();
                var availableRanges = _factory.getAvailableRanges();

                _coordinator = new OpenLayers.Layer.Animation.LayerGroupCoordinator(controllableLayers, constraints, availableRanges);

                // Use options and configuration object to set map and layers.
                setMapAndLayers();

                // Create slider. Notice, this will set itself according to the options.
                createController();
            }

            // Handle callback after asynchronous initialization.
            handleCallback(_options.callback, errors);
            
            console.log("Caps", _config.getCapabilities(), _config.getConfig().updateCapabilities);
            if (_config.getCapabilities().length && _config.getConfig().updateCapabilities) {
                console.log("Scheduling GetCapabilities updates");
                // GetCapabilities in use and updates requested, schedule updates
                setTimeout(function() { // TODO Switch back to setIntervaland 60 second after initial testing
                    updateCapabilitiesCallback();
                }, 3000);
            }
        }

        // Utils functions.
        //-----------------

        /**
         * Create debounce function from the given function.
         *
         * @param {Function} f Function for debounce.
         *                     May be {undefined} or {null}.
         * @return {Function} Debounce function.
         *                    May be {undefined} if {f} is not a function.
         */
        function createDebounce(f) {
            var debounce;
            if (_.isFunction(f)) {
                debounce = _.debounce(f, 10, {
                    maxWait : 100
                });
            }
            return debounce;
        }

        // Functions that handle events.
        //------------------------------

        /**
         * Update progressbar after layer has started loading.
         *
         * @param {OpenLayers.Layer} layer Layer that has started loading.
         *                                 May be {undefined} or {null}.
         */
        function progressbarLoadStarted(layer) {
            if (layer && -1 === jQuery.inArray(layer, _loadingLayers)) {
                if (!_loadingLayers.length) {
                    // First layer to start loading.
                    // So, start showing progressbar.
                    jQuery(".animatorLoadProgressbar").show();
                }
                // Layer was not in the loading array yet.
                _loadingLayers.push(layer);
            }
        }

        /**
         * Update progressbar after layer has completed loading.
         *
         * @param {OpenLayers.Layer} layer Layer that has completed loading.
         *                                 May be {undefined} or {null}.
         */
        function progressbarLoadComplete(layer) {
            if (layer && _loadingLayers.length) {
                var layerIndex = jQuery.inArray(layer, _loadingLayers);
                if (-1 !== layerIndex) {
                    // Remove layer from loading layers array.
                    _loadingLayers.splice(layerIndex, 1);
                    if (!_loadingLayers.length) {
                        // No loading layers left.
                        // So, stop showing progressbar.
                        jQuery(".animatorLoadProgressbar").hide();
                    }
                }
            }
        }

        // Functions that provide animation default initialization values.
        //----------------------------------------------------------------

        /**
         * @return {Date} Begin date should be gotten from the configuration.
         *                Otherwise, {undefined}.
         */
        function getBeginDate() {
            return _config.getAnimationBeginDate();
        }

        /**
         * @return {Date} Begin date should be gotten from the configuration.
         *                Otherwise, {undefined}.
         */
        function getEndDate() {
            return _config.getAnimationEndDate();
        }

        /**
         * @return {Integer} Animation resolution should be gotten from the configuration.
         *                   Otherwise, {undefined}.
         */
        function getResolution() {
            return _config.getAnimationResolution();
        }

        /**
         * @return {Date} The forecast begin date for the whole animation.
         *                May not be {undefined}.
         */
        function getForecastBeginDate() {
            return _config.getForecastBeginDate();
        }

        // UI component handler functions.
        //--------------------------------

        function setPlayAndPause() {
            if (_options) {
                // Add play and pause button handler.
                // Flag to keep drag if pause or play should be used.
                var playCtrl = jQuery("#" + _options.playAndPauseDivId);
                if (playCtrl.length) {
                    playCtrl.click(function() {
                        if (_requestAnimationTime !== undefined) {
                            firePause();

                        } else {
                            firePlay();
                        }
                    });
                }
                // Initialize image.
                // Notice, pause and play actions update images in those functions.
                setPlayAndPauseImage();
            }
        }

        function setPlayAndPauseImage() {
            if (_options) {
                var playCtrl = jQuery("#" + _options.playAndPauseDivId);
                if (playCtrl.length) {
                    // Switch the background image between pause and play.
                    var currentImage = playCtrl.css("background-image");
                    if (_requestAnimationTime !== undefined) {
                        currentImage = currentImage.replace("play.png", "pause.png");
                        playCtrl.css("background-image", currentImage);

                    } else {
                        currentImage = currentImage.replace("pause.png", "play.png");
                        playCtrl.css("background-image", currentImage);
                    }
                }
            }
        }

        // Controller functions that call registered listener functions.
        //--------------------------------------------------------------

        function changeToNextFrame() {
            if (_currentTime === undefined) {
                _currentTime = getBeginDate().getTime();

            } else {
                var deltaTime = getResolution();
                _currentTime = _currentTime + deltaTime > getEndDate().getTime() ? getBeginDate().getTime() : _currentTime + deltaTime;
            }

            _coordinator.setTime(new Date(_currentTime));
        }

        function changeToPreviousFrame() {
            if (_currentTime === undefined) {
                _currentTime = getBeginDate().getTime();

            } else {
                var deltaTime = getResolution();
                _currentTime = _currentTime - deltaTime < getBeginDate().getTime() ? getEndDate().getTime() : _currentTime - deltaTime;
            }

            _coordinator.setTime(new Date(_currentTime));
        }

        /**
         * Inform listeners about the period change.
         */
        function fireTimePeriodChanged(startTime, endTime, resolution, listeners) {

            // TODO Calculate new available ranges, new constraints and update _coordinator

            jQuery.each(listeners, function(index, value) {
                value.timePeriodChanged(startTime, endTime, resolution);
            });
        }

        /**
         * Inform listeners that new time is selected.
         */
        function fireSelectedTimeChanged(time, listeners) {
            // TODO Throttle this
            // TODo Only fire setTime and listeners if time actually changed?

            // Because time change is proposed from outside.
            // Also, make sure animation is updated accordingly.
            _currentTime = time instanceof Date ? time.getTime() : time;

            _coordinator.setTime(new Date(_currentTime));
            jQuery.each(listeners, function(index, value) {
                value.selectedTimeChanged(time);
            });
        }

        /**
         * Animation should be started.
         */
        function firePlay() {
            if (_requestAnimationTime === undefined) {
                _requestAnimationTime = new Date();
                setPlayAndPauseImage();
                // Start to play animation.
                playAnimation();
            }
        }

        /**
         * Animation should be paused.
         */
        function firePause() {
            if (_requestAnimationTime !== undefined) {
                _requestAnimationTime = undefined;
                setPlayAndPauseImage();
            }
        }

        /**
         * Handle animation loop until stopped by events.
         *
         * See, {firePlay} and {firePause} functions.
         */
        function playAnimation() {
            if (_requestAnimationTime !== undefined && _config) {
                // Loop this until stopped
                requestAnimationFrame(playAnimation);
                // Request animation loops at certain vague frame rate.
                // The requestAnimationFrame loops at time periods that are not
                // really exact. It may be at around 60 fps but may also be much less.
                var currentDate = new Date();
                if (_requestAnimationTime.getTime() + _config.getAnimationFrameRate() < currentDate.getTime()) {
                    // Reset counter because time has passed or animation flow has just been started.
                    _requestAnimationTime = currentDate;
                    // Show next frame, as long as animation is going on.
                    // This will call animation layers and callback will inform controller.
                    changeToNextFrame();
                }
            }
        }

        /**
         * Show next frame of the animation.
         */
        function fireNextFrame() {
            // Trigger event for animator.
            // Notice, when animator handles the event, it also gives the callback event back.
            // Then, the flow automatically continues also here.
            firePause();
            changeToNextFrame();
        }

        /**
         * Show previous frame of the animation.
         */
        function firePreviousFrame() {
            // Trigger event for animator.
            // Notice, when animator handles the event, it also gives the callback event back.
            // Then, the flow automatically continues also here.
            firePause();
            changeToPreviousFrame();
        }

        // Functions to create and to set components for UI.
        //--------------------------------------------------

        /**
         * Fetch legend content from the server and set it into the UI element.
         *
         * @param contentContainer Container into which content is inserted.
         * @param view The element that is used to show selected legend in a bigger dimensions.
         * @param legendInfoObject Object that contains legend information properties.
         * @param select Flag to inform if legend should be set selected.
         */
        function fetchLegendContent(contentContainer, view, legendInfoObject, select) {
            var item = jQuery('<div class="scroll-content-item ui-widget-header"></div>');
            item.css("background-image", "url('" + legendInfoObject.url + "')");
            // Notice, selected class may change the size of the border larger.
            // Therefore, add class before counting container dimensions below.
            if (select) {
                item.addClass("selectedLegend");
                // Set the thumbnail image to view for bigger area.
                view.css("background-image", item.css("background-image"));
            }
            // Content container width is zero before first element is included in it.
            // Initial container width is increased a little bit here. Then, container
            // width has some flexibility in it and it is wide enough for floating elements
            // in all cases.
            var prevContentContainerWidth = contentContainer.width() || 2;
            // Append item to container before checking widths.
            // Then, width query gives a proper result for new dimensions.
            contentContainer.append(item);
            // Make sure content container is wide enough.
            var minWidth = prevContentContainerWidth + item.outerWidth(true);
            if (contentContainer.width() < minWidth) {
                // Update the container width to match the content.
                // Then, float does not change the line for item.
                contentContainer.width(minWidth);
            }
            item.click(function(event) {
                if (!item.hasClass("selectedLegend")) {
                    // Remove possible other selections.
                    jQuery(".scroll-content-item").removeClass("selectedLegend");
                    item.addClass("selectedLegend");
                    // Set the thumbnail image to view for bigger area.
                    view.css("background-image", item.css("background-image"));
                }
            });
        }

        /**
         * Create legend slider components for legend thumbnails.
         */
        function createLegendSlider() {
            // scrollpane parts
            var scrollPane = jQuery(".scroll-pane");
            var scrollContent = jQuery(".scroll-content");

            // Make sure that content width is always at least the outer width of the pane.
            // Then, floating works properly when window is resized and dimensions change.
            if (scrollContent.width() < scrollPane.outerWidth(true)) {
                scrollContent.width(scrollPane.outerWidth(true));
            }

            // build slider
            var scrollbar = jQuery(".scroll-bar").slider({
                slide : function(event, ui) {
                    if (scrollContent.width() > scrollPane.width()) {
                        scrollContent.css("margin-left", Math.round(ui.value / 100 * (scrollPane.width() - scrollContent.width())) + "px");

                    } else {
                        scrollContent.css("margin-left", 0);
                    }
                }
            });

            // append icon to handle
            var handleHelper = scrollbar.find(".ui-slider-handle").mousedown(function() {
                scrollbar.width(handleHelper.width());
            }).mouseup(function() {
                scrollbar.width("100%");
            }).append("<span class='ui-icon ui-icon-grip-dotted-vertical'></span>").wrap("<div class='ui-handle-helper-parent'></div>").parent();

            // change overflow to hidden now that slider handles the scrolling
            scrollPane.css("overflow", "hidden");

            // Reset slider value based on scroll content position.
            var resetValue = function() {
                var remainder = scrollPane.width() - scrollContent.width();
                if (remainder > 0) {
                    remainder = 0;
                }
                var leftVal = scrollContent.css("margin-left") === "auto" ? 0 : parseInt(scrollContent.css("margin-left"), 10);
                var percentage = !remainder ? 0 : Math.round(leftVal / remainder * 100);
                scrollbar.slider("value", percentage);
            };

            // If the slider is 100% and window gets larger, reveal content.
            // Also, scale content if window is resized in any case.
            var reflowContent = function() {
                if (scrollContent.width() > scrollPane.width()) {
                    var showing = scrollContent.width() + parseInt(scrollContent.css("margin-left"), 10);
                    var gap = scrollPane.width() - showing;
                    if (gap > 0) {
                        scrollContent.css("margin-left", (parseInt(scrollContent.css("margin-left"), 10) + gap) + "px");
                    }

                } else {
                    scrollContent.css("margin-left", 0);
                }
            };

            // Size scrollbar and handle proportionally to scroll distance.
            var sizeScrollbar = function() {
                var remainder = scrollContent.width() - scrollPane.width();
                if (remainder < 0) {
                    remainder = 0;
                }
                var proportion = remainder / scrollContent.width();
                var handleSize = scrollPane.width() - (proportion * scrollPane.width());
                scrollbar.find(".ui-slider-handle").css({
                    width : Math.floor(handleSize),
                    "margin-left" : -Math.floor(handleSize / 2)
                });
                handleHelper.width(Math.floor(scrollbar.width() - handleSize));
            };

            // Define new resize function because new slider is initialized.
            // Member variable is used to avoid multiple resizes if slider is recreated.
            // Use debounce to limit frequency of component redraw operations.
            _legendResize = createDebounce(function() {
                // Change handle position on window resize.
                resetValue();
                reflowContent();
                sizeScrollbar();
            });

            // Init scrollbar size.
            // Safari wants a timeout.
            var sizeScrollbarTimeout = setTimeout(function() {
                sizeScrollbar();
                _resetClearTimeouts.splice(_resetClearTimeouts.indexOf(sizeScrollbarTimeout), 1);
                sizeScrollbarTimeout = undefined;
            }, 10);
            _resetClearTimeouts.push(sizeScrollbarTimeout);
        }

        /**
         * Initialize legend slider for legend thumbnails.
         *
         * Notice, slider should be initialized only after thumbnails content is already in its place.
         */
        function initLegendSlider() {
            // Create the actual slider component.
            // Notice, the window resize listener has already been set during animator construction.
            createLegendSlider();
        }

        /**
         * Set legends corresponding to the given layers.
         *
         * @param {String} legendDivId Identifier for legend container.
         * @param {[]} Array of layers for legends.
         */
        function setLegend(legendDivId, layers) {
            if (legendDivId) {
                var i;
                var j;
                var layer;
                var legendInfo;
                var infoObject;
                var legendView;
                var legend = jQuery("#" + legendDivId);
                // Make sure element is empty before appending possible new content.
                legend.empty();
                // Check if there are any legends configured.
                var legendCount = 0;
                for ( i = 0; i < layers.length; ++i) {
                    layer = layers[i];
                    // Check that layer provides legend info getter.
                    // All of the layers may not be animation layers.
                    if (layer.getVisibility() && layer.getLegendInfo) {
                        legendInfo = layer.getLegendInfo();
                        for ( j = 0; j < legendInfo.length; ++j) {
                            infoObject = legendInfo[j];
                            if (infoObject.hasLegend) {
                                // At least one layer has some URL set for legend.
                                ++legendCount;
                            }
                        }
                    }
                }
                if (!legendCount) {
                    // There is no legend available.
                    // Set the corresponding classes for animation and legend elements.
                    legend.addClass("animatorLegendNoLegend");
                    if (_options.animationDivId) {
                        jQuery("#" + _options.animationDivId).addClass("animatorAnimationNoLegend");
                    }

                } else if (1 === legendCount) {
                    // Make sure possible previously set different state classes are removed.
                    legend.removeClass("animatorLegendNoLegend");
                    if (_options.animationDivId) {
                        // Legends div is available. So, make sure legend div is shown.
                        jQuery("#" + _options.animationDivId).removeClass("animatorAnimationNoLegend");
                    }
                    // There is only one legend.
                    // Set the corresponding classes for animation and legend elements.
                    legendView = jQuery('<div class="animatorLegendView animatorLegendViewOne"></div>');
                    legend.append(legendView);
                    // Set the one legend as background image for the view.
                    for ( i = 0; i < layers.length; ++i) {
                        layer = layers[i];
                        // Check that layer provides legend info getter.
                        // All of the layers may not be animation layers.
                        if (layer.getVisibility() && layer.getLegendInfo) {
                            legendInfo = layer.getLegendInfo();
                            for ( j = 0; j < legendInfo.length; ++j) {
                                infoObject = legendInfo[j];
                                if (infoObject.hasLegend) {
                                    legendView.css("background-image", "url('" + infoObject.url + "')");
                                    // There can be only one.
                                    break;
                                }
                            }
                        }
                    }

                } else {
                    // Make sure possible previously set different state classes are removed.
                    legend.removeClass("animatorLegendNoLegend");
                    if (_options.animationDivId) {
                        // Legends div is available. So, make sure legend div is shown.
                        jQuery("#" + _options.animationDivId).removeClass("animatorAnimationNoLegend");
                    }
                    // Some legends are available. So, create legend components.
                    var legendThumbnails = jQuery('<div class="animatorLegendThumbnails"></div>');
                    legendThumbnails.append('<div class="scroll-pane ui-widget ui-widget-header ui-corner-all"><div class="scroll-content"></div><div class="scroll-bar-wrap ui-widget-content ui-corner-bottom"><div class="scroll-bar"></div></div></div>');
                    legend.append(legendThumbnails);
                    legendView = jQuery('<div class="animatorLegendView"></div>');
                    legend.append(legendView);
                    var contentContainer = jQuery(".scroll-content");
                    var firstSelected = false;
                    for ( i = 0; i < layers.length; ++i) {
                        layer = layers[i];
                        // Check that layer provides legend info getter.
                        // All of the layers may not be animation layers.
                        if (layer.getVisibility() && layer.getLegendInfo) {
                            legendInfo = layer.getLegendInfo();
                            for ( j = 0; j < legendInfo.length; ++j) {
                                infoObject = legendInfo[j];
                                if (infoObject.hasLegend) {
                                    fetchLegendContent(contentContainer, legendView, infoObject, !firstSelected);
                                    firstSelected = true;
                                }
                            }
                        }
                    }
                    // Initialize slider for legend after items have been inserted there.
                    initLegendSlider();
                }

            } else if (_options.animationDivId) {
                // Legends div is not available. So, use the whole area for animation.
                jQuery("#" + _options.animationDivId).addClass("animatorAnimationNoLegend");
            }
        }

        /**
         * Set animation legend event listener for animation layers.
         *
         * @param {[]} Array of layers for legends.
         */
        function setAnimationLegendEventListener(layers) {
            // Notice, legends are available only after animation layer load is started.
            // Depending on the configuration, loading may be started when animation layer
            // is added to the map. Then, loading is started asynchronously.
            if (_options.legendDivId) {
                var legendTimeout;
                var legendEventHandler = function(event) {
                    // TODO *Why?*
                    // Use small timeout to make sure legends are not set too close to each other
                    // if multiple actions of same kind are started in a group.
                    if (undefined === legendTimeout) {
                        legendTimeout = setTimeout(function() {
                            setLegend(_options.legendDivId, layers);
                            _resetClearTimeouts.splice(_resetClearTimeouts.indexOf(legendTimeout), 1);
                            legendTimeout = undefined;
                        }, 100);
                        _resetClearTimeouts.push(legendTimeout);
                    }
                };
                var events = {
                    visibilitychanged : legendEventHandler,
                    added : legendEventHandler,
                    removed : legendEventHandler
                };
                for (var i = 0; i < layers.length; ++i) {
                    var layer = layers[i];
                    // Check that layer provides legend info getter.
                    // All of the layers may not be animation layers.
                    if (layer.events && layer.getLegendInfo) {
                        // Register to listen animation legend related events.
                        layer.events.on(events);
                    }
                }
            }
        }

        /**
         * Set OpenLayers layer switcher.
         */
        function setupSwitcher(map, layerSwitcherDivId, maximizeSwitcher) {
            if (map) {
                var layerSwitcherOptions;
                if (layerSwitcherDivId) {
                    layerSwitcherOptions = {
                        div : OpenLayers.Util.getElement(layerSwitcherDivId)
                    };
                }

                // Create switcher by using the given options
                // that may contain div that exists outside of the map.
                var switcher = new OpenLayers.Control.LayerSwitcher(layerSwitcherOptions);

                map.addControl(switcher);

                if (!maximizeSwitcher) {
                    // Make sure switcher is minimized in the beginning.
                    switcher.minimizeControl();
                }

                // Notice, there is no need to handle maximize and minimize separately here.
                // OpenLayers handles it automatically, but .maximizeDiv and .minimizeDiv needs
                // to be set properly in css to make this work. Especially, .maximizeDiv should be
                // set properly outside of the map div to make it show.
            }
        }

        /**
         * Set layers into the map.
         */
        function setMapAndLayers() {
            if (_options.mapDivId) {
                var map = _factory.getMap();
                if (map) {
                    // Render map to its position.
                    map.render(_options.mapDivId);
                    var layers = _factory.getLayers();
                    if (layers) {
                        setAnimationLegendEventListener(layers);

                        for (var i = 0; i < layers.length; ++i) {
                            var layer = layers[i];
                            if (layer.events) {
                                // Register to listen animation events.
                                layer.events.on(_events);
                            }
                            // Add layer to map.
                            // Notice, this also starts the animation if
                            // autoload and autostart have been defined for configuration.
                            map.addLayer(layer);
                        }
                    }
                    // Zoom the map after layers have been inserted.
                    map.setCenter(map.getCenter(), _config.getDefaultZoomLevel());
                    setupSwitcher(map, _options.layerSwitcherDivId, _options.maximizeSwitcher);
                }
            }
        }

        /**
         * Remove controller from DOM.
         */
        function resetCtrl() {
            if (_animationController) {
                _animationController.remove();
                _animationController = undefined;
                _animationControllerResize = undefined;
            }
        }

        /**
         * Create controller.
         *
         * This is called from {createController} function after required checks have been done.
         *
         * @param  {Object} ctrls jQuery object for controller elements.
         *                        May not be {undefined} or {null}.
         * @param {Object} timeModel Time model that is set for controller.
         *                            May not be {undefined} or {null}.
         * @param {Object} timeController Time controller that is set for controller.
         *                                May not be {undefined} or {null}.
         * @return {fi.fmi.metoclient.ui.animator.Controller} New controller object.
         *                                                    May not be {undefined} or {null}.
         */
        function createCtrl(ctrls, timeModel, timeController) {
            var ac = new fi.fmi.metoclient.ui.animator.Controller(ctrls[0], ctrls.width(), ctrls.height());
            ac.setTimeModel(timeModel);
            ac.setTimeController(timeController);
            return ac;
        }

        /**
         * Create time controller and set it into the UI according to the options that have been set during init.
         */
        function createController() {
            if (!_options || !_options.controllerDivId || !_options.playAndPauseDivId) {
                throw "ERROR: Options or properties missing for controller!";
            }

            // Do not create controller if animation has not defined any time period for frames.
            // If no period is given, then only show currently given layers.
            if (getBeginDate() !== undefined && getEndDate() !== undefined) {
                var ctrlSelector = "#" + _options.controllerDivId;
                var ctrls = jQuery(ctrlSelector);
                if (ctrls.length) {
                    var timePeriodListeners = [];
                    var timeSelectionListeners = [];
                    var fctStartTimeListeners = [];
                    var tickIntervalListeners = [];

                    // Model is used by animation controller to setup slider according to the animation settings.
                    var timeModel = {
                        getStartTime : function() {
                            return getBeginDate().getTime();
                        },
                        getEndTime : function() {
                            return getEndDate().getTime();
                        },
                        getResolution : function() {
                            return getResolution();
                        },
                        getForecastStartTime : function() {
                            return getForecastBeginDate().getTime();
                        },
                        addTimePeriodChangeListener : function(l) {
                            timePeriodListeners.push(l);
                        },
                        addTimeSelectionChangeListener : function(l) {
                            timeSelectionListeners.push(l);
                        },
                        addAnimationEventsListener : function(l) {
                            _animationEventsListeners.push(l);
                        },
                        addForecastStartTimeChangeListener : function(l) {
                            fctStartTimeListeners.push(l);
                        },
                        addTickIntervalChangeListener : function(l) {
                            tickIntervalListeners.push(l);
                        }
                    };

                    // Animation controller may use these callback functions to inform
                    // if animation state should be changed because of the actions in the slider.
                    _timeController = {
                        proposeTimePeriodChange : function(startTime, endTime, resolution) {
                            fireTimePeriodChanged(startTime, endTime, resolution, timePeriodListeners);
                        },
                        proposeTimeSelectionChange : function(time) {
                            if ((time >= getBeginDate().getTime()) && (time <= getEndDate().getTime())) {
                                // Make sure steps are in given resolutions.
                                time = time - time % getResolution();
                                fireSelectedTimeChanged(time, timeSelectionListeners);
                            }
                        },
                        proposeNextFrame : function() {
                            fireNextFrame();
                        },
                        proposePreviousFrame : function() {
                            firePreviousFrame();
                        },
                        proposePause : function() {
                            firePause();
                        }
                    };

                    _animationController = createCtrl(ctrls, timeModel, _timeController);

                    // Bind to listen for width changes in element to update
                    // controller if necessary. Width is defined as relative
                    // in CSS but height is static.
                    var width = ctrls.width();
                    // Notice, the window resize listener has already been set during animator construction.
                    // Use debounce to limit frequency of component redraw operations.
                    _animationControllerResize = createDebounce(function() {
                        var currentWidth = jQuery(ctrlSelector).width();
                        if (currentWidth !== width) {
                            width = currentWidth;
                            // Simply replace old with a new controller.
                            _animationController.remove();
                            _animationController = createCtrl(ctrls, timeModel, _timeController);
                        }
                    });

                    setPlayAndPause();
                }
            }
        }

        /**
         * Remove animator structure from DOM.
         */
        function resetStructure() {
            if (_options) {
                // Notice, _options.animatorContainerDivId is not emptied here.
                // That element is created outside of animator and may also contain
                // some additional elements that are not part of animator. Therefore,
                // only elements that have been created by animator are removed here.
                if (_options.animatorContainerDivId) {
                    // If animator container has been defined, a default structure is used.
                    // Then, removal of the animator container will remove the whole structure.
                    // The structure is created under animator class element during initialization.
                    jQuery("#" + _options.animatorContainerDivId + " > .animator").remove();

                } else {
                    // Default structure is not used. Therefore, every element is removed separately.
                    if (_options.animationDivId) {
                        jQuery("#" + _options.animationDivId).remove();
                    }
                    if (_options.mapDivId) {
                        jQuery("#" + _options.mapDivId).remove();
                    }
                    if (_options.layerSwitcherDivId) {
                        jQuery("#" + _options.layerSwitcherDivId).remove();
                    }
                    if (_options.controllerDivId) {
                        jQuery("#" + _options.controllerDivId).remove();
                    }
                    if (_options.playAndPauseDivId) {
                        jQuery("#" + _options.playAndPauseDivId).remove();
                    }
                    if (_options.logoDivId) {
                        jQuery("#" + _options.logoDivId).remove();
                    }
                    if (_options.legendDivId) {
                        jQuery("#" + _options.legendDivId).remove();
                    }
                }
            }
        }

        /**
         * Create animation structure into DOM according to given {options} and update element IDs in {options}.
         *
         * @param {Object} options Reference to object to update ID properties for the animator elements.
         *                         May be {undefined} or {null} but then operation is ignored.
         */
        function createStructure(options) {
            if (options) {
                // Default animator element structure is used and appended into container
                // if options object provides animatorContainerDivId.
                if (options.animatorContainerDivId) {
                    // Notice, this HTML structure is given in API comments in more readable format.
                    var defaultStructure = jQuery('<div class="animator"><div class="animatorAnimation" id="animatorAnimationId"><div class="animatorMap" id="animatorMapId"><div class="animatorLogo" id="animatorLogoId"></div><div class="animatorPlayAndPause" id="animatorPlayAndPauseId"></div></div><div class="animatorController" id="animatorControllerId"></div><div class="animatorLayerSwitcher" id="animatorLayerSwitcherId"></div></div><div class="animatorLegend" id="animatorLegendId"></div></div>');
                    jQuery("#" + options.animatorContainerDivId).append(defaultStructure);
                    // Set animator IDs for options because container is given and default should be used.
                    // Notice, if options contain some of the values, they are overwritten here.
                    options.animationDivId = "animatorAnimationId";
                    options.mapDivId = "animatorMapId";
                    options.layerSwitcherDivId = "animatorLayerSwitcherId";
                    options.controllerDivId = "animatorControllerId";
                    options.playAndPauseDivId = "animatorPlayAndPauseId";
                    options.logoDivId = "animatorLogoId";
                    options.legendDivId = "animatorLegendId";
                }
                // Progress bar is included into structure here.
                // Then, it is available during asynchronous initializations.
                if (options.animationDivId) {
                    // Add progressbar element.
                    var loadProgressbar = jQuery('<div class="animatorLoadProgressbar"></div>');
                    jQuery("#" + options.animationDivId).append(loadProgressbar);
                    loadProgressbar.progressbar({
                        value : false
                    });
                    // Make sure progress bar element is hidden as default.
                    loadProgressbar.hide();
                }
            }
        }

        // Public functions for API.
        //--------------------------

        /**
         * See API for function description.
         */
        function getConfig() {
            if (_options && !_options.callback) {
                var errorStr = "ERROR: Animator init options.callback is mandatory if getConfig is used!";
                if ("undefined" !== typeof console && console) {
                    console.error(errorStr);
                }
                throw errorStr;
            }
            return _config;
        }

        /**
         * See API for function description.
         */
        function getFactory() {
            if (_options && !_options.callback) {
                var errorStr = "ERROR: Animator init options.callback is mandatory if getConfig is used!";
                if ("undefined" !== typeof console && console) {
                    console.error(errorStr);
                }
                throw errorStr;
            }
            return _factory;
        }

        /**
         * See API for function description.
         */
        function refresh() {
            // Handle refresh operation same way as window resize event.
            // Notice, jQuery does not seem to provide easy way to listen for
            // resize events targeted directly to div-elements. Therefore,
            // corresponding event is launched here by a separate call to
            // make sure all the necessary components are resized if necessary.
            jQuery(window).resize();

            // Also, make sure map is updated properly.
            if (_config) {
                var map = _factory.getMap();
                if (map) {
                    map.updateSize();
                }
            }
        }

        /**
         * See API for function description.
         */
        function reset() {
            if (_config) {
                var map = _factory.getMap();
                if (map) {
                    // Notice, map needs to be destroyed
                    // before container is removed from DOM.
                    map.destroy();
                }
            }

            // Clear possible timeouts.
            while (_resetClearTimeouts.length) {
                clearTimeout(_resetClearTimeouts.pop());
            }

            // Empty arrays.
            _animationEventsListeners = [];
            _loadingLayers = [];

            // Reset member variables.
            _requestAnimationTime = undefined;
            _currentTime = undefined;
            _legendResize = undefined;

            // Reset the DOM structure.
            resetStructure();
            resetCtrl();

            // Reset options and configurations.
            _config = undefined;
            _factory = undefined;
            _options = undefined;
        }

        /**
         * See API for function description.
         */
        function init(options) {
            if (!_options && options) {
                try {
                    // Set options and create config only once.
                    _options = options;
                    // Create animation structure for the content.
                    // Then, progressbar may be shown during asyncronous initializations.
                    createStructure(options);
                    // Configuration object is deep cloned here.
                    // Then, if properties are changed during the flow, the content of the original object is not changed.
                    _config = new fi.fmi.metoclient.ui.animator.ConfigLoader(_.cloneDeep(options.config || fi.fmi.metoclient.ui.animator.Config, cloneDeepCallback));
                    // Start asynchronous initialization.
                    // Also, show progressbar during asynchronous operation.
                    jQuery(".animatorLoadProgressbar").show();

                    console.log("Fetching data");
                    fi.fmi.metoclient.ui.animator.WmsCapabilities.getDataMultiple(_config.getCapabilitiesUrls(), configInitCallback);
                } catch(e) {
                    // An error occurred in synchronous flow.
                    // But, inform observer about the error asynchronously.
                    // Then, flow progresses similarly through API in both
                    // error and success cases.
                    var error = e.toString();
                    if ("undefined" !== typeof console && console) {
                        console.error("ERROR: Animator init error: " + error);
                    }
                    // Make sure progressbar is not left showing.
                    jQuery(".animatorLoadProgressbar").hide();
                    // Notice, options and config are not resetted before calling callback.
                    // Then, error state remains. So, reset should be called before init
                    // is requested again.
                    handleCallback(options.callback, [error]);
                }
            }
        }

        //=================================================================
        // Public Connection API is defined here as priviledged functions.
        //=================================================================

        /**
         * Initialize animator with given options.
         *
         * Asynchronous function.
         * Therefore, {options.callback} should always be provided to follow
         * the progress of the operation even if it is not always mandatory.
         * But, {options.callback} is mandatory if {options} is given and
         * when {getConfig} function is used to highlight that asynchronous
         * configuration operations should finish before {getConfig} is
         * used.
         *
         * Notice, if animator should be reinitialized with new configuration,
         * {reset} should be called before calling {init} again.
         *
         * Default animator element structure is used and appended into container
         * if options object provides {animatorContainerDivId}.
         *
         * The default HTML structure for container content:
         *        <div class="animator">
         *            <div class="animatorAnimation" id="animatorAnimationId">
         *                <div class="animatorMap" id="animatorMapId">
         *                    <!-- Animator map here. -->
         *                    <div class="animatorLogo" id="animatorLogoId">
         *                        <!-- Animator logo here -->
         *                    </div>
         *                    <div class="animatorPlayAndPause" id="animatorPlayAndPauseId">
         *                        <!-- Animator play and pause button here -->
         *                    </div>
         *                </div>
         *                <div class="animatorController" id="animatorControllerId">
         *                    <!-- Animator controller here. -->
         *                </div>
         *                <div class="animatorLayerSwitcher" id="animatorLayerSwitcherId">
         *                    <!-- Animator map layer ctrl is inserted here.
         *                    Notice, there is no need to add maximize and minimize div separately here.
         *                    OpenLayers handles it automatically, but .maximizeDiv and .minimizeDiv needs
         *                    to be set properly in css to make this work. Especially, .maximizeDiv should be
         *                    set properly if it exists outside of the map div to make it show. Also notice,
         *                    this element is located in HTML after map div here. Then, the switcher is shown
         *                    on top of map layers if controller is located on the map area. -->
         *                </div>
         *            </div>
         *            <div class="animatorLegend" id="animatorLegendId">
         *                <!-- Animator legend here -->
         *            </div>
         *        </div>
         *
         * Notice, options may also define alternative places for some of the elements
         * if {animatorContainerDivId} is not given and an alternative HTML structure is used.
         * Element content is not inserted if {undefined}, {null}, or empty is set for ID value.
         * Also notice, if {animatorContainerDivId} is given, it will always replace other div
         * options by default values.
         *
         * Notice, callback is {function(animator, errors)}.
         *      - animator: Reference to {this} animator. Always provided.
         *      - errors: Array that contains possible errors that occurred during the flow.
         *                Array is always provided even if it may be empty.
         *
         * @param {Object} options { animatorContainerDivId: {String},
         *                           animationDivId: {String},
         *                           mapDivId: {String}, layerSwitcherDivId: {String},
         *                           controllerDivId : {String}, playAndPauseDivId : {String},
         *                           logoDivId : {String}, maximizeSwitcher: {Boolean},
         *                           legendDivId : {String},
         *                           config : {Object},
         *                           callback : {Function(animator, errors)} }
         *                         May be {undefined} or {null}. But, then initialization is ignored.
         */
        this.init = init;

        /**
         * Release existing animator content that has previously been initialized by {init}.
         *
         * Notice, animator needs to be initialized after reset by calling {init} if animator
         * should have and show new content.
         */
        this.reset = reset;

        /**
         * Refresh animator components.
         *
         * This function is provided to make sure that all the animator components, such as
         * the animation controller, are resized properly if container dimensions are changed.
         *
         * {OpenLayers.Map.updateSize} function is also automatically called to refresh the map.
         *
         * Notice, window resize is handled automatically. But, this function needs to be called
         * if animator elements are resized separately and window resize event is not launched.
         * Then, operations corresponding to window resize can be triggered by using this function.
         */
        this.refresh = refresh;

        /**
         * Getter for configuration loader API object.
         *
         * Configuration API provides getter functions for animation configurations.
         *
         * See, {fi.fmi.metoclient.ui.animator.ConfigLoader} API for more detailed description.
         *
         * Notice, {options.callback} is mandatory if {options} is given for {init} function
         * and if {getConfig} function is used. This is to highlight that asynchronous
         * configuration operations should finish before {getConfig} is used.
         *
         * @return {Object} Configuration API object.
         *                  May be {undefined} if animator has not been initialized
         *                  by calling {init}.
         */
        this.getConfig = getConfig;

        /**
         * Getter for map and layer factory API object.
         *
         * Factory API provides getter functions for OL components such as Map and Layers.
         *
         * See, {fi.fmi.metoclient.ui.animator.Factory} API for more detailed description.
         *
         * Notice, {options.callback} is mandatory if {options} is given for {init} function
         * and if {getFactory} function is used. This is to highlight that asynchronous
         * configuration operations should finish before {getFactory} is used.
         *
         * @return {Object} Factory API object.
         *                  May be {undefined} if animator has not been initialized
         *                  by calling {init}.
         */
        this.getFactory = getFactory;

    };

    // Constructor function is returned for later instantiation.
    return _constructor;

})();

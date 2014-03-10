"use strict";

// Requires lodash
if ("undefined" === typeof _ || !_) {
    throw "ERROR: Lodash is required for fi.fmi.metoclient.ui.animator.Animator!";
}

// Requires OpenLayers
if ( typeof OpenLayers === "undefined" || !OpenLayers) {
    throw "ERROR: OpenLayers is required for fi.fmi.metoclient.ui.animator.Factory!";
}

// "Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.ui = fi.fmi.metoclient.ui || {};
fi.fmi.metoclient.ui.animator = fi.fmi.metoclient.ui.animator || {};

if ("undefined" === typeof fi.fmi.metoclient.ui.animator.WmsCapabilities || !fi.fmi.metoclient.ui.animator.WmsCapabilities) {
    throw "ERROR: fi.fmi.metoclient.ui.animator.WmsCapabilities is required for fi.fmi.metoclient.ui.animator.Factory!";
}

/**
 * This configuration factory provides the configuration map
 * and layer objects that the framework uses for OpenLayers.
 *
 * Example:
 * // Notice, configuration object may need to be deep cloned to make sure
 * // factory does not change content of the original config object properties.
 * var config = new fi.fmi.metoclient.ui.animator.Factory(
 *                      _.cloneDeep(fi.fmi.metoclient.ui.animator.Config, cloneDeepCallback));
 * // Start asynchronous initialization.
 * config.init(function(factory, errors) {
 *     // Initialization ready.
 * });
 */
fi.fmi.metoclient.ui.animator.Factory = (function() {

    /**
     * @private
     *
     * Floor the given date to the given resolution.
     *
     * @param {Date} date Date object whose value is floored.
     *                    Operation is ignored if {undefined} or {null}
     * @param {Integer} resolution Resolution that the date should be floored to.
     *                             Operation is ignored if {undefined}, {null}, zero or negative value.
     */
    function floorDate(date, resolution) {
        // TODO Move date manipulation to a utility class
        if (date && resolution && resolution > 0) {
            var time = date.getTime();
            if (time !== resolution) {
                var reminder = time % resolution;
                if (reminder) {
                    time -= reminder;
                    date.setTime(time);
                }
            }
        }
    }

    /**
     * @private
     *
     * Ceil the given date to the given resolution.
     *
     * @param {Date} date Date object whose value is ceiled.
     *                    Operation is ignored if {undefined} or {null}
     * @param {Integer} resolution Resolution that the date should be ceiled to.
     *                             Operation is ignored if {undefined}, {null}, zero or negative value.
     */
    function ceilDate(date, resolution) {
        // TODO Move date manipulation to a utility class
        if (date && resolution && resolution > 0) {
            var time = date.getTime();
            if (time !== resolution) {
                var reminder = time % resolution;
                if (reminder) {
                    time += resolution - reminder;
                    date.setTime(time);
                }
            }
        }
    }


    /**
     * Constructor for new instance.
     * This function provides the public API and also contains private instance specific functionality.
     *
     * @param {Object} configuration ConfigLoader object. Must not be undefined or null.
     */
    var _constructor = function(configLoader) {
        // Private member variables.
        //--------------------------
        var _me = this;

        // Map and layer configuration object.
        var _configLoader = configLoader;

        // OpenLayers related map and layers variables.
        // See corresponding get functions below to create content.
        var _map;
        var _layers = [];

        // Private member functions.
        //--------------------------

        /**
         * Creates a constructor wrapper function that may be instantiated with {new}.
         *
         * @param {Function} constructor Constructor function.
         *                               Operation ignored if {undefined} or {null}.
         * @param {Array} args Arguments array that contains arguments that are given for the constructor.
         *                     May be {undefined} or {null}.
         * @return {Function} Wrapper function for constructor with given arguments.
         *                    This can be used with {new} to instantiate.
         *                    Notice, returned function needs to be surrounded with parentheses when {new} is used.
         *                    For example, new (constructorWrapper(constructor, args));
         */
        var constructorWrapper = function(constructor, args) {
            var wrapper;
            if (constructor) {
                var params = [constructor, constructor];
                if (args) {
                    params = params.concat(args);
                }
                wrapper = _.bind.apply(_, params);
            }
            return wrapper;
        };

        /**
         * Create instance of the class with the given class name and arguments
         *
         * @param {String} className Name of the class to be instantiated.
         *                           Operation ignored if {undefined}, {null} or empty.
         * @param {Array} args Arguments array that contains arguments that are given for the constructor.
         *                     May be {undefined} or {null}.
         * @return {Object} New Instance of the class with given arguments.
         */
        var createInstance = function(className, args) {
            var instance;
            if (className) {
                // Check namespaces of the class
                // and create function that contains possible namespaces.
                var nameArr = className.split(".");
                var constructor = (window || this);
                if (constructor) {
                    for (var i = 0, len = nameArr.length; i < len; i++) {
                        constructor = constructor[nameArr[i]];
                    }
                    if ("function" === typeof constructor) {
                        // Function was successfully created.
                        // Create instance with the given arguments.
                        // Notice, parentheses are required around wrapper function.
                        instance = new (constructorWrapper(constructor, args))();
                    }
                }
            }
            return instance;
        };


        // Public functions for API.
        // ------------------------

        /**
         * See API for function description.
         */
        function getMap() {
            var _config = _configLoader.getConfig();
            // Create map if it has not been created yet.
            if (!_map && _config && _config.map && _config.map.className) {
                var args;
                if (_config.map.args && _config.map.args.length > 0) {
                    args = _config.map.args;
                    var options = args[0];
                    if (!options.theme) {
                        // Notice! This setting should be used in all configurations,
                        // unless you really know what you are doing. Do not use default
                        // theme but own style.css instead.
                        options.theme = null;
                    }
                }
                _map = createInstance(_config.map.className, args);
            }
            return _map;
        }

        /**
         * See API for function description.
         */
        function getLayers() {
            var _config = _configLoader.getConfig();
            // Create layers only if map is available and if layers have not been created before.
            if (getMap() && _config && _config.layers && _layers.length === 0) {
                var layerConfigs = _config.layers;
                // Layer is defined outside of loop and reseted to undefined
                // inside the loop to make sure value is correct for every loop.
                var layer;
                for (var i = 0; i < layerConfigs.length; ++i) {
                    var config = layerConfigs[i];
                    // Reset layer to undefined for this loop.
                    layer = undefined;
                    if (config && config.className && config.args) {
                        // Layers are created by providing arguments list in configuration.
                        // Check from the given arguments if any of them contains animation configuration.
                        for (var j = 0; j < config.args.length; ++j) {
                            var arg = config.args[j];
                            if (arg) {
                                var animation = arg.animation;
                                if (animation) {
                                    // Check animation resolution of the layer.
                                    if (animation.resolutionTime === undefined) {
                                        // Make sure that at least a default resolution is set for animation layer.
                                        animation.resolutionTime = _configLoader.getAnimationResolution();
                                    }
                                    // Check if layer configuration has set begin and end times for animation.
                                    // If whole animation has the values but layer itself does not,
                                    // use animation values also for the layer as default.
                                    if (animation.beginTime === undefined) {
                                        animation.beginTime = _configLoader.getAnimationBeginDate();
                                    }
                                    if (animation.endTime === undefined) {
                                        animation.endTime = _configLoader.getAnimationEndDate();
                                    }
                                    if (animation.resolutionTime) {
                                        // Make sure that animation begin time of the layer is set on the correct resolution time.
                                        // This is required if layer itself has defined its own resolution instead of
                                        // using animation resolution.
                                        if (!(animation.beginTime instanceof Date)) {
                                            animation.beginTime = new Date(animation.beginTime);
                                        }
                                        floorDate(animation.beginTime, animation.resolutionTime);
                                        // Make sure that animation end time of the layer is set on the correct resolution time.
                                        // This is required if layer itself has defined its own resolution instead of
                                        // using animation resolution.
                                        if (!(animation.endTime instanceof Date)) {
                                            animation.endTime = new Date(animation.endTime);
                                        }
                                        ceilDate(animation.endTime, animation.resolutionTime);
                                    }
                                    // Use the first animation that is found from the arguments.
                                    // Therefore, no need to browse other arguments through any more.
                                    break;
                                }
                            }
                        }
                        layer = createInstance(config.className, config.args);
                    }
                    if (layer) {
                        _layers.push(layer);
                    }
                }
            }
            return _layers;
        }


        // Public config API.
        //-------------------


        /**
         * @return {OpenLayers.Map} Map for OpenLayers.
         *                          May be {undefined} or {null}. Then,
         *                          framework will not use any map and will not use layers either.
         */
        this.getMap = getMap;

        /**
         * @return [{OpenLayers.Layer}] Layer array for OpenLayers.
         *                              May not be {undefined} or {null}, but may be empty.
         */
        this.getLayers = getLayers;

    };

    // Constructor function for new instantiation.
    return _constructor;
})();

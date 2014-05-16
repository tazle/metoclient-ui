"use strict";

// Requires timestep.js
if ("undefined" === typeof timestep || !timestep) {
    throw "ERROR: timestep.js is required for fi.fmi.metoclient.ui.animator.Factory2!";
}

// Requires lodash
if ("undefined" === typeof _ || !_) {
    throw "ERROR: Lodash is required for fi.fmi.metoclient.ui.animator.Factory2!";
}

// Requires OpenLayers
if ( typeof OpenLayers === "undefined" || !OpenLayers) {
    throw "ERROR: OpenLayers is required for fi.fmi.metoclient.ui.animator.Factory2!";
}

// "Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.ui = fi.fmi.metoclient.ui || {};
fi.fmi.metoclient.ui.animator = fi.fmi.metoclient.ui.animator || {};

if ("undefined" === typeof fi.fmi.metoclient.ui.animator.WmsCapabilities || !fi.fmi.metoclient.ui.animator.WmsCapabilities) {
    throw "ERROR: fi.fmi.metoclient.ui.animator.WmsCapabilities is required for fi.fmi.metoclient.ui.animator.Factory2!";
}

/**
 * This configuration factory provides the configuration map
 * and layer objects that the framework uses for OpenLayers.
 *
 * Example:
 * // Notice, configuration object may need to be deep cloned to make sure
 * // factory does not change content of the original config object properties.
 * var config = new fi.fmi.metoclient.ui.animator.Factory2(
 *                      _.cloneDeep(fi.fmi.metoclient.ui.animator.Config, cloneDeepCallback));
 * // Start asynchronous initialization.
 * config.init(function(factory, errors) {
 *     // Initialization ready.
 * });
 */
fi.fmi.metoclient.ui.animator.Factory2 = (function() {

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
        var _constraints;

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


        /**
         * Get availability object for single layer, formatted as required for getAvailableRanges
         *
         * @param {Object} capabilities Layer capability information as defined in {fi.fmi.metoclient.ui.animator.WmsCapabilities.getLayer}. Must not be null or undefined.
         */
        function availabilityFromCapabilities(capabilities) {
            var time = capabilities.dimensions.time;
            if (time !== undefined) {
                var timeString = time.values.join(",");
                return fi.fmi.metoclient.ui.animator.WmsCapabilities.parseWmsTime(timeString);
            } else {
                throw "Missing time dimension for layer " + capabilities.name;
            }
        }

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

        function getControlLayers() {
            return _.map(_constraints.timelines, function(layers, mainLayerId) {
                return new OpenLayers.Layer.Animation.ControlLayer(layers[0].name, {layers: layers});
            });
        }

        /**
         * See API for function description.
         */
        function getLayers() {
            // Only generate layers once
            if (_layers.length !== 0) {
                return _layers;
            }

            function findAnimation(args) {
                for (var i = 0; i < args.length; i++) {
                    var arg = args[i];
                    if (arg) {
                        var animation = arg.animation;
                        if (animation) {
                            return animation;
                        }
                    }
                }
                return undefined;
            }

            function layerFactoryFor(klass, args) {
                return function(t) {
                    console.log("Creating layer with args", args);
                    var layer = new (constructorWrapper(klass, args))();
                    layer.setTime(t);
                    return layer;
                };
            }

            function fillOutAnimation(animation) {
                // Check animation resolution of the layer.
                if (animation.resolutionTime === undefined) {
                    // Make sure that at least a default resolution is set for animation layer.
                    animation.resolutionTime = _configLoader.getAnimationResolution();
                }
                // Check if layer configuration has set begin and end times for animation.
                // If whole animation has the values but layer itself does not,
                // use animation values also for the layer as default.
                if (animation.isForecast) {
                    if (animation.beginTime === undefined || animation.beginTime === "join") {
                        animation.beginTime = _configLoader.getForecastBeginDate();
                    }
                    if (animation.endTime === undefined) {
                        animation.endTime = _configLoader.getAnimationEndDate();
                    }
                } else {
                    if (animation.beginTime === undefined) {
                        animation.beginTime = _configLoader.getAnimationBeginDate();
                    }
                    if (animation.endTime === undefined) {
                        animation.endTime = _configLoader.getForecastBeginDate();
                    }
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
            }

            function fillWmtsDefaults(args) {
                var topLeftCorners = {
                    "ETRS-TM35FIN-FINLAND:0" : new OpenLayers.LonLat(-118331.366408356,8432773.0),
                    "ETRS-TM35FIN-FINLAND:1" : new OpenLayers.LonLat(-118331.366408356,8432773.0),
                    "ETRS-TM35FIN-FINLAND:2" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:3" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:4" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:5" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:6" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:7" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:8" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:9" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:10" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:11" : new OpenLayers.LonLat(-118331.366408356,7908485.0),
                    "ETRS-TM35FIN-FINLAND:12" : new OpenLayers.LonLat(-118331.366408356,7907973.0),
                    "ETRS-TM35FIN-FINLAND:13" : new OpenLayers.LonLat(-118331.366408356,7907973.0)
                };

                function createMatrixIds(matrixSetName) {
                    // TODO Unhack, currently assumes fixed range of ids and fixed scheme for creating ids - should use capabilities info instead
                    var result = [];
                    for (var i = 0; i < 14; i++) {
                        var identifier = matrixSetName + ":" + i;
                        result.push({identifier : identifier,
                                     scaleDenominator : Math.pow(2,13-i) * (1/28e-5),
                                     topLeftCorner : topLeftCorners[identifier],
                                    });
                    }
                    return result;
                }

                // WMTS default params
                var defaultParams = {
                    format: "image/png",
                    displayInLayerSwitcher : false,
                    isBaseLayer : false,
                    matrixIds : createMatrixIds(args[0].matrixSet)
                };

                var params = _.extend(defaultParams, args[0]);

                args[0] = params;
            }

            function fillWmsDefaults(args) {
                // WMS default params
                var defaultParams = {
                    transparent: true,
                    format: "image/png"
                };
                
                // WMS default options
                var defaultOptions = {
                    singleTile : false,
                    displayInLayerSwitcher : false,
                    isBaseLayer : false
                };
                
                var params = _.extend(defaultParams, args[2]);
                var options = _.extend(defaultOptions, args[3]);
                
                args[2] = params;
                args[3] = options;
            }

            // Create forecast layer for existing WMS/WMTS layers
            function createWmsSubLayer(layerConf) {
                var klass = OpenLayers.Layer.Animation.TimedLayerClassWrapper(OpenLayers.Layer.WMS, {
                    timeSetter: OpenLayers.Layer.Animation.TimedLayerClassWrapper.mergeParams
                });

                var subLayers = layerConf.args[3].animation.layers;
                if (subLayers !== undefined && subLayers.length > 0) {
                    console.log("Found subLayers for layer", layerConf.args[0]);
                    var layers = _.map(subLayers, function(subLayer) {
                        var name = subLayer.name;
                        if (name === undefined) {
                            // TODO ILMANET-1015: Generate name or forbid configurations without name for sublayers?
                            // Currently generated name
                            name = layerConf.args[0] + "_" + subLayer.layer;
                        }
                        var url = layerConf.args[1];
                        var params = {layers : subLayer.layer};
                        var options = {animation : _.pick(subLayer, ["beginTime", "endTime", "resolutionTime", "hasLegend", "isForecast"])};
                        fillOutAnimation(options.animation);
                        console.log("Filled-out animation config for layer", name, options.animation);
                        var args = [name, url, params, options];
                        var legendInfoProvider = createLegendInfoProvider(options.animation);
                        fillWmsDefaults(args);

                        if (options.animation.isForecast && !haveForecast) {
                            // ILMANET-1016 fix, don't generate forecast layers if there is no forecast range
                            return undefined;
                        }

                        return createLayer(klass, name, args, legendInfoProvider, options.animation, {layer: subLayer.layer, url: layerConf.capabilities.url});
                    });
                    return layers[0];
                }
            }

            function createWmtsSubLayer(layerConf) {
                var klass = OpenLayers.Layer.Animation.TimedLayerClassWrapper(OpenLayers.Layer.WMTS, {
                    timeSetter: OpenLayers.Layer.Animation.TimedLayerClassWrapper.mergeParams
                });

                var parentAnimation = findAnimation(layerConf.args);
                var parentConfig = layerConf.args[0];
                var parentName = parentConfig.name;
                var subLayers = parentAnimation.layers;
                if (subLayers !== undefined && subLayers.length > 0) {
                    console.log("Found subLayers for layer", parentName);
                    var layers = _.map(subLayers, function(subLayer) {
                        var name = subLayer.name;
                        if (name === undefined) {
                            // TODO ILMANET-1015: Generate name or forbid configurations without name for sublayers?
                            // Currently generated name
                            name = parentName + "_" + subLayer.layer;
                        }
                        var config = {
                            url : parentConfig.url,
                            layer : subLayer.layer,
                            style : subLayer.style ? subLayer.style : parentConfig.style,
                            matrixSet : subLayer.matrixSet ? subLayer.matrixSet : parentConfig.matrixSet,
                            maxExtent : subLayer.maxExtent ? subLayer.maxExtent : parentConfig.maxExtent,
                            animation : _.pick(subLayer, ["beginTime", "endTime", "resolutionTime", "hasLegend", "isForecast"])
                        };
                        fillOutAnimation(config.animation);
                        console.log("Filled-out animation config for layer", name, config.animation);
                        var legendInfoProvider = createLegendInfoProvider(config.animation);
                        var args = [config];
                        fillWmtsDefaults(args);

                        if (config.animation.isForecast && !haveForecast) {
                            // ILMANET-1016 fix, don't generate forecast layers if there is no forecast range
                            return undefined;
                        }

                        return createLayer(klass, name, args, legendInfoProvider, config.animation, {layer: config.layer, url: layerConf.capabilities.url});
                    });
                    return layers[0];
                }
            }

            function createLegendInfoProvider(animation) {
                if (animation.hasLegend) {
                    // TODO Handle non-WMS/WMTS case
                    return new OpenLayers.Layer.Animation.WMSWMTSLegendInfoProvider();
                } else {
                    return new OpenLayers.Layer.Animation.DisabledLegendInfoProvider();
                }
            }

            function createLayer(klass, name, args, legendInfoProvider, animation, capabilities) {
                var layerFactory = layerFactoryFor(klass, args);

                var layer = new OpenLayers.Layer.Animation.PreloadingTimedLayer(name, {
                    "layerFactory" : layerFactory,
                    "preloadPolicy" : preloader,
                    "retainPolicy" : retainer,
                    "fader" : fader,
                    "timeSelector" : animation.isForecast ? nextTimeSelector : previousTimeSelector,
                    "legendInfoProvider" : legendInfoProvider,
                    "displayInLayerSwitcher" : false,
                    "capabilities" : capabilities
                });

                return layer;
            }

            var retainer = new OpenLayers.Layer.Animation.RetainRange();
            var nextTimeSelector = new OpenLayers.Layer.Animation.ShowOnlyInrangeWrapper(new OpenLayers.Layer.Animation.ShowNextAvailable(), _configLoader.getAnimationResolution());
            var previousTimeSelector = new OpenLayers.Layer.Animation.ShowOnlyInrangeWrapper(new OpenLayers.Layer.Animation.ShowPreviousAvailable(), _configLoader.getAnimationResolution());
            var preloader = new OpenLayers.Layer.Animation.PreloadAll();
            var fader = new OpenLayers.Layer.Animation.ImmediateFader();

            var _config = _configLoader.getConfig();

            _constraints = {
                globalRange: [_configLoader.getAnimationBeginDate(), _configLoader.getAnimationEndDate()],
                timelines: {},
                rangeGroups: {}
            };

            var observationLayers = [];
            var forecastLayers = [];

            _constraints["rangeGroups"]["observation"] = {range: [_configLoader.getAnimationBeginDate(), _configLoader.getForecastBeginDate()], layers: observationLayers};
            _constraints["rangeGroups"]["forecast"] = {range: [new Date(_configLoader.getForecastBeginDate().getTime() + 1), _configLoader.getAnimationEndDate()], layers: forecastLayers};

            var haveForecast = _configLoader.getForecastBeginDate().getTime() !== _configLoader.getAnimationEndDate().getTime();

            function processConfig() {
                // Create layers only if layers have not been created before.
                if (_config && _config.layers) {
                    var layerConfigs = _config.layers;
                    for (var i = 0; i < layerConfigs.length; ++i) {
                        var config = layerConfigs[i];
                        // Reset layer to undefined for this loop.
                        if (config && config.className && config.args) {
                            // Layers are created by providing arguments list in configuration.
                            // Check from the given arguments if any of them contains animation configuration.
                            var animation = findAnimation(config.args);
                            if (animation) {
                                fillOutAnimation(animation);

                                if (animation.isForecast && !haveForecast) {
                                    // ILMANET-1016 fix, don't create forecast layers if there is no forecast range
                                    continue;
                                }

                                // Interpret legacy layer names and create corresponding wrappers
                                var klass;
                                var subLayer;
                                var layerName;
                                if (config.className.indexOf("OpenLayers.Layer.Animation.Wms") === 0) {
                                    // WMS case
                                    klass = OpenLayers.Layer.Animation.TimedLayerClassWrapper(OpenLayers.Layer.WMS, {
                                        timeSetter: OpenLayers.Layer.Animation.TimedLayerClassWrapper.mergeParams
                                    });

                                    layerName = config.args[0];
                                    fillWmsDefaults(config.args);
                                    subLayer = createWmsSubLayer(config);
                                } else if (config.className.indexOf("OpenLayers.Layer.Animation.Wmts") === 0) {
                                    // WMTS case
                                    klass = OpenLayers.Layer.Animation.TimedLayerClassWrapper(OpenLayers.Layer.WMTS, {
                                        timeSetter: OpenLayers.Layer.Animation.TimedLayerClassWrapper.mergeParams
                                    });

                                    layerName = config.args[0].name;
                                    fillWmtsDefaults(config.args);
                                    subLayer = createWmtsSubLayer(config);
                                } else {
                                    // TODO Some other case, decide what to do later
                                    throw "Unknown class: " + config.className;
                                }

                                var legendInfoProvider = createLegendInfoProvider(animation);

                                var mainLayer = createLayer(klass, layerName, config.args, legendInfoProvider, animation, config.capabilities);

                                _layers.push(mainLayer);
                                _constraints.timelines[mainLayer.name] = [mainLayer];
                                if (animation.isForecast) {
                                    forecastLayers.push(mainLayer.name);
                                } else {
                                    observationLayers.push(mainLayer.name);
                                }

                                if (subLayer !== undefined) {
                                    _layers.push(subLayer);
                                    _constraints.timelines[mainLayer.name].push(subLayer);
                                    forecastLayers.push(subLayer.name); // Sub-layers may only be forecast layers
                                }

                            } else {
                                // Just create a basic layer
                                _layers.push(createInstance(config.className, config.args));
                            }
                        }
                    }
                }
            }
            processConfig();
            return _layers;
        }

        function getConstraints() {
            // Must have generated layers first
            if (_layers.length === 0) {
                getLayers();
            }
            return _constraints;
        }

        function getAvailableRanges(layers) {
            var availability = {};

            _.each(layers, function(layer) {
                if (layer.getCapabilities !== undefined) { // check layer type
                    var capabilitiesKey = layer.getCapabilities();
                    if (capabilitiesKey !== undefined) { // get capabilities key information
                        var capabilities = _configLoader.getCapabilityLayer(capabilitiesKey.layer, capabilitiesKey.url);
                        if (capabilities === undefined) { // and finally the capabilities object
                            availability[layer.id] = timestep.restricted(_configLoader.getAnimationBeginDate(), _configLoader.getAnimationEndDate(), _configLoader.getAnimationResolution());
                            console.log("Pseudo availability for layer", layer.name, ":", availability[layer.id]);
                        } else {
                            availability[layer.id] = availabilityFromCapabilities(capabilities);
                            console.log("Actual capability information for layer", layer.name, ":", availability[layer.id]);
                        }
                    }
                }

            });

            return availability;
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

        /**
         * @return [{OpenLayers.Layer}] Control Layer array for OpenLayers. Not included in getLayers result. These layers are visible in layer switcher
         *                              May not be {undefined} or {null}, but may be empty.
         */
        this.getControlLayers = getControlLayers;

        /**
         * @return {Object} Constraints object as specified in openlayers-animation.
         */
        this.getConstraints = getConstraints;

        /**
         * @return {Object} Available ranges object as specified in openlayers-animation.
         */
        this.getAvailableRanges = getAvailableRanges;

    };

    // Constructor function for new instantiation.
    return _constructor;
})();


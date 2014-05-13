// Strict mode for whole file.
"use strict";

/**
 * This software may be freely distributed and used under the following MIT license:
 *
 * Copyright (c) 2013 Finnish Meteorological Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Strict mode for whole file.
// "use strict";

// Requires lo-dash
if ("undefined" === typeof _ || !_) {
    throw "ERROR: OpenLayers is required for fi.fmi.metoclient.ui.animator.WmsCapabilities!";
}

// Requires OpenLayers
if ("undefined" === typeof OpenLayers || !OpenLayers) {
    throw "ERROR: OpenLayers is required for fi.fmi.metoclient.ui.animator.WmsCapabilities!";
}

// "Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.ui = fi.fmi.metoclient.ui || {};
fi.fmi.metoclient.ui.animator = fi.fmi.metoclient.ui.animator || {};

/**
 * WmsCapabilities object acts as an interface that provides functions
 * to asynchronously request WMS capabilities XML data from the server
 * and to get the requested data in a parsed structure.
 *
 * WmsCapabilities itself is stateless. It only provides API functions
 * to start asynchronous flows that can be followed by callback functions.
 *
 * Example:
 * fi.fmi.metoclient.ui.animator.WmsCapabilities.getData(
 *     {
 *         url : "http://wms.fmi.fi/fmi-apikey/insert-your-apikey-here/geoserver/wms",
 *         callback: function(data, errors) {
 *             var layer = fi.fmi.metoclient.ui.animator.WmsCapabilities.getLayer(data, "Weather:temperature");
 *             var begin = fi.fmi.metoclient.ui.animator.WmsCapabilities.getBeginTime(layer);
 *             var end = fi.fmi.metoclient.ui.animator.WmsCapabilities.getEndTime(layer);
 *             var allLayerTimes = fi.fmi.metoclient.ui.animator.WmsCapabilities.getLayerTimes(layer);
 *         }
 *     });
 *
 * See API description in the end of the function.
 */
fi.fmi.metoclient.ui.animator.WmsCapabilities = (function() {

    // Default parameter values for capabilities request.
    var DEFAULT_SERVICE = "WMS";
    var DEFAULT_VERSION = "1.3.0";
    var DEFAULT_REQUEST = "GetCapabilities";

    // Error object keys.
    var KEY_ERROR_CODE = "errorCode";
    var KEY_ERROR_TEXT = "errorText";

    /**
     * Asynchronously handles the callback and possible error situations there.
     *
     * @param {function(data, errors)} callback Callback function that is called.
     *                                          Operation is ignored if {undefined} or {null}.
     * @param {Object} data Data that is provided for callback.
     *                      May be {undefined}, for example, if an error occurred.
     * @param [] errors Array that contains possible errors that occurred during the asynchronous flow.
     */
    function handleCallback(callback, data, errors) {
        if (callback) {
            setTimeout(function() {
                callback(data, errors);
            }, 0);
        }
    }

    /**
     * Request capability data from the server.
     *
     * Operation is asynchronous.
     *
     * This function provides the actual implementation for the API functions
     * that request parsed data.
     *
     * @param {Object} options Options for capability request.
     *                         {options} and {options.callback} may not be {undefined} or {null}.
     *                         Exception is thrown if {options.url} is {undefined}, {null} or empty.
     * @throws {String} Exception string is thrown if {options} does not contain proper information.
     */
    function getParsedData(options) {
        var capabilities;
        var errors = [];
        if (options.url) {
            var format = new OpenLayers.Format.WMSCapabilities();
            var defaultParams = {
                SERVICE : DEFAULT_SERVICE,
                VERSION : DEFAULT_VERSION,
                REQUEST : DEFAULT_REQUEST
            };
            OpenLayers.Request.GET({
                url : options.url,
                // If options contains params object it is used.
                // Otherwise, use default values.
                params : options.params || defaultParams,
                success : function(request) {
                    var doc = request.responseXML;
                    if (!doc || !doc.documentElement) {
                        doc = request.responseText;
                    }
                    capabilities = format.read(doc);
                    handleCallback(options.callback, capabilities, errors);
                },
                failure : function(response) {
                    var error = {};
                    error[KEY_ERROR_CODE] = response.status;
                    error[KEY_ERROR_TEXT] = response.statusText;
                    errors.push(error);
                    if ("undefined" !== typeof console && console) {
                        var errorStr = "ERROR: Response error: ";
                        errorStr += "Status: " + error[KEY_ERROR_CODE];
                        errorStr += ", Text: " + error[KEY_ERROR_TEXT];
                        console.error(errorStr);
                    }
                    handleCallback(options.callback, capabilities, errors);
                }
            });

        } else {
            // Throw an exception because of the synchronous error.
            // Then, this exception will be catched and handled properly by
            // the get data flow structure.
            throw "ERROR: Empty URL!";
        }
    }

    /**
     * See API for function description.
     */
    function getLayer(capabilities, layerName) {
        var layer;
        if (layerName && capabilities && capabilities.capability && capabilities.capability.layers) {
            // Find layer from layers.
            var layers = capabilities.capability.layers;
            for (var i = 0; i < layers.length; ++i) {
                var l = layers[i];
                if (l && l.name === layerName) {
                    // Match found.
                    layer = l;
                    break;
                }
            }
        }
        return layer;
    }

    /**
     * See API for function description.
     */
    function getLayerTimes(layer) {
        var times;
        if (layer) {
            var dimensions = layer.dimensions;
            if (dimensions) {
                var time = dimensions.time;
                if (time) {
                    times = time.values;
                }
            }
        }
        return times;
    }

    /**
     * See API for function description.
     */
    function getBeginTime(layer) {
        var time;
        var times = getLayerTimes(layer);
        if (times && times.length) {
            time = times[0];
            // Check if the time value is actually a string that combines
            // begin and end time information into one string instead of
            // providing separate time values for every step.
            if (1 === times.length && undefined !== time && null !== time) {
                // Make sure time is string before checking syntax.
                time = time + "";
                var timeSplits = time.split("/");
                if (timeSplits.length) {
                    // Begin time is the first part of the split.
                    time = timeSplits[0];
                }
            }
            time = new Date(time);
        }
        return time;
    }

    /**
     * See API for function description.
     */
    function getEndTime(layer) {
        var time;
        var times = getLayerTimes(layer);
        if (times && times.length) {
            time = times[times.length - 1];
            // Check if the time value is actually a string that combines
            // begin and end time information into one string instead of
            // providing separate time values for every step.
            if (undefined !== time && null !== time && 1 === times.length) {
                // Make sure time is string before checking syntax.
                time = time + "";
                var timeSplits = time.split("/");
                if (timeSplits.length > 1) {
                    // End time is the second part of the split.
                    time = timeSplits[1];
                }
            }
            time = new Date(time);
        }
        return time;
    }

    /**
     * See API for function description.
     */
    function parseWmsTime(rawTimeExtent) {
        var intervalRe = new RegExp("^.+/.+/P.+$");
        var listRe = new RegExp("^.+,.+$");
        if (intervalRe.exec(rawTimeExtent)) {
            var parts = rawTimeExtent.split("/");
            var start = new Date(parts[0]);
            var end = new Date(parts[1]);
            var _step = parts[2];

            var re = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
            var result = _step.match(re);
            if (result !== null) {
                var _result = _.defaults(result, [0,0,0,0]);
                var h = _result[1];
                var m = _result[2];
                var s = _result[3];
                var step_ms = 1000*(h*60*60+m*60+s);
                return timestep.restricted(start, end, step_ms);
            } else {
                throw "Time steps longer than one day not supported";
            }
        } else if (listRe.exec(rawTimeExtent)) {
            return timestep.list(_.map(rawTimeExtent.split(","), function(x) {return new Date(x);}));
        } else {
            return timestep.list([new Date(rawTimeExtent)]);
        }
    }

    /**
     * See API for function description.
     */
    function getRequestUrl(capabilities) {
        var url;
        if (capabilities && capabilities.capability && capabilities.capability.request && capabilities.capability.request.getcapabilities && capabilities.capability.request.getcapabilities.href) {
            url = capabilities.capability.request.getcapabilities.href;
        }
        return url;
    }

    /**
     * See API for function description.
     */
    function getData(options) {
        if (options && options.callback) {
            try {
                getParsedData(options);

            } catch(e) {
                // An error occurred in synchronous flow.
                // But, inform observer about the error asynchronously.
                // Then, flow progresses similarly through API in both
                // error and success cases.
                var error = {};
                error[KEY_ERROR_TEXT] = e.toString();
                if ("undefined" !== typeof console && console) {
                    console.error("ERROR: Get data error: " + error[KEY_ERROR_TEXT]);
                }
                handleCallback(options.callback, undefined, [error]);
            }

        } else {
            // Callback is required. There is no reason to request data if it is not used somewhere.
            var errorStr = "ERROR: Options object and callback function in it are mandatory!";
            if ("undefined" !== typeof console && console) {
                console.error(errorStr);
            }
            throw errorStr;
        }
    }

    /**
     * See API for function description.
     */
    function getDataMultiple(urls, _onComplete, params) {
        var onComplete = _.once(_onComplete);
        var results = {
            nComplete: 0,
            capabilities: [],
            errors: []
        };

        var nRequests = urls.length;

        try {
            _.each(urls, function(url) {
                // Start asynchronous operation.
                fi.fmi.metoclient.ui.animator.WmsCapabilities.getData({
                    url: url,
                    callback: function(capabilities, errors) {
                        if (capabilities !== undefined) {
                            results.capabilities.push({url: url, capabilities: capabilities});
                        }
                        _.each(errors, function(error) {
                            results.errors.push(error);
                        });
                        results.nComplete += 1;

                        if (results.nComplete === nRequests) {
                            onComplete(results.capabilities, results.errors);
                        }
                    },
                    params: params
                });
            });
        } catch(e) {
            // Asynchronize error
            results.errors.push("ERROR: Error while starting GetCapabilities requests");
            setTimeout(function() {
                onComplete(results.capabilities, results.errors);
            }, 0);
        }

        if (results.nComplete === nRequests) {
            // When nRequests == 0
            setTimeout(function() {
                onComplete(results.capabilities, results.errors);
            }, 0);
        }
    }

    /**
     * ============================
     * Public API is returned here.
     * ============================
     */
    return {

        /**
         * Request data.
         *
         * Operation is asynchronous.
         *
         * Notice, callback is {function(data, errors)}.
         *      - data: Data object provides capabilities data.
         *              May be {undefined} if an error has occurred.
         *              See {OpenLayers.Format.WMSCapabilities.read} function for the object structure.
         *      - errors: Array that contains possible errors that occurred during the flow. Array is
         *                always provided even if it may be empty. If an error occurs, an error string
         *                is pushed here. Also, when an HTTP error occurs, error contains the textual
         *                portion of the HTTP status, such as "Not Found" or "Internal Server Error."
         *                Errors parameter is of this structure:
         *          [
         *              {
         *                  // None, one, or more of the following error values may exist.
         *                  // Values may also be {undefined} or {null}.
         *                  errorCode : "errorCodeString",
         *                  errorText : "errorTextString",
         *                  extension : {Object}
         *              },
         *              ...
         *          ]
         *
         * Notice, object properties of the function {options} parameter are URL encoded by this library
         * before they are inserted into the request URL.
         *
         * @param {Object} options Mandatory. May not be {undefined} or {null}. Object structure:
         *     {
         *         url : {String}
         *               Mandatory property. May not be {undefined}, {null} or empty.
         *               URL that is used for the capability request.
         *         params : {Object}
         *                  Params properties may be provided to replace default parameters used for the
         *                  capability request. Optional and may be {undefined} or {null} if default may
         *                  be used. But, should not be empty if the object is given.
         *         callback : {function(capabilities, errors)}
         *                    Mandatory property. May not be {undefined} or {null}.
         *                    Callback is called with the parsed capabilities data
         *                    and errors array when operation finishes.
         *                    If an error occurs, data is set {undefined} for the callback.
         *                    Possible errors are given inside the array that is always provided.
         *     }
         */
        getData : getData,

        /**
         * Do GetCapabilities request to given URLs. Call callback when complete.
         *
         * @param {Array} urls Array of Strings containing URLs to fetch. Must not be undefined or null. May be empty.
         *
         *
         * @param {Function} _onComplete Callback, called when all requests have been completed.
         *                               Signature: _onComplete(capabilities, errors).
         *
         *                               capabilities is an array of objects of form {
         *                                   url: url,
         *                                   capabilities: WmsCapabilities.getData result
         *                               }.
         *
         *                               Undefined results are not included.
         *
         *                               errors is an array of strings that describe any errors that occurred.
         * @param {Array} params Same as options.params of getData
         */
        getDataMultiple : getDataMultiple,

        /**
         * Get URL that is used for capabilities request.
         *
         * Notice, this may differ from the URL that is originally given for {getData}.
         *
         * @param {Object} capabilities Capabilities data object that is gotten by using {getData}.
         *                              Operation is ignored if {undefined}, {null} or empty.
         * @return {String} URL string that is used for given {capabilities}. May be {undefined}.
         */
        getRequestUrl : getRequestUrl,

        /**
         * Get layer object that matches the given layer name.
         *
         * @param {Object} capabilities Capabilities object whose layers are searched through.
         *                              Operation is ignored if {undefined} or {null}.
         * @param {String} layerName Name of the layer that is searched for.
         *                           For example, "Weather:temperature" if capability request
         *                           URL did not contain service as part of the URL path.
         *                           For example, "temperature" if service name was already
         *                           included in request URL path.
         *                           Operation is ignored if {undefined}, {null} or empty.
         * @return {Object} Layer that matches the layer name. May be {undefined}.
         */
        getLayer : getLayer,

        /**
         * Get layer time values from the given {layer}.
         *
         * @param {Object} layer Layer object whose time values are requested.
         *                       Layer may be gotten by using {getLayer} function.
         *                       Operation is ignored if {undefined} or {null}.
         * @return {Array} Array of time values from the matching layer. May be {undefined}.
         */
        getLayerTimes : getLayerTimes,

        /**
         * Get begin time of the given {layer}.
         *
         * @param {Object} layer Layer object whose begin time is requested.
         *                       Layer may be gotten by using {getLayer} function.
         *                       Operation is ignored if {undefined} or {null}.
         * @return {Date} Date for begin time. May be {undefined}.
         */
        getBeginTime : getBeginTime,

        /**
         * Get end time of the given {layer}.
         *
         * @param {Object} layer Layer object whose end time is requested.
         *                       Layer may be gotten by using {getLayer} function.
         *                       Operation is ignored if {undefined} or {null}.
         * @return {Date} Date for end time. May be {undefined}.
         */
        getEndTime : getEndTime,

        /**
         * Get complete timestep definition given layer time dimension.
         *
         * @param {String} rawTimeExtent WMS TIME extent string. Must not be undefined or null.
         *                       
         * @return {timestep} Timestep describing the times available for the layer.
         */
        parseWmsTime : parseWmsTime


    };

})();

// "use strict";

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
            // Create layers only if layers have not been created before.
            if (_config && _config.layers && _layers.length === 0) {
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

// "use strict";

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
                    // TODO Hack, expects that args[0] is layer name
                    var new_name_args = [args[0] + Math.random()].concat(args.slice(1));
                    var layer = new (constructorWrapper(klass, new_name_args))();
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
                // TODO Implement
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

                        return createLayer(klass, name, args, legendInfoProvider, {layer: subLayer.layer, url: layerConf.capabilities.url});
                    });
                    return layers[0];
                }
            }

            function createWmtsSubLayer(layerConf) {
                // TODO Implement
            }

            function createLegendInfoProvider(animation) {
                if (animation.hasLegend) {
                    // TODO Handle non-WMS/WMTS case
                    return new OpenLayers.Layer.Animation.WMSWMTSLegendInfoProvider();
                } else {
                    return new OpenLayers.Layer.Animation.DisabledLegendInfoProvider();
                }
            }

            function createLayer(klass, name, args, legendInfoProvider, capabilities) {
                var layerFactory = layerFactoryFor(klass, args);

                var animation = args[3].animation;

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

            _constraints["rangeGroups"]["observation"] = {range: [_configLoader.getAnimationBeginDate(), _configLoader.getObservationEndDate()], layers: observationLayers};
            _constraints["rangeGroups"]["forecast"] = {range: [_configLoader.getForecastBeginDate(), _configLoader.getAnimationEndDate()], layers: forecastLayers};

            var haveForecast = _configLoader.getObservationEndDate().getTime() !== _configLoader.getAnimationEndDate().getTime();

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
                                if (config.className.indexOf("OpenLayers.Layer.Animation.Wms") === 0) {
                                    // WMS case
                                    klass = OpenLayers.Layer.Animation.TimedLayerClassWrapper(OpenLayers.Layer.WMS, {
                                        timeSetter: OpenLayers.Layer.Animation.TimedLayerClassWrapper.mergeParams
                                    });

                                    fillWmsDefaults(config.args);
                                    subLayer = createWmsSubLayer(config);
                                } else if (config.className.indexOf("OpenLayers.Layer.Animation.Wms") === 0) {
                                    // WMTS case
                                    // TODO Default configuration
                                    klass = OpenLayers.Layer.Animation.TimedLayerClassWrapper(OpenLayers.Layer.WMTS, {
                                        timeSetter: OpenLayers.Layer.Animation.TimedLayerClassWrapper.mergeParams
                                    });

                                    fillWmtsDefaults(config.args);
                                    subLayer = createWmtsSubLayer(config);
                                } else {
                                    // TODO Some other case, decide what to do later
                                    throw "Unknown class: " + config.className;
                                }

                                var legendInfoProvider = createLegendInfoProvider(animation);

                                // TODO Hack, asssume args[0] is layer name
                                var mainLayer = createLayer(klass, config.args[0], config.args, legendInfoProvider, config.capabilities);

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


// "use strict";

// Requires Raphael JS
if ( typeof Raphael === "undefined" || !Raphael) {
    throw "ERROR: Raphael JS is required for fi.fmi.metoclient.ui.animator.Controller!";
}

// Requires jQuery
if ("undefined" === typeof jQuery || !jQuery) {
    throw "ERROR: jQuery is required for fi.fmi.metoclient.ui.animator.Controller!";
}

//"Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.ui = fi.fmi.metoclient.ui || {};
fi.fmi.metoclient.ui.animator = fi.fmi.metoclient.ui.animator || {};

/**
 * Controller povides time slider to control animations.
 */
fi.fmi.metoclient.ui.animator.Controller = (function() {

    var createCanvas = Raphael;
    var _labelFontFamily = "Arial";
    var _labelFontSize = 12;

    function getTimeStr(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var timeStr = hours > 9 ? hours : "0" + hours;
        timeStr += ":";
        timeStr += minutes > 9 ? minutes : "0" + minutes;
        return timeStr;
    }

    /**
     * Constructor that is provided from this class for public instantiation.
     *
     * @param {Object} element
     * @param {Object} width
     * @param {Object} height
     */
    var _constructor = function(element, width, height) {
        var _me = this;

        // See init function for member variable initializations and descriptions.

        // Controller member variables.
        //-----------------------------
        var _paper;
        var _model;
        var _timeController;
        var _scaleConfig;
        var _sliderConfig;

        // Set through schedulePause() when loading starts, is cleared by cancelPause() or by itself if it gets to fire
        var _pauseTimeout;

        // Scale member variables.
        //------------------------

        var _tickSet;
        var _progressCellSet;
        var _scaleContainer;
        var _background;
        var _obsBackground;
        var _fctBackground;
        var _leftHotSpot;
        var _rightHotSpot;

        // Slider member variables.
        //-------------------------

        var _slider;
        var _sliderBg;
        var _sliderLabel;
        // This is updated when slider is dragged.
        var _dragStartX;

        // Private element position information functions.
        //------------------------------------------------

        /**
         * This is required to make sure slider is not hidden when it is in the side.
         * This happends if it is outside of the paper. Therefore, use padding that
         * takes this into account.
         *
         * @return {Integer} Scale padding.
         */
        function getScalePadding() {
            // Notice, exact value can be calculated by _sliderConfig.width - _sliderConfig.sliderTipDx.
            // But it may be better to use constant. Then, for example UI CSS design may be easier to do if
            // values are constants.
            return 50;
        }

        /**
         * @return {Integer} Scale container offset relative to the window.
         */
        function getScaleContainerOffsetX() {
            return Math.floor(jQuery(_scaleContainer.node).offset().left);
        }

        /**
         * @return {Integer} Scale area offset relative to the window.
         */
        function getScaleAreaOffsetX() {
            return getScaleContainerOffsetX() + getScalePadding();
        }

        /**
         * @return {Integer} Slider background offset relative to the window.
         */
        function getSliderBackgroundOffsetX() {
            // Firefox seems to show the slider a little bit off the place.
            // Problem seems to be related to the stroke width of the slider.
            // Therefore, set 0 for the width before getting the offset value
            // and change the width value back after offset value is gotten.
            _sliderBg.attr('stroke-width', 0);
            var x = Math.floor(jQuery(_sliderBg.node).offset().left);
            _sliderBg.attr('stroke-width', _sliderConfig.strokeWidth);
            return x;
        }

        /**
         * @return {Integer} Slider tip offset relative to the window.
         */
        function getSliderTipOffsetX() {
            return getSliderBackgroundOffsetX() + _sliderConfig.sliderTipDx;
        }

        // Private controller functions.
        //------------------------------

        function resetHotSpots() {
            // Left hot spot always starts from the same place. Only length changes.
            // Left hot spot width is to the position of the slider tip.
            var leftWidth = getSliderTipOffsetX() - getScaleContainerOffsetX();
            if (leftWidth < 0) {
                leftWidth = 0;
            }
            _leftHotSpot.attr("width", leftWidth);

            // Right hot spot position and width change when slider moves.
            var rightWidth = _scaleContainer.attr("width") - leftWidth;
            if (rightWidth < 0) {
                rightWidth = 0;
            }
            _rightHotSpot.attr("x", _leftHotSpot.attr("x") + leftWidth).attr("width", rightWidth);
        }

        // Private model functions.
        //-------------------------

        function getForecastStartTime() {
            return _model ? _model.getForecastStartTime() : 0;
        }

        function getStartTime() {
            return _model ? _model.getStartTime() : 0;
        }

        function getEndTime() {
            return _model ? _model.getEndTime() : 0;
        }

        function getResolution() {
            return _model ? _model.getResolution() : 0;
        }

        /**
         * @return X relative to the parent, not necessary a window.
         */
        function getScaleAreaX() {
            return _scaleContainer.getBBox().x + getScalePadding();
        }

        /**
         * @return Y relative to the parent, not necessary a window.
         */
        function getScaleAreaY() {
            return _scaleContainer.getBBox().y;
        }

        function getScaleAreaWidth() {
            return Math.floor(_scaleConfig.width - 2 * getScalePadding());
        }

        function getScaleAreaHeight() {
            return Math.floor(_scaleContainer.getBBox().height);
        }

        function getTimeScale() {
            return _model && getScaleAreaWidth() ? (_model.getEndTime() - _model.getStartTime()) / getScaleAreaWidth() : 1;
        }

        // Private slider functions.
        //--------------------------

        // Position and time converter functions for slider.
        //--------------------------------------------------

        /**
         * Change time to the resolution time.
         *
         * Scaling and movement of elements may not provide exact times that correspond
         * resolution times. This ties to fix the value if it is not even to resolution.
         */
        function timeToResolution(time) {
            var resolution = getResolution();
            if (time !== undefined && time !== null && resolution) {
                // Use a little bit of a magic value here.
                // The time may be a little bit below correct value because of
                // position and scaling roundings. By adding a small time here
                // the time may increase just enough to create correct result
                // after flooring.
                time += Math.floor(resolution / 4);
                time -= time % resolution;
            }
            return time;
        }

        /**
         * @param {Integer} x X position of the tip of the slider relative to window origin.
         * @return {Integer} Time corresponding to given x position.
         */
        function posToTime(x) {
            // Container may not be located to the origin of the window.
            // Therefore, take the correct position into account.
            // Also notice, correct time should be identified by the tip position.
            var time = Math.floor(getStartTime() + ((x - getScaleAreaOffsetX()) * getTimeScale()));
            if (time < getStartTime()) {
                time = getStartTime();

            } else if (time > getEndTime()) {
                time = getEndTime();
            }
            return time;
        }

        /**
         * @param {Integer} time Time in milliseconds.
         * @return {Integer} X position of the given time.
         */
        function timeToPos(time) {
            // Container may not be located to the origin of the window.
            var sliderOffset = getScaleAreaOffsetX();
            var deltaT = time - getStartTime();
            var timeScale = getTimeScale();
            var position = Math.floor(sliderOffset + ( timeScale ? deltaT / timeScale : 0 ));
            return position;
        }

        // Slider functions that are required for slider initializations.
        //---------------------------------------------------------------

        /**
         * Set label text according to the position of the slider.
         */
        function resetSliderLabelText() {
            var date = new Date(timeToResolution(posToTime(getSliderTipOffsetX())));
            _sliderLabel.attr('text', getTimeStr(date));
        }

        /**
         * Transform slider set elements by given delta.
         *
         * @param {Integer} deltaX Delta value for transform movement
         *                         in x-axis direction for slider set elements.
         *                         May not be {undefined} or {null}.
         */
        function transformSliderElements(deltaX) {
            // RegExp corresponding movement transform string.
            var transformRegExp = /T-*\d+,0/;
            // Handle transform of each element in slider set separately.
            _slider.forEach(function(e) {
                // Get the current transform string of the element.
                var previousTransform = e.transform().toString();
                // Check if the movement transform has been defined before.
                var previousTransformMatch = previousTransform.match(transformRegExp);
                if (previousTransformMatch && previousTransformMatch.length) {
                    // Element has been moved before because movement transform string was found.
                    // There should be only one match. Get the previous movement deltaX value from
                    // the first match string. Notice, skip T-character from the string before parsing
                    // the integer value from the string.
                    var previousValue = parseInt(previousTransformMatch[0].substring(1), 10);
                    // Set new transform deltaX into the elment transform string.
                    e.transform(previousTransform.replace(transformRegExp, "T" + (previousValue + deltaX) + ",0"));

                } else {
                    // Element has not been moved before.
                    // But, transform may still contain data.
                    // Append movement transform string for element.
                    e.transform("...T" + deltaX + ",0");
                }
            });
        }

        /**
         * @param {Integer} x X position relative to the window origin.
         *                    Notice, x should refer to new x position of the
         *                    tip of slider.
         */
        function moveSliderTo(x) {
            var delta = Math.round(x - getSliderTipOffsetX());
            var scaleX = getScaleAreaOffsetX();
            if (delta && x >= scaleX && x <= scaleX + getScaleAreaWidth()) {
                transformSliderElements(delta);
                resetSliderLabelText();
                resetHotSpots();
            }
        }

        function redrawSlider() {
            _slider.toFront();
            resetSliderLabelText();
        }

        // Slider drag flow callback functions are required for slider initializations.
        //-----------------------------------------------------------------------------

        /**
         * @param x X position of the mouse.
         * @param y Y position of the mouse.
         * @param event DOM event object.
         */
        function startDragMove(x, y, event) {
            _timeController.proposePause();
            _dragStartX = getSliderBackgroundOffsetX();
        }

        /**
         * @param dx shift by x from the start point
         * @param dy shift by y from the start point
         * @param x X position of the mouse.
         * @param y Y position of the mouse.
         * @param event DOM event object.
         */
        function dragMove(dx, dy, x, y, event) {
            // Notice, the given x is the position of the mouse,
            // not the exact position of the slider. Also, dx is
            // relative to the drag start position, not to the
            // previous movement.
            var newTime = posToTime(_dragStartX + dx);
            _timeController.proposeTimeSelectionChange(newTime);
        }

        /**
         * @param event DOM event object.
         */
        function finalizeDragMove(event) {
            _dragStartX = undefined;
        }

        // Private scale functions.
        //-------------------------

        // Scale functions that are required for scale initializations.
        //-------------------------------------------------------------

        function nextFrame() {
            _timeController.proposeNextFrame();
        }

        function previousFrame() {
            _timeController.proposePreviousFrame();
        }

        // Handle mouse scroll event.
        function handleMouseScroll(event, delta, deltaX, deltaY) {
            if (delta > 0) {
                // Scrolling up.
                nextFrame();

            } else if (delta < 0) {
                // Scrolling down.
                previousFrame();
            }
            // Prevent scrolling of the page.
            return false;
        }

        function getObsWidth() {
            var width = 0;
            var forecastStartTime = getForecastStartTime();
            var startTime = getStartTime();
            var endTime = getEndTime();
            if (undefined !== forecastStartTime) {
                if (_model && (endTime - startTime)) {
                    // Forecast start time is given and width can be calculated.
                    width = Math.floor(getScaleAreaWidth() * (forecastStartTime - startTime) / (endTime - startTime));
                }

            } else {
                // Observation takes the whole scale width if forecast is not used.
                width = getScaleAreaWidth();
            }
            if (width < 0) {
                width = 0;
            }
            return width;
        }

        function getFctWidth() {
            var width = _model ? getScaleAreaWidth() - getObsWidth() : 0;
            if (width < 0) {
                width = 0;
            }
            return width;
        }

        // Scale functions for animation.
        //-------------------------------

        function redrawScaleBackground() {
            var obsWidth = getObsWidth();
            var fctWidth = getFctWidth();
            var bgWidth = obsWidth + fctWidth;
            _background.attr("x", _scaleConfig.x + getScalePadding()).attr("width", bgWidth);
            _obsBackground.attr("x", _scaleConfig.x + getScalePadding()).attr("width", obsWidth);
            _fctBackground.attr("x", _scaleConfig.x + getScalePadding() + obsWidth).attr("width", fctWidth);
        }

        /**
         * @param {Integer} x X position of the left side of the slider relative to parent origin, not necessary window.
         * @return {Integer} Time corresponding to the left side of the slider.
         */
        function scalePosToTime(x) {
            var time = Math.floor(getStartTime() + x * getTimeScale());
            if (time < getStartTime()) {
                time = getStartTime();

            } else if (time > getEndTime()) {
                time = getEndTime();
            }
            return time;
        }

        function redrawTimeCells() {

            function findAndRemoveMatchingCell(cells, startDate, endDate) {
                var matching = _.remove(cells, function(cell) {return cell.data("startDate") === startDate && cell.data("endDate") === endDate;});
                return matching[0]; // returns undefined if no matches
            }

            var oldCells = _progressCellSet;
            _progressCellSet = [];

            var resolution = getResolution();
            if (resolution) {
                var begin = getStartTime();
                var end = getEndTime();
                var beginX = getScaleAreaX();
                var beginY = getScaleAreaY() + getScaleAreaHeight() - _scaleConfig.progressCellHeight - 1;
                var cellCount = Math.floor((end - begin) / resolution);
                var cellWidth = getScaleAreaWidth() / cellCount;
                for (var i = 0; i < cellCount; ++i) {
                    var cellStart = begin + i * resolution;
                    var cellEnd = begin + (i+1) * resolution;

                    // Create a new cell
                    var cell = _paper.rect(beginX + i * cellWidth, beginY, cellWidth, _scaleConfig.progressCellHeight);
                    // Notice, cell ID actually describes the time value in the end of the cell instead of the beginning.
                    // Therefore (i+1) is used. Then, when cell content is loaded, the cell that ends to the selected time
                    // is handled instead of handling cell ahead of the time.
                    cell.node.id = "animationProgressCell_" + (begin + (i + 1) * resolution);
                    cell.data("startDate", cellStart);
                    cell.data("endDate", cellEnd);
                    jQuery(cell.node).mousewheel(handleMouseScroll);


                    // Try to find an existing cell, to get nStarted, nComplete and fill color
                    var oldCell = findAndRemoveMatchingCell(oldCells, cellStart, cellEnd);
                    if (oldCell === undefined) {
                        console.log("Initializing anew");
                        // No matching old cell, init to zero
                        cell.data("nStarted", 0);
                        cell.data("nComplete", 0);
                        cell.data("nErrors", 0);
                        cell.attr("fill", _scaleConfig.bgColor).attr("stroke-width", "0");
                    } else {
                        // Init from old cell
                        console.log("Initializing from old cell");
                        cell.data("nStarted", oldCell.data("nStarted"));
                        cell.data("nComplete", oldCell.data("nComplete"));
                        cell.data("nErrors", oldCell.data("nErrors"));
                        cell.attr("fill", oldCell.attr("fill")).attr("stroke-width", "0");
                    }

                    _progressCellSet.push(cell);
                }
            }
        }

        function getCellByTime(time) {
            for (var i = 0; i < _progressCellSet.length; ++i) {
                var cell = _progressCellSet[i];
                var start = cell.data("startDate");
                var end = cell.data("endDate");
                if (start < time && time <= end) {
                    return cell;
                }
            }
            return undefined;
        }

        /**
         * Ticks and major tick labels.
         */
        function redrawTics() {
            while (_tickSet.length) {
                _tickSet.splice(0, 1)[0].remove();
            }
            var resolution = getResolution();
            if (resolution) {
                var begin = getStartTime();
                var end = getEndTime();
                var beginX = getScaleAreaX();
                var cellCount = Math.floor((end - begin) / resolution);
                var cellWidth = getScaleAreaWidth() / cellCount;
                var previousHours;
                for (var i = 0; i <= cellCount; ++i) {
                    var positionX = beginX + i * cellWidth;
                    var date = new Date(begin + i * resolution);
                    // Minor tick height as default.
                    var tickEndY = getScaleAreaHeight() - (_scaleConfig.height - _scaleConfig.bgHeight);
                    var newHour = date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
                    if (newHour || i === 0 || i === cellCount) {
                        // Endpoint or exact hour, major tick.
                        tickEndY = getScaleAreaHeight() / 4;
                    }

                    if (tickEndY) {
                        var beginY = getScaleAreaY() + getScaleAreaHeight();
                        var tick = _paper.path("M" + positionX + "," + beginY + "V" + tickEndY);
                        tick.attr("stroke", Raphael.getRGB("white")).attr("opacity", 0.5);
                        _tickSet.push(tick);
                        jQuery(tick.node).mousewheel(handleMouseScroll);
                        if (newHour && i < cellCount) {
                            var hourLabel = _paper.text(positionX + 2, getScaleAreaY() + 8, getTimeStr(date)).attr("text-anchor", "start").attr("font-family", _labelFontFamily).attr("font-size", _labelFontSize).attr("fill", Raphael.getRGB("black"));
                            // Check if the hourlabel fits into the scale area.
                            var hourLabelNode = jQuery(hourLabel.node);
                            if (hourLabelNode.offset().left + hourLabelNode.width() <= getScaleAreaOffsetX() + getScaleAreaWidth()) {
                                // Label fits. So, let it be in the UI.
                                _tickSet.push(hourLabel);
                                jQuery(hourLabel.node).mousewheel(handleMouseScroll);

                            } else {
                                // Remove hour label because it overlaps the border.
                                hourLabel.remove();
                            }
                        }
                    }
                    previousHours = date.getHours();
                }
            }
        }

        // Private controller functions.
        //------------------------------

        /**
         * Redraw scale and slider elements.
         */
        function redrawAll() {
            redrawScaleBackground();
            redrawTimeCells();
            redrawTics();
            redrawSlider();
            resetHotSpots();
            // Make sure hot spots are in front.
            _leftHotSpot.toFront();
            _rightHotSpot.toFront();
        }

        function nFramesLoading() {
            var nLoading = 0;
            for (var i = 0; i < _progressCellSet.length; ++i) {
                var cell = _progressCellSet[i];
                var nStarted = cell.data("nStarted");
                var nComplete = cell.data("nComplete");
                if (nStarted > nComplete) {
                    nLoading += 1;
                }
            }
            return nLoading;
        }

        function schedulePause() {
            if (_pauseTimeout === undefined) {
                // No ongoing pause, schedule one
                _pauseTimeout = setTimeout(function() {
                    _timeController.proposePause();
                    _pauseTimeout = undefined;
                }, _model.getFrameRate() * 3/4);
            }
        }

        function cancelPause() {
            if (_pauseTimeout !== undefined) {
                clearTimeout(_pauseTimeout);
                _pauseTimeout = undefined;
            }
        }

        // Animation event listener callbacks.
        //-----------------------------------

        function loadFrameStartedCb(event) {
            var items = event.events;
            for (var i = 0; i < items.length; ++i) {
                var time = items[i].time.getTime();
                var cell = getCellByTime(time);
                if (cell) {
                    var nErrors = cell.data("nErrors");
                    if (items[i].error) {
                        nErrors += 1;
                        cell.data("nErrors", nErrors);
                    }
                    var nStarted = cell.data("nStarted");
                    nStarted += 1;
                    cell.data("nStarted", nStarted);
                    var nComplete = cell.data("nComplete");
                    if (nStarted > nComplete) {
                        cell.attr("fill", nErrors > 0 ? _scaleConfig.cellErrorColor : _scaleConfig.cellLoadingColor);
                        schedulePause();
                    }
                }
            }
        }

        function loadFrameCompleteCb(event) {
            var items = event.events;
            for (var i = 0; i < items.length; ++i) {
                var time = items[i].time.getTime();
                var cell = getCellByTime(time);
                if (cell) {
                    var nErrors = cell.data("nErrors");
                    if (items[i].error) {
                        nErrors += 1;
                        cell.data("nErrors", nErrors);
                    }
                    var nComplete = cell.data("nComplete");
                    nComplete += 1;
                    cell.data("nComplete", nComplete);
                    var nStarted = cell.data("nStarted");
                    if (nComplete >= nStarted) {
                        cell.attr("fill", nErrors > 0 ? _scaleConfig.cellErrorColor : _scaleConfig.cellReadyColor);
                        if (nFramesLoading() === 0) {
                            // Loading has stopped, cancel any scheduled animation pause
                            cancelPause();
                        }
                        if (nComplete > nStarted) {
                            console.error("BUG? complete: ", nComplete, "started: ", nStarted);
                        }
                    }
                }
            }
        }

        function frameChangedCb(event) {
            var items = event.events;
            for (var i = 0; i < items.length; ++i) {
                var time = items[i].time.getTime();
                // Propose change to controller which will direct change to slider.
                moveSliderTo(timeToPos(time));
            }
        }

        // Private initialization functions.
        //----------------------------------

        /**
         * Init function to initialize controller member variables.
         *
         * Notice, this function is automatically called when constructor is called.
         */
        (function init() {
            _paper = createCanvas(element, width, height);

            // Initialization configurations.
            _scaleConfig = {
                // Corner radius.
                radius : 5,
                x : 0,
                y : 0,
                width : width,
                height : height - 35,
                bgColor : Raphael.rgb(88, 88, 88),
                cellReadyColor : Raphael.rgb(148, 191, 119),
                cellErrorColor : Raphael.rgb(154, 37, 0),
                cellLoadingColor : Raphael.rgb(148, 191, 191),
                obsBgColor : Raphael.rgb(178, 216, 234),
                fctBgColor : Raphael.rgb(231, 166, 78)
            };
            _scaleConfig.bgHeight = Math.floor(2 * _scaleConfig.height / 3);
            // Make progress cell height a little bit smaller than remaining area.
            // Then, background color is shown a little bit in behind.
            _scaleConfig.progressCellHeight = _scaleConfig.height - _scaleConfig.bgHeight - 2;

            _sliderConfig = {
                height : 30,
                width : 65,
                bgColor : Raphael.rgb(88, 88, 88),
                strokeBgColor : Raphael.rgb(191, 191, 191),
                strokeWidth : 1
            };
            // Notice, that polygon is drawn by using path. See, _sliderBg variable.
            // Notice, the polygon path height is 7 and tip height is 3. Therefore, use corresponding ration here.
            _sliderConfig.sliderTipHeight = _sliderConfig.height * (3 / 7);
            // Polygon path width is 14. Scale to the width given here.
            _sliderConfig.scaleX = _sliderConfig.width / 14;
            _sliderConfig.scaleY = (_sliderConfig.height + _sliderConfig.sliderTipHeight) / 7;
            // The tip x position is 4 in the polygon path. So, use that with the scale.
            _sliderConfig.sliderTipDx = Math.floor(4 * _sliderConfig.scaleX);
            // Make slider overlap the scale a little bit.
            _sliderConfig.y = _scaleConfig.y + _scaleConfig.height - Math.floor(_sliderConfig.sliderTipHeight / 3);

            // Scale initializations.
            //-----------------------

            // Scale variables.
            // Collection of scale tick elements.
            _tickSet = _paper.set();
            // Collection of progress cell elements.
            _progressCellSet = [];

            // Create scale UI components.
            // Scale container is used in the background of the scale elements.
            // Its purpose is just to provide information about the area and its position.
            _scaleContainer = _paper.rect(_scaleConfig.x, _scaleConfig.y, _scaleConfig.width, _scaleConfig.height, _scaleConfig.radius);
            _scaleContainer.attr('stroke-width', 0);
            // Keep it hidden in the background.
            _scaleContainer.attr('opacity', 0);

            // Background behind obs and fct.
            _background = _paper.rect(_scaleConfig.x + getScalePadding(), _scaleConfig.y, getObsWidth() + getFctWidth(), _scaleConfig.height);
            _background.attr('fill', _scaleConfig.bgColor);
            _background.attr('stroke-width', 0);

            _obsBackground = _paper.rect(_scaleConfig.x + getScalePadding(), _scaleConfig.y, getObsWidth(), _scaleConfig.bgHeight);
            _obsBackground.attr('fill', _scaleConfig.obsBgColor);
            _obsBackground.attr('stroke-width', 0);

            _fctBackground = _paper.rect(_scaleConfig.x + getScalePadding() + getObsWidth(), _scaleConfig.y, getFctWidth(), _scaleConfig.bgHeight);
            _fctBackground.attr('fill', _scaleConfig.fctBgColor);
            _fctBackground.attr('stroke-width', 0);

            _leftHotSpot = _paper.rect(_scaleConfig.x, _scaleConfig.y, getScalePadding(), _scaleConfig.height);
            // Fill is required. Otherwise, click does not work.
            _leftHotSpot.attr('fill', Raphael.rgb(0, 0, 0)).attr('opacity', 0);
            _leftHotSpot.attr('stroke-width', 0);
            _leftHotSpot.click(previousFrame);

            _rightHotSpot = _paper.rect(_scaleConfig.x + width, _scaleConfig.y, getScalePadding(), _scaleConfig.height);
            // Fill is required. Otherwise, click does not work.
            _rightHotSpot.attr('fill', Raphael.rgb(0, 0, 0)).attr('opacity', 0);
            _rightHotSpot.attr('stroke-width', 0);
            _rightHotSpot.click(nextFrame);

            // Handle mouse wheel over the scale.
            jQuery([_scaleContainer.node, _background.node, _obsBackground.node, _fctBackground.node, _leftHotSpot.node, _rightHotSpot.node]).mousewheel(handleMouseScroll);

            // Slider initializations.
            //------------------------

            // Collects all the slider elements.
            _slider = _paper.set();

            _sliderBg = _paper.path("M0,2L0,7L14,7L14,2L6,2L4,0L2,2Z");
            _sliderBg.attr('fill', _sliderConfig.bgColor);
            _sliderBg.attr('stroke', _sliderConfig.strokeBgColor);
            _sliderBg.attr('stroke-width', _sliderConfig.strokeWidth);
            _sliderBg.transform("S" + _sliderConfig.scaleX + "," + _sliderConfig.scaleY + ",0,0T0," + _sliderConfig.y);

            _sliderLabel = _paper.text(32, _sliderConfig.y + 26, "00:00");
            _sliderLabel.attr("text-anchor", "start").attr("font-family", _labelFontFamily).attr("font-size", _labelFontSize);
            _sliderLabel.attr("fill", _sliderConfig.strokeBgColor).attr('stroke-width', 0);

            _slider.push(_sliderBg);
            _slider.push(_sliderLabel);

            // Set drag handlers.
            _slider.drag(dragMove, startDragMove, finalizeDragMove, _me, _me, _me);

            // Reset initial time for label.
            resetSliderLabelText();

            // Handle mouse wheel over the slider.
            jQuery([_sliderBg.node, _sliderLabel.node]).mousewheel(handleMouseScroll);

            // Move slider to the initial position.
            moveSliderTo(getScaleAreaOffsetX());
        })();

        // Public functions.
        //------------------

        /**
         * See API for description.
         */
        function setTimeModel(model) {
            _model = model;
            model.addTimePeriodChangeListener({
                timePeriodChanged : function(start, end, resolution) {
                    redrawAll();
                }
            });

            model.addTimeSelectionChangeListener({
                selectedTimeChanged : function(time) {
                    moveSliderTo(timeToPos(time));
                }
            });

            model.addForecastStartTimeChangeListener({
                forecastStartTimeChanged : function(time) {
                    redrawScaleBackground();
                }
            });

            model.addAnimationEventsListener({
                loadFrameStartedCb : loadFrameStartedCb,
                loadFrameCompleteCb : loadFrameCompleteCb,
                frameChangedCb : frameChangedCb
            });

            redrawAll();
        }

        /**
         * See API for description.
         */
        function setTimeController(controller) {
            _timeController = controller;
        }

        /**
         * See API for description.
         */
        function remove() {
            _paper.remove();
        }

        // Public API functions
        //======================

        /**
         * Set time model that contains actual information data and listener functions
         * for the slider.
         *
         * @param {Object} model
         */
        this.setTimeModel = setTimeModel;

        /**
         * Set controller.
         *
         * @param {Object} controller
         */
        this.setTimeController = setTimeController;

        /**
         * Remove controller from DOM.
         */
        this.remove = remove;
    };

    return _constructor;
})();

// "use strict";

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
            frameloadstarted : undefined,
            frameloadcomplete : undefined,
            framechanged : undefined
        };

        // OpenLayers Animation layer event callbacks.
        //--------------------------------------------

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

                    _config = newConfig;

                    var _tmpFactory = new fi.fmi.metoclient.ui.animator.Factory2(_config);

                    var constraints = _tmpFactory.getConstraints();
                    var availableRanges = _tmpFactory.getAvailableRanges(_factory.getLayers());
                    _coordinator.update(constraints, availableRanges);

                    _timeController.proposeTimePeriodChange(getBeginDate(), getEndDate(), getResolution());

                    _.each(_tmpFactory.getLayers(), function(layer) {
                        layer.destroy();
                    });
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
                var controlLayers = _factory.getControlLayers();
                var controllableLayers = _.filter(layers, function(l) {return l.setTime && l.setRange;});

                var constraints = _factory.getConstraints();
                var availableRanges = _factory.getAvailableRanges(layers);

                _coordinator = new OpenLayers.Layer.Animation.LayerGroupCoordinator(controllableLayers, constraints, availableRanges);

                // Use options and configuration object to set map and layers.
                setMapAndLayers();

                // Create slider. Notice, this will set itself according to the options.
                createController();
            }

            // Handle callback after asynchronous initialization.
            handleCallback(_options.callback, errors);
            
            if (_config.getCapabilitiesUrls().length && _config.getConfig().updateCapabilities) {
                // Only update capabilities if configuration includes "updateCapabilities" with truthy value
                console.log("Scheduling GetCapabilities updates");
                // GetCapabilities in use and updates requested, schedule updates
                setInterval(function() {
                    updateCapabilitiesCallback();
                }, 60000);
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
         * @return {Integer} Animation frame rate should be gotten from the configuration.
         *                   Otherwise, {undefined}.
         */
        function getFrameRate() {
            return _config.getAnimationFrameRate();
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
            // Because time change is proposed from outside.
            // Also, make sure animation is updated accordingly.
            var newTime = time instanceof Date ? time.getTime() : time;
            if (newTime !== _currentTime) {
                // Time changed
                _currentTime = newTime;

                _coordinator.setTime(new Date(_currentTime));
                jQuery.each(listeners, function(index, value) {
                    value.selectedTimeChanged(time);
                });
            }
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
                    // Use small timeout to make sure legends are not set too close to each other
                    // if multiple actions of same kind are started in a group.
                    setLegend(_options.legendDivId, layers);
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

                    // Control layers that are visible in layer switcher
                    var controlLayers = _factory.getControlLayers();
                    _.each(controlLayers, function(cl) {
                        map.addLayer(cl);
                    });

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
                        getFrameRate : function() {
                            return getFrameRate();
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

                    // Initialize to beginning of period
                    _timeController.proposeTimeSelectionChange(getBeginDate().getTime());
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

// "use strict";

// Requires lodash
if ("undefined" === typeof _ || !_) {
    throw "ERROR: Lodash is required for fi.fmi.metoclient.ui.animator.Animator!";
}

// "Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.ui = fi.fmi.metoclient.ui || {};
fi.fmi.metoclient.ui.animator = fi.fmi.metoclient.ui.animator || {};

if ("undefined" === typeof fi.fmi.metoclient.ui.animator.WmsCapabilities || !fi.fmi.metoclient.ui.animator.WmsCapabilities) {
    throw "ERROR: fi.fmi.metoclient.ui.animator.WmsCapabilities is required for fi.fmi.metoclient.ui.animator.ConfigLoader!";
}

/**
 * This configuration loader object fills out missing parts of the user-supplied 
 * configuration.
 *
 */
fi.fmi.metoclient.ui.animator.ConfigLoader = (function() {

    // Private constants.

    // If configuration uses auto for time value,
    // capabilities is used to get the proper time.
    var CAPABILITY_TIME_AUTO = "auto";

    // If configuration sub-layer uses join for time value,
    // capabilities is used to get the proper begin time
    // for the sub-layer.
    var CAPABILITY_TIME_JOIN = "join";

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
     * @param {Object} configuration Map and layer configuration object.
     *                               May be {undefined} or {null} but then operations are ignored.
     */
    var _constructor = function(configuration) {
        // Private member variables.
        //--------------------------
        var _me = this;

        // Map and layer configuration object.
        var _config = configuration;

        // Capabilities data for configurations.
        // Capabilities objects wrap requested capabilities and
        // other capability related information. Capability objects
        // are set into this array during asynchronous initialization.
        var _capabilitiesContainer = [];

        // Animation setting related variables that are initialized
        // when corresponding get functions are called first time.
        var _resolution;
        var _beginDate;
        var _endDate;

        // Forecast starts from current time as a default.
        // But, layers may define other forecast begin times.
        // Current time or the smallest forecast time from
        // layers is used for the whole animation.
        var _forecastBeginDate = new Date();
        // Observation end date will be adjusted depending on whether forecasts are used
        var _observationEndDate = new Date();

        // Private member functions.
        //--------------------------

        /**
         * @param {String} layer Layer identifier.
         *                       Operation is ignored if {undefined}, {null} or {empty}.
         * @param {String} url URL used for capability request.
         *                     Proper capability object, that contains information for layer,
         *                     is identified by the URL.
         *                     Operation is ignored if {undefined}, {null} or {empty}.
         * @return {Object} Layer from the loaded capabilities.
         *                  See {fi.fmi.metoclient.ui.animator.WmsCapabilities.getLayer}.
         *                  May be {undefined} if layer is not found.
         */
        function getCapabilityLayer(layer, url) {
            var capabilityLayer;
            if (layer && url) {
                for (var i = 0; i < _capabilitiesContainer.length; ++i) {
                    var capas = _capabilitiesContainer[i];
                    if (capas) {
                        var capabilities = capas.capabilities;
                        if (capabilities && url === capas.url) {
                            var capaLayer = fi.fmi.metoclient.ui.animator.WmsCapabilities.getLayer(capabilities, layer);
                            // Notice, checking is finished if layer is found.
                            // There should be only one match and other URL matches should not exist
                            // in the capabilities array. But, continue search if layer is not found
                            // just to be sure even if capabilities URL matched because this is not
                            // performance critical check.
                            if (capaLayer) {
                                capabilityLayer = capaLayer;
                                // Layer was found here. No need to continue.
                                break;
                            }
                        }
                    }
                }
            }
            return capabilityLayer;
        }

        /**
         * Check the forecast begin date from the configuration.
         *
         * The forecast begin date is updated by the smallest begin date from the layers
         * that have been defined as forecasts if any is found.
         *
         * Notice, this should be called only after {checkConfiguration} has checked
         * the animation layer time values.
         */
        function checkForecastBeginDate() {
            if (_config.animationDeltaToEndTime <= 0) {
                // Should match timeline end
                _forecastBeginDate = getAnimationEndDate();
                _observationEndDate = getAnimationEndDate();
                return;
            }

            if (_config && _config.layers && _config.layers.length) {
                // The default forecast begin date is ceiled on the resolution.
                // Then, the forecast begins on the animation step that shows the
                // first forecast data. For example, first step after the present
                // moment or exactly on it if present is exactly on the resolution.
                // Also, animation layer specific checks floor the forecast
                // begin date similarly on the first forecast step below.
                ceilDate(_forecastBeginDate, getAnimationResolution());
                _observationEndDate = new Date(_forecastBeginDate.getTime() - getAnimationResolution());

                // Check all the configuration layers.
                // The forecast begin date is the smallest date for the layer
                // that has been defined as forecast.
                for (var i = 0; i < _config.layers.length; ++i) {
                    var layer = _config.layers[i];
                    if (layer) {
                        // Layers are created by providing arguments list in configuration.
                        for (var j = 0; j < layer.args.length; ++j) {
                            var arg = layer.args[j];
                            if (arg) {
                                var animation = arg.animation;
                                // Notice, the value is always resetted below before using it to update layer properties.
                                // So, no need to reset value to undefined here.
                                var tmpBeginDate;
                                // Check from the given arguments if any of them contains animation configuration.
                                if (animation) {
                                    // Make sure resolution times are used properly when times are adjusted.
                                    // This provides layer specific resolution if available.
                                    var animationResolutionTime = animation.resolutionTime;
                                    if (undefined === animationResolutionTime) {
                                        animationResolutionTime = getAnimationResolution();
                                        if (undefined === animationResolutionTime) {
                                            throw "ERROR: Animation resolution time missing!";
                                        }
                                    }
                                    // Check begin time only from the layer that defines itself as a forecast.
                                    if (animation.isForecast) {
                                        // If begin time is available, make sure Date instance is used.
                                        if (undefined !== animation.beginTime) {
                                            // New date object is created for tmp date instead of using reference to existing object.
                                            tmpBeginDate = animation.beginTime instanceof Date ? new Date(animation.beginTime.getTime()) : new Date(animation.beginTime);

                                        } else {
                                            // Begin time was not defined for layer.
                                            // Then, animation level begin time is used for that layer.
                                            tmpBeginDate = getAnimationBeginDate();
                                        }
                                        // Layer animation begin times are floored when layers are created.
                                        // Floor forecast begin date similarly. Then, layer specific checking can be done.
                                        floorDate(tmpBeginDate, animationResolutionTime);
                                        // Update forecast begin time if the layer has begin time that is smaller than previously set value.
                                        if (undefined !== tmpBeginDate && (undefined === _forecastBeginDate || _forecastBeginDate.getTime() > tmpBeginDate.getTime())) {
                                            // Forecast begin time is always Date instance.
                                            _forecastBeginDate = tmpBeginDate;
                                            _observationEndDate = new Date(_forecastBeginDate.getTime() - getAnimationResolution());
                                        }
                                    }
                                    // Check also sub-layers of the animation layer.
                                    // Sub-layer may be forecast even if parent is not.
                                    if (animation.layers) {
                                        for (var k = 0; k < animation.layers.length; ++k) {
                                            var subLayer = animation.layers[k];
                                            // Check begin time from the sub-layer that defines itself as a forecast
                                            // or whose parent is a forecast.
                                            if (subLayer && (subLayer.isForecast || animation.isForecast)) {
                                                // If begin time is available, make sure Date instance is used.
                                                // Notice, sub-layer shold always have begin time set.
                                                if (undefined !== subLayer.beginTime) {
                                                    // New date object is created for tmp date instead of using reference to existing object.
                                                    tmpBeginDate = subLayer.beginTime instanceof Date ? new Date(subLayer.beginTime.getTime()) : new Date(subLayer.beginTime);

                                                } else {
                                                    // Begin time was not defined for layer.
                                                    // Then, animation level begin time is used for that layer.
                                                    // Sub-layer should always have begin time configured. So, we should not come here.
                                                    tmpBeginDate = getAnimationBeginDate();
                                                }
                                                // Layer animation begin times are floored when layers are created.
                                                // Floor forecast begin date similarly. Then, layer specific checking can be done.
                                                floorDate(tmpBeginDate, animationResolutionTime);
                                                // Update forecast begin time if the layer has begin time that is smaller than previously set value.
                                                if (undefined !== tmpBeginDate && (undefined === _forecastBeginDate || _forecastBeginDate.getTime() > tmpBeginDate.getTime())) {
                                                    // Forecast begin time is always Date instance.
                                                    _forecastBeginDate = tmpBeginDate;
                                                    _observationEndDate = new Date(_forecastBeginDate.getTime() - getAnimationResolution());
                                                }
                                            }
                                        }
                                    }
                                    // Use the first animation that is found from the arguments.
                                    // Therefore, no need to browse other arguments through any more.
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        /**
         * Check given {animation} and fine-tune times by using capability information for the layer.
         *
         * If animation times contain capability time strings,
         * they are replaced by proper times from the capabilities information.
         *
         * @param {Object} timeInfo Configuration sub-object that contains time properties
         *                          that are set if necessary.
         *                          Operation is ignored if {undefined} or {null}.
         * @param {Object} capabilityLayer Layer object gotten from capabilities.
         *                                 See {getCapabilityLayer} function.
         *                                 Operation is ignored if {undefined} or {null}.
         * @param {Integer} resolution Animation resolution time.
         *                             May be {undefined} or {null} that are handled as zero.
         */
        function checkAnimationConfigTimes(timeInfo, capabilityLayer, resolution) {
            if (timeInfo && capabilityLayer) {
                if (timeInfo.beginTime === CAPABILITY_TIME_AUTO) {
                    timeInfo.beginTime = fi.fmi.metoclient.ui.animator.WmsCapabilities.getBeginTime(capabilityLayer);
                    // Because begin times are floored on resolution when layers are created,
                    // make sure begin time is within capability limits by ceiling it here.
                    ceilDate(timeInfo.beginTime, resolution);
                }
                if (timeInfo.endTime === CAPABILITY_TIME_AUTO) {
                    timeInfo.endTime = fi.fmi.metoclient.ui.animator.WmsCapabilities.getEndTime(capabilityLayer);
                    // Because end times are ceiled on resolution when layers are created,
                    // make sure end time is within capability limits by flooring it here.
                    floorDate(timeInfo.endTime, resolution);
                }
            }
        }

        /**
         * Check given {animation} and fine-tune values according to the capability information.
         *
         * @param {Object} animation Configuration sub-object that contains time properties
         *                           that are set if necessary.
         *                           Operation is ignored if {undefined} or {null}.
         * @param {Object} capability Configuration sub-object that contains capability information.
         *                            Operation is ignored if {undefined} or {null}.
         */
        function checkConfigurationAnimation(animation, capability) {
            if (animation && capability && capability.url && capability.layer) {
                // Layer configuration provides enough information
                // to get capabilites information from the loaded capabilities.
                var capabilityLayer = getCapabilityLayer(capability.layer, capability.url);
                if (capabilityLayer) {
                    // Make sure resolution times are used properly when times are adjusted.
                    var animationResolutionTime = animation.resolutionTime;
                    if (undefined === animationResolutionTime) {
                        animationResolutionTime = getAnimationResolution();
                        if (undefined === animationResolutionTime) {
                            throw "ERROR: Animation resolution time missing!";
                        }
                    }
                    checkAnimationConfigTimes(animation, capabilityLayer, animationResolutionTime);
                    // Check animation sub-layers.
                    if (animation.layers) {
                        for (var i = 0; i < animation.layers.length; ++i) {
                            var subLayer = animation.layers[i];
                            if (subLayer && subLayer.layer) {
                                // Sub-layer capability layer information can be gotten by using sublayer ID
                                // and parent layer capability URL.
                                checkAnimationConfigTimes(subLayer, getCapabilityLayer(subLayer.layer, capability.url), animationResolutionTime);
                                if (subLayer.beginTime === CAPABILITY_TIME_JOIN) {
                                    // Notice, if join is used, the value set for the parent end time does not matter.
                                    // Parent end time defines end time for the whole animation, including sub layers.
                                    // Join can not be done after whole animation. Instead, end time of the parent
                                    // capability needs to be used to join sub-animation into the middle of the animation.
                                    subLayer.beginTime = fi.fmi.metoclient.ui.animator.WmsCapabilities.getEndTime(capabilityLayer);
                                    if (undefined !== subLayer.beginTime) {
                                        // Notice, configuration animation resolution and capabilities resolution
                                        // may define different values. Animation may use greater resolution.
                                        // Make sure that first frame of animation sub-layer and last frame of
                                        // parent layer will not overlap. Just in case begin time is on the configuration
                                        // resolution, increase time by one. Then, parent layer end time uses capability
                                        // value and sub layer first time after that. In other cases, parent time is
                                        // floored normally on resolution and sub layer time is ceiled to next value.
                                        subLayer.beginTime = new Date(subLayer.beginTime.getTime() + 1);
                                        ceilDate(subLayer.beginTime, animationResolutionTime);

                                    } else {
                                        throw "ERROR: Animation sub-layer missing capability begin time!";
                                    }
                                }
                            }
                        }
                    }
                } else {
                    throw "ERROR: No capability information for layer " + capability.layer + " but sub-layer uses beginTime \"join\"";
                }
            }
        }

        /**
         * Check if configuration object content needs to be tuned.
         *
         * Configuration layer times are updated according to capabilities.
         */
        function checkConfiguration() {
            if (_capabilitiesContainer.length && _config && _config.layers) {
                for (var i = 0; i < _config.layers.length; ++i) {
                    var layer = _config.layers[i];
                    if (layer && layer.args) {
                        // Layers are created by providing arguments list in configuration.
                        // Check from the given arguments if any of them contains animation configuration.
                        for (var j = 0; j < layer.args.length; ++j) {
                            var arg = layer.args[j];
                            if (arg) {
                                var animation = arg.animation;
                                if (animation) {
                                    checkConfigurationAnimation(animation, layer.capabilities);
                                    // Use the first animation that is found from the arguments.
                                    // Therefore, no need to browse other arguments through any more.
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Check and set if configuration defines forecast begin dates.
            // Notice, this is called after checkConfiguration has checked
            // the animation layer time values.
            checkForecastBeginDate();
        }

        /**
         * Check layer configurations through and find the greatest value for resolution if any.
         *
         * @return {Integer} Resolution value.
         *                   May be {undefined}.
         */
        function getAnimationResolutionFromLayers() {
            var resolution;
            if (_config) {
                var layerConfigs = _config.layers;
                if (layerConfigs) {
                    // Configurations are provided for layers.
                    // Check all the layers through.
                    for (var i = 0; i < layerConfigs.length; ++i) {
                        var config = layerConfigs[i];
                        if (config && config.args) {
                            // Layers are created by providing arguments list in configuration.
                            // Check from the given arguments if any of them contains animation configuration.
                            for (var j = 0; j < config.args.length; ++j) {
                                var arg = config.args[j];
                                if (arg) {
                                    var animation = arg.animation;
                                    if (animation) {
                                        // Animation configuration is given. Check if resolution is also given for the animation.
                                        if (!resolution || animation.resolutionTime !== undefined && animation.resolutionTime !== null && resolution < animation.resolutionTime) {
                                            // Take the greatest resolution of them all.
                                            resolution = animation.resolutionTime;
                                        }
                                        // Use the first animation that is found from the arguments.
                                        // Therefore, no need to browse other arguments through any more.
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return resolution;
        }

        /**
         * Check layer configurations through and find the smallest value for animation begin date if any.
         *
         * @return {Date} Begin date. May be {undefined}.
         *                New date object is created and returned date is not reference to any layer object.
         */
        function getAnimationBeginDateFromLayers() {
            var date;
            if (_config) {
                var layerConfigs = _config.layers;
                if (layerConfigs) {
                    for (var i = 0; i < layerConfigs.length; ++i) {
                        var config = layerConfigs[i];
                        if (config && config.args) {
                            // Layers are created by providing arguments list in configuration.
                            // Check from the given arguments if any of them contains animation configuration.
                            for (var j = 0; j < config.args.length; ++j) {
                                var arg = config.args[j];
                                if (arg) {
                                    var animation = arg.animation;
                                    if (animation) {
                                        if (animation.beginTime !== undefined && animation.beginTime !== null) {
                                            var tmpDate = animation.beginTime;
                                            if (!( tmpDate instanceof Date)) {
                                                tmpDate = new Date(tmpDate);
                                            }
                                            if (date === undefined || tmpDate.getTime() < date.getTime()) {
                                                // Take the smallest date of them all.
                                                // Make sure time is a copy of the original time.
                                                // Then, reference to the original object is not returned.
                                                date = new Date(tmpDate.getTime());
                                            }
                                        }
                                        // Use the first animation that is found from the arguments.
                                        // Therefore, no need to browse other arguments through any more.
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return date;
        }

        /**
         * Check layer configurations through and find the greatest value for animation end date if any.
         *
         * @return {Date} End date. May be {undefined}.
         *                New date object is created and returned date is not reference to any layer object.
         */
        function getAnimationEndDateFromLayers() {
            var date;
            if (_config) {
                var layerConfigs = _config.layers;
                if (layerConfigs) {
                    for (var i = 0; i < layerConfigs.length; ++i) {
                        var config = layerConfigs[i];
                        if (config && config.args) {
                            // Layers are created by providing arguments list in configuration.
                            // Check from the given arguments if any of them contains animation configuration.
                            for (var j = 0; j < config.args.length; ++j) {
                                var arg = config.args[j];
                                if (arg) {
                                    var animation = arg.animation;
                                    if (animation) {
                                        if (animation.endTime !== undefined && animation.endTime !== null) {
                                            var tmpDate = animation.endTime;
                                            if (!( tmpDate instanceof Date)) {
                                                tmpDate = new Date(tmpDate);
                                            }
                                            if (date === undefined || tmpDate.getTime() > date.getTime()) {
                                                // Take the greatest date of them all.
                                                // Make sure time is a copy of the original time.
                                                // Then, reference to the original object is not returned.
                                                date = new Date(tmpDate.getTime());
                                            }
                                        }
                                        // Use the first animation that is found from the arguments.
                                        // Therefore, no need to browse other arguments through any more.
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return date;
        }

        // Public functions for API.
        // ------------------------

        /**
         * See API for function description.
         */
        function getConfig() {
            return _config;
        }

        /**
         * See API for function description.
         */
        function getDefaultZoomLevel() {
            return _config ? _config.defaultZoomLevel : undefined;
        }

        /**
         * See API for function description.
         */
        function getAnimationFrameRate() {
            return _config ? _config.animationFrameRate : undefined;
        }

        /**
         * See API for function description.
         */
        function getAnimationResolution() {
            // Set resolution once.
            if (_resolution === undefined) {
                _resolution = _config ? _config.animationResolutionTime : undefined;
                if (!_resolution) {
                    // Because resolution was not defined for animation,
                    // check it from layer configurations.
                    _resolution = getAnimationResolutionFromLayers();
                    if (!_resolution) {
                        throw "ERROR: Animation configuration missing resolution time!";
                    }
                }
            }
            return _resolution;
        }

        /**
         * See API for function description.
         */
        function getAnimationBeginDate() {
            // Set begin date once.
            if (undefined === _beginDate && _config) {
                // Check if time has been given directly for the animation.
                if (undefined !== _config.animationDeltaToBeginTime) {
                    // Use animation setting.
                    // Notice, positive value of begin time is towards past.
                    // Negative value may be used if begin time should be in the future.
                    _beginDate = new Date();
                    if (_config.animationDeltaToBeginTime) {
                        // Positive delta value given.
                        _beginDate.setTime(_beginDate.getTime() - _config.animationDeltaToBeginTime);
                        floorDate(_beginDate, getAnimationResolution());

                    } else {
                        // Zero value for delta is a special case because it informs that observed data is not wanted.
                        // Notice, this ceils the value above current time if resolution greater than zero and if
                        // current time is not exactly on resolution.
                        ceilDate(_beginDate, getAnimationResolution());
                    }

                } else {
                    // Check if time can be gotten from layer configurations because
                    // it was not given for animation directly.
                    _beginDate = getAnimationBeginDateFromLayers();
                    // Floor to the exact resolution time.
                    if (undefined !== _beginDate) {
                        floorDate(_beginDate, getAnimationResolution());
                    }
                }

                if (undefined === _beginDate) {
                    throw "ERROR: Animation configuration missing proper begin time!";
                }
            }
            // Make copy. Then, possible changes do not affect the original object.
            return undefined === _beginDate ? undefined : new Date(_beginDate.getTime());
        }

        /**
         * See API for function description.
         */
        function getAnimationEndDate() {
            // Set end date once.
            if (undefined === _endDate && _config) {
                // Check if time has been given directly for the animation.
                if (undefined !== _config.animationDeltaToEndTime) {
                    // Notice, positive value of end time is towards future.
                    // Negative value may be used if end time should be in the past.
                    _endDate = new Date();
                    _endDate.setTime(_endDate.getTime() + _config.animationDeltaToEndTime);
                    if (_config.animationDeltaToEndTime > 0) {
                        // Round up if there is future, i.e forecast information in use
                        ceilDate(_endDate, getAnimationResolution());
                    } else {
                        // Else round down so that we don't end up prematurely loading observation data
                        floorDate(_endDate, getAnimationResolution());
                    }
                } else {
                    // Check if time can be gotten from layer configurations because
                    // it was not given for animation directly.
                    _endDate = getAnimationEndDateFromLayers();
                    // Ceil to the exact resolution time.
                    if (undefined !== _endDate) {
                        ceilDate(_endDate, getAnimationResolution());
                    }
                }

                if (undefined === _endDate) {
                    throw "ERROR: Animation configuration missing proper end time!";
                }
            }
            // Make copy. Then, possible changes do not affect the original object.
            return undefined === _endDate ? undefined : new Date(_endDate.getTime());
        }

        /**
         * See API for function description.
         */
        function getForecastBeginDate() {
            return _forecastBeginDate;
        }

        /**
         * See API for function description.
         */
        function getObservationEndDate() {
            return _observationEndDate;
        }

        /**
         * See API for function description.
         */
        function getCapabilitiesUrls() {
            // There may be multiple asynchronous operations started.
            // Counter is initialized with the total count. Then, catch can
            // handle synchronous exceptions as if asynchronous operation would
            // have finished and one fail does not stop the whole flow if other
            // asynchronous operations are going-on or about to be started.
            var capabilities = _.filter(_.map(_config.layers, "capabilities"));
            return _.uniq(_.map(capabilities, "url"));
        }

        /**
         * See API for function description.
         */
        function init(capabilities) {
            _capabilitiesContainer = capabilities;
            checkConfiguration();
        }

        // Public config API.
        //-------------------

        /**
         * Initialize configuration information.
         *
         * Asynchronous function that needs to be called before other functions can be used.
         * For example, capabilities data is loaded if required by configurations.
         *
         * Callback is mandatory and is used to follow the progress of the operation.
         *
         * @param {Function} callback Callback is {function(factory, errors)}.
         *                            Mandatory and may not be {undefined} or {null}.
         *                              - factory: Reference to {this} factory. Always provided.
         *                              - errors: Array that contains possible errors that occurred
         *                                        during the flow. Array is always provided even if it
         *                                        may be empty.
         */
        this.init = init;

        /**
         * @return {Array} Get the configuration object passed in. If init has been called, the object will have been modified..
         */
        this.getConfig = getConfig;

        /**
         * @return {Array} Array of capabilities URLs that should be loaded before initializing the configuration
         *                 Array is always provided even if it may be empty.
         */
        this.getCapabilitiesUrls = getCapabilitiesUrls;

        /**
         * Get capability layer for given layer from given GetCapabilities URL
         *
         * @param {String} layer Layer identifier.
         *                       Operation is ignored if {undefined}, {null} or {empty}.
         * @param {String} url URL used for capability request.
         *                     Proper capability object, that contains information for layer,
         *                     is identified by the URL.
         *                     Operation is ignored if {undefined}, {null} or {empty}.
         * @return {Object} Layer from the loaded capabilities.
         *                  See {fi.fmi.metoclient.ui.animator.WmsCapabilities.getLayer}.
         *                  May be {undefined} if layer is not found.
         */
        this.getCapabilityLayer = getCapabilityLayer;

        /**
         * @return {Integer} Default zoom level that should be used with the map when layers are added to it.
         *                   For example, {OpenLayers.setCenter} function can use this information together with
         *                   {OpenLayers.getCenter()} function.
         */
        this.getDefaultZoomLevel = getDefaultZoomLevel;

        /**
         * @return {Integer} Frame rate in milliseconds that is used for the animation.
         */
        this.getAnimationFrameRate = getAnimationFrameRate;

        /**
         * @return {Integer} Animation resolution time in milliseconds that is used for the animation.
         */
        this.getAnimationResolution = getAnimationResolution;

        /**
         * Notice, this gives the animation default begin time.
         * Different animation layers may have their own begin times configured.
         * This gives only time for the whole animation.
         *
         * @return {Date} Default value for animation begin time.
         *                If configuration provides the value, it is used.
         *                Notice, date is floored to the nearest animation resolution time if
         *                time and resolution are given in configuration.
         *                May be {undefined} if not set in configuration.
         */
        this.getAnimationBeginDate = getAnimationBeginDate;

        /**
         * Notice, this gives the animation default end time.
         * Different animation layers may have their own begin times configured.
         * This gives only time for the whole animation.
         *
         * @return {Date} Default value for animation end time.
         *                If configuration provides the value, it is used.
         *                Notice, date is ceiled to the nearest animation resolution time if
         *                time and resolution are given in configuration.
         *                May be {undefined} if not set in configuration.
         */
        this.getAnimationEndDate = getAnimationEndDate;

        /**
         * Get the forecast begin date for the whole animation.
         *
         * Forecast starts from current time as a default.
         * But, layers may define other forecast begin times.
         *
         * @return {Date} The forecast begin date for the whole animation.
         *                May not be {undefined}.
         */
        this.getForecastBeginDate = getForecastBeginDate;

        /**
         * Get the observation end date for the whole animation.
         *
         * If there are no forecasts, observations end at animation
         * end. Otherwise they end at the previous timestep from
         * start of forecast .
         *
         * @return {Date} The observation end date for the whole animation.
         *                May not be {undefined}.
         */
        this.getObservationEndDate = getObservationEndDate;
    };

    // Constructor function for new instantiation.
    return _constructor;
})();

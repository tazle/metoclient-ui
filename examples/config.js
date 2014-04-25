{
    "map" : {
        "className" : "OpenLayers.Map",
        "args" : [{
            "allOverlays" : true,
            "projection" : "EPSG:3067",
            "maxExtent" : [-118331.366408, 6335621.167014, 875567.731907, 7907751.537264],
            "center" : [400000, 7150000]
        }]
    },
    "layers" : [
        {
            "className" : "OpenLayers.Layer.WMS",
            "args" : [
                "Map",
                "http://tiles.kartat.kapsi.fi/taustakartta",
                {
                    "layers" : "taustakartta",
                    "tiled" : true
                }]
        },

        {
            "capabilities" : {
                "url" : "http://localhost:5080/fmi-apikey/_apikey_/geoserver/wms",
                "layer" : "Radar:suomi_rr_eureffin"
            },
            "className" : "OpenLayers.Layer.Animation.Wms",
            "args" : [
                "Precipitation",
                "http://wms.fmi.fi/fmi-apikey/_apikey_/geoserver/wms",
                {
                    "layers" : "Radar:suomi_rr_eureffin"
                },
                {
                    "animation" : {
                        "resolutionTime" : 3600000,
                        "maxAsyncLoadCount" : 4,
                        "layers" : [{
                            "layer" : "Weather:precipitation-forecastx",
                            "beginTime" : "join",
                            "hasLegend" : true,
                            "name" : "Precipitation forecast",
                            "isForecast" : true
                        }],
                        "autoLoad" : true,
                        "hasLegend" : true,
                        "name" : "Precipitation",
                        "isForecast" : false
                    }
                }]
        },
        {
            "capabilities" : {
                "url" : "http://localhost:5080/fmi-apikey/_apikey_/geoserver/wms",
                "layer" : "Radar:suomi_dbz_eureffin"
            },
            "className" : "OpenLayers.Layer.Animation.Wms",
            "args" : [
                "Dbz",
                "http://wms.fmi.fi/fmi-apikey/_apikey_/geoserver/wms",
                {
                    "layers" : "Radar:suomi_dbz_eureffin"
                },
                {
                    "animation" : {
                        "hasLegend" : true,
                        "name" : "Dbz",
                        "resolutionTime" : 7200000,
                        "endTime" : "auto",
                        "fadeIn" : {
                            "time" : 0,
                            "timingFunction" : "linear"
                        },
                        "fadeOut" : {
                            "time" : 0,
                            "timingFunction" : "ease-in",
                            "opacities" : [0]
                        },
                        "maxAsyncLoadCount" : 4,
                        "autoLoad" : true
                    },
                    "visibility" : false
                }]
        },
        {
            "className" : "OpenLayers.Layer.Animation.Wms",
            "args" : [
                "Temperature",
                "http://wms.fmi.fi/fmi-apikey/_apikey_/geoserver/wms",
                {
                    "layers" : "Weather:temperature"
                },
                {
                    "animation" : {
                        "hasLegend" : false,
                        "name" : "Temperature",
                        "maxAsyncLoadCount" : 4,
                        "fadeIn" : {
                            "time" : 0,
                            "timingFunction" : "linear"
                        },
                        "fadeOut" : {
                            "time" : 0,
                            "timingFunction" : "ease-in",
                            "opacities" : [0]
                        },
                        "autoLoad" : true
                    },
                    "visibility" : true
                }]
        }],

    "defaultZoomLevel" : 1,

    "animationFrameRate" : 500,
    "animationResolutionTime" : 3600000,
    "animationDeltaToBeginTime" : 10800000,
    "animationDeltaToEndTime" : 7200000,

    "updateCapabilities": true
    
}

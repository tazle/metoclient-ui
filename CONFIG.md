Configuration handling changes in Factory2
------------------------------------------

Versions of metoclient-ui that use Factory2 have changed configuration
handling as follows.

Added support for automatic GetCapabilities updates if
"updateCapabilities" property is set to true in config. See config.js
for details.

Added support for initially showing different times based on
configuration. The setting is "initialDate". See config.js for
details.

Special handling for animated classes "OpenLayers.Layer.Animation.Wms"
and "OpenLayers.Layer.Animation.Wmts". They are converted to
"OpenLayers.Layer.Animation.PreloadingTimedLayers". Other classes are
instantiated directly. Animation only works for RangedLayer instances,
which essentially limits animation support to WMS and WMTS using the
aforementioned configuration classes.

Removed support for "fadeIn", "fadeOut", "maxAsyncLoadCount" and
"autoLoad" parameters in animation configurations. Fading was deemed
unnecessary, tile load counts are controlled by TileManager and all
layers are preloaded.

Unique "n"ame parameter is required for top-level layers.

Behaviour when GetCapabilities completely disabled is not well tested.


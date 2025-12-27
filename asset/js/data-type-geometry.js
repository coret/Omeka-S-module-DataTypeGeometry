(function($) {

    // Position from top left, so always positive.
    const regexPosition = /^\s*(?<x>\d+)\s*,\s*(?<y>\d+)\s*$/;
    const regexCoordinates = /^\s*(?<x>[+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+))\s*,\s*(?<y>[+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+))$/;
    const regexLatitudeLongitude = /^\s*(?<latitude>[+-]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?))\s*,\s*(?<longitude>[+-]?(?:180(?:\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))\s*$/;

    /**
     * Check user input geometry.
     *
     * @param object element
     * @param string datatype
     * @return bool
     */
    var checkGeometry = function(element, datatype) {
        const val = element.value.trim().toUpperCase();
        var primitive = null;
        var message = null;
        if (datatype === 'geography') {
            if (val.includes('MULTIPOINT') || val.includes('MULTILINE') || val.includes('MULTIPOLYGON')) {
                message = Omeka.jsTranslate('"multipoint", "multiline" and "multipolygon" are not supported for now. Use collection instead.');
            } else {
                try {
                    primitive = Terraformer.WKT.parse(val);
                } catch (err) {
                    var error = true;
                    // Check ewkt.
                    if (/^srid\s*=\s*\d{1,5}\s*;\s*.+/i.test(val)) {
                        try {
                            primitive = Terraformer.WKT.parse(val.slice(val.indexOf(';')+ 1));
                            error = false;
                        } catch (err) {
                        }
                    }
                    if (error) {
                        message = 'Please enter a valid wkt for the geography.';
                    }
                }
                // TODO Check all x and y, that should be below 180 and 90.
            }
        } else if (datatype === 'geometry') {
//	I need MULTIs! TODO: figure aout why MULTIs are unsupported
//            if (val.includes('MULTIPOINT') || val.includes('MULTILINE') || val.includes('MULTIPOLYGON')) {
//                message = Omeka.jsTranslate('"multipoint", "multiline" and "multipolygon" are not supported for now. Use collection instead.');
//            } else {
                try {
                    primitive = Terraformer.WKT.parse(val);
                } catch (err) {
                    message = invalidMessage(element);
                }
//           }
        } else {
            return false;
        }

        if (val === '' || primitive || !message) {
            element.setCustomValidity('');
            return true;
        } else {
            element.setCustomValidity(Omeka.jsTranslate(message));
            return false;
        }
    }

    /**
     * Check user input coordinates.
     *
     * @param object element
     * @param string datatype
     * @return bool
     */
    var checkCoordinates = function(element, datatype) {
        const val = element.value.trim().toUpperCase();
        var check = false;
        var message = null;
        if (datatype === 'geography:coordinates') {
            check = val.match(regexLatitudeLongitude);
        } else if (datatype === 'geometry:coordinates') {
            check = val.match(regexCoordinates);
        } else if (datatype === 'geometry:position') {
            check = val.match(regexPosition);
        } else {
            return false;
       }
        if (check) {
            element.classList.remove('invalid');
            element.setCustomValidity('');
            $(element).parent().find('input[type=number]')
                .removeClass('invalid')
                .get(0).setCustomValidity('');
            return true;
        } else {
            $(element).val('');
            message = invalidMessage(element);
            element.classList.add('invalid');
            element.setCustomValidity(Omeka.jsTranslate(message));
            $(element).parent().find('input[type=number]')
                .addClass('invalid')
                .get(0).setCustomValidity(message);
            return false;
        }
    }

    var invalidMessage = function(element) {
        let invalidValue = $(element).parent().closest('.value').find('.invalid-value');
        return invalidValue.length ? invalidValue.data('customValidity') : Omeka.jsTranslate('Error in input.');
    }

    /**
     * Check user input lat or long.
     *
     * @param object element
     * @param string datatype
     */
    var latlongCheck = function(element, datatype) {
        var element2;
        var message;
        const val = element.value.trim();
        const elementRadius = $('input.query-geo-around-radius')[0];
        const radius = elementRadius.value.trim();
        if (datatype === 'latitude') {
            element2 = $('input.query-geo-around-longitude')[0];
            if (val < -90 || val > 90) {
                message = 'Please enter a valid latitude.';
            }
        } else if (datatype === 'longitude') {
            element2 = $('input.query-geo-around-latitude')[0];
            if (val < -180 || val > 180) {
                message = 'Please enter a valid longitude.';
            }
        }

        const val2 = element2.value.trim();
        if (val === '' && val2 === '') {
            element.setCustomValidity('');
            element2.setCustomValidity('');
            elementRadius.setCustomValidity('');
        } else if (val === '' && val2 !== '') {
            message = 'Please enter a latitude or longitude.';
            element.setCustomValidity(Omeka.jsTranslate(message));
        } else if (val !== '' && val2 === '') {
            message = 'Please enter a latitude or longitude.';
            element2.setCustomValidity(Omeka.jsTranslate(message));
        } else if (message) {
            element.setCustomValidity(Omeka.jsTranslate(message));
        } else {
            element.setCustomValidity('');
        }

        if ((val !== '' || val2 !== '') && radius === '') {
            message = 'Please enter a radius.';
            elementRadius.setCustomValidity(Omeka.jsTranslate(message));
        }
    }

    /**
     * Check user input radius, according to unit and required when a latitude
     * and longitude are set.
     *
     * @param object element
     */
    var radiusCheck = function(element) {
        var message = '';
        const val = element.value.trim();
        const radius = val;
        const latitude = $('input.query-geo-around-latitude')[0].value.trim();
        const longitude = $('input.query-geo-around-longitude')[0].value.trim();
        const unit = $('input.query-geo-around-unit[name="geo[around][unit]"]:checked').val();
        if (latitude.length || longitude.length) {
            if (radius <= 0) {
                message = 'Please enter a valid radius.';
            } else if (unit === 'm') {
                if (radius > 20038000) {
                    message = 'Please enter a valid radius in m.';
                }
            } else if (radius > 20038) {
                message = 'Please enter a valid radius in km.';
            }
        }
        if ((latitude.length || longitude.length) && val === '') {
            message = 'Please enter a radius.';
            element.setCustomValidity(Omeka.jsTranslate(message));
        } else if (val === '' || message === '') {
            element.setCustomValidity('');
        } else {
            element.setCustomValidity(Omeka.jsTranslate(message));
        }
    }

    const geometryOrGeographyFieldset = function(input) {
        input = input ? input :  $('#advanced-search input[name="geo[mode]"]:checked');
        const mode = input.val();
        const sidebar = input.closest('.sidebar');
        const form = sidebar.length > 0 ? sidebar.find('#advanced-search') : input.closest('#advanced-search');
        if (mode === 'geography') {
            form.find('[data-geo-mode=geometry]').closest('.field-geo').hide();
            form.find('[data-geo-mode=geography]').closest('.field-geo').show();
        } else {
            form.find('[data-geo-mode=geometry]').closest('.field-geo').show();
            form.find('[data-geo-mode=geography]').closest('.field-geo').hide();
        }
    }

    $(document).ready(function() {

        // Resource form.

        $(document).on('keyup change', '.geography-coordinates', function(e) {
            var message = null;
            const div = $(this).closest('.value');
            const latitude = div.find('.geography-coordinates-latitude').val().trim();
            const longitude = div.find('.geography-coordinates-longitude').val().trim();
            const element = div.find('.value.to-require');
            const val = latitude + ',' + longitude;
            element.val(val);
            checkCoordinates(element[0], 'geography:coordinates');
        });

        $(document).on('keyup change', '.geometry-coordinates', function(e) {
            const div = $(this).closest('.value');
            const x = div.find('.geometry-coordinates-x').val().trim();
            const y = div.find('.geometry-coordinates-y').val().trim();
            const element = div.find('.value.to-require');
            const val = x + ',' + y;
            element.val(val);
            checkCoordinates(element[0], 'geometry:coordinates')
        });

        $(document).on('keyup change', '.geometry-position', function(e) {
            const div = $(this).closest('.value');
            const x = div.find('.geometry-position-x').val().trim();
            const y = div.find('.geometry-position-y').val().trim();
            const element = div.find('.value.to-require');
            const val = x + ',' + y;
            element.val(val);
            checkCoordinates(element[0], 'geometry:position');
        });

        $(document).on('keyup change', 'textarea.value.geography', function(e) {
            checkGeometry(this, 'geography');
        });

        $(document).on('keyup change', 'textarea.value.geometry', function(e) {
            checkGeometry(this, 'geometry');
        });

        // Added Alt-g short-cut to open geometry editor
        // TODO: maybe add icon in field to open the geometry editor
		$('textarea.value.geometry').keydown(function(e) {
			if(e.altKey && e.keyCode == 71) {
				const geometry_field=this;
				openMapEditor(geometry_field.value.trim(), this);
			}
		});
		
        // Search form.

        $(document).on('click', 'input[name="geo[mode]"]', function(e) {
            geometryOrGeographyFieldset($(this));
        });

        $(document).on('keyup change', 'input.query-geo-around-latitude', function(e) {
            latlongCheck(this, 'latitude');
        });
        $(document).on('keyup change', 'input.query-geo-around-longitude', function(e) {
            latlongCheck(this, 'longitude');
        });
        $(document).on('keyup change', 'input.query-geo-around-radius', function(e) {
            radiusCheck(this);
        });
        $(document).on('click', 'input.query-geo-around-unit', function(e) {
            radiusCheck($('input.query-geo-around-radius')[0]);
        });

        $(document).on('keyup change', 'textarea.query-geo-zone, textarea.query-geo-area', function(e) {
            checkGeometry(this, $(this).hasClass('query-geo-area') ? 'geography' : 'geometry');
        });

		$(document).on('o:sidebar-content-loaded', '#query-sidebar-edit', function(e) {
			geometryOrGeographyFieldset($(this).find('input[name="geo[mode]"]:checked'));
		});

        geometryOrGeographyFieldset();

    });

    $(document).on('o:prepare-value o:prepare-value-annotation', function(e, dataType, value, valueObj) {
        if (dataType === 'geography:coordinates' && valueObj) {
            // The value is an object that cannot be set by resource-fom.js.
            $(value).find('.value.to-require').val('');
            var coordinates = valueObj['@value'];
            if (!coordinates) {
                return;
            }
            if (typeof coordinates === 'object') {
                coordinates = coordinates.latitude + ',' + coordinates.longitude;
            }
            const coords = coordinates.match(regexLatitudeLongitude);
            if (!coords) {
                return;
            }
            $(value).find('.geography-coordinates-latitude').val(coords.groups.latitude);
            $(value).find('.geography-coordinates-longitude').val(coords.groups.longitude);
            $(value).find('.value.to-require').val(coords.groups.latitude + ',' + coords.groups.longitude);
        } else if (dataType === 'geometry:coordinates' && valueObj) {
            // The value is an object that cannot be set by resource-fom.js.
            $(value).find('.value.to-require').val('');
            var coordinates = valueObj['@value'];
            if (!coordinates) {
                return;
            }
            if (typeof coordinates === 'object') {
                coordinates = coordinates.x + ',' + coordinates.y;
            }
            const coords = coordinates.match(regexCoordinates);
            if (!coords) {
                return;
            }
            $(value).find('.geometry-coordinates-x').val(coords.groups.x);
            $(value).find('.geometry-coordinates-y').val(coords.groups.y);
            $(value).find('.value.to-require').val(coords.groups.x + ',' + coords.groups.y);
        } else if (dataType === 'geometry:position' && valueObj) {
            // The value is an object that cannot be set by resource-fom.js.
            $(value).find('.value.to-require').val('');
            var position = valueObj['@value'];
            if (!position) {
                return;
            }
            if (typeof position === 'object') {
                position = position.x + ',' + position.y;
            }
            const pos = position.match(regexPosition);
            if (!pos) {
                return;
            }
            $(value).find('.geometry-position-x').val(pos.groups.x);
            $(value).find('.geometry-position-y').val(pos.groups.y);
            $(value).find('.value.to-require').val(pos.groups.x + ',' + pos.groups.y);
        }
    });

})(jQuery);


let mapEditorDialog = null;
let leafletEditorMap = null;
let scriptsLoaded = false;

async function openMapEditor(currentWKT, elementWKT) {
    const PRECISION = 7;

    if (!mapEditorDialog) {
        mapEditorDialog = document.createElement('dialog');
        mapEditorDialog.id = 'geometry-editor-dialog';
        Object.assign(mapEditorDialog.style, {
            width: '90vw', height: '90vh', padding: '0', border: 'none',
            borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', overflow: 'hidden'
        });

		// TODO: move all CSS to data-tyoe-geometry.css
        mapEditorDialog.innerHTML = `
            <link rel="stylesheet" href="https://unpkg.com/leaflet@latest/dist/leaflet.css"/>
            <link rel="stylesheet" href="https://unpkg.com/@geoman-io/leaflet-geoman-free@latest/dist/leaflet-geoman.css"/>
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="padding: 8px 8px 0 8px; background: #404e61; color: white; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size:1.2em">Geometry Editor</strong>
                    <div>
                        <button tile="Esc to close without save" id="close-map-btn" style="padding: 4px 12px; cursor:pointer; background-color: #e3e3e3;">Close</button>
                        <button title="Ctrl+Enter to save and close" id="save-and-close-map-btn" style="padding: 4px 12px; cursor:pointer; background-color: #e3e3e3;">Save & Close</button>
                    </div>
                </div>
                <div id="map-container" style="flex-grow: 1; width: 100%;"></div>
                <textarea id="asWKT" style="display:none"></textarea>
            </div>`;
        document.body.appendChild(mapEditorDialog);

        // Implementation of #6: Keyboard shortcuts
        mapEditorDialog.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                mapEditorDialog.close();
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                document.getElementById('save-and-close-map-btn').click();
            }
        });

        document.getElementById('close-map-btn').onclick = () => mapEditorDialog.close();
    }

    if (!scriptsLoaded) {
        const loadScript = (src) => new Promise((res, rej) => {
            const s = document.createElement('script'); s.src = src; 
            document.head.appendChild(s); s.onload = res; s.onerror = rej;
        });
        try {
            await loadScript("https://unpkg.com/leaflet@latest/dist/leaflet.js");
            await loadScript("https://unpkg.com/@geoman-io/leaflet-geoman-free@latest/dist/leaflet-geoman.min.js");
            scriptsLoaded = true;
        } catch (e) { return console.error("Load failed", e); }
    }

    mapEditorDialog.showModal();

    if (!leafletEditorMap) {
        leafletEditorMap = L.map(mapEditorDialog.querySelector('#map-container')).setView([52.011, 4.71], 16);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(leafletEditorMap);
        
        leafletEditorMap.pm.addControls({
            drawControls: true, editControls: true, 
            drawCircle: false, drawRectangle: false, drawMarker: true, 
            drawCircleMarker: false, drawText: false, rotateMode: false,
            cutPolygon: true // This enables drawing holes in existing polygons
        });

        leafletEditorMap.on('pm:create', updateWKTFromMap);
        leafletEditorMap.on('pm:remove', updateWKTFromMap);
    } else {
        leafletEditorMap.eachLayer(l => {
            if (l instanceof L.Path || l instanceof L.Marker) leafletEditorMap.removeLayer(l);
        });
        leafletEditorMap.invalidateSize();
    }

    const wktInput = document.getElementById('asWKT');
    wktInput.value = currentWKT || '';

    if (wktInput.value !== "") {
        try {
            const primitive = Terraformer.WKT.parse(wktInput.value);
            const area = L.geoJson(primitive);
            area.addTo(leafletEditorMap);
            leafletEditorMap.fitBounds(area.getBounds(), { maxZoom: 18 });
            
            // Re-bind events to loaded layers
            area.eachLayer(l => l.on('pm:update pm:dragend pm:cut', updateWKTFromMap));
        } catch (e) { console.error("WKT Error", e); }
    }

    document.getElementById('save-and-close-map-btn').onclick = () => {
        elementWKT.value = wktInput.value;
        mapEditorDialog.close();
        // Trigger Omeka validation logic if it exists
        $(elementWKT).trigger('change');
    };

    // Implementation of #1: Smart Multi-Type Refinement
    function updateWKTFromMap() {
        const layers = [];
        leafletEditorMap.eachLayer(l => {
            if ((l instanceof L.Path || l instanceof L.Marker) && !l._pmTempLayer && l.options.attribution !== '&copy; OpenStreetMap') {
                layers.push(l);
            }
        });

        if (layers.length === 0) {
            wktInput.value = "";
            return;
        }

        const featureCollection = L.featureGroup(layers).toGeoJSON(PRECISION);
        const features = featureCollection.features;

        let finalGeometry;

        if (features.length === 1) {
            // Standard single geometry (handles Polygon with holes automatically)
            finalGeometry = features[0].geometry;
        } else {
            const types = new Set(features.map(f => f.geometry.type));
            
            if (types.size === 1) {
                // All same type: Convert to Multi-type
                const type = features[0].geometry.type;
                const multiTypeMap = {
                    'Point': 'MultiPoint',
                    'LineString': 'MultiLineString',
                    'Polygon': 'MultiPolygon'
                };
                
                finalGeometry = {
                    type: multiTypeMap[type] || 'GeometryCollection',
                    coordinates: features.map(f => f.geometry.coordinates)
                };
                
                // GeometryCollection fallback if type isn't in map
                if (finalGeometry.type === 'GeometryCollection') {
                    finalGeometry.geometries = features.map(f => f.geometry);
                }
            } else {
                // Mixed bag: Use GeometryCollection
                finalGeometry = {
                    type: "GeometryCollection",
                    geometries: features.map(f => f.geometry)
                };
				// TODO: find a better, Omeka S like alternative for alert
				alert("A mixed bag of points, lines and/or polygons leads to a geometry collection which is not supported!");
				return;
            }
        }

        try {
            wktInput.value = Terraformer.WKT.convert(finalGeometry);
        } catch (err) {
            console.error("WKT Conversion Error", err);
        }
    }
}
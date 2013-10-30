var carttirail = {};

(function($) {

	var app = carttirail;

	app.settings = {
		dataRef: {},
		dataType: 'jsonp',
		map: {
			tiles: 'http://tile.stamen.com/toner/{z}/{x}/{y}.png',
			center: [0, 0],
			zoom: 2,
			maxZoom: 16
		},
		labels: { 
			filters: 'Filters',
			results: 'Results',
			clear_search: 'Clear search',
			close: 'Close',
			view_map: 'View map',
			loading: {
				first: 'Loading data...',
				item: 'Loading item...',
				error: 'Oops, something\'s wrong with the data server. Try again.'
			}
		},
		templates: {}
	};

	var parseConfig = function(config) {
		if(config.map) {
			config.map = _.extend(app.settings.map, config.map);
		}
		if(config.labels) {
			config.labels = _.extend(app.settings.labels, config.labels);
		}
		return config;
	};

	var config;
	app.init = function(containerID, userConf) {
		app.containerID = containerID;
		config = _.extend(app.settings, parseConfig(userConf));
		if($.isReady) {
			_init(containerID);
		} else {
			$(document).ready(function() {
				_init(containerID);
			});
		}
	};

	app._data = {};

	app.openItem = function(id) {

		fragment.set({'p': id});

		var $container = app.$.page.find('.content');

		$container.empty();

		app.$.page.removeClass('toggled').show();

		var idKey = config.dataRef.id;
		if(!idKey)
			idKey = 'id';
		var item = _.find(app.data, function(item) { return item[idKey] == id; });
		if(item) {
			var lat = eval('item.' + config.dataRef.lat);
			var lng = eval('item.' + config.dataRef.lng);
			var map = app.map;
			map.previousLocation = map.getBounds();
			if(lat && lng)
				map.setView([lat, lng], config.map.maxZoom);
			else
				map.setView(config.map.center, config.map.zoom);

			if(config.itemSource && config.itemSource.url) {
				var itemSource = config.itemSource;
				var parameters = {};
				parameters[itemSource.idKey] = id;
				$container.html('<p class="loading">' + config.labels.loading.item + '</p>');
				var opts = {
					url: itemSource.url,
					data: parameters,
					dataType: config.dataType,
					timeout: 8000, // 8 second timeout
					success: function(data) {
						for(key in itemSource.get) {
							item[key] = data[key];
						}
						display(item);
					},
					error: function(jqXHR, textStatus, errorThrown) {
						$container.html('<p class="loading">' + config.labels.loading.error + '</p>');
					}
				};
				$.ajax(opts);
			} else {
				display(item);
			}
		}

		function display(item) {
			if(!config.templates.single)
				config.templates.single = config.templates.list;
			var template = _.template(config.templates.single);
			$container.html(template({item: item}));
		}

	}

	app.closeItem = function() {
		fragment.rm('p');
		$('#single-page').hide();
		app.map.fitBounds(app.map.previousLocation);
	}

	app.filter = function(options) {

		var filteredData = _.extend(app.data, []);

		_.each(config.filters, function(filter, i) {

			var filtering = false;

			if(options instanceof Object) {
				filtering = options[filter.name];
			}

			var dataToFilter = filteredData;

			if(filtering) {

				var fragmentData = {};

				if(typeof filtering === 'string') {

					filteredData = _.filter(dataToFilter, function(item) {
						if(eval('item.' + filter.sourceRef))
							return eval('item.' + filter.sourceRef).toLowerCase().indexOf(filtering.toLowerCase()) != -1; }
						);

					fragmentData[filter.name] = filtering;

				} else if(filtering instanceof Array) {

					var optionsFiltered = [];

					_.each(filtering, function(option, i) {

						optionsFiltered.push(_.filter(dataToFilter, function(item) { if(eval('item.' + filter.sourceRef)) return eval('item.' + filter.sourceRef).indexOf(option) != -1; }));

					});

					filteredData = _.flatten(optionsFiltered);
					fragmentData[filter.name] = filtering.join('|');

				}

				fragment.set(fragmentData);

			} else {

				fragment.rm(filter.name);

			}

			if(filter.disabledByDefault && filter.type == 'toggle' && !filtering) {

				filteredData = _.filter(dataToFilter, function(item) {

					if(eval('item.' + filter.sourceRef))
						return eval('item.' + filter.sourceRef).indexOf(filter.value) === -1;
					else
						return item;

				});

			}

		});

		// prevent duplicates
		var unique = {};
		_.each(filteredData, function(item, i) {
			unique[item.id] = item;
		});
		filteredData = [];
		for(key in unique) {
			filteredData.push(unique[key]);
		}

		_markers(filteredData);
		_itemListUpdate(filteredData);
	}

	var _init = function() {

		app.$ = $('#' + app.containerID);

		if(config.labels.title) {
			app.$.header = $('<div id="header" />');
			app.$.header.append($('<h1>' + config.labels.title + '</h1>'));
			if(config.labels.subtitle) {
				app.$.header.append($('<h2>' + config.labels.subtitle + '</h2>'));
			}
			if(config.nav) {
				app.$.nav = $('<div class="nav" />');
				_.each(config.nav, function(item, i) {
					app.$.nav.append('<a href="' + item.url + '" target="_blank" rel="external">' + item.title + '</a>');
				});
				app.$.header.append(app.$.nav);
			}
			app.$.append(app.$.header);
		}

		app.$.loading = $('<div id="loading">' + config.labels.loading.first + '</div>');
		app.$.append(app.$.loading);

		_getData();

	}

	var _getData = function() {

		if(typeof config.data !== 'undefined') {

			display(config.data);

		} else if(typeof config.dataSource !== 'undefined') {

			$('body').addClass('loading');

			var opts = {
				url: config.dataSource,
				dataType: 'json',
				timeout: 8000, // 8 second timeout
				success: display,
				error: function() {
					app.$.loading.text(config.labels.loading.error);
				}
			};

			if(config.jsonpCallback && config.jsonpCallback !== '?') {
				opts.jsonpCallback = config.jsonpCallback;
			}

			$.ajax(opts);
		}

		function display(data) {
			if(!data) {

				$('#loading').text(config.labels.loading.error);

			} else {

				$('body').removeClass('loading');
				app.$.content = $('<div id="carttirail-content"><div class="inner"></div></div>');
				app.$.append(app.$.content);

				// get specific node from json if specified
				if(config.get) {
					data = data[config.get];
				}
				// create ids if undefined
				if(!config.dataRef.id) {
					_.each(data, function(item, i) { data[i].id = 'item-' + i; });
				}

				app.data = data; // store data

				_map(data);

				_filters();
				_itemList(data);


				app.$.loading.hide();

				_readFragments();
				appDimensions();

			}
		}

	}

	var _map = function(data) {

		if(!config.map || app.map)
			return false;

		app.$.map = $('<div class="carttirail-map-container"><div id="carttirail-map"></div></div>');
		app.$.append(app.$.map);

		var map = app.map = L.map('carttirail-map');
		if(!fragment.get('p'))
			map.setView(config.map.center, config.map.zoom);
		L.tileLayer(config.map.tiles, {
			maxZoom: config.map.maxZoom
		}).addTo(map);

		if(config.map.markers && config.map.markers.cluster)
			app.markers = new L.MarkerClusterGroup();
		else
			app.markers = L.featureGroup();

		map.addLayer(app.markers);
	
		// create and store marker icons
		if(config.map.markers && config.map.markers.icons) {
			app._data.icons = [];
			var LeafIcon = L.Icon.extend({});
			_.each(config.map.markers.icons, function(icon, i) {
				var ref = icon.ref;
				var icon = new LeafIcon(icon);
				icon.ref = ref;
				app._data.icons.push(icon);
			});
		}

		_markers(data);
		map.fitBounds(app.markers.getBounds());

	}

	var _markers = function(items) {
		if(!config.map.markers)
			return false;

		var map = app.map;

		app.markers.clearLayers();

		_.each(items, function(item, i) {
			var lat = eval('item.' + config.dataRef.lat);
			var lng = eval('item.' + config.dataRef.lng);
			if(lat && !isNaN(lat) && lng && !isNaN(lng)) {
				var LatLng = new L.LatLng(parseFloat(lat), parseFloat(lng));
				var options = {};
				// marker icon
				if(app._data.icons) {
					var icons = app._data.icons;
					if(config.map.markers.type == 'random') {
						options.icon = icons[_.random(0, icons.length-1)];
					} else {
						var markerIcon = false;
						_.each(icons, function(icon, i) {
							var found = _.find(icon.ref, function(ref) { return eval('item.' + ref.key) == ref.value; });
							if(found && !markerIcon) {
								markerIcon = icon;
							}
						});
						if(markerIcon && typeof markerIcon !== 'undefined')
							options.icon = markerIcon;
					}
				}
				// create
				var marker = new L.Marker(LatLng, options);
				if(!config.templates.marker)
					config.templates.marker = config.templates.list;
				if(config.templates.marker) {
					// mouseover template
					var template = _.template(config.templates.marker);
					marker
						.bindPopup(template({item: item}))
						.on('mouseover', function(e) {
							e.target.openPopup();
						})
						.on('mouseout', function(e) {
							e.target.closePopup();
						});
				}
				marker.on('click', function(e) {
					var idKey = config.dataRef.id;
					if(!idKey)
						idKey = 'id';
					app.openItem(item[idKey]);
					return false;
				});
				app.markers.addLayer(marker);
			}
		});

	}

	var _filters = function() {
		if(!config.filters)
			return false;

		app.filteringVals = {};

		var $container = app.$.content.find('.inner');

		app.$.filters = $('<div id="filters" class="clearfix"><p class="clear-search">' + config.labels.clear_search + '</p><h3>' + config.labels.filters + '</h3><div class="filters-container"></div></div>');
		$container.append(app.$.filters);

		var $container = app.$.filters.find('.filters-container');
		var filters = config.filters;
		var filtering = app.filteringVals;
		var data = app.data;

		_.each(filters, function(filter, i) {

			$container.append('<div class="' + filter.name + ' filter ' + filter.type + '"></div>');

			if(filter.type == 'text') {

				$container.find('.filter.' + filter.name).html('<input type="text" placeholder="' + filter.title + '" id="' + filter.name + '" />');

				/* bind events */

				$('input#' + filter.name).bind('keyup', function(e) {
					filtering[filter.name] = $(this).val();
					app.filter(filtering);
					if(e.keyCode == 13)
						return false;
				});

			} else if(filter.type == 'multiple-select' || filter.type == 'select') {

				var multipleAttr = (filter.type == 'multiple-select') ? 'multiple' : '';

				var $select = $('<select id="' + filter.name + '" data-placeholder="' + filter.title + '" class="chzn-select" ' + multipleAttr + '><option></option></select>');

				$container.find('.filter.' + filter.name).html($select);

				app.$.find('select#' + filter.name).change(function() {
					filtering[filter.name] = $(this).val();
					app.filter(filtering);
				});

			} else if(filter.type == 'checkbox') {

				/* TO DO */
				
			} else if(filter.type == 'radio') {

				/* TO DO */

			} else if(filter.type == 'toggle') {

				var value = (typeof filter.value !== 'undefined') ? filter.value : 1;

				$container.find('.filter.' + filter.name).html('<input type="checkbox" id="' + filter.name + '" value="' + value + '" /> <label for="' + filter.name + '">' + filter.title + '</label>');

				/* bind events */

				$('input#' + filter.name).bind('change', function(e) {
					if($(this).is(':checked')) {
						filtering[filter.name] = $(this).val();
					} else {
						delete filtering[filter.name];
					}
					app.filter(filtering);
				});

			}

		});

		// populate filter
		_populateFilters(data);

		$('.chzn-select').chosen({
			allow_single_deselect: true
		});

		app.$.find('.clear-search').click(function() {
			filtering = {};
			_.each(config.filters, function(filter, i) {
				var $field = app.$.filters.find('#' + filter.name);
				if(!$field.is('[type=checkbox]') && !$field.is('[type=radio]'))
					$field.val('');
				if(filter.type == 'multiple-select')
					$field.val([]);
				if(filter.type == 'multiple-select' || filter.type == 'select')
					$field.trigger("liszt:updated");
				if(filter.type == 'toggle')
					$field.attr('checked', false);
			});
			app.filter();
			return false;
		});
	}

	var _populateFilters = function(data) {

		_.each(config.filters, function(filter, i) {

			if(filter.type == 'multiple-select' || filter.type == 'select') {

				var $select = $('#' + filter.name);

				$select.empty().append('<option />');

				if(!app._data[filter.name])
					app._data[filter.name] = [];

				var filterVals = app._data[filter.name];

				if(filter.values) {

					_.each(filter.values, function(filterVal, i) {
						filterVals = _storeFilter(filterVals, filterVal, filter);
					});

				} else {

					_.each(data, function(item, i) {
						var filterVal = eval('item.' + filter.sourceRef);
						if(filter.split) {
							filterVal = filterVal.split(filter.split);
						}
						if(filterVal instanceof Array) {
							_.each(filterVal, function(v, i) {
								filterVals = _storeFilter(filterVals, v, filter);
							});
						} else {
							filterVals = _storeFilter(filterVals, filterVal, filter);
						}
						filterVals = _.sortBy(filterVals, function(val) { return val[_.keys(val)[0]]; });

					});

				}

				if(filterVals.length) {
					_.each(filterVals, function(val, i) { 
						$select.append('<option value="' + _.keys(val)[0] + '">' + val[_.keys(val)[0]] + '</option>');
					});
				} else {
					alert('hi');
					$select.parents('.filter').remove();
				}

			}

		});

		function _storeFilter(group, val, filter) {

			v = {};

			if(!val)
				return group;

			v[val] = val;

			if(filter.exclude && filter.exclude.length) {
				if(_.find(filter.exclude, function(exclude) { return exclude == val; }))
					return group;
			}
			// format date
			if(filter.dataType == 'date') {
				var date = moment(val, filter.dateFormat);
				if(date && date.isValid()) {
					if(!filter.dateOutputFormat) {
						v[val] = date.format(filter.dateFormat);
					} else if(filter.dateOutputFormat == 'fromnow') {
						if(!date.year()) {
							date.year(moment().format('YYYY'));
						}
						if(!date.month()) {
							date.month(moment().format('MM'));
						}
						if(!date.day()) {
							date.day(moment().format('DD'));
						}
						if(!date.hour()) {
							date.hour(moment().format('HH'));
						}
						if(!date.minute()) {
							date.minute(moment().format('mm'));
						}
						v[val] = date.fromNow();
					} else {
						v[val] = date.format(filter.dateOutputFormat);
					}
				} else {
					return group;
				}
			}

			// labels
			if(filter.labels) {

				var label = _.find(filter.labels, function(label, key) { return key == val; });

				if(label) {
					v[val] = label;
				}

			}

			if(!_.any(group, function(item) { return _.isEqual(item, v); })) {
				group.push(v);
			}

			return group;

		}

	}

	var _itemList = function(items) {
		if(!config.templates.list)
			return false;

		var $container = app.$.content.find('.inner');

		app.$.items = $('<div class="carttirail-items"><h3>' + config.labels.results + '</h3><div class="list"></div></div>');

		$container.append(app.$.items);

		_itemListUpdate(items);

		app.$.page = $('<div id="single-page"><div class="actions"><p class="close">' + config.labels.close + '</p><p class="view-map">' + config.labels.view_map + '</p></div><div class="content"></div></div>');
		app.$.append(app.$.page);

		var viewMap = function() {
			if(!app.$.page.hasClass('toggled'))
				app.$.page.addClass('toggled');
			else
				app.$.page.removeClass('toggled');
		}

		app.$.page.find('.close').click(function() {
			app.closeItem();
			return false;
		});

		app.$.page.find('.view-map').click(function() {
			viewMap();
			return false;
		});
	}

	var _itemListUpdate = function(items) {
		if(!config.templates.list)
			return false;

		var $container = app.$.items.find('.list');
		var template = _.template('<ul><% _.each(items, function(item, i) { %><li class="open-item" data-itemid="<%= item.id %>">' + config.templates.list + '</li><% }); %></ul>');

		$container.html(template({items: items}));

		$container.find('.open-item').click(function() {
			var id = $(this).data('itemid');
			if(id) {
				app.openItem(id);
				return false;
			}
		});

		var _updateHeight = function() {
			var top = app.$.items.offset().top + -100 + 50;
			$container.css({top: top});
		}

		_updateHeight();

	}

	var _fragment = function() {
		var f = {};
		var _set = function(query) {
			var hash = [];
			_.each(query, function(v, k) {
				hash.push(k + '=' + v);
			});
			document.location.hash = hash.join('&');
		};
		f.set = function(options) {
			_set(_.extend(f.get(), options));
		};
		f.get = function(key, defaultVal) {
			var vars = document.location.hash.substring(1).split('&');
			var hash = {};
			_.each(vars, function(v) {
				var pair = v.split("=");
				if (!pair[0] || !pair[1]) return;
				hash[pair[0]] = unescape(pair[1]);
				if (key && key == pair[0]) {
					defaultVal = hash[pair[0]];
				}
			});
			return key ? defaultVal : hash;
		};
		f.rm = function(key) {
			var hash = f.get();
			hash[key] && delete hash[key];
			_set(hash);
		};
		return f;
	};

	var fragment = _fragment();

	var _readFragments = function() {

		if(config.filters) {
			var filtering = app.filteringVals;
			_.each(config.filters, function(filter, i) {
				if(fragment.get(filter.name)) {
					var val = fragment.get(filter.name);
					if(val.indexOf('|') != -1)
						val = val.split('|');
					var $input = $('.filter #' + filter.name);
					if($input.is('[type=checkbox]')) {
						$input.attr('checked', true);
					} else {
						$input.val(val);
					}
					if($input.is('select'))
						$input.trigger('liszt:updated');
					filtering[filter.name] = val;
				}
			});
		}

		if(fragment.get('p')) {
			app.openItem(fragment.get('p'));
		}

		app.filter(filtering);
	}

	var appDimensions = function() {
		if(app.$.header) {
			if(app.$.map)
				app.$.map.css({top: '100px'});
			if(app.$.page)
				app.$.page.css({top: '100px'});
		}
		$(window).resize(function() {
			if(app.$.filters) {
				if(app.$.map) {
					app.$.map.css({right: app.$.content.width()});
					app.map.invalidateSize(true);
				}
				if(app.$.page)
					app.$.page.css({right: app.$.content.width()});
			}
			app.$.css({
				height: '100%'
			});
		}).resize();
	}

})(jQuery);
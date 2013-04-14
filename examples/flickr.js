/*
 * Carttirail configuration
 */
var config = {
	dataSource: 'http://api.flickr.com/services/feeds/geo?tags=baixocentro&format=json&jsoncallback=?',
	get: 'items',
	dataRef: {
		lat: 'latitude',
		lng: 'longitude'
	},
};

/*
 * Map settings
 */
config.map = {
	tiles: 'http://tile.stamen.com/watercolor/{z}/{x}/{y}.png',
	center: [-23.5369, -46.6478],
	zoom: 14,
	maxZoom: 18
}

/*
 * Filters settings
 */
config.filters = [
	{
		name: 'author',
		sourceRef: 'author',
		type: 'multiple-select',
		title: 'Authors'
	}
];

config.templates = {
	list: '<p class="category"><%= item.author %></p><h3><%= item.title %></h3>'
}

carttirail.init('app', config);
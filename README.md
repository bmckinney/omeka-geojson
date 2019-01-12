# omeka-geojson

Omeka currently exports only KML for items. This microservice can be deployed using [now.sh](https://zeit.co/now) 
to provide a geoJson feed for items in a collection.

`npm install`

Specify your items url in *now.json* and add your mapbox token to *index.html*.

Then, deploy with now.sh: `now`

module.exports = (req, res) => {
    const jsonata = require('jsonata');
    const fetch = require('node-fetch');
    const request = require('request');

    let q = req.url.split("?"), queryParams = "";
    if (q.length >= 2) { queryParams = "?" + q[1]; }

    let exp = jsonata("$[].{\n" +
        "\n" +
        "    \"geometry\": {\n" +
        "      \"type\": \"Point\",\n" +
        "      \"coordinates\": $getCoords($.extended_resources.geolocations.url)\n" +
        "     },\n" +
        "     \"type\": \"Feature\",\n" +
        "     \"properties\": {\n" +
        "       \"title\": element_texts[element[name='Title']].text,\n" +
        "       \"image\": $getImage($.files.url),\n" +
        "       \"website\": '" + process.env.OMEKA_SERVER + "' & '/items/show/' & id,\n" +
        "       \"description\": element_texts[element[name='Street Number']].text & ' ' &\n" +
        "          element_texts[element[name='Street Name']].text & ', ' &\n" +
        "          element_texts[element[name='Community']].text &\n" +
        "          ', ' & element_texts[element[name='State']].text & ' 53565'\n" +
        "     }\n" +
        "}");

    var jsonataPromise = function(expr, data, bindings) {
        return new Promise(function(resolve, reject) {
            expr.evaluate(data, bindings, function(error, response) {
                if(error) {
                    resolve({});
                }
                resolve(response);
            });
        });
    };

    var getImage = function(url) {
        return new Promise(function(resolve, reject) {
            request(url, function(error, response, body) {
                if(error) {
                    reject(error);
                    return;
                }
                let list = JSON.parse(body);
                let retval = list[0].mime_type ==='image/gif' ? list[0].file_urls.original : list[0].file_urls.square_thumbnail;
                // get first image in order if available
                for (let img of list) {
                    if (img.order  && img.order === 1) {
                        // display animated gif if available
                        if (img.mime_type === 'image/gif') {
                            retval = img.file_urls.original
                        } else {
                            retval = img.file_urls.square_thumbnail;
                        }
                        break;
                    }
                }
                resolve(retval);
            });
        });
    };
    exp.assign('getImage', getImage);

    var getCoords = function(url) {
        return new Promise(function(resolve, reject) {
            request(url, function(error, response, body) {
                if(error) {
                    reject(error);
                    return;
                }
                resolve([JSON.parse(body).longitude, JSON.parse(body).latitude]);
            });
        });
    };
    exp.assign('getCoords', getCoords);

    fetch(process.env.OMEKA_SERVER + '/api/items'+ queryParams)
        .then(response => response.text())
        .then(body => {
            // omeka returns no items
            if (body === '[]') {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.write('{ "type": "FeatureCollection", "features": {}}');
                res.end();
            } else {
                var result = jsonataPromise(exp, JSON.parse(body));
                result.then(array => {
                    delete array.sequence;
                    delete array.keepSingleton;
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.write('{ "type": "FeatureCollection", "features": ' + JSON.stringify(array) + '}');
                    res.end();
                })
            }
       })
       .catch(error => console.log(error) );
};

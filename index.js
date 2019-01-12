module.exports = (req, res) => {
    const jsonata = require('jsonata');
    const fetch = require('node-fetch');
    const request = require('request');

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
        "       \"url\": url,\n" +
        "       \"address\": element_texts[element[name='Street Number']].text & ' ' &\n" +
        "          element_texts[element[name='Street Name']].text & ', ' &\n" +
        "          element_texts[element[name='Community']].text &\n" +
        "          ', ' & element_texts[element[name='State']].text & ' 53565'\n" +
        "     }\n" +
        "}");

    var jsonataPromise = function(expr, data, bindings) {
        return new Promise(function(resolve, reject) {
            expr.evaluate(data, bindings, function(error, response) {
                if(error) reject(error);
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
                resolve(JSON.parse(body)[0].file_urls.thumbnail);
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

    let data;
    fetch(process.env.ITEMS_URL)
        .then(response => response.text())
        .then(body => {
            data = JSON.parse(body);
        }).then(() => {
          var result = jsonataPromise(exp, data);
          result.then(array => {
              delete array.sequence;
              delete array.keepSingleton;
              //console.log(JSON.stringify(array));
              res.writeHead(200, {'Content-Type': 'application/json'});
              res.write('{ "type": "FeatureCollection", "features": ' + JSON.stringify(array) + '}');
              res.end();
          })
    });

};
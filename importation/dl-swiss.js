const cantons = require('./cantons2.json');
const child_process = require('child_process');
const fs = require('fs');

// --------------------------------------------------------------------------
// Reference: Solutions approchees pour la transformation de coordonnees
// CH1903-WGS84, Office federal de topographie swisstopo, Octobre 2005.
// --------------------------------------------------------------------------


// --------------------------------------------------------------------------
// A few precise points to check the algorithm:
//
// Location        Easting     Northing    Height    Longitude (E)  Latitude (N)    Height
// -----------------------------------------------------------------------------------------
// Zimmerwald      602030.680  191775.030   897.915  7.46527319611  46.87709460056   947.149
// Chrischona      617306.300  268507.300   456.064  7.66860641028  47.56705147250   504.935
// Pfaender        776668.105  265372.681  1042.624  9.78436047861  47.51532577694  1089.372
// La Givrine      497313.292  145625.438  1207.434  6.10203510028  46.45408056139  1258.274
// Monte Generoso  722758.810   87649.670  1636.600  9.02121918139  45.92928833889  1685.027
// --------------------------------------------------------------------------



// --------------------------------------------------------------------------
// Constants.
// --------------------------------------------------------------------------



var eastmax = 880000;                                           // Swiss grid limits.
var eastmin = 450000;
var northmax = 330000;
var northmin = 50000;

var latmin = 45.2;                                              // Swiss grid limits approximation in lat/lon.
var latmax = 48.2;
var lonmin = 5.5;
var lonmax = 11.0;

var dec_precision = 5;                                          // Number of decimal digits when coordinates are expressed in decimal degrees.
var sec_precision = 2;                                          // Number of decimal digits of seconds when coordinates are expressed in degrees, minutes and seconds.



// --------------------------------------------------------------------------



function dec2dms(ll)                                            // Transform decimal degrees to deg min sec. Works only with positive values.
{
    var dms = new Object();

    var deg = Math.floor(ll);
    var min = Math.floor( (ll - deg) * 60);
    var sec = ((ll - deg) * 60 - min) * 60;

    sec = sec.toFixed(sec_precision);                           // Limit the precision of the seconds to 2 decimal digits.

    dms.deg = deg;
    dms.min = (min < 10 ? "0" : "") + min.toString();
    dms.sec = (sec < 10 ? "0" : "") + sec.toString();
    dms.str = deg.toString() +  "deg" + (min < 10 ? "0" : "") + min.toString() + "'" + (sec < 10 ? "0" : "") + (Math.round(sec * 100) / 100).toString() + '"';

    return dms;
}



// --------------------------------------------------------------------------
// Conversion functions.
// --------------------------------------------------------------------------



function ch1903_wgs84(east, north, hgt)
{
    east -= 600000;                                             // Convert origin to "civil" system, where Bern has coordinates 0,0.
    north -= 200000;

    east /= 1E6;                                                // Express distances in 1000km units.
    north /= 1E6;

    var lon = 2.6779094;                                        // Calculate longitude in 10000" units.
    lon += 4.728982 * east;
    lon += 0.791484 * east * north;
    lon += 0.1306 * east * north * north;
    lon -= 0.0436 * east * east * east;

    var lat = 16.9023892;                                       // Calculate latitude in 10000" units.
    lat += 3.238272 * north;
    lat -= 0.270978 * east * east;
    lat -= 0.002528 * north * north;
    lat -= 0.0447 * east * east * north;
    lat -= 0.0140 * north * north * north;

    hgt += 49.55;                                               // Convert height [m].
    hgt -= 12.60 * east;
    hgt -= 22.64 * north;

    lon *= 100 / 36;                                            // Convert longitude and latitude back in degrees.
    lat *= 100 / 36;

    var returnObject = new Object();                            // Return new coordinates.
    returnObject.lat = lat;
    returnObject.lon = lon;
    returnObject.hgt = hgt;
    return returnObject;
}



// --------------------------------------------------------------------------



function wgs84_ch1903(lat, lon, hgt)
{
    lat *= 3600;                                                // Convert latitude and longitude in seconds.
    lon *= 3600;

    lat -= 169028.66;                                           // Shift the origin in Bern.
    lon -= 26782.5;

    lat /= 10000;                                               // Convert latitude and longitude in 10000" units.
    lon /= 10000;

    var east = 600072.37;                                       // Calculate easting [m].
    east += 211455.93 * lon;
    east -= 10938.51 * lon * lat;
    east -= 0.36 * lon * lat * lat;
    east -= 44.54 * lon * lon * lon;

    var north = 200147.07;                                      // Calculate northing [m].
    north += 308807.95 * lat;
    north += 3745.25 * lon * lon;
    north += 76.63 * lat * lat;
    north -= 194.56 * lon * lon * lat;
    north += 119.79 * lat * lat * lat;

    hgt -= 49.55;                                               // Convert height [m].
    hgt += 2.73 * lon;
    hgt += 6.94 * lat;

    var returnObject = new Object();                            // Return new coordinates.
    returnObject.east = east;
    returnObject.north = north;
    returnObject.hgt = hgt;
    return returnObject;
}



// --------------------------------------------------------------------------
// I/O functions.
// --------------------------------------------------------------------------



function en2ll(east, north)
{

    // if ((east < eastmin) || (east > eastmax) || isNaN(east))    // Test validity of input coordinates.
    // {
    //     console.log("Invalid easting:" + "\n" + eastmin.toString() +" < easting < " +eastmax.toString() );
    //     return(1);
    // }
    // if ((north < northmin) || (north > northmax) || isNaN(north))
    // {
    //     console.log("Invalid northing:" + "\n" + northmin.toString() +" < northing < " +northmax.toString() );
    //     return(1);
    // }

    var wgs84 = ch1903_wgs84(east, north, 0);                   // Transform coordinates.

    return [wgs84.lat.toFixed(dec_precision), wgs84.lon.toFixed(dec_precision)]
}



// --------------------------------------------------------------------------



function ll2en()
{
    var lat = document.getElementById('txtLatDec').value * 1;   // Read input.
    var lon = document.getElementById('txtLonDec').value * 1;

    document.getElementById('txtEast').value = "";              // Clear output.
    document.getElementById('txtNorth').value = "";
    document.getElementById('txtLatDeg').value = "";
    document.getElementById('txtLatMin').value = "";
    document.getElementById('txtLatSec').value = "";
    document.getElementById('txtLonDeg').value = "";
    document.getElementById('txtLonMin').value = "";
    document.getElementById('txtLonSec').value = "";

    if ((lat < latmin) || (lat > latmax) || isNaN(lat))         // Test validity of input coordinates.
    {
        document.getElementById('txtLatDec').value = "";
        alert("Invalid latitude:" + "\n" + latmin.toString() +" < latitude < " +latmax.toString() );
        return(1);
    }
    if ((lon < lonmin) || (lon > lonmax) || isNaN(lon))
    {
        document.getElementById('txtLonDec').value = "";
        alert("Invalid longitude:" + "\n" + lonmin.toString() +" < longitude < " +lonmax.toString() );
        return(1);
    }

    var dms = dec2dms(lat);                                     // Write output: WGS84, deg min sec.
    document.getElementById('txtLatDeg').value = dms.deg;
    document.getElementById('txtLatMin').value = dms.min;
    document.getElementById('txtLatSec').value = dms.sec;
    dms = dec2dms(lon);
    document.getElementById('txtLonDeg').value = dms.deg;
    document.getElementById('txtLonMin').value = dms.min;
    document.getElementById('txtLonSec').value = dms.sec;

    var ch1903 = wgs84_ch1903(lat, lon, 0);                     // Transform coordinates.

    document.getElementById('txtEast').value = Math.round(ch1903.east); // Write output: CH1903, meters.
    document.getElementById('txtNorth').value = Math.round(ch1903.north);

    return(0);
}



// --------------------------------------------------------------------------



function lldms2en()
{
    var latd = document.getElementById('txtLatDeg').value * 1;  // Read input.
    var latm = document.getElementById('txtLatMin').value * 1;
    var lats = document.getElementById('txtLatSec').value * 1;
    var lond = document.getElementById('txtLonDeg').value * 1;
    var lonm = document.getElementById('txtLonMin').value * 1;
    var lons = document.getElementById('txtLonSec').value * 1;

    document.getElementById('txtEast').value = "";              // Clear output.
    document.getElementById('txtNorth').value = "";
    document.getElementById('txtLatDec').value = "";
    document.getElementById('txtLonDec').value = "";

    var lat = latd + (latm / 60) + (lats / 3600);
    var lon = lond + (lonm / 60) + (lons / 3600);

    if ((lat < latmin) || (lat > latmax) || isNaN(lat))         // Test validity of input coordinates.
    {
        document.getElementById('txtLatDeg').value = "";
        document.getElementById('txtLatMin').value = "";
        document.getElementById('txtLatSec').value = "";
        alert("Invalid latitude:" + "\n" + latmin.toString() +" < latitude < " +latmax.toString() );
        return(1);
    }
    if ((lon < lonmin) || (lon > lonmax) || isNaN(lon))
    {
        document.getElementById('txtLonDeg').value = "";
        document.getElementById('txtLonMin').value = "";
        document.getElementById('txtLonSec').value = "";
        alert("Invalid longitude:" + "\n" + lonmin.toString() +" < longitude < " +lonmax.toString() );
        return(1);
    }

    document.getElementById('txtLatDec').value = lat.toFixed(dec_precision);    // Write output: WGS84, decimal.
    document.getElementById('txtLonDec').value = lon.toFixed(dec_precision);

    var ch1903 = wgs84_ch1903(lat, lon, 0);                     // Transform coordinates.

    document.getElementById('txtEast').value = Math.round(ch1903.east); // Write output: CH1903, meters.
    document.getElementById('txtNorth').value = Math.round(ch1903.north);

    return(0);
}



// --------------------------------------------------------------------------
// Geolocation functions.
// --------------------------------------------------------------------------



// This function, called by the "Get current location" button, will try to
// find the current coordinates, if supported by the browser.
// If the browser supports geolocation, the function show_position() is
// called, if not, show_error() is called instead.
function cmd_get_location()
{
    document.getElementById('txtLatDec').value = "";            // Erase current coordinates.
    document.getElementById('txtLonDec').value = "";

    document.getElementById('txtEast').value = "";              // Erase corresponding results.
    document.getElementById('txtNorth').value = "";

    document.getElementById('txtLatDeg').value = "";
    document.getElementById('txtLatMin').value = "";
    document.getElementById('txtLatSec').value = "";

    document.getElementById('txtLonDeg').value = "";
    document.getElementById('txtLonMin').value = "";
    document.getElementById('txtLonSec').value = "";

    if (navigator.geolocation)                                  // Check if geolocation is supported.
        navigator.geolocation.getCurrentPosition(show_position, show_error);
    else
        window.alert("Geolocation is not supported by this browser.");
}



// --------------------------------------------------------------------------



// This function is called by the cmd_get_location() function only if the
// browser supports geolocation. It updates the coordinates field with the
// current position and calculates the coordinate conversion if the current
// posistion is within the swiss grid boundaries.
function show_position(position)
{
    var lat, lon;

    lat = position.coords.latitude.toFixed(6);                  // get current llocation.
    lon = position.coords.longitude.toFixed(6);

    document.getElementById('txtLatDec').value = lat;           // Write current location.
    document.getElementById('txtLonDec').value = lon;

    var dms = dec2dms(lat);                                     // Write current location also in dms format.
    document.getElementById('txtLatDeg').value = dms.deg;
    document.getElementById('txtLatMin').value = dms.min;
    document.getElementById('txtLatSec').value = dms.sec;
    dms = dec2dms(lon);
    document.getElementById('txtLonDeg').value = dms.deg;
    document.getElementById('txtLonMin').value = dms.min;
    document.getElementById('txtLonSec').value = dms.sec;

    if ((lat >= latmin) && (lat <= latmax) && (lon >= lonmin) && (lon <= lonmax))   // Convert to CH1903 if coordinates are within swiss grid boundaries.
        ll2en();
}



// --------------------------------------------------------------------------



// This function is called by cmd_get_location() when an error occurred while
// determining the current location.
function show_error(error)
{
    switch(error.code)
    {
        case error.PERMISSION_DENIED:
            window.alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            window.alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            window.alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            window.alert("An unknown error occurred.");
            break;
    }
}
cantons.features.forEach(canton => {
  let props = canton.properties;
  // if (props.Nom_abbr !== 'FR') {
  //   console.log('Skip', props.Nom_abbr);
  //   return;
  // }
  let o = '';
  // console.log(canton.geometry.coordinates[4][0].length);
  let coordinates = canton.geometry.coordinates[3][0];
  if (coordinates.length === 2) {
    coordinates = canton.geometry.coordinates[0];
  }
  let test = []
  coordinates.forEach(c => {
    let cc = en2ll(c[0], c[1]);
    test.push([parseFloat(cc[1]), parseFloat(cc[0])]);
    o += cc[0] + ' ' + cc[1] + ' ';
  });
  console.log(test);
  // return;
  o = o.trim();
  let cm = "curl 'http://overpass-api.de/api/interpreter' -H 'Origin: http://overpass-turbo.eu' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: fr-FR,fr;q=0.8,en-US;q=0.6,en;q=0.4,ca;q=0.2' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36' -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' -H 'Accept: */*' -H 'Referer: http://overpass-turbo.eu/' -H 'X-Requested-With: overpass-ide' -H 'Connection: keep-alive' --data data=";
  let data = `<?xml version="1.0" encoding="UTF-8"?>
<osm-script output="json">
  <union>
    <query type="node">
      <has-kv k="building"/>
      <polygon-query bounds="` + o + `"/>
    </query>
    <query type="way">
      <has-kv k="building"/>
      <polygon-query bounds="` + o + `"/>
    </query>
    <query type="relation">
      <has-kv k="building"/>
      <polygon-query bounds="` + o + `"/>
    </query>
  </union>
  <print mode="skeleton"/>
  <recurse type="down"/>
  <print mode="skeleton"/>
</osm-script>`;
  cm += encodeURIComponent(data);
  cm += ' > buildings/' + props.Nom_abbr + '.json.gz';
  console.log(cm);

  // console.log(data);

  child_process.execSync(cm);
});

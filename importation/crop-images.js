'use strict';
const polygonBoolean = require('2d-polygon-boolean');
const greinerHormann = require('greiner-hormann');
const request = require('request');
const fs = require('fs');
const sharp = require('sharp');

var MERCATOR_RANGE = 256;

function bound(value, opt_min, opt_max) {
  if (opt_min != null) value = Math.max(value, opt_min);
  if (opt_max != null) value = Math.min(value, opt_max);
  return value;
}

function degreesToRadians(deg) {
  return deg * (Math.PI / 180);
}

function radiansToDegrees(rad) {
  return rad / (Math.PI / 180);
}

function MercatorProjection() {
  this.pixelOrigin_ = {x: MERCATOR_RANGE / 2, y: MERCATOR_RANGE / 2};
  this.pixelsPerLonDegree_ = MERCATOR_RANGE / 360;
  this.pixelsPerLonRadian_ = MERCATOR_RANGE / (2 * Math.PI);
};

MercatorProjection.prototype.fromLatLngToPoint = function(latLng, opt_point) {
  var me = this;

  var point = opt_point || {x: 0, y:0};

  var origin = me.pixelOrigin_;
  point.x = origin.x + latLng.x * me.pixelsPerLonDegree_;
  // NOTE(appleton): Truncating to 0.9999 effectively limits latitude to
  // 89.189.  This is about a third of a tile past the edge of the world tile.
  var siny = bound(Math.sin(degreesToRadians(latLng.y)), -0.9999, 0.9999);
  point.y = origin.y + 0.5 * Math.log((1 + siny) / (1 - siny)) * -me.pixelsPerLonRadian_;
  return point;
};

MercatorProjection.prototype.fromPointToLatLng = function(point) {
  var me = this;

  var origin = me.pixelOrigin_;
  var lng = (point.x - origin.x) / me.pixelsPerLonDegree_;
  var latRadians = (point.y - origin.y) / -me.pixelsPerLonRadian_;
  var lat = radiansToDegrees(2 * Math.atan(Math.exp(latRadians)) - Math.PI / 2);
  return {y: lat, x: lng};
};

//pixelCoordinate = worldCoordinate * Math.pow(2,zoomLevel)

function getCorners(center,zoom,mapWidth,mapHeight){
    var scale = Math.pow(2,zoom);
    var centerPx = proj.fromLatLngToPoint(center);
    var SWPoint = {x: (centerPx.x -(mapWidth/2)/ scale) , y: (centerPx.y + (mapHeight/2)/ scale)};
    var SWLatLon = proj.fromPointToLatLng(SWPoint);
    // console.log('SW: ', SWLatLon);
    var NEPoint = {x: (centerPx.x +(mapWidth/2)/ scale) , y: (centerPx.y - (mapHeight/2)/ scale)};
    var NELatLon = proj.fromPointToLatLng(NEPoint);
    // console.log(' NE: ', NELatLon);

    return {sw: SWLatLon, ne: NELatLon};
}

function cornersToPolygon(corners) {
  return [
    [corners.sw.x, corners.ne.y],
    [corners.ne.x, corners.ne.y],
    [corners.ne.x, corners.sw.y],
    [corners.sw.x, corners.sw.y]
  ];
}

function findSquareEnvelop(polygon) {
  let xmin = polygon[0][0];
  let xmax = polygon[0][0];
  let ymin = polygon[0][1];
  let ymax = polygon[0][1];

  polygon.forEach(v => {
    if (v[0] < xmin) {
      xmin = v[0];
    }
    if (v[0] > xmax) {
      xmax = v[0];
    }
    if (v[1] < ymin) {
      ymin = v[1];
    }
    if (v[1] > ymax) {
      ymax = v[1];
    }
  });

  // return [
  //   [xmin, ymin],
  //   [xmin, ymax],
  //   [xmax, ymax],
  //   [xmax, ymin]
  // ];
  return {
    xmin: xmin,
    xmax: xmax,
    ymin: ymin,
    ymax: ymax
  };
}

function genURL(x, y) {
  return "https://maps.googleapis.com/maps/api/staticmap?center=" + y + "," + x + "&zoom=20&scale=false&size=640x640&maptype=satellite&format=png&visual_refresh=true&key=AIzaSyDYZKKfVItyAX93tXakxFB-RH87GU7G01E";
}

var proj = new MercatorProjection();
var centerPoint = {y: 46.520968, x: 6.609772};
var zoom = 20;

let nberrors = 0;
let nbqueries = 0;
let cchanged = false;
function processBuilding(b) {
  let cantonc = cantons[canton];
  if (!b.geometry || b.geometry.type != 'LineString' || !b.geometry.coordinates) {
    nberrors++;
    return processNext();
  }

  let center = b.geometry.coordinates.reduce((o, c) => {
    o[0] += c[0];
    o[1] += c[1];
    return o;
  }, [0, 0]);
  let l = b.geometry.coordinates.length;

  center[0] /= l;
  center[1] /= l;

  let id = center[0] + ',' + center[1];
  if ((fs.existsSync('croped/' + cantonc + '/' + id + '.png') && fs.statSync('croped/' + cantonc + '/' + id + '.png').size > 100 && infos[id] !== undefined) || !fs.existsSync('imagesraw/' + cantonc + '/' + id + '.png') || fs.statSync('imagesraw/' + cantonc + '/' + id + '.png').size <= 100 || fs.statSync('imagesraw/' + cantonc + '/' + id + '.png').size === 6563) {
    return processNext();
  }

  let centerPoint = {y: center[1], x: center[0]};
  let corners = getCorners(centerPoint, zoom, 640, 640);
  let polygonSquare = cornersToPolygon(corners);
  let polygonBuilding = b.geometry.coordinates.slice(0, -1);
  let extractedPolygon = greinerHormann.intersection(polygonBuilding, polygonSquare);
  if (!extractedPolygon) {
    console.log('No building');
    return processNext();
  }
  cchanged = true;
  let squareEnvelop = findSquareEnvelop(extractedPolygon[0]);
  // console.log(center[1] + ', ' + center[0]);
  // console.log(polygonSquare);
  // console.log(polygonBuilding);
  // console.log(extractedPolygon);
  // console.log(squareEnvelop);
  // console.log(corners);

  let url = genURL(center[0], center[1]);

  infos[id] = {
    center: centerPoint,
    polygonBuilding: b.geometry.coordinates,
    extractedPolygon: extractedPolygon,
    squareEnvelop: squareEnvelop
  };

  if (fs.existsSync('croped/' + cantonc + '/' + id + '.png') && fs.statSync('croped/' + cantonc + '/' + id + '.png').size > 100) {
    return processNext();
  }

  // 0 - 640
  // corners.nw.x - corners.ne.x
  // squareEnvelop.xmin - squareEnvelop.xmax
  let left = Math.floor((squareEnvelop.xmin - corners.sw.x)/(corners.ne.x - corners.sw.x)*640);
  let top = Math.floor((squareEnvelop.ymin - corners.sw.y)/(corners.ne.y - corners.sw.y)*640);
  let width = Math.ceil((squareEnvelop.xmax - squareEnvelop.xmin)/(corners.ne.x - corners.sw.x)*640);
  let height = Math.ceil((squareEnvelop.ymax - squareEnvelop.ymin)/(corners.ne.y - corners.sw.y)*640);

  // console.log(left, top, width, height, left+width, top+height);
  nbqueries += 1;
  sharp('imagesraw/' + cantonc + '/' + id + '.png').on('error', (e) => {
    console.log('erreur');
    nbqueries--;
    processNext();
    processNext();
  }).extract({left: left, top: top, width: width, height: height})
    .pipe(fs.createWriteStream('croped/' + cantonc + '/' + id + '.png'))
    .on('close', () => {
      // console.log('youhou');
      nbqueries--;
      processNext();
      processNext();
    })
    .on('error', (e) => {
      console.log('erreur');
      nbqueries--;
      processNext();
      processNext();
    });
};

let cantons = fs.readdirSync('osm');
let canton = 0;
let i = 0;
let cantonsl = cantons.length;
let cfile = JSON.parse(fs.readFileSync('./osm/' + cantons[canton]));
let cantonl = cfile.features.length;
try {
  fs.mkdirSync('croped/' + cantons[canton]);
} catch (e) {
  // rien
}
let infos = {};
if (fs.existsSync('./croped-json/' + cantons[canton])) {
  infos = JSON.parse(fs.readFileSync('./croped-json/' + cantons[canton]));
} else {
  fs.writeFileSync('./croped-json/' + cantons[canton], "{}");
}

function processNext() {
  if (nbqueries > 50) {
    return;
  }

  if (i >= cantonl) {
    console.log('New canton');
    if (cchanged) {
      fs.writeFileSync('./croped-json/' + cantons[canton] + '.temp', JSON.stringify(infos), {encoding: 'utf8'});
      fs.renameSync('./croped-json/' + cantons[canton] + '.temp', './croped-json/' + cantons[canton]);
    }

    canton += 1;
    if (canton >= cantonsl) {
      return;
    }
    i = 0;
    cfile = JSON.parse(fs.readFileSync('./osm/' + cantons[canton]));
    cantonl = cfile.features.length;
    try {
      fs.mkdirSync('croped/' + cantons[canton]);
    } catch (e) {
      // rien
    }

    if (fs.existsSync('./croped-json/' + cantons[canton])) {
      infos = JSON.parse(fs.readFileSync('./croped-json/' + cantons[canton]));
    } else {
      fs.writeFileSync('./croped-json/' + cantons[canton], "{}");
      infos = {};
    }
    cchanged = false;
  }
  if (canton >= cantonsl) {
    return;
  }

  if (i % 100 === 0) {
    console.log(cantons[canton], canton, i);
  }
  i++;
  if (cchanged && (i % 10000) === 0) {
    fs.writeFileSync('./croped-json/' + cantons[canton] + '.temp', JSON.stringify(infos), {encoding: 'utf8'});
    fs.renameSync('./croped-json/' + cantons[canton] + '.temp', './croped-json/' + cantons[canton]);
    cchanged = false;
  }

  return processBuilding(cfile.features[(i - 1)]);
}

for (let j = 0; j < 100; j++) {
  processNext();
}
// console.log(greinerHormann.intersection([[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]], [[0.5, 0.5], [0.5, 2], [2, 2], [2, 0.5], [0.5, 0.5]]));

console.log('Fini', nberrors);

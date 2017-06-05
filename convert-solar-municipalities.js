const fs = require('fs');
const topojson = require('topojson');
const ClipperLib = require('jsclipper').ClipperLib;
const child_process = require('child_process');

const scalef = 1000000;
const solarv = 0.5;

let processCanton = function processCanton(cn) {
  console.log('Launch', cn, 'convertion');
  let solarData = fs.readFileSync('data/classed/' + cn.toUpperCase() + '.json.txt', {encoding: 'utf8'}).split('\n').map(p => {
    p = p.split(':');
    let c = p[0].split(',');
    return {
      p: new ClipperLib.IntPoint(scalef*parseFloat(c[0]), scalef*parseFloat(c[1])),
      id: p[0].replace('.png', ''),
      v: parseFloat(p[1])
    };
  });
  let buildings = JSON.parse(fs.readFileSync('./data/croped-json/' + cn.toUpperCase() + '.json'));
  let municipalitiesData = JSON.parse(fs.readFileSync('./www/data/' + cn.toLocaleLowerCase() + '-municipalities.json'));
  let roads = [];
  if (fs.statSync('./data/roads/final/' + cn.toUpperCase() + '.json').size > 100) {
    roads = JSON.parse(fs.readFileSync('./data/roads/final/' + cn.toUpperCase() + '.json')).features;
  }

  solarData.forEach(sd => {
    if (!buildings[sd.id]) {
      // console.log(sd.id);
      return;
    }
    buildings[sd.id].solar = sd.v;
    buildings[sd.id].id = sd.id;
  });
  let municipalities = topojson.feature(municipalitiesData, municipalitiesData.objects.municipalities);

  console.log('Municipalities:', municipalities.features.length);
  console.log('Buildings tagged:', solarData.length);
  console.log('Loop length:', municipalities.features.length*solarData.length);
  // console.log(municipalities.features[23].geometry.coordinates);

  let o = {};
  municipalities.features.forEach(mn => {
    // console.log(mn.properties.name);
    let m = {
      properties: mn.properties,
      buildings: [],
      numberBuildings: 0,
      numberSolar: 0,
      roads: []
    };
    mn.geometry.coordinates.forEach(coordinates => {
      if (coordinates[0].length > 5) {
        coordinates = coordinates[0];
      }
      let poly = coordinates.map(p => { return {X: p[0]*scalef, Y: p[1]*scalef} });
      solarData.forEach(sd => {
        let inpoly = ClipperLib.Clipper.PointInPolygon(sd.p, poly);
        if (inpoly !== 0) {
          m.buildings.push(buildings[sd.id]);
          if (sd.v < solarv) {
            m.numberSolar += 1;
          }
          m.numberBuildings += 1;
        }
      });
      roads.forEach(r => {
        let c = r.geometry.coordinates[0];
        let p = new ClipperLib.IntPoint(scalef*parseFloat(c[0]), scalef*parseFloat(c[1]));
        let inpoly = ClipperLib.Clipper.PointInPolygon(p, poly);
        if (inpoly !== 0) {
          m.roads.push(r);
        }
      });
    });
    o[mn.properties.id] = m;
  });

  fs.writeFileSync('data/combined/' + cn.toUpperCase() + '.json', JSON.stringify(o));
};

let test = function test(cn, ville) {
  let infos = JSON.parse(fs.readFileSync('./data/combined/' + cn.toUpperCase() + '.json'));
  Object.keys(infos).forEach(k => {
    if (infos[k].properties.name === ville) {
      delete infos[k].buildings;
      console.log(infos[k]);
    }
  });
};

let prepareDivided = function prepareDevided(name, files) {
  let newf = {};
  files.forEach(f => {
    let file = JSON.parse(fs.readFileSync('./data/croped-json/' + f));
    Object.assign(newf, file);
  });
  fs.writeFileSync('./data/croped-json/' + name, JSON.stringify(newf), { encoding: 'utf8'});

  fs.closeSync(fs.openSync('./data/classed/' + name + '.txt', 'w'));
  files.forEach(f => {
    child_process.execSync('cat data/classed/' + f + '.txt >> data/classed/' + name + '.txt');
  });
};


let files = fs.readdirSync('data/classed/');

let divided = {};
files.forEach(f => {
  if (f.match(/[0-9]/)) {
    let name = f.replace(/[0-9]+/, '').replace('.txt', '');
    if (!divided[name]) {
      divided[name] = [];
    }
    divided[name].push(f.replace('.txt', ''));
  }
});
Object.keys(divided).forEach(name => {
  console.log('Prepare divided for ' + name, divided[name]);
  prepareDivided(name, divided[name]);
});

files.forEach(f => {
  let cn = f.replace('.json.txt', '');
  if (cn === 'FL' || cn === 'GZ' || cn.match(/[0-9]/)) {
    return;
  }
  processCanton(cn.toLocaleLowerCase());
});

// processCanton('vs');

// test('vd', 'Lausanne');

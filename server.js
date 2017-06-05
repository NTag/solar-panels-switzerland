const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const municipalitiesFolder = './data/combined/';

let cantons = {};
let solarStats = {cantons: {}, cantonsmn: {}};
fs.readdir(municipalitiesFolder, (err, files) => {
  files.forEach(file => {
    cantons[file.replace('.json', '')] = JSON.parse(fs.readFileSync('./' + path.join(municipalitiesFolder, file)));
  });

  Object.keys(cantons).forEach(cn => {
    let canton = cantons[cn];
    let numberBuildings = 0;
    let numberSolar = 0;
    let o = {};
    Object.keys(canton).forEach(mn => {
      let mun = canton[mn];
      numberBuildings += mun.numberBuildings;
      numberSolar += mun.numberSolar;
      o[mn] = {
        nb: mun.numberBuildings,
        ns: mun.numberSolar,
        v: mun.numberSolar/mun.numberBuildings*100
      };
    });
    if (numberBuildings > 1000) {
      solarStats.cantons[cn] = {
        nb: numberBuildings,
        ns: numberSolar,
        v: numberSolar/numberBuildings*100
      };
      solarStats.cantonsmn[cn] = o;
    }
  });

  console.log('Data loaded');
});


app.use(express.static('www'));

app.get('/canton/:cn/:id', function (req, res) {
  if (!cantons[req.params.cn.toUpperCase()] || !cantons[req.params.cn.toUpperCase()][req.params.id]) {
    res.status(404).send();
  } else {
    res.send(cantons[req.params.cn.toUpperCase()][req.params.id]);
  }
});

app.get('/solar/cantons', function (req, res) {
  res.send(solarStats.cantons);
});

app.get('/solar/cantons/:cn', function (req, res) {
  if (!solarStats.cantonsmn[req.params.cn]) {
    res.status(404).send();
  } else {
    res.send(solarStats.cantonsmn[req.params.cn]);
  }
});

app.listen(3001, function () {
  console.log('Server listening on port 3001!');
});

const express = require('express');
const app = express();
const fs = require('fs');
const NMAX = 15000;
let labels = require('./labels.json');

app.use(express.static('images'));

app.get('/images', function (req, res) {
  let images = [];
  fs.readdir('images', (err, files) => {
    let i = 0;
    files.forEach(file => {
      if (file.match(/png$/)) {
        if (i++ >= NMAX) {
          return;
        }

        if (labels[file.replace('.png', '')] !== undefined) {
          return;
        }

        images.push(file);
      }
    });

    console.log(images.length + " images remaining to label");
    res.send(images);
  });
});

app.get('/image/:img/:type', function (req, res) {
  labels[req.params.img.replace('.png', '')] = req.params.type === '1';

  fs.writeFileSync('./labels.json', JSON.stringify(labels), {encoding: 'utf8'});

  res.sendStatus(201);
});

app.listen(3000, function () {
  console.log('Server listening on port 3000!');
});

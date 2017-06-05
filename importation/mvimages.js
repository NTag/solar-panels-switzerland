'use strict';

const labels = require('./labels.json');
const fs = require('fs-extra');

fs.mkdirSync('./images/train');
fs.mkdirSync('./images/train/with');
fs.mkdirSync('./images/train/without');
fs.mkdirSync('./images/validation');
fs.mkdirSync('./images/validation/with');
fs.mkdirSync('./images/validation/without');

let nbWith = 0;
for (let name in labels) {
  if (labels[name]) {
    nbWith++;
  }
}
let nbWithout = 0;

let nbs = {
  train: {
    with: 0, without: 0
  },
  validation: {
    with: 0, without: 0
  }
};

let i = 0;
for (let name in labels) {
  if (name === "undefined") {
    continue;
  }
  if (i++ % 100 === 0) {
    console.log(i);
  }
  let folder = './images';
  let st;
  if (Math.random() < 0.1) {
    folder += '/validation';
    st = nbs.validation;
  } else {
    folder += '/train';
    st = nbs.train;
  }
  if (labels[name]) {
    folder += '/with';
    st.with++;
    fs.copySync('./images/' + name + '.png', folder + '/' + name + '.png');
  } else if (nbWithout <= nbWith && Math.random() < 0.3) {
    folder += '/without';
    st.without++;
    nbWithout++;
    fs.copySync('./images/' + name + '.png', folder + '/' + name + '.png');
  }

}
console.log(nbs);

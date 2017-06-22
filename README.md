# Mapping the solar panels of Switzerland

Project in the context of **EPFL | Media & Design Lab | Personal Interaction Studio 2017**.  
Course Tutors:
* Immanuel Koh 
* Jeffrey Huang

## Requirements

* NodeJS v7;
* NPM v4;

## Installation

```bash
npm install
cd data/combined/
unzip *
cd ../../
cd www/
git clone https://github.com/Box9/jss.git
unzip data.zip
cd ../
node server.js
```

Then, open `localhost:3001/swiss.html` in your browser.

## Demo
* Demo online: https://youtu.be/ldhTz71pTIA
* Slides: `mapping-swiss-solar-panels.pdf`

## Abstract
Today, a lot of information is available on the internet about topography: the coordinates of roads, of buildings, their types, sometimes their 3D shape, thanks to OpenStreetMap. With the Google Project Sunroof, or the Sonnen Dach Swiss project, it is also possible to know how much sunlight a given building receives per year on its roof, a useful information for the decision of installing solar panels.  
However, what is not yet available is wether a given building already has a solar panel or not on its roof. Similarly to the Big Atlas of Los Angeles Pools, I decided to map the solar panels of Switzerland, using satellite images.
The project can be divided in three steps:

1. Detecting if the satellite image of a roof has a solar panel on it or not;
2. Applying this classifier to all buildings in Switzerland;
3. Visualizing this data.

Given the various shapes and colors solar panels can take, I decided to use machine learning instead of image processing to detect solar panels in satellite images. I first had to create manually a dataset, by labeling 15k satellite images of buildings in Lausanne area. With it, I fine-tuned an existing neural network (using a balanced training set of 2*900 images, and a validation set of 2*100 images) achieving an accuracy of 85%.

Then, I used OpenStreetMap to download the coordinates of all the buildings inside each canton (which are polygons - I touched the limits of OpenStreepMap Overpass API with big cantons like Bern, which I had to split), and Google Maps Static API to download the satellite image of each building (using four API keys, achieving a rate of 100k images per day). I cropped each image to keep only the building, and used the neural network to classify each image. Finally, I computed the percentage of buildings with solar panels in each municipality and in each canton.

The last step was to create a visualization: I chose an interactive SVG map. When starting, the user only sees the cantons, whose color indicates the percentage of buildings with solar panels; then he/she can click on one canton to see the municipalities inside; then click on one municipality to see the buildings inside it (with a different color for those with a solar panel); and finally when clicking on a building, the satellite image of it is displayed, and the user has the possibility to un/confirm the presence or not of a solar panel (the goal is to use crowdsourcing to improve the accuracy of the neural network).

This map is a new kind of visualization, where you can start from the country level, and zoom up to the image of each building, which has been used to compute the statistics, and confirm or unconfirm it. Moreover, this is the first map showing the actual solar panels in a country, opening the door to comparisons or correlations with economical, political or ecological data.

## References

* https://github.com/interactivethings/swiss-maps (the amazing output of it is included directly in the project, in the `www/data.zip` file)
* http://work.interactivethings.com/nzz-swiss-maps/index.html
* https://bost.ocks.org/mike/map/
* https://www.bfs.admin.ch/bfs/fr/home/statistiques/catalogues-banques-donnees/donnees.html
* https://github.com/m2dsupsdlclass/lectures-labs/blob/master/labs/03_conv_nets/Fine_Tuning_Deep_CNNs_with_GPU_rendered.ipynb
* http://benedikt-gross.de/log/2013/06/the-big-atlas-of-la-pools/

# Gathering the data

## Disclaimer
It's not clone-and-play. You will have to read, understand and change the code so everything works. You will have problems with big cantons.
If there is something you don't understand or a missing script, don't hesitate to open an issue.

## Coordinates of buildings
* The script `dl-swiss.js` tries to download the coordinates of the buildings in each canton. It outputs `.gz` files;
* `cd buildings && gunzip *.gz`;
* `mkdir buildings/osm`;
* The script `o2g.php` converts the previous files to GeoJSON format.

## Coordinates of roads
* The script `dl-roads.js` tries to download the coordinates of the roads in each canton. It outputs `.gz` files;
* gunzip the files;
* The script `roads2g.php` converts the previous files to GeoJSON format;
* Put them in a `roads` folder.

## Processing images
* The script `import-swiss.js` downloads satellite images from Google Maps Static API. It assumes the GeoJSON with the buildings coordinates are in a `./osm` folder. It needs a `./imagesraw` folder in which it will download the images. It needs Google Maps API Keys, that you must specify line 8 (you can put as many as you'd like - one key allows 25k downloads per day, there are around 2M buildings in Switzerland, the more keys you have, the faster you can download all Switzerland);
* The script `crop-images.js` crops the just downloaded images to have only the building. It needs a `./croped-json` folder in which it will write some JSON information about the coordinates of the buildings. It also needs a `./croped` folder in which it will save the cropped images. Of course, it reads the images from the `./imagesraw` folder;
* The script `tag-swiss.py` will classify the satellite images (with or without a solar panel). It will read the cropped images in a `./croped` folder, and it needs a `./classed` folder in which it will write the results of the classification;

## Computing statistics
* The script `../convert-solar-municipalities.js` will create combined JSON in `../data/combined/` used by the `../server.js`;
* It will need access to `classed`, `croped-json` and `roads` folders, and assume they are in the `../data` folder.

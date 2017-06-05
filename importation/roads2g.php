<?php
require('Overpass2Geojson.php');

$files = scandir('buildings/roads/overpass2');
foreach ($files as $f) {
  echo $f . "\n";
  if (file_exists('buildings/roads/final/' . $f . '.json')) {
    echo "Exists\n";
    continue;
  }
  $data = file_get_contents('buildings/roads/overpass2/' . $f);
  $geojson = Overpass2Geojson::convertWays($data);
  file_put_contents('buildings/roads/final/' . $f . '.json', $geojson);
}

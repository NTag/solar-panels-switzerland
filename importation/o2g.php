<?php
require('Overpass2Geojson.php');

$files = scandir('buildings');
foreach ($files as $f) {
  echo $f . "\n";
  if (!preg_match('#json$#', $f)) {
    echo "Not json\n";
    continue;
  }
  if (file_exists('buildings/osm/' . $f)) {
    echo "Exists\n";
    continue;
  }
  $data = file_get_contents('buildings/' . $f);
  $geojson = Overpass2Geojson::convertWays($data);
  file_put_contents('buildings/osm/' . $f, $geojson);
}

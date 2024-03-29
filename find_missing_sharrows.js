const reader = require('geojson-writer').reader
const turf = require('@turf/turf')
const ruler = require('cheap-ruler')(45.41, 'meters')
const rbush = require('geojson-rbush')
const geojsontoosm = require('geojsontoosm');
const fs = require('fs');

const bikelaneTree = rbush()

const roadsWithMissingBikelanes = [];

const inBikelanesPath = "data/ottawaSuggestedRoutes.json"
const inRoadDataPath = "data/highways.json"
const outOsmPath = "data/roads_with_missing_sharrows.osm"

const kOffsetFromRoadEnd = 5   //disregard kRoadTestStep meters from road end
const kRoadTestStep = 3        //test points with kRoadTestStep meters staticBasePath
const kPointDistanceNearby = 15 //if there is a sidewalk within kPointDistanceNearby meters - point has sidewalk
const kPointsWithBikelaneThreshold = 0.80 //kPointsWithSidewalksThreshold of road points have sidewalk nearby -> road has sidewalk
const kTooShortThreshold = 40

console.time('Time')
console.log('Loading sharrows ...')
const bikelanes = reader(inBikelanesPath)
bikelaneTree.load(bikelanes)
console.log('Loaded', bikelanes.features.length,'sharrows')

console.log('Loading roads ...')


let roads = reader(inRoadDataPath).features.filter(road => road.geometry.type=='LineString' &&
  (!road.properties.name || road.properties.name.indexOf('Transitway')==-1) &&
  (road.properties.highway == "trunk" ||
  road.properties.highway == "trunk_link" ||
  road.properties.highway == "primary" ||
  road.properties.highway == "secondary" ||
  road.properties.highway == "secondary_link" ||
  road.properties.highway == "tertiary_link" ||   //do we need to tag links at all?
  road.properties.highway == "residential" ||
  road.properties.highway == "service" ||
  road.properties.highway == "tertiary" ||
  road.properties.highway == "unclassified" ));

console.log('Loaded', roads.length,'roads')



for (let road of roads) {
  if(road.properties['cycleway']=='shared_lane'
  || road.properties['cycleway:left']=='shared_lane'
  || road.properties['cycleway:right']=='shared_lane'
  || road.properties['cycleway:both']=='shared_lane'){
    continue;
  }
  const roadlen = ruler.lineDistance(road.geometry.coordinates)
  let offset = kOffsetFromRoadEnd;
  let foundBikelane=false
  let pointsTotal=0;
  let pointsWithBikelane=0, pointsWithNoBikelane=0;
  const bbox = turf.bbox(road)
  bbox[0]-=0.001    //expand bbox by 0.001 ~ 100m
  bbox[1]-=0.001
  bbox[2]+=0.001
  bbox[3]+=0.001

  let nearby = bikelaneTree.search(bbox).features
  let ptPrev = ptNext = road.geometry.coordinates[0]
  while(nearby.length && (pointsTotal==0 || offset<roadlen-kOffsetFromRoadEnd)){
    if(pointsTotal==0 && offset>roadlen-kOffsetFromRoadEnd){offset = roadlen/2} //if segment is really short
    pointsTotal++;
    ptPrev = ptNext
    ptNext = ruler.along(road.geometry.coordinates, offset)

    for(let bikelane of nearby) {

      if(isBikelaneCloseEnough(bikelane.geometry.coordinates, ptNext)) {
        pointsWithBikelane++;
        break;
      }
    }
    offset+=kRoadTestStep
  }
  road.properties.points_tested = pointsTotal
  road.properties.points_with_bikelane = pointsWithBikelane
  road.properties.length = roadlen
  if(pointsTotal){
    if(roadlen<kTooShortThreshold)
    {
      //roadsTooShort.push(road);
    }
    else if(pointsTotal && pointsWithBikelane>=pointsTotal*kPointsWithBikelaneThreshold){  //kPointsWithBikelaneThreshold of points have sidewalk nearby -> good
      roadsWithMissingBikelanes.push(road);
    //  road.properties.bike = 'both'
      console.log(road.properties.name, '- this', road.properties.highway, "road has a sharrow" )
    }
  }

}

//writer(outRoadsWithMissingBikelanesPath, turf.featureCollection(roadsWithMissingBikelanes))

const data = geojsontoosm(turf.featureCollection(roadsWithMissingBikelanes));
fs.writeFile(outOsmPath, data, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Saved! Roads with missing sharrows:", roadsWithMissingBikelanes.length);
    console.timeEnd('Time')
  });

//console.log('Roads with missing bikelanes:', roadsWithMissingBikelanes.length)


function isBikelaneCloseEnough(line, pt){
  const proj = ruler.pointOnLine(line, pt).point
  const dist = ruler.distance(proj,pt)
  //const dist = turf.pointToLineDistance(pt, line, 'meters')   //more precise but ~20 times slower
  return dist < kPointDistanceNearby
}

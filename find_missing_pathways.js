const reader = require('geojson-writer').reader
const turf = require('@turf/turf')
const ruler = require('cheap-ruler')(45.41, 'meters')
const rbush = require('geojson-rbush')
const geojsontoosm = require('geojsontoosm');
const fs = require('fs');

const osmPathTree = rbush()

const missingPathways = [];

const inCityPathwaysPath = "data/ottawaPaths.json"
const inOSMPathwaysPath = "data/highways.json"
const outOsmPath = "data/missing_pathways.osm"

const kOffsetFromPathEnd = 5   //disregard kPathTestStep meters from road end
const kPathTestStep = 3        //test points with kPathTestStep meters staticBasePath
const kPointDistanceNearby = 15 //if there is a sidewalk within kPointDistanceNearby meters - point has sidewalk
const kpointsWithPathThreshold = 0.10 //if <10% of tested points in city path have OSM path nearby => it's missing
const kTooShortThreshold = 0

console.time('Time')
console.log('Loading city pathways ...')
const cityPaths = reader(inCityPathwaysPath)
console.log('Loaded', cityPaths.features.length,'city pathways')

console.log('Loading OSM pathways ...')

const osmPaths = reader(inOSMPathwaysPath).features.filter(path => path.geometry.type=='LineString' &&
  (path.properties.highway == "path" ||
  path.properties.highway == "footway" ||
  path.properties.highway == "cycleway" ));

osmPathTree.load(turf.featureCollection(osmPaths))

console.log('Loaded', osmPaths.length,'OSM pathways')



for (let cityPath of cityPaths.features) {

  const pathLen = ruler.lineDistance(cityPath.geometry.coordinates)
  let offset = kOffsetFromPathEnd;
  let pointsTotal=0;
  let pointsWithPath=0;
  const bbox = turf.bbox(cityPath)
  bbox[0]-=0.001    //expand bbox by 0.001 ~ 100m
  bbox[1]-=0.001
  bbox[2]+=0.001
  bbox[3]+=0.001

  let nearby = osmPathTree.search(bbox).features
  if(nearby.length==0){
    missingPathways.push(cityPath);
    continue
  }
  let ptPrev = ptNext = cityPath.geometry.coordinates[0]
  while(nearby.length && (pointsTotal==0 || offset<pathLen-kOffsetFromPathEnd)){
    if(pointsTotal==0 && offset>pathLen-kOffsetFromPathEnd){offset = pathLen/2} //if segment is really short
    pointsTotal++;
    ptPrev = ptNext
    ptNext = ruler.along(cityPath.geometry.coordinates, offset)

    for(let osmPath of nearby) {

      if(isBikelaneCloseEnough(osmPath.geometry.coordinates, ptNext)) {
        pointsWithPath++;
        break;
      }
    }
    offset+=kPathTestStep
  }
  cityPath.properties.points_tested = pointsTotal
  cityPath.properties.points_with_pathway = pointsWithPath
  cityPath.properties.length = pathLen
  if(pointsTotal){
    if(pathLen<kTooShortThreshold)
    {
      //roadsTooShort.push(road);
    }
    else if(pointsTotal && pointsWithPath<pointsTotal*kpointsWithPathThreshold){  //kpointsWithPathThreshold of points have sidewalk nearby -> good
      missingPathways.push(cityPath);
    //  road.properties.bike = 'both'
    //  console.log(cityPath.properties.name, '- this', cityPath.properties.highway, "road has a shoulder" )
    }
  }

}

//writer(outmissingPathwaysPath, turf.featureCollection(missingPathways))

const data = geojsontoosm(turf.featureCollection(missingPathways));
fs.writeFile(outOsmPath, data, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Saved! Missing pathways found:", missingPathways.length);
    console.timeEnd('Time')
  });

//console.log('Roads with missing bikelanes:', missingPathways.length)


function isBikelaneCloseEnough(line, pt){
  const proj = ruler.pointOnLine(line, pt).point
  const dist = ruler.distance(proj,pt)
  //const dist = turf.pointToLineDistance(pt, line, 'meters')   //more precise but ~20 times slower
  return dist < kPointDistanceNearby
}

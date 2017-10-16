const reader = require('geojson-writer').reader
const writer = require('geojson-writer').writer
const turf = require('@turf/turf')

const inBikeDataPath = 'data/cyclingnetworkshp.json'

const outBikeLanesPath = 'data/ottawaBikeLanes.json'
const outPavedShouldersPath = 'data/ottawaPavedShoulders.json'
const outSuggestedRoutesPath = 'data/ottawaSuggestedRoutes.json'
const outSegregatedBikeLanesPath = 'data/ottawaSegregatedBikeLanes.json'
const outCycleTracksPath = 'data/ottawaCycleTracks.json'
const outPathsPath = 'data/ottawaPaths.json'
const outAdvisoryBikeLanesPath = 'data/ottawaAdvisoryBikeLanes.json'

const bikeLanes = []
const pavedShoulders = []
const suggestedRoutes = []
const paths = []
const segregatedLanes = []
const cycleTracks = []
const advisoryBikeLanes = []
const others = []


console.time('Time')
console.log('Loading bike data ...')
const data = reader(inBikeDataPath)

for(feature of data.features){
  switch(feature.properties.EXISTING_C){
    case 'Bike Lane': bikeLanes.push(feature); break;
    case 'Paved Shoulder': pavedShoulders.push(feature); break;
    case 'Suggested Route': suggestedRoutes.push(feature); break;
    case 'Path': paths.push(feature); break;
    case 'Segregated Bike Lane': segregatedLanes.push(feature); break;
    case 'Cycle Track': cycleTracks.push(feature); break;
    case 'Advisory Bike Lanes': advisoryBikeLanes.push(feature); break;
    default: others.push(feature); break;
  }
}



writer(outBikeLanesPath, turf.featureCollection(bikeLanes))
writer(outPavedShouldersPath, turf.featureCollection(pavedShoulders))
writer(outSuggestedRoutesPath, turf.featureCollection(suggestedRoutes))
writer(outSegregatedBikeLanesPath, turf.featureCollection(segregatedLanes))
writer(outCycleTracksPath, turf.featureCollection(cycleTracks))
writer(outPathsPath, turf.featureCollection(paths))
writer(outAdvisoryBikeLanesPath, turf.featureCollection(advisoryBikeLanes))

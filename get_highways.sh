#!/bin/sh

OUTPUTOSMFILE=./data/highways.osm
OUTPUTJSONFILE=./data/highways.json
QUERYFILE=./highways.query
if [ ! -e $QUERYFILE ]; then
  echo "Error: Missing query file $QUERYFILE"
  exit 1
fi
if [ -e $OUTPUTOSMFILE ]; then
   rm $OUTPUTOSMFILE
fi
wget -nv -O $OUTPUTOSMFILE --post-file=$QUERYFILE "http://overpass-api.de/api/interpreter"
if [ $? -ne 0 ]; then
  echo "Error: There was a problem running wget."
  exit 1
fi

osmtogeojson $OUTPUTOSMFILE > $OUTPUTJSONFILE

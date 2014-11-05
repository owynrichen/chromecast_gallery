#! /bin/bash

curl -X DELETE -d '{ "url": "http://collwrites.com/wp-content/uploads/2012/09/pure-barre-abwork.jpg", "metadataType": "PHOTO"}' -H 'Content-Type: application/json' localhost:8080/media -v
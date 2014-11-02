#! /bin/bash

curl -d '{ "url": "http://collwrites.com/wp-content/uploads/2012/09/pure-barre-abwork.jpg", "metadataType": "PHOTO"}' -H 'Content-Type: application/json' 192.168.1.16:8080/media -v
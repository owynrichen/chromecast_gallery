#! /bin/bash

curl -d "{ \"url\": \"$1\", \"metadataType\": \"PHOTO\"}" -H 'Content-Type: application/json' localhost:8080/media -v
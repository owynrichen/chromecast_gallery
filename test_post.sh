#! /bin/bash

curl -d "{ \"url\": \"$1\", \"metadataType\": \"PHOTO\"}" -H 'Content-Type: application/json' 192.168.1.16:8080/media -v
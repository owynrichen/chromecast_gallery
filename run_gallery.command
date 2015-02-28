#! /bin/bash

PREFIX="sudo -u purebarre"

if [ "$USER" == "purebarre" ]; then
  PREFIX=""
fi

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
NODE_EXEC=/usr/local/bin/node

RESP=`$PREFIX pkill $NODE_EXEC "$DIR/server.js"`
echo $PREFIX pkill $NODE_EXEC \"$DIR/server.js\" >> "$DIR/app.log"
echo $RESP >> "$DIR/app.log"

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome http://localhost:8080

echo $PREFIX $NODE_EXEC \"$DIR/server.js\" >> "$DIR/app.log"
$PREFIX $NODE_EXEC "$DIR/server.js" &> "$DIR/app.log" &

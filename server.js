/**
Copyright (C) 2014 Owyn Richen. All Rights Reserved.

Based on work (C) 2013 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/
var express = require("express"),
    app     = express(),
    port    = 8080;

var config = require('./config.js');
var FB = require('fb');

console.log("Fetching access token for config: " + JSON.stringify(config))
FB.api('oauth/access_token', {
  client_id: config.facebook.app_id,
  client_secret: config.facebook.app_secret,
  grant_type: 'client_credentials'
}, function(res) {
  if (!res || res.error) {
    console.log(!res ? 'error occurred' : res.error);
    return;
  }

  console.log("Access Token: " + res.access_token);

  FB.setAccessToken(res.access_token);
});

var methodOverride = require('method-override');
var bodyParser = require('body-parser');
var sqlite3 = require('sqlite3').verbose();

/*

Helper functions for logging and sqlite3 access

*/

function log(msg) {
  if (msg != null)
    console.log(msg);
}

function db(func, callback, cb2) {
  var dbptr = new sqlite3.Database(__dirname + "/gallery_db.sqlite3");
  dbptr.on('trace', log);
  dbptr.on('profie', function(stmt, time) { console.log(stmt + " took " + time + "ms")});

  try {
    func(dbptr, callback, cb2);
  } catch(err) {
    console.log(err);
  } finally {
    dbptr.close(log);
  }
}

function db_run(statement, func) {
  db(function(dbptr, cb) { dbptr.run(statement, cb) }, func);
}

function db_each(statement, func, func2) {
  db(function(dbptr, cb, complete) {
    dbptr.each(statement, cb, complete)
  }, func, func2);
}

function db_prep(statement, vals, func) {
  db(function(dbptr, cb) {
    var stmt = dbptr.prepare(statement, log);
    stmt.run(vals, log);
    stmt.finalize(log);
  }, func);
}

var results = undefined;
function fbphotos(callback) {

  function inner(limit, after, res) {
    params = {"fields":"images,name,id", "limit" : limit};
    if (after !== 'undefined') {
      params["after"] = after;
    }
    // console.log(JSON.stringify(params));
    FB.api(
    '/1669682333317781/photos',
    'GET',
    params,
    function(response) {
      for (var index in response.data) {
        var photo = response.data[index];
        data = { id: photo.id, url: photo.images[0].source, meta: { metadataType: "PHOTO", width: photo.images[0].width, height: photo.images[0].height }, ordinal: 1 };
        res.push(data);
      }

      if (response.paging !== undefined) {
        inner(limit, response.paging["cursors"]["after"], res);
      } else {
        callback(res);
      }
    });
  }

  if (results === undefined) {
    results = [];
    inner(100, undefined, results);
  } else {
    callback(results);
  }
}

/*

Express.js wireup

*/

//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*'); // NOT SAFE FOR HOSTS ON A PUBLIC NETWORK
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

app.use(allowCrossDomain);
app.use(express.static(__dirname));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/media', function(req, res) {
  console.log("POST /media");
  console.log(req.body);

  var count = 0;
  db_each("SELECT COUNT(1) as count FROM gallery", function (err, row) {
     count = row.count;
  });
  db_prep("INSERT INTO gallery (url, metadataType, ordinal) VALUES (?,?,?)", [req.body.url, req.body.metadataType, count + 1]);

  res.send(JSON.stringify(req.body));
});

app.get('/media', function(req, res) {
  console.log("GET /media");

  fbphotos(function(results) {
    db_each("SELECT rowid as id, url, metadataType, ordinal FROM gallery ORDER BY ordinal DESC",
    function(err, row) {
      data = { id: row.id, url: row.url, meta: { metadataType: row.metadataType }, ordinal: row.ordinal };
      results.push(data);
    },
    function(err, count) {
      log(err);
      console.log(results);
      console.log(results.length + " results returned");

      res.send(JSON.stringify(results));
    });
  });
});

app.put('/media/:id/:ordinal', function(req, res) {
  console.log("PUT /media/" + req.param('id') + "/" + req.param('ordinal'));
  // TODO: this doesn't actually sort things correctly
  db_prep("UPDATE gallery SET ordinal=? WHERE rowid=?", [req.param('ordinal'), req.param('id')]);

  res.send("{}");
});

app.delete('/media/:id', function(req, res) {
  console.log("DELETE /media for:" + req.body);
  db_prep("DELETE FROM gallery WHERE rowid=?", [req.param('id')]);

  res.send(JSON.stringify(req.body));
});

db_run("CREATE TABLE IF NOT EXISTS gallery (url TEXT, metadataType TEXT, ordinal INT)", log);

console.log("Connecting to sqlite3 datafile: " + __dirname + "/gallery_db.sqlite3");
console.log("Starting server on port: " + port);

app.listen(port);

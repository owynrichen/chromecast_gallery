
/**
Copyright (C) 2013 Google Inc. All Rights Reserved.

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

var methodOverride = require('method-override');
var bodyParser = require('body-parser');
var sqlite3 = require('sqlite3').verbose();

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

//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*'); // NOT SAFE FOR PRODUCTION
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
  db_prep("INSERT INTO gallery (url, metadataType, ordinal) VALUES (?,?,1)", [req.body.url, req.body.metadataType]);

  res.send(JSON.stringify(req.body));
});

app.get('/media', function(req, res) {
  console.log("GET /media");
  results = [];

  db_each("SELECT rowid, url, metadataType FROM gallery ORDER BY ordinal DESC",
  function(err, row) {
    data = { url: row.url, meta: { metadataType: row.metadataType } };
    results.push(data);
  },
  function(err, count) {
    log(err);
    console.log(results);
    console.log(count + " results returned");

    res.send(JSON.stringify(results));
  });
});

app.delete('/media', function(req, res) {
  console.log("DELETE /media for:" + req.body);
  db_prep("DELETE FROM gallery WHERE url=? AND metadataType=?", [req.body.url, req.body.metadataType]);

  res.send(JSON.stringify(req.body));
});

db_run("CREATE TABLE IF NOT EXISTS gallery (url TEXT, metadataType TEXT, ordinal INT)", log);

console.log("Connecting to sqlite3 datafile: " + __dirname + "/gallery_db.sqlite3");
console.log("Starting server on port: " + port);
app.listen(port);

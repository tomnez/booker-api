// modules
require('dotenv').load();

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var async = require('async');
var parsers = require('./lib/parsers')();

// express port and router
var router = express.Router();
var port = process.env.PORT || 4500;

// middleware
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  res.header('Content-Type', 'application/json');
  next();
});

// prefix routes with '/api'
app.use('/api', router);

// routes!
router.post('/token', function (req, res) {
  var token = req.body.token;
  var finalResponse = {};

  async.waterfall([
    function(callback) {
      // get token
      request.post({
        url: 'https://www.googleapis.com/oauth2/v3/token',
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        form: {
          "code": token,
          "client_id": process.env.GOOGLE_API_KEY,
          "client_secret": process.env.GOOGLE_SECRET,
          "grant_type": "authorization_code",
          "scope": process.env.GOOGLE_AUTH_SCOPES,
          "redirect_uri": "http://localhost:4200/resources"
        }
      }, function(error, response, body) {
        if (!error) {
          var auth = JSON.parse(body);

          finalResponse.auth = auth;

          callback(null, finalResponse);
        } else {
          callback(error)
        }
      });
    },
    function(finalResponse, callback) {
      // get profile
      request.get({
        url: 'https://www.googleapis.com/plus/v1/people/me',
        headers: {
          "Authorization": "Bearer " + finalResponse.auth.access_token
        }
      }, function (error, response, body) {
        var user = JSON.parse(body);
        finalResponse.user = parsers.parseUsers(user, error, null).user;

        callback(null, finalResponse);
      });
    },
  ], function(error, finalResponse) {
    if (!error) {
      res.json(finalResponse);
    } else {
      res.json(error);
    }
  });
});

router.get('/me', function (req, res) {
  request.get({
    url: 'https://www.googleapis.com/plus/v1/people/me',
    headers: {
      "Authorization": req.headers.authorization
    }
  }, function (error, response, body) {
    var user = JSON.parse(body);
    var finalResponse = parsers.parseUsers(user, error, null);
    res.send(finalResponse);
  });
});

router.post('/revoke', function (req, res) {
  var token = req.body.token;

  request.get({
    url: 'https://accounts.google.com/o/oauth2/revoke?token=' + token,
  }, function(error, response, body) {
    if (response.statusCode === 200) {
      res.status(200).json({});
    } else {
      res.status(response.statusCode).json(error);
    }
  });
});

router.get("/users/:user_id/resources", function (req, res) {
  request({
    url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    headers: {
      "content-type": "application/json",
      "Authorization": req.headers.authorization
    }
  }, function(error, response, body) {
    var data = JSON.parse(body);
    var finalResponse = parsers.parseResources(data.items, error, null);
    res.json(finalResponse);
  });
});

// go!
app.listen(port);
console.log('Booker API listening on port ' + port);

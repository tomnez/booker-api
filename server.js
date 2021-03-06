// modules
require('dotenv').load();

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var async = require('async');
var parsers = require('./lib/parsers')();
var moment = require('moment');
var _ = require('lodash');
var util = require('util');

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
        var error = user.error ? user.error : null;

        if (!error) {
          finalResponse.user = parsers.parseUsers(user, error, null).user;
        }

        callback(error, finalResponse);
      });
    },
  ], function(error, finalResponse) {
    if (!error) {
      res.json(finalResponse);
    } else {
      res.status(error.code).send(error.message);
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
    var error = user.error ? user.error : null;

    if (error) {
      res.status(error.code).send(error.message);
    } else {
      var finalResponse = parsers.parseUsers(user, error, null);
      res.json(finalResponse);
    }
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
  async.waterfall([
    async.apply(getUserResources, req.headers),
    getResourcesFreeBusy
  ], function(error, resourcesWithFreeBusy) {
    res.json(resourcesWithFreeBusy);
  });
});

router.get("/resources/:resource_id/events", function (req, res) {
  var now = moment.utc().toISOString();
  var tomorrow = moment.utc().add(1, 'days').toISOString();

  request({
    url: 'https://www.googleapis.com/calendar/v3/calendars/' + req.params.resource_id + '/events?maxResults=1&timeMin=' + now + '&timeMax=' + tomorrow,
    headers: {
      "content-type": "application/json",
      "Authorization": req.headers.authorization
    }
  }, function(error, response, body) {
    var data = JSON.parse(body);
    var resourceEvent = data.items.length ? parsers.parseEvents(data.items[0]) : {};

    res.json(resourceEvent);
  });
});

function getUserResources (headers, callback) {
  request({
    url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    headers: {
      "content-type": "application/json",
      "Authorization": headers.authorization
    }
  }, function(error, response, body) {
    var data = JSON.parse(body);
    var resources = parsers.parseResources(data.items, error, null);

    callback(error, resources, headers);
  });
};

function createResourceIdsList (resources) {
  var resourceIds = [];

  for (var i = resources.data.length - 1; i >= 0; i--) {
    resourceIds.push({ id: resources.data[i].id });
  };

  return resourceIds;
};

// TODO: add timeZone in body
function getResourcesFreeBusy (resources, headers, callback) {
  var resourceIds = createResourceIdsList(resources);
  var now = moment.utc().toISOString();
  var tomorrow = moment.utc().add(1, 'days').toISOString();

  request.post({
    url: 'https://www.googleapis.com/calendar/v3/freeBusy',
    headers: {
      "content-type": "application/json",
      "Authorization": headers.authorization
    },
    json: true,
    body: {
      "timeMin": now,
      "timeMax": tomorrow,
      "items": resourceIds
    }
  }, function (error, response, body) {
    var resourcesWithFreeBusy = parsers.addBusyBlocksToResources(resources, body.calendars);

    callback(error, resourcesWithFreeBusy);
  });
}

// go!
app.listen(port);
console.log('Booker API listening on port ' + port);

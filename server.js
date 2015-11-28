// modules
require('dotenv').load();

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');

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
      "scope": "https://www.googleapis.com/auth/calendar",
      "redirect_uri": "http://localhost:4200/resources"
    }
  }, function(error, response, body) {
    if (!error) {
      res.json(JSON.parse(body));
    } else {
      res.status(response.statusCode).send();
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

// router.get("/resources", function (req, res) {
//   request({
//     url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
//     headers: {
//       "content-type": "application/json",
//       "Authorization": 'Bearer ' + JSON.parse(body).access_token
//     }
//   }, function(error, response, body) {
//     console.log(body);
//     res.send({})
//   });
// });

// go!
app.listen(port);
console.log('Booker API listening on port ' + port);

// modules
var express = require('express');
var app = express();

// express port and router
var router = express.Router();
var port = process.env.PORT || 8080;

// routing
// prefix routes with '/api'
app.use('/api', router);

router.get('/', function(req, res) {
  res.json({ message: 'booker API is here, awwwwwwyeah!' });   
});

// go!
app.listen(port);
console.log('Booker API listening on port ' + port);

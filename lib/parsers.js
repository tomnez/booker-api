var moment = require('moment');

module.exports = function () {

  return {

    // 'data' has been JSON.parsed and is either
    // a single record or an array of records.
    parseUsers: function(data, errors, meta) {
      var finalResponse = {};
      var isArray = _isArray(data);

      if (isArray) {
        finalResponse.data = [];

        for (var i = 0; i <= data.length; i++) {
          finalResponse.data.push(_makeUser(data[i]));
        }
      } else {
        finalResponse.user = _makeUser(data);
      }

      return finalResponse;
    },

    parseResources: function(data, errors, meta) {
      var finalResponse = {};
      var isArray = _isArray(data);
      var resource;

      if (isArray) {
        finalResponse.data = [];

        for (var i = 0; i <= data.length; i++) {
          resource = data[i];
          if (resource && resource.id) finalResponse.data.push(_makeResource(resource));
        }
      } else {
        finalResponse.resource = _makeResource(data);
      }

      return finalResponse;
    },

    parseEvents: function (data) {
      var finalResponse = {};
      var isArray = _isArray(data);
      var resourceEvent;

      if (isArray) {
        finalResponse.data = [];

        for (var i = 0; i <= data.length; i++) {
          resourceEvent = data[i];
          if (resourceEvent) finalResponse.data.push(_makeEvent(resourceEvent));
        }
      } else {
        finalResponse.resourceEvent = _makeEvent(data);
      }

      return finalResponse;
    },

    addBusyBlocksToResources: function(resources, busyBlocks) {
      var isArray = _isArray(resources.data);
      var resource;

      if (isArray) {
        for (var i = resources.data.length - 1; i >= 0; i--) {
          resource = resources.data[i];

          var key = resource.id;
          var busyNow;

          resource.attributes.schedule = busyBlocks[key].busy;

          busyNow = resource.attributes.schedule[0] ? _busyNow(resource.attributes.schedule[0]) : false;
          resource.attributes["busy-now"] = busyNow;
        };
      } else {
        resources.resource.attributes.schedule = busyBlocks[0].busy;
      }

      return resources;
    }
  };

};

function _isArray(data) {
  return toString.call(data) === '[object Array]';
}

function _busyNow(freeBusyObject) {
  var start = freeBusyObject.start;
  var end = freeBusyObject.end;

  return moment().isBefore(end) && moment().isAfter(start);
}

function _makeResource(resourceRecord) {
  return {
    type: "resource",
    id: resourceRecord.id,
    attributes: {
      name: resourceRecord.summary,
      access: resourceRecord.accessRole,
      schedule: []
    }
  };
}

function _makeEvent(resourceEvent) {
  var creator = resourceEvent.creator && resourceEvent.creator.email || null;

  return {
    id: resourceEvent.id,
    title: resourceEvent.summary,
    creator: creator,
    start: moment(resourceEvent.start.dateTime).format('h:mma'),
    end: moment(resourceEvent.end.dateTime).format('h:mma')
  };
}

function _makeUser(userRecord) {
  return {
    id: userRecord.id,
    type: 'user',
    attributes: {
      displayName: userRecord.displayName,
      avatar: userRecord.image.url
    },
    relationships: {
      resources: {
        links: {
          self: '/users/' + userRecord.id + '/relationships/resources',
          related: '/users/' + userRecord.id + '/resources'
        },
      }
    }
  };
}

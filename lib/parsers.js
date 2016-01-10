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
    }
  };

};

function _isArray(data) {
  return toString.call(data) === '[object Array]';
}

function _makeResource(resourceRecord) {
  return {
    type: "resource",
    id: resourceRecord.id,
    attributes: {
      name: resourceRecord.summary,
      access: resourceRecord.accessRole
    }
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

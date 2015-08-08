import Promise from "bluebird";
import r       from "ramda";
import redis   from "redis";

var sequence = function(schema) {
    return `${schema.name}_seq`;
};

var mkKey = function(schema, id) {
    return `${schema.name}:${id}`;
};

var addPrimaryKeyIndex = function(schema, document) {
    var key = `${schema.name}_primary_key_set`;
    return redis.zaddSync(key, 0, document.id)
        .then(document => document)
};

var indexProperty = function(property, document) {
    
}

var addIndexes = function(schema, document) {
    var promises = r.map(schema.indexes)
}

var create = function(schema, redis, document) {
    // 1) inc id and set it in object
    // 2) add id to primary key index
    // 3) set doc into redis
    return redis.incrAsync(sequence(schema))
        .then(id => r.merge(document, {id: id}))
        .then(document => addPrimaryKeyIndex(schema, document))
        .then(r.partial(redis.setAsync()));
};

var update = function(schema, redis, document) {

}
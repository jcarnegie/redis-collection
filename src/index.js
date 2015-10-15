/* global require process console __dirname */

import "babel/polyfill";
// import Promise from "bluebird";
// import merge   from "merge";
import path    from "path";
import fs      from "fs";
import r       from "ramda";

var encode = JSON.stringify;
var decode = JSON.parse;

// var seqKey = (schema) => {
//     return `${schema.name}:seq`;
// }

var documentKey = r.curry((schema, id) => {
    return `${schema.name}:${id}`;
});

var idIndexKey = (schema) => {
    return `${schema.name}:ids`;
}

var fieldIndexKey = (schema, field) => {
    return `${schema.name}:${field}:idx`;
}

var validate = (schema, data) => {
    var s = schema;
    var d = data;
    s++;
    d++;
}

var create = async (schema, redis, data) => {
    var file = path.join(__dirname, "create.lua");
    var script = fs.readFileSync(file, "utf8");
    var encodedSchema = encode(schema);
    var encodedData = encode(data);
    var doc = await redis.evalAsync(script, 0, encodedSchema, encodedData);

    return decode(doc);
}

var update = async (schema, redis, data) => {
    var file = null;
    var script = null;
    var encodedSchema = null;
    var encodedData = null;
    var doc = null;

    try {
        validate(schema, data);

        file = path.join(__dirname, "update.lua");
        script = fs.readFileSync(file, "utf8");
        encodedSchema = encode(schema);
        encodedData = encode(data);
        doc = await redis.evalAsync(script, 0, encodedSchema, encodedData);

        return decode(doc);
    } catch(e) {
        console.error(e.stack);  // eslint-disable-line no-console
        throw(e);
    }
}

var remove = async (schema, redis, id) => {
    var key   = documentKey(schema, id);
    var idIdx = idIndexKey(schema);
    var docCount = await redis.delAsync(key);
    var idxCount = await redis.zremAsync(idIdx, id);

    return {
        removedDocs: docCount,
        removedIds: idxCount
    };
}

var find = async (schema, redis, id) => {
    var key = documentKey(schema, id);
    var doc = await redis.getAsync(key);
    return decode(doc);
}

var all = async (schema, redis, query) => {
    // var offset = query.offset || 0;
    // var count  = query.count || 20;
    var data = null;
    var valueIdToDocKey = null;
    var keys = null;
    var docs = null;

    delete query.offset;
    delete query.count;

    data = await * r.map((field) => {
        var idxKey = fieldIndexKey(schema, field);
        var value = query[field];
        return redis.zrangebylexAsync(idxKey, `[${value}:`, `[${value}:\xff`);
    }, r.keys(query));

    // 1. map over items (data)
    // 2. split each one by ":", take the part last
    // 3. make the key for each one
    valueIdToDocKey = r.compose(
        documentKey(schema),
        r.last,
        r.split(":")
    );

    keys = r.map(valueIdToDocKey, r.flatten(data));
    docs = await redis.mgetAsync(keys);
    return r.map(decode, docs);
}

export default {
    isValid: validate,
    create: create,
    update: update,
    remove: remove,
    find: find,
    all: all

}

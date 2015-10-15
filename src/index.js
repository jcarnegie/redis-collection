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
    var file = path.join(__dirname, "all.lua");
    var script = fs.readFileSync(file, "utf8");
    var encodedSchema = encode(schema);
    var encodedData = encode(query);
    var docs = await redis.evalAsync(script, 0, encodedSchema, encodedData);

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

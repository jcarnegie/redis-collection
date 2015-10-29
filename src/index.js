/* global require process console __dirname */

import "babel/polyfill";
import path    from "path";
import fs      from "fs";
import r       from "ramda";

let encode = JSON.stringify;
let decode = JSON.parse;

let documentKey = r.curry((schema, id) => {
    return `${schema.name}:${id}`;
});

let idIndexKey = (schema) => {
    return `${schema.name}:ids`;
};

let validate = (schema, data) => {
    return data;
};

let create = async (schema, redis, data) => {
    let file = path.join(__dirname, "create.lua");
    let script = fs.readFileSync(file, "utf8");
    let encodedSchema = encode(schema);
    let encodedData = encode(data);
    let doc = await redis.evalAsync(script, 0, encodedSchema, encodedData);

    return decode(doc);
};

let update = async (schema, redis, data) => {
    let file = null;
    let script = null;
    let encodedSchema = null;
    let encodedData = null;
    let doc = null;

    try {
        validate(schema, data);

        file = path.join(__dirname, "update.lua");
        script = fs.readFileSync(file, "utf8");
        encodedSchema = encode(schema);
        encodedData = encode(data);
        doc = await redis.evalAsync(script, 0, encodedSchema, encodedData);

        return decode(doc);
    } catch (e) {
        console.error(e.stack);  // eslint-disable-line no-console
        throw (e);
    }
};

let remove = async (schema, redis, id) => {
    let key   = documentKey(schema, id);
    let idIdx = idIndexKey(schema);
    let docCount = await redis.delAsync(key);
    let idxCount = await redis.zremAsync(idIdx, id);

    return {
        removedDocs: docCount,
        removedIds: idxCount
    };
};

let find = async (schema, redis, id) => {
    let key = documentKey(schema, id);
    let doc = await redis.getAsync(key);

    return decode(doc);
};

let all = async (schema, redis, query) => {
    let file = path.join(__dirname, "all.lua");
    let script = fs.readFileSync(file, "utf8");
    let encodedSchema = encode(schema);
    let encodedData = encode(query);
    let docs = await redis.evalAsync(script, 0, encodedSchema, encodedData);

    return r.map(decode, docs);
};

export default {
    create,
    update,
    remove,
    find,
    all,
    isValid: validate
};

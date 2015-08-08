import Promise from "bluebird";
import r       from "ramda";

var seqKey = (schema) => {
    return `${schema.name}_seq`;
}

var documentKey = (schema, id) => {
    return `${schema.name}:${id}`;
}

var idIndexKey = (schema) => {
    return `${schema.name}:ids`;
}

var fieldIndexKey = (schema, field) => {
    return `${schema.name}:${field}:idx`;   
}

var validate = (schema, data) => {

}

var create = async (schema, redis, data) => {
    // 1. validate
    // 2. generate id
    // 3. encode
    // 4. set
    // 5. add to id index
    // 6. add to secondary indexes
    
    validate(schema, data);

    // Todo: allow for encodings like Message Pack
    var encode = JSON.stringify;

    var seq   = seqKey(schema);
    var id    = await redis.incrAsync(seq);
    var doc   = r.merge(r.clone(data), { id: id });
    var key   = documentKey(schema, id);
    var idIdx = idIndexKey(schema);

    // Todo: do this on the redis server so it's safe transactually
    var setPromise = redis.setAsync(key, encode(doc));
    var zaddPromise = redis.zaddAsync(idIdx, 0, id);

    var promises = r.map(async (field) => {
        var key = fieldIndexKey(schema, field);
        var val = `${doc[field]}:${id}`;
        return redis.zaddAsync(key, 0, val);
    }, schema.indexes || []);

    await * r.concat([setPromise, zaddPromise], promises);

    return doc;
}

var update = async (schema, redis, data) => {

}

var remove = async (schema, redis, data) => {

}

var find = async (schema, redis, query) => {

}

export default {
    isValid: validate,
    create: create,
    update: update,
    find: find
}
import Promise from "bluebird";
import merge   from "merge";
import r       from "ramda";

// Todo: allow for encodings like Message Pack
var encode = JSON.stringify;
var decode = JSON.parse;

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
    try {
        validate(schema, data);

        // Todo: we need an id to update. throw an exception if there isn't one
        var id  = data.id;
        var key = documentKey(schema, id);

        await redis.watchAsync(key);
        var existingDoc = await redis.getAsync(key);
        var updatedDoc = merge.recursive(existingDoc, data);
        await Promise.promisifyAll(redis.multi())
            .set(key, encode(updatedDoc))
            // Todo: remove data from secondary indexes
            .execAsync();

        // Todo: handle null string response from EXEC (i.e. the watch failed)

        // Todo: add updated data to secondary indexes
        return updatedDoc;
    } catch(e) {
        console.error(e.stack);
        throw(e);
    }
}

var remove = async (schema, redis, id) => {
    var key   = documentKey(schema, id);
    var idIdx = idIndexKey(schema);
    var docCount = await redis.delAsync(key);
    var idxCount = await redis.zremAsync(idIdx, id);

    // Todo: remove secondary indexes

    return {
        removedDocs: docCount,
        removedIds: idxCount
    };
}

var find = async (schema, redis, query) => {
    var id  = query.id;
    var key = documentKey(schema, id);
    return await redis.getAsync(key);
}

export default {
    isValid: validate,
    create: create,
    update: update,
    find: find,
    remove: remove
}
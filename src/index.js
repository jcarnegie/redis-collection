import Promise from "bluebird";
import merge   from "merge";
import r       from "ramda";

// Todo: allow for encodings like Message Pack
var encode = JSON.stringify;
var decode = JSON.parse;

var seqKey = (schema) => {
    return `${schema.name}_seq`;
}

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
        var multi = Promise.promisifyAll(redis.multi())
            .set(key, encode(updatedDoc));

        // update secondary indexes        
        r.map((field) => {
            // no need to update indexes if value didn't change
            if (existingDoc[field] === updatedDoc[field]) return;
            var key = fieldIndexKey(schema, field);
            var oldVal = `${existingDoc[field]}:${id}`;
            var newVal = `${updatedDoc[field]}:${id}`;

            // remove old data from secondary indexes
            multi = multi.zrem(key, oldVal)
            // add updated data to secondary indexes
                .zadd(key, 0, newVal);

        }, schema.indexes || [])

        // execute multi pipeline            
        await multi.execAsync();

        // Todo: handle null string response from EXEC (i.e. the watch failed)

        
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

var find = async (schema, redis, id) => {
    var key = documentKey(schema, id);
    var doc = await redis.getAsync(key);
    return decode(doc);
}

var all = async (schema, redis, query) => {
    var offset = query.offset || 0;
    var count  = query.count || 20;

    delete query["offset"];
    delete query["count"];

    var data = await * r.map((field) => {
        var idxKey = fieldIndexKey(schema, field);
        var value = query[field];
        return redis.zrangebylexAsync(idxKey, `[${value}:`, `[${value}:\xff`);
    }, r.keys(query));

    // 1. map over items (data)
    // 2. split each one by ":", take the part last
    // 3. make the key for each one
    var valueIdToDocKey = r.compose(
        documentKey(schema),
        r.last,
        r.split(":")
    );

    var keys = r.map(valueIdToDocKey, r.flatten(data));
    var docs = await redis.mgetAsync(keys);
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
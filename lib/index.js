"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _this = this;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _merge = require("merge");

var _merge2 = _interopRequireDefault(_merge);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _ramda = require("ramda");

var _ramda2 = _interopRequireDefault(_ramda);

// Todo: allow for encodings like Message Pack
var encode = JSON.stringify;
var decode = JSON.parse;

var seqKey = function seqKey(schema) {
    return schema.name + ":seq";
};

var documentKey = _ramda2["default"].curry(function (schema, id) {
    return schema.name + ":" + id;
});

var idIndexKey = function idIndexKey(schema) {
    return schema.name + ":ids";
};

var fieldIndexKey = function fieldIndexKey(schema, field) {
    return schema.name + ":" + field + ":idx";
};

var validate = function validate(schema, data) {};

var create = function create(schema, redis, data) {
    var file, script, encodedSchema, encodedData, doc;
    return regeneratorRuntime.async(function create$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                file = _path2["default"].join(__dirname, "create.lua");
                script = _fs2["default"].readFileSync(file, "utf8");
                encodedSchema = encode(schema);
                encodedData = encode(data);
                context$1$0.next = 6;
                return regeneratorRuntime.awrap(redis.evalAsync(script, 0, encodedSchema, encodedData));

            case 6:
                doc = context$1$0.sent;
                return context$1$0.abrupt("return", decode(doc));

            case 8:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this);
};

var update = function update(schema, redis, data) {
    var file, script, encodedSchema, encodedData, doc;
    return regeneratorRuntime.async(function update$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                context$1$0.prev = 0;

                validate(schema, data);

                // Todo: we need an id to update. throw an exception if there isn't one
                // var id  = data.id;
                // var key = documentKey(schema, id);

                // await redis.watchAsync(key);
                // var existingDoc = await redis.getAsync(key);
                // var updatedDoc = merge.recursive(existingDoc, data);
                // var multi = Promise.promisifyAll(redis.multi())
                //     .set(key, encode(updatedDoc));

                // // update secondary indexes       
                // r.map((field) => {
                //     // no need to update indexes if value didn't change
                //     if (existingDoc[field] === updatedDoc[field]) return;
                //     var key = fieldIndexKey(schema, field);
                //     var oldVal = `${existingDoc[field]}:${id}`;
                //     var newVal = `${updatedDoc[field]}:${id}`;

                //     // remove old data from secondary indexes
                //     multi = multi.zrem(key, oldVal)
                //     // add updated data to secondary indexes
                //         .zadd(key, 0, newVal);

                // }, schema.indexes || [])

                // // execute multi pipeline           
                // await multi.execAsync();

                // // Todo: handle null string response from EXEC (i.e. the watch failed)

                // return updatedDoc;

                file = _path2["default"].join(__dirname, "update.lua");
                script = _fs2["default"].readFileSync(file, "utf8");
                encodedSchema = encode(schema);
                encodedData = encode(data);
                context$1$0.next = 8;
                return regeneratorRuntime.awrap(redis.evalAsync(script, 0, encodedSchema, encodedData));

            case 8:
                doc = context$1$0.sent;
                return context$1$0.abrupt("return", decode(doc));

            case 12:
                context$1$0.prev = 12;
                context$1$0.t0 = context$1$0["catch"](0);

                console.error(context$1$0.t0.stack);
                throw context$1$0.t0;

            case 16:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this, [[0, 12]]);
};

var remove = function remove(schema, redis, id) {
    var key, idIdx, docCount, idxCount;
    return regeneratorRuntime.async(function remove$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                key = documentKey(schema, id);
                idIdx = idIndexKey(schema);
                context$1$0.next = 4;
                return regeneratorRuntime.awrap(redis.delAsync(key));

            case 4:
                docCount = context$1$0.sent;
                context$1$0.next = 7;
                return regeneratorRuntime.awrap(redis.zremAsync(idIdx, id));

            case 7:
                idxCount = context$1$0.sent;
                return context$1$0.abrupt("return", {
                    removedDocs: docCount,
                    removedIds: idxCount
                });

            case 9:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this);
};

var find = function find(schema, redis, id) {
    var key, doc;
    return regeneratorRuntime.async(function find$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                key = documentKey(schema, id);
                context$1$0.next = 3;
                return regeneratorRuntime.awrap(redis.getAsync(key));

            case 3:
                doc = context$1$0.sent;
                return context$1$0.abrupt("return", decode(doc));

            case 5:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this);
};

var all = function all(schema, redis, query) {
    var offset, count, data, valueIdToDocKey, keys, docs;
    return regeneratorRuntime.async(function all$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                offset = query.offset || 0;
                count = query.count || 20;

                delete query["offset"];
                delete query["count"];

                context$1$0.next = 6;
                return regeneratorRuntime.awrap(_bluebird2["default"].all(_ramda2["default"].map(function (field) {
                    var idxKey = fieldIndexKey(schema, field);
                    var value = query[field];
                    return redis.zrangebylexAsync(idxKey, "[" + value + ":", "[" + value + ":ÿ");
                }, _ramda2["default"].keys(query))));

            case 6:
                data = context$1$0.sent;
                valueIdToDocKey = _ramda2["default"].compose(documentKey(schema), _ramda2["default"].last, _ramda2["default"].split(":"));
                keys = _ramda2["default"].map(valueIdToDocKey, _ramda2["default"].flatten(data));
                context$1$0.next = 11;
                return regeneratorRuntime.awrap(redis.mgetAsync(keys));

            case 11:
                docs = context$1$0.sent;
                return context$1$0.abrupt("return", _ramda2["default"].map(decode, docs));

            case 13:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this);
};

exports["default"] = {
    isValid: validate,
    create: create,
    update: update,
    remove: remove,
    find: find,
    all: all

};
module.exports = exports["default"];

// 1. validate
// 2. generate id
// 3. encode
// 4. set
// 5. add to id index
// 6. add to secondary indexes

// validate(schema, data);

// var seq   = seqKey(schema);
// var id    = await redis.incrAsync(seq);
// var doc   = r.merge(r.clone(data), { id: id });
// var key   = documentKey(schema, id);
// var idIdx = idIndexKey(schema);

// // Todo: do this on the redis server so it's safe transactually
// var setPromise = redis.setAsync(key, encode(doc));
// var zaddPromise = redis.zaddAsync(idIdx, 0, id);

// var promises = r.map(async (field) => {
//     var key = fieldIndexKey(schema, field);
//     var val = `${doc[field]}:${id}`;
//     return redis.zaddAsync(key, 0, val);
// }, schema.indexes || []);

// await * r.concat([setPromise, zaddPromise], promises);

// return doc;

// Todo: remove secondary indexes

// 1. map over items (data)
// 2. split each one by ":", take the part last
// 3. make the key for each one
//# sourceMappingURL=data:application/json;base64,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TyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxRQUFNLEtBQUssY0FBUyxLQUFLLFFBQVEsQ0FBQztpQkFDekUsRUFBRSxtQkFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7OztBQUpiLG9CQUFJO0FBU0osK0JBQWUsR0FBRyxtQkFBRSxPQUFPLENBQzNCLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFDbkIsbUJBQUUsSUFBSSxFQUNOLG1CQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FDZjtBQUVHLG9CQUFJLEdBQUcsbUJBQUUsR0FBRyxDQUFDLGVBQWUsRUFBRSxtQkFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7O2dEQUNqQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQzs7O0FBQWxDLG9CQUFJO29EQUNELG1CQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDOzs7Ozs7O0NBQzdCLENBQUE7O3FCQUVjO0FBQ1gsV0FBTyxFQUFFLFFBQVE7QUFDakIsVUFBTSxFQUFFLE1BQU07QUFDZCxVQUFNLEVBQUUsTUFBTTtBQUNkLFVBQU0sRUFBRSxNQUFNO0FBQ2QsUUFBSSxFQUFFLElBQUk7QUFDVixPQUFHLEVBQUUsR0FBRzs7Q0FFWCIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0IG1lcmdlICAgZnJvbSBcIm1lcmdlXCI7XG5pbXBvcnQgcGF0aCAgICBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IGZzICAgICAgZnJvbSBcImZzXCI7XG5pbXBvcnQgciAgICAgICBmcm9tIFwicmFtZGFcIjtcblxuLy8gVG9kbzogYWxsb3cgZm9yIGVuY29kaW5ncyBsaWtlIE1lc3NhZ2UgUGFja1xudmFyIGVuY29kZSA9IEpTT04uc3RyaW5naWZ5O1xudmFyIGRlY29kZSA9IEpTT04ucGFyc2U7XG5cbnZhciBzZXFLZXkgPSAoc2NoZW1hKSA9PiB7XG4gICAgcmV0dXJuIGAke3NjaGVtYS5uYW1lfTpzZXFgO1xufVxuXG52YXIgZG9jdW1lbnRLZXkgPSByLmN1cnJ5KChzY2hlbWEsIGlkKSA9PiB7XG4gICAgcmV0dXJuIGAke3NjaGVtYS5uYW1lfToke2lkfWA7XG59KTtcblxudmFyIGlkSW5kZXhLZXkgPSAoc2NoZW1hKSA9PiB7XG4gICAgcmV0dXJuIGAke3NjaGVtYS5uYW1lfTppZHNgO1xufVxuXG52YXIgZmllbGRJbmRleEtleSA9IChzY2hlbWEsIGZpZWxkKSA9PiB7XG4gICAgcmV0dXJuIGAke3NjaGVtYS5uYW1lfToke2ZpZWxkfTppZHhgOyAgIFxufVxuXG52YXIgdmFsaWRhdGUgPSAoc2NoZW1hLCBkYXRhKSA9PiB7XG5cbn1cblxudmFyIGNyZWF0ZSA9IGFzeW5jIChzY2hlbWEsIHJlZGlzLCBkYXRhKSA9PiB7XG4gICAgLy8gMS4gdmFsaWRhdGVcbiAgICAvLyAyLiBnZW5lcmF0ZSBpZFxuICAgIC8vIDMuIGVuY29kZVxuICAgIC8vIDQuIHNldFxuICAgIC8vIDUuIGFkZCB0byBpZCBpbmRleFxuICAgIC8vIDYuIGFkZCB0byBzZWNvbmRhcnkgaW5kZXhlc1xuICAgIFxuICAgIC8vIHZhbGlkYXRlKHNjaGVtYSwgZGF0YSk7XG5cbiAgICAvLyB2YXIgc2VxICAgPSBzZXFLZXkoc2NoZW1hKTtcbiAgICAvLyB2YXIgaWQgICAgPSBhd2FpdCByZWRpcy5pbmNyQXN5bmMoc2VxKTtcbiAgICAvLyB2YXIgZG9jICAgPSByLm1lcmdlKHIuY2xvbmUoZGF0YSksIHsgaWQ6IGlkIH0pO1xuICAgIC8vIHZhciBrZXkgICA9IGRvY3VtZW50S2V5KHNjaGVtYSwgaWQpO1xuICAgIC8vIHZhciBpZElkeCA9IGlkSW5kZXhLZXkoc2NoZW1hKTtcblxuICAgIC8vIC8vIFRvZG86IGRvIHRoaXMgb24gdGhlIHJlZGlzIHNlcnZlciBzbyBpdCdzIHNhZmUgdHJhbnNhY3R1YWxseVxuICAgIC8vIHZhciBzZXRQcm9taXNlID0gcmVkaXMuc2V0QXN5bmMoa2V5LCBlbmNvZGUoZG9jKSk7XG4gICAgLy8gdmFyIHphZGRQcm9taXNlID0gcmVkaXMuemFkZEFzeW5jKGlkSWR4LCAwLCBpZCk7XG5cbiAgICAvLyB2YXIgcHJvbWlzZXMgPSByLm1hcChhc3luYyAoZmllbGQpID0+IHtcbiAgICAvLyAgICAgdmFyIGtleSA9IGZpZWxkSW5kZXhLZXkoc2NoZW1hLCBmaWVsZCk7XG4gICAgLy8gICAgIHZhciB2YWwgPSBgJHtkb2NbZmllbGRdfToke2lkfWA7XG4gICAgLy8gICAgIHJldHVybiByZWRpcy56YWRkQXN5bmMoa2V5LCAwLCB2YWwpO1xuICAgIC8vIH0sIHNjaGVtYS5pbmRleGVzIHx8IFtdKTtcblxuICAgIC8vIGF3YWl0ICogci5jb25jYXQoW3NldFByb21pc2UsIHphZGRQcm9taXNlXSwgcHJvbWlzZXMpO1xuXG4gICAgLy8gcmV0dXJuIGRvYztcblxuICAgIHZhciBmaWxlID0gcGF0aC5qb2luKF9fZGlybmFtZSwgXCJjcmVhdGUubHVhXCIpO1xuICAgIHZhciBzY3JpcHQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgXCJ1dGY4XCIpO1xuICAgIHZhciBlbmNvZGVkU2NoZW1hID0gZW5jb2RlKHNjaGVtYSk7XG4gICAgdmFyIGVuY29kZWREYXRhID0gZW5jb2RlKGRhdGEpO1xuICAgIHZhciBkb2MgPSBhd2FpdCByZWRpcy5ldmFsQXN5bmMoc2NyaXB0LCAwLCBlbmNvZGVkU2NoZW1hLCBlbmNvZGVkRGF0YSk7XG5cbiAgICByZXR1cm4gZGVjb2RlKGRvYyk7XG59XG5cbnZhciB1cGRhdGUgPSBhc3luYyAoc2NoZW1hLCByZWRpcywgZGF0YSkgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHZhbGlkYXRlKHNjaGVtYSwgZGF0YSk7XG5cbiAgICAgICAgLy8gVG9kbzogd2UgbmVlZCBhbiBpZCB0byB1cGRhdGUuIHRocm93IGFuIGV4Y2VwdGlvbiBpZiB0aGVyZSBpc24ndCBvbmVcbiAgICAgICAgLy8gdmFyIGlkICA9IGRhdGEuaWQ7XG4gICAgICAgIC8vIHZhciBrZXkgPSBkb2N1bWVudEtleShzY2hlbWEsIGlkKTtcblxuICAgICAgICAvLyBhd2FpdCByZWRpcy53YXRjaEFzeW5jKGtleSk7XG4gICAgICAgIC8vIHZhciBleGlzdGluZ0RvYyA9IGF3YWl0IHJlZGlzLmdldEFzeW5jKGtleSk7XG4gICAgICAgIC8vIHZhciB1cGRhdGVkRG9jID0gbWVyZ2UucmVjdXJzaXZlKGV4aXN0aW5nRG9jLCBkYXRhKTtcbiAgICAgICAgLy8gdmFyIG11bHRpID0gUHJvbWlzZS5wcm9taXNpZnlBbGwocmVkaXMubXVsdGkoKSlcbiAgICAgICAgLy8gICAgIC5zZXQoa2V5LCBlbmNvZGUodXBkYXRlZERvYykpO1xuXG4gICAgICAgIC8vIC8vIHVwZGF0ZSBzZWNvbmRhcnkgaW5kZXhlcyAgICAgICAgXG4gICAgICAgIC8vIHIubWFwKChmaWVsZCkgPT4ge1xuICAgICAgICAvLyAgICAgLy8gbm8gbmVlZCB0byB1cGRhdGUgaW5kZXhlcyBpZiB2YWx1ZSBkaWRuJ3QgY2hhbmdlXG4gICAgICAgIC8vICAgICBpZiAoZXhpc3RpbmdEb2NbZmllbGRdID09PSB1cGRhdGVkRG9jW2ZpZWxkXSkgcmV0dXJuO1xuICAgICAgICAvLyAgICAgdmFyIGtleSA9IGZpZWxkSW5kZXhLZXkoc2NoZW1hLCBmaWVsZCk7XG4gICAgICAgIC8vICAgICB2YXIgb2xkVmFsID0gYCR7ZXhpc3RpbmdEb2NbZmllbGRdfToke2lkfWA7XG4gICAgICAgIC8vICAgICB2YXIgbmV3VmFsID0gYCR7dXBkYXRlZERvY1tmaWVsZF19OiR7aWR9YDtcblxuICAgICAgICAvLyAgICAgLy8gcmVtb3ZlIG9sZCBkYXRhIGZyb20gc2Vjb25kYXJ5IGluZGV4ZXNcbiAgICAgICAgLy8gICAgIG11bHRpID0gbXVsdGkuenJlbShrZXksIG9sZFZhbClcbiAgICAgICAgLy8gICAgIC8vIGFkZCB1cGRhdGVkIGRhdGEgdG8gc2Vjb25kYXJ5IGluZGV4ZXNcbiAgICAgICAgLy8gICAgICAgICAuemFkZChrZXksIDAsIG5ld1ZhbCk7XG5cbiAgICAgICAgLy8gfSwgc2NoZW1hLmluZGV4ZXMgfHwgW10pXG5cbiAgICAgICAgLy8gLy8gZXhlY3V0ZSBtdWx0aSBwaXBlbGluZSAgICAgICAgICAgIFxuICAgICAgICAvLyBhd2FpdCBtdWx0aS5leGVjQXN5bmMoKTtcblxuICAgICAgICAvLyAvLyBUb2RvOiBoYW5kbGUgbnVsbCBzdHJpbmcgcmVzcG9uc2UgZnJvbSBFWEVDIChpLmUuIHRoZSB3YXRjaCBmYWlsZWQpXG5cbiAgICAgICAgXG4gICAgICAgIC8vIHJldHVybiB1cGRhdGVkRG9jO1xuXG5cbiAgICAgICAgdmFyIGZpbGUgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCBcInVwZGF0ZS5sdWFcIik7XG4gICAgICAgIHZhciBzY3JpcHQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgXCJ1dGY4XCIpO1xuICAgICAgICB2YXIgZW5jb2RlZFNjaGVtYSA9IGVuY29kZShzY2hlbWEpO1xuICAgICAgICB2YXIgZW5jb2RlZERhdGEgPSBlbmNvZGUoZGF0YSk7XG4gICAgICAgIHZhciBkb2MgPSBhd2FpdCByZWRpcy5ldmFsQXN5bmMoc2NyaXB0LCAwLCBlbmNvZGVkU2NoZW1hLCBlbmNvZGVkRGF0YSk7XG5cbiAgICAgICAgcmV0dXJuIGRlY29kZShkb2MpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICB0aHJvdyhlKTtcbiAgICB9XG59XG5cbnZhciByZW1vdmUgPSBhc3luYyAoc2NoZW1hLCByZWRpcywgaWQpID0+IHtcbiAgICB2YXIga2V5ICAgPSBkb2N1bWVudEtleShzY2hlbWEsIGlkKTtcbiAgICB2YXIgaWRJZHggPSBpZEluZGV4S2V5KHNjaGVtYSk7XG4gICAgdmFyIGRvY0NvdW50ID0gYXdhaXQgcmVkaXMuZGVsQXN5bmMoa2V5KTtcbiAgICB2YXIgaWR4Q291bnQgPSBhd2FpdCByZWRpcy56cmVtQXN5bmMoaWRJZHgsIGlkKTtcblxuICAgIC8vIFRvZG86IHJlbW92ZSBzZWNvbmRhcnkgaW5kZXhlc1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICAgIHJlbW92ZWREb2NzOiBkb2NDb3VudCxcbiAgICAgICAgcmVtb3ZlZElkczogaWR4Q291bnRcbiAgICB9O1xufVxuXG52YXIgZmluZCA9IGFzeW5jIChzY2hlbWEsIHJlZGlzLCBpZCkgPT4ge1xuICAgIHZhciBrZXkgPSBkb2N1bWVudEtleShzY2hlbWEsIGlkKTtcbiAgICB2YXIgZG9jID0gYXdhaXQgcmVkaXMuZ2V0QXN5bmMoa2V5KTtcbiAgICByZXR1cm4gZGVjb2RlKGRvYyk7XG59XG5cbnZhciBhbGwgPSBhc3luYyAoc2NoZW1hLCByZWRpcywgcXVlcnkpID0+IHtcbiAgICB2YXIgb2Zmc2V0ID0gcXVlcnkub2Zmc2V0IHx8IDA7XG4gICAgdmFyIGNvdW50ICA9IHF1ZXJ5LmNvdW50IHx8IDIwO1xuXG4gICAgZGVsZXRlIHF1ZXJ5W1wib2Zmc2V0XCJdO1xuICAgIGRlbGV0ZSBxdWVyeVtcImNvdW50XCJdO1xuXG4gICAgdmFyIGRhdGEgPSBhd2FpdCAqIHIubWFwKChmaWVsZCkgPT4ge1xuICAgICAgICB2YXIgaWR4S2V5ID0gZmllbGRJbmRleEtleShzY2hlbWEsIGZpZWxkKTtcbiAgICAgICAgdmFyIHZhbHVlID0gcXVlcnlbZmllbGRdO1xuICAgICAgICByZXR1cm4gcmVkaXMuenJhbmdlYnlsZXhBc3luYyhpZHhLZXksIGBbJHt2YWx1ZX06YCwgYFske3ZhbHVlfTpcXHhmZmApO1xuICAgIH0sIHIua2V5cyhxdWVyeSkpO1xuXG4gICAgLy8gMS4gbWFwIG92ZXIgaXRlbXMgKGRhdGEpXG4gICAgLy8gMi4gc3BsaXQgZWFjaCBvbmUgYnkgXCI6XCIsIHRha2UgdGhlIHBhcnQgbGFzdFxuICAgIC8vIDMuIG1ha2UgdGhlIGtleSBmb3IgZWFjaCBvbmVcbiAgICB2YXIgdmFsdWVJZFRvRG9jS2V5ID0gci5jb21wb3NlKFxuICAgICAgICBkb2N1bWVudEtleShzY2hlbWEpLFxuICAgICAgICByLmxhc3QsXG4gICAgICAgIHIuc3BsaXQoXCI6XCIpXG4gICAgKTtcblxuICAgIHZhciBrZXlzID0gci5tYXAodmFsdWVJZFRvRG9jS2V5LCByLmZsYXR0ZW4oZGF0YSkpO1xuICAgIHZhciBkb2NzID0gYXdhaXQgcmVkaXMubWdldEFzeW5jKGtleXMpO1xuICAgIHJldHVybiByLm1hcChkZWNvZGUsIGRvY3MpO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgaXNWYWxpZDogdmFsaWRhdGUsXG4gICAgY3JlYXRlOiBjcmVhdGUsXG4gICAgdXBkYXRlOiB1cGRhdGUsXG4gICAgcmVtb3ZlOiByZW1vdmUsXG4gICAgZmluZDogZmluZCxcbiAgICBhbGw6IGFsbFxuICAgIFxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
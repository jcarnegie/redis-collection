"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _this2 = this;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _merge = require("merge");

var _merge2 = _interopRequireDefault(_merge);

var _ramda = require("ramda");

var _ramda2 = _interopRequireDefault(_ramda);

// Todo: allow for encodings like Message Pack
var encode = JSON.stringify;
var decode = JSON.parse;

var seqKey = function seqKey(schema) {
    return schema.name + "_seq";
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
    var seq, id, doc, key, idIdx, setPromise, zaddPromise, promises;
    return regeneratorRuntime.async(function create$(context$1$0) {
        var _this = this;

        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                // 1. validate
                // 2. generate id
                // 3. encode
                // 4. set
                // 5. add to id index
                // 6. add to secondary indexes

                validate(schema, data);

                seq = seqKey(schema);
                context$1$0.next = 4;
                return regeneratorRuntime.awrap(redis.incrAsync(seq));

            case 4:
                id = context$1$0.sent;
                doc = _ramda2["default"].merge(_ramda2["default"].clone(data), { id: id });
                key = documentKey(schema, id);
                idIdx = idIndexKey(schema);
                setPromise = redis.setAsync(key, encode(doc));
                zaddPromise = redis.zaddAsync(idIdx, 0, id);
                promises = _ramda2["default"].map(function callee$1$0(field) {
                    var key, val;
                    return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
                        while (1) switch (context$2$0.prev = context$2$0.next) {
                            case 0:
                                key = fieldIndexKey(schema, field);
                                val = doc[field] + ":" + id;
                                return context$2$0.abrupt("return", redis.zaddAsync(key, 0, val));

                            case 3:
                            case "end":
                                return context$2$0.stop();
                        }
                    }, null, _this);
                }, schema.indexes || []);
                context$1$0.next = 13;
                return regeneratorRuntime.awrap(_bluebird2["default"].all(_ramda2["default"].concat([setPromise, zaddPromise], promises)));

            case 13:
                return context$1$0.abrupt("return", doc);

            case 14:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this2);
};

var update = function update(schema, redis, data) {
    var id, key, existingDoc, updatedDoc, multi;
    return regeneratorRuntime.async(function update$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                context$1$0.prev = 0;

                validate(schema, data);

                // Todo: we need an id to update. throw an exception if there isn't one
                id = data.id;
                key = documentKey(schema, id);
                context$1$0.next = 6;
                return regeneratorRuntime.awrap(redis.watchAsync(key));

            case 6:
                context$1$0.next = 8;
                return regeneratorRuntime.awrap(redis.getAsync(key));

            case 8:
                existingDoc = context$1$0.sent;
                updatedDoc = _merge2["default"].recursive(existingDoc, data);
                multi = _bluebird2["default"].promisifyAll(redis.multi()).set(key, encode(updatedDoc));

                // update secondary indexes       
                _ramda2["default"].map(function (field) {
                    // no need to update indexes if value didn't change
                    if (existingDoc[field] === updatedDoc[field]) return;
                    var key = fieldIndexKey(schema, field);
                    var oldVal = existingDoc[field] + ":" + id;
                    var newVal = updatedDoc[field] + ":" + id;

                    // remove old data from secondary indexes
                    multi = multi.zrem(key, oldVal)
                    // add updated data to secondary indexes
                    .zadd(key, 0, newVal);
                }, schema.indexes || []);

                // execute multi pipeline           
                context$1$0.next = 14;
                return regeneratorRuntime.awrap(multi.execAsync());

            case 14:
                return context$1$0.abrupt("return", updatedDoc);

            case 17:
                context$1$0.prev = 17;
                context$1$0.t0 = context$1$0["catch"](0);

                console.error(context$1$0.t0.stack);
                throw context$1$0.t0;

            case 21:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this2, [[0, 17]]);
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
    }, null, _this2);
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
    }, null, _this2);
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
    }, null, _this2);
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

// Todo: do this on the redis server so it's safe transactually

// Todo: handle null string response from EXEC (i.e. the watch failed)

// Todo: remove secondary indexes

// 1. map over items (data)
// 2. split each one by ":", take the part last
// 3. make the key for each one
//# sourceMappingURL=data:application/json;base64,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QUNoQyx3QkFBSSxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMxQyx3QkFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pCLDJCQUFPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLFFBQU0sS0FBSyxjQUFTLEtBQUssUUFBUSxDQUFDO2lCQUN6RSxFQUFFLG1CQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzs7O0FBSmIsb0JBQUk7QUFTSiwrQkFBZSxHQUFHLG1CQUFFLE9BQU8sQ0FDM0IsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUNuQixtQkFBRSxJQUFJLEVBQ04sbUJBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUNmO0FBRUcsb0JBQUksR0FBRyxtQkFBRSxHQUFHLENBQUMsZUFBZSxFQUFFLG1CQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzs7Z0RBQ2pDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDOzs7QUFBbEMsb0JBQUk7b0RBQ0QsbUJBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUM7Ozs7Ozs7Q0FDN0IsQ0FBQTs7cUJBRWM7QUFDWCxXQUFPLEVBQUUsUUFBUTtBQUNqQixVQUFNLEVBQUUsTUFBTTtBQUNkLFVBQU0sRUFBRSxNQUFNO0FBQ2QsVUFBTSxFQUFFLE1BQU07QUFDZCxRQUFJLEVBQUUsSUFBSTtBQUNWLE9BQUcsRUFBRSxHQUFHOztDQUVYIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgbWVyZ2UgICBmcm9tIFwibWVyZ2VcIjtcbmltcG9ydCByICAgICAgIGZyb20gXCJyYW1kYVwiO1xuXG4vLyBUb2RvOiBhbGxvdyBmb3IgZW5jb2RpbmdzIGxpa2UgTWVzc2FnZSBQYWNrXG52YXIgZW5jb2RlID0gSlNPTi5zdHJpbmdpZnk7XG52YXIgZGVjb2RlID0gSlNPTi5wYXJzZTtcblxudmFyIHNlcUtleSA9IChzY2hlbWEpID0+IHtcbiAgICByZXR1cm4gYCR7c2NoZW1hLm5hbWV9X3NlcWA7XG59XG5cbnZhciBkb2N1bWVudEtleSA9IHIuY3VycnkoKHNjaGVtYSwgaWQpID0+IHtcbiAgICByZXR1cm4gYCR7c2NoZW1hLm5hbWV9OiR7aWR9YDtcbn0pO1xuXG52YXIgaWRJbmRleEtleSA9IChzY2hlbWEpID0+IHtcbiAgICByZXR1cm4gYCR7c2NoZW1hLm5hbWV9Omlkc2A7XG59XG5cbnZhciBmaWVsZEluZGV4S2V5ID0gKHNjaGVtYSwgZmllbGQpID0+IHtcbiAgICByZXR1cm4gYCR7c2NoZW1hLm5hbWV9OiR7ZmllbGR9OmlkeGA7ICAgXG59XG5cbnZhciB2YWxpZGF0ZSA9IChzY2hlbWEsIGRhdGEpID0+IHtcblxufVxuXG52YXIgY3JlYXRlID0gYXN5bmMgKHNjaGVtYSwgcmVkaXMsIGRhdGEpID0+IHtcbiAgICAvLyAxLiB2YWxpZGF0ZVxuICAgIC8vIDIuIGdlbmVyYXRlIGlkXG4gICAgLy8gMy4gZW5jb2RlXG4gICAgLy8gNC4gc2V0XG4gICAgLy8gNS4gYWRkIHRvIGlkIGluZGV4XG4gICAgLy8gNi4gYWRkIHRvIHNlY29uZGFyeSBpbmRleGVzXG4gICAgXG4gICAgdmFsaWRhdGUoc2NoZW1hLCBkYXRhKTtcblxuICAgIHZhciBzZXEgICA9IHNlcUtleShzY2hlbWEpO1xuICAgIHZhciBpZCAgICA9IGF3YWl0IHJlZGlzLmluY3JBc3luYyhzZXEpO1xuICAgIHZhciBkb2MgICA9IHIubWVyZ2Uoci5jbG9uZShkYXRhKSwgeyBpZDogaWQgfSk7XG4gICAgdmFyIGtleSAgID0gZG9jdW1lbnRLZXkoc2NoZW1hLCBpZCk7XG4gICAgdmFyIGlkSWR4ID0gaWRJbmRleEtleShzY2hlbWEpO1xuXG4gICAgLy8gVG9kbzogZG8gdGhpcyBvbiB0aGUgcmVkaXMgc2VydmVyIHNvIGl0J3Mgc2FmZSB0cmFuc2FjdHVhbGx5XG4gICAgdmFyIHNldFByb21pc2UgPSByZWRpcy5zZXRBc3luYyhrZXksIGVuY29kZShkb2MpKTtcbiAgICB2YXIgemFkZFByb21pc2UgPSByZWRpcy56YWRkQXN5bmMoaWRJZHgsIDAsIGlkKTtcblxuICAgIHZhciBwcm9taXNlcyA9IHIubWFwKGFzeW5jIChmaWVsZCkgPT4ge1xuICAgICAgICB2YXIga2V5ID0gZmllbGRJbmRleEtleShzY2hlbWEsIGZpZWxkKTtcbiAgICAgICAgdmFyIHZhbCA9IGAke2RvY1tmaWVsZF19OiR7aWR9YDtcbiAgICAgICAgcmV0dXJuIHJlZGlzLnphZGRBc3luYyhrZXksIDAsIHZhbCk7XG4gICAgfSwgc2NoZW1hLmluZGV4ZXMgfHwgW10pO1xuXG4gICAgYXdhaXQgKiByLmNvbmNhdChbc2V0UHJvbWlzZSwgemFkZFByb21pc2VdLCBwcm9taXNlcyk7XG5cbiAgICByZXR1cm4gZG9jO1xufVxuXG52YXIgdXBkYXRlID0gYXN5bmMgKHNjaGVtYSwgcmVkaXMsIGRhdGEpID0+IHtcbiAgICB0cnkge1xuICAgICAgICB2YWxpZGF0ZShzY2hlbWEsIGRhdGEpO1xuXG4gICAgICAgIC8vIFRvZG86IHdlIG5lZWQgYW4gaWQgdG8gdXBkYXRlLiB0aHJvdyBhbiBleGNlcHRpb24gaWYgdGhlcmUgaXNuJ3Qgb25lXG4gICAgICAgIHZhciBpZCAgPSBkYXRhLmlkO1xuICAgICAgICB2YXIga2V5ID0gZG9jdW1lbnRLZXkoc2NoZW1hLCBpZCk7XG5cbiAgICAgICAgYXdhaXQgcmVkaXMud2F0Y2hBc3luYyhrZXkpO1xuICAgICAgICB2YXIgZXhpc3RpbmdEb2MgPSBhd2FpdCByZWRpcy5nZXRBc3luYyhrZXkpO1xuICAgICAgICB2YXIgdXBkYXRlZERvYyA9IG1lcmdlLnJlY3Vyc2l2ZShleGlzdGluZ0RvYywgZGF0YSk7XG4gICAgICAgIHZhciBtdWx0aSA9IFByb21pc2UucHJvbWlzaWZ5QWxsKHJlZGlzLm11bHRpKCkpXG4gICAgICAgICAgICAuc2V0KGtleSwgZW5jb2RlKHVwZGF0ZWREb2MpKTtcblxuICAgICAgICAvLyB1cGRhdGUgc2Vjb25kYXJ5IGluZGV4ZXMgICAgICAgIFxuICAgICAgICByLm1hcCgoZmllbGQpID0+IHtcbiAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gdXBkYXRlIGluZGV4ZXMgaWYgdmFsdWUgZGlkbid0IGNoYW5nZVxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nRG9jW2ZpZWxkXSA9PT0gdXBkYXRlZERvY1tmaWVsZF0pIHJldHVybjtcbiAgICAgICAgICAgIHZhciBrZXkgPSBmaWVsZEluZGV4S2V5KHNjaGVtYSwgZmllbGQpO1xuICAgICAgICAgICAgdmFyIG9sZFZhbCA9IGAke2V4aXN0aW5nRG9jW2ZpZWxkXX06JHtpZH1gO1xuICAgICAgICAgICAgdmFyIG5ld1ZhbCA9IGAke3VwZGF0ZWREb2NbZmllbGRdfToke2lkfWA7XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSBvbGQgZGF0YSBmcm9tIHNlY29uZGFyeSBpbmRleGVzXG4gICAgICAgICAgICBtdWx0aSA9IG11bHRpLnpyZW0oa2V5LCBvbGRWYWwpXG4gICAgICAgICAgICAvLyBhZGQgdXBkYXRlZCBkYXRhIHRvIHNlY29uZGFyeSBpbmRleGVzXG4gICAgICAgICAgICAgICAgLnphZGQoa2V5LCAwLCBuZXdWYWwpO1xuXG4gICAgICAgIH0sIHNjaGVtYS5pbmRleGVzIHx8IFtdKVxuXG4gICAgICAgIC8vIGV4ZWN1dGUgbXVsdGkgcGlwZWxpbmUgICAgICAgICAgICBcbiAgICAgICAgYXdhaXQgbXVsdGkuZXhlY0FzeW5jKCk7XG5cbiAgICAgICAgLy8gVG9kbzogaGFuZGxlIG51bGwgc3RyaW5nIHJlc3BvbnNlIGZyb20gRVhFQyAoaS5lLiB0aGUgd2F0Y2ggZmFpbGVkKVxuXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdXBkYXRlZERvYztcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgdGhyb3coZSk7XG4gICAgfVxufVxuXG52YXIgcmVtb3ZlID0gYXN5bmMgKHNjaGVtYSwgcmVkaXMsIGlkKSA9PiB7XG4gICAgdmFyIGtleSAgID0gZG9jdW1lbnRLZXkoc2NoZW1hLCBpZCk7XG4gICAgdmFyIGlkSWR4ID0gaWRJbmRleEtleShzY2hlbWEpO1xuICAgIHZhciBkb2NDb3VudCA9IGF3YWl0IHJlZGlzLmRlbEFzeW5jKGtleSk7XG4gICAgdmFyIGlkeENvdW50ID0gYXdhaXQgcmVkaXMuenJlbUFzeW5jKGlkSWR4LCBpZCk7XG5cbiAgICAvLyBUb2RvOiByZW1vdmUgc2Vjb25kYXJ5IGluZGV4ZXNcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgICByZW1vdmVkRG9jczogZG9jQ291bnQsXG4gICAgICAgIHJlbW92ZWRJZHM6IGlkeENvdW50XG4gICAgfTtcbn1cblxudmFyIGZpbmQgPSBhc3luYyAoc2NoZW1hLCByZWRpcywgaWQpID0+IHtcbiAgICB2YXIga2V5ID0gZG9jdW1lbnRLZXkoc2NoZW1hLCBpZCk7XG4gICAgdmFyIGRvYyA9IGF3YWl0IHJlZGlzLmdldEFzeW5jKGtleSk7XG4gICAgcmV0dXJuIGRlY29kZShkb2MpO1xufVxuXG52YXIgYWxsID0gYXN5bmMgKHNjaGVtYSwgcmVkaXMsIHF1ZXJ5KSA9PiB7XG4gICAgdmFyIG9mZnNldCA9IHF1ZXJ5Lm9mZnNldCB8fCAwO1xuICAgIHZhciBjb3VudCAgPSBxdWVyeS5jb3VudCB8fCAyMDtcblxuICAgIGRlbGV0ZSBxdWVyeVtcIm9mZnNldFwiXTtcbiAgICBkZWxldGUgcXVlcnlbXCJjb3VudFwiXTtcblxuICAgIHZhciBkYXRhID0gYXdhaXQgKiByLm1hcCgoZmllbGQpID0+IHtcbiAgICAgICAgdmFyIGlkeEtleSA9IGZpZWxkSW5kZXhLZXkoc2NoZW1hLCBmaWVsZCk7XG4gICAgICAgIHZhciB2YWx1ZSA9IHF1ZXJ5W2ZpZWxkXTtcbiAgICAgICAgcmV0dXJuIHJlZGlzLnpyYW5nZWJ5bGV4QXN5bmMoaWR4S2V5LCBgWyR7dmFsdWV9OmAsIGBbJHt2YWx1ZX06XFx4ZmZgKTtcbiAgICB9LCByLmtleXMocXVlcnkpKTtcblxuICAgIC8vIDEuIG1hcCBvdmVyIGl0ZW1zIChkYXRhKVxuICAgIC8vIDIuIHNwbGl0IGVhY2ggb25lIGJ5IFwiOlwiLCB0YWtlIHRoZSBwYXJ0IGxhc3RcbiAgICAvLyAzLiBtYWtlIHRoZSBrZXkgZm9yIGVhY2ggb25lXG4gICAgdmFyIHZhbHVlSWRUb0RvY0tleSA9IHIuY29tcG9zZShcbiAgICAgICAgZG9jdW1lbnRLZXkoc2NoZW1hKSxcbiAgICAgICAgci5sYXN0LFxuICAgICAgICByLnNwbGl0KFwiOlwiKVxuICAgICk7XG5cbiAgICB2YXIga2V5cyA9IHIubWFwKHZhbHVlSWRUb0RvY0tleSwgci5mbGF0dGVuKGRhdGEpKTtcbiAgICB2YXIgZG9jcyA9IGF3YWl0IHJlZGlzLm1nZXRBc3luYyhrZXlzKTtcbiAgICByZXR1cm4gci5tYXAoZGVjb2RlLCBkb2NzKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIGlzVmFsaWQ6IHZhbGlkYXRlLFxuICAgIGNyZWF0ZTogY3JlYXRlLFxuICAgIHVwZGF0ZTogdXBkYXRlLFxuICAgIHJlbW92ZTogcmVtb3ZlLFxuICAgIGZpbmQ6IGZpbmQsXG4gICAgYWxsOiBhbGxcbiAgICBcbn0iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
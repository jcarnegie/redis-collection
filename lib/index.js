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

var seqKey = function seqKey(schema) {
    return schema.name + "_seq";
};

var documentKey = function documentKey(schema, id) {
    return schema.name + ":" + id;
};

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

                console.log("new id:", id);
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

                console.log("awaiting:", setPromise);
                console.log("awaiting:", zaddPromise);
                console.log("awaiting:", promises);

                context$1$0.next = 17;
                return regeneratorRuntime.awrap(_bluebird2["default"].all(_ramda2["default"].concat([setPromise, zaddPromise], promises)));

            case 17:
                return context$1$0.abrupt("return", doc);

            case 18:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this2);
};

var update = function update(schema, redis, data) {
    var id, key, existingDoc, updatedDoc, resp;
    return regeneratorRuntime.async(function update$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                validate(schema, data);

                // Todo: we need an id to update. throw an exception if there isn't one
                id = data.id;
                key = documentKey(schema, id);
                context$1$0.next = 5;
                return regeneratorRuntime.awrap(redis.watchAsync());

            case 5:
                context$1$0.next = 7;
                return regeneratorRuntime.awrap(redis.getAsync(key));

            case 7:
                existingDoc = context$1$0.sent;
                updatedDoc = _merge2["default"].recursive(existingDoc, data);
                context$1$0.next = 11;
                return regeneratorRuntime.awrap(redis.multiAsync());

            case 11:
                context$1$0.next = 13;
                return regeneratorRuntime.awrap(redis.setAsync(key, updatedDoc));

            case 13:
                context$1$0.next = 15;
                return regeneratorRuntime.awrap(redis.execAsync());

            case 15:
                resp = context$1$0.sent;
                return context$1$0.abrupt("return", updatedDoc);

            case 17:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this2);
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

var find = function find(schema, redis, query) {
    var id, key;
    return regeneratorRuntime.async(function find$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                id = query.id;
                key = documentKey(schema, id);
                context$1$0.next = 4;
                return regeneratorRuntime.awrap(redis.getAsync(key));

            case 4:
                return context$1$0.abrupt("return", context$1$0.sent);

            case 5:
            case "end":
                return context$1$0.stop();
        }
    }, null, _this2);
};

exports["default"] = {
    isValid: validate,
    create: create,
    update: update,
    find: find,
    remove: remove
};
module.exports = exports["default"];

// Todo: do this on the redis server so it's safe transactually

// Todo: remove data from secondary indexes

// Todo: handle null string response from EXEC (i.e. the watch failed)

// Todo: add updated data to secondary indexes

// Todo: remove secondary indexes
//# sourceMappingURL=data:application/json;base64,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QUFQLElBQUksQ0FBVSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUs7UUFDOUIsRUFBRSxFQUNGLEdBQUc7Ozs7QUFESCxrQkFBRSxHQUFJLEtBQUssQ0FBQyxFQUFFO0FBQ2QsbUJBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQzs7Z0RBQ3BCLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDOzs7Ozs7Ozs7O0NBQ25DLENBQUE7O3FCQUVjO0FBQ1gsV0FBTyxFQUFFLFFBQVE7QUFDakIsVUFBTSxFQUFFLE1BQU07QUFDZCxVQUFNLEVBQUUsTUFBTTtBQUNkLFFBQUksRUFBRSxJQUFJO0FBQ1YsVUFBTSxFQUFFLE1BQU07Q0FDakIiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCBtZXJnZSAgIGZyb20gXCJtZXJnZVwiO1xuaW1wb3J0IHIgICAgICAgZnJvbSBcInJhbWRhXCI7XG5cbi8vIFRvZG86IGFsbG93IGZvciBlbmNvZGluZ3MgbGlrZSBNZXNzYWdlIFBhY2tcbnZhciBlbmNvZGUgPSBKU09OLnN0cmluZ2lmeTtcblxudmFyIHNlcUtleSA9IChzY2hlbWEpID0+IHtcbiAgICByZXR1cm4gYCR7c2NoZW1hLm5hbWV9X3NlcWA7XG59XG5cbnZhciBkb2N1bWVudEtleSA9IChzY2hlbWEsIGlkKSA9PiB7XG4gICAgcmV0dXJuIGAke3NjaGVtYS5uYW1lfToke2lkfWA7XG59XG5cbnZhciBpZEluZGV4S2V5ID0gKHNjaGVtYSkgPT4ge1xuICAgIHJldHVybiBgJHtzY2hlbWEubmFtZX06aWRzYDtcbn1cblxudmFyIGZpZWxkSW5kZXhLZXkgPSAoc2NoZW1hLCBmaWVsZCkgPT4ge1xuICAgIHJldHVybiBgJHtzY2hlbWEubmFtZX06JHtmaWVsZH06aWR4YDsgICBcbn1cblxudmFyIHZhbGlkYXRlID0gKHNjaGVtYSwgZGF0YSkgPT4ge1xuXG59XG5cbnZhciBjcmVhdGUgPSBhc3luYyAoc2NoZW1hLCByZWRpcywgZGF0YSkgPT4ge1xuICAgIC8vIDEuIHZhbGlkYXRlXG4gICAgLy8gMi4gZ2VuZXJhdGUgaWRcbiAgICAvLyAzLiBlbmNvZGVcbiAgICAvLyA0LiBzZXRcbiAgICAvLyA1LiBhZGQgdG8gaWQgaW5kZXhcbiAgICAvLyA2LiBhZGQgdG8gc2Vjb25kYXJ5IGluZGV4ZXNcbiAgICBcbiAgICB2YWxpZGF0ZShzY2hlbWEsIGRhdGEpO1xuXG4gICAgdmFyIHNlcSAgID0gc2VxS2V5KHNjaGVtYSk7XG4gICAgdmFyIGlkICAgID0gYXdhaXQgcmVkaXMuaW5jckFzeW5jKHNlcSk7XG4gICAgY29uc29sZS5sb2coXCJuZXcgaWQ6XCIsIGlkKTtcbiAgICB2YXIgZG9jICAgPSByLm1lcmdlKHIuY2xvbmUoZGF0YSksIHsgaWQ6IGlkIH0pO1xuICAgIHZhciBrZXkgICA9IGRvY3VtZW50S2V5KHNjaGVtYSwgaWQpO1xuICAgIHZhciBpZElkeCA9IGlkSW5kZXhLZXkoc2NoZW1hKTtcblxuICAgIC8vIFRvZG86IGRvIHRoaXMgb24gdGhlIHJlZGlzIHNlcnZlciBzbyBpdCdzIHNhZmUgdHJhbnNhY3R1YWxseVxuICAgIHZhciBzZXRQcm9taXNlID0gcmVkaXMuc2V0QXN5bmMoa2V5LCBlbmNvZGUoZG9jKSk7XG4gICAgdmFyIHphZGRQcm9taXNlID0gcmVkaXMuemFkZEFzeW5jKGlkSWR4LCAwLCBpZCk7XG5cbiAgICB2YXIgcHJvbWlzZXMgPSByLm1hcChhc3luYyAoZmllbGQpID0+IHtcbiAgICAgICAgdmFyIGtleSA9IGZpZWxkSW5kZXhLZXkoc2NoZW1hLCBmaWVsZCk7XG4gICAgICAgIHZhciB2YWwgPSBgJHtkb2NbZmllbGRdfToke2lkfWA7XG4gICAgICAgIHJldHVybiByZWRpcy56YWRkQXN5bmMoa2V5LCAwLCB2YWwpO1xuICAgIH0sIHNjaGVtYS5pbmRleGVzIHx8IFtdKTtcblxuICAgIGNvbnNvbGUubG9nKFwiYXdhaXRpbmc6XCIsIHNldFByb21pc2UpO1xuICAgIGNvbnNvbGUubG9nKFwiYXdhaXRpbmc6XCIsIHphZGRQcm9taXNlKTtcbiAgICBjb25zb2xlLmxvZyhcImF3YWl0aW5nOlwiLCBwcm9taXNlcyk7XG5cbiAgICBhd2FpdCAqIHIuY29uY2F0KFtzZXRQcm9taXNlLCB6YWRkUHJvbWlzZV0sIHByb21pc2VzKTtcblxuICAgIHJldHVybiBkb2M7XG59XG5cbnZhciB1cGRhdGUgPSBhc3luYyAoc2NoZW1hLCByZWRpcywgZGF0YSkgPT4ge1xuICAgIHZhbGlkYXRlKHNjaGVtYSwgZGF0YSk7XG5cbiAgICAvLyBUb2RvOiB3ZSBuZWVkIGFuIGlkIHRvIHVwZGF0ZS4gdGhyb3cgYW4gZXhjZXB0aW9uIGlmIHRoZXJlIGlzbid0IG9uZVxuICAgIHZhciBpZCAgPSBkYXRhLmlkO1xuICAgIHZhciBrZXkgPSBkb2N1bWVudEtleShzY2hlbWEsIGlkKTtcblxuICAgIGF3YWl0IHJlZGlzLndhdGNoQXN5bmMoKTtcbiAgICB2YXIgZXhpc3RpbmdEb2MgPSBhd2FpdCByZWRpcy5nZXRBc3luYyhrZXkpO1xuICAgIHZhciB1cGRhdGVkRG9jID0gbWVyZ2UucmVjdXJzaXZlKGV4aXN0aW5nRG9jLCBkYXRhKTtcbiAgICBhd2FpdCByZWRpcy5tdWx0aUFzeW5jKCk7XG4gICAgYXdhaXQgcmVkaXMuc2V0QXN5bmMoa2V5LCB1cGRhdGVkRG9jKTtcbiAgICAvLyBUb2RvOiByZW1vdmUgZGF0YSBmcm9tIHNlY29uZGFyeSBpbmRleGVzXG4gICAgdmFyIHJlc3AgPSBhd2FpdCByZWRpcy5leGVjQXN5bmMoKTtcblxuICAgIC8vIFRvZG86IGhhbmRsZSBudWxsIHN0cmluZyByZXNwb25zZSBmcm9tIEVYRUMgKGkuZS4gdGhlIHdhdGNoIGZhaWxlZClcblxuICAgIC8vIFRvZG86IGFkZCB1cGRhdGVkIGRhdGEgdG8gc2Vjb25kYXJ5IGluZGV4ZXNcblxuICAgIHJldHVybiB1cGRhdGVkRG9jO1xufVxuXG52YXIgcmVtb3ZlID0gYXN5bmMgKHNjaGVtYSwgcmVkaXMsIGlkKSA9PiB7XG4gICAgdmFyIGtleSAgID0gZG9jdW1lbnRLZXkoc2NoZW1hLCBpZCk7XG4gICAgdmFyIGlkSWR4ID0gaWRJbmRleEtleShzY2hlbWEpO1xuICAgIHZhciBkb2NDb3VudCA9IGF3YWl0IHJlZGlzLmRlbEFzeW5jKGtleSk7XG4gICAgdmFyIGlkeENvdW50ID0gYXdhaXQgcmVkaXMuenJlbUFzeW5jKGlkSWR4LCBpZCk7XG5cbiAgICAvLyBUb2RvOiByZW1vdmUgc2Vjb25kYXJ5IGluZGV4ZXNcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlbW92ZWREb2NzOiBkb2NDb3VudCxcbiAgICAgICAgcmVtb3ZlZElkczogaWR4Q291bnRcbiAgICB9O1xufVxuXG52YXIgZmluZCA9IGFzeW5jIChzY2hlbWEsIHJlZGlzLCBxdWVyeSkgPT4ge1xuICAgIHZhciBpZCAgPSBxdWVyeS5pZDtcbiAgICB2YXIga2V5ID0gZG9jdW1lbnRLZXkoc2NoZW1hLCBpZCk7XG4gICAgcmV0dXJuIGF3YWl0IHJlZGlzLmdldEFzeW5jKGtleSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBpc1ZhbGlkOiB2YWxpZGF0ZSxcbiAgICBjcmVhdGU6IGNyZWF0ZSxcbiAgICB1cGRhdGU6IHVwZGF0ZSxcbiAgICBmaW5kOiBmaW5kLFxuICAgIHJlbW92ZTogcmVtb3ZlXG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
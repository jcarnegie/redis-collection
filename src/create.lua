local schema = ARGV[1]
local doc = ARGV[2]
local idIdx = schema["name"] .. ":" .. "ids"
local id = doc["id"]
local key = schema["name"] .. ":" .. field .. "idx"
local val = doc["field"] .. id
redis.call("ZADD", idIdx, 0, id)
redis.call("ZADD", key, 0, value)

return cjson.encode(doc)

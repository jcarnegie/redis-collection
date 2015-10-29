local schema = cjson.decode(ARGV[1])
local doc    = cjson.decode(ARGV[2])
local seqKey = schema.name .. ":seq"
local idIdx  = schema.name .. ":ids"
local id     = redis.call("INCR", seqKey)
local docKey = schema.name .. ":" .. id

doc["id"]    = id

redis.call("SET", docKey, cjson.encode(doc))
redis.call("ZADD", idIdx, 0, id)

for i, field in ipairs(schema.indexes) do
    local fieldVal = doc[field]

    if fieldVal ~= nil then
        local key = schema.name .. ":" .. field .. ":idx"
        local val = fieldVal .. ":" .. id
        -- if (schema.fields[field] == "integer") then
        --     redis.call("ZADD", key, fieldVal, val)
        -- else
            redis.call("ZADD", key, 0, val)
        -- end
    end
end

return cjson.encode(doc)

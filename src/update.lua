local tprint = function(tbl, indent)
    if not indent then indent = 0 end
    for k, v in pairs(tbl) do
        local formatting = string.rep("  ", indent) .. k .. ": "
        if type(v) == "table" then
            redis.log(redis.LOG_WARNING, formatting)
            tprint(v, indent + 1)
        else
            redis.log(redis.LOG_WARNING, formatting .. v)
        end
    end
end

local tableCopy = function(t)
    local copy = {}
    for k, v in pairs(t) do
        if (type(v) == "table" and type(t[k]) == "table") then
            copy[k] = tableCopy(t[k], v)
        else
            copy[k] = v
        end
    end
    return copy
end

local tableMerge = function(a, b)
    local mergedTable = tableCopy(a)
    for k, v in pairs(b) do
        if (type(v) == "table" and type(a[k]) == "table") then
            mergedTable[k] = tableMerge(a[k], v)
        else
            mergedTable[k] = v
        end
    end
    return mergedTable
end

local schema      = cjson.decode(ARGV[1])
local updates     = cjson.decode(ARGV[2])
local seqKey      = schema.name .. ":seq"
local idIdx       = schema.name .. ":ids"
local docKey      = schema.name .. ":" .. updates.id
local existingDoc = cjson.decode(redis.call("GET", docKey))
local updatedDoc  = tableMerge(existingDoc, updates)

redis.call("SET", docKey, cjson.encode(updatedDoc))

for i, field in ipairs(schema.indexes) do
    if existingDoc[field] ~= updatedDoc[field] then
        local key = schema.name .. ":" .. field .. ":idx"

        if (existingDoc[field] ~= nil) then
            local oldVal = existingDoc[field] .. ":" .. updates.id
            redis.call("ZREM", key, oldVal)
        else
            redis.log(redis.LOG_WARNING, "field " .. field .. " doesn't exist in existing doc")
            tprint(existingDoc)
        end

        if (updatedDoc[field] ~= nil) then
            local newVal = updatedDoc[field] .. ":" .. updates.id
            -- if (schema.fields[field] == "integer") then
                -- pad the value with leading zeros
            -- end
            redis.call("ZADD", key, 0, newVal)
        end
    end
end

return cjson.encode(updatedDoc)

local schema = cjson.decode(ARGV[1])
local query  = cjson.decode(ARGV[2])

function string:split(sep)
    local sep, fields = sep or ":", {}
    local pattern = string.format("([^%s]+)", sep)
    self:gsub(pattern, function(c) fields[#fields+1] = c end)
    return fields
end

local tableKeys = function(t)
    local tmp = {}
    for k, v in pairs(t) do
        table.insert(tmp, k)
    end
    return tmp
end

local unique = function(t)
    local uniqueElements = {}
    for i, v in pairs(t) do
        if (not uniqueElements[v]) then
            uniqueElements[v] = true
        end
    end
    return tableKeys(uniqueElements)
end

local map = function(fn, a)
    local mapped = {}
    for k,v in ipairs(a) do
        mapped[k] = fn(v)
    end
    return mapped
end

local intersection = function(...)
    local isect = function(s1, s2)
        local i = {}
        for item, _ in pairs(s1) do
            if (s2[item]) then i[item] = true end
        end
        return i
    end

    if (arg.n == 1) then return arg[1] end

    local n = 2
    local set = arg[1]
    while (n <= arg.n) do
        set = isect(set, arg[n])
        n = n + 1
    end
    return set
end

local valueIdToDocKey = function (dataItem)
    dataItem = string.split(dataItem, ":")
    local id = table.remove(dataItem)
    local docKey = schema["name"] .. ":" .. id
    return docKey
end

local queryIndexKeys = function(schema, field, value)
    local keys   = {}
    local idxkey = schema["name"] .. ":" .. field .. ":idx"
    local value  = query[field]
    local data   = redis.call("ZRANGEBYLEX", idxkey, "[" .. value .. ":", "[" .. value .. ":\xff")
    for idx, dataPair in pairs(data) do
        local docKey = valueIdToDocKey(dataPair)
        keys[docKey] = true
    end
    return keys
end

local keySets = {}
for field, value in pairs(query) do
    local indexKeys = queryIndexKeys(schema, field, value)
    table.insert(keySets, indexKeys)
end

local intersectedKeys = intersection(unpack(keySets))
local thekeys = tableKeys(intersectedKeys)
local keys = unique(thekeys)
local docs = {}

if (table.getn(keys) > 0) then
    docs = redis.call("MGET", unpack(keys))
end

return docs

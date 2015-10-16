local schema = cjson.decode(ARGV[1])
local query  = cjson.decode(ARGV[2])

function string:split(sep)
    local sep, fields = sep or ":", {}
    local pattern = string.format("([^%s]+)", sep)
    self:gsub(pattern, function(c) fields[#fields+1] = c end)
    return fields
end

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

local keys = {}
for field, value in pairs(query) do
    local idxkey =  schema["name"] .. ":" .. field .. ":idx"
    local value = query[field]

    local valueIdToDocKey = function (dataItem)
        dataItem = string.split(dataItem, ":")
        local id = table.remove(dataItem)
        local docKey = schema["name"] .. ":" .. id
        return docKey
    end

    local data = redis.call("ZRANGEBYLEX", idxkey, "[" .. value .. ":", "[" .. value .. ":\xff")
    for idx, dataPair in pairs(data) do
        local docKey = valueIdToDocKey(dataPair)
        table.insert(keys, docKey)
    end
end

local docs = redis.call("MGET", unpack(keys))

return docs

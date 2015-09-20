local schema = cjson.decode(ARGV[1])       
local data    = cjson.decode(ARGV[2])
local docKey = schema["name"] .. ":" .. data.id    -- the key for the document


local existingDoc = redis.call("GET", dockey)      --getting the document we want to update
local updatedDoc = data                 --getting the new document that would replace the old one
redis.call("SET",key, encode(updatedDoc))    --setting the key of the document to the new document. The old document is overwritten

local field = 1     -- a counter to loop over all the fields in the schema
while schema.indexes[field] do
    if (existingDoc[field] !== updatedDoc[field]) return;     ---the the field is the same in the old and new document, do nothing
        local key = schema["name"] .. ":" .. field .. "idx"
        local oldVal = existingDoc["field"] .. ":" .. id
        local newVal = updatedDoc["field"] .. ":" .. id
        --remove old data from secondary indexes
        redis.call("ZREM", key, oldVal)
        
        --add updated data to secondary indexes
        redis.call("ZADD", key, 0, newVal)
        field = field + 1
end
    
return cjson.encode(updatedDoc)

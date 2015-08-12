import collection from "../src/index";
import chai from "chai";
import sinon from "sinon";
import Promise from "bluebird";
import redis from "redis";
import r from "ramda";

const TEST_DATABASE = 15;

Promise.promisifyAll(redis);

var expect = chai.expect;
var rc = redis.createClient();

var asyncTest = (test) => {
    return async (done) => {
        try {
            await test();
            done();
        } catch (e) {
            console.error(e.stack);
            done(e);
        }
    }
}


describe("Collection", () => {
    var usersSchema = null;

    beforeEach( async (done) => {
        usersSchema = {
            name: "users",
            fields: {
                id: "autoincrement",
                name: String,
                email: { type: String, required: true },
                password: { type: String, required: true }
            },
            indexes: ["email"]
        };

        await rc.selectAsync(TEST_DATABASE);
        await rc.flushallAsync();

        done();
    });

    it ("should insert a document", asyncTest(async () => {
        var newUser = {
            email: "jeff@intelostech.com",
            name: "Jeff Carnegie",
            password: "password"
        };

        var storedUser = r.merge(newUser, {id: 1});

        var createdUser = await collection.create(usersSchema, rc, newUser);
        expect(createdUser).to.eql(storedUser);

        // double check
        var redisUser = await rc.getAsync("users:1");
        expect(JSON.parse(redisUser)).to.eql(storedUser);
    }));

    it ("should update a document", asyncTest(async () => {
        var newUser = {
            email: "jeff@intelostech.com",
            name: "Jeff Carnegie",
            password: "password"
        };

        var createdUser = await collection.create(usersSchema, rc, newUser);
        createdUser.name = "Jeffrey Carnegie";

        var updatedUser = await collection.update(usersSchema, rc, createdUser);
        expect(updatedUser).to.eql(createdUser);

        var redisUser = await rc.getAsync("users:1");
        expect(JSON.parse(redisUser)).to.eql(updatedUser);
    }));
});
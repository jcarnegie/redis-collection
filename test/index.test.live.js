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
    var newUser = null;

    beforeEach( async (done) => {
        usersSchema = {
            name: "users",
            fields: {
                id: "autoincrement",
                name: String,
                email: { type: String, required: true },
                password: { type: String, required: true },
                test: String
            },
            indexes: ["email", "test"]
        };

        newUser = {
            email: "jeff@intelostech.com",
            name: "Jeff Carnegie",
            password: "password"
        };

        // reset the database
        await rc.selectAsync(TEST_DATABASE);
        await rc.flushallAsync();

        done();
    });

    it ("should insert a document", asyncTest(async () => {
        var storedUser = r.merge(newUser, {id: 1});

        var createdUser = await collection.create(usersSchema, rc, newUser);
        expect(createdUser).to.eql(storedUser);

        // double check
        var redisUser = await rc.getAsync("users:1");
        expect(JSON.parse(redisUser)).to.eql(storedUser);
    }));

    it ("should update a document", asyncTest(async () => {
        var createdUser = await collection.create(usersSchema, rc, newUser);
        createdUser.name = "Jeffrey Carnegie";

        var updatedUser = await collection.update(usersSchema, rc, createdUser);
        expect(updatedUser).to.eql(createdUser);

        var redisUser = await rc.getAsync("users:1");
        expect(JSON.parse(redisUser)).to.eql(updatedUser);
    }));

    it ("should remove a document", asyncTest(async () => {
        var createdUser = await collection.create(usersSchema, rc, newUser);
        var removeData = await collection.remove(usersSchema, rc, createdUser.id);

        expect(removeData).to.eql({ removedDocs: 1, removedIds: 1 });

        var redisUser = await rc.getAsync("users:1");
        expect(redisUser).to.eql(null);
    }));

    it ("should find a document by id", asyncTest(async () => {
        var createdUser = await collection.create(usersSchema, rc, newUser);
        var foundUser = await collection.find(usersSchema, rc, createdUser.id);
        expect(foundUser).to.eql(createdUser);
    }));

    describe("Secondary Indexes", () => {
        it ("should find a document by secondary index", asyncTest(async () => {
            var createdUser = await collection.create(usersSchema, rc, newUser);
            var foundUsers = await collection.all(usersSchema, rc, { email: newUser.email });
            expect(foundUsers).to.eql([createdUser]);
        }));

        it ("should find multiple documents with same secondary index value", asyncTest(async() => {
            var nu1 = newUser;
            var nu2 = r.merge(newUser, { name: "Jeffrey Carnegie" });
            var u1 = await collection.create(usersSchema, rc, nu1);
            var u2 = await collection.create(usersSchema, rc, nu2);
            var foundUsers = await collection.all(usersSchema, rc, { email: nu1.email });
            expect(foundUsers).to.eql([u1, u2]);
        }));

        it ("should update an index when an indexed field is updated", async () => {
            
        });
    });
});
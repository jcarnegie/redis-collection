/* global require process console */

import "babel/polyfill";
import collection from "../src/index";
import chai from "chai";
import Promise from "bluebird";
import redis from "redis";
import r from "ramda";

const TEST_DATABASE = 15;

let expect = chai.expect;
let rc = redis.createClient();

let asyncTest = (test) => {
    return async (done) => {
        try {
            await test();
            done();
        } catch (e) {
            console.error(e.stack);  // eslint-disable-line no-console
            done(e);
        }
    };
};

Promise.promisifyAll(redis);

describe("Collection", () => {
    let usersSchema = null;
    let newUser = null;

    beforeEach(async (done) => {
        usersSchema = {
            name: "users",
            fields: {
                id: "integer",
                name: "string",
                email: { type: "string", required: true },
                password: { type: "string", required: true },
                test: "string",
                createdAt: "integer"
            },
            indexes: ["email", "test", "createdAt"]
        };

        newUser = {
            email: "jeff@intelos.is",
            name: "Jeff Carnegie",
            password: "password",
            test: "blah"
        };

        // reset the database
        await rc.selectAsync(TEST_DATABASE);
        await rc.flushallAsync();

        done();
    });

    it ("should insert a document", asyncTest(async () => {
        let storedUser = null;
        let createdUser = null;
        let redisUser = null;

        storedUser = r.merge(newUser, { id: 1 });

        createdUser = await collection.create(usersSchema, rc, newUser);
        expect(createdUser).to.eql(storedUser);

        // double check
        redisUser = await rc.getAsync("users:1");
        expect(JSON.parse(redisUser)).to.eql(storedUser);
    }));

    describe("Update", () => {
        it ("should update a document", asyncTest(async () => {
            let createdUser = null;
            let updatedUser = null;
            let redisUser   = null;

            createdUser = await collection.create(usersSchema, rc, newUser);
            createdUser.name = "Jeffrey Carnegie";

            updatedUser = await collection.update(usersSchema, rc, createdUser);
            expect(updatedUser).to.eql(createdUser);

            redisUser = await rc.getAsync("users:1");
            expect(JSON.parse(redisUser)).to.eql(updatedUser);
        }));

        it ("should update an index when an indexed field is updated", async () => {
            let createdUser = null;
            let updatedUser = null;
            let redisUser   = null;
            let oldEmailScore = null;
            let newEmailScore = null;

            createdUser = await collection.create(usersSchema, rc, newUser);
            createdUser.email = "jeff.carnegie@gmail.com";

            updatedUser = await collection.update(usersSchema, rc, createdUser);
            expect(updatedUser).to.eql(createdUser);

            redisUser = await rc.getAsync("users:1");
            expect(JSON.parse(redisUser)).to.eql(updatedUser);

            oldEmailScore = await rc.zscoreAsync("users:email:idx", `${newUser.email}:1`);
            newEmailScore = await rc.zscoreAsync("users:email:idx", `${updatedUser.email}:1`);

            expect(oldEmailScore).to.eql(null);
            expect(newEmailScore).to.eql("0");
        });
    });

    it ("should remove a document", asyncTest(async () => {
        let createdUser = await collection.create(usersSchema, rc, newUser);
        let removeData = await collection.remove(usersSchema, rc, createdUser.id);
        let redisUser = null;

        expect(removeData).to.eql({ removedDocs: 1, removedIds: 1 });

        redisUser = await rc.getAsync("users:1");
        expect(redisUser).to.eql(null);
    }));

    it ("should find a document by id", asyncTest(async () => {
        let createdUser = await collection.create(usersSchema, rc, newUser);
        let foundUser = await collection.find(usersSchema, rc, createdUser.id);
        expect(foundUser).to.eql(createdUser);
    }));

    describe("All", () => {
        it ("should find a document by secondary index", asyncTest(async () => {
            let createdUser = await collection.create(usersSchema, rc, newUser);
            let foundUsers = await collection.all(usersSchema, rc, { email: newUser.email });
            expect(foundUsers).to.eql([createdUser]);
        }));

        it ("should find documents using a multiple indexes", asyncTest(async () => {
            let createdUser = await collection.create(usersSchema, rc, newUser);
            let foundUsers = await collection.all(usersSchema, rc, {
                email: newUser.email,
                test: "blah"
            });
            expect(foundUsers).to.eql([createdUser]);
        }));

        it ("should not find documents unless data from all indexes are matched", asyncTest(async () => {
            let foundUsers = null;
            await collection.create(usersSchema, rc, newUser);
            foundUsers = await collection.all(usersSchema, rc, {
                email: newUser.email,
                test: "foo"
            });
            expect(foundUsers).to.eql([]);
        }));

        it ("should find multiple documents with same secondary index value", asyncTest(async () => {
            let nu1 = newUser;
            let nu2 = r.merge(newUser, { name: "Jeffrey Carnegie" });
            let u1 = await collection.create(usersSchema, rc, nu1);
            let u2 = await collection.create(usersSchema, rc, nu2);
            let foundUsers = await collection.all(usersSchema, rc, { email: nu1.email });
            expect(foundUsers).to.eql([u1, u2]);
        }));

        it ("should find document using $or criteria", asyncTest(async () => {
            // let nu1 = newUser;
            // let nu2 = r.merge(newUser, {
            //     email: "zuliat@intelos.is",
            //     test:  "foo"
            // });
            // let u1 = await collection.create(usersSchema, rc, nu1);
            // let u2 = await collection.create(usersSchema, rc, nu2);
            // let foundUsers = await collection.all(usersSchema, rc, {
            //     $or: [{ email: nu1.email }, { test: "foo" }]
            // });
            // expect(foundUsers).to.eql([u1, u2]);
        }));

        it ("should find document using $gt criteria", asyncTest(async () => {

            // pad with leading zeros:
            // 00000000001
            // 00000000011

            // let createdUser = await collection.create(usersSchema, rc, newUser);
            // let foundUsers = await collection.all(usersSchema, rc, {
            //     $lt: { createdAt: new Date().getTime() - (300 * 1000) }
            // });
            // expect(foundUsers).to.eql([createdUser]);
        }));

        it ("should find document using $gte criteria", asyncTest(async () => {

        }));

        it ("should find document using $lt criteria", asyncTest(async () => {

        }));

        it ("should find document using $lte criteria", asyncTest(async () => {

        }));
    });
});

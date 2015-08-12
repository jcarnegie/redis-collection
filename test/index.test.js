import collection from "../src/index";
import chai from "chai";
import sinon from "sinon";
import Promise from "bluebird";
import cap from "chai-as-promised";
import sap from "sinon-as-promised";
import r from "ramda";

// use bluebird promises with sinon-as-promised
sap(Promise);

chai.use(cap);

var expect = chai.expect;

describe("Collection", () => {
    var usersSchema = null;
    var redisMock = null;
    var multiMock = null;

    beforeEach(() => {
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

        redisMock = {
            // async methods
            incrAsync: sinon.stub(),
            getAsync: sinon.stub(),
            setAsync: sinon.stub(),
            zaddAsync: sinon.stub(),
            watchAsync: sinon.stub(),
            delAsync: sinon.stub(),
            zremAsync: sinon.stub(),
            multi: sinon.stub(),
        };

        multiMock = {
            set: sinon.stub(),
            execAsync: sinon.stub()
        }
    });

    describe("Create", () => {
        var user = null;
        var encodedUserWithId = null;

        beforeEach(() => {
            user = {
                name: "Jane Doe",
                email: "jane@gmail.com",
                password: "secret"
            };

            encodedUserWithId = JSON.stringify(r.merge(user, { id: 1 }));
        });

        it("should insert a new document", async () => {
            var id = 1;
            redisMock.incrAsync.withArgs("users_seq").resolves(id);
            redisMock.setAsync.withArgs("users:1").resolves();
            redisMock.zaddAsync.resolves();
            redisMock.zaddAsync.withArgs("users:email:idx", 0, `${user.email}:${id}`).resolves();

            var newUser = await collection.create(usersSchema, redisMock, user);
            var userWithId = r.merge(user, {id: id});

            expect(newUser).to.eql(userWithId);

            expect(redisMock.incrAsync.withArgs("users_seq").calledOnce).to.eql(true);
            expect(redisMock.setAsync.calledOnce).to.eql(true);
            expect(redisMock.zaddAsync.calledTwice).to.eql(true);
            expect(redisMock.zaddAsync.withArgs("users:id", 0, id).calledOnce);
        });
    });

    describe("Update", () => {
        var existingUser = null;
        var updates = null;

        beforeEach(() => {
            existingUser = {
                id: 1,
                name: "Jane Doe",
                email: "jane@gmail.com",
                password: "secret"
            };

            updates = { id: 1, name: "Janet Doe" };
        });

        it("should update an existing document", async () => {
            var encodedUpdates = JSON.stringify(r.merge(existingUser, updates));

            redisMock.watchAsync.resolves();
            redisMock.getAsync.withArgs("users:1").resolves(existingUser);
            redisMock.multi.returns(multiMock);
            multiMock.set.withArgs("users:1", encodedUpdates).returnsThis();
            multiMock.execAsync.resolves();

            var updatedUser = await collection.update(usersSchema, redisMock, updates);
            expect(updatedUser).to.eql(r.merge(existingUser, updates));

            expect(redisMock.watchAsync.calledOnce).to.eql(true);
            expect(redisMock.getAsync.withArgs("users:1").calledOnce).to.eql(true);
            expect(redisMock.multi.calledOnce).to.eql(true);
            expect(multiMock.set.withArgs("users:1", encodedUpdates).calledOnce).to.eql(true);
            expect(multiMock.execAsync.calledOnce).to.eql(true);
        });
    });

    describe("Remove", () => {
        it ("should remove a doc", async () => {
            var id = 1;
            redisMock.delAsync.withArgs("users:1").resolves(1);
            redisMock.zremAsync.withArgs("users:ids", id).resolves(1);
            var removeCounts = await collection.remove(usersSchema, redisMock, id);

            expect(removeCounts.removedDocs).to.eql(1);
            expect(removeCounts.removedIds).to.eql(1);
            expect(redisMock.delAsync.withArgs("users:1").calledOnce).to.eql(true);
            expect(redisMock.zremAsync.withArgs("users:ids", id).calledOnce).to.eql(true);
        });
    });

    describe("Find", () => {
        var existingUser = null;

        beforeEach(() => {
            existingUser = {
                id: 1,
                name: "Jane Doe",
                email: "jane@gmail.com",
                password: "secret"
            };
        });

        it("should find a doc by id", async () => {
            var id = 1;
            redisMock.getAsync.withArgs("users:1").resolves(existingUser);
            var user = await collection.find(usersSchema, redisMock, { id: id });
            expect(user).to.eql(existingUser);
        });
    });
});
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
    describe("Create", () => {
        var usersSchema = null;
        var redisMock = null;
        var user = null;
        var encodedUserWithId = null;

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
                incrAsync: sinon.stub(),
                setAsync: sinon.stub(),
                zaddAsync: sinon.stub()
            };

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
});
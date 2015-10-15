var babel = require("babel");

module.exports = function (wallaby) {
    return {
        testFramework: "mocha@2.1.0",
        files: [
            "src/**/*.js",
            "src/**/*.lua"
        ],
        // tests: ["test/**/*.test.js"],
        tests: ["test/index.live.test.js"],
        env: { type: "node" },
        compilers: {
            "**/*.js": wallaby.compilers.babel({
                babel: babel,
                // other babel options
                stage: 0    // https://babeljs.io/docs/usage/experimental/
            })
        }
    }
}

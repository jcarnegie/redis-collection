/* global require process console */
var gulp        = require("gulp");
var sourcemaps  = require("gulp-sourcemaps");
var babel       = require("gulp-babel");
var watch       = require("gulp-watch");
var mocha       = require("gulp-mocha");
var eslint      = require("gulp-eslint");
var istanbul    = require("gulp-babel-istanbul");
var mergeStream = require("merge-stream");

const MIN_COVERAGE_PERCENTAGE = 90;
const COVERAGE_REPORTERS = ["lcov", "json", "text", "text-summary", "clover"];

// since our tests are written in es6/7 and transpiled with babel
require("babel/register");

gulp.task("default", function () {
    return gulp.src("src/**/*.js")
        .pipe(sourcemaps.init())
        .pipe(babel({ stage: 0 }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest("dist"));
});

gulp.task("dev", function () {
    return gulp.src("src/**/*.js")
        .pipe(watch("src/**/*.js"))
        .pipe(sourcemaps.init())
        .pipe(babel({ stage: 0 }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest("lib"));
});

gulp.task("test", function() {
    return gulp.src("test/**/*.test.js")
        .pipe(mocha())
        .once("error", function (e) { console.log(e.stack); process.exit(1); }) // eslint-disable-line no-console
        .once("end", function () { process.exit(); });
});

gulp.task("coverage", function() {
    mergeStream(
        gulp.src(["src/**/*.js"])
            .pipe(istanbul()),
        gulp.src(["test/**/*.test.js"])
        .pipe(babel())
    ).pipe(istanbul.hookRequire())
        .on("finish", function () {
            gulp.src(["test/**/*.test.js"])
                .pipe(mocha())
                // Creating the reports after tests ran
                .pipe(istanbul.writeReports({ reporters: COVERAGE_REPORTERS }))
                // FAIL unless coverage >= MIN_COVERAGE_PERCENTAGE
                .pipe(istanbul.enforceThresholds({ thresholds: { global: MIN_COVERAGE_PERCENTAGE } })) // Enforce a coverage of at least 90%
                .once("error", function () { console.log("ERROR: Code coverage below " + MIN_COVERAGE_PERCENTAGE + "%"); process.exit(1); }) // eslint-disable-line no-console
                .once("end", function() { process.exit(); });
        });
});

gulp.task("lint", function() {
    return gulp.src(["src/**/*.js", "test/**/*.js"])
        .pipe(eslint())
        .pipe(eslint.formatEach())
        .pipe(eslint.failOnError());
});

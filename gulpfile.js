/* global require process console */
var gulp       = require("gulp");
var sourcemaps = require("gulp-sourcemaps");
var babel       = require("gulp-babel");
var watch       = require("gulp-watch");
var mocha       = require("gulp-mocha");
var eslint      = require("gulp-eslint");
var istanbul    = require("gulp-babel-istanbul");
var mergeStream = require("merge-stream");

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
        .once('error', function (e) { console.log(e.stack); process.exit(1); }) // eslint-disable-line no-console
        .once('end', function () { process.exit(); });
});

gulp.task("coverage", function(done) {
    mergeStream(
        gulp.src(['lib/**/*.js', 'main.js'])
            .pipe(istanbul()),
        gulp.src(['test/*.js'])
        .pipe(babel())
    ).pipe(istanbul.hookRequire())
        .on('finish', function () {
            gulp.src(['test/*.js'])
                .pipe(mocha())
                .pipe(istanbul.writeReports()) // Creating the reports after tests ran
                .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } })) // Enforce a coverage of at least 90%
                .on('end', done);
        });
});

gulp.task("lint", function() {
    return gulp.src(["src/**/*.js", "test/**/*.js"])
        .pipe(eslint())
        .pipe(eslint.formatEach())
        .pipe(eslint.failOnError());
});

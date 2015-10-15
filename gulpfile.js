var gulp       = require("gulp");
var sourcemaps = require("gulp-sourcemaps");
var babel      = require("gulp-babel");
var watch      = require("gulp-watch");
var mocha      = require("gulp-mocha");
var eslint     = require("gulp-eslint");

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
        .once('error', function (e) { console.log(e.stack); process.exit(1); })
        .once('end', function () { process.exit(); });
});

gulp.task("test:live", function() {
    return gulp.src("test/**/*.live.test.js")
        .pipe(mocha())
        .once('error', function (e) { console.log(e.stack); process.exit(1); })
        .once('end', function () { process.exit(); });
});

gulp.task("lint", function() {
    return gulp.src(["src/**/*.js", "test/**/*.js"])
        .pipe(eslint())
        .pipe(eslint.formatEach())
        .pipe(eslint.failOnError());
});

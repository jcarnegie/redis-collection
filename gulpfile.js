var gulp       = require("gulp");
var sourcemaps = require("gulp-sourcemaps");
var babel      = require("gulp-babel");
var watch      = require("gulp-watch");
var mocha      = require("gulp-mocha");

// since our tests are written in es6/7 and transpiled with babel
require("babel/register")({
    // stage: 0,
    // experimental: true
});
 
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
        // .pipe(sourcemaps.init())
        // .pipe(babel({ stage: 0 }))
        // .pipe(sourcemaps.write())
        .pipe(mocha())
        .once('error', function (e) { console.log(e.stack); process.exit(1); })
        .once('end', function () { process.exit(); });
});
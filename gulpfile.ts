import * as del from "del";
import * as gulp from "gulp";
import * as rename from "gulp-rename";
import * as ts from "gulp-typescript";
import * as uglify from "gulp-uglify";
import * as karma from "karma";
import * as typescript from "rollup-plugin-typescript2";
import * as rollup from "rollup-stream";
import * as runSequence from "run-sequence";
import * as source from "vinyl-source-stream";

declare const __dirname;
const tsProject = ts.createProject("tsconfig.json");
const lib = "clarity.js";
const minifiedLib = "clarity.min.js";
const clarityModule = "module.js";
const karmaServer = karma.Server;

gulp.task("build", () => {
  runSequence(
    "clean",
    "compile",
    "place-fixture",
    "rollup-lib",
    "rollup-module",
    "uglify"
  );
});

// build and then run coverage
gulp.task("bnc", () => {
  runSequence(
    "clean",
    "compile",
    "place-fixture",
    "rollup-lib",
    "rollup-module",
    "uglify",
    "coverage"
  );
});

// build and then run tests
gulp.task("bnt", () => {
  runSequence(
    "clean",
    "compile",
    "place-fixture",
    "rollup-lib",
    "rollup-module",
    "uglify",
    "test"
  );
});

gulp.task("uglify", () => {
  return gulp.src("build/" + lib)
    .pipe(uglify())
    .pipe(rename(minifiedLib))
    .pipe(gulp.dest("build"));
});

gulp.task("rollup-lib", () => {
  return rollup({
    input: "./src/clarity.ts",
    format: "umd",
    name: "clarity",
    plugins: [ (typescript as any)() ]
  })
  .pipe(source(lib))
  .pipe(gulp.dest("build"));
});

gulp.task("rollup-module", () => {
  return rollup({
    input: "./src/module.ts",
    format: "umd",
    name: "clarity",
    plugins: [ (typescript as any)() ]
  })
  .pipe(source(clarityModule))
  .pipe(gulp.dest("build"));
});

gulp.task("clean", () => {
  del("build");
});

gulp.task("compile", () => {
  return tsProject.src()
    .pipe(tsProject())
    .js
    .pipe(gulp.dest(tsProject.config.compilerOptions.outDir));
});

gulp.task("place-fixture", () => {
  return gulp.src("test/clarity.fixture.html")
    .pipe(gulp.dest("build/test"));
});

gulp.task("place-git-hooks", () => {
  return gulp.src("githooks/*")
    .pipe(gulp.dest(".git/hooks"));
});

gulp.task("test", (done) => {
  new karmaServer({
    configFile: __dirname + "/build/test/karma.conf.js",
    singleRun: true
  }, done).start();
});

gulp.task("test-debug", (done) => {
  new karmaServer({
    configFile: __dirname + "/build/test/karma.conf.js",
    singleRun: false
  }, done).start();
});

gulp.task("coverage", (done) => {
  new karmaServer({
    configFile: __dirname + "/build/test/coverage.conf.js"
  }, done).start();
});

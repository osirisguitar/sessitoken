var gulp = require('gulp'),
  jshint = require('gulp-jshint'),
  mocha = require('gulp-mocha'),
  plumber = require('gulp-plumber');

gulp.task('jshint', function () {
  return gulp.src(['index.js', 'lib/**/*.js', 'test/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('mocha', function () {
  return gulp.src(['test/**/*.js'])
    .pipe(plumber())
    .pipe(mocha({reporter: 'Spec'}));
});

gulp.task('watch', function() {
  gulp.watch(['./**/*.js'], ['jshint', 'mocha']);
  gulp.watch(['.jshintrc'], ['jshint']);
});

gulp.task('test', ['jshint', 'mocha']);
gulp.task('default', ['test', 'watch']);
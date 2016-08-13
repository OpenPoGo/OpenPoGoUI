var gulp        = require('gulp');
var uglify      = require('gulp-uglify');
var rename      = require('gulp-rename');
var sass        = require('gulp-sass');
var cssnano     = require('gulp-cssnano');
var babel       = require('gulp-babel');
var usemin      = require('gulp-usemin');
var ghPages = require('gulp-gh-pages');

// Auto

gulp.task('styles', function() {
    return gulp.src('src/scss/*.scss')
                .pipe(sass().on('error', sass.logError))
                .pipe(cssnano())
                .pipe(gulp.dest('./build/assets/css'));
});

gulp.task('watch-styles', function() {
   gulp.watch('src/scss/*.scss', ['styles']);
});

gulp.task('watch', [ 'watch-styles' ]);

// Main tasks

gulp.task('default', [ 'build' ]);

gulp.task('assets', function() {
  return gulp.src('src/assets/**/*')
             .pipe(gulp.dest('./build/assets'));
});

gulp.task('scripts', function() {
    return gulp.src('src/index.html')
                .pipe(usemin({
                    js: [
                        babel({ presets: ['es2015'] }),
                        uglify()
                    ]
                }))
                .pipe(gulp.dest('./build'));
});

gulp.task('build', [ 'assets', 'styles', 'scripts' ]);

gulp.task('deploy:staging', ['build'], function() {
  return gulp.src([
      './build/**/*'
    ]).pipe(gulp.dest('./build')).pipe(ghPages({remoteUrl: "https://github.com/nicoschmitt/openui.git"}));
});

gulp.task('deploy:production', ['build'], function() {
  return gulp.src([
      './build/**/*'
    ]).pipe(gulp.dest('./build')).pipe(ghPages({remoteUrl: "https://github.com/OpenPoGo/OpenPoGoUI.git"}));
});

var gulp        = require('gulp');
var uglify      = require('gulp-uglify');
var rename      = require('gulp-rename');
var sass        = require('gulp-sass');
var cssnano     = require('gulp-cssnano');
var babel       = require('gulp-babel');
var usemin      = require('gulp-usemin');
var ghPages     = require('gulp-gh-pages');

// Auto

gulp.task('styles', function() {
    return gulp.src('src/assets/css/*.scss')
                .pipe(sass().on('error', sass.logError))
                .pipe(cssnano())
                .pipe(gulp.dest('build/assets/css'));
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

gulp.task('static', function() {
  return gulp.src(['src/**/*', '!src/scripts/**/*', '!src/assets/css/**/*', '!src/index.html'])
             .pipe(gulp.dest('./build'));
});

gulp.task('watch-styles', function() {
   return gulp.watch('src/assets/css/*.scss', ['styles']);
});

gulp.task('watch', [ 'watch-styles' ]);

gulp.task('build', [ 'static', 'styles', 'scripts' ]);

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

gulp.task('default', [ 'build' ]);

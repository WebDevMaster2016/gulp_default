// define gulp plugins
const gulp         = require('gulp'),
	  sass         = require('gulp-sass'),
	  plumber      = require('gulp-plumber'),
	  autoprefixer = require('gulp-autoprefixer'),
	  sourcemaps   = require('gulp-sourcemaps'),
	  concat       = require('gulp-concat'),
	  uglify       = require('gulp-uglify'),
	  csso         = require('gulp-csso'),
	  babel        = require("gulp-babel"),
	  inject       = require('gulp-inject'),
	  hash         = require('gulp-hash-filename'),
	  clean        = require('gulp-clean'),
	  svgo         = require('gulp-svgo'),
	  svgSprite    = require('gulp-svg-sprites'),
	  pump         = require('pump'),
	  browserSync  = require('browser-sync').create(),
	  reload       = browserSync.reload;

// define autoprefixer settings
const autoprefixerSettings = {
	overrideBrowserslist: [
		'last 2 versions',
		'iOS 7'
	],
	cascade: false
};

// define global path for source, destination and watching
const src = {
	public: {
		cssBuild      : 'web/assets/css/*.css',
		jsBuild       : 'web/assets/js/*.js',
		css           : 'web/assets/css/',
		js            : 'web/assets/js/',
		svg           : 'web/assets/img/icons/svg/'
	},
	dev: {
		baseInputCss  : 'Path to /css/css.html.twig',
		baseInputJs   : 'Path to /js/js.html.twig',
		baseOutputCss : 'Path to /css',
		baseOutputJs  : 'Path to /js',
		scss          : 'Path to /scss/*.scss',
		js            : 'Path to /js/*.js',
		jsLib         : 'Path to /js/lib/*.js',
		svg           : 'Path to /images/icons/svg/*.svg'
	},
	watch: {
		scss          : 'Path to /sass/**/*.scss',
		js            : 'Path to /js/**/*.js',
		svg           : 'Path to /images/icons/svg/*.svg'
	}
};

// static server + browserSync watching for all files
gulp.task('serve', () => {
	browserSync.init({
		port: 9005,
		proxy: "http://localhost:3270/"
	});

	// watch any changes in .css, .js files and reload browser
	browserSync.watch('web/**/*.*').on('change', reload);
});


// compile sass into CSS dev
gulp.task('scss', cb => {
	pump([
		gulp.src(src.dev.scss),
		plumber(),
		sourcemaps.init(),
		sass(),
		autoprefixer(autoprefixerSettings),
		sourcemaps.write(),
		gulp.dest(src.public.css)
	], cb);
});

// compile sass into CSS prod
gulp.task('build-scss', cb => {
	pump([
		gulp.src(src.dev.scss),
		sass(),
		csso({restructure: false}),
		autoprefixer(autoprefixerSettings),
		hash(),
		gulp.dest(src.public.css)
	], cb);
});

// compile js dev
gulp.task('js', cb => {
	pump([
		gulp.src([src.dev.jsLib, src.dev.js]),
		plumber(),
		sourcemaps.init(),
		concat('script.js'),
		sourcemaps.write(),
		gulp.dest(src.public.js)
	], cb);
});

// compile js prod
gulp.task('build-js', cb => {
	pump([
		gulp.src([src.dev.jsLib, src.dev.js]),
		babel(),
		uglify(),
		concat('script.min.js'),
		hash(),
		gulp.dest(src.public.js)
	], cb);
});

function injectString (taskName, baseInput, baseOutput, build) {
	gulp.task(taskName, cb => {
		pump([
			gulp.src(baseInput),
			inject(
				gulp.src([build], {read: false}), {
					transform: function (filepath) {
						const fileExtension = filepath.slice(filepath.lastIndexOf('.'));
						const stringToInsert = filepath.substring(filepath.slice(1).indexOf("/") + 2);
						if (fileExtension === '.css') {
							return `<link rel="stylesheet" href="${stringToInsert}" />`;
						}
						if (fileExtension === '.js') {
							return `<script async src="${stringToInsert}"></script>`;
						}
						// Use the default transform as fallback:
						return inject.transform.apply(inject.transform, arguments);
					}
				}
			),
			gulp.dest(baseOutput)
		], cb);
	});
}

// inject updated file name to header
injectString('inject-header', src.dev.baseInputCss, src.dev.baseOutputCss, src.public.cssBuild);

// inject updated file name to footer
injectString('inject-footer', src.dev.baseInputJs, src.dev.baseOutputJs, src.public.jsBuild);

// clean css && js dest directory
gulp.task('clean', cb => {
	pump([
		gulp.src([src.public.css, src.public.js], {read: false, allowEmpty: true}),
		clean()
	], cb);
});

// create svg sprite from svg files - for dev only
gulp.task('svg-sprite', cb => {
	pump([
		gulp.src(src.dev.svg),
		svgSprite({
			mode: "symbols",
			svgId: "icon-%f",
			svg: {
				symbols: "symbols.svg"
			},
			preview: {
				sprite: "sprite-preview.html"
			}
		}),
		svgo({
			plugins: [
				{removeViewBox: false},
				{cleanupIDs: false},
				{removeTitle: true}
			]
		}),
		gulp.dest(src.public.svg)
	], cb);
});

// watch any changes in html, css, js files
gulp.task('watch', () => {
	gulp.watch(src.watch.scss, gulp.series('scss'));
	gulp.watch(src.watch.js, gulp.series('js'));
	gulp.watch(src.watch.svg, gulp.series('svg-sprite'));
});

// build task
gulp.task('build', gulp.series(
	'clean',
	gulp.parallel('build-scss', 'build-js'),
	'inject-header',
	'inject-footer'
));

// default task
gulp.task('default', gulp.series(
	'clean',
	gulp.parallel('scss', 'js'),
	'inject-header',
	'inject-footer',
	'svg-sprite',
	gulp.parallel('watch', 'serve')
));
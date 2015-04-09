var gulp = global.gulp;

var fs = require('fs');

var _ = global._ = require('lodash');
//var async = global.async = require('async');

var gutil = require("gulp-util");

var path = require( 'path' );

var jeet = global.jeet = require("jeet");
var nib = global.nib = require('nib');
var rupture = global.rupture = require('rupture');
var kouto = global.kouto = require('kouto-swiss');
var uglify = require('gulp-uglify');


gulp.task('web-lint', function() {
	return gulp.src( ['web/js/*.js', '!web/js/*.min.js'] )
		.pipe( global.plugins.jshint() )
		.pipe( global.plugins.jshint.reporter('default' ));
});

gulp.task( 'copy-static', [ 'web-lint' ], function( ) {
	return gulp.src( ['./web/**/*', '!web/views/*', '!web/views', '!web/css/*.styl'] )
		.pipe( gulp.dest('./public') );
});

var buildTasks = [ 'web-lint', 'copy-static' ];

gulp.task( 'watch-static', [ 'copy-static' ], function() {
	gulp.watch(['./web/**/*'], [ 'copy-static' ] );
});

var innerWatchGulp = 'innerWatch', watchGulp = 'watch', buildGulp = 'build', stylusGulp = 'stylus', jsGulp = 'js';

gulp.task(jsGulp, [ 'copy-static' ], function( callback ) {
    if (global.argv.development) {
        gulp.src('web/js/*.js')
            .pipe(gulp.dest('public/js'));
    } else {
        gulp.src(['web/js/*.js', '!web/js/*.min.js'])
            .pipe(uglify())
            .pipe(gulp.dest('public/js'));
    }
    callback();
});

gulp.task(stylusGulp, function ( cb ) {
	return gulp.src('./web/css/style.styl')
		.pipe( global.plugins.stylus( {
			errors: true,
			use: [ global.jeet(), global.nib(), global.rupture(), global.kouto() ],
			compress: !global.argv.development,
			"include css": true,
		} ).on('error', function(err){
			console.error(err);
		}) )
		.pipe( global.plugins.autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}) )
		.on('error', function(err){ console.error(err); })
		.pipe( global.plugins.minifyCss( { keepBreaks: global.argv.development } ) )
		.pipe( gulp.dest('./public/css') )
		.pipe( global.plugins.livereload() );
});

gulp.task( buildGulp, [ stylusGulp, jsGulp ], function( cb ) { cb(); });
buildTasks = buildTasks.concat( stylusGulp, jsGulp );


gulp.task( innerWatchGulp, function() {
	gulp.watch(['./web/css/*.styl'], [ stylusGulp ] );

	gulp.watch(['./node_modules/*/package.json', './web/js/*.js'], [ jsGulp ] );

	var all_build_files = ['./public/**/*'];
	return gulp.watch(all_build_files, function(evt){
		global.plugins.livereload.changed(evt.path);
	});
});

gulp.task( watchGulp, [stylusGulp, jsGulp, 'watch-static'], function( callback ) {
	global.developmentMode = true;
	global.plugins.livereload.listen();
	global.runSequence(
		stylusGulp, jsGulp, innerWatchGulp, callback
	);
});

exports.buildTasks = buildTasks;

gulp.task( 'innerWatch-web', function() {
	gulp.watch(['./web/css/*.styl'], [stylusGulp] );

	gulp.watch(['./node_modules/*/package.json', './web/js/*.js'], [watchGulp] );

	var all_build_files = ['./public/**/*'];
	return gulp.watch(all_build_files, function(evt){
		global.plugins.livereload.changed(evt.path);
	});
});
gulp.task( 'watch-web', buildTasks.concat( 'watch-static' ), function( callback ) {
	global.plugins.livereload.listen();
	global.runSequence(
		[stylusGulp], [watchGulp], 'innerWatch-web', callback
	);
});

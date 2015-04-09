var argv = global.argv = require('minimist')(process.argv.slice(2));
var gulp = global.gulp = require('gulp'),
	plugins = global.plugins = require("gulp-load-plugins")( { scope: ['devDependencies'] } );

var runSequence = global.runSequence = require('run-sequence');
var fs = require('fs');
var rimraf = require('rimraf');

gulp.task( 'clean-web', function(callback) {
    //callback();
	if( fs.existsSync('./public/') )
		rimraf('./public/', callback );
	else callback();
} );
var web = require('./gulp/web' );
gulp.task( 'build-web', function(callback) {
	runSequence(
		'clean-web', web.buildTasks, callback
	);
} );


gulp.task( 'build', function(callback) {
	runSequence(
		web.buildTasks, callback
	);
} );

gulp.task( 'watch', function(callback) {
	global.developmentMode = true;
	runSequence(
		'watch-web', callback
	);
} );

gulp.task( 'default', [ 'build' ] );

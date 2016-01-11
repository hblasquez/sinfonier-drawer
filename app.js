// Copyright 2015 Sinfonier Project

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var express = require('express'),
    partials = require('express-partials'),
    expressValidator = require('express-validator'),
    fs = require('fs'),
    async = require('async'),
    Db = require('mongodb').Db,
    Server = require('mongodb').Server,
    connect = require('connect'),
    methodOverride = require('method-override'),
    flash = require('connect-flash'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    multer = require('multer'),
    morgan = require('morgan');

var session = require('express-session');
var mongoStore = require('connect-mongo')(session);

// express server
var app = express();

app.root = __dirname;

// Load config file
app.config = require(app.root + '/config/' + app.set('env') + '.js');

process.loadQueue = async.queue(function(module,cb){
  module.callSerializedLoad(cb);
}, 1);

// Database Connect to mongo
app.db = new Db(app.config.database.db, 
				new Server(app.config.database.host, app.config.database.port, app.config.database.options),{fsync:true}
			);
console.log("Connecting to MongoDB...");

app.db.open(function(err) {


	// Don't start without MongoDB running
	if(err) {
		console.log(err);
		return;
	}

  var setup = function()
  {
    // Middleware setup
    app.use(morgan('combined'));				// Enable request logging
    app.use(express.static(app.root + '/public')); //Static content
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(multer());		// multipart
    app.use(expressValidator({})); // this line must be immediately after express.bodyParser()!
    app.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
      }
    }));	// sets a hidden input of _method to an arbitrary HTTP method
    app.use(cookieParser('secret supersecret'));	// Required by session

    // Use connect-mongodb SessionStore
    app.use( session({
          cookie: {maxAge: 120 * 60 * 1000}, // two hours
          secret: app.config.sessions.secret,
          store: new mongoStore({db: app.db}),
          resave:true,
          saveUninitialized:true
        })
    );
    app.use(flash());
    app.use(partials());
    // User model
    User = require(app.root + '/lib/models/User').init(app.db);
    // Topology model
    Topology = require(app.root + '/lib/models/Topology').init(app.db);
    // Module model
    Module = require(app.root + '/lib/models/Module').init(app.db);
    // Version model
    Version = require(app.root + '/lib/models/Version').init(app.db);
    // Notification model
    Notification = require(app.root + '/lib/models/Notification').init(app.db);

    // Authentication => populate req.current_user
    app.use(
        (function() {
          return function(req, res, next) {
            User.authenticate(req, res, function(current_user) {
              req.current_user = current_user;
              next();
            }, function() {
              next();
            });
          };
        })()
    );

    app.use(function(req,res,next){
      // req.flash to html helper
      res.locals.messages = function(){
          var buf = [],
              messages = req.flash(),
              types = Object.keys(messages);
          if (!types) {
            return '';
          }
          len = types.length;
          if (!len) {
            return '';
          }
          buf.push('<div id="messages">');
          for (var i = 0 ; i < len; ++i) {
            var type = types[i],
                msgs = messages[type], j;
            buf.push('  <ul class="' + type + '">');
            for (j = 0, len = msgs.length; j < len; ++j) {
              var msg = msgs[j];
              buf.push('    <li>' + msg + '</li>');
            }
            buf.push('  </ul>');
          }
          buf.push('</div>');
          return buf.join('\n');
        };

      res.locals.current_user = req.current_user;
      next();
    });


    app.set('views', app.root + '/lib/views');
    app.set('view engine', 'ejs');



    // Middleware for authentication checking
    app.require_login = function(req, res, next) {
      if (!!req.current_user) {
        next()
      } else {
        function endsWith(str, suffix) {
          return str.indexOf(suffix, str.length - suffix.length) !== -1;
        }
        var str = req.path;
        var suffix = '.json';
        //AJAX calls not redirected to login
        if (req.param("format") === "json" ||
            "XMLHttpRequest" === req.headers["x-requested-width"]  ||
            str.indexOf(suffix, str.length - suffix.length) !== -1)
        {
          return next(new Error('Not logged in'));
        }
        req.session.returnTo = req.url;
        req.flash('error', 'Not logged in');
        return res.redirect("/sessions/signin");
      }
      //next(new Error('Unauthorized'));
    };

    // Middleware for admin checking
    app.require_admin = function(req, res, next) {
      (!!req.current_user && req.current_user.role == 'admin') ?  next() : next(new Error('Unauthorized'));
    };


    // Require all helpers & controllers
    var loadDirs = ['helpers', 'controllers'];
    loadDirs.forEach(function(dir) {
      fs.readdirSync(app.root + '/lib/'+dir+'/').forEach(function(file) {
        // test if JS file
        if(file.substr(-3) == ".js") {
          require(app.root + '/lib/'+dir+'/'+file).expressRoutes(app);
        }
      });
    });


    app.use(function(req,res,next) {

      res.render('404', { status: 404, locals: {	title: 'NotFound', action: 'error' }});
    } );

    app.use(function(err, req, res, next){
      console.log(err.message);
      console.log(err.stack);
      if (err.message == "Unauthorized" || err.message == "Not logged in") {
        var str = req.path;
        var suffix = '.json';
        if (req.accepts("json") || req.param("format") === "json" ||
            "XMLHttpRequest" === req.headers["x-requested-width"]  ||
            str.indexOf(suffix, str.length - suffix.length) !== -1)
        {
          return res.status(401).json( {error:"Not logged in"} );
        }
        res.render('401', { status: 401, locals: {	title: 'Not logged in', action: 'error', error: err }});
      }
      if (err.message == "Not Found") {
        res.render('404', { status: 404, locals: {	title: 'Not Found', action: 'error', error: err }});
      }
      else {
        res.render('500', { status: 500, locals: {	title: 'Error', action: 'error', error: err }});
      }
    });

    // Catch all other routes
    /*
    app.use(function(req,res) {
      res.render('404', { status: 404, locals: {	title: 'NotFound', action: 'error' }});
    } );
*/
    // start the server
    app.listen(app.config.server.port, app.config.server.ip);

    console.log("App started in '"+app.set('env')+"' environment !\n" +
        "Listening on http://"+app.config.server.host+":"+app.config.server.port);

    // Intercept exceptions after init so that the server doesn't crash at each uncatched exception
    process.on('uncaughtException', function (err) {
      console.log('Caught exception: ' + err);
      console.log(err.stack);
    });


  }

  if (app.config.database.user) {
    app.db.authenticate(app.config.database.user, app.config.database.pwd, function (err, result) {
      if(err) {
        console.log(err);
        return;
      }
      setup();
    });
  }
  else{
    setup();
  }


});

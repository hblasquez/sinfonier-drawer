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

 var util = require('../utils/util');
var async = require('async');

exports.expressRoutes = function(app) {

	app.get('/', function(req, res){
		res.redirect(req.current_user ? '/dashboard' : '/sessions/signin');
	});

	// Editor
	app.get('/editor', app.require_login, function(req, res){
    var xmlstorm = require(app.root + '/lib/xmlstorm');
    var definitions = xmlstorm.definitions;


    app.db.collection('modules', function(error, box_collection) {
      if(error) { throw error; }
      box_collection.find( {name:{$in:req.current_user.tools || []}, $or: [{"container.codeURL" : {$exists : true, $ne : ""}},{"sourceType":'Local'}]}, function(error, cursor) {
        if(error) { throw error; }
        cursor.toArray(function(error, results) {
          if(error) { throw error; }
          if (results)
          {
            for(var i=0;i<results.length;i++)
            {
              results[i]["container"]["description"] = util.parseMarkdown(results[i]["container"]["description"]);
              if (!req.current_user._id.equals(results[i].user_id))
              {
                results[i]["container"]["icon"] = results[i]["container"]["icon"].replace("-user","");
              }
              if (results[i].status == 'deleted')
              {
                results[i]["container"]["icon"] = results[i]["container"]["icon"].replace(".png","-deleted.png");
              }
            }
          }
          var allDef = definitions.concat(results);
          allDef.forEach(function(module){
            if (module.singleton)
            {
              module.container.singleton = true;
            }
          })
          res.render('website/editor', {
            layout: false,
            locals: {
                definitions: allDef,
                current_user: req.current_user
              }
          });
        });
      });
    });
	});

    // Dashboard
	app.get('/dashboard', app.require_login, function(req, res){

    async.parallel([
          function(callback){ Topology.countByUser(req.current_user._id,callback)},
          function(callback){ Topology.runningByUser(req.current_user._id,callback)},
          function(callback){ Module.countByUser(req.current_user._id,callback)},
          function(callback){ Module.topRatedByUser(req.current_user._id,5,callback)},
          function(callback){ Module.topUsedByUser(req.current_user._id,5,callback)},
          function(callback){ User.topRated(5,callback)}
        ]
        ,function(err, results)
        {
          if(err) { throw err; }
          res.render('website/dashboard', {
            locals: {
              title: "Dashboard",
              action: "dashboard",
              user: req.current_user,
              numTopologies: results[0],
              runningTopologies: results[1],
              numModules: results[2],
              topRatedModules: results[3],
              topUsedModules: results[4],
              topRatedUsers: results[5]
            }
          });
        }
    );

	});
	
    // About
    app.get('/about', function(req, res){
        res.render('website/about', {
            locals: { title: 'About Sinfonier', action: 'about' }
        });
    });
    // Contributors
    app.get('/contributors', function(req, res){
        res.render('website/contributors', {
            locals: { title: 'Contributors', action: 'contributors' }
        });
    });

    // Packages
    app.get('/libraries', function(req, res){
        res.render('website/libraries', {
            locals: { title: 'Packages', action: 'libraries' }
        });
    });


};
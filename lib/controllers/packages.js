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

 // DELETE?

 var npm = require('npm');

exports.expressRoutes = function(app) {

	// Package list
	app.get('/packages', app.require_login, function(req, res){		
		
		npm.load({}, function (err) {

		   if (err) throw err;

			npm.commands.ls(['webhookit'], true, function (err, packages) {
				if (err) throw err;

				var installed = {};
				var available = {};
            
				packages = packages.dependencies;
				
				for(var k in packages) {
					pkg = packages[k];
					var name = pkg.name;
					var s = name.split('@');
					var version = s[1];
					var lib = (s[0].split('-'))[1];

					//if( pkg.words.indexOf('installed') != -1) {
						installed[lib] = pkg;
						if(available[lib]) {
							delete available[lib];
						}
					/*}
					else if(!installed[lib]) {
						available[lib] = pkg;
					}*/

				}

				res.render('packages/list', { 
					locals: {
						title: 'Packages',
						action: 'packages',
						packages: {
							installed: installed,
							available: available
						}
					}
				});
			});
		});
	});
	
	
	app.get('/packages/install/:lib', app.require_login, function(req, res){
		
		var name = "webhookit-"+req.param('lib');
		
		npm.load({}, function (er) {
		  if (er) throw er;
		
			var npmlog = [];
		
		  npm.commands.install([name], function (er, data) {
		    if (er) return commandFailed(er)

				res.render('packages/install', { 
					locals: {
						title: 'Package installed',
						action: 'packages',
						
							data: data,
							npmlog: npmlog
						
					}
				});
		  })
		  
			npm.on("log", function (message) { npmlog.push(message); });
		
		})
		
		
	});
	
	
	app.get('/packages/uninstall/:lib', app.require_login, function(req, res){
		
		var name = "webhookit-"+req.param('lib');
		
		npm.load({}, function (er) {
		  if (er) throw er;
		
			var npmlog = [];
		
		  npm.commands.rm([name], function (er, data) {
		    if (er) return commandFailed(er)

				res.render('packages/install', { 
					locals: {
						title: 'Package uninstalled',
						action: 'packages',
						
							data: data,
							npmlog: npmlog
						
					}
				});
		  })
		  
			npm.on("log", function (message) { npmlog.push(message); });
		
		})
		
		
	});
	
};

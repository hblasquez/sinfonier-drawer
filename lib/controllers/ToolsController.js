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

var errors = require('../utils/errors');


exports.expressRoutes = function(app) {

	// Get module collection
	function get_module_collection(req, res, next) {
		app.db.collection('modules', function(error, module_collection) {
			if(error) { throw error; }
			else {
				req.module_collection = module_collection;
				next();
			}
		});
	}

  // Get module by name
  function get_module( req, res, next) {
      req.module_collection.findOne({ name: req.body.name },
          function(error, module) {
            if(error) { throw error; }
            req.module = module;
            next();
      });
  }

  // Check if module exists
  function checkExistsmodule(req, res, next) {

    req.module_collection.findOne( {name: req.body.name}, function(error, module) {
      if(error) { throw error; }

      if(!module) {
        errors.addError(req,req.body.name,"module not found!");
      }
      next();
    });
  }

  // Add a module to user tools. Only published modules or user modules can be added.
  app.post('/tools.json', app.require_login, get_module_collection,get_module,function(req, res){

      var moduleName = req.body.name;
      var module = req.module;
      if(!module) {
        return res.status(404).json(errors.getErrors(req));
      }
      if ( !(module.user_id.equals(req.current_user._id) || req.module.status == 'published') )
      {
        return res.status(403).json({param:"name",msg:"Forbidden!"});
      }
      if (  req.module.status == 'deleted' )
      {
        return res.status(403).json({param:"name",msg:"Module is deleted!"});
      }

    req.current_user.addTool(moduleName,function(err){
        if (err) {throw err};
        res.send(201);
      });

  });

  // Remove a module from user tools
  app.delete('/tools/:name.json',app.require_login, function(req, res){
    req.current_user.removeTool(req.param('name'),function(error) {
      if(error) { throw error; }
      res.send(200);
    });
  });

};
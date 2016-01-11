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

 var config = require('konphyg')(process.cwd()+"/config");
var validator = require('validator');
var htmlStr = require('html-strings');
var email = require('../utils/email');
var errors = require('../utils/errors');
var util = require('../utils/util');
var twitter = require('../utils/twitter');
var xmlStorm = require('../xmlstorm');
var fs = require('fs-extra');
var async = require('async');
var easyimg = require('easyimage');
var hat = require('hat');
var restler = require('restler');



exports.expressRoutes = function(app) {

	// Get modules collection
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
    var query = {name: req.param('name')};
    if (!req.current_user.isAdmin())
    {
      query.user_id = req.current_user._id;
    }

    req.module_collection.findOne(query, function(error, module) {
        if(error) { throw error; }
        req.module = new Module(module);
        next();
    });
  }


  // Check if Module exists
  function checkExistsmodule(req, res, next) {
    var query = {name: req.params.name};
    if (!req.current_user.isAdmin())
    {
      query.user_id = req.current_user._id;
    }

    app.db.collection('modules').findOne(query, function(error, module) {
        if(error) { throw error; }

        if(!module) {
            errors.addError(req,req.params.name,"Module not found !");
        }

        req.module = new Module(module);
        next();
    });
  }

  // Get Module by name 
  function getOtherModule(req, res, next) {
    var query = {name: req.params.name};
    req.module_collection.findOne(query, function(error, module) {
      if(error) { throw error; }

      if(!module) {
        errors.addError(req,req.params.name,"Module  not found !");
      }

      req.module = new Module(module);
      next();
    });
  }

  // Check module doesn't exists. Modules in Sinfonier are unique
  function checkUniquemodule(req, res, next) {

      req.module_collection.findOne( {name: req.body.name}, function(error, module) {
          if(error) { throw error; }

          if(module) {
              errors.addError(req,req.body.name,"module already exists !");
          }
          next();
      });
  }

  // Validate Gist URL is an URL
  function validateModuleSource(req, res, next) {

    if (req.param('sourceType') === 'Gist') {
      req.assert('codeURL', 'required').notEmpty();
      req.assert('codeURL', 'must be an URL').isURL();
    }
    next();
  }

  // Check module create form
  function validatemodule(req, res, next) {

      req.assert('name', 'required').notEmpty();
      req.assert('type', 'required').notEmpty();
      req.assert('sourceType', 'required').notEmpty();
      if (req.param('sourceType') && !req.current_user.allowedSourceType(req.param('sourceType')))
      {
        errors.addError(req,"sourceType","not allowed");
      }
      req.assert('description', 'required').notEmpty();
      req.assert('entity', 'required').notEmpty();
      req.assert('language', 'required').notEmpty();
      //req.assert(['field', 'name'], 'required').notEmpty();

      var field = req.body.field;
      if (field)
      {
          var names = field.name;
          if (Array.isArray(names))
          {
              for (var i=0;i< names.length;i++)
              {
                  if (validator.trim(names[i]) === "") {
                    errors.addError(req, "field[name]", "Required", i);
                  }
              }
          } else {
              if (validator.trim(names) === "") {
                errors.addError(req, "field[name]", "Required", 0);
              }
          }
      }

      var library = req.body.library;
      if (library)
      {
          var names = library["name"];
          var urls = library["url"];
          if (Array.isArray(names))
          {
              for (var i=0;i< names.length;i++)
              {
                  if (validator.trim(names[i]) === "") {
                      errors.addError(req,"library[name]","Required",i);
                  }
                  if (validator.trim(urls[i]) === "") {
                    errors.addError(req, "library[url]", "Required", i);
                  } else {
                      if (!validator.isURL(urls[i])) {
                        errors.addError(req, "library[url]", "Must be a valid URL", i);
                      }
                  }
              }
          }
          else
          {
              if (validator.trim(names) === "") {
                errors.addError(req, "library[name]", "Required", 0);
              }
              if (validator.trim(urls) === "") {
                errors.addError(req, "library[url]", "Required", 0);
              }
              else
              {
                  if (!validator.isURL(urls)) {
                    errors.addError(req, "library[url]", "must be a valid URL", 0);
                  }
              }
          }
      }
      next();
  }

  // store the module collection into req.modules_collection
  function buildmodule(req, res, next) {

      var params = req.body;
      var type = validator.escape(params["type"]);
      var sourceType = validator.escape(params["sourceType"]);
      var sourceCode = params["sourceCode"];
       var category = util.capitalize(type+"s");
      var name = params.name;
      var language = params.language;
      var abstractionId = Module.getAbstractionId(name);
      var clazz = Module.getClassName(name,type);
      var description = Module.escapeDescription(params["description"]);
      var icon = "/images/icons/"+type+"-user.png";
      var module = Module.modelize({
          "name": name,
          "category": category,
          "entity": validator.escape(params["entity"]),
          "language": validator.escape(params["language"]),
          "sourceType":sourceType,
          "sourceCode":sourceCode,
          "status": 'developing',
          "container": {
              "type": type,
              "icon": icon,
              "xtype": "WireIt.FormContainer",
              "title": name,
              "attributes": {"abstractionId":abstractionId,"class":clazz},
              "codeURL": validator.escape(params["codeURL"] || ''),
              "description": description,
              "libraries": [],
              "fields": [],
              "terminals": []
          }
      });

      module.singleton = !params["parallel"];
      module.createDefaultTerminals();
      Module.fillProperties(req.body.field,module.container.fields,["name","type","label","wirable","required","elementType"],["string","string","string","boolean","boolean","string"]);
      module.container.fields.forEach(function(field) {
        if (field.type === 'list') {
          field.wirable = false;
          if (field.elementType ) {
            if ( field.elementType === 'keyValueDefault') {
              field.elementType = {
                name: 'keyValueDefault',
                type: 'combine',
                fields: [
                  {type: 'string', "name": "key", "typeInvite": "Key"},
                  { type: 'string', "name": "value", "typeInvite": "Value"},
                  { type: 'string', "name": "default", "typeInvite": "Default"}
                ],
                separators: [false, false, false]
              };
            }else if ( field.elementType === 'keyValue') {
              field.elementType = {
                name: 'keyValue',
                type: 'combine',
                fields: [
                  {type: 'string', "name": "key", "typeInvite": "Key"},
                  { type: 'string', "name": "value", "typeInvite": "Value"}
                ],
                separators: [false, false, false]
              };
            } else if ( field.elementType === 'fieldOther') {
            field.elementType = {
              name: 'fieldOther',
              type: 'combine',
              fields: [
                {type: 'string', "name": "field", "typeInvite": "Field"},
                { type: 'string', "name": "other", "typeInvite": "Field"}
              ],
              separators: [false, false, false]
            };
          } else {
              delete field.elementType;
            }
          }
        }
        else {
          delete field.elementType;
        }

      });
      Module.fillProperties(req.body.library,module.container.libraries,["name","url"]);
      //module.container.fields.push({ "type": "number", "name": "parallelism", "wirable": false, label: "parallelism"});
      module.adjustTerminalPositions();
      req.module = module;
      next();
  }


  // store the module collection into req.modules_collection
  function mergemodule(req, res, next) {

    var params = req.body;
    if (!req.module) {
      errors.addError(req, req.body.name, "module not found !");
      req.module = {container: {}};
    }

    var module = req.module;
    var type = module.container.type || validator.escape(params["type"]);
    var name = params.name;
    var abstractionId = Module.getAbstractionId(name);
    var clazz = Module.getClassName(name, type);
    var description = Module.escapeDescription(params["description"]);

    if (req.current_user.sourceType === 'All' && params.sourceType)
    {
      module.sourceType = validator.escape(params.sourceType);
    }
    if (req.current_user.isAdmin() && params["status"]) {
      module.status = validator.escape(params["status"]);
    }
    else if (params["status"]) {
      if (module.status != params["status"]) {
        var statusList = ['published', 'private'];
        var currentStatus = validator.escape(params["status"]);
        if ((statusList.indexOf(module.status) >= 0) && (statusList.indexOf(currentStatus) >= 0)) {
          module.status = currentStatus;
        }
        else {
          errors.addError(req, req.body.status, " transition not alowed !");
        }
      }
    }

    module.singleton = !params["parallel"];

    module.entity = validator.escape(params["entity"]);
    module.language = validator.escape(params["language"]);
    var container = module.container;
    container.attributes = {"abstractionId":abstractionId,"class":clazz};
    container.codeURL = validator.escape(params["codeURL"]);
    container.description = description;


    container.fields = [];
    container.libraries = [];
    Module.fillProperties(req.body.field,container.fields,["name","type","label","wirable","required","elementType"],["string","string","string","boolean","boolean","string"]);
    module.container.fields.forEach(function(field){
      if (field.type === 'list') {
        field.wirable = false;
        if (field.elementType ) {
          if ( field.elementType === 'keyValueDefault') {
            field.elementType = {
              name: 'keyValueDefault',
              type: 'combine',
              fields: [
                {type: 'string', "name": "key", "typeInvite": "Key"},
                { type: 'string', "name": "value", "typeInvite": "Value"},
                { type: 'string', "name": "default", "typeInvite": "Default"}
              ],
              separators: [false, false, false]
            };
          }else if ( field.elementType === 'keyValue') {
            field.elementType = {
              name: 'keyValue',
              type: 'combine',
              fields: [
                {type: 'string', "name": "key", "typeInvite": "Key"},
                { type: 'string', "name": "value", "typeInvite": "Value"}
              ],
              separators: [false, false, false]
            };
          }  else if ( field.elementType === 'fieldOther') {
            field.elementType = {
              name: 'fieldOther',
              type: 'combine',
              fields: [
                {type: 'string', "name": "field", "typeInvite": "Field"},
                { type: 'string', "name": "other", "typeInvite": "Field"}
              ],
              separators: [false, false, false]
            };
          } else {
            delete field.elementType;
          }
        }
      }
      else {
        delete field.elementType;
      }
    });
    Module.fillProperties(req.body.library,module.container.libraries,["name","url"]);
    //module.container.fields.push({ "type": "number", "name": "parallelism", "wirable": false, label: "parallelism"});
    module.adjustTerminalPositions();
    next();
  }

  // store the module collection into req.modules_collection
  function setModuleIcon(req, res, next) {

    var params = req.body;
    if (!req.module) {
      errors.addError(req, req.body.name, "module not found !");
      req.module = {container: {}};
      return next();
    }

    var module = req.module;
    var tgtDir = process.cwd()+'/public/upload/modules/'+module.name;
    if (req.body.deleteIcon)
    {
      delete module.container.brandIcon;
      util.deleteAllFilesInDir(tgtDir);
      return next();
    }

    if (req.files && req.files.icon && req.files.icon.name ) {
      var src = req.files.icon.path;
      util.deleteAllFilesInDir(tgtDir);
      var tgtBase = hat(32,16);
      var tgt = tgtBase;
      var originalName = req.files.icon.name;
      var ext = originalName.lastIndexOf(".");
      if (ext >= 0 && ext < originalName.length -1)
      {
        tgt = tgt+ originalName.substring(ext,originalName.length);
      }

      tgt = tgtDir+"/"+tgt;
      fs.ensureDirSync(tgtDir);

      fs.move(src,tgt,function(error){
        if (error) {
          console.log(error);
          return next();
        }
        var iconName = tgtBase+"_75x75.png";
        var brandIcon = '/upload/modules/'+module.name+'/'+iconName;
        easyimg.rescrop({
          src: tgt, dst: tgtDir+'/'+iconName,
          width: 75, height: 75,
          fill:false
        }).then(
            function (image) {
              console.log('Resized and cropped: ' + image.width + ' x ' + image.height);
              module.container.brandIcon = brandIcon;
              next();
            },
            function (err) {
              console.log(err);
              next();
            }
        );
      });
    }
    else
    {
      next();
    }

  }


  // List Top Module. Only include Published modules
  app.get('/topmodules', app.require_login, get_module_collection, function(req, res){

    var query = {status:'published'};
    if( req.param("q") ) {
      query.name = new RegExp( req.param("q") , "i");
    }
    var search = { $query : query, $orderby : {rating: -1, name:1} };
    var numElems = config("sinfonier").modules.topElements;
    req.module_collection.find(search,{limit: numElems}, function(error, cursor) {
      if(error) { throw error; }

      cursor.toArray(function(err, results) {
        results.forEach(function ( module) {
          module.isTool = req.current_user.isTool(module);
        });
        res.render('modules/topmodules', {
          locals: {
            title:      "modules",
            action:     "modules",
            q:          req.param("q") || '',
            modules:    results
          }
        });
     });
    });
  });

  // List just user modules
  app.get('/mymodules', app.require_login, get_module_collection, function(req, res){

    var query = {user_id: req.current_user._id, status:{$ne:'deleted'}};
    var page = req.param("page") || 1;
    var pageSize = req.param("pagesize") || 9;
    var search = { $query : query, $orderby : {updated_at: -1} };

    req.module_collection.find(search,{skip:(pageSize*(page-1)),limit:pageSize}, function(error, cursor) {
      if(error) { throw error; }

      cursor.toArray(function(err, results) {
        results.forEach(function ( module) {
          module.isTool = req.current_user.isTool(module);
        });

        req.module_collection.count(query, function(error, total) {
          if(error) { throw error; }
          res.render('modules/mymodules', {
            locals: {
              title:      "modules",
              action:     "modules",
              modules:    results,
              page:       page,
              pageSize:   pageSize,
              total:      total
            }
          });
        });
      });
    });
  });


    // List all modules. Admins see all modules. Devs and users only Published and theirs
	app.get('/modules', app.require_login, get_module_collection, function(req, res){

    var query = {status: {$in: ['published','predefined']}};
    if (req.current_user.isAdmin())
    {
      query = req.param("showdeleted") ? {} : {status:{$ne:'deleted'}};
    }
    if( req.param("q") && req.param("q").length > 0 ) {
        query.name = new RegExp( req.param("q") , "i");
    }
    if( req.param("owner") && req.param("owner").length > 0) {
      query["author.name"] = new RegExp( req.param("owner") , "i");
    }

    var status = req.param("status");
    if (req.current_user.isAdmin() && status && status.length > 0)
    {
      query["status"] = status;
    }

    if( req.current_user.isAdmin() && req.param("inapropiated") ) {
      query.reports = {$exists: true};
      var informer = req.param("informer");
      if (informer && informer.length > 0)
      {
        query["reports.user_name"] = new RegExp( informer , "i");
      }
      var datefrom = req.param("datefrom");
      if (datefrom && datefrom.length > 0)
      {
        query["reports.created_at"] = { $gt : new Date(datefrom) };
      }
    }
    console.log(JSON.stringify(query));
    var page = req.param("page") || 1;
    var pageSize = req.param("pagesize") || 9;
    var search = { $query : query, $orderby : {updated_at: -1} };

		req.module_collection.find(search,{skip:(pageSize*(page-1)),limit:pageSize}, function(error, cursor) {
      if(error) { throw error; }

      cursor.toArray(function(err, results) {
        results.forEach(function ( module) {
          module.isTool = req.current_user.isTool(module);
      });

      req.module_collection.count(query, function(error, total) {
          if(error) { throw error; }
          res.render('modules/index', {
            locals: {
              title:      "modules",
              action:     "modules",
              modules:    results,
              q:          req.param("q") || '',
              owner:      req.param("owner")|| '',
              state:   req.param("status") || '',
              inapropiated: req.param("inapropiated") || '',
              showdeleted: req.param("showdeleted") || '',
              informer:   req.param("informer") || '',
              datefrom:   req.param("datefrom") || '',
              sortby:     req.param("sortby") || '',
              desc:       req.param("desc") || '',
              page:       page,
              pageSize:   pageSize,
              total:      total
            }
            });
        });
      });
		});
	});
  // New module form
  app.get('/modules/new', app.require_login, get_module_collection, function(req, res){

      res.render('modules/new', {
          locals: {
              title: "modules",
              action: "new",
              module: {},
              errors: []
          }
      });
  });

  // Edit module form
  app.get('/modules/:name/edit', app.require_login, function(req, res){
      app.db.collection('modules').findOne({ name : req.param('name') }, function(error, module) {
          if(error) { throw error; }
          if (!req.current_user.isOwner(module))
          {
            return res.render('403', { status: 403, locals: {	title: 'Unauthorized', action: 'error' }});
          }
          module["_id"] = module["_id"].toHexString();
          res.render('modules/edit', {
              locals: {
                  title: "modules",
                  action: "edit",
                  module: module,
                  ident: req.params.name,
                  errors: []
              }
          });
      });
  });

  // Show module
  app.get('/modules/:name.json', app.require_login, get_module_collection, function(req, res){
    Module.findByName ( req.param('name') , function(error, module) {
      if(error) { throw error; }
      if (module)
      {
        if (!(req.current_user.isOwner(module) || req.current_user.isAdmin() || module.status === "published"))
        {
          return res.status(403).json( {result:"error",message: 'Not allowed to inspect module'});
        }

        return res.json(module);

      }
      else
      {
        return res.status(404).json({	result:"error",message: 'NotFound'});
      }
    });
  });

  // Show module
	app.get('/modules/:name', app.require_login, get_module_collection, function(req, res){
    Module.findByName ( req.param('name'), function(error, module) {
			if(error) { throw error; }
        if (module)
        {
            module.isTool = req.current_user.isTool(module);
            res.render('modules/show', {
               locals: {
                    title: "modules",
                    action: "modules",
                    module: module
                 }
            });
        }
        else
        {
            res.render('404', { status: 404, locals: {	title: 'NotFound', action: 'error' }});
        }
		});
	});



  // Update module
  app.put('/modules/:name', app.require_login, get_module_collection,validatemodule, validateModuleSource,checkExistsmodule,mergemodule,setModuleIcon, function(req, res){
    var module = req.module;
    var user = req.current_user;
    if (!req.current_user.isOwner(module))
    {
      return res.render('403', { status: 403, locals: {	title: 'Unauthorized', action: 'error' }});
    }

    var errors = req.validationErrors();
    if (errors) {
        res.render('modules/edit', {
            locals: {
                title: "modules",
                action: "edit",
                module: module,
                ident: req.params.name,
                errors: errors
            }
        });
        return;
    }

    module.updated_at = new Date();
    var notifyPublication = false;
    var tweetModule = false;
    if (module.status === 'published' && !module.published)
    {
      module.published = true;
      notifyPublication = true;
    }
    if (module.status === 'published' && !module.twitted) {
      module.twitted = true;
      tweetModule = true;
    }


    req.module_collection.save(module, {safe:true},function(error, result) {
      if(error) { throw error; }

      async.parallel([
        function(cb){
          if (tweetModule) {
            var detailUrl = util.rootUrl(req)+"modules/"+module.name;
            var message = "The new module "+module.name+" is now available in #Sinfonier: "+detailUrl;
            if (user.isOwner(module) && user.twitter )
            {
              message = util.twitterReference(user.twitter)+" has published the new module "+user.name+": "+detailUrl;
            }
            twitter.sendTuit(message, cb);
          } else {
            cb();
          }
        },
        function(cb)
        {
          cb();
        },
        function (cb)
        {
          User.getById(module.user_id,function(err,user){
            if(err) { cb (err); }
            user.recalculateModules(function(error) {
              if(error) { cb(error); }
              notifyAffectedByModuleChange(module,'modified',req,cb);
            });
          });
        }
      ],
      function(err, results) {
        if(err) { throw err; }
        res.redirect('/modules/'+module.name);
      });

    });

  });



  // Create module
  app.post('/modules', app.require_login, get_module_collection,validatemodule,checkUniquemodule,buildmodule,setModuleIcon, function(req, res){

    var module = req.module;

    module.user_id = req.current_user._id;

    var d = new Date();
    module.created_at = d;
    module.updated_at = d;

    module.author = {
        name: req.current_user.name,
        email: req.current_user.email
    };

    if (req.body.name)
    {
      var reCamelCase = /^(([A-Z]+[a-z0-9]*)+)$/;
      if (!reCamelCase.test(req.body.name))
      {
        errors.addError(req,"name","Invalid name format. Must be UpperCamelCase");
      }
      if (config('sinfonier').modules.invalidNames.indexOf(req.body.name) >= 0 ||
          xmlStorm.names.indexOf(req.body.name) >= 0 )
      {
        errors.addError(req,"name","Name reserved in sinfonier");
      }
    }

    var validationErrors = req.validationErrors();
    if (validationErrors) {
        return res.render('modules/new', {
            locals: {
                title: "modules",
                action: "create",
                module: module,
                errors: validationErrors
            }
        });

    }

    req.module_collection.insert(module, function(error, docs) {
      if(error) { throw error; }
      req.current_user.incModuleCounter(function(error) {
        if(error) { throw error; }
        req.current_user.addTool(module.name,function(err){
          if (err) {throw err; }
          Version.createEpsilon(module,function(error){
            if(error) { throw error; }
            return res.redirect('/modules/'+module.name);
          });
        });
      });
    });

  });


  function modifyNameAffectedByModuleChange(oldname,newname,cb)
  {
    //Send mail to every user with module in tools
    User.updateToolName(oldname, newname, function (error)
    {
      if (error){throw error;}
      //Send mail to every user with module in topologies
      app.db.collection('topologies', function(err, collection) {
        if(err) {throw error; }

        collection.update({"config.modules":{ $elemMatch :{ name: oldname } }  },{"$set" : {"config.modules.$.name" : newname}},{multi:true},cb);

      });
    });

  }

  function notifyAffectedByModuleChange(module,action,req,cb)
  {
    var tooledFunc =  function(callback) {
      //Send mail to every user with module in tools
      User.findWithTool(module.name, function (error, users) {
        if (error) {
          return callback(error);
        }
        var detailUrl = util.rootUrl(req) + "modules/" + module.name;
        var text = "Module " + module.name + " has been " + action + ", and you have it in your tools: " + detailUrl + "\n";
        var html = "Module <a href='" + detailUrl + "'>" + module.name + "</a> has been " + action + ", and you have it in your tools<br>";
        var fullText = text;
        if (action === 'deleted') {
          fullText = "We regret to inform you that the module <MODULE> has been deleted, therefore this module is not going to be available at your \"my tools\" list anymore. " +
              "However, you can still using it until the moment you erase it from your topologies.\n\n" +
              "Faithfully,\n" +
              "Sinfonier Bot.";
          fullText = fullText.replace("<MODULE>", module.name);
          text = fullText;
          html = fullText.replace(/\n/g, "<br>");
        }
        var arrFunctions = [];
        users.forEach(function (user) {
          var finalText = "Dear " + user.name + ",\n\n" + fullText;
          var finalHtml = html;
          arrFunctions.push((function () {
            return function (callback) {
              Notification.send(user.email, "Sinfonier. Module " + module.name + " has been " + action, finalText, finalHtml, {name: user.name, type: 'Module ' + action}, callback);
            };
          })());
        });
        async.parallel(arrFunctions,callback);
      });
    }
    var topologiesFunc =  function(callback)
    {
      //Send mail to every user with module in topologies
      app.db.collection('topologies').find({"config.modules":{
                                $elemMatch :{ name: module.name }
                                }
                      } , function (error, cursor) {
        if (error){return callback(error);}
        var detailUrl = util.rootUrl(req)+"modules/"+module.name;
        var text = "Module "+module.name+" has been "+action+", and you have it in your topologies: "+detailUrl +"\n";
        var html = "Module <a href='"+detailUrl+"'>"+module.name+"</a> has been "+action+", and you have it in your topologies<br>";
        var fullText = text;
        if (action === 'deleted')
        {
          fullText = "We regret to inform you that the module <MODULE> has been deleted, and you have it in your topologies. " +
              "However, you can still using it until the moment you erase it from your topologies.\n\n" +
              "Faithfully,\n" +
              "Sinfonier Bot.";
          fullText = fullText.replace("<MODULE>", module.name);
          html = fullText.replace(/\n/g,"<br>");
        }
        cursor.toArray(function(error, results) {
          var ids = [];
          results.forEach(function (topology){ids.push(topology.user_id);});

          User.findAll(ids, function (error, cursor){
            if (error){return callback(error);}
            cursor.toArray(function(error,users){
              if (error){return callback(error);}
              var arrFunctions = [];
              users.forEach(function(user){
                var finalText =  "Dear "+user.name+",\n\n"+fullText;
                var finalHtml = html;
                arrFunctions.push((function () {
                  return function (callback) {
                    Notification.send(user.email,"Sinfonier. Module "+module.name+" has been "+action,finalText,finalHtml,{name:user.name, type:'Module '+action}, callback);
                  };
                })());
              });
              async.parallel(arrFunctions,callback);
            });
          });
        });
      });
    }

    async.parallel([tooledFunc,topologiesFunc],cb);
  }

  function notifyAffectedByModuleReported(module,report,req,cb)
  {

    var detailUrl = util.rootUrl(req)+"modules/"+module.name;
    var text = "Module "+module.name+" has been has been reported as inapropiated: "+detailUrl +"\n";
    var html = "Module <a href='"+detailUrl+"'>"+module.name+"</a> has been reported as inapropiated<br>";
    html = html + "Usuario: "+report.user_name+"<br>";
    html = html + "At: "+report.updated_at+"<br>";
    html = html + "Message: "+report.message+"<br>";
    html = html + "Total reported: "+module.reports.length+" times<br>";
    var ownerFunc = function(callback) {
      User.getById(module.user_id,function(err,user) {
        if (err) { return callback(err); }
        if (user) {
          Notification.send(user.email, "Sinfonier. Module " + module.name + " has been reported as inapropiated", text, html, { type: 'Inapropiated'},callback);
        }
        else
        {
          callback();
        }
      });
    };
    var newhtml = html;
    var newtext = text;
    if (module.reports.length >= 3)
    {
      newhtml = "more than 2 times!<br>" + newhtml;
      newtext = newtext + " more than 2 times!\n";
    }

    var adminsFunc = function(callback) {
      User.findAdmins(function (error, users) {
        if (error) {
          return callback(error);
        }
        var arrFunctions = [];
        users.forEach(function (user) {
          arrFunctions.push((function () {
            return function (callback) {
              Notification.send(user.email, "Sinfonier. Module " + module.name + " has been reported as inapropiated", newtext, newhtml, { type: 'Inapropiated'}, callback);
            };
          })());
        });
        async.parallel(arrFunctions,callback);
      });
    }
    async.parallel([ownerFunc,adminsFunc],cb);

  }


  // Delete a module
  app.delete('/modules/:name.json',app.require_login, get_module_collection,get_module, function(req, res){
    req.module_collection.update({_id: req.module._id}, {$set: {status:"deleted"}}, function(error){
      if(error) { throw error; }
      var module = req.module;
      User.getById(module.user_id,function(err,user){
        if(err) { throw err; }
        user.decModuleCounter(function(error) {
          if(error) { throw error; }
          notifyAffectedByModuleChange(module,'deleted',req,function(){
            res.send(200);
          });
        });
      });
    });
  });



  // Report module unsuitable
  app.post('/modules/:name/report.json', app.require_login, get_module_collection,getOtherModule, function(req, res){
    var module = req.module;

    if (module.status === 'predefined')
    {
      return res.status(403).json({error:'Not allowed to report preloaded modules'});
    }
    if (req.current_user.isOwner(module))
    {
      return res.status(403).json({error:'Not allowed to report your own modules'});
    }

    var validationErrors = req.validationErrors();
    if (validationErrors) {
      return res.status(404).json({error:'Not found!'});
    }
    var msg = req.param("message");
    if (!msg || msg.length <10)
    {
      return res.status(422).json({error:'Message too short!'});
    }

    msg = htmlStr.escape(msg);

    if (!module.reports)
    {
      module.reports = [];
    }
    var d = new Date();
    var report = null;
    var code = 201;
    if (!report)
    {
      report = {};
      report.created_at = d;
      module.reports.push(report)
    }

    report.user_id = req.current_user._id;
    report.user_name = req.current_user.name;
    report.message = msg;
    report.updated_at = d;


    req.module_collection.save(module, {safe:true},function(error, result) {
      if(error) { throw error; }
      notifyAffectedByModuleReported(module,report,req,function(){
        res.json( report );
      });
    });

  });

  // Rate module
  app.post('/modules/:name/rate.json', app.require_login, get_module_collection,getOtherModule, function(req, res){
    var module = Module.modelize(req.module);

    if (req.current_user.isOwner(module))
    {
      return res.status(403).json({error:'Not allowed to vote your own modules'});
    }
    var validationErrors = req.validationErrors();
    if (validationErrors) {
      return res.status(404).json({error:'Not found!'});
    }
    var value = parseInt(req.param("value") || "1");
    if (value < 1 || value >5)
    {
      return res.status(422).json({error:'Invalid value!'});
    }

    var msg = req.param("message") || '';


    module.vote( {
      user: req.current_user,
      msg: msg,
      value:value
    }, function (error, rate) {
      if(error) { throw error; }
      User.getById(module.user_id,function(err,user){
        if(err) { throw err; }
        if (user) {
          user.recalculateRate(function (error) {
            if (error) { throw error; }
            res.json({rating: module.rating, rate: rate});
          });
        }
        else
        {
          res.json({rating: module.rating, rate: rate});
        }
      });
    });

  });

  var askForSourceValidation = function (req,res,type)
  {
    var module = req.module;
    module.updated_at = new Date();
    module.status = 'pending';
    if (!req.current_user.isOwner(module)) {
      return res.status(403).json({result: 'error', description: 'Not Owner'});
    }
    if (module.sourceType === 'Gist' && ( module.container.codeURL === '' || !validator.isURL(module.container.codeURL) )) {
      return res.status(422).json({result: 'error', description: 'Code URL is mandatory'});
    }

    var theModule = Module.modelize(module);
    theModule.compile(function(compilationResult){
      if (compilationResult.result === "error" )
      {
        return res.status(422).json( compilationResult );
      }
      if (compilationResult.result === "warning" && !req.body.ignoreWarnings )
      {
        return res.json( compilationResult );
      }
      theModule.compiled = true;
      theModule.save(function(error, result) {
        if(error) { throw error; }
        async.parallel(
            [
              function (callback) {
                Notification.sendSourceChangeNotifications(req,module,type,callback);
              },
              function (callback) {
                Version.createCommit(module, callback);
              }
            ]
            , function (err, results) {
              if (err) {
                throw err;
              }
              res.json({result: "ok", description: "Source changed"});
            }
        );
      });
    });
  };
  // Notify source change
  app.post('/modules/:name/sourcechange.json', app.require_login, checkExistsmodule, function(req, res){
    return askForSourceValidation(req,res,'sourcechange');
  });

  // Notify source change
  app.post('/modules/:name/requestvalidation.json', app.require_login, checkExistsmodule, function(req, res){
    return askForSourceValidation(req,res,'requestvalidation');
  });

  // Notify source change
  app.post('/modules/:name/compile.json', app.require_login, checkExistsmodule, function(req, res){
    var module = req.module;
    if (!req.current_user.isOwner(module)) {
      return res.status(403).json({result:'error',description:'Not Owner'});
    }
    if (module.sourceType === 'Gist' && (module.container.codeURL === '' || !validator.isURL(module.container.codeURL))) {
      return res.status(422).json({result: 'error', description: 'Code URL is mandatory'});
    }

    var theModule = Module.modelize(module);
    theModule.compile(function(compilationResult){
      if (compilationResult.result === "error" ) {
        return res.status(422).json(compilationResult );
      }
      if (compilationResult.result === "warning" && !req.body.ignoreWarnings ) {
        return res.json( compilationResult );
      }
      theModule.markCompiled(function(error, result) {
        if(error) { throw error; }
        res.json( {result:'ok',description:'Module compiled'} );
      });
    });
  });

  // Approve module. Just Admins and module owner with dev role can approve a module.
  app.patch('/modules/:name/approvesource.json', app.require_login, get_module_collection,checkExistsmodule, function(req, res){
    var module = req.module;

    if (!(req.current_user.isAdmin()  || (req.current_user.isDev() && req.current_user.isOwner(module))))
    {
      return res.status(403).json({result:'error',description:'Not Allowed'});
    }
    var d = new Date();
    module.updated_at = d;
    module.status = 'private';
    var theModule = new Module(module);
    theModule.load(function(result){
      if (result && result.result === 'error')
      {
        return res.status(422).json( result );
      }
      module.loaded = true;
      req.module_collection.save(module, {safe:true},function(error, count) {
        if(error) { throw error; }
        res.json( result );
      });
    });


  });


  // deny module
  app.get('/modules/:name/denysource', app.require_login, get_module_collection,checkExistsmodule, function(req, res){
    var module = req.module;

    if (!(req.current_user.isAdmin()  || (req.current_user.isDev() && req.current_user.isOwner(module))))
    {
      return res.status(403).json({result:'error',description:'Not Allowed'});
    }

    var d = new Date();
    module.updated_at = d;
    module.status = 'developing';
    req.module_collection.save(module, {safe:true},function(error) {
      if(error) { throw error; }
      res.redirect('/modules/'+module.name);
    });

  });

  // Change module status
  app.patch('/modules/:name/changeStatus.json', app.require_login, function(req, res){
    Module.findByName(req.params.name, function(error,module){
      if(error) { throw error; }
      if (!module)
      {
        return res.status(404).json({error:'Not Found'});
      }
      var status = req.body.status;
      var reason = req.body.reason;
      module.changeStatus(req.current_user,status,reason,function(error){
        if(error) { throw error; }
        res.json({result:"ok"});
      });
    })
  });

  app.post('/modules/:id/loadmodule.json', app.require_login, get_module_collection, get_module, function(req, res){
    var module = new Module(req.module);

    module.load(function(result){
      res.json( result );
    });
  });

  app.post('/modules/loadpredefined', app.require_admin, function(req, res){
    Module.loadExternalModules(function()
    {
      res.redirect('/modules');
    });

  });
  app.post('/modules/deletepredefined', app.require_admin, function(req, res){
    Module.deleteExternalModules(function()
    {
      res.redirect('/modules');
    });

  });

  // Module code history
  app.get('/modules/:name/history', app.require_login, function(req, res){
    Module.findByName( req.param('name'), function(error, module) {
      if(error) { throw error; }
      if (!(req.current_user.isOwner(module) || req.current_user.isAdmin()))
      {
        return res.render('403', { status: 403, locals: {	title: 'Unauthorized', action: 'error' }});
      }
      module.getRevisionsInfo(function(error,revisions){
        if(error) { throw error; }
        res.render('modules/history', {
          locals: {
            title: "modules",
            action: "edit",
            module: module,
            revisions: revisions,
            ident: req.params.name,
            errors: []
          }
        });
      });
    });
  });

};
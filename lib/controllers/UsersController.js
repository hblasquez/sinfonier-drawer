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

var validator = require('validator');
var errors = require('../utils/errors');
var hat = require('hat');
var email = require('../utils/email');
var util = require('../utils/util');
var config = require('konphyg')(process.cwd()+"/config");

exports.expressRoutes = function(app) {

// User model
  var User = require(app.root + '/lib/models/User').init(app.db);


  // store the user collection into req.user_collection
	function get_user_collection(req, res, next) {
		app.db.collection('users', function(error, user_collection) {
			if(error) { throw error; }
			else {
				req.user_collection = user_collection;
				next();
			}
		});
	}

  // store the user collection into req.user_collection
  function get_module_collection(req, res, next) {
    app.db.collection('modules', function(error, module_collection) {
      if(error) { throw error; }
      else {
        req.module_collection = module_collection;
        next();
      }
    });
  }

  // store the topology collection into req.topology_collection
  function get_topology_collection(req, res, next) {
    app.db.collection('topologies', function(error, topology_collection) {
      if(error) { throw error; }
      else {
        req.topology_collection = topology_collection;
        next();
      }
    });
  }

  // store the module document into req.module
  function get_user( req, res, next) {
    req.user_collection.findOne({
      name: req.param('name')
    }, function(error, user) {
      if(error) { throw error; }
      req.user = user;
      next();
    });
  }

  // store the module document into req.module
  function get_user_by_id( req, res, next) {
    var id = ObjectID.createFromHexString(req.param('_id'));
    req.user_collection.findOne({
      _id: id
    }, function(error, user) {
      if(error) { throw error; }
      req.user = user;
      next();
    });
  }


  // store the user collection into req.user_collection
  function get_invitation_collection(req, res, next) {
    app.db.collection('invitations', function(error, invitation_collection) {
      if(error) { throw error; }
      req.invitation_collection = invitation_collection;
      next();
    });
  }

  // check unique user
  function checkUniqueUser(req, res, next) {

    req.user_collection.findOne( {name: req.body.name}, function(error, user) {
      if(error) { throw error; }

      if(user && !(user["_id"].toHexString() == req.body._id) ) {
        errors.addError(req,req.body.name,"user already exists !");
      }
      req.user_collection.findOne( {email: req.body.email}, function(error, user) {
        if(error) { throw error; }
        if(user && !(user["_id"].toHexString() == req.body._id) ) {
          errors.addError(req,req.body.name,"email already exists !");
        }
        next();
      });
    });
  }

  // store the module collection into req.modules_collection
  function validateUser(req, res, next) {

    var required = ['name','firstname','surname','organization'
      ,'email','timezone','web','status','role'];

    required.forEach(function(field){
      req.assert(field, 'required').notEmpty();
    });

    req.assert('email', 'must be an email').isEmail();
    req.assert('web', 'must be an URL').isURL();
    if (req.body.running_topologies_capacity && req.body.running_topologies_capacity.length > 0) {
      req.assert('running_topologies_capacity', 'number').isInt();
    }

    next();
  }
  // store the module collection into req.modules_collection
  function validateModifyUser(req, res, next) {

    var required = ['name','firstname','surname','organization'
      ,'email','timezone','web'];
    var requiredAdmin = ['status','role'];

    required.forEach(function(field){
      req.assert(field, 'required').notEmpty();
    });
    if (req.current_user.isAdmin())
    {
      requiredAdmin.forEach(function(field){
        req.assert(field, 'required').notEmpty();
      });
    }

    req.assert('email', 'must be an email').isEmail();
    req.assert('web', 'must be an URL').isURL();
    if (req.body.running_topologies_capacity && req.body.running_topologies_capacity.length > 0) {
      req.assert('running_topologies_capacity', 'number').isInt();
    }

    next();
  }

  // build user data
  function buildUser(req, res, next) {

    var user = {};
    var params = ['name','firstname','surname','twitter','organization'
      ,'email','timezone','web','email_visibility'];
    if (req.current_user && req.current_user.isAdmin())
    {
      user.sourceType = req.body.sourceType;
      user.status = req.body.status;
      user.role = req.body.role;
      user.parallelism = !!req.body.parallelism;
    }
    else
    {
      user.sourceType = config('sinfonier').users.default_source_type;
      user.status = 'active';
      user.role = 'user';
      user.parallelism = false;
    }
    params.forEach(function(field){ user[field] =  req.body[field]});
    user.email_visibility = !!user.email_visibility;
    user.email_notifications = !!req.body.email_notifications;
    user.running_topologies_capacity = parseInt(config('sinfonier').default_concurrent_topologies);

    user.running_topologies_capacity = 1;
    if (req.current_user && req.current_user.isAdmin() && req.body.running_topologies_capacity && req.body.running_topologies_capacity.length > 0 )
    {
      user.running_topologies_capacity = parseInt(req.body.running_topologies_capacity);
    }
    user.tools = [];
    user.login_tries = 0;
    user.status = 'active';
    req.user = user;
    next();
  }


  // store the module collection into req.modules_collection
  function mergeUser(req, res, next) {
    var user = req.user;
    var params  = ['name','firstname','surname','twitter','organization'
      ,'email','timezone','web'];
    var adminParams  = ['sourceType','status','role'];

    params.forEach(function(field){
      if (req.body[field]) {
        user[field]  =  req.body[field];
      }
    });

    user.email_visibility = !!req.body.email_visibility;

    if (req.current_user.isAdmin() )
    {
      adminParams.forEach(function(field){
        if (req.body[field]) {
          user[field]  =  req.body[field];
        }
      });
      user.parallelism = !!req.body.parallelism;
    }
    if (req.current_user.isAdmin() && req.body.running_topologies_capacity)
    {
      user.running_topologies_capacity = parseInt(req.body.running_topologies_capacity);
    }

    next();
  }

  // List users
	app.get('/users', app.require_login,  function(req, res){

    // Search
    var query = { status:{ $ne:'deleted'} };
    var status = req.param("status");
    if (status)
    {
      query = {status:status};
    }
    var q = req.param("q");
    if( q && q.length > 0 ) {
      query.$or = [
        { name: new RegExp( q , "i") },
        { firstname: new RegExp( q , "i") },
        { surname: new RegExp( q , "i") }
      ];
    }
    var role = req.param("role");
    if( role && role.length > 0 ) {
      query.role = role;
    }
    var orderby = {};
    var sortby = req.param("sortby");
    if (sortby)
    {
      if (sortby == 'blocked')
      {
        orderby.status = -1;
      }
      else
      {
        orderby[sortby] = (req.param("desc") == "1") ? -1 : 1;
      }

    }
    var page = req.param("page") || 1;
    var pageSize = req.param("pagesize") || 9;

    var search = { $query : query, $orderby : orderby };
    console.log(JSON.stringify(query));

    var fields = {name:1, firstname:1, surname:1, role:1, topologies_count:1, modules_count:1, modules_rate:1, email:1, created_at:1, email_visibility:1, status:1, latch:1,twitter:1 };

    User.getCollection().find(search,fields,{skip:(pageSize*(page-1)),limit:pageSize}).toArray(function(error, results) {
      var parsedResults = [];
      results.forEach(function (user){
        parsedResults.push(new User(user,true));
      });
      User.getCollection().count(query, function(error, total) {
        if(error) { throw error; }

        res.render('users/users', {
          locals: {
            title:    "Users",
            state:    req.param("status")|| '',
            q:        req.param("q")|| '',
            sortby:   req.param("sortby") || '',
            desc:     req.param("desc") || '',
            page:     page,
            pageSize: pageSize,
            role:     req.param("role") || '',
            action:   "users",
            users:    parsedResults,
            total:    total
          }
        });
			});
		});
	});

  // New user form
  app.get('/users/new', app.require_admin, function(req, res){

    res.render('users/new', {
      locals: {
        title: "users",
        action: "new",
        user: {},
        errors: []
      }
    });
  });
  // Show Sinfonier user
  app.get('/users/Sinfonier', function(req, res) {
    return res.redirect('/about');
  });
  // Show User
	app.get('/users/:name', app.require_login, get_user_collection,get_module_collection,get_topology_collection, function(req, res){
    req.user_collection.findOne({ name : req.param('name') }, function(error, user) {
			if(error) { throw error; }
      if (!user)
      {
        return res.redirect('404');
      }
      var fullUser = new User(user,true);
      var modulesQuery = { user_id : user._id, status:{$in:['published','developing']} }
      if (req.current_user.isAdmin() || req.current_user.equals(user))
      {
        modulesQuery.status = {$ne:'deleted'}
      }
      req.module_collection.find(modulesQuery, function(error, cursor) {
        if(error) { throw error; }
        cursor.toArray(function(error, results) {
          fullUser.modules = results;
          var totalRated = 0;
          var sum = 0;
          for(var i=0;i<results.length;i++)
          {
            results[i]["container"]["description"] = util.parseMarkdown(results[i]["container"]["description"]);
            if (results[i].rating)
            {
              sum += results[i].rating;
              totalRated++;
            }
          }

          fullUser.rating = Math.round(sum/totalRated);

          req.topology_collection.find({  user_id : user._id , status:{$ne:'deleted'}}, function(error, cursor) {
            if(error) { throw error; }
            cursor.toArray(function(error, results) {
              fullUser.topologies = results;

              var moduleNames = [];
              var moduleMap = {};
              fullUser.modules.forEach(function(module){
                module.topologies_count = 0;
                moduleNames.push(module.name);
                moduleMap[module.name] = module;

              });
              var query = [
                {$match:{  "config.modules.name" : {$in:moduleNames}}}
                ,{$unwind: "$config.modules"}
                ,{$match:{  "config.modules.name" : {$in:moduleNames}}}
                ,{$group:{
                  _id:"$config.modules.name",
                  module_count:{$sum:1}
                }
                }
              ];
              req.topology_collection.aggregate(query,function(error,results) {
                if(error) { throw error; }

                results.forEach(function(res){
                    moduleMap[res._id].topologies_count = res.module_count;
                });
                res.render('users/show', {
                  locals: {
                    title: "Users",
                    action: "users",
                    user: fullUser
                  }
                });
              });
            });
          });
        });
      });
		});
	});


  // Edit module form
  app.get('/users/:name/edit', app.require_login, get_user_collection, function(req, res){
    req.user_collection.findOne({ name : req.param('name') }, function(error, user) {
      if(error) { throw error; }
      if (!req.current_user.isAdmin() && !req.current_user.equals(user))
      {
        return res.render('401', { status: 401, locals: {	title: 'Unauthorized', action: 'error' }});
      }
      user["_id"] = user["_id"].toHexString();
      res.render('users/edit', {
        locals: {
          title: "users",
          action: "edit",
          user: new User(user,'admin'),
          ident: req.params.name,
          errors: []
        }
      });
    });
  });


  // Update user
  app.put('/users/:name', app.require_login,get_user_collection,get_user,validateModifyUser, checkUniqueUser, mergeUser, function(req, res){
    var user = req.user;
    if (!req.current_user.isAdmin() && !req.current_user.equals(user))
    {
      return res.render('401', { status: 401, locals: {	title: 'Unauthorized', action: 'error' }});
    }

    var email_notifications =  !!req.body.email_notifications;
    var unsubscribeFromList = false;
    var subscribeToList = false;
    if (user.email_notifications && !email_notifications)
    {
      unsubscribeFromList = true;
    } else if (!user.email_notifications && email_notifications)
    {
      subscribeToList = true;
    }
    user.email_notifications = email_notifications;
    user.updated_at = new Date();

    var errors = req.validationErrors();
    if (errors) {
      res.render('users/edit', {
        locals: {
          title: "users",
          action: "edit",
          user: user,
          ident: req.params.name,
          errors: errors
        }
      });
      return;
    }
    user = User.modelize(user);

    user.save(function(error, result) {
      if(error) { throw error; }
      res.redirect('/users/'+user.name);
    });

  });



  // Create user
  app.post('/users', app.require_admin, get_user_collection,validateUser,checkUniqueUser,buildUser, function(req, res){

    var user = req.user;


    var d = new Date();
    user.password = hat();
    user.authKey = hat();
    user.created_at = d;
    user.updated_at = d;

    var errors = req.validationErrors();
    if (errors) {
      res.render('users/new', {
        locals: {
          title: "users",
          action: "create",
          user: user,
          errors: errors
        }
      });
      return;
    }

    req.user_collection.insert(user, function(error, docs) {
      if(error) { throw error; }
      var url = config('sinfonier').rootUrl+"sessions/changepass?email="+encodeURIComponent(user.email)+"&authKey="+user.authKey;
      email.sendMail(user.email,"Sinfonier. Set your password",url,"<a href='"+url+"'>choose your password</a>");
      res.redirect('/users/'+docs[0].name);
    });

  });


  // Delete an user
  app.delete('/users/:name.json',app.require_admin, get_user_collection,get_user, function(req, res){
    req.user_collection.update({_id: req.user._id},{$set: {status:"deleted"}}, function(error){
      if(error) { throw error; }
      res.send(200);
    });
  });

  // Block an user
  app.patch('/users/:name/block.json',app.require_admin, get_user_collection,get_user, function(req, res){
    req.user_collection.update({_id: req.user._id},{$set: {status:"blocked"}}, function(error){
      if(error) { throw error; }
      res.send(200);
    });
  });

  // Active an user
  app.patch('/users/:name/active.json',app.require_admin, get_user_collection,get_user, function(req, res){
    req.user_collection.update({_id: req.user._id},{$set: {status:"active",login_tries:0}}, function(error){
      if(error) { throw error; }
      res.send(200);
    });
  });


  // Register user form, with invitation
  app.get('/register', function(req, res){

    res.render('users/register', {
      locals: {
        title: "users",
        action: "register",
        user: {email: req.query.email, authKey: req.query.authKey},
        errors: []
      }
    });
  });

  // check invitation
  function checkExistingInvitation(req, res, next) {
    var authKey = req.query.authKey || req.body.authKey;
    if (!authKey) {
      next(new Error("Invitation required !"));
      return;
    }
    req.invitation_collection.findOne( {authKey: authKey, accepted:false}, function(error, invitation) {
      if(error) { throw error; }

      if(!invitation) {
        next(new Error("Invitation required !"));
        return;
      }
      req.invitation = invitation;
      next();
    });
  }


  // Register invited user
  app.post('/register',get_invitation_collection, checkExistingInvitation, get_user_collection,validateUser,checkUniqueUser,buildUser, function(req, res){

    var user = req.user;


    var d = new Date();

    var pass = req.body.pass;
    var pass2 = req.body.pass2;
    if (pass != pass2)
    {
      errors.addError(req,"","passwords must be identical");
    }
    if (pass.length < 8)
    {
      errors.addError(req,"","Password must have at least 8 characters");
    }
    user.role = 'user';
    user.status = 'active';
    user.login_tries = 0;
    user.authKey =  req.query.authKey || req.body.authKey;
    user.created_at = d;
    user.updated_at = d;

    var errorlist = req.validationErrors();
    if (errorlist) {
      res.render('users/register', {
        locals: {
          title: "users",
          action: "register",
          user: user,
          errors: errorlist
        }
      });
      return;
    }
    user.authKey = hat();

    bcrypt.genSalt (10, function(err, salt) {
      bcrypt.hash ( pass, salt, function (err, hash) {
        if (err)  {throw err;};
        user.password = hash;

        req.user_collection.insert(user, function(error, docs) {
          if(error) { throw error; }
          req.user_collection.findOne({_id: req.invitation.user_id }, function(error, admin) {
            if(error) { throw error; }

            req.invitation_collection.update({_id: req.invitation._id}, {$set: {accepted: true, invited_id: user._id}}, function(error,value){
              if(error) { throw error; }
              var url = config('sinfonier').rootUrl+"users/"+user.name;
              email.sendMail(admin.email,"Sinfonier. Invitation accepted",url,"<a href='"+url+"'>Invitation acepted by "+user.name+"</a>",{name:'administrator', type:'Invitation accepted'});
              res.redirect('/users/'+user.name);
            });
          });
        });

      });
    });


  });

};
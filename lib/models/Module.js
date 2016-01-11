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

var email = require('../utils/email');
var stormclient = require('../utils/stormclient');
var restler = require('restler');
var config = require('konphyg')(process.cwd()+"/config");
var util = require('../utils/util');
var twitter = require('../utils/twitter');
var xmlstorm = require('../xmlstorm');
var async = require('async');
var htmlStr = require('html-strings');
var extend = require('util')._extend;


exports.init = function(db) {

  var ObjectID = require('mongodb').ObjectID;
  var COL = 'modules';
  var votable = require('../concerns/Votable');

  var statusTransitionsTable = {
    pending : ["developing"],
    developing : ["pending"],
    private : ["published"],
    published: ["private"]
  };


  var Module = function(values) {
    extend(this,values);
    extend(this,votable);
  };

  Module.exportFields = {
    name: {},
    singleton: {},
    sourceCode: {},
    entity: {},
    language: {},
    sourceType: {}
  };

  Module.containerFields = {
    codeURL: {},
    description: {},
    fields: {},
    libraries: {},
    type: {}
  };

  // Get parallelism parameters value from config file
  Module.defaultParallelism = config('sinfonier').modules.parallelism;
  Module.maxParallelism = config('sinfonier').modules.maxParallelism;

  Module.modelize = function(obj){
    return obj ? new Module(obj) : obj;
  };

  Module.getCollection = function()
  {
    return db.collection(COL);
  };

  Module.findByName = function(name,cb) {
    db.collection('modules').findOne({ name: name}, function (error, module) {
      return cb(error,Module.modelize(module));
    });
  };

  Module.getDefinition = function(name,cb)
  {
    for (var i=0;i<xmlstorm.definitions.length;i++)
    {
      if (name == xmlstorm.definitions[i].name)
      {
        return cb(null,new Module(xmlstorm.definitions[i]));
      }
    }
    Module.findByName(name,cb);
  };

  Module.countTotal = function(cb)
  {
    db.collection('modules').count({status:{$ne:'deleted'}}, cb);
  };

  Module.countByUser = function(user_id,cb)
  {
    db.collection('modules').count({user_id: user_id, status:{$ne:'deleted'}}, cb);
  };

  Module.topModules = function(limit,cb)
  {
    db.collection('modules').find({$query : {status:"published"}, $orderby : {rating: -1, name:1}},{limit: limit}, function (err,cursor){
        if (err){return cb(err);}
        cursor.toArray(cb);
    });
  };

  Module.getAllGroupedByUser = function(cb) {
    var query = [
      {$match: {  "status": {$ne: 'deleted'}}}
      ,
      {$group: {
        _id: "$author.email",
        module_count: {$sum: 1}
      }
      },
      {$sort: {module_count: -1}}
    ];
    db.collection(COL).aggregate(query).toArray( cb );
  };

  Module.getPublicGroupedByUser = function(cb) {
    var query = [
      {$match: {  "status": 'published'}}
      ,
      {$group: {
        _id: "$author.email",
        module_count: {$sum: 1}
      }
      },
      {$sort: {module_count: -1}}
    ];
    db.collection(COL).aggregate(query).toArray( cb );
  };


  Module.loadExternalModules = function(cb) {
    var total = xmlstorm.definitions.length;
    var complete = function(){
      total--;
      if (total === 0)
      {
        cb();
      }
    };
    xmlstorm.definitions.forEach(function(module){
      Module.findByName(module.name, function (err, mod) {
        if (!err && !mod) {
          var storedModule = Module.modelize(module);
          storedModule.user_id = new ObjectID();
          storedModule.author = { "name": "supersinfonier", "email": "email@domain.tld" };
          if (!storedModule.entity) {
            storedModule.entity = 'unknown';
          }
          storedModule.status = 'predefined';
          storedModule.external = true;
          var d =  new Date('2014/01/01');
          storedModule.created_at = d;
          storedModule.updated_at = d;
          storedModule.language = 'Java';
          storedModule.save(function (err, mod) {
            if(err){console.log("cannot save module "+module.name)}
            complete();
          });
        }
        else
        {
          complete();
        }
      });
    });
  },

  Module.deleteExternalModules = function(cb) {
    var total = xmlstorm.definitions.length;
    var complete = function(){
      total--;
      if (total === 0)
      {
        cb();
      }
    }
    xmlstorm.definitions.forEach(function(module){
      Module.findByName(module.name, function (err, mod) {
        if (!err && mod) {
          var storedModule = Module.modelize(mod);
          storedModule.delete(function (err) {
            if(err){console.log("cannot delete module "+mod.name)}
            complete();
          });
        }
        else
        {
          complete();
        }
      });
    });
  },


  Module.topUsedByUser = function(user_id,limit,cb)
  {
    db.collection('modules', function(error, collection) {
      if (error){return cb(error);}
      collection.find({user_id: user_id, status:{$ne:'deleted'}}, function(err,cursor){
        if (err){return cb(err);}
        var names = [];
        var moduleMap = {}
        cursor.toArray(function(err, results) {
          if (err){return cb(err);}
          results.forEach(function ( module) {
            names.push(module.name);
            moduleMap[module.name] = module;
          });
          db.collection('users', function(error, collection) {
            if (err){return cb(err);}

            var query = [
              {$match:{status:{$ne:'deleted'},tools:{$in:names}}}
              ,{$unwind: "$tools"}
              ,{$match:{  "tools" : {$in:names}}}
              ,{$group:{
                    _id:"$tools",
                    module_count:{$sum:1}
                    }
               }
              ,{$sort: {module_count:-1}}
              ,{$limit:limit}
            ];
            collection.aggregate(query,function(err,results) {
              if (err){return cb(err);}
              var fullResult = [];
              results.forEach(function(module){
                moduleMap[module._id].times_used = module.module_count;
                fullResult.push(moduleMap[module._id]);
              });
              cb(null,fullResult);

            });
          });
        });
      });
    });
  }

  Module.topRatedByUser = function(user_id,limit,cb)
  {
    db.collection('modules').find({$query : {user_id: user_id, status:{$ne:'deleted'}}, $orderby : {rating: -1, name:1}},{limit: limit}, function (err,cursor){
        if (err){return cb(err);}
        cursor.toArray(cb);
     });
  };

  Module.isValidTransition = function (previous,next)
  {
    return previous == next || statusTransitionsTable[previous].indexOf(next) >= 0;
  };

  Module.getAbstractionId = function(name)
  {
    return name.split(/\s+/).join().toLowerCase();
  };

  Module.getClassName =  function(name,type)
  {
    var words = name.split(/\s+/);
    for(var i=0;i<words.length;i++)
    {
      words[i] = util.capitalize(words[i]);
    }
    return config("sinfonier").modules.package+"."+type+"s."+words.join('');
  };

  Module.escapeDescription = function (description)
  {
    var truncated = description.substring(0, Math.min(config("sinfonier").modules.descSize,description.length));

    return htmlStr.escape(truncated);
  };

  Module.fillProperties = function (source,target,properties,types)
  {
    if (source)
    {
      if (Array.isArray(source[properties[0]]))
      {
        for (var i=0;i< source[properties[0]].length;i++)
        {
          var obj = {};
          for(var j=0; j<properties.length;j++)
          {
            if (types && types[j] == "boolean")
            {
              obj[properties[j]] = htmlStr.escape(source[properties[j]][i]) == "true";
            }
            else
            {
              obj[properties[j]] = htmlStr.escape(source[properties[j]][i]);
            }

          }
          target.push(obj);
        }
      }
      else
      {
        var obj = {};
        for(var j=0; j<properties.length;j++)
        {
          if (types && types[j] == "boolean")
          {
            obj[properties[j]] = htmlStr.escape(source[properties[j]]) == "true";
          }
          else
          {
            obj[properties[j]] = htmlStr.escape(source[properties[j]]);
          }

        }
        target.push(obj);
      }
    }

  };


  Module.prototype = {

    getId: function () {
      return this._id;
    },

    save: function(cb){
      Module.getCollection().save(this, {safe:true},cb);
    },

    create: function(cb){
      Module.getCollection().insert(this, {safe:true},cb);
    },


    delete: function(cb){
      Module.getCollection().remove({_id: this._id},cb);
    },

    getTerminal: function(name) {
      var terminals = this.container.terminals;
      for (var i=0;i<terminals.length;i++)
      {
        if (terminals[i].name == name)
        {
          return terminals[i];
        }
      }
      return null;
    },

    sendSuspensionMessageToOwner: function(previous,reason,cb) {
      var self = this;
      User.getById(this.user_id, function(err, user){
        if (err) {cb(err);}
        var detailUrl = config('sinfonier').rootUrl+"modules/"+self.name;
        var subject =  (previous == 'pending') ? "has been revoked":"has been suspended";
        var text = "Module "+self.name+" "+subject+"\n\n"+reason;
        var html = "Module <a href='"+detailUrl+"'>"+self.name+"</a> "+subject+"<br><br>"+reason;
        email.sendMail(user.email,"Sinfonier. Module "+self.name+" "+subject,text,html,{name:user.name});
        cb();
      });
    },

    changeStatus: function(user,status,reason,cb) {
      var self = this;
      var detailUrl;
      if (user.isAdmin() || (user.isOwner(self) && Module.isValidTransition(self.status, status))) {
        var attrs = {status: status, updated_at:new Date()};
        if (status == 'published' && !self.published)
        {
          detailUrl = config('sinfonier').rootUrl+"modules/"+self.name;
          var html = "Module <a href='"+detailUrl+"'>"+self.name+"</a> has been published<br>";
          // Notify users using distribution list configured on config/sinfonier.json file
          //email.sendMail(config("sinfonier").email.distlist,"Sinfonier. Module "+self.name+" "+subject,"",html,{name:'user', type:'Module publication'}); 
          attrs.published = true;
        }
        if (status == 'published' && !self.twitted)
        {
          detailUrl = config('sinfonier').rootUrl+"modules/"+self.name;
          var message = "The new module "+self.name+" is now available in Sinfonier: "+detailUrl;
          if (user.isOwner(self) && user.twitter )
          {
            message = util.twitterReference(user.twitter)+" has published the new module "+self.name+": "+detailUrl;
          }
          twitter.sendTuit(message,function(error){
            if(error) { console.log(error); }
          });
          attrs.twitted = true;
        }

        db.collection('modules').update({_id: self._id}, {$set: attrs}, function(error){
          if (reason && reason.length > 10)
          {
            self.sendSuspensionMessageToOwner(self.status,reason,cb);
          }
          else
          {
            cb();
          }

        });
      } else
      {
        cb(new Error("Unauthorized!"));
      }
    },
    markPublished: function(cb) {
      db.collection('modules').update({_id: this._id}, {$set: {published: true}},cb);
    },
    markCompiled: function(cb) {
      if (this.sourceType === "Local") {
        db.collection('modules').update({_id: this._id}, {$set: {compiled: true}}, cb);
      } else {
        cb();
      }
    },
    load: function(cb) {
      var self = this;
      self.compile(function(res){
        if (res.result === "error")
        {
          return cb(res);
        }
        //process.loadQueue defined in app.js calling callSerializedLoad avoiding simultaneous calls
        process.loadQueue.push(self,cb);
      });
    },

    callSerializedLoad: function(cb){
      var self = this;
      var func = self.loaded ? "loadModule":"updateModule";
      var params = self.getCompileParams();
      restler.postJson(stormclient.getCommandUrl(func),params)
          .on('timeout',function(data,response){
            return cb({result:"error",description:"Connection timeout"});
          }).on('complete', function(data,response){
            stormclient.prepareResponse(data,response,cb);
          });
    },

    compile: function(cb) {
      var self = this;
      if (self.sourceType === "Local" && self.compiled)
      {
        return cb({result:"ok",description:"Module already compiled"});
      }
      var parameters = self.getCompileParams();
      console.log(parameters);
      restler.postJson(stormclient.getCommandUrl("compileModule"),parameters)
          .on('timeout',function(data,response){
            return cb({result:"error",description:"Connection timeout"});
          }).on('complete', function(data,response){
            stormclient.prepareResponse(data,response,cb);
          });
    },
    updateSourceCode: function(sourceCode,cb) {
      this.sourceCode = sourceCode;
      db.collection('modules').update({_id: this._id}, {$set: {sourceCode: sourceCode, compiled:false}}, cb);
    },

    createDefaultTerminals: function(){
      var module = this;
      var type = module.container.type;
      module.container.terminals = [];
      if (type == "drain" || type  == "bolt")
      {
        module.container.terminals.push({"name": "in[]", "direction": [0, -1], "offsetPosition": [82, -15], "ddConfig": {
          "type": "input",
          "allowedTypes": ["output"]
        },
          "nMaxWires": 5
        });
      }

      if (type == "bolt" || type  == "spout")
      {
        module.container.terminals.push({
          "name": "out", "direction": [0, 1],  "offsetPosition": {
            "left": 52,
            "bottom": -15
          },
          "ddConfig": {
            "type": "output",
            "allowedTypes": ["input"]
          }
        });
      }

    },

    adjustTerminalPositions: function ()
    {
      var offset;
      var module = this;
      if (module.container.fields && module.container.fields.length > 0)
      {
        offset = 82;
      }
      else
      {
        offset = 20+(module.name.length*2);
      }
      module.container.terminals.forEach(function(terminal){
        if (terminal.offsetPosition.left)
        {
          terminal.offsetPosition.left = offset;
        }
        else {
          terminal.offsetPosition[0] = offset;
        }
      });
    },

    getRevisionsInfo: function (cb)
    {
      var self  = this;
      if (self.sourceType === 'Gist')
      {
        restler.get(self.container.codeURL+'/revisions').on('timeout', function(ms){
          console.log('did not return within '+ms+' ms');
          return cb({result:"error",description:"Error recovering"});
        }).on('complete', function(data,response) {
          if (response.statusCode <= 201) {
            var parsed = data.replace(new RegExp('href="', 'g'),'target="_blank" href="');
            var parsed = parsed.replace(new RegExp('href="/', 'g'),'href="http://gist.github.com/');
            return cb(null,parsed);
          }
          cb({result:"error",description:"Error "+response.statusCode});
        });
      }

    },

    //----

    getCompileParams: function () {
      var params = {  name: this.name,
        type: this.container.type
      };
      if (this.sourceType === 'Local')
      {
        params.src = this.sourceCode;
      } else {
        params.gist = this.container.codeURL;
      }
      params.lang = this.language.toLowerCase();
      return params;
    }
  };


	return Module;

};

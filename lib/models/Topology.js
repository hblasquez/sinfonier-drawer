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

 var stormclient = require('../utils/stormclient');
var restler = require('restler');
var config = require('konphyg')(process.cwd()+"/config");
var async = require('async');
var twitter = require('../utils/twitter');
var extend = require('util')._extend;
var util = require('../utils/util');

exports.init = function(db) {

  var xmlstorm = require('../xmlstorm');
  var COL = 'topologies';
  var votable = require('../concerns/Votable');

  var Topology = function(values) {
    extend(this,values);
    extend(this,votable);
	};

  Topology.modelize = function(obj){
    return obj ? new Topology(obj) : obj;
  };

  Topology.getCollection = function()
  {
    return db.collection(COL);
  };


  Topology.findById = function(id, cb) {
    Topology.getCollection().findOne({_id: id } , function(err, topology) {
      return cb(err,Topology.modelize(topology));
    });
  };
  Topology.findByUser = function(user, cb) {
    Topology.getCollection().find({ $query :
                                    { user_id: user._id,
                                      status:{$ne:'deleted'}
                                    },
                                    $orderby : {updated_at: -1}
                                  }).toArray(cb);
  };

  Topology.countTotal = function(cb)
  {
    Topology.getCollection().count({status:{$ne:'deleted'}}, cb);
  };

  Topology.runningTotal = function(cb)
  {
    Topology.getCollection().count({status:"running"}, cb);
  };

  Topology.countByUser = function(user_id,cb)
  {
    Topology.getCollection().count({user_id: user_id, status:{$ne:'deleted'}}, cb);
  };

  Topology.runningByUser = function(user_id,cb)
  {
    Topology.getCollection().count({user_id: user_id,status:"running"}, cb);
  };

  Topology.getAllGroupedByUser = function(cb) {
    var query = [
      {$match: {  "status": {$ne: 'deleted'}}},
      {$group: {
        _id: "$author.email",
        topology_count: {$sum: 1}
        }
      },
      {$sort: {topology_count: -1}}
    ];
    db.collection(COL).aggregate(query).toArray( cb );
  };

  Topology.markUsedAsTemplate = function(id,cb) {
    Topology.getCollection().update({_id: id},{$inc: {templates_count:1}},cb);
  };

  Topology.prototype = {

    getId: function () {
      return this._id;
    },

    save: function(cb) {
      db.collection(COL).save(this,cb);
    },

    run: function(params,cb) {
      var self = this;
      try {
        var parameters = params || {};
        xmlstorm.run(self.config, parameters, false, Module.findByName, function (err, xml) {
          if (err) {return cb({result:"error","description":err.message});}
          var finalXml = xml.replace(/\"/g, "'");
          console.log(finalXml);
          restler.postJson(stormclient.getCommandUrl("launchTopology"), {name: self.name, reload: "true", xml: finalXml}).on('complete', function (data, response) {
            stormclient.prepareResponse(data, response, cb);
          });
        });
      } catch (err)
      {
        cb(err);
      }
    },
    stop: function(cb) {
      var self = this;
      restler.postJson(stormclient.getCommandUrl("stopTopology"),{name:self.name}).on('complete', function(data,response){
        stormclient.prepareResponse(data,response,cb);
      });
    },
    updateStorm: function(params,cb) {
      var self = this;
      var parameters = params || {};
      xmlstorm.run(self.config, parameters, false, Module.findByName, function(err,xml){
        if (err) {return cb({result:"error","description":err.message});}
        restler.postJson(stormclient.getCommandUrl("updateTopology"),{name:self.name,reload:"true",xml:xml}).on('complete', function(data,response){
          stormclient.prepareResponse(data,response,cb);
        });
      });
    },
    getLogStorm: function(cb) {
      var self = this;
      var logSize = config('sinfonier').topologies.logSize;
      restler.postJson(stormclient.getCommandUrl("fastGetLog"),{name:self.name,lines:""+logSize}).on('complete', function(data,response){
        stormclient.prepareResponse(data,response,function(data){
          if (data.result === 'error' && (data.description.indexOf('Error getting') >= 0 || data.description.indexOf('Error parsing') >= 0 ) ) {
            restler.postJson(stormclient.getCommandUrl("getLog"), {name: self.name, lines:""+logSize}).on('complete', function (data, response) {
              stormclient.prepareResponse(data, response, cb);
            });
          }
          else
          {
            cb(data);
          }
        });
      });
    },
    getStatusStorm: function(cb) {
      var self = this;
      restler.postJson(stormclient.getCommandUrl("fastStatus"),{name:self.name}).on('complete', function(data,response){
        stormclient.prepareResponse(data,response,function(data){
          if (data.result === 'error' ) {
            restler.postJson(stormclient.getCommandUrl("status"), {name: self.name}).on('complete', function (data, response) {
              stormclient.prepareResponse(data, response, cb);
            });
          }
          else
          {
            cb(data);
          }
        });
      });
    },
    getFastStatusStorm: function(cb) {
      var self = this;
      restler.postJson(stormclient.getCommandUrl("fastStatus"),{name:self.name}).on('complete', function(data,response){
        stormclient.prepareResponse(data,response,cb);
      });
    },
    reorderWires: function(cb) {
      var self = this;
      var config = self.config;
      var configFunctions = [];
      var makeConfigFunction = function(mod) {
        return function(callback) {
          Module.getDefinition(mod.name, function (err, definition) {
            if (!definition) {
              callback(new Error("Module " + module.name + " not found !"));
            }
            callback(err, definition);
          });
        };
      };

      config.modules.forEach(function(m){
        configFunctions.push(makeConfigFunction(m));
      });

      var swapWire = function(w){
        var tmp = w.src;
        w.src = w.tgt;
        w.tgt = tmp;
      };
      var reorderWires = function (wires,modules){
        wires.forEach(function(w){
          var src = modules[w.src.moduleId];
          var terminal = src.getTerminal(w.src.terminal);
          if (terminal && terminal.ddConfig.type === 'input') {
            swapWire(w);
          }
        });
      };
      async.parallel(configFunctions,function(err,results){
        if (err) { return cb(err);}
        reorderWires(config.wires,results);
        cb(err);
      });

    },
    changeSharing: function(user,sharing,cb) {
      var self = this;
      if (self.sharing === sharing)
      {
        return cb();
      }
      var detailUrl;
      var attrs = {sharing: sharing, updated_at:new Date()};
      if (sharing == 'published' && !self.twitted)
      {
        detailUrl = config('sinfonier').rootUrl+"topologies/"+self._id.toHexString();
        var message = "The new topology "+self.name+" is now available in Sinfonier: "+detailUrl;
        if (user && user.isOwner(self) && user.twitter )
        {
          message = util.twitterReference(user.twitter)+" has published the new topology "+self.name+": "+detailUrl;
        }
        twitter.sendTuit(message,function(error){
          if(error) { console.log(error); }
        });
        attrs.twitted = true;
      }

      Topology.getCollection().update({_id: self._id}, {$set: attrs}, cb);
    },
    hasNonPublicModules: function(cb) {
      var self = this;
      var moduleNames = [];
      self.config.modules.forEach(function(module){
        moduleNames.push(module.name);
      });

      Module.getCollection().count({name: {$in:moduleNames}
                                      ,status: {$nin:['published','predefined']}},function(err, total){
            cb(err, (total || 0) > 0 );
          });
    },

    asTemplate: function(){
      var reduced = {name:"Template",_id:"template"};
      //deep copy to delete values
      reduced.config = extend({},this.config);
      reduced.config.properties.name = ""
      reduced.config.modules.forEach(function(module){
        delete module.value;
        //module.value=[];
      });
      reduced.config.properties.templateid = this._id.toHexString();
      return reduced;
    },

    asTemplateKeepValues: function(){
      var reduced = {name:"Template",_id:"template"};
      //deep copy to delete values
      reduced.config = extend({},this.config);
      reduced.config.properties.name = "";

      reduced.config.properties.templateid = this._id.toHexString();
      return reduced;
    }


  };


	return Topology;

};

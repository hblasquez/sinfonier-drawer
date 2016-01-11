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

var hat = require('hat');
var fs = require('fs');
var pd = require('pretty-data').pd;
var xmlutils = require('./modules/utils/xmlutils.js');
var markdown = require('./modules/utils/markdown.js');
var async = require('async');
var Module = require('./models/Module');

/**
 * Core modules
 *
 * Module functions takes two arguments, the params object, and the callback.
 * They MUST return an object !
 *
 */
var CoreModules = {

	input: function(p, cb) {
	  var key = p["input"]["name"],
			val = p.hasOwnProperty(key) ? p[key] : p["input"]["value"];
	  cb({"out": val });
	},
	
	output: function(params, cb) {
		cb({"out": params["in"] });
	}
	
};

var CoreModulesXML = {

};

var definitions = [];
var names = [];

// Dynamically load modules from the lib/modules directory
fs.readdirSync(__dirname+'/modules').forEach(function(file) {
	// test if JS file
	if(file.substr(-3) == ".js") {
		var moduleName = file.substr(0, file.length-3);
		var module = require(__dirname+'/modules/'+file);
    if (module.definition.container.description)
        module.definition.container.description = markdown.parseMarkdown(module.definition.container.description);
    definitions.push(module.definition);
    names.push(moduleName);
		CoreModules[moduleName] = module.run;
    if (module.xml)
    {
        CoreModulesXML[moduleName] = module.xml;
    }
	}
});

// Load NPM webhookit-* packages
var npm = require('npm');
npm.load({}, function (err) {
   if (err) throw err;

	console.log("NPM list of WebHookIt modules: ");
	npm.commands.ls([], true, function (err, packages) {
		if (err) throw err;
		var package_names = Object.keys(packages.dependencies);
		for(var k in package_names) {
			var pkg = package_names[k];
			var name = pkg.split("-");
			if(name.length < 2 || name[0] !== "webhookit") continue;
			
			console.log("Loading module: "+pkg);
			var m = require(pkg);
			if( typeof m.run == "function" && typeof m.definition == "object") {
				definitions.push(m.definition);
        names.push(name[1]);
				CoreModules[name[1]] = m.run;
                if (m.xml)
                {
                   CoreModulesXML[name[1]] = m.xml;
                }
			}
			else {
				console.log("Unable to find WebHookIt module definition in 	package: "+pkg);
			}
		}

	});
});

exports.definitions = definitions;
exports.names = names;

var generateGenericXml = function(mydef,seq,params, cb, iWires, oWires,modules)
{
    console.log("Generating "+mydef.name+" generic XML with params:");
    console.log(params);
    var res = xmlutils.generateFullObject(mydef,seq,params,iWires,modules);
    cb( res );
};



var xmlModule = function(seq,name, p, cb, find_method, iWires, oWires,modules) {
   // Execute Ruby base modules
   if( CoreModules[name] ) {
       if ( CoreModulesXML[name] )
       {
  		 CoreModulesXML[name](seq,p, cb, iWires, oWires,modules);
       }
       else
       {
           cb("");
       }
	}
   else {

      // Try to execute custom module
		if(find_method) {
			find_method(name, function(err,m) {
				if (err) {throw err;}
				if(!m) {
					throw new Error("Module "+name+" not found !");
				}
				else {
                    generateGenericXml(m,seq,p, cb, iWires, oWires,modules);
				}
				
			});
		}
		else {
			throw new Error("Module "+name+" not found ! (You may want to specify a find_method !)");
		}
	}
};

var getDefinition = function(m,find_method,cb)
{
        for (var i=0;i<definitions.length;i++)
        {
            if (m.name == definitions[i].name)
            {
                cb(m,definitions[i]);
                return;
            }
        }
        if(find_method) {
            find_method(m.name,
                function(err,def){
                    if (err) {throw err;}
                    cb(m,def);
                });
        }
        else
        {
            throw new Error("Module "+ m.name+" not found !");
        }
};

/**
 * Run method
 */
var run = function(config, params, debug, find_method, cb) {
	
  var wires = config.wires,
		  modules = config.modules;

	 // Store the output results of each sub-module
  var execValues = {};
	var pendingSpouts = [];
  var pendingBolts = [];
  var pendingDrains = [];
  var spouts = "";
  var wspoutcb = function(id,value){
      execValues[id]["out"] = execValues[id]["out"]  + value;
      spouts = spouts + value;
  };
  var bolts = "";
  var wboltcb = function(id,value){
      execValues[id]["out"] = execValues[id]["out"]  + value;
        bolts = bolts + value;
  };

  var drains = "";
  var wdraincb = function(id,value){
      execValues[id]["out"] = execValues[id]["out"]  + value;
      drains = drains + value;
  };

  var pendingConfig = modules.length;

  var step = function() {

        // List modules that must be executed
        var moduleIdsToExecute = [];
        for( var mId = 0 ; mId < modules.length ; mId++) {
            var m = modules[mId];
            var p = m["parameters"];
            var seq = m["sequence"];
            if (!execValues[mId] && m.definition.container.type === "spout")
            {
                execValues[mId] = {};
                execValues[mId]["out"] = "";

                pendingSpouts.push(mId);
                var iWires = m["iWires"];
                var oWires = m["oWires"];
                var generateXmlModule = function (seq,name, p, moduleId, iWires, oWires, modules) {
                    return function () {
                        console.log("\n->Starting " + name + " MODULE with : " + JSON.stringify(params));
                        xmlModule(seq,name, p, function (results) {
                            console.log("\n<-Finished " + name + " MODULE with : " + JSON.stringify(results));

                            pendingSpouts.splice(pendingSpouts.indexOf(moduleId), 1);

                            wspoutcb(moduleId, results);

                            step();
                        }, find_method, iWires, oWires, modules);
                    };
                };

                // Make sure we call the execModule function outside this stack
                setTimeout(generateXmlModule(seq,m["name"], p, mId, iWires, oWires, modules), 0);

            }

        }
        if (pendingSpouts.length > 0)
            return;

        for( var mId = 0 ; mId < modules.length ; mId++)
        {
            var m = modules[mId];

            var p = m["parameters"];
            var seq = m["sequence"];

            if (!execValues[mId] && m.definition.container.type === "bolt")
            {
                execValues[mId]= {};
                execValues[mId]["out"] = "";

                pendingBolts.push(mId);
                var iWires = m["iWires"];
                var oWires = m["oWires"];
                var generateXmlModule = function(seq,name, p, moduleId,iWires,oWires,modules) {
                    return function() {
                        console.log("\n->Starting "+name+" MODULE with : "+JSON.stringify(params) );
                        xmlModule(seq,name, p, function(results) {
                            console.log( "\n<-Finished "+name+" MODULE with : "+ JSON.stringify(results) );

                            pendingBolts.splice( pendingBolts.indexOf(moduleId) ,1);

                            wboltcb(moduleId,results);

                            step();
                        }, find_method,iWires,oWires,modules);
                    };
                };

                // Make sure we call the execModule function outside this stack
                setTimeout(generateXmlModule(seq,m["name"], p, mId,iWires,oWires,modules), 0);
            }

        }
        if (pendingBolts.length > 0)
            return;

        for( var mId = 0 ; mId < modules.length ; mId++)
        {
            var m = modules[mId];

            var p = m["parameters"];
            var seq = m["sequence"];

            if (!execValues[mId] && m.definition.container.type === "drain")
            {
                execValues[mId]= {};
                execValues[mId]["out"] = "";

                pendingDrains.push(mId);
                var iWires = m["iWires"];
                var oWires = m["oWires"];
                var generateXmlModule = function(seq,name, p, moduleId,iWires,oWires,modules) {
                    return function() {
                        console.log("\n->Starting "+name+" MODULE with : "+JSON.stringify(params) );
                        xmlModule(seq,name, p, function(results) {
                            console.log( "\n<-Finished "+name+" MODULE with : "+ JSON.stringify(results) );

                            pendingDrains.splice( pendingDrains.indexOf(moduleId) ,1);

                            wdraincb(moduleId,results);

                            step();
                        }, find_method,iWires,oWires,modules);
                    };
                };

                // Make sure we call the execModule function outside this stack
                setTimeout(generateXmlModule(seq,m["name"], p, mId,iWires,oWires,modules), 0);
            }

        }
        if (pendingDrains.length > 0)
            return;

        for( var mId = 0 ; mId < modules.length ; mId++)
        {
            var m = modules[mId];

            if ( !wires.some(function(w) { return (w["src"]["moduleId"] == mId); }))
            {
                execValues[mId]= {};
                execValues[mId]["out"] = "";

                execValues[mId]["out"] = "<builderConfig><spouts>"+spouts+"</spouts><bolts>"+bolts+"</bolts><drains>"+drains+"</drains></builderConfig>"
            }
        }
        if (debug)
        {
            for( var i=0; i<execValues.length;i++)
            {
                execValues[i]["out"] = pd.xmlmin('<?xml version="1.0" encoding="UTF-8" ?>'+execValues[i]["out"]);
            }
            cb(null,execValues);
        }
        else
        {
            cb(null, pd.xmlmin("<builderConfig><spouts>"+spouts+"</spouts><bolts>"+bolts+"</bolts><drains>"+drains+"</drains></builderConfig>"));
        }

    };

  var swapWire = function(w){
    var tmp = w.src;
    w.src = w.tgt;
    w.tgt = tmp;
  };
  var reorderWires = function (wires,modules){
    var newWires = [];
    wires.forEach(function(w){
      var src = modules[w["src"]["moduleId"]];
      var terminal = xmlutils.getTerminal(src.definition, w.src.terminal);
      if (terminal.ddConfig.type == 'input')
      {
        swapWire(w);
      }
    });
  };

  var completeConfig = function()
  {
      if (!pendingConfig)
      {
        reorderWires(wires,modules);
        for( var mId = 0 ; mId < modules.length ; mId++) {
          var m = modules[mId];
          m["iWires"] = wires.filter(function (w) {
            return w["tgt"]["moduleId"] == mId;
          });
          m["oWires"] = wires.filter(function (w) {
            return w["src"]["moduleId"] == mId;
          });
        }


        for( var mId = 0 ; mId < modules.length ; mId++) {
              var m = modules[mId];
              m["parameters"] = calculateModuleParams(m);
          }
          for( var mId = 0 ; mId < modules.length ; mId++) {
              var m = modules[mId];
              calculateWiredParams(m);
          }
          step();
      }
  };

  var configFunctions = [];
  var rack = hat.rack(32,16);
  for( var mId = 0 ; mId < modules.length ; mId++) {
      var m = modules[mId];
      if (!m["definition"])
      {
        m["sequence"] = rack();

        var makeConfigFunction = function(mod,find_method) {
          return function(callback) {
            getDefinition(mod, find_method, function (module, definition) {
              if (!definition) {
                callback(new Error("Module " + module.name + " not found !"));
              }
              callback(null, definition);
            });
          }
        }
        configFunctions.push(makeConfigFunction(m,find_method));
      }
  }

  async.parallel(configFunctions,function(err,results){
    if (err) { return cb(err)}
    pendingConfig = 0;
    for(var i = 0; i<modules.length;i++)
    {
      modules[i].definition = results[i];
    }
    completeConfig();
  });




  function calculateWiredParams(m)
  {

      var definition = m["definition"];

      var fields = definition["container"]["fields"];

      if (fields)
      {
          for (var i=0;i<fields.length;i++)
          {
              var field = fields[i];
              if (field["wirable"]  && m["iWires"])
              {
                  var iWires = m["iWires"];
                  for (var j=0;j<iWires.length;j++)
                  {
                      var w = iWires[j];
                      if ( w["tgt"]["terminal"] == field["name"] )
                      {
                          var sourceId = w["src"]["moduleId"];
                          var sourceModule = modules[sourceId];
                          /*No evaluamos posibles asignaciones en cadena, habría que hacer run de los módulos
                          * De momento asumimos que los módulos ponen un parámetro value para poder engancharse
                          * a un campo
                          */
                          m["parameters"][field["name"]] = sourceModule["parameters"]["value"];

                      }
                  }
              }
          }
      }
  }


  function calculateModuleParams(m) {
      var p = {}, key;

      var definition = m["definition"];

      var attrs = definition["container"]["attributes"];
      var hidden = definition["container"]["hidden"];
      if (attrs) {
          for (key in attrs) {
              p[key] = attrs[key];
          }

      }
      if (hidden) {
          for (key in hidden) {
              p[key] = hidden[key];
          }
      }
      // params passed to the run method
      for (key in params) {
          p[key] = params[key];
      }
      // default form values
      for (key in m["value"]) {
          p[key] = m["value"][key];
      }

      //If parallelism is passed in params, we override the module instance value
      if (params.parallelism)
      {
        p.parallelism = params.parallelism;
      }
      return p;
  }


};

exports.run = run;


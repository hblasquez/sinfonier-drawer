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
var htmlStr = require('html-strings');
exports.expressRoutes = function(app) {

	var ObjectID = require('mongodb').ObjectID,
		 simpleflow = require(app.root + '/lib/simpleflow'),
     xmlstorm = require(app.root + '/lib/xmlstorm'),
		 ejs = require('ejs'),
		 cron = require('cron'),
     async = require('async');

	// Get topology collection
	function get_topology_collection(req, res, next) {
		app.db.collection('topologies', function(error, topology_collection) {
			if(error) { throw error; }
			else {
				req.topology_collection = topology_collection;
				next();
			}
		});
	}

  // Get topology by ID
	function get_topology( req, res, next) {
    var query = {_id: ObjectID.createFromHexString(req.param('id'))};
    if (!req.current_user.isAdmin())
    {
      query.user_id = req.current_user._id;
    }
		req.topology_collection.findOne(query, function(error, topology) {
				if(error) { throw error; }
				req.topology = topology;
				next();
			});
	}


  // Check if Topology name exists. Sinfonier topology names must be unique
  function checkUniqueTopology(req, res, next) {
    var query =  {name: req.body.topology.name};
    if (req.param("id"))
    {
      query._id = {$ne:ObjectID.createFromHexString(req.param('id'))}
    }
    req.topology_collection.findOne( query, function(error, topology) {
      if(error) { throw error; }

      if(topology) {
        errors.addError(req,req.body.name,"Topology already exists with this name!");
      }
      next();
    });
  }


  // Display and search topologies
  app.get('/topologies', app.require_login, function(req, res){

    // Search
    var query = { $and:[
                        {status:{$ne:'deleted'}}
                       ]
                };

    if (!req.current_user.isAdmin())
    {
      query.$and.push({$or:[{user_id: req.current_user._id}]});
    }
    if (req.current_user.isAdmin())
    {
      var status = req.param("status");
      if( status && status.length > 0 ) {
        query.$and.push({status: status});
      }
    }

    var q = req.param("q");
    if( q && q.length > 0 ) {
      var queryOr = {$or:[
        { name: new RegExp( q , "i") },
        { "author.name": new RegExp( q , "i") }
      ]};
      query.$and.push(queryOr);
    }

    var tag = req.param("tag");
    if( tag && tag.length > 0 ) {
      query.$and.push({tag: tag});
    }

    var update = req.param("updated");
    if (update && update.length > 0)
    {
      query.$and.push({updated_at: { $gt : new Date(update) }});
    }

    var page = req.param("page") || 1;
    var pageSize = req.param("pagesize") || 5;


    Topology.getCollection().find({
      $query: query,
      $orderby: {updated_at: -1} }, {skip:(pageSize*(page-1)),limit:pageSize}).toArray(function(error, topologies) {
        if(error) { throw error; }
        res.render('topologies/index', {
            locals: {
            title: "topologies",
            action: "topologies",
            status: req.param("status") || '',
            topologies: topologies,
            q: req.param("q")|| '',
            tag: req.param("tag") || '',
            page:       page,
            pageSize:   pageSize,
            updated: req.param("updated") || ''
            }
        });
     });
  });

  // Display and search topologies
  app.get('/mytopologies', app.require_login, get_topology_collection, function(req, res){


    // Search
    var query = {user_id: req.current_user._id, status:{$ne:'deleted'} };

    var page = req.param("page") || 1;
    var pageSize = req.param("pagesize") || 5;


    req.topology_collection.find({
      $query: query,
      $orderby: {updated_at: -1} }, {skip:(pageSize*(page-1)),limit:pageSize}, function(error, cursor) {
      if(error) { throw error; }
      cursor.toArray(function(error, topologies) {
        if(error) { throw error; }
        res.render('topologies/mytopologies', {
          locals: {
            title: "my topologies",
            action: "topologies",
            status: req.param("status") || '',
            topologies: topologies,
            q: req.param("q")|| '',
            tag: req.param("tag") || '',
            page:       page,
            pageSize:   pageSize,
            updated: req.param("updated") || ''
          }
        });
      });
    });

  });


// list topologies for user in JSON
app.get('/topologies.json', app.require_login, get_topology_collection, function(req, res){
  var template = req.param("template");

  var searchs = [function(callback){ Topology.findByUser(req.current_user,callback);}];
  if (template)
  {
    searchs.push(function(callback){Topology.findById(ObjectID.createFromHexString(template),callback);});
  }
  async.parallel(searchs
      ,function(error,results)
      {
        if(error) { throw error; }
        var topologies = results[0];
        if (template && results[1]) {
          topologies.push(req.current_user.isOwner(results[1]) ? results[1].asTemplateKeepValues(): results[1].asTemplate());
        }
        return res.json( topologies );
      }
  );

});


// Show topology.
// Everybody can see a topology
app.get('/topologies/:id', app.require_login, function(req, res){
  Topology.findById(ObjectID.createFromHexString(req.param('id')),function(error,topology){
    if (error){ throw error;}
    res.render('topologies/show', {
      locals: {
        title: "Topology "+topology.name,
        action: "topologies",
        topology: topology,
        params: {}
      }
    });
  });

});


// Modify a topology (other parameters, from a html form)
// Use POST instead of PUT so we can use HTML forms
app.post('/topologies/:id', app.require_login, get_topology_collection, get_topology, checkUniqueTopology, function(req, res){

  if (req.body.topology.name)
  {
    var reCamelCase = /^(([A-Z]+[a-z0-9]*)+)$/;
    if (!reCamelCase.test(req.body.topology.name))
    {
      return res.send(422,{error:'Invalid name format. Must be UpperCamelCase'});
    }
  }

  var errors = req.validationErrors();
  if (errors) {
    return res.send(422,{error:'Topology already exists with this name!'});
  }

	if( req.param("template_content_type") ) {
		req.topology.template_content_type = req.param("template_content_type");
	}
	if( req.param("template") ) {
		req.topology.template = req.param("template");
	}
	if( req.param("publicname") ) {
		req.topology.publicname = req.param("publicname");
	}

	req.topology.updated_at = new Date();
			
			console.log("REQ.topology._ID" , req.topology._id);
			
	req.topology_collection.update({_id: req.topology._id}, req.topology, function(error, docs){
		if(error) { throw error; }
		

		req.flash('notice', "saved !");
		res.redirect('/topologies/'+req.topology._id.toHexString() );
		
	});
});


// Add a topology 
app.post('/topologies', app.require_login, get_topology_collection,checkUniqueTopology, function(req, res){

  if (req.body.topology.name)
  {
    var reCamelCase = /^(([A-Z]+[a-z0-9]+)+)$/;
    if (!reCamelCase.test(req.body.topology.name))
    {
      return res.send(422,{error:'Invalid name format. Must be UpperCamelCase'});
    }
  }

  var errors = req.validationErrors();
  if (errors) {
    return res.send(422,{error:'Topology already exists with this name!'});
  }

  var topology = req.body.topology;
	
	topology.user_id = req.current_user._id;
	
	var d = new Date();
  topology.status = 'active';
  topology.sharing = 'private';
  topology.created_at = d;
	topology.updated_at = d;
	
	topology.author = {
		name: req.current_user.name, 
		email: req.current_user.email
	};
  topology = Topology.modelize(topology);
  if (topology.template_id)
  {
    topology.template_id = ObjectID.createFromHexString(topology.template_id);
  }
  topology.reorderWires(function(error) {
    if (error) {
      throw error;
    }

    req.topology_collection.insert(topology, function (error, docs) {
      if (error) {
        throw error;
      }
      var actions = [function(cb) {req.current_user.incTopologiesCounter(cb)}];
      if (topology.template_id)
      {
        actions.push(function(cb){Topology.markUsedAsTemplate(topology.template_id,cb);});
      }
      async.parallel(actions,function (error) {
        if (error) {
          throw error;
        }
        res.status(201).json(docs[0]);
      });
    });
  });
	 
});

// Modify a topology (json)
app.put('/topologies/:id.json', app.require_login, get_topology_collection,get_topology, function(req, res){

  var topology = req.body.topology;

  if (topology.name)
  {
    delete topology.name;
  }

  if (topology._id)
  {
    delete topology._id;
  }

	if (!req.current_user.isOwner(req.topology))
  {
    return res.send(403,{error:'Unauthorized'});
  }

	for(var k in topology) {
		req.topology[k] = topology[k];
	}
	req.topology.updated_at = new Date();

  req.topology = Topology.modelize(req.topology);
  req.topology.reorderWires(function(error){
    if(error) { throw error; }
    req.topology.save( function(error, docs){
      if(error) { throw error; }
      res.json( docs );
    });
  });

});


// Delete a topology
app.delete('/topologies/:id.json',app.require_login, get_topology_collection,get_topology, function(req, res){
  req.topology_collection.update({_id: req.topology._id}, {$set: {status:"deleted"}}, function(error){
    if(error) { throw error; }
    User.getById(req.topology.user_id,function(err,user){
      if(err) { throw err; }
      user.decTopologiesCounter(function(error) {
        if(error) { throw error; }
        res.send(200);
      });
    });
  });

});




/*************************************
 * EXECUTION
 *************************************/



/**
 * Wrap the find_method 
 */
var mySimpleflowRun = function(conf, params, debug, topology_collection, cb) {
	simpleflow.run(conf, params, debug, function(name, cb) {
		topology_collection.findOne({
			//_id: ObjectID.createFromHexString(req.param('id')) 
			name: name
		}, function(error, topology) {
			if(error) { throw error; }
			
			if(!topology) {
				throw "topology '"+name+"' was not found !";
			}
			/*console.log("error");
			console.log(error);
			console.log("topology");
			console.log(topology);*/
			
			cb(topology.config);
		});
	}, cb);
};

/**
 * XML spring-storm generator
 */
var xmlGenerator = function(conf, params, debug, cb) {
    xmlstorm.run(conf, params, debug, Module.findByName, cb);
};

var mySimpleflowRunWithActivity = function(topology, user_id, format, from, params, debug, topology_collection, cb) {
	var started_at = new Date();
		
	mySimpleflowRun(topology.config, params, debug, topology_collection, function(results) {
		
		var finished_at = new Date();
		var activity = {
			user_id: user_id,
			topology: {
				_id: topology._id,
				name: topology.name
			},
			from: from,
			params: params,
			results: results,
			created_at: started_at,
			duration: (finished_at-started_at),
			format: format
		};
		
		app.db.collection('activities', function(error, activity_collection) {
			if(error) { throw error; }
			
			activity_collection.insert(activity, function(error, docs) {
				if(error) { throw error; }
					
				cb(results);
			});
		});
	});
};


// Editor debug
app.post('/editor/debug', app.require_login, get_topology_collection, function(req, res){
	mySimpleflowRun(
		eval(req.body).working, // TODO: JSON does not work instead of eval ???
		{},  // Parameters
		true, // Debug
		req.topology_collection,
		function(results) {
			res.json(results);
		}
	);
});

// Editor debug
app.post('/editor/xml.json', app.require_login, function(req, res){
    var params = {};
    if (!req.current_user.managesParallelism())
    {
      params.parallelism = Module.defaultParallelism;
    }
    xmlGenerator(
        req.body.working,
        params,  // Parameters
        true, // Debug
        function(err,results) {
          res.json(err?err:results);
       }
    );
});


  // Run the topology !
  function run_topology(topology, req, res, format) {
	
	  var filteredParams = req.query;
	  // TODO
    /*filteredParams = params.dup
    filteredParams.delete("id")
    filteredParams.delete("action")
    filteredParams.delete("controller")
    filteredParams.delete("callback")
    filteredParams.delete("format")*/
	
	
	  mySimpleflowRunWithActivity(topology, req.current_user._id, format, "web",
			filteredParams, false, req.topology_collection, function(results) {
		
				if(format == "html") {
					// Reder the template
					if( !!topology.template && !req.param("notemplate") ) {
						res.header('Content-Type', topology.template_content_type);
						var output;
						try {
							output = ejs.render(topology.template, {
								locals: {
									results: results,
									params: filteredParams
								}
							});
						} catch(ex) {
							output = "Error in your template: "+ex.message;
						}
						res.send(output);

					} 
					// Render the result of the "outputField" variable as a html document
					else if( req.param('outputField') ) {
						res.header('Content-Type', "text/html");
						if(results.hasOwnProperty(req.param('outputField'))) {
							res.send( results[req.param('outputField')] );
						}
						else {
							res.send( "No field called "+req.param('outputField') );
						}
			       }
				    else {
						// render run.ejs
						res.render('topologies/run', {
					        locals: {
									title: "topology "+topology.name,
									action: "topologies",
									topology: topology,
									params: filteredParams,
									results: results
					        }
					    });
					}
				}
				/*else if(format == "xml") {
				}*/
				else if(format == "json") {
					
					if(req.param("callback")) {
						res.header('Content-Type', 'text/javascript');
						
						res.send("if(typeof "+req.param("callback")+" == 'function') {"+
									req.param("callback")+"("+JSON.stringify(results)+");} else {\n"+
									"if (typeof console!== 'undefined' && typeof console.log !== 'undefined'){\n"+
									"console.log('Error: Callback method not defined');}	}");
					}
					else {
						res.json(results);
					}
				}
				/*else if(format == "txt") {
					if results.keys.size == 1
						if results.values[0].is_a?(String)
							render :text => results.values[0]
							return
						end
					else
						# TODO: check if param outputField
					end

					render :text => "blabla"
				}*/		
				
    });

  }

  app.post('/topologies/:id/launch.json', app.require_login, get_topology_collection, get_topology, function(req, res){
    var topology = new Topology(req.topology);
    var params = {};
    if (!req.current_user.managesParallelism())
    {
      params.parallelism = Module.defaultParallelism;
    }

    Topology.runningByUser(req.current_user._id,function(err,total){
      if (total < req.current_user.running_topologies_capacity)
      {
        topology.run(params,function(result){
          res.json( result );
        });
      }
      else
      {
        res.status(403).json({result:"error", description:'Launch denied. Maximum running topologies quota ('+total+') has been reached'});
      }
    });

  });

  app.post('/topologies/:id/stop.json', app.require_login, get_topology_collection, get_topology, function(req, res){
    var topology = new Topology(req.topology);

    topology.stop(function(result){
      res.json( result );
    });
  });

  app.post('/topologies/:id/update.json', app.require_login, get_topology_collection, get_topology, function(req, res){
    var topology = new Topology(req.topology);
    var params = {};
    if (!req.current_user.managesParallelism())
    {
      params.parallelism = Module.defaultParallelism;
    }

    topology.updateStorm(params,function(result){
      res.json( result );
    });
  });

  app.get('/topologies/:id/log.json', app.require_login, get_topology_collection, get_topology, function(req, res){
    var topology = new Topology(req.topology);

    if (topology.status !== 'running')
    {
      var detail = "Log only accesible for running topologies"
      return res.status(422).json( {result:"error",description:"Not available",detail: detail});
    }
    topology.getLogStorm(function(result){
      res.json( result );
    });
  });

  app.get('/topologies/:id/status.json', app.require_login, get_topology_collection, get_topology, function(req, res){
    var topology = new Topology(req.topology);

    topology.getStatusStorm(function(result){
      res.json( result );
    });
  });

  app.get('/topologies/:id/run', app.require_login, get_topology_collection, get_topology, function(req, res){
    run_topology(req.topology, req,res,"html");
  });
  app.get('/topologies/:id/run.:format', app.require_login, get_topology_collection, get_topology, function(req, res){
    run_topology(req.topology, req,res, req.param("format") );
  });
  app.post('/topologies/:id/run', app.require_login, get_topology_collection, get_topology, function(req, res){
    run_topology(req.topology, req,res,"html");
  });

};
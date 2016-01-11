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

exports.init = function(db) {

  var ObjectID = require('mongodb').ObjectID;

	StormServer = function(values,visible) {
		if(values) {
      if (visible)
      {
        if (visible =='admin' )
        {
          for(var k in StormServer.adminFields) {
            this[k] = values[k];
          }
        }
        else
        {
          for(var k in StormServer.visibleFields) {
            this[k] = values[k];
          }
          if (!this.email_visibility)
          {
            this.email= ''
          }

        }

      }
      else
      {
        for(var k in StormServer.fields) {
          this[k] = values[k];
        }
      }
		}
	};
	
	StormServer.fields = {
		_id: {},
    name: {},
    user_id: {},
		status: {}
	};

  StormServer.visibleFields = {
    _id: {},
    name: {},
    user_id: {},
    status: {}
  };

  StormServer.adminFields = {
    _id: {},
    name: {},
    user_id: {},
    status: {}
  };


  StormServer.runTopology = function(cb)
  {
    db.collection('topologies', function(error, collection) {
      if (error){return cb(error)}
      collection.count({status:{$ne:'deleted'}}, cb);
    });
  }


	return StormServer;

};

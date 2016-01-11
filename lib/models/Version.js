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
  var COL = 'versions';

	var Version = function(values) {
    if(values) {
      for(var k in values) {
        this[k] = values[k];
      }
    }
  };

  Version.fields = {
		_id: {},
    module_id: {},
    name:{},
    user_id: {},
    language:{},
		created_at: {},
    type:{}
	};

  Version.modelize = function(obj){
    return obj ? new Version(obj) : obj;
  };

  Version.getCollection = function()
  {
    return db.collection(COL);
  };

  Version.findById = function(id,cb) {
    db.collection(COL).findOne({ _id: ObjectID.createFromHexString(id)}, function (error, version) {
      return cb(error,Version.modelize(version));
    });
  };

  Version.createEpsilon = function (module,cb)
  {
    var newVersion = new Version({
      module_id: module._id,
      name: module.name,
      user_id: module.user_id,
      type:'epsilon',
      created_at: new Date(),
      language: module.language,
      sourceType: module.sourceType,
      sourceCode: module.sourceCode
    });
    newVersion.create(cb);
  };

  Version.createCommit = function(module,cb)
  {
    var newVersion = new Version({
      module_id: module._id,
      name: module.name,
      user_id: module.user_id,
      type:'commit',
      created_at: new Date(),
      language: module.language,
      fields: module.container.fields,
      libraries: module.container.libraries,
      sourceType: module.sourceType,
      sourceCode: module.sourceCode,
      codeURL: module.container.codeURL
    });
    newVersion.create(cb);
  };

  Version.prototype = {
    getId: function () {
      return this._id;
    },
    create: function (cb) {
      db.collection(COL).insert(this,cb);
    }
  };

	return Version;

};

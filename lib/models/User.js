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

bcrypt = require('bcrypt');
var email = require('../utils/email');

exports.init = function(db) {

  var ObjectID = require('mongodb').ObjectID;
  var config = require('konphyg')(process.cwd()+"/config");
  var COL = 'users';
  var latch = require('latch-sdk');

  latch.init({ appId: config('latch').id, secretKey: config('latch').secret });

  var User = function(values,visible) {
		if(values) {
      if (visible)
      {
        if (visible =='admin' )
        {
          for(var k in User.adminFields) {
            this[k] = values[k];
          }
        }
        else
        {
          for(var k in User.visibleFields) {
            this[k] = values[k];
          }
          if (!this.email_visibility)
          {
            this.email= ''
          }
          this.latch = !!this.latch;
        }

      }
      else
      {
        for(var k in User.fields) {
          this[k] = values[k];
        }
      }
		}
	};
	
	User.fields = {
		_id: {},
		name: {},
		email: {},
		password: {},
		created_at: {},
    updated_at: {},
		debug_runs: {},
		public_runs: {},
    status:{},
    role:{},
    sourceType:{},
    timezone:{},
    firstname:{},
    surname:{},
    organization:{},
    web: {},
    email_visibility:{},
    authKey:{},
    modules_count:null,
    topologies_count:null,
    modules_rate:null,
    tools:[],
    running_topologies_capacity:{},
    latch: null,
    parallelism:false,

    // attribute accessors
		password_confirmation: {},
    email_notifications:true,
    twitter:{}
	};

  User.visibleFields = {
    _id: {},
    name: {},
    email: {},
    created_at: {},
    updated_at: {},
    debug_runs: {},
    public_runs: {},
    status:{},
    role:{},
    sourceType:{},
    timezone:{},
    firstname:{},
    surname:{},
    organization:{},
    email_visibility:{},
    web:{},
    latch:null,
    running_topologies_capacity:{},
    modules_count:null,
    topologies_count:null,
    modules_rate:null,
    parallelism:false,
    email_notifications:true,
    twitter:{}

  };

  User.adminFields = {
    _id: {},
    name: {},
    email: {},
    created_at: {},
    debug_runs: {},
    public_runs: {},
    status:{},
    role:{},
    timezone:{},
    firstname:{},
    sourceType:{},
    surname:{},
    email_visibility:{},
    organization:{},
    web:{},
    running_topologies_capacity:{},
    modules_count:null,
    topologies_count:null,
    modules_rate:null,
    tools:[],
    latch: null,
    parallelism:false,
    email_notifications:true,
    twitter:{}

  };


  User.modelize = function(obj){
    return obj ? new User(obj) : obj;
  };

  User.getCollection = function()
  {
    return db.collection(COL);
  };

  /**
	 * Use this in your logout action
	 */
	User.clear_session = function(req) {
		req.session.user_id = null;
    delete req.session.returnTo;
	};
	
	
	/**
	 * Default error callback, add a flash and redirect to login page
	 */
	User.failed = function(req, res, message) {
		req.flash('error', message);
		res.redirect('/sessions/signin');
	};

	User.create = function(values, cb, errb) {
		var errors = []; // might return [, , ]
		var reg_email = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
		var reg_name = /^[^ \/\\]{1,20}$/;

		if(values.password.length < 5) { errors.push("password too short"); }
		if(values.password_confirmation != values.password) { errors.push("passwords are not equal"); }
		delete values["password_confirmation"];
		if(!reg_name.test(values.name)) { errors.push("username not valid"); }
		if(!reg_email.test(values.email)) { errors.push("email not valid"); }

		db.collection('users', function(err, collection) {
			collection.findOne({name: values.name}, function(err, user) {
				if(err) {errb(err); return; }
				if(user) { errors.push("username already taken"); }
				collection.findOne({email: values.email}, function(err, user) {
					if(err) {errb(err); return; }
					if(user) { errors.push("email already registered"); }
					if(errors.length > 0) { cb(errors, null); return; }
					collection.insert(values, function(err, docs) {
						if(err) {errb(err); return; }
						cb(errors, docs[0]);
					});
				});
			});
	  });
	};


	/**
	 * For use in your login action
	 */
	User.authenticateWith = function(username, password, req, res, cb, errb) {
		User.login(username, password, function(user) {
			req.session.user_id = user.getId();
      if (config("latch").enabled)
      {
        user.checkLatch(function(result){
          if (!result) {return errb({result:"error",message:"Access blocked by Latch"});}
          cb(user);
        });
      }
      else
      {
        cb(user);
      }
		}, function(err) {
			errb(err);
		});
	};

	/**
	 * Authenticate a request against this authentication instance.
	 * @return
	 */
	User.authenticate = function(req, res, cb, errorCallback) {

		var errb = function(err) {
			if(errorCallback) {
				errorCallback(err);
			}
			else {
				self.failed(req, res, "Not logged in !");
			}
		};

		var self = this;
		var user_id = req.session.user_id;
		if(user_id) {
			User.findById(user_id, function(user) {
				req.session.user_id = user.getId();
				cb(user);
			}, function(err) {
				req.session.user_id = null;
				if(errb) {
					errb(err);
				}
				else {
					self.failed(req, res, err.message);
				}
			});
			return;
		}


		// From Basic Auth
	   if (req.headers['authorization']) {
			var auth = this._decodeBase64(req.headers['authorization']);
			if(auth) {
	      	User.login(auth.username, auth.password, function(user) {
					cb(user);
				}, function(err) {
					if(errb) {
						errb(err);
					}
					else {
						self.failed(req, res, err.message);
					}
				});
				return;
			}
	  	}

		errb({message: "Not logged in !"});
	};


	/**
	 * Internal method for extracting username and password out of a Basic
	 * Authentication header field.
	 *
	 * @param headerValue
	 * @return
	 */
	User._decodeBase64 = function(headerValue) {
	    var value;
	    if (value = headerValue.match("^Basic\\s([A-Za-z0-9+/=]+)$")) {
	        var auth = (new Buffer(value[1] || "", "base64")).toString("ascii");
	        return {
	            username : auth.slice(0, auth.indexOf(':')),
	            password : auth.slice(auth.indexOf(':') + 1, auth.length)
	        };
	    }
	    return null;
	};

	User.findByName = function(name, cb, errb) {
		db.collection('users', function(error, user_collection) {
			user_collection.findOne({name: name}, function(error, user) {
				cb(new User(user));
			});
		});
	};

	User.findById = function(user_id, cb, errb) {
		var self = this;
		db.collection('users', function(err, collection) {
			if(err) {errb(err); return; }
			collection.find({_id: new ObjectID(user_id) } , function(err, cursor) {
				if(err) {errb(err); return; }
			   cursor.toArray(function(err, results) {
					if(err) {errb(err); return; }
					if(results.length === 0) {errb({message: "username or email not found"}); return; }
					var user = results[0];
					cb( new User(user) );
				});
			});
		});
	};

  User.login = function(username, password, cb, errb) {
		var self = this;
    var collection = db.collection('users');
		collection.findOne({ $or : [ { name : username } , { email : username } ] } , function(err, user) {
      if(err) {return errb(err);  }
      if(!user) {return errb({message: "Username and/or Password Invalid"});  }
      if (user.status && user.status !== 'active')
      {
        return errb({message: "Username and/or Password Invalid"});
      }
      bcrypt.compare(password, user.password, function(err,res) {
        if (err) {
          errb(err);
          return;
        }
        if (!res) {
          var conf = config('sinfonier');
          var setUpdate = {};
          var needsUpdate = false;
          var callback = cb;
          if (!conf.unblockable || conf.unblockable.indexOf(user.name) < 0) {
            setUpdate['$inc'] = {login_tries: 1};
            needsUpdate = true;
          }
          var tries = user.login_tries || 1;
          if (tries >= 5 && (!user.status || !(user.status == "blocked"))) {
            setUpdate['$set'] = {status: "blocked"};
            needsUpdate = true;
          }
          if (needsUpdate) {
            collection.update({_id: user._id}, setUpdate, function (err) {
              if (tries >= 2) {
                var text = "Too many authentication failures for your account. It has been blocked for your security. Please contact with administrators";
                Notification.send(user.email, "Sinfonier. Your account has beeen blocked", text, text, {name: user.name}, function () {
                  return errb({message: "Username and/or Password Invalid"});
                });
              }
              else {
                return errb({message: "Username and/or Password Invalid"});
              }
            });
          }
          else {
            return errb({message: "Username and/or Password Invalid"});
          }

        } else {
          user.login_tries = 0;
          user.last_login = new Date();
          collection.update({_id: user._id}, {$set: {login_tries: 0, last_login:user.last_login}}, function (err) {
            cb(new User(user));
          });
        }
      });
    });
	};

  User.findByEmail = function(email, cb) {
    User.getCollection().findOne({email: email } , function(err, user) {
      cb(err,User.modelize(user));
    });
  };

  //Find all admins
  User.findAdmins = function(cb) {
    db.collection('users').find({role: 'admin' }).toArray(cb);
  };

  //Find all admins
  User.findWithTool = function(moduleName,cb) {
    db.collection('users').find({tools: {$in: [moduleName]} }).toArray(cb);
  };

  //Find all admins
  User.updateToolName = function(oldName, newName, cb) {
    db.collection('users', function(err, collection) {
      if(err) {cb(err); return; }
      collection.update({tools: {$in: [oldName]}},{$set: {'tools.$':newName}},{multi:true}, cb);
    });
  };


  //Find all
  User.findAll = function(ids,cb) {
    db.collection('users', function(err, collection) {
      if(err) {cb(err); return; }
      collection.find({_id: {$in: ids} } , cb);
    });
  };

  //Find more rated users
  User.topRated = function(limit, cb) {
    db.collection('users').find({$query:{status: {$ne: 'deleted'}}, $orderby:{modules_rate:-1}},{limit:limit}).toArray(cb);
  };

  User.getById = function(user_id, cb) {
    db.collection('users').findOne({_id: new ObjectID(user_id) } , function(err, user) {
      cb (err, User.modelize(user));
    });
  };


  User.prototype = {

    save: function(cb){
      User.getCollection().save(this, {safe:true},cb);
    },

    getId: function () {
      return this._id;
    },

    isAdmin: function () {
      return this.role == 'admin';
    },
    isDev: function () {
      return this.role == 'dev';
    },
    managesParallelism: function () {
      return !!this.parallelism;
    },

    setAuthKey: function (authKey, cb) {
      db.collection('users').update({_id: this._id}, {$set: {authKey: authKey}}, cb);
    },

    setPassword: function (password, cb) {
      var self = this;
      db.collection('users', function (err, collection) {
        if (err) { return  cb(err); }
        bcrypt.genSalt (10, function(err, salt) {
          bcrypt.hash ( password, salt, function (err, hash) {
            if (err)  {return next(err)};
            collection.update({_id: self._id}, {$set: {password: hash}}, cb);
          });
        });
      });
    },

    recalculateRate: function (cb) {
      var self = this;
      db.collection('modules', function (err, collection) {
        if (err) { return  cb(err); }
        collection.find({user_id: self._id, status:{$ne:'deleted'}, rating:{$exists: true} } , function(err, cursor) {
          if(err) {return cb(err);  }
          cursor.toArray(function(err, results) {
            if (err) {
              return cb(err);
            }

            if (results.length === 0) {
              self.modules_rate = 0
            }
            else {
              var sum = results.reduce(function (a, b) {
                return a + b.rating;
              }, 0);
              self.modules_rate = Math.round(sum/results.length);
            }

            db.collection('users', function (err, collection) {
              if (err) { return cb(err);}
              collection.update({_id: self._id},{$set: {modules_rate:self.modules_rate}},function (err){
                cb(err);
              });
            });
          });
        });
      });
    },

    recalculateModules: function (cb) {
      var self = this;
      db.collection('modules', function (err, collection) {
        if (err) { return  cb(err); }
        collection.count({user_id: self._id, status:{$ne:'deleted'} } , function(err, total) {
          if(err) {return cb(err);  }
          db.collection('users', function (err, collection) {
            if (err) { return cb(err);}
            collection.update({_id: self._id},{$set: {modules_count:total}},function (err){
              cb(err);
            });
          });
        });
      });
    },

    recalculateTopologies: function (cb) {
      var self = this;
      db.collection('topologies', function (err, collection) {
        if (err) { return  cb(err); }
        collection.count({user_id: self._id, status:{$ne:'deleted'} } , function(err, total) {
          if(err) {return cb(err);  }
          db.collection('users', function (err, collection) {
            if (err) { return cb(err);}
            collection.update({_id: self._id},{$set: {topologies_count:total}},function (err){
              cb(err);
            });
          });
        });
      });
    },


    incModuleCounter: function (cb) {
      var self = this;
      self.recalculateModules(function(err){
        if (err) { return cb(err);}
        self.recalculateRate(cb);
      });
    },
    decModuleCounter: function (cb) {
      var self = this;
      self.recalculateModules(function(err){
        if (err) { return cb(err);}
        self.recalculateRate(cb);
      });
    },

    incTopologiesCounter: function (cb) {
      var self = this;
      self.recalculateTopologies(cb);
    },

    decTopologiesCounter: function (cb) {
      var self = this;
      self.recalculateTopologies(cb);
    },

    updateCounters: function (cb) {
      var self = this;
      db.collection('users', function (err, collection) {
        if (err) {
          cb(err);
          return;
        }
        var topologies_count = 0;
        db.collection('topologies', function (err, tCol) {
          if (err) {
            return cb(err);
          }
          tCol.count({  user_id: self._id }, function (error, count) {
            topologies_count = count;
            collection.update({_id: self._id}, {$set: {topologies_count: password}}, cb);
          });

        });
      });
    },

    addTool: function(moduleName,cb) {
      var self = this;
      db.collection(COL, function (err, collection) {
        if (err) { return cb(err);}
        collection.update({_id: self._id},{$addToSet: {tools:moduleName}},function (err) {
          if (err) return cb(err);
          if (!self.tools)
          {
            self.tools = [];
          }
          self.tools.push(moduleName);
          cb(err);
        });
      });
    },

    removeTool: function(moduleName,cb) {
      var self = this;
      db.collection(COL, function (err, collection) {
        if (err) { return cb(err);}
        collection.update({_id: self._id},{$pull: {tools:moduleName}},function (err) {
          if (err) return cb(err);
          if (self.tools)
          {
            self.tools.splice(self.tools.indexOf(moduleName), 1);
          }
          cb(err);
        });
      });
    },


    isTool: function(module) {
      return (this["tools"] && this["tools"].indexOf(module.name) >= 0);
    },

    //Module or topology
    isOwner: function(module) {
      return (this._id.equals(module.user_id));
    },

    //Module or topology
    canExport: function(module) {
      return (this.isAdmin() || this.isOwner(module) || module.status === 'published');
    },

    //Compare with other user
    equals: function(user) {
      return (this._id.equals(user._id));
    },
    allowedSourceType: function(sourceType) {
      return 'All' === this.sourceType || this.sourceType === sourceType;
    },

    saveLatchId: function(id,cb) {
      var self = this;
      db.collection(COL).update({_id: self._id},{$set:{latch:id}},cb);
    },
    removeLatchId: function(cb) {
      var self = this;
      db.collection(COL).update({_id: self._id},{$unset:{latch:''}},cb);
    },

    pairLatch: function(key, cb) {
      var self = this;
      var pairResponse = latch.pair(key, function(error,data) {
        if (error) {return cb(error);}
        if (data["data"]["accountId"]) {
          self.saveLatchId(data["data"]["accountId"], cb);
        } else if (data["error"]) {
          var message = "There has been an error with Latch, try again";
          cb({ result:"error", message: message, description: message });
        }
      });
    },

    unpairLatch: function(key, cb) {
      var self = this;
      var pairResponse = latch.unpair(self.latch, function(error,data) {
        if (error) {return cb(error);}
        if (data["error"]) {
          var message = "There has been an error with Latch, try again";
          cb({ result:"error", message: message, description: data.error["message"] });
        }
        else
        {
          self.removeLatchId(cb);
        }
      });
    },


    checkLatch: function(cb) {
      var self = this;
      if (self.latch)
      {
        var statusResponse = latch.status(self.latch, function(error,res) {
          if (error) { return cb(false); }
          var key = self.latch.substring(0,20);
          if (res && res.data && res.data.operations)
          {
            for (x in res.data.operations)
            {
              return cb(res.data.operations[x].status === 'on');
            }
          }
          else
           return cb(false);
        });
      }
      else cb(true);
    }
  };


	return User;

};

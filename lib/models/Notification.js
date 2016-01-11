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

var emailer = require('../utils/email');
var async = require('async');
var restler = require('restler');
var util = require('../utils/util');

exports.init = function(db) {

  var COL = 'notifications';
  var fileExtensions = {
    java: "java",
    python: "py"
  };

  var Notification = function(values) {
    if(values) {
      for(var k in values) {
        this[k] = values[k];
      }
    }
  };

  Notification.fields = {
    _id: {},
    email: {},
    subject:{},
    text: {},
    html:{},
    params: {},
    created_at: {}
  };

  Notification.modelize = function(obj){
    return obj ? new Notification(obj) : obj;
  };

  Notification.getCollection = function()
  {
    return db.collection(COL);
  };


  Notification.send = function (email,subject,text,html,params,cb)
  {
    var newNotification = new Notification({
      email: email,
      subject: subject,
      text: text,
      html:html,
      params: params,
      created_at: new Date()
    });
    newNotification.send(cb);
  };


  Notification.sendSourceChangeNotifications = function(req,module,type,callback) {
    var subject, detailUrl, approveUrl,denyUrl,text,html,params;
    if (type === 'sourcechange') {
      subject = "Sinfonier. Module " + module.name + " has changed source code";
      detailUrl = util.rootUrl(req) + "modules/" + module.name;
      approveUrl = detailUrl + "/approvesource";
      denyUrl = detailUrl + "/denysource";
      text = "Module " + module.name + " has changed source code. Approve it using this link" + approveUrl + "\n";
      html = "Module <a href='" + detailUrl + "'>" + module.name + "</a> has changed source code. Approve it using this link<br><a Href='" + approveUrl + "'>Approve</a>" +
          "<br>Deny it using this link<br><a Href='" + denyUrl + "'>Deny</a>";

      params = {type: 'Source change'};
    } else {
      subject = "Sinfonier. Module "+module.name+" validation request";
      detailUrl = util.rootUrl(req)+"modules/"+module.name;
      var userUrl = util.rootUrl(req)+"users/"+req.current_user.name;
      var fullText = "We inform you that the user <USER> has requested validation for the module <MODULE>. You can set it to private status by clicking the following URL: <URL>";
      text = fullText.replace("<URL>",detailUrl);
      text = text.replace("<USER>",req.current_user.name);
      text = text.replace("<MODULE>",module.name);
      html = fullText.replace("<URL>","<br><a href='"+detailUrl+"'>"+detailUrl+"</a><br>").replace(/\n/g,"<br>");
      html = html.replace("<USER>","<a href='"+userUrl+"'>"+req.current_user.name+"</a>");
      html = html.replace("<MODULE>","<a href='"+detailUrl+"'>"+module.name+"</a>");
      params = {name:'administrator', type:'Validation'};
    }

    async.series([  function (callback) {
      var filename = module.name+"."+fileExtensions[module.language.toLowerCase()];
      if (module.sourceType === 'Gist')
      {
        restler.get(module.container.codeURL+'/raw').on('timeout', function(ms){
          console.log('did not return within '+ms+' ms');
          callback();
        }).on('complete', function(data,response) {
          if (response.statusCode <= 201) {
            params.attachments = [{'filename': filename,'content':data}];
          }
          callback();
        });
      }
      else
      {
        params.attachments = [{'filename': filename,'content':module.sourceCode}];
        callback();
      }
    }, function (callback) {
      User.findAdmins(function (error, users) {
        if (error) {
          callback(error);
        }
        var arrFunctions = [];
        users.forEach(function (user) {
          arrFunctions.push((function () {
            return function (callback) {
              Notification.send(user.email, subject, text, html, params, callback);
            };
          })());
        });
        async.parallel(arrFunctions, callback);
      });
    }
    ],callback);


  };


  Notification.findByUser = function(user,cb){
    Notification.getCollection().find({email:user.email}).toArray(cb);
  };

  Notification.findByEmail = function(email,cb){
    Notification.getCollection().find({email:email}).toArray(cb);
  };

  Notification.prototype = {
    getId: function () {
      return this._id;
    },
    create: function (cb) {
      db.collection(COL).insert(this,cb);
    },
    send: function (cb) {
      var self = this;
      this.create(function (error){
        if (cb && error){return cb(error);}
        User.findByEmail(self.email,function(error,user){
          if (cb && error){return cb(error);}
          if (user && user.email_notifications) {
            emailer.sendMail(self.email, self.subject, self.text, self.html, self.params);
            console.log("mail sent to " + self.email + ", subject: " + self.subject);
          }
          if (cb) {
            cb();
          }
        });
      });
    }
  };

  return Notification;

};

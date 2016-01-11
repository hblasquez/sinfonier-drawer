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
var config = require('konphyg')(process.cwd()+"/config");

exports.expressRoutes = function(app) {

  // store the user collection into req.user_collection
  function get_invitation_collection(req, res, next) {
    app.db.collection('invitations', function(error, invitation_collection) {
      if(error) { throw error; }
      req.invitation_collection = invitation_collection;
      next();
    });
  }

  // store the user collection into req.user_collection
  function checkUnusedEmail(req, res, next) {
    User.findByEmail(req.body.email, function(err, user) {
      if (err) { throw err;  }
      if (user) {
        errors.addError(req,req.body.email,"user already exists !");
      }
      next();
    });
  }

  // Invitation form
  app.get('/invitations/new', app.require_admin, function(req, res){

    res.render('invitations/new', {
      locals: {
        title: "invitations",
        action: "invite",
        user: req.current_user,
        errors: []
      }
    });
  });

  // Create an invitation
  app.post('/invitations', app.require_admin,get_invitation_collection,checkUnusedEmail, function(req, res) {

    var errHandler = function(err)
    {
      req.flash('error', err);
      res.redirect('/invitations/new');
    }

    var errors = req.validationErrors();
    if (errors) {
      return errHandler(errors[0].msg);
    }
    if (!req.body.email)
    {
      return errHandler("email required");
    }
    else
    {
      if (!validator.isEmail(req.body.email))
      {
        return errHandler("must be a valid email ");
      }
      var d = new Date();
      var invitation = {
        user_id: req.current_user._id,
        created_at: d,
        authKey: hat(),
        accepted: false,
        email: req.body.email
      }

      req.invitation_collection.insert(invitation, function(error, docs) {
        var url = config('sinfonier').rootUrl+"register?email="+encodeURIComponent(invitation.email)+"&authKey="+invitation.authKey;

        var fullText = "We are glad to inform you that you have been invited to join Sinfonier Project. You can fulfill your registration by clicking the following URL: <URL>\n\n"+
            "Faithfully,\n"+
            "Sinfonier Drawer.\n";
        fullText = fullText.replace("<EMAIL>",invitation.email);
        var text = "Dear "+invitation.email+",\n"+fullText.replace("<URL>",url);
        var html = fullText.replace("<URL>","<a href='"+url+"'>"+url+"</a><br>").replace(/\n/g,"<br>");



        email.sendMail(invitation.email,"You are invited to Sinfonier",text,html,{name:invitation.email,type:'Invitation'});
        req.flash('info', "Invitation email has been sent to "+invitation.email);
        res.redirect('/invitations/new');
      });
    }

  });

};
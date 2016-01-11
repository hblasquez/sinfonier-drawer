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
var config = require('konphyg')(process.cwd()+"/config");

exports.expressRoutes = function(app) {
	
	// Sign In page
	app.get('/sessions/signin', function(req, res){
		res.render('sessions/signin', {
      	locals: { title: 'Sign In', action: 'signin' }
   	});
	});

	// Login action
	app.post('/sessions/signin', function(req, res){
		User.authenticateWith( req.param("username"), req.param("pass"), req, res, function(user) {
      if (req.session.returnTo)
      {
        res.redirect(req.session.returnTo);
        req.session.returnTo = undefined;
      }
      else {
        res.redirect('/dashboard');
      }
		}, function(err) {
			req.flash('error', err.message);
			res.redirect('/sessions/signin');
		});
	});

  app.get('/sessions/restorepass', function(req, res) {
    res.render('sessions/restorepassword', {
      locals: { title: 'Restore password', action: 'restorepass' }
    });
  });

  // Send mail for restoring password
  app.post('/sessions/restorepass', function(req, res) {

    var errHandler = function(err)
    {
      req.flash('error', err);
      res.redirect('/sessions/restorepass');
    }
    if (!req.body.email)
    {
      return errHandler("email required");
    }
    else
    {

      User.findByEmail(req.body.email, function(err, user) {
        if (err) { return errHandler("email not found"); }
        if (!user)
            return errHandler("email not found");
          var hat = require('hat');
          var authKey = hat()
          user.setAuthKey(authKey,function(error){
            if (error) { return errHandler(error) }
            var url = config('sinfonier').rootUrl+"sessions/changepass?email="+encodeURIComponent(user.email)+"&authKey="+authKey;
            email.sendMail(user.email,"Sinfonier. Password restore",url,"You have received this email because someone has requested the change of your password in Sinfonier: <a Href='"+url+"'>change password</a>",{name:user.name,type:'Restore password'})
          });
          req.flash('info', "email has been sent");
          res.redirect('/sessions/restorepass');
         });
    }

  });

  app.get('/sessions/changepass', function(req, res) {
    res.render('sessions/changeauthpassword', {
      locals: { title: 'Change password', action: 'changepass', email: req.query.email, authKey: req.query.authKey }
    });
  });

  // Change password
  app.post('/sessions/changepass', function(req, res) {

    var errHandler = function(err)
    {
      req.flash('error', err);
      res.redirect('/sessions/changepass?email='+req.body.email+"&authkey="+req.body.authkey);
    }
    var pass = req.body.pass;
    var pass2 = req.body.pass2;
    if (!req.body.email || !req.body.authkey)
    {
      return errHandler("email and authorization key required");
    }
    else if (pass != pass2)
    {
      return errHandler("passwords must be identical");
    }
    else if (pass.length < 8)
    {
      return errHandler("Password must have at least 8 characters");
    }
    else
    {

      User.findByEmail(req.body.email, function(err, user) {
        if (err) { return errHandler(err.message); }
        if (!user)
          return errHandler("email not found");
        var authKey = req.body.authkey;
        if (authKey != user.authKey)
        {
          return errHandler("invalid authorization key");
        }
        user.setAuthKey(null,function(error){
          if (error) { return errHandler(error) }
          user.setPassword(pass,function(error){
            if (error) { return errHandler(error) }
            req.flash('info', "password has been changed");
            res.redirect('/sessions/signin');
          });
        });

      } );
    }

  });


  // logout
	app.get('/sessions/logout', function(req, res){
		req.flash('info', 'See you later...');
		User.clear_session(req);
    res.redirect('/sessions/signin');
	});


  // Pair with latch [ https://latch.elevenpaths.com/ ]
  app.post('/sessions/pairLatch.json',app.require_login, function(req, res){
    req.current_user.pairLatch(req.param("key"), function(error){
      if (error) {
        return res.status(422).json(error);
      }
      res.json({result: "ok"});
    });
  });

  // Unpair with latch [ https://latch.elevenpaths.com/ ]
  app.post('/sessions/unpairLatch.json',app.require_login, function(req, res){
    req.current_user.unpairLatch(req.current_user.latch, function(error){
      if (error) {
        return res.status(422).json(error);
      }
      res.json({result: "ok"});
    });
  });


};
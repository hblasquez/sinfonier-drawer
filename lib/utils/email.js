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

var nodemailer = require("nodemailer");
var transport = require("nodemailer-smtp-transport");
var config = require('konphyg')(process.cwd()+"/config");
var ejs = require('ejs');
var smtpTransport = null;
var fs = require('fs');
var util = require('./util');
var kue = require('kue')
    , jobs = kue.createQueue({
          redis: config("redis")
        }
    );

var prepareHtml = function (html,parameters,cb) {
  var outputHtml = html;
  outputHtml = util.replaceAll("<a href=","<a style=\"color: #ff6633; display: inline; text-decoration: none;\" href=",outputHtml);
  outputHtml = util.replaceAll("<a Href=","<a style=\"color: #FFFFFF; display: block; text-decoration: none; text-align: center; font-size: 16px; width:150px; margin-left: auto; margin-right: auto; font-weight: bold; background-color: #ff6633; padding: 10px;\" href=",outputHtml);
  var filename = process.cwd()+"/lib/views/templates/mail.ejs";
  fs.readFile(filename, 'utf-8', function(error, content) {
    if (error) {
      cb(error);
    }
    try {
      outputHtml = ejs.render(content, {
        locals: {
          name: parameters['name'] || 'user',
          type: parameters['type'] || '',
          url: config("sinfonier").rootUrl,
          filename: filename,
          content: outputHtml
        }
      });
    } catch (ex) {
      outputHtml = "Error in your template: " + ex.message;
    }
    cb(outputHtml);
  });
  }

var sendMail = function (email,subject,text,html,params,cb) {
  var parameters = params || {};
  prepareHtml(html,parameters,function(outputHtml){
// create reusable transport method (opens pool of SMTP connections)
    if (!smtpTransport) {
      smtpTransport = nodemailer.createTransport(transport(config("sinfonier").email.connection));
    }
    // setup e-mail data with unicode symbols
    var mailOptions = {
      from: config("sinfonier").email.from, // sender address
      to: email, // list of receivers
      subject: subject, // Subject line
      text: text, // plaintext body
      html: outputHtml // html body
    }

    if (params.attachments)
    {
      mailOptions.attachments = params.attachments;
    }
    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function (error, response) {
      if (error) {
        console.log(error);
        cb(error);
      } else {
        console.log("Message sent: " + response.response);
        cb();
      }

      // if you don't want to use this transport object anymore, uncomment following line
      //smtpTransport.close(); // shut down the connection pool, no more messages
      //smtpTransport = null;
    });

  });

}

var scheduleMail = function (email,subject,text,html,params) {
  var parameters = params || {};
  var job = jobs.create('email', {
      email:email
    , subject: subject
    , text: text
    , html: html
    ,  params: params
  });

  job.on('complete', function(){
    console.log("Job complete");
  }).on('failed', function(){
    console.log("Job failed");
  }).on('progress', function(progress){
    process.stdout.write('\r  job #' + job.id + ' ' + progress + '% complete');
  });

  job.attempts(5).save();
}

jobs.process('email', 20, function(job, done){

  sendMail(job.data.email,job.data.subject,job.data.text,job.data.html, job.data.params, done);
});

exports.sendMail = scheduleMail;

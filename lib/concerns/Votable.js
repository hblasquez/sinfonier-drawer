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

var async = require('async');
var htmlStr = require('html-strings');

var vote =  function (votation,cb) {
  var user = votation.user;
  var msg = votation.msg;
  var value = votation.value;

  var self = this;
  if (!self.rates) {
    self.rates = [];
  }
  var d = new Date();
  var rate = null;
  var code = 201;
  for (var i = 0; i < self.rates.length; i++) {
    if (self.rates[i].user_id.equals(user._id)) {
      rate = self.rates[i];
      code = 200;
      break;
    }
  }
  if (!rate) {
    rate = {};
    rate.created_at = d;
    self.rates.push(rate);
  }

  rate.user_id = user._id;
  rate.user_name = user.name;
  rate.value = value;
  if (msg) {
    msg = htmlStr.escape(msg);
    if (rate.message)
      rate.message = rate.message + "\n" + msg;
    else
      rate.message = msg;
  }
  rate.updated_at = d;

  var sum = self.rates.reduce(function (a, b) {
    return a + b.value;
  }, 0);

  self.rating = Math.round(sum / self.rates.length);

  self.save(function(error){
    cb(error,rate);
  });

}
exports.vote = vote;

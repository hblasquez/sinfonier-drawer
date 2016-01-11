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

 exports.expressRoutes = function(app) {

	var crypto = require('crypto');

	app.locals.gravatar = function(email, s) {
			var emailMD5 = crypto.createHash('md5').update(email).digest("hex");
			if(!s) { s = 48; }
			return '<img src="http://www.gravatar.com/avatar/'+emailMD5+'?s='+s+'" class="gravatar"/>';
		};

};

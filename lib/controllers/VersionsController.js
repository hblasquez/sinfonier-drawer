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

  app.get('/versions/:id', function(req, res){

      Version.findById(req.param('id'),function(error,version){
        if (error) { throw error;}
        if (!req.current_user.isOwner(version) && !req.current_user.isAdmin())
        {
          return res.render('403', { status: 403, locals: {  title: 'Not allowed', action: 'error' }});
        }

        if (!version) {
          return res.render('404', { status: 404, locals: {  title: 'NotFound', action: 'error' }});
        }
        res.render('versions/show', {
          locals: {
            title: "versions",
            action: "modules",
            module: version
          }
        });
      });
  });

};
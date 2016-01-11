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

var xmlutils = require('./utils/xmlutils.js');

var mydef  = {
    "name": "TweetIt",
    "category": "Drains",
    "container": {
        "type":"drain",
        "brandIcon":"/images/module_icons/Twitter_75x75.png",
        "icon": "/images/icons/drain.png",
        "xtype": "WireIt.FormContainer",
        "title": "TweetIt",
        "description":"Tweets the content of a json's given field",
        "attributes": {"abstractionId":"tweetit","class":"com.sinfonier.drains.TweetIt"},
        "fields": [
            {
                "type": "string",
                "name": "consumerKey",
                "wirable": false,
                label: "Consumer Key"
            },
            {
                "type": "string",
                "name": "consumerSecret",
                "wirable": false,
                label: "Consumer Secret"
            },
            {
                "type": "string",
                "name": "accessToken",
                "wirable": false,
                label: "Access Token"
            },
            {
                "type": "string",
                "name": "accessTokenSecret",
                "wirable": false,
                label: "Access Token Secret"
            },
          { "type": "string", "name": "fieldToTweet", "wirable": false, label: "Field to tweet"},
          { "type": "string", "name": "customText", "wirable": false, label: "Your text"}
        ],
        "terminals": [
            {"name": "in[]", "direction": [0, -1], "offsetPosition": [82, -15], "ddConfig": {
                "type": "input",
                "allowedTypes": ["output"],
                "grouping":"shuffle"
            },
                "nMaxWires": 5
            }
        ]
    }
};

exports.definition = mydef

exports.run = function(params, cb) {
	
	console.log("HTTP params ");
	console.log(params);
	

    cb( {out: "drain"});

};

exports.xml = function(seq,params, cb, iWires, oWires,modules) {

    console.log("Generating "+mydef.name+" XML with params:");
    console.log(params);
    var res = xmlutils.generateFullObject(mydef,seq,params,iWires,modules);
    cb( res );

};
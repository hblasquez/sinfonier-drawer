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


var mydef   = {
    "name": "Rename",
    "category": "Bolts",
    "container": {
        "type":"bolt",
        "icon": "/images/icons/bolt.png",
        "xtype": "WireIt.FormContainer",
        "title": "Rename",
        "description":"Renames the field specified in \"Field\" by the literal written in \"Replace\"",
        "attributes": {"abstractionId":"rename","class":"com.sinfonier.bolts.Rename"},
        "fields": [
            {"type": "string", "name": "find", "wirable": false,"label":"Find" },
            {"type": "string", "name": "replace", "wirable": false,"label":"Replace" }
        ],
        "terminals": [
            {"name": "in[]", "direction": [0, -1], "offsetPosition": [52, -15], "ddConfig": {
                "type": "input",
                "allowedTypes": ["output"]
            },
                "nMaxWires": 5
            },
        {
            "name": "out",
            "direction": [0, 1],
            "offsetPosition": {
                "left": 52,
                "bottom": -15
            },
            "ddConfig": {
                "type": "output",
                "allowedTypes": ["input"]
            }
        }
        ]
    }
};

exports.definition = mydef;
exports.run = function(params, cb) {
	
	console.log("HTTP params ");
	console.log(params);

    cb( {out: { params: params,
        definition: mydef}
    });


};

exports.xml = function(seq,params, cb,iWires,oWires,modules) {

    console.log("HTTP params ");
    console.log(params);
    var res = xmlutils.generateFullObject(mydef,seq,params,iWires,modules);
    cb( res );

};
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


/**
 * Template using joiner
 */
exports.run = function(params, cb) {
	var error, valid, invalid;
	try {
        var input = params["in"];
        var condition = params["condition"].toString();
        if (condition == "true" )
        {
            valid = input;
            invalid = null;
        }
        else
            invalid = output;
            valid = null;
        result = "";

	} catch(ex) {
		error = ex;
	}
	if(error) {
		console.log(JSON.stringify(error));
		cb( {error: error.message} );
	}
	else {
		cb( {valid: valid} );
        cb( {invalid: invalid});
	}
	
};

var mydef = {
    "name": "ConditionalFields",
    "category": "Operators",
    "container": {
        "type":"bolt",
        "icon": "/images/icons/operator.png",
        "xtype": "WireIt.FormContainer",
        "title": "ConditionalFields",
        "attributes": {"abstractionId":"conditional","class":"com.sinfonier.bolts.ConditionalFields"},
        "description": "Conditional operation between two fields.",
        "fields": [
            {"type": "string", "name": "field1", "wirable": false,"label":"Field" },
            {"type": "select", "name": "operator", "wirable": false,
              label: "Operator",
              "cdata": true,
             "choices": [ ">",">=","<","<=","==","!=","RegexExpression"]
            },
            {"type": "string", "name": "field2", "wirable": false,"label":"Field" }
        ],
        "terminals": [
            {"name": "in[]", "direction": [0, -1], "offsetPosition": [82, -15], "ddConfig": {
                "type": "input",
                "allowedTypes": ["output"]
            },
                "nMaxWires": 5
            },
            {"name": "yes", "direction": [0, 1], "offsetPosition": {"left": 76, "bottom": -15}, "ddConfig": {
                "type": "output",
                "allowedTypes": ["input"]
            }},
            {"name": "no", "direction": [0, 1], "offsetPosition": {"left": 96, "bottom": -15}, "ddConfig": {
                "type": "output",
                "allowedTypes": ["input"]
            }}

        ]
    }
};

exports.definition = mydef;

exports.xml = function(seq,params, cb,iWires,oWires,modules) {

    console.log("HTTP params ");
    console.log(params);
    var res = xmlutils.generateFullObject(mydef,seq,params,iWires,modules);
    cb( res );

};


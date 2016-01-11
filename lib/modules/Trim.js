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
    "name": "Trim",
    "category": "Bolts",
    "container": {
        "type":"bolt",
        "icon": "/images/icons/bolt.png",
        "xtype": "WireIt.FormContainer",
        "title": "IP Location",
        "description":"El objetivo de este [bolt](http://storm.incubator.apache.org/documentation/Concepts.html) es podar los elementos de la entidad para obtener en la salida del mismo una entidad con los elementos indicados. La filosofia puede ser seleccionar los que quieres eliminar (Delete), seleccionar solo los que quieres que continuen (Allow) o combinar ambas opciones",
        "attributes": {"abstractionId":"trim","class":"com.sinfonier.bolts.Trim"},
        "fields": [
            { type: "combine", name:"#", fields:[
                {   "type": "select", "name": "action", "wirable": false, label: " ", "choices" : ["Allows","Deletes"] }
            ],
                separators: [false, "&nbsp; the following fields"]
            },
            {
                "type": "list",
                "name": "fields",
                label:"Fields",
                elementType: {
                    name: "field",
                    type: 'string',
                    label: "Field"
                }
            }
        ],
        "terminals": [
            {"name": "in[]", "direction": [0, -1], "offsetPosition": [80, -15], "ddConfig": {
                "type": "input",
                "allowedTypes": []
            },
                "nMaxWires": 5
            },
        {
            "name": "out",
            "direction": [0, 1],
            "offsetPosition": {
                "left": 80,
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
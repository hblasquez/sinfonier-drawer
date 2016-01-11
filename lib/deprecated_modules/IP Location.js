var xmlutils = require('./../modules/utils/xmlutils.js');


var mydef   = {
    "name": "IP Location",
    "category": "Bolts",
    "container": {
        "type":"bolt",
        "icon": "/images/icons/bolt.png",
        "xtype": "WireIt.FormContainer",
        "title": "IP Location",
        "description": "Gets the geolocation of a given IP",
        "attributes": {"abstractionId":"ipLocation","class":"com.sinfonier.spouts.ip.location"},
        "fields": [  ],
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
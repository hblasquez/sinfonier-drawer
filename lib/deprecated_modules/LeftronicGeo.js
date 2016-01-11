var xmlutils = require('./../modules/utils/xmlutils.js');

var mydef  = {
    "name": "LeftronicGeo",
    "category": "Drains",
    "container": {
        "type":"drain",
        "icon": "/images/icons/drain.png",
        "xtype": "WireIt.FormContainer",
        "title": "LeftronicGeo",
        "description": "Shows in a map of [Leftronic Dashboard](https://www.leftronic.com/) the geolocalized entities given in a json file",
        "attributes": {"abstractionId":"LeftronicGeo","class":"com.sinfonier.drains.leftronicgeo"},
        "fields": [
            {
                "type": "string",
                "name": "accessKey",
                "wirable": true,
                label: "Access Key"
            },
            {
                "type": "string",
                "name": "streamName",
                "wirable": false,
                label: "Stream Name"
            }
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

    console.log("Generating Leftronic Geo XML with params:");
    console.log(params);
    var res = xmlutils.generateFullObject(mydef,seq,params,iWires,modules);
    cb( res );

};
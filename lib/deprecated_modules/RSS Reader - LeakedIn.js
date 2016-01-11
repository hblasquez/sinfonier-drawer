var xmlutils = require('./../modules/utils/xmlutils.js');

var mydef  = {
    "name": "RSS Reader - LeakedIn",
    "category": "Spouts",
    "container": {
        "type":"spout",
        "icon": "/images/icons/spout.png",
        "xtype": "WireIt.FormContainer",
        "title": "RSS Reader - LeakedIn",
        "attributes": {"abstractionId":"rssLeakedIn","class":"com.sinfonier.spouts.rssreader.leakedIn"},
        "hidden": {"URL":"http://feeds.feedburner.com/Leakedin?format=xml"},
        "fields": [ ],
        "terminals": [
            {
                "name": "out",
                "direction": [0, 1],
                "offsetPosition": {
                    "left": 86,
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

exports.definition = mydef

exports.run = function(params, cb) {
	
	console.log("HTTP params ");
	console.log(params);
	

    cb( {out: mydef});

};

exports.xml = function(seq,params, cb, iWires, oWires,modules) {

    console.log("Generating "+mydef.name+" XML with params:");
    console.log(params);
    var res = xmlutils.generateFullObject(mydef,seq,params,iWires,modules);
    cb( res );

};
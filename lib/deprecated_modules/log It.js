var xmlutils = require('./../modules/utils/xmlutils.js');

var mydef  = {
    "name": "log It",
    "category": "Drains",
    "container": {
        "type":"drain",
        "icon": "/images/icons/drain.png",
        "xtype": "WireIt.FormContainer",
        "title": "log It",
        "attributes": {"abstractionId":"logIt","class":"com.sinfonier.drains.logIt"},
        "description": "Writes in the Storm's standard output ",
        "fields": [
            {
                "type": "string",
                "name": "outputPath",
                "wirable": false,
                label: "Output Path"
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

    console.log("Generating logIt XML with params:");
    console.log(params);
    var res = xmlutils.generateFullObject(mydef,seq,params,iWires,modules);
    cb( res );

};
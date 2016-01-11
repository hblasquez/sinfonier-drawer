var xmlutils = require('./../modules/utils/xmlutils.js');

var mydef  = {
    "name": "Torrent Seeds",
    "category": "Spouts",
    "container": {
        "type":"spout",
        "icon": "/images/icons/spout.png",
        "xtype": "WireIt.FormContainer",
        "title": "Torrent Seeds",
        "description":"Gets IP direction of users sharing a Torrent file",
        "attributes": {"abstractionId":"torrentSeeds","class":"com.sinfonier.spouts.torrent.seeds"},
        "fields": [
            {
                "type": "url",
                "name": "torrentURL",
                "wirable": false,
                label: "Torrent URL"
            }
        ],
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
	

    cb( {out: "spout"});

};

exports.xml = function(seq, params, cb, iWires, oWires,modules) {

    console.log("Generating "+mydef.name+" XML with params:");
    console.log(params);
    var res = xmlutils.generateFullObject(mydef,seq,params,iWires,modules);
    cb( res );

};
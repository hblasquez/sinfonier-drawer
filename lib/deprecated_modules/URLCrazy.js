var xmlutils = require('./../modules/utils/xmlutils.js');

var mydef  = {
    "name": "URLCrazy",
    "category": "Spouts",
    "container": {
        "type":"spout",
        "icon": "/images/icons/spout.png",
        "xtype": "WireIt.FormContainer",
        "title": "URLCrazy",
        "description": "Generate domains that constains \"typos\" from a legitimated domain. Every domain generated contains \"typo\" type and could be valid or invalid.",
        "attributes": {"abstractionId":"urlcrazy","class":"com.sinfonier.spouts.urlcrazy"},
        "fields": [
            {  "type": "url", "name": "domain", "wirable": false, label: "Domain" },
            {  "type": "select", "name": "typotype", "wirable": false, label: "Typo Type",
               "choices": ["All","Character Omission","Character Repeat","Adjacent Character Swap","Adjacent Character Replacement",
               "Double Character Replacement","Adjacent Character Insertion","Missing Dot","Strip Dashes",
               "Singular or Pluralise","Common Misspellings","Vowel Swapping","Homophones","Homoglyphs",
               "Wrong Top Level Domain","Wrong Second Level Domain","Bit Flipping"]
            },
            {  "type": "boolean", "name": "valid", "wirable": false, label: "Valid" }
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
	

    cb( {out: { params: params,
                definition: mydef}
        });

};

exports.xml = function(seq, params, cb, iWires, oWires,modules) {

    console.log("Generating "+mydef.name+" XML with params:");
    console.log(params);
    var res = xmlutils.generateFullObject(mydef,seq,params,iWires,modules);
    cb( res );

};
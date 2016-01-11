var config = require('konphyg')(process.cwd()+"/config");
var htmlStr = require('html-strings');

function getCommandUrl(command)
{
  return config('stormserver').url+config('stormserver').commands[command];
}

exports.getCommandUrl = getCommandUrl;

var prepareResponse = function(data,response,cb){
  if (data)
      console.log(data);
  if (response == null)
  {
    return cb({result:'error',description:"Unable to connect to Storm"});
  }
  if (response.statusCode == 201 || response.statusCode == 200) {
    var result = null;
    if (data.indexOf("{") == 0) {
      try {
        result = JSON.parse(data);
      }
      catch (e) {
        result = null;
      }
    }
    else if (response.headers && response.headers["content-disposition"]
        && response.headers["content-disposition"].indexOf("attachment") == 0 )
    {
      var logData = htmlStr.escape(data).replace(/\n/g,"<br>\n");
      result = {result:"success","description":logData};
    }
    if (!result){
      console.log("Invalid response:"+data);
      cb({result:'error',description:"Invalid response:"+data});
    }
    else {
      cb(result);
    }
  }
  else
  {
    cb({result:'error',description:"Response code:"+response.statusCode});
  }
}

exports.prepareResponse = prepareResponse;

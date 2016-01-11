var config = require('konphyg')(process.cwd()+"/config");
var util = require('./util');
var kue = require('kue')
    , jobs = kue.createQueue({
          redis: config("redis")
        }
    );
var restler = require('restler');
var twitterAPI = require('node-twitter-api');

var twitter = null;

var sendTuit = function (message,cb) {


  // unique ids generator
  var configTwitter = config('twitter');
  if (!twitter) {
    var apiConfig = configTwitter.API;
    apiConfig.callback = config('sinfonier').rootUrl;
    twitter = new twitterAPI(apiConfig);
  }

  if (configTwitter.enabled)
  {
    twitter.statuses("update", {
          status: message
        },
        configTwitter.access.token,
        configTwitter.access.secret,
        function(error, data, response) {
          cb(error,data);
        }
    );
  }
  else
  {
    cb();
  }
}

var scheduleTuit = function (message) {
  var parameters = params || {};
  var job = jobs.create('tuits', {
      message: message
  });

  job.on('complete', function(id){
    kue.Job.get(id, function(err, job) {
      job.remove();
    });
    console.log("Job complete");
  }).on('failed', function(){
    console.log("Job failed");
  }).on('progress', function(progress){
    process.stdout.write('\r  job #' + job.id + ' ' + progress + '% complete');
  });

  job.save();
}

jobs.process('tuits', function(job, done){

  sendTuit(job.data.message, done);
});

exports.sendTuit = sendTuit;

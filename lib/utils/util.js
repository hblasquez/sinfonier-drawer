var md = require("node-markdown").Markdown;
var config = require('konphyg')(process.cwd()+"/config");
var fs = require('fs');

function parseMarkdown(description)
{
  var allowedTags = 'a|img';
  var allowedAttributes = {
    'a':'href|style',
    'img': 'src',
    '*': 'title'
  }
  return md(description, true, allowedTags, allowedAttributes);
}

function getRootUrl(req)
{
  //TODO: Take protocol from request not works.
 // return req.protocol + req.headers.host+"/";
  return config('sinfonier').rootUrl;
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

function parseMarkdownToHtml(description)
{
   return parseMarkdown(description).replace(/\n/g,"<br>");
}

function capitalize(string)
{
  return string.charAt(0).toUpperCase() + string.slice(1);
}


var deleteAllFilesInDir = function(dir)
{
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(function (fileName) {
      fs.unlinkSync(dir+'/'+fileName);
    });
  }
}
/*
 * Returns the name without @ or # if present
 */
var twitterBaseName = function (name)
{
  if (name) {
    name = name.trim();
    if (name.indexOf("@") === 0) {
      return name.substring(1);
    }
    else if (name.indexOf("#") === 0) {
      return name.substring(1);
    }
  }
  return name;
}


/*
 * Returns the name with @
 */
var twitterReference = function (name)
{
  if (name) {
    name = name.trim();
    if (name.indexOf("@") === 0) {
      return name;
    }
    else  {
      return "@"+name;
    }
  }
  return name;
}

exports.parseMarkdown = parseMarkdown;
exports.parseMarkdownToHtml = parseMarkdown;
exports.rootUrl = getRootUrl;
exports.replaceAll = replaceAll;
exports.capitalize = capitalize;
exports.deleteAllFilesInDir = deleteAllFilesInDir;
exports.twitterBaseName = twitterBaseName;
exports.twitterReference = twitterReference;



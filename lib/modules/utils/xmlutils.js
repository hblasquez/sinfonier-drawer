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

 var extend = require('util')._extend;
var xmlescape = require('xml-escape');
var config = require('konphyg')(process.cwd()+"/config");

var tagStr =  function(str,tag,props)
{
    var start = "<"+xmlescape(tag)
    var end = ">"+str+"</"+xmlescape(tag)+">";
    var attrs = "";
    if (props)
    {
        for (x in props)
        {
            attrs = attrs + " "+x+"='"+xmlescape(String(props[x]))+"' ";
        }
    }
    return start+attrs+end;
}

var tagEscapedStr =  function(str,tag,props)
{
  return tagStr(str ? xmlescape(str):'',tag,props);
}
exports.tagStr = tagStr;

var textTag = function(tag,params,cdata)
{
    if (cdata && params[tag] && params[tag].length > 0)
    {
        return tagStr("<![CDATA["+params[tag]+"]]>",tag);
    }
    return tagStr(xmlescape(String(params[tag])),tag);
}
exports.textTag = textTag;

var lsTags = function(tags, params)
{
    var res = "";
    for(var j=0;j<tags.length;j++)
    {
        res = res + textTag(tags[j],params);
    }
    return res;
}
exports.lsTags = lsTags;

exports.lsHiddenTags = function(tags)
{
    var res = "";
    if (tags)
    {
        for(x in tags)
        {
            res = res + tagStr(tags[x],x);
        }
    }
    return res;
}
var tagProperties = function(section,params)
{
    var properties = params[section]
    var res = ""
    if (properties && properties.length > 0)
    {
        for(var j=0;j< properties.length;j++)
        {
            res = res + tagEscapedStr(properties[j][1],properties[j][0]);
        }
        res = tagStr(res,section);
    }
    return res;
}
exports.tagListElemValues = tagProperties;

var tagList = function(section,params)
{
  var properties = params[section]
  var res = ""
  if (properties && properties.length > 0)
  {
    for(var j=0;j< properties.length;j++)
    {
      res = res + tagEscapedStr(properties[j],section);
    }
  }
  return res;
}


var tagListFields = function(definition,params)
{

    var elements = definition["elementType"];
    if (!elements)
    {
      return tagList(definition["name"],params);
    }
    var subName = elements["name"];
    if (!subName)
    {
        return tagProperties(definition["name"],params);
    }
    var properties = params[definition["name"]];
    var fields = elements["fields"];
    var res = ""
    if (fields)
    {
        if (properties && properties.length > 0)
        {
            for(var j=0;j< properties.length;j++)
            {
                var content = "";
                for (var i=0;i< fields.length;i++)
                {
                    content = content + tagEscapedStr(properties[j][i],fields[i]["name"]);
                }
                res = res + tagStr(content,elements["name"]);
            }
            res = tagStr(res,definition["name"]);
        }
    }
    else
    {
        if (properties && properties.length > 0)
        {
            for(var j=0;j< properties.length;j++)
            {
                res = res + tagEscapedStr(properties[j],elements["name"]);
            }
            res = tagStr(res,definition["name"]);
        }
    }
    return res;
}
exports.tagListFields = tagListFields;

var tagCombinedFields = function(definition,params)
{


    var properties = params[definition["name"]];
    var fields = definition["fields"];

    var res = ""
    if (properties && properties.length > 0)
    {
        for (var i=0;i< fields.length;i++)
        {
            res = res + tagEscapedStr(properties[i],fields[i]["name"]);
        }
        if (definition["name"] != "#")
            res = tagStr(res,definition["name"]);
    }
    return res;
}
exports.tagCombinedFields = tagCombinedFields;





var getTerminal = function(config,name){
    var terminals = config["container"]["terminals"];
    for (var i=0;i<terminals.length;i++)
    {
        if (terminals[i]["name"] == name)
        {
            return terminals[i];
        }
    }
    return null;
};
exports.getTerminal = getTerminal;

exports.sourcesXml = function (iWires,mods,params,target)
{
    var res = "";
    if (iWires && iWires.length > 0)
    {
        iWires.forEach( function(w,index) {
            var mId = w["src"]["moduleId"];

            var source = mods[mId];

            var sourceConfig = source["definition"];
            var sourceSeq = source["sequence"];
            var sourceTerminal = getTerminal(sourceConfig,w["src"]["terminal"]);

            var id = source["parameters"]["abstractionId"];
            var propid = tagStr(concatSeq(id,sourceSeq),"sourceId");
            var key =  w["tgt"]["terminal"];
            var terminal = getTerminal(target,key);
            if (terminal)
            {
                var grouping = terminal["ddConfig"]["grouping"];
                var terminalReferences = "";
                if (!grouping) grouping = "shuffle";
                grouping =  tagStr(grouping,"grouping");
                if (sourceTerminal["name"] != "out")
                {
                    terminalReferences = tagStr(sourceTerminal["name"],"streamId");
                }
                res = res + tagStr(propid+grouping+terminalReferences,"source");
            }
        });
        if (res.length > 0)
            res = tagStr(res,"sources");
    }
    return res;
}
var concatSeq = function(id,seq){
    return id+"_"+seq;
}
exports.concatSeq = concatSeq;

var generateOutput = function(obj, abstractionId) {
    var output = "";
    if (obj.container.terminals) {
        for (var i = 0; i < obj.container.terminals.length; i++) {
            var terminal = obj.container.terminals[i];
            if (terminal["ddConfig"]["type"] == "output" && terminal["name"] != "out")
            {
                var prefix = abstractionId || "";
                output = output + tagStr(this.concatSeq(prefix, terminal["name"]), "output");
            }
        }
        if (output.length > 0)
        {
            output = tagStr(output, "outputs");
        }
    }
    return output;
}
exports.generateOutput = generateOutput;

var generateFields = function(fieldsDef, params) {
    var output = "";
    var properties = "";
    var fields = "";
    if (fieldsDef) {
        for (var i = 0; i < fieldsDef.length; i++) {
            var field = fieldsDef[i];
            if (field["type"] == "list")
            {
                properties = properties + tagListFields(field,params);
            }
            else if (field["type"] == "combine")
            {
                fields = fields + tagCombinedFields(field,params);
            }
            else
            {
                fields = fields + textTag(field["name"],params,field["cdata"]);
            }
        }
        output = fields+properties;
    }
    return output;
}

exports.generateFields = generateFields;

exports.wrapObject =  function(str,tag,obj,seq)
{
    var attrs;
    if (obj.container.attributes)
    {
        attrs = extend({},obj.container.attributes);
        if (attrs["abstractionId"])
        {
            attrs["abstractionId"] = concatSeq(attrs["abstractionId"],seq);
        }
    }
    var output = generateOutput.call(this, obj, attrs["abstractionId"]);
    return tagStr(str+output,tag,attrs);
}


exports.generateFullObject = function(mydef,seq,params,iWires,modules) {
    var res = this.sourcesXml(iWires,modules,params,mydef);
    res = res + this.lsHiddenTags(mydef.container.hidden);
    res = res+generateFields(mydef.container.fields,params);
    var parallelism = mydef.singleton ? 1 : (params.parallelism ? params.parallelism : Module.defaultParallelism);
    var maxParallelism = Module.maxParallelism;
    parallelism = Math.min(parseInt(parallelism),maxParallelism);
    res = res+"<parallelism>"+parallelism.toString()+"</parallelism>";
    if (mydef.entity)
    {
      res = res+"<entity>"+mydef.entity+"</entity>";
    }
    var rootTag = mydef.container.type || "bolt";
    res = this.wrapObject(res,rootTag,mydef,seq);
    return res;
}



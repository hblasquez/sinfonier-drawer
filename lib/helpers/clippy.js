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

 exports.expressRoutes = function(app) {

	app.locals.clippy = function(text, bgcolor) {
	  		return '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" width="110" height="14" id="clippy" >'+
	    		'<param name="movie" value="/flash/clippy.swf"/>'+
	    		'<param name="allowScriptAccess" value="always" />'+
	    		'<param name="quality" value="high" />'+
	    		'<param name="scale" value="noscale" />'+
	    		'<param NAME="FlashVars" value="text='+text+'">'+
	    		'<param name="bgcolor" value="'+( bgcolor || '#FFFFFF' )+'">'+
	    		'<embed src="/flash/clippy.swf" width="110" height="14" name="clippy" quality="high" allowScriptAccess="always"'+
	         '  type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer"'+
	         '  FlashVars="text=#{text}" bgcolor="#{bgcolor}" />'+
	    		'</object>';
		};

};
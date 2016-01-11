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

	var settings = {
	   refreshMillis: 60000,
	   allowFuture: false,
	   strings: {
	     prefixAgo: null,
	     prefixFromNow: null,
	     suffixAgo: "ago",
	     suffixFromNow: "from now",
	     seconds: "less than a minute",
	     minute: "about a minute",
	     minutes: "%d minutes",
	     hour: "about an hour",
	     hours: "about %d hours",
	     day: "a day",
	     days: "%d days",
	     month: "about a month",
	     months: "%d months",
	     year: "about a year",
	     years: "%d years",
	     numbers: []
	   }
	};

app.locals.timeago = function(date) {

    if (isNaN(date.getTime()))
      return "never";
		var distanceMillis = (new Date()).getTime() - date.getTime(),	
		 	 l = settings.strings,
	   	 prefix = l.prefixAgo,
	   	 suffix = l.suffixAgo;

	   if (settings.allowFuture) {
	     if (distanceMillis < 0) {
	       prefix = l.prefixFromNow;
	       suffix = l.suffixFromNow;
	     }
	     distanceMillis = Math.abs(distanceMillis);
	   }

	   var seconds = distanceMillis / 1000,
	   	 minutes = seconds / 60,
	   	 hours = minutes / 60,
	   	 days = hours / 24,
	   	 years = days / 365;

	   function substitute(stringOrFunction, number) {
	     var string = (typeof stringOrFunction == "function") ? stringOrFunction(number, distanceMillis) : stringOrFunction;
	     var value = (l.numbers && l.numbers[number]) || number;
	     return string.replace(/%d/i, value);
	   }

	   var words = seconds < 45 && substitute(l.seconds, Math.round(seconds)) ||
	     seconds < 90 && substitute(l.minute, 1) ||
	     minutes < 45 && substitute(l.minutes, Math.round(minutes)) ||
	     minutes < 90 && substitute(l.hour, 1) ||
	     hours < 24 && substitute(l.hours, Math.round(hours)) ||
	     hours < 48 && substitute(l.day, 1) ||
	     days < 30 && substitute(l.days, Math.floor(days)) ||
	     days < 60 && substitute(l.month, 1) ||
	     days < 365 && substitute(l.months, Math.floor(days / 30)) ||
	     years < 2 && substitute(l.year, 1) ||
	     substitute(l.years, Math.floor(years));

	   return [prefix, words, suffix].join(" ");
	};
	

};
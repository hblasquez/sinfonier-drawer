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

 
var blockUser = function(name) {
  var url ='/users/'+name+'/block.json';
  YAHOO.util.Connect.asyncRequest('PATCH', url, {
    success: function(o) {
      $("#__"+name+" i").toggle();
      $("#__"+name+" .block-link").toggle();
      $("#__"+name+" .unblock-link").toggle();
    },
    failure: function(o) {
      var error = o.status + " " + o.statusText;
      alert("cannot block" +name);
    }
  });
}

var activeUser = function(name) {
  var url ='/users/'+name+'/active.json';
  YAHOO.util.Connect.asyncRequest('PATCH', url, {
    success: function(o) {
      $("#__"+name+" i").toggle();
      $("#__"+name+" .block-link").toggle();
      $("#__"+name+" .unblock-link").toggle();
    },
    failure: function(o) {
      var error = o.status + " " + o.statusText;
      alert("cannot unblock" +name);
    }
  });
}

function setBlockClicks()
{
  $(".block-link").unbind("click").click(function()
  {
    var name = $(this).data("name");
    if (confirm("Do you want to block "+name+"?"))
    {
      blockUser(name);
    }
    return false;
  });
  $(".unblock-link").unbind("click").click(function()
  {
    var name = $(this).data("name");
    if (confirm("Do you want to unblock "+name+"?"))
    {
      activeUser(name);
    }
    return false;
  });

}

$(function(){

  setBlockClicks();
  $('#userlist').masonry({
    itemSelector: '.userinfos',
    gutter: 25
  });
  var $container = $('#userlist')
  $container.infinitescroll({
        navSelector  : '#page-nav',    // selector for the paged navigation
        nextSelector : '#page-nav a',  // selector for the NEXT link (to page 2)
        itemSelector : '.userinfos',     // selector for all items you'll retrieve
        loading: {
          finishedMsg: 'No more users to load.',
          img: '/images/loading.gif',
          msgText: 'Loading more users...'
        }
      },
      // trigger Masonry as a callback
      function( newElements ) {
        var $newElems = $( newElements );
        $container.masonry( 'appended', $newElems );
        setBlockClicks();
      }
  );
});
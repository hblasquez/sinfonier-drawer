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
 
var deleteModule = function(name) {
  var url ='/modules/'+name+'.json';
  YAHOO.util.Connect.asyncRequest('DELETE', url, {
    success: function(o) {
      var id = name.replace(/\s/g, "_");
      $("#__" + id + " .delete-module").toggle();
      $("#__" + id + " .module-status").html('deleted');
      if ($('#modules-list').size() != 0) {
        $('#modules-list').queue(function () {
          $('#modules-list').masonry('hide', [$("#__" + id)]);
          $('#modules-list').masonry('reloadItems');
          $('#modules-list').masonry('layout');
        });
      }
    },
    failure: function(o) {
      var error = o.status + " " + o.statusText;
      alert("cannot remove" +name);
    }
  });
}

function prepareClicks()
{
  $(".delete-module").unbind("click").click(function()
  {
    var name = $(this).data("name");
    var msg =  "Are you sure that you want to permanently delete the module "+name+"?\n"+
        "Be aware that you will not be able of using it anymore,\n"+
        "however it will remain plenty functional at your topologies already done";
    var confirmation = confirm(msg);
    if (confirmation)
    {
      deleteModule(name);
    }
    return false;
  });

  $(".add-tools").unbind("click").click(function()
  {
    var name = $(this).data("name");
    $.post( "/tools.json", {name: name}).done(function() {
      var id = name.replace(/\s/g, "_");
      $("#__"+id+" .add-tools").toggle();
      $("#__"+id+" .remove-tools").toggle();
      $("#__"+id).toggleClass("mine");
    }).fail(function() {
      alert( "module "+name+" cannot be added to tools" );
    });
    return false;
  });

  $(".remove-tools").unbind("click").click(function()
  {
    var name = $(this).data("name");
    $.ajax( {url:"/tools/"+name+".json", method:"DELETE"}).done(function() {
      var id = name.replace(/\s/g, "_");
      $("#__"+id+" .add-tools").toggle();
      $("#__"+id+" .remove-tools").toggle();
      $("#__"+id).toggleClass("mine");
    }).fail(function() {
      alert( "module "+name+" cannot be removed from tools" );
    });
    return false;
  });
}

var showForm = function(selector)
{
  $(".suspend-form").toggle(selector == 'suspend');
  $(".inapropiated-form").toggle(selector == 'inapropiated');
  $(".vote-form").toggle(selector == 'vote');
  $(".decline-form").toggle(selector == 'decline');
}


$(function(){


  /*
  $('#modules-list').masonry({
    itemSelector: '.userinfos'
  });
  */
  var $container = $('#modules-list');

  $container.multipleFilterMasonry({
    itemSelector: '.userinfos',
    gutter: 25,
    filtersGroupSelector:'.filters',
    callback: prepareClicks
  });

  $(".filters a.partial").click(function(){
    $(this).closest("li").find("input").trigger("click");
    $(this).toggleClass('active');
    return false;
  });
  $(".filters a.mytools").click(function(){
    $(this).closest("li").find("input").trigger("click");
    $(this).toggleClass('active');
    return false;
  });

  $(".filters a.all").click(function(){
    $(".filters input").removeAttr("checked").trigger("change");
    $(".filters a").removeClass('active');
    return false;
  });

  $(".filters a.all").trigger("click");

  prepareClicks();


  $container.infinitescroll({
        navSelector  : '#page-nav',    // selector for the paged navigation
        nextSelector : '#page-nav a',  // selector for the NEXT link (to page 2)
        itemSelector : '.userinfos',     // selector for all items you'll retrieve
        loading: {
          finishedMsg: 'No more modules to load.',
          img: '/images/loading.gif',
          msgText: 'Loading more modules...'
        }
      },
      // trigger Masonry as a callback
      function( newElements ) {
        var $newElems = $( newElements );
        $container.masonry( 'appended', $newElems );
        prepareClicks();
      }
  );

  $(".inapropiated-link").click(function() {
    showForm('inapropiated');
    $("#message").focus();
  });


  function attachMsg(message){
    var newMsg = $('<div class="wrapper-comments"><div class="comment"></div></div>');
    var userInfo = $('<p><a href="/users/'+message.user_name+'">'+message.user_name+'</a> <span>'+$.timeago(message.created_at)+'</span></p>');
    var msgInfo = $('<p>'+message.message+'</p>');
    newMsg.append(userInfo);
    newMsg.append(msgInfo);
    $(".inapropiated-messages").append(newMsg);
  }

  $(".mark-as-inapropiate").click(function()
  {
    var name = $(this).data("name");
    var message = $("textarea#message").val();
    if (message.length < 10 )
    {
      alert("message too short!");
      return false;
    }
    $.post( "/modules/"+name+"/report.json", {message: message},'json').done(function(report) {


      $(".inapropiated-form").toggle(false);
      $("textarea#message").val('');
      alert( "Your report has been sent successfully" );
    }).fail(function(data) {
      alert( "module "+name+" cannot be reported as inapropiate" );
    });
    return false;
  });



  function changeStars(current)
  {
    $(".votable-stars i").each(function(){
      $(this).removeClass("valuations-none");
      $(this).removeClass("valuations-ok");
      if ($(this).data("value") <= current)
      {
        $(this).addClass("valuations-ok");
      }
      else
      {
        $(this).addClass("valuations-none");
      }
    });
  }

  $(".vote-button").click(function()
  {
    var name = $(this).data("name");
    var previous = $(".votable-stars").data("value");
    var value = $("input#vote-value").val();
    var message = $("textarea#vote-message").val();

    $.post( "/modules/"+name+"/rate.json", {value: value,message:message},'json').done(function(result) {
      var current = ""+result.rating;
      changeStars(current);
      $(".votable-stars").data("value",current);
      $(".vote-form").toggle(false);
      alert( "Your vote has been sent successfully" );

    }).fail(function(data) {
      alert( "module "+name+" cannot be rated" );
      $(".vote-form").toggle(false);
      changeStars(previous);
    });
    return false;
  });

  $(".votable-stars i").click(function()
  {
    var value = $(this).data("value");
    $("#vote-value").val(value);
    changeStars(value);
    showForm('vote');
    $("#vote-message").focus();
    $('html, body').animate({
      scrollTop: $(".valuation-sprite").offset().top
    }, 500);
  });




});
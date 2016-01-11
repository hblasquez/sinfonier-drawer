(function($){
  'use strict';
  $.fn.multipleFilterMasonry = function(options){
    var cache=[];
    var $serializer = $({});

    //the main job of the function is to cache the item,because we are going to filter the items later
    var init = function($container){
      $container.find(options.itemSelector).each(function(){
        cache.push($(this));
      });
      $container.masonry(options);
      $container.masonry('on', 'layoutComplete', function(){
        $serializer.dequeue();} );

    };

    //filter items in cache
    var filterItems = function(selector){
      var result=[];
      $(cache).each(function(item){
        $(selector).each(function(index,sel) {
          if(cache[item].is(sel)){
            if($.inArray(cache[item], result) === -1) result.push(cache[item]);
          }
        });
      });
      return result;
    };

    //reload masonry
    var reloadSmooth = function($container,items){
      var eliminate = [];
      var show = [];
      $(cache).each(function(index){
        if($.inArray(cache[index], items) === -1) {
          eliminate.push(cache[index]);
        }
        else
        {
          show.push(cache[index]);
        }
      });

      var currentElems = $container.masonry('getItemElements');
      //$container.empty();
      $(items).each(function(){
        if ($.inArray(this, currentElems) === -1)
        {
          $($container).append($(this));
        }
      });
      $container.masonry('reloadItems');
      $container.masonry();
      $container.masonry('hide',$(eliminate));
      $(show).each(function(){
        $(this).show();
      });
      $container.masonry('layout');
      if (options.callback)
      {
        options.callback();
      }
    };

    //reload masonry
    var reload = function($container,items){

      $container.empty();
      $(items).each(function(){
        $($container).append($(this));
      });
      $container.masonry('reloadItems');
      $container.masonry('layout');
      $(options.itemSelector,$container).fadeIn();
      if (options.callback)
      {
        options.callback();
      }
    };


    var proc = function($container){
      $(options.filtersGroupSelector).find('input[type=checkbox]').each(function(){
        $(this).change(function(){
          $serializer.queue(function(){
            var selector = [];
            $(options.filtersGroupSelector).find('input[type=checkbox]').each( function() {
              if ( $(this).is(':checked') ) {
                selector.push( '.' + $(this).val() );
              }
            });
            var items = cache;
            if (selector.length > 0) {
              items = filterItems(selector);
            }
            reload($container,items);
          });
        });
      });
    };


    return this.each(function() {
      var $$ = $(this);
      $serializer = $(this);
      init($$);
      proc($$);
    });
  };
}(window.jQuery));

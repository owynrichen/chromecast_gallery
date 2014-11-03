(function($, window, document) {
  $.fn.extend({
    media_gallery: function(options) {
      var defaults = {
        media : [],
        video_element : document.getElementById('vid'),
        img_gal_element : document.getElementById('img_gal'),
        duration : 6000,
        fadeDuration: 400,
        scale: 1.25
      }

      function Gallery(element, options) {
        this.options = $.extend({}, defaults, options);
        this.current_index = 0;
        this.running = false;

        var that = this;

        $(options.video_element).on('canplay', function() {
          $(document).trigger('media_gallery.media_started', [ that.currentMediaItem() ]);
        });

        $(options.video_element).on('timeupdate', function() {
          $(document).trigger('media_gallery.time_updated', [ that.currentMediaItem(), options.video_element.currentTime ]);
        });

        $(options.video_element).on('ended', function() {
          $(document).trigger('media_gallery.media_ended', [ that.currentMediaItem() ]);
          that.runNextMediaItem();
        });
      }

      Gallery.prototype.start = function(start_index) {
        if (start_index == undefined)
          start_index = -1;

        this.current_index = start_index;
        this.running = true;
        this.runNextMediaItem();
      };

      Gallery.prototype.stop = function() {
        this.running = false;
      };

      Gallery.prototype.playFrom = function(id) {
        var start_index = -1;

        for (i in this.options.media) {
          if (id == this.options.media[i].id) {
            start_index = i - 1;
            break;
          }
        }

        gallery.start(start_index);
      }

      Gallery.prototype.updateMedia = function(new_media) {
        this.options.media = new_media;
      }

      Gallery.prototype.previousMediaItem = function() {
        var previous_index = this.current_index - 1;
        if (previous_index < 0)
          previous_index = this.options.media.length - 1;

        return this.options.media[previous_index];
      }

      Gallery.prototype.currentMediaItem = function() {
        return this.options.media[this.current_index];
      }

      Gallery.prototype.showPhoto = function() {
        $(document).trigger('media_gallery.media_started', [ this.currentMediaItem() ]);
        $(this.options.img_gal_element).fadeIn(this.options.fadeDuration);

        var scale = this.options.scale;
        var that = this;

        var img = $("<img />");
        img.attr('src', this.currentMediaItem().url);
        img.css({'position':'absolute', 'width':'100%'});
        img.css({'-webkit-transform-origin':'left top'});
        $(this.options.img_gal_element).prepend(img);

        img.load(function() {
          console.log('image loaded: ' + this.src);
          var position = that.chooseCorner(img);
          img.css({'-webkit-transition':'none'});
          img.css({'-webkit-transform':'scale('+scale+') translate3d('+position.startX+'px,'+position.startY+'px,0)'});
          img.css({'-webkit-transition':'-webkit-transform '+(that.options.duration+that.options.fadeSpeed)+'ms '+that.options.ease3d});
          setTimeout(function() {
            img.css({'-webkit-transition':'-webkit-transform '+(that.options.duration+that.options.fadeDuration)+'ms '+that.options.ease3d});
            img.css({'-webkit-transform':'scale(1) translate3d('+position.endX+'px,'+position.endY+'px,0)'});
          }, 250);
        });

        switch(this.previousMediaItem().meta.metadataType) {
          case 'PHOTO':
            if ($(this.options.img_gal_element).children().length > 1) {
              $(this.options.img_gal_element).children().last().fadeOut(this.options.fadeDuration, function() {
                $(that.options.img_gal_element).children().last().remove();
              });
            }
            break;
          case 'VIDEO':
            $(this.options.img_gal_element).fadeIn(this.options.fadeDuration);
            $(this.options.video_element).fadeOut(this.options.fadeDuration);
            break;
        }

        var that = this;

        setTimeout(function() {
          $(document).trigger('media_gallery.media_ended', [ that.currentMediaItem() ]);
          that.runNextMediaItem();
        }, this.options.duration);
      }

      Gallery.prototype.playVideo = function() {
        var that = this;

        $(this.options.img_gal_element).fadeOut(this.options.fadeDuration, function() {
          $(that.options.img_gal_element).empty();
        });
        $(this.options.video_element).fadeIn(this.options.fadeDuration);

        this.options.video_element.src = this.currentMediaItem().url;
        this.options.video_element.autoplay = true;
        // this.options.video_element.controls = true;
        this.options.video_element.load();
      }

      Gallery.prototype.runNextMediaItem = function() {
        if (!this.running)
          return;

        this.current_index++;
        if (this.current_index >= this.options.media.length)
          this.current_index = 0;

        switch(this.currentMediaItem().meta.metadataType) {
          case 'PHOTO':
            this.showPhoto();
            break;
          case 'VIDEO':
            this.playVideo();
            break;
        }
      }

      Gallery.prototype.chooseCorner = function(image) {
          var scale = this.options.scale;

          var ratio = image.height()/image.width();
          var sw = Math.floor(image.width()*(scale));
          var sh = Math.floor(image.width()*ratio*(scale));

          image.width(sw);
          image.height(sh);

          var w = image.width();
          var h = image.height();

          //console.log(sw+ ", " + this.width);

          var corners = [
              {x:0,y:0},
              {x:1,y:0},
              {x:0,y:1},
              {x:1,y:1}
          ];

          //Pick the first corner. Remove it from the array
          var choice = Math.floor(Math.random()*4);
          var start = corners[choice];

          //Pick the second corner from the subset
          corners.splice(choice,1);
          var end = corners[Math.floor(Math.random()*3)];

          //build the new coordinates from the chosen coordinates
          var coordinates = {
              startX: start.x * (w - sw*scale),
              startY: start.y * (h - sh*scale),
              endX: end.x * (w - sw),
              endY: end.y * (h - sh)
          }

        //
        //  console.log(coordinates.startX + " , "+coordinates.startY + " , " +coordinates.endX + " , " +coordinates.endY);

          return coordinates;
      }

      return new Gallery(document, options);
    }
  });
})($, window, document);

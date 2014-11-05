/**
Copyright (C) 2014 Owyn Richen. All Rights Reserved.

Portions shamelessly based on work (C) 2013 ToymakerLabs under
the MIT license.
(https://github.com/toymakerlabs/kenburns)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/

(function($, window, document) {
  $.fn.extend({
    /**
     * Wires up a media gallery, typically associated with
     * the document object, since the elements that matter
     * are passed via the options section.
     * @param {Object} options to pass to the media gallery
     * including:
     * media: the array of media objects, note no validation is performed
     * video_element: the DOM object for the <video> tag
     * img_gal_element: the DOM object for the <div> to put
     * the images in.
     * duration: the length of time an image is on screen
     * fadeDuration: how fast images or video fade to eachother
     * scale: the default size of images
     *
     * The structure of an entry in the media[] array is
     * as follows:
     * {
     *   id: {Integer} corresponds to the sqlite3 rowid returned
     *   url: {String} the full url to the media asset
     *   meta: {Object} {
     *     metadataType: {String} 'PHOTO' | 'VIDEO' are supported
     *   }
     *   ordinal: {Integer} the sort order of the object
     * }
     *
     * @returns a Gallery object
     */
    media_gallery: function(options) {
      var defaults = {
        media : [],
        video_element : document.getElementById('vid'),
        img_gal_element : document.getElementById('img_gal'),
        duration : 6000,
        fadeDuration: 400,
        scale: 1.25,
        debug: false
      }

      /**
       * A JS Gallery that cycles through photos
       * and transitions to videos.  It associates
       * itself and events with the document object.
       * @param {Object} options to setup the media gallery.
       * Check the docs for the parent media_gallery
       * function for a description of options.
       */
      function Gallery(options) {
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

	this.log("Running Gallery with options:");
        this.log("{");
        this.log("duration: " + this.options.duration);
        this.log("fadeDuration: " + this.options.fadeDuration);
        this.log("scale: " + this.options.scale);
        this.log("debug: " + this.options.debug);
        this.log("media: " + JSON.stringify(this.options.media));
        this.log("}");
      }

      /**
       * The start() function begins the gallery cycle
       * @param {Integer} start_index the index of the
       * media[] array to start from, if omitted
       * starts from the beginning of the list
       */
      Gallery.prototype.start = function(start_index) {
        if (start_index == undefined)
          start_index = -1;

        this.current_index = start_index;
        this.running = true;
        this.runNextMediaItem();
      };

      /**
       * The stop() function tells the gallery to stop
       * after the currently running photo/video
       */
      Gallery.prototype.stop = function() {
        this.running = false;
      };

      /**
       * The playFrom() function plays the gallery
       * from a particular entry, based on ID.
       * NOTE: Running this on a currently running
       * gallery will yield odd results
       * @param {Integer} id the ID of the media item
       * to
       */
      Gallery.prototype.playFrom = function(id) {
        var start_index = -1;

        for (i in this.options.media) {
          if (id == this.options.media[i].id) {
            start_index = i - 1;
            break;
          }
        }

        this.log("playFrom(" + id + ") called returning media index of: " + (start_index + 1));

        gallery.start(start_index);
      }

      /**
       * Updates the array of currently running media.  NOTE: there
       * is no validation performed.
       * new_media: {Array} the array of media,
       */
      Gallery.prototype.updateMedia = function(new_media) {
	this.log("updating Gallery media with: " + JSON.stringify(new_media));
        this.options.media = new_media;
      }

      /**
       * Returns the item previous to the currently running
       * media item
       */
      Gallery.prototype.previousMediaItem = function() {
        var previous_index = this.current_index - 1;
        if (previous_index < 0)
          previous_index = this.options.media.length - 1;

        return this.options.media[previous_index];
      }

      /**
       * Returns the currently running media item
       */
      Gallery.prototype.currentMediaItem = function() {
        return this.options.media[this.current_index];
      }

      /**
       * internal method, shows the current media item
       * assuming it's a photo
       */
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

      /**
       * internal method, plays the current media item
       * assuming it's a video
       */
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

      /**
       * internal method, identifies the next media item
       * updates the current index, and calls internal methods
       * showPhoto() or showVideo() based on the type
       */
      Gallery.prototype.runNextMediaItem = function() {
        if (!this.running)
          return;

        this.current_index++;
        if (this.current_index >= this.options.media.length)
          this.current_index = 0;

        switch(this.currentMediaItem().meta.metadataType) {
          case 'PHOTO':
	    this.log("Playing photo " + this.currentMediaItem().url);
            this.showPhoto();
            break;
          case 'VIDEO':
	    this.log("Playing video " + this.currentMediaItem().url);
            this.playVideo();
            break;
        }
      }

      /**
       * internal method, shamelessly stolen from the kenburns
       * jQuery plugin by Toymakerlabs, to randomly choose
       * a corner for the Ken Burns effect transition
       */
      Gallery.prototype.chooseCorner = function(image) {
          var scale = this.options.scale;

          var ratio = image.height()/image.width();
          var sw = Math.floor(image.width()*(scale));
          var sh = Math.floor(image.width()*ratio*(scale));

          image.width(sw);
          image.height(sh);

          var w = image.width();
          var h = image.height();

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

          return coordinates;
      }

      Gallery.prototype.log = function(entry) {
	  if (this.options.debug) {
	    console.log(entry);
          }
      }

      return new Gallery(options);
    }
  });
})($, window, document);

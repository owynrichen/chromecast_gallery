/**
Copyright (C) 2014 Owyn Richen. All Rights Reserved.

based on Cast-VideoPlaylist-Chrome (C) 2014 Google Inc.
(https://github.com/googlecast/CastVideosPlaylist-chrome)

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

var session=null;
var currentMediaSession = null;
var timer = null;

function createTimer() {
  timer = setInterval(updateCurrentTime.bind(this), 1000);
}

function clearTimer() {
	console.log("clearTimer");
	if (timer) {
	  clearInterval(timer);
	}
}

/**
 * Call initialization
 */
if (!chrome.cast || !chrome.cast.isAvailable) {
  setTimeout(initializeCastApi, 1000);
}

/**
 * initialization
 */
function initializeCastApi() {
  var applicationID = 'BDF7287F';
  var sessionRequest = new chrome.cast.SessionRequest(applicationID);
  var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
    sessionListener,
    receiverListener);

  chrome.cast.initialize(apiConfig, onInitSuccess, onError);
};

/**
 * initialization success callback
 */
function onInitSuccess() {
  appendMessage("init success");
}

/**
 * initialization error callback
 */
function onError() {
  console.log("error");
  appendMessage("error");
}

/**
 * generic success callback
 */
function onSuccess(message) {
  console.log(message);
}

/**
 * callback on success for stopping app
 */
function onStopAppSuccess() {
  console.log('Session stopped');
  appendMessage('Session stopped');
  document.getElementById("casticon").src = 'img/cast_icon_idle.png';
}

/**
 * session listener during initialization
 */
function sessionListener(e) {
  console.log('New session ID: ' + e.sessionId);
  appendMessage('New session ID:' + e.sessionId);
  session = e;
  if (session.media.length != 0) {
    appendMessage(
        'Found ' + session.media.length + ' existing media sessions.');
    onMediaDiscovered('onRequestSessionSuccess_', session.media[0]);
  }
  session.addMediaListener(
      onMediaDiscovered.bind(this, 'addMediaListener'));
  session.addUpdateListener(sessionUpdateListener.bind(this));
}

/**
 * session update listener
 */
function sessionUpdateListener(isAlive) {
  var message = isAlive ? 'Session Updated' : 'Session Removed';
  message += ': ' + session.sessionId;
  appendMessage(message);
  if (!isAlive) {
    session = null;
    document.getElementById("casticon").src = 'img/cast_icon_idle.png';
    clearTimer();
  }
};

/**
 * receiver listener during initialization
 */
function receiverListener(e) {
  if( e === 'available' ) {
    console.log("receiver found");
    appendMessage("receiver found");
  }
  else {
    console.log("receiver list empty");
    appendMessage("receiver list empty");
  }
}

/**
 * launch app and request session
 */
function launchApp() {
  console.log("launching app...");
  appendMessage("launching app...");
  chrome.cast.requestSession(onRequestSessionSuccess, onLaunchError);
  clearTimer();
}

/**
 * callback on success for requestSession call
 * @param {Object} e A non-null new session.
 */
function onRequestSessionSuccess(e) {
  console.log("session success: " + e.sessionId);
  appendMessage("session success: " + e.sessionId);
  session = e;
  document.getElementById("casticon").src = 'img/cast_icon_active.png';
  session.addUpdateListener(sessionUpdateListener.bind(this));
}

/**
 * callback on launch error
 */
function onLaunchError() {
  console.log("launch error");
  appendMessage("launch error");
  clearTimer();
}

/**
 * stop app/session
 */
function stopApp() {
  session.stop(onStopAppSuccess, onError);
  clearTimer();
}

function setupMediaList() {
  $(function() {
    $("#media_list").sortable();
    $("#media_list").disableSelection();
    $("#media_list").on('sortupdate', mediaSortChanged);
  });
}

/**
 * Adds new media to the sqlite3 database via POST
 * to the /media endpoint
 */

function mediaSortChanged(event, ui) {
  var new_ordinal = 0;
  if (ui.item.next().attr('data-ordinal') != undefined)
    new_ordinal = parseInt(ui.item.next().attr('data-ordinal')) + 1;

  $.ajax({
    type: 'PUT',
    url: '/media/' + ui.item.attr('data-id') + '/' + new_ordinal
  }).done(function(val) {
    loadMediaList();
    updateRemoteGallery();
  });
}

/**
 * Refreshes the media list from sqlite3 via the /media endpoint
 */

function loadMediaList() {
  $.ajax("/media").done(function(val) {
    json_val = JSON.parse(val);
    $("#media_list").empty();

    $.each(json_val, function(idx, entry) {
      var li = $("<li />");
      li.attr('data-ordinal', entry.ordinal);
      li.attr('data-id', entry.id);
      li.attr('id', 'media-' + entry.id);

      switch(entry.meta.metadataType) {
        case "PHOTO":
          var img = $("<img />");
          img.css({"height":"20px"});
          img.attr('src', entry.url);
          li.append(img);
          break;
        case "VIDEO":
          // TODO: thumbnail?
          break;
      }

      var txt = $("<span />");
      txt.append(entry.url);
      li.append(txt);

      var trash = $("<img />");
      trash.css({"height":"20px", "float":"right"});
      trash.attr('src', '/img/icon-trash-b-128.png');
      trash.attr('data-id',entry.id);
      trash.on('click', function() {
        var id = $(this).attr('data-id');
        deleteMedia(id);
      });
      li.append(trash);

      var play = $("<img />");
      play.css({"height":"20px", "float":"right"});
      play.attr('src', '/img/23_Play-128.png');
      play.attr('data-id',entry.id);
      play.on('click', function() {
        var id = $(this).attr('data-id');
        playFromItem(id);
      });
      li.append(play);
      $("#media_list").append(li);
    });
  });
}

/**
 * Adds new media to the sqlite3 database via POST
 * to the /media endpoint
 */

function addMedia() {
  var url = $("#add_media").val();
  var type = $("#add_media_type").val();
  var post_body = {
    url: url,
    metadataType: type
  };
  $.post("/media", post_body, function() {
    loadMediaList();
    updateRemoteGallery();
  });
}

/**
 * Deletes an entry from sqlite3, by ID via a DELETE
 * call to the /media endpoint
 * @param {Integer} id the ID of the record to delete
 */

function deleteMedia(id) {
  $.ajax({
    type: "DELETE",
    url: "/media/" + id,
    success: function() {
      loadMediaList();
      updateRemoteGallery();
    }
  })
}

/**
 * tell the receiver to refresh it's local list
 * from the /media endpoint
 */

function updateRemoteGallery() {
  if (!session) {
    console.log("no session");
    appendMessage("no session");
    return;
  }

  var message = {
    type: 'REFRESH'
  };
  var msg = JSON.stringify(message);
  session.sendMessage('urn:x-cast:com.purebarre.gallery', msg);
  console.log("sendMessage urn:x-cast:com.purebarre.gallery(" + msg + ")");
  appendMessage("sendMessage urn:x-cast:com.purebarre.gallery(" + msg + ")");
}

/**
 * tell the receiver to start playing from a particular
 * item
 * @param {Integer} id the ID of the object
 */

function playFromItem(id) {
  if (!session) {
    console.log("no session");
    appendMessage("no session");
    return;
  }

  var message = {
    type: 'PLAYFROM',
    id: id
  };
  var msg = JSON.stringify(message);
  session.sendMessage('urn:x-cast:com.purebarre.gallery', msg);
  console.log("sendMessage urn:x-cast:com.purebarre.gallery(" + msg + ")");
  appendMessage("sendMessage urn:x-cast:com.purebarre.gallery(" + msg + ")");
}


/**
 * set media volume
 * @param {Number} level A number for volume level
 * @param {Boolean} mute A true/false for mute/unmute
 */
function setMediaVolume(level, mute) {
  if( !currentMediaSession )
    return;

  var volume = new chrome.cast.Volume();
  volume.level = level;
  currentVolume = volume.level;
  volume.muted = mute;
  var request = new chrome.cast.media.VolumeRequest();
  request.volume = volume;
  currentMediaSession.setVolume(request,
    mediaCommandSuccessCallback.bind(this, 'media set-volume done'),
    onError);
}

/**
 * set receiver volume
 * @param {Number} level A number for volume level
 * @param {Boolean} mute A true/false for mute/unmute
 */
function setReceiverVolume(level, mute) {
  if( !session )
    return;

  if( !mute ) {
    session.setReceiverVolumeLevel(level,
      mediaCommandSuccessCallback.bind(this, 'media set-volume done'),
      onError);
    currentVolume = level;
  }
  else {
    session.setReceiverMuted(true,
      mediaCommandSuccessCallback.bind(this, 'media set-volume done'),
      onError);
  }
}

/**
 * mute media
 * @param {DOM Object} cb A checkbox element
 */
function muteMedia(cb) {
  if( cb.checked == true ) {
    document.getElementById('muteText').innerHTML = 'Unmute media';
    //setMediaVolume(currentVolume, true);
    setReceiverVolume(currentVolume, true);
    appendMessage("media muted");
  }
  else {
    document.getElementById('muteText').innerHTML = 'Mute media';
    //setMediaVolume(currentVolume, false);
    setReceiverVolume(currentVolume, false);
    appendMessage("media unmuted");
  }
}

/**
 * callback on success for media commands
 * @param {string} info A message string
 * @param {Object} e A non-null media object
 */
function mediaCommandSuccessCallback(info) {
  console.log(info);
  appendMessage(info);
}


/**
 * append message to debug message window
 * @param {string} message A message string
 */
function appendMessage(message) {
  var dw = document.getElementById("debugmessage");
  dw.innerHTML += '\n' + JSON.stringify(message);
};

/**
 * callback on success for loading media
 * @param {Object} e A non-null media object
 */

function onMediaDiscovered(how, mediaSession) {
  console.log("new media session ID:" + mediaSession.mediaSessionId);
  appendMessage("new media session ID:" + mediaSession.mediaSessionId + ' (' + how + ')');
  currentMediaSession = mediaSession;
  mediaSession.addUpdateListener(onMediaStatusUpdate);
  mediaCurrentTime = currentMediaSession.currentTime;
  playpauseresume.innerHTML = 'Play';
  document.getElementById("casticon").src = 'images/cast_icon_active.png';
}

/**
 * callback on media loading error
 * @param {Object} e A non-null media object
 */
function onMediaError(e) {
  console.log("media error");
  appendMessage("media error");
  document.getElementById("casticon").src = 'images/cast_icon_warning.png';
}

/**
 * callback for media status event
 * @param {Object} e A non-null media object
 */
function onMediaStatusUpdate(isAlive) {
  if( progressFlag ) {
    lastCurrentTimeUpdate = new Date().getTime();
    document.getElementById("progress").value = parseInt(100 * currentMediaSession.currentTime / currentMediaSession.media.duration);
  }
  document.getElementById("playerstate").innerHTML = currentMediaSession.playerState;

  // Have we changed media?
  if (mediaTitles[currentMediaIndex] != currentMediaSession.media.metadata.title) {
    document.getElementById('thumb').src = currentMediaSession.media.metadata.images[0].url;
  }
}

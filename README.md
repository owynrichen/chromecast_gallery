Chromecast Photo/Video Gallery
==============================

Runs a playlist of photos and videos, transitioning seamlessly between then
and applying a Ken Burns effect on the photos.  Also provides a simple node-
based server backed by sqlite3 for management. Written to present
on a Chromecast device, with the sender being a simple playlist management
console with the receiver doing the lifting, although pieces (such as the
the [media_gallery.js](js/media_gallery.js) could be used outside of that
use-case in a standalone fashion.

Depends on jQuery for the media_gallery & receiver, and jQuery and jQueryUI for
the controller.

To get it up and running, simply run:

```
npm install
node server.js
```

Yes, I know there are no tests right now.  Sometime I will get around to it :).

If you're interested in learning more about the Google Cast SDK, take a look at
https://developers.google.com/cast/, or to see some helpful example projects
for which some of this was based, check out https://github.com/googlecast/.
/*global window, YUI, document */
/**
 * A util for control MPlayer.
 *
 * @module mplayer
 * @requires node ,base, substitute
 */
YUI.add("mplayer", function (Y) {

    var MODULE_ID = "Y.MPlayer",
        _log;

    _log = function (message, type, module) {
        type = type || "info";
        module = module || MODULE_ID;
        Y.log(message, type, module);
    };

    /**
     * An utility for MPlayer control.
     * The following is sample usage.
     *
     * * Sample 1
     *
     *     var player = new Y.MPlayer({
     *         container: "#foo",
     *         url: "http://dl.dropbox.com/u/50251053/tv/videos/video.mp4"
     *     });
     *
     * * Sample 2
     *
     *     var player = new Y.MPlayer({
     *         container: "#foo"
     *     });
     *     player.play("http://dl.dropbox.com/u/50251053/tv/videos/video.mp4");
     *
     * @constructor
     * @class MPlayer
     * @param {Object} config attribute object
     */
    function MPlayer () {
        MPlayer.superclass.constructor.apply(this, arguments);
    }
    // TODO - bgcolor ? wmode ?
    MPlayer.TEMPLATE = [
        '<object id="{obj_id}" width="{width}" height="{height}" ',
              'classid="CLSID:6BF52A52-394A-11d3-B153-00C04F79FAA6" ',
              'type="application/x-oleobject">',
              '<param name="url" value="{url}">',
              '<param name="autoStart" value="false">',
              '<param name="loop" value="true">',
              '<embed id="{embed_id}" type="application/x-mplayer2" ',
                  'bgcolor="#000000" width="{width}" height="{height}" ',
                  'src="{url}" autostart="false" wmode="transparent">',
              '</embed>',
        '</object>'
    ].join("");
    MPlayer.DEFAULT_WIDTH  = 800;
    MPlayer.DEFAULT_HEIGHT = 500;
    MPlayer.CHECK_INTERVAL = 1000;
    MPlayer.ATTRS = {
        /**
         * The container to place embed/object control.
         *
         * @attribute container
         * @type Y.Node
         */
        "container": {
            value: null,
            writeOnce: true
        },
        /**
         * The video url.
         *
         * @attribute url
         * @type String
         */
        "url" : {
            value : null
        },
        /**
         * The player's current state.
         *
         * @attribute state
         * @type String
         */
        "state" : {
            value: "initializing",
            readOnly: true
        },
        /**
         * Whether playing video automatically if url is provided.
         *
         * @attribute autoPlay
         * @type Boolean
         */
        "autoPlay" :{
            value: true,
            validator: Y.Lang.isBoolean
        },
        /**
         * Check if MPlayer is installed in user's browser.
         *
         * @attribute installed
         * @type Boolean
         */
        "installed": {
            value: null,
            validator: Y.Lang.isBoolean,
            readOnly: true
        },
        /**
         * Current played position in millionseconds.
         *
         * @attribute position
         * @type Number
         */
        "position": {
            value: null,
            validator: function (value) {
                var that = this;
                if (!Y.Lang.isNumber(value)) {
                    return false;
                }
                if (value < 0 || value > that.get("duration")) {
                    return false;
                }
            },
            setter: function (value) {
                var that = this;
                that._player.CurrentPosition = value;
                return value;
            }
        },
        /**
         * The video's total time in millionsecond.
         *
         * @attribute duration
         * @type Number
         */
        "duration": {
            value: null,
            readOnly: true
        },
        /**
         * The width and height of this video player.
         *
         * @attribute size
         * @type Array
         */
        "size": {
            value: [MPlayer.DEFAULT_WIDTH, MPlayer.DEFAULT_HEIGHT],
            validator: Y.Lang.isArray,
            setter: function (value) {
                var that = this;
                if (that._player) {
                    that._player.setStyles({
                        width: value[0] + "px",
                        height: value[1] + "px"
                    });
                }
                return value;
            }
        },
        /**
         * Whether player should be switched to fullscreen mode.
         * FIXME - Set 100% * 100% is not the correct approach.
         *
         * @attribute mode
         * @type Boolean
         */
        "fullscreen": {
            value: false,
            validator: Y.Lang.isBoolean,
            setter: function (value) {
                var that = this,
                    size = that.get("size");
                if (value) {
                    that._player.setStyles({
                        width: "100%",
                        height: "100%"
                    });
                } else {
                    that._player.setStyles({
                        width: size[0] + "px",
                        height: size[1] + "px"
                    });
                }
                return value;
            }
        },
        /**
         * The flag to indicate if the video is ready to play.
         *
         * @attribute ready
         * @type Boolean
         */
        "ready": {
            value: false,
            validator: Y.Lang.isBoolean,
            readOnly: true
        }
    };

    Y.extend(MPlayer, Y.Base, {
        /**
         * The MPlayer native API interface.
         * We don't encourage user to use this native API.
         * That's the reason I didn't set it as an attribute.
         *
         * @property _player
         * @private
         * @type {Object}
         */
        _player: null,
        /**
         * The interval timer.
         *
         * @property _timer
         * @private
         * @type {Number}
         */
        _timer: null,
        /**
         * Create required HTML element.
         * This method will be invoked when object/embed node doesn't exist.
         *
         * @method _create
         * @private
         * @return {Y.Node} The player node.
         */
        _create: function () {
            _log("create() is executed");
            var that = this,
                token,   // The Y.substitute replace token.
                objId,   // For object tag.
                embedId, // For embed tag.
                size,    // The width & height array.
                html;

            objId   = Y.guid();
            embedId = Y.guid();
            size    = that.get("size");
            token   = {
                obj_id   : objId,
                embed_id : embedId,
                url      : that.get("url"),
                height   : size[1],
                width    : size[0]
            };
            html = Y.substitute(MPlayer.TEMPLATE, token);
            that.get("container").append(html);
            // TODO - Should Chrome browser use object or embed?
            return (Y.UA.ie) ? Y.one("#" + objId) : Y.one("#" + embedId);
        },
        /**
         * Polling to get current state, position, and duration.
         *
         * @method _poll
         * @privte
         */
        _poll: function () {
            // _log("_poll() is executed");
            var that = this,
                duration,
                player = that._player,
                position,
                state = that.get("state");

            // Stop polling if the state is not correct.
            if (Y.Array.indexOf(["buffering", "play", "playing"], state) === -1) {
                that._stopPoll();
                that._set("position", null);
                that._set("duration", null);
                return;
            }

            position = player.CurrentPosition;
            duration = player.Duration;
            that._set("position", position);
            that._set("duration", duration);

            // Uncomment the following line only in debugging mode.
            // _log("position/duration = " + position + "/" + duration);

            // State "buffering".
            if (position === 0 && duration >= 0) {
                if (that.get("state") !== "buffering") {
                    that._set("state", "buffering");
                }
                // Though ready doens't mean "ready to play",
                // it's the earlist timing which video has image.
                if (duration > 0 && !that.get("ready")) {
                    that.fire("ready", {
                        position: position,
                        duration: duration
                    });
                    that._set("ready", true);
                }
                return;
            }

            // State "ended".
            if (Math.ceil(position) === Math.ceil(duration)) {
                that._set("state", "ended");
                that._set("ready", false);
                that._stopPoll();
                return;
            }

            // State "playing".
            if (that.get("state") !== "playing") {
                that._set("state", "playing");
            }
            that.fire("playing", {
                position: position,
                duration: duration
            });
        },
        /**
         * A utility method to stop polling.
         * I just want to eliminate duplicated code.
         *
         * @method _stopPoll
         * @private
         */
        _stopPoll: function () {
            var that = this;
            if (that._timer) {
                that._timer.cancel();
                that._timer = null;
            }
        },
        /**
         * When user calls destroy method,
         * the instance should stop playing, remove node and
         * destroy API reference.
         *
         * @method destructor
         * @public
         */
        destructor: function () {
            _log("destructor() is executed.");
            var that = this,
                state = that.get("state");

            that.stop();
            Y.one(that._player).remove();
            that._player = null;
        },
        /**
         * Initial setup for MPlayer instance.
         *
         * @method initializer
         * @public
         */
        initializer: function (config) {
            _log("initializer() is executed");
            var that = this,
                url,
                node,
                container;

            config = config || {};

            // Set Video URL if it provides.
            url = config.url || null;
            that._set("url", url);

            // Set container.
            container = config.container || "body";
            container = Y.one(container) || Y.one("body");
            that._set("container", container);

            // Find matched embed object in container.
            node = container.one("embed");
            if (!node) {
                node = that._create();
            }
            that._player = node._node;
            that._player = that._player.controls || that._player;

            if (
                typeof(that._player.Play) !== "function" &&
                typeof(that._player.play) !== "function"
            ) {
                _log("initializer() - MPlayer is not installed.", "error");
                that._set("installed", false);
                return;
            } else {
                _log("initializer() - MPlayer is installed");
                that._set("installed", true);
            }

            that._set("state", "idle");

            // Immediately start playint if autoPlay is true.
            if (that.get("autoPlay")) {
                that.play();
            }

            // Publish events:
            that.publish("playing", {emitFacade: true});
            that.publish("ready", {emitFacade: true});
        },
        /**
         * Pause current playing song.
         * TODO - Figure out why this method being invoked when
         *        autostart set to true.
         *
         * @method pause
         * @public
         * @return {Boolean} false if native API fails or
         *                   current state is not right.
         */
        pause: function () {
            _log("pause() is executed.");
            var that = this,
                state = that.get("state");

            // Prevent useless stop.
            if (state !== "playing" && state !== "buffering") {
                _log("pause() - You shouldn't call pause because " +
                     "the state isn't 'playing'.", "warn");
                return false;
            }

            // Prevent inpredictable error from MPlayer API.
            try {
                that._player.Pause();
            } catch (e) {
                _log("pause() - MPlayer API fails (" + e.message + ")", "warn");
                return false;
            }

            that._stopPoll();
            that.set("state", "paused");
            return true;
        },
        /**
         * Play a video.
         *
         * @method play
         * @public
         * @param url {String} The video URL.
         * @return false if video URL is not specified.
         */
        play: function (url) {
            _log("play() is executed.");
            var that = this;

            // Stop if the video URL is not provided.
            url = url || that.get("url");
            if (!url) {
                _log("play() - The 'url' attribute must be provided.", "warn");
                return;
            }

            // Save current URL.
            if (that.get("url") !== url) {
                that._set("url", url);
            }

            // Start to play.
            try {
                that._player.data = url;
                if (typeof(that._player.Play) === "function") {
                    that._player.Play();
                } else {
                    that._player.play();
                }
            } catch (e) {
                _log("pause() - MPlayer API fails (" + e.message + ")", "warn");
                return false;
            }
            that.fire("play");
            that._set("state", "play");

            // Polling to get state, position, and duration.
            that._timer = Y.later(MPlayer.CHECK_INTERVAL, that, that._poll, null, true);
        },
        /**
         * TODO - Thanks vivian!
         */
        resume: function () {
            _log("resume() is executed.");
        },
        /**
         * Stop playing music.
         *
         * @method stop
         * @public
         * @return {Boolean} false if native API fails or
         *                   current state is not right.
         */
        stop: function () {
            _log("stop() is executed.");
            var that = this,
                state = that.get("state");

            // Prevent useless stop.
            if (Y.Array.indexOf(["buffering", "paused", "playing"], state) === -1) {
                _log("stop() - You shouldn't call stop because " +
                     "the state isn't 'playing' nor 'paused'.", "warn");
                return false;
            }

            // Prevent inpredictable error from MPlayer API.
            try {
                that._player.Stop();
            } catch (e) {
                _log("stop() - MPlayer API fails (" + e.message + ")", "warn");
                return false;
            }

            that._stopPoll();
            that._set("ready", false);
            that.set("state", "stopped");
            return true;
        }
    });
    Y.MPlayer = MPlayer;

}, "0.0.1", {"requires": ["base", "node-base", "substitute"]});

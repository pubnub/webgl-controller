(function () {
    var p = PUBNUB.init({
        "publish_key"           : "pub-c-5f15e90d-f3f8-4daa-a223-1ea114d2fb28",
        "subscribe_key"         : "sub-c-4f71d6ee-1c63-11e4-a1db-02ee2ddab7fe",
        "no_wait_for_pending"   : 1         // Do not throttle in SDK
    });

    var IDLE_TIME = 2000;
    var THROTTLE_TIME = 100;                // Because I do my own throttling!

    // Subscribe to a channel to announce my presence
    function be_here() {
        p.subscribe({
            "channel"   : "webgl-visualization",
            "callback"  : function () {},
            "heartbeat" : 30
        });
    }

    // Unsubscribe when leaving the page
    function go_away() {
        p.unsubscribe({
            "channel"   : "webgl-visualization"
        });
    }

    be_here();
    window.addEventListener("pageshow", be_here);
    window.addEventListener("pagehide", go_away);
    window.addEventListener("beforeunload", go_away);
    window.addEventListener("unload", go_away);

    function throttle(fn, delay) {
        var interval = 0;
        var last = 0;

        return function () {
            var now = Date.now();
            if (now - last < delay) {
                clearTimeout(interval);
                interval = setTimeout(throttled, delay);
            }
            else {
                last = now;
                fn.apply(this, arguments);
            }
        };
    }

    var globe = {
        "interval" : -1,
        "scale" : 1,
        "gesture" : false,

        "touch" : {
            "x" : 0,
            "y" : 0
        },
        "pos" : {
            "x" : 0,
            "y" : 0
        },
        "delta" : {
            "x" : 0,
            "y" : 0
        },

        "copytouch" : function (touch) {
            return {
                "x" : touch.pageX,
                "y" : touch.pageY
            };
        },

        "touchstart" : function (e) {
            if (globe.interval >= 0) {
                return;
            }

            globe.touch = globe.copytouch(e.touches[0]);
            globe.pos.x = globe.touch.x;
            globe.pos.y = globe.touch.y;
            globe.delta.x = 0;
            globe.delta.y = 0;

            // Continuously pause idle animation
            globe.interval = setInterval(globe.publish, IDLE_TIME);
        },

        "touchend" : function (e) {
            // Allow idle animation to continue
            clearInterval(globe.interval);
            globe.interval = -1;
        },

        "touchmove" : function (e) {
            e.preventDefault();

            if (globe.gesture) {
                return;
            }

            globe.touch = globe.copytouch(e.touches[0]);
            globe.delta.x = globe.pos.x - globe.touch.x;
            globe.delta.y = globe.pos.y - globe.touch.y;

            globe.publish();
        },

        "gesturestart" : function (e) {
            globe.gesture = true;
        },

        "gesturechange" : function (e) {
            globe.gesture = true;
            var delta = (e.scale - globe.scale) * 1000;
            zoom.publish(delta, function () {
                globe.scale = e.scale;
            });
        },

        "gestureend" : function (e) {
            globe.gesture = false;
        },

        "publish" : throttle(function () {
            p.publish({
                "channel"   : "webgl-visualization-control",
                "message"   : {
                    "type"      : "move",
                    "x"         : globe.delta.x,
                    "y"         : globe.delta.y
                }
            });

            globe.pos.x = globe.touch.x;
            globe.pos.y = globe.touch.y;
            globe.delta.x = 0;
            globe.delta.y = 0;
        }, THROTTLE_TIME)
    };


    var zoom = {
        "into" : function (e) {
            zoom.publish(1000);
            e.preventDefault();
        },

        "out" : function (e) {
            zoom.publish(-1000);
            e.preventDefault();
        },

        "publish" : throttle(function (z, callback) {
            p.publish({
                "channel"   : "webgl-visualization-control",
                "message"   : {
                    "type"      : "zoom",
                    "z"         : z
                }
            });

            if (callback) {
                callback();
            }
        }, THROTTLE_TIME)
    };

    document.addEventListener("DOMContentLoaded", function () {
        document.addEventListener("touchstart",  globe.touchstart, false);
        document.addEventListener("touchend",    globe.touchend,   false);
        document.addEventListener("touchleave",  globe.touchend,   false);
        document.addEventListener("touchcancel", globe.touchend,   false);
        document.addEventListener("touchmove",   globe.touchmove,  false);

        document.addEventListener("gesturestart",  globe.gesturestart,  false);
        document.addEventListener("gestureend",    globe.gestureend,    false);
        document.addEventListener("gesturechange", globe.gesturechange, false);

        var zoom_in = document.getElementById("zoom_in");
        var zoom_out = document.getElementById("zoom_out");
        zoom_in.addEventListener("touchstart",  zoom.into, false);
        zoom_out.addEventListener("touchstart", zoom.out,  false);
    }, false);

})();

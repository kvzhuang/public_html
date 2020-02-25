<?php
$vid = $_GET["vid"];
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="author" content="">
<meta name="created" content="2014-03-24">
<title> Prototype</title>
<link rel="stylesheet" href="http://yui.yahooapis.com/3.7.2/build/cssreset/reset-min.css">
<style type="text/css">
body {
    width: 100%;
    height: 100%;
}
#player {
}
</style>
</head>
<body>
    <div id="player">
    </div>
    <script>
    var isPlaying = 0,
        player;
    var qs = (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'));

    (function() {
        var e = document.createElement('script'); e.async = true;
        e.src = document.location.protocol + '//api.dmcdn.net/all.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(e, s);
    }());

    // This function init the player once the SDK is loaded
    window.dmAsyncInit = function(videoId)
    {
        var vid = "<?php echo htmlspecialchars($vid);?>";
        if (videoId)
        {
            vid = videoId;
        }
        DM.init({
            apiKey: "b28fb00b4e70536289f4",
            status: true,
            cookie: true
        });
        // PARAMS is a javascript object containing parameters to pass to the player if any (eg: {autoplay: 1})
        var param = {
            api:1,
            autoplay:1,
            quality:480,
            related:0
        };
        player = DM.player("player",
            {   video: vid,
                width: "100%", height: "100%", params: param});

        // 4. We can attach some events on the player (using standard DOM events)
        player.addEventListener("apiready", function(e)
        {
            e.target.play();
            player.fullscreen();
        });
        player.addEventListener("play", function (e) {
            if (window.miiiTVPlayer) {
                //window.miiiTVPlayer.play();
            }
            isPlaying = 1;
            console.log("play");
        });
        player.addEventListener("playing", function (e) {
            if (window.miiiTVPlayer ) {
                window.miiiTVPlayer.play();
            }
            isPlaying = 1;
            console.log("playing");
            console.log(player);
            console.log(e);
        });
        player.addEventListener("ended", function (e) {
            if (window.miiiTVPlayer) {
                window.miiiTVPlayer.end();
            }
            isPlaying = 0;
            console.log("ended");
        });

        player.addEventListener("pause", function (e) {
            if (window.miiiTVPlayer && e.target.ended === false) {
                window.miiiTVPlayer.pause();
            }
            isPlaying = 0;
            console.log("pause");
            console.log(e);
        });
    };
    function setFullscreen(status){
        player.setFullscreen(status);
    }
    function getDurationTime() {
        if (! player) {
            return;
        }
        var durationTime = player.duration;
        if (window.miiiTVPlayer) {
            window.miiiTVPlayer.setDurationTime(durationTime);
        }
        return durationTime;
    }

    function getCurrentTime() {
        if (! player) {
            return;
        }
        var time = player.currentTime;
        if (window.miiiTVPlayer) {
            window.miiiTVPlayer.setCurrentTimeint(time);
        }
        return time;
    }

    function loadVideo(videoID) {
        window.dmAsyncInit(videoID);
    }

    function isPlaying() {
        if (! player) {
            return;
        }
        if (window.miiiTVPlayer) {
            window.miiiTVPlayer.setPlaying(isPlaying);
        }
        return isPlaying;
    }
    </script>
</body>
</html>


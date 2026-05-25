var TT;

// viki.com specific stuff

(function (TT) {
    TT.viki = {};
    TT.viki.fetch_track_then = function (bcp47, cont_resolved, cont_failed) {
        // bcp47:    string describing language in bcp47 format
        // cont_resolved: function to use on resolved track fetch
        //   argument = track
        // cont_failed:   function to use on failed   track fetch
        //   no arguments
        const vmplayer_div = document.querySelector("div#vmplayer_id");
        if(! vmplayer_div) {
            console.log("'div#vmplayer_id' not initialized yet");
            cont_failed();
            return;
        }
        var subs = vmplayer_div.player.options_.streamSubtitles.dash;

        var idx = subs.findIndex(function (x) { return x.srclang == bcp47; })
        if (idx < 0) {
            console.log("could not find subtitle for language ", bcp47);
            cont_failed();
            return;
        }

        function process_webvtt(sub_string_webvtt) {
            var id = "TT-" + bcp47;

            TT.sub_response = (TT.sub_response || (TT.sub_response = {}))
            TT.sub_response[bcp47] = sub_string_webvtt;
            var sub = TT.cue_array_to_webvtt(TT.webVTT_to_cue_array(sub_string_webvtt.replace(/\r?\n/g, "\n")));
            TT.sub_webVTT = (TT.sub_webVTT || (TT.sub_webVTT = {}))
            TT.sub_webVTT[bcp47] = sub;
            var url = URL.createObjectURL(new Blob([sub], { type: 'text/vtt' })).toString();

            var track = document.createElement("track");
            track.kind = "captions";
            track.src = url;
            track.id = id;
            track.srclang = bcp47;
            return track;
        }

        var url = subs[idx].src;
        fetch(url)
            .then(
                function (r) {
                    if (!r.ok) {
                        console.log("ERROR: response from 'url' (" + url + ") was not \"ok\"");
                        throw new Error("ERROR: response from 'url' (" + url + ") was not \"ok\"");
                    }
                    return r.text();
                },
                function () {
                    console.log("ERROR: could not fetch 'url' (" + url + ")");
                    throw new Error("ERROR: could not fetch 'url' (" + url + ")");
                })
            .then(
                function (sub_string_webvtt) {
                    cont_resolved(process_webvtt(sub_string_webvtt));
                },
                function () {
                    console.log("ERROR: could not extract \".text()\" of response from 'url' (" + url + ")");
                    throw new Error("ERROR: could not extract \".text()\" of response from 'url' (" + url + ")");
                })
    }
})(TT || (TT = {}));
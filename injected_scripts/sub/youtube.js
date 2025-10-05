var TT;

// youtube.com specific stuff

(function (TT) {
    TT.youtube = {};
    TT.youtube.xml_to_cue_array = function (xml) {

        var parser = new DOMParser();
        xml = parser.parseFromString(xml, 'text/xml');

        var transcript = xml.querySelector('transcript');
        var cues = transcript.querySelectorAll('text');

        var acc = [];
        for (var i = 0; i < cues.length; i++) {
            var x = cues[i]
            // NOTE: / TODO: 'start' and 'dur' attributes assumed to be given in seconds as floating point numbers with max 3 decimal places
            // ⇝ Math.floor should not change number
            var beg_ms = Math.floor(parseFloat(x.getAttribute('start')) * 1000);
            var dur_ms = Math.floor(parseFloat(x.getAttribute('dur')) * 1000);
            acc.push({
                beg_ms: beg_ms,
                end_ms: beg_ms + dur_ms,
                txt: x.textContent
            })
        }
        return acc;
    }

    TT.youtube.fetch_track_then = function (bcp47, cont_resolved, cont_failed) {
        // bcp47:    string describing language in bcp47 format
        // cont_resolved: function to use on resolved track fetch
        //   argument = track
        // cont_failed:   function to use on failed   track fetch
        //   no arguments

        // Variable 'ytInitialPlayerResponse' is mentioned in https://stackoverflow.com/a/68711617
        // as possible source to obtain more information about the video.
        // In https://stackoverflow.com/a/74770780 it says that 'ytInitialPlayerResponse'
        // contains the needed subtitle information.

        // TODO: sometimes 'ytInitialPlayerResponse' does not exist
        //       WORKAROUND: refresh page
        if (ytInitialPlayerResponse === undefined) {
            console.log("ERROR: 'ytInitialPlayerResponse' === undefined; WORKAROUND: refresh page");
            alert("ERROR: 'ytInitialPlayerResponse' === undefined; WORKAROUND: refresh page");
            return cont_failed();
        }
        var subs = ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;

        var idx = subs.findIndex(function (x) { return x.languageCode == bcp47; })
        if (idx < 0) {
            console.log("could not find subtitle for language ", bcp47);
            cont_failed();
            return;
        }
        const url = subs[idx].baseUrl;

        function process_xml(sub_string_xml) {
            var id = "TT-" + bcp47;

            TT.sub_response = (TT.sub_response || (TT.sub_response = {}))
            TT.sub_response[bcp47] = sub_string_xml;
            var sub = TT.cue_array_to_webvtt(TT.youtube.xml_to_cue_array(sub_string_xml));
            // WORKAROUND: transform HTML entities
            // dict: HTML entity string → character (as string)
            const _dict = {
                "&#39;": "'",
                "&quot;": '"'
            }
            // the following line does (sub.replace(/KEY[0]|KEY[1]…/g, string => _dict[string]))
            sub = sub.replace(new RegExp(`${Object.keys(_dict).join("|")}`, "g"), string => _dict[string])
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

        // TODO: it seems to be broken; we only receive an empty line
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
                function (sub_string_xml) {
                    cont_resolved(process_xml(sub_string_xml));
                },
                function () {
                    console.log("ERROR: could not extract \".text()\" of response from 'url' (" + url + ")");
                    throw new Error("ERROR: could not extract \".text()\" of response from 'url' (" + url + ")");
                })
    }
})(TT || (TT = {}));
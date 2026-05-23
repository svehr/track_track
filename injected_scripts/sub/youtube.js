var TT;

// youtube.com specific stuff

(function (TT) {
    TT.youtube = {};

    TT.youtube.json_to_cue_array = function (json) {

        sub_info = JSON.parse(json);
        return sub_info.events.map((e) => ({
                beg_ms: e.tStartMs,
                end_ms: e.tStartMs + e.dDurationMs,
                txt: e.segs.filter((s) => s.utf8).map((s) => s.utf8).join('\n'),
        }));
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

        function process_json(sub_string_json) {
            var id = "TT-" + bcp47;

            TT.sub_response = (TT.sub_response || (TT.sub_response = {}))
            TT.sub_response[bcp47] = sub_string_json;
            var sub = TT.cue_array_to_webvtt(TT.youtube.json_to_cue_array(sub_string_json));
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

        let get_webpo_client = window.top['havuokmhhs-0']?.bevasrs?.wpc
        mws_params = {
            'c': ytInitialPlayerResponse.videoDetails.videoId,
            'e': undefined,
            'mc': true,
            'me': true,
        }
        get_webpo_client().then((client) => client.mws(mws_params)).catch(
            (e) => {{
                if (String(e).includes('SDF:notready')) {{
                    return 'backoff';
                }}
                else {{
                    throw e;
                }}
            }}
        ).then(
            function (po_token) {
                u = new URL(url)
                endpoint = u.origin + u.pathname
                query_string = "?" + new URLSearchParams(u.search).toString() + `&potc=1&pot=${encodeURIComponent(po_token)}&fmt=json3&xorb=2&xobt=3&xovt=3&cbr=Chrome&cbrver=143.0.0.0&c=WEB&cver=2.20260521.00.00&cplayer=UNIPLAYER&cos=X11&cplatform=DESKTOP`
                url_with_pot = endpoint + query_string
                fetch(url_with_pot)
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
                        function (sub_string_json) {
                            cont_resolved(process_json(sub_string_json));
                        },
                        function () {
                            console.log("ERROR: could not extract \".text()\" of response from 'url' (" + url + ")");
                            throw new Error("ERROR: could not extract \".text()\" of response from 'url' (" + url + ")");
                        })
            },
            function () {
                console.log("ERROR: could not get PO token");
                throw new Error("ERROR: could not get PO token");
            }
        )
    }
})(TT || (TT = {}));
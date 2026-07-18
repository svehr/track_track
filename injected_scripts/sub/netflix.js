var TT;

// netflix.com specific stuff

(function (TT) {
    TT.netflix = {};

    // dictionary: movie id → (dictionary: language (bcp47) → array of URLs to obtain subtitle track)
    TT.netflix.subtitle_track_webvtt_url_cache = {};

    TT.netflix.init = function() {
        // The following setup is i.e. needed for 'TT.netflix.fetch_track_then__via_easysubs_method'
        const netflix_webvtt_id = "webvtt-lssdh-ios8";

        // The following code overwrites JSON.stringify and JSON.parse.
        // The idea behind this is the following:
        // "Messages" passed between the browser and netflix are intercepted.
        // The URLs where subtitle tracks for specific languages can be downloaded can be obtained from these messages.
        //   * JSON.stringify is modified to request _all_ available subtitle tracks in _webvtt format_
        //   * JSON.parse is modified to extract available subtitle tracks and their download URLs
        // The just described idea was found in (a now older version of) the 'easysubs' chromium extension (https://github.com/Nitrino/easysubs);
        // see https://github.com/Nitrino/easysubs/blob/054d495928e5e1f82be56b6768aa4ed4295dd301/src/services/netflix.ts .

        const json_stringify = JSON.stringify;
        window.JSON.stringify = function(value) {
            // some attributes of 'value' may contain encoded information
            const decoded_value = json_parse(json_stringify(value));

            // only change "messages" that are relevant to us
            if (decoded_value && decoded_value.params)
            {
                console.log("JSON.stringify -> ", decoded_value)
                if (! decoded_value.params.showAllSubDubTracks) {
                    // NOTE: request server to give info about all available subtitle tracks
                    decoded_value.params.showAllSubDubTracks = true;
                }
                if (decoded_value.params.profiles) {
                    // NOTE: request server to include url(s) to retrieves WEBVTT version of subtitles
                    decoded_value.params.profiles.push(netflix_webvtt_id);
                }
            }
            return json_stringify(decoded_value);
        };

        const json_parse = JSON.parse;
        window.JSON.parse = function(value) {
            const data = json_parse(value);
            // only consider "messages" that are relevant to us
            if (data && data.result && data.result.textTracks)
            {
                console.log("JSON.parse -> ", data)
                const lang_dict = {};
                var T = data.result.textTracks;
                for(var i = 0; i < T.length; i += 1)
                {
                    var t = T[i]
                    if(t.downloadables && t.downloadables[netflix_webvtt_id])
                    {
                        var urls_dict = t.downloadables[netflix_webvtt_id].urls;
                        var urls_dict_keys = Object.keys(urls_dict);
                        const urls = new Array(urls_dict_keys.length);
                        for(var j = 0; j < urls_dict_keys.length; j += 1)
                        { urls[j] = urls_dict[urls_dict_keys[j]].url; }
                        lang_dict[t.language] = urls;
                    }
                    else
                    {
                        console.log(`WARN: json_parse: no download urls found for language '${t}.language'`)
                    }
                }
                TT.netflix.subtitle_track_webvtt_url_cache[data.result.movieId] = lang_dict;
            }
            return data
        }
    }

    TT.netflix.DXFP_to_cue_array = function (xml) {
        xml = xml.replace(/<br[ ]*\/>/g, '\n');
        var parser = new DOMParser();
        xml = parser.parseFromString(xml, 'text/xml');
        var div = xml.querySelector('div');

        var ticks_per_s  = parseInt(xml.querySelector('tt').getAttribute("ttp:tickRate")); // should be 10^7
        var ticks_per_ms = ticks_per_s / 1000;

        var cues = div.querySelectorAll('p');
        // NOTE: / TODO:  time format checking && error handling
        // currently 'begin' and 'end' attributes are assumed to have formata
        // "${number}t"
        var acc = [];
        for (var i = 0; i < cues.length; i++) {
            var x = cues[i]
            acc.push({beg_ms: parseInt(x.getAttribute('begin')) / ticks_per_ms,
                      end_ms: parseInt(x.getAttribute('end'))   / ticks_per_ms,
                      txt: x.textContent})
        }
        return acc;
    }

    TT.netflix.fetch_track_then__via_easysubs_method = function (bcp47, cont_resolved, cont_failed) {
        // bcp47:    string describing language in bcp47 format
        // cont_resolved: function to use on resolved track fetch
        //   argument = track
        // cont_failed:   function to use on failed   track fetch
        //   no arguments
        // NOTE: depends on TT.netflix.subtitle_track_webvtt_url_cache being built externally;
        //       c.f. TT.netflix.init

        const video_id = window.location.pathname.match(/\/watch\/(.*)/)[1];

        var lang_dict = TT.netflix.subtitle_track_webvtt_url_cache[video_id];
        if(! lang_dict)
        {
            console.log(`ERROR: could not find entry for current movie id ⦓${video_id}⦔ in 'TT.netflix.subtitle_track_webvtt_url_cache'.`);
            cont_failed();
            return;
        }

        var urls = lang_dict[bcp47];
        if((! urls) || urls.length < 1)
        {
            console.log("ERROR: could not find download urls for current language in 'TT.netflix.subtitle_track_webvtt_url_cache'.");
            cont_failed();
            return;
        }

        // TODO: try random and or all urls in turn
        var url = urls[0];
        fetch(url)
            .then(
                function(r){
                    if(! r.ok)
                    { console.log("ERROR: response from 'url' (" + url + ") was not \"ok\"");
                      throw new Error("ERROR: response from 'url' (" + url + ") was not \"ok\""); }
                    return r.text(); },
                function(){
                    console.log("ERROR: could not fetch 'url' (" + url + ")");
                    throw new Error("ERROR: could not fetch 'url' (" + url + ")"); })
            .then(
                function(sub_string_webvtt){
                    var id = "TT-" + bcp47;

                    TT.sub_response = (TT.sub_response || (TT.sub_response = {}))
                    TT.sub_response[bcp47] = sub_string_webvtt;
                    var sub = TT.cue_array_to_webvtt(TT.webVTT_to_cue_array(sub_string_webvtt.replace(/\r?\n/g, "\n")));
                    TT.sub_webVTT = (TT.sub_webVTT || (TT.sub_webVTT = {}))
                    TT.sub_webVTT[bcp47] = sub;
                    var url = URL.createObjectURL(new Blob([sub], { type: 'text/vtt' })).toString();

                    var track  = document.createElement("track");
                    track.kind = "captions";
                    track.src  = url;
                    track.id   = id;
                    track.srclang = bcp47;

                    cont_resolved(track);
                },
                function(){
                    console.log("ERROR: could not extract \".text()\" of response from 'url' (" + url + ")");
                    throw new Error("ERROR: could not extract \".text()\" of response from 'url' (" + url + ")");})
            .catch(
                function() {
                    cont_failed();})
    }

})(TT || (TT = {}));
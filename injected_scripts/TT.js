var TT;

// this file provides core functionality to be used in "init.js"
// sub-title (and website) specific stuff is in "./sub/"

(function (TT) {
    TT.SITE = {
        netflix: 0,
        viki: 1,
        youtube: 2,
    };
    SITE = TT.SITE;

    const SITE_count = Object.keys(SITE).length;

    TT.SITE_origin_dict = {
        "https://www.netflix.com": SITE.netflix,
        "https://www.viki.com": SITE.viki,
        "https://www.youtube.com":   SITE.youtube,
    };

    // abbrev: vtt ≙ video texttrack
    TT.vtt1_info = {
        name: "(left)",
        tracklist_elem: null,
        cue_parent_id_string: "vtt1_anchor_div",
        cue_parent: null,
        cue_parent_left: "0", /* offset on left side relative to video element width */
        cue_parent_style_width: "32%",
        cue_class_string: "vtt1_cue",
        displayedCues: [] /* array of {cue: CUE, elem: DOM-ELEMENT}*/,
        oncuechange_fn: null,
        track: null /* „active“ element from "video".textTracks */,
        button: {} /* dictionary: (bcp47 → button) */,
    };

    TT.vtt2_info = {
        name: "(right)",
        tracklist_elem: null,
        cue_parent_id_string: "vtt2_anchor_div",
        cue_parent: null,
        cue_parent_left: "0.68", /* offset on left side relative to video element width */
        cue_parent_style_width: "32%",
        cue_class_string: "vtt2_cue",
        displayedCues: [] /* array of {cue: CUE, elem: DOM-ELEMENT}*/,
        oncuechange_fn: null,
        track: null /* „active“ element from "video".textTracks */,
        button: {} /* dictionary: (bcp47 → button) */,
    };

    TT.bcp47_track_dict = {}; // dict: language in bcp47 format → track (from "video".textTracks)

    TT.video_src = undefined; // used to see whether video changed

    function mk_select_track_fn(fetch_track_then) {
        // fetch_track_then: function that creates a track
        //   arguments: bcp47
        //     bcp47:         string describing language in bcp47 format
        //     cont_resolved: function to use on resolved track fetch
        //       argument = track
        //     cont_failed:   function to use on failed   track fetch
        //       no arguments
        return function (bcp47, info) {
            // bcp47: language in bcp47 format
            // info:  1 of vtt1_info, vtt2_info
            var video = document.querySelectorAll('video')[0];
            if (!video) { console.log("'video' element missing"); return; };


            if (TT.video_src !== video.src) { TT.bcp47_track_dict = {}; }
            TT.video_src = video.src

            if (TT.bcp47_track_dict[bcp47]) {
                enable_vtt(info, TT.bcp47_track_dict[bcp47])
            } else {
                var cont = function (track_elem) {
                    video.appendChild(track_elem);
                    TT.bcp47_track_dict[bcp47] = track_elem.track;
                    enable_vtt(info, track_elem.track);
                }
                fetch_track_then(bcp47, cont, function () {})
            }
        }
    }

    const select_track_fn = new Array(SITE_count);
    select_track_fn[SITE.netflix] = mk_select_track_fn(TT.netflix.fetch_track_then__via_easysubs_method);
    select_track_fn[SITE.viki] = mk_select_track_fn(TT.viki.fetch_track_then);
    select_track_fn[SITE.youtube] = mk_select_track_fn(TT.youtube.fetch_track_then);

    TT.mk_select_lang_button = function (bcp47, info, site) {
        var b = document.createElement("button");
        var id = "select_" + info.name + "_" + bcp47 + "_button";
        var label = "'" + bcp47 + "'"
        if (!b) { console.log("'#" + id + "' missing"); return; };
        b.id = id;
        b.classList.add('vtt_select_lang_button');
        b.textContent = label;

        b.addEventListener('click', function () {
            console.log(label);
            select_track_fn[site](bcp47, info);
        }, false);
        b.disabled = false;

        info.button[bcp47] = b;
        return b;
    }

    function disable_vtt(info) {
        // info:  one of {vtt1_info vtt2_info}
        // PRECONDITION: vtt is "active" (info.track !== null)
        // returns track that was active at start of function
        info.track.removeEventListener('cuechange', info.oncuechange_fn, false);
        info.displayedCues.forEach(function (ci) { ci.elem.remove() });
        info.track = null;
        return track;
    }

    function enable_vtt(info, track) {
        // info:  one of {vtt1_info vtt2_info}
        // track: track from "video".textTracks

        var video = document.querySelectorAll('video')[0];
        if (!video) { console.log("'video' element missing"); return; };

        var cue_parent = document.querySelector("#" + info.cue_parent_id_string);
        if (cue_parent) { cue_parent.remove(); };
        var cue_parent = document.createElement("div")
        cue_parent.id = info.cue_parent_id_string
        cue_parent.style.width = info.cue_parent_style_width;
        cue_parent.style.left = `${info.cue_parent_left * video.clientWidth}px`;
        info.cue_parent = cue_parent;

        // NOTE: when DOM element e is full-sreen:
        //       track / cues must be descendants of e to be visible
        // NOTE: heuristic:
        //       make vtt1_anchor_div a sibling of 'video' (video.parentNode.appendChild(vtt1_anchor_div))
        //       should more or less be guaranteed to work
        //       ⦓except if 'video' itself is made fullscreen;
        //        but then no overlay possible (also not for website itself "natively")⦔
        video.parentNode.appendChild(cue_parent);

        if (info.track) { info.track.removeEventListener('cuechange', info.oncuechange_fn, false); }

        info.track = track;
        const fn = mk_oncuechange_fn(video, track, info);
        info.oncuechange_fn = fn;
        track.addEventListener('cuechange', fn, false);
        track.mode = "hidden";

        Object.values(info.button).forEach(button => button.classList.remove("vtt_select_lang_button_active"));
        var b = info.button[track.language];
        if (b) { b.classList.add("vtt_select_lang_button_active"); }
    }

    function mk_oncuechange_fn(video, track, info) {
        // video: <video> element
        // track: element from video.textTracks
        // info:  one of {vtt1_info vtt2_info}
        return function () {

            // sort activeCues and info.displayedCues by cue indices but save original position
            var A = [];
            for (var j = 0; j < track.activeCues.length; j += 1) {
                A.push({
                    id: parseInt(track.activeCues[j].id),
                    cue: track.activeCues[j], pos: j
                })
            }

            var D = info.displayedCues.map(function (ci, k) {
                return {
                    id: parseInt(ci.cue.id),
                    ci: ci,
                    pos: k
                };
            });

            A.sort(function (l, r) { return l.id - r.id; });
            D.sort(function (l, r) { return l.id - r.id; });

            new_cues = [];
            kept_cues_info = [];
            var j = 0;
            var k = 0;
            while (j < A.length && k < D.length) {
                if (A[j].id < D[k].id) {
                    new_cues.push(A[j].cue);
                    j += 1;
                }
                else if (A[j].id === D[k].id) { // currently displayed cue still active
                    kept_cues_info.push(D[k].ci)
                    j += 1;
                    k += 1;
                }
                else // if (A[k].id < D[k].id )
                {
                    D[k].ci.elem.remove();
                    D[k].ci.elem = null;
                    k += 1;
                }
            }
            // max 1 of the following 2 for loops will be executed
            for (; j < A.length; j += 1) { new_cues.push(A[j].cue); }
            for (; k < D.length; k += 1) {
                D[k].ci.elem.remove();
                D[k].ci.elem = null;
            }

            mk_cue_info = function (cue, top) {
                const cue_p = document.createElement('div');
                cue_p.classList.toggle(info.cue_class_string);
                cue_p.innerText = cue.text;
                cue_p.style.position = "absolute";
                cue_p.style.top = top.toString() + "px";
                return {
                    cue: cue,
                    elem: cue_p
                };
            }

            // NOTE: cues are positioned relative to parent node (cue_parent)
            // NOTE: wrapping around does only really make sense once
            //       else we need to overwrite an old cue anyway
            // NOTE: INVARIANT:
            //       info.displayedCues is sorted wrt position of elements on screen
            //       from top to bottom
            const cue_gap_top_px = 65; // TODO: hardcoded vertical gap to top border
            const cue_gap_bottom_px = 55; // TODO: hardcoded vertical gap to bottom border
            const cue_gap_px = 8; // TODO: hardcoded vertical "gap" between cues
            if (kept_cues_info.length === 0) {
                info.displayedCues = [];

                // add all new cues after cue_parent
                var next_top = cue_gap_top_px;
                for (var j = 0; j < new_cues.length; j += 1) {
                    var ci = mk_cue_info(new_cues[j], next_top);
                    info.displayedCues.push(ci);
                    info.cue_parent.appendChild(ci.elem);
                    next_top = ci.elem.offsetTop + ci.elem.offsetHeight + cue_gap_px;
                }
                // "wraparound" could be possible here
                // BUT:
                //   * unlikely ; would be hard to hear / understand for viewer
                //   * no real solution possible anyway?
                //     whole screen would be filled
            }
            else {
                info.displayedCues = kept_cues_info;

                // case ⇒ we have at least 1 kept cue
                const _last_cue = kept_cues_info[kept_cues_info.length - 1];
                var next_top = _last_cue.elem.offsetTop + _last_cue.elem.offsetHeight + cue_gap_px;

                // keep adding new cues; wrap around if cue (+ cue_gap_bottom_px) ends below viewport or video
                // NOTE: netflix video element is (sometimes / always?) out of viewport bounds
                wrap_around_cues = [];
                var j = 0
                while (j < new_cues.length) {
                    var ci = mk_cue_info(new_cues[j], next_top);
                    next_top = ci.elem.offsetTop + ci.elem.offsetHeight + cue_gap_px;
                    j += 1;

                    info.cue_parent.appendChild(ci.elem);
                    const cue_out_of_viewport_bounds = (ci.elem.getBoundingClientRect().bottom + cue_gap_bottom_px) >= window.innerHeight;
                    const cue_out_of_video_bounds = (ci.elem.offsetTop + ci.elem.offsetHeight + cue_gap_bottom_px) >= video.clientHeight;
                    if (cue_out_of_viewport_bounds
                        || cue_out_of_video_bounds) {
                        wrap_around_cues.push(ci);
                        ci.elem.style.top = `${cue_gap_top_px}px`;
                        next_top = ci.elem.offsetTop + ci.elem.offsetHeight + cue_gap_px;
                        break;
                    }
                    else { info.displayedCues.push(ci); }
                }
                // wrapping around again does not make sense
                for (; j < new_cues.length; j += 1) {
                    var ci = mk_cue_info(new_cues[j], next_top);
                    wrap_around_cues.push(ci);
                    info.cue_parent.appendChild(ci.elem);
                    next_top = ci.elem.offsetTop + ci.elem.offsetHeight + cue_gap_px;
                }
                info.displayedCues = wrap_around_cues.concat(info.displayedCues);
            }

        };
    }

    TT.init_video_texttrack_controller = function (div) {
        // div: <div> HTML element
        // // video texttrack controller
        // <div id="video_texttrack_controller">
        //   <div id="vttc_header">
        //     video texttrack controller
        //   </div>
        //   <div id="vtt_control">
        //     <div id="vtt1_control">
        //       <button id="select_vtt1_en_button">select 'en' for vtt1</button>
        //       <button id="select_vtt1_de_button">select 'de' for vtt1</button>
        //     </div>
        //     <div id="vtt2_control">
        //       <button id="select_vtt2_ko_button">select 'ko' for vtt2</button>
        //       <button id="select_vtt2_fr_button">select 'fr' for vtt2</button>
        //     </div>
        //   </div>
        // </div>
        div.id = 'video_texttrack_controller'
        // abbrev: vttc ≙ video_texttrack_controller
        document.querySelector('body').appendChild(div);

        var header_div = document.createElement("div");
        if (!header_div) { console.log("'#vttc_header' missing"); return; };
        header_div.id = "vttc_header";
        header_div.textContent = "Track Track";
        div.appendChild(header_div);

        var header_div_mousedown_clientX = 0;
        var header_div_mousedown_clientY = 0;
        var header_div_mousedown_elem = null;

        function handle_header_div_mousedown_targetphase(ev) {
            header_div_mousedown_clientX = ev.clientX;
            header_div_mousedown_clientY = ev.clientY;
            header_div_mousedown_elem = ev.target.parentNode
            header_div_mousedown_elem.classList.toggle("selected", true)
            // NOTE: window mousedown used only in capture phase
            //       else we would need to stop event propagation
            //         ev.stopPropagation();
        }

        function handle_window_mousedown_capturephase(ev) {
            if (header_div_mousedown_elem !== null) {
                header_div_mousedown_elem.style.left = `${header_div_mousedown_elem.offsetLeft + (ev.clientX - header_div_mousedown_clientX)}px`;
                header_div_mousedown_elem.style.top = `${header_div_mousedown_elem.offsetTop + (ev.clientY - header_div_mousedown_clientY)}px`;
                header_div_mousedown_elem.classList.toggle("selected", false)
            }
            header_div_mousedown_elem = null;
        }

        window.addEventListener("mousedown", handle_window_mousedown_capturephase, { capture: true });
        header_div.addEventListener("mousedown", handle_header_div_mousedown_targetphase, false);
    }
})(TT || (TT = {}));
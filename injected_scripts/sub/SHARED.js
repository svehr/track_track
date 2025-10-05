var TT;

// stuff shared between multiple sites

(function (TT) {
    function ms_float_to_clock_dict(ms) {
        // all numbers rounded down
        var h = Math.floor(ms / 3600000);
        ms = ms - (h * 3600000);
        var min = Math.floor(ms / 60000);
        ms = ms - (min * 60000);
        var s = Math.floor(ms / 1000);
        ms = ms - (s * 1000);
        return {
            h: h,
            min: min,
            s: s,
            ms: ms
        };
    }

    function _2digs_str(num) {
        return num < 10
            ? ("0" + num.toString())
            : num.toString();
    }

    function _3digs_str(num) {
        return num < 10
            ? ("00" + num.toString())
            : (num < 100 ? "0" + num.toString() : num.toString());
    }


    TT.cue_array_to_webvtt = function (cues) {
        var acc = "WEBVTT FILE\n\n";
        for (var i = 0; i < cues.length; i++) {
            var c = cues[i];
            var DURATION_INCREASE = 1.0; // new_duration = (1 + DURATION_INCREASE) * original_duration
            var beg = ms_float_to_clock_dict(Math.floor(c.beg_ms));
            var end = ms_float_to_clock_dict(Math.ceil(c.end_ms + DURATION_INCREASE * (c.end_ms - c.beg_ms)));

            acc += i.toString(10)
                + "\n"
                + `${_2digs_str(beg.h)}:${_2digs_str(beg.min)}:${_2digs_str(beg.s)}.${_3digs_str(beg.ms)}`
                + " --> "
                + `${_2digs_str(end.h)}:${_2digs_str(end.min)}:${_2digs_str(end.s)}.${_3digs_str(end.ms)}`
                + "\n"
                + c.txt
                + "\n\n";
        }
        return acc;
    }

    TT.webVTT_to_cue_array = function (string) {
        // NOTE: PRECONDITION: "\n" is only newline character used in 'string' (i.e. no "\r")
        //   * else:   every line still contains linefeeds / newlines
        //           ⇝ empty lines cannot be detected correctly
        acc = [];

        var lines = string.split("\n");
        if (!lines[0].startsWith("WEBVTT")) {
            console.log("string does not start with 'WEBVTT'")
            // NOTE: / TODO: technically there must be 1 space after WEBVTT in case there is some header after it
            return acc;
        }

        for (var i = 1; i < lines.length; i += 1) {
            var l = lines[i]
            if (l === "") { continue; }
            else if (l === "NOTE"
                || l === "STYLE") {
                // NOTE: / TODO: currently ignored:
                i += 1;
                while (i < lines.length
                    && lines[i] !== "") { i += 1; }
                if (i < lines.length) { i += 1; }
            }
            else {
                // arrow_line: index of line (in block) containing arrow;
                //             i - 1 if not found
                var arrow_line = l.includes("-->")
                    ? i
                    : (i - 1);
                var j = i + 1; // will be: index of first line after block
                while (j < lines.length
                    && lines[j] !== "") {
                    if (lines[j].includes("-->")) { arrow_line = j; }
                    j += 1;
                }

                if (arrow_line >= i) {
                    // ⇔ arrow was found
                    // NOTE: currently
                    //   * all lines preceding arrow_line are ignored
                    //   * all lines after arrow_line belong to the cue text

                    // TODO: do not search for arrow twice (split)
                    var a = lines[arrow_line];
                    var _i = a.indexOf("-->")
                    var beg_string = a.substring(0, _i - 1);
                    var _k = a.indexOf(" ", _i + 4);
                    var end_string = a.substring(_i + 4, (_k < 0 ? undefined : _k));

                    // NOTE: assumed time format for both: hh:mm:ss.ttt (where ttt is miliseconds)
                    function hhmmssttt_to_ms(x) {
                        var h = parseInt(x.substring(0, 2));
                        var min = parseInt(x.substring(3, 5));
                        var s = parseInt(x.substring(6, 8));
                        var ms = parseInt(x.substring(9));
                        return h * (3600000) + min * (60000) + s * 1000 + ms;
                    }
                    var beg_ms = hhmmssttt_to_ms(beg_string);
                    var end_ms = hhmmssttt_to_ms(end_string);

                    var txt = "";
                    for (var k = arrow_line + 1; k < (j - 1); k += 1) { txt += lines[k] + "\n"; }
                    if (k < j) {
                        txt += lines[k];
                        k += 1;
                    };

                    // WORKAROUND: remove xml tags
                    var txt_orig = txt;
                    var txt = txt_orig.replace(/<[^>]*>/g, '');

                    acc.push({
                        beg_ms: beg_ms,
                        end_ms: end_ms,
                        txt: txt,
                        txt_orig: txt_orig
                    });
                }

                i = j < lines.length ? (j + 1) : j;
            }
        }
        return acc;
    }
})(TT || (TT = {}));
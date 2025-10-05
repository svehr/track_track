var TT;

// uses stuff from "TT.js" to initialise a user interface (a div) overlaying the (supported) website

(function (TT) {

    function init() {
        const site = TT.SITE_origin_dict[window.location.origin];
        if (site === undefined) {
            console.log("unsupported website: ", window.location.origin);
            return;
        };

        if (site === TT.SITE.netflix) { TT.netflix.init(); }

        var panel = document.createElement("div")
        TT.init_video_texttrack_controller(panel);

        var vtt_control = document.createElement("div");
        vtt_control.id = "vtt_control";
        panel.appendChild(vtt_control);
        var vtt1_control = document.createElement("div");
        vtt1_control.id = "vtt1_control";
        vtt_control.appendChild(vtt1_control);
        var vtt2_control = document.createElement("div");
        vtt2_control.id = "vtt2_control";
        vtt_control.appendChild(vtt2_control);

        var vtt1_header = document.createElement("span");
        vtt1_header.id = "vtt1_header";
        vtt1_header.textContent = "left";
        var vtt2_header = document.createElement("span");
        vtt2_header.id = "vtt1_header";
        vtt2_header.textContent = "right";

        vtt1_control.appendChild(vtt1_header);
        vtt1_control.appendChild(TT.mk_select_lang_button("en", TT.vtt1_info, site));
        vtt1_control.appendChild(TT.mk_select_lang_button("de", TT.vtt1_info, site));

        vtt2_control.appendChild(vtt2_header);
        vtt2_control.appendChild(TT.mk_select_lang_button("ko", TT.vtt2_info, site));
        vtt2_control.appendChild(TT.mk_select_lang_button("fr", TT.vtt2_info, site));
    }

    // TODO: wait for "video" element to be available
    window.addEventListener('load', init, false);

    TT.init = init;
})(TT || (TT = {}));
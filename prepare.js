// injects scripts in "./injected_scripts/" into the (supported) website

const files = [
    "injected_scripts/sub/SHARED.js",
    "injected_scripts/sub/netflix.js",
    "injected_scripts/sub/viki.js",
    "injected_scripts/sub/youtube.js",
    "injected_scripts/TT.js",
    "injected_scripts/init.js",
];

files.forEach(file => {
    console.log(`TT: injecting '${file}'`);
    const url = chrome.runtime.getURL(file);

    if (url) {
        var script = document.createElement('script');
        script.setAttribute('src', url);
        document.head.appendChild(script);
    }
})

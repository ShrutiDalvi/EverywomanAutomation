    // append listener (this listener will open an URL in a new tab
    var skype_plugin = document.getElementById("skype_plugin_object");
    if (skype_plugin)
    skype_plugin.addEventListener('OpenUrl',
                             function(e)
                             { 
                                  chrome.tabs.create({url: e.data, selected: true});
                             });


    var pref_element = document.createElement("span");
    pref_element.setAttribute("id", "skype_highlighting_settings");
    pref_element.setAttribute("display", "none");
    pref_element.setAttribute(AutoExtractNumbers, window.localStorage[AutoExtractNumbers]);
    pref_element.setAttribute(hightlightingSwitched, window.localStorage[hightlightingSwitched]);
    document.documentElement.appendChild(pref_element);
    pref_element.addEventListener('settingsChanged', function () { window.localStorage[AutoExtractNumbers] = pref_element.getAttribute(AutoExtractNumbers); window.localStorage[hightlightingSwitched] = pref_element.getAttribute(hightlightingSwitched); refreshAllSettings() });

    // Load content script in all tabs
    chrome.tabs.query({}, function (tabs) {
        for (var i = 0; i < tabs.length; ++i) {
            chrome.tabs.executeScript(tabs[i].id, { file: "contentscript.js" });
        }
    });

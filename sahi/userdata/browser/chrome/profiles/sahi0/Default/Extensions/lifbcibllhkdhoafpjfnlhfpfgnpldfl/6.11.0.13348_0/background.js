function ShowOptionsDialog() {
    chrome.windows.getCurrent(onGetWindow);
}

//got current window, getting current tab.
function onGetWindow(win)
{
    chrome.tabs.getSelected(win.id, onGetTab);    
}

//tab found. Here we should tell somehow to content-script that we need to show dialog.
//Note that this code will not work on newly created tabs where no extension contnent-script is loaded.
function onGetTab(tab)
{    
    // send message to content script
    chrome.tabs.getSelected(null, function(tab) {
        if (tab.url.indexOf("chrome://") == 0)
        {
          var skype_plugin = window.parent.document.getElementById("skype_plugin_object");
          if (skype_plugin != null)
          {
               skype_plugin.ShowOptionsDialog();
          }
        }
        else
        {
          chrome.tabs.sendRequest(tab.id, {action: "ShowOptionsDialog"}, function(response) {});
        }
    });   
}

var AutoExtractNumbers = "AutoExtractNumbers";
var hightlightingSwitched = "hightlightingSwitched";
var NameHighlighterEnabled = "NameHighlighterEnabled";

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) { ShowOptionsDialog(); });

if (window.localStorage[hightlightingSwitched] === undefined) {
    window.localStorage.setItem(hightlightingSwitched, "0");
}
if (window.localStorage[AutoExtractNumbers] === undefined)
{
    window.localStorage.setItem(AutoExtractNumbers, "1");	
}
if (window.localStorage[NameHighlighterEnabled] === undefined)
{
    window.localStorage.setItem(NameHighlighterEnabled, "0");	
}
//send highlighting settings from localStorage to contentscript.js
chrome.tabs.getSelected(null, 
    function(tab) 
    {
        chrome.tabs.sendRequest(tab.id, 
        { 
            action : "init",
            numbers: window.localStorage[AutoExtractNumbers],
            switched: window.localStorage[hightlightingSwitched],
            names  : window.localStorage[NameHighlighterEnabled]
        },
        function(response) {});
    }
);

// set up an event listener to handle the messages from the contentscript.js
chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) 
    {
        switch(request.action) 
        {
            case 'set' :
                window.localStorage[AutoExtractNumbers] = request.numbers;
                window.localStorage[hightlightingSwitched] = request.switched;
                //window.localStorage[NameHighlighterEnabled] = request.names; 
                sendResponse();
                refreshAllSettings();
                break;
            case 'get' :
                sendResponse(
                {
                    numbers: window.localStorage[AutoExtractNumbers],
                    switched: window.localStorage[hightlightingSwitched],
                    names  : window.localStorage[NameHighlighterEnabled]
                });
                break;
            case 'open_url' :
                chrome.tabs.create({url: request.url, selected: true});
                sendResponse();
                break;
            default:
                sendResponse();
        }
    }
);

//send new settings to all tabs in all windows
function refreshAllSettings()
{
	chrome.windows.getAll({populate:true}, 
	function(windowList)
	{
		windowList.forEach(
		function(w)
		{
			w.tabs.forEach(
			function(t)
			{
			        chrome.tabs.sendRequest(t.id, 
        			{ 
			            action : "refresh",
			            numbers: window.localStorage[AutoExtractNumbers],
			            switched: window.localStorage[hightlightingSwitched],
			            names  : window.localStorage[NameHighlighterEnabled]
			        },
			        function(response) {});
			});
		});	
	});
};

//Fire onDisconnect event when extension is turned off or removed.
chrome.extension.onConnect.addListener(function(port) {});


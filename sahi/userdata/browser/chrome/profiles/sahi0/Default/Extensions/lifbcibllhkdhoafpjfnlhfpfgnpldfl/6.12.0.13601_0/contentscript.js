/**
 * @file
 * @brief The script that runs in the context of web pages.
 */

if (!alreadyLoaded)
{
var alreadyLoaded = true;

var skype_plugin              = null;
var pref_element              = null;
var custom_stripts_timeout_id = null;

var AutoExtractNumbers = "AutoExtractNumbers";
var hightlightingSwitched = "hightlightingSwitched";
//var NameHighlighterEnabled = "NameHighlighterEnabled";

var set_of_js_files = [ "document_iterator.js", 
                        "find_proxy.js",
                        "get_html_text.js",
                        "global_constants.js",
                        "name_injection_builder.js",
                        "number_injection_builder.js",
                        "menu_injection_builder.js",
                        "string_finder.js",
                        "change_sink.js"];

// set up an event listener to handle the messages from the background.html
chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse)
    {
         try
         {
              if (request.action == "ShowOptionsDialog")
              {
                   // use top-level document
                   if (window.parent)
                   {
                       var skype_plugin = window.parent.document.getElementById("skype_plugin_object");
                       if (skype_plugin != null)
                       {
                            skype_plugin.ShowOptionsDialog();
                       }
                       sendResponse({status: "OK"});
                   }
                   return;
              }
              if (request.action == "init")
              {  
                   if (!pref_element)
                   {
                        createPref(request.numbers, request.names);
                   }
                   initPlugin();
                   sendResponse({status: "OK"});
                   return;
              }
              if (request.action == "refresh")
              {
                   if (!pref_element)  
                   {
                      createPref(request.numbers, request.names);
                   }
                   else 
                   {
                       pref_element.setAttribute(AutoExtractNumbers, request.numbers);
                       pref_element.setAttribute(hightlightingSwitched, request.switched);
                       //pref_element.setAttribute(NameHighlighterEnabled, request.names);
                   }
                   createPrefForIFrames();

                   //notify SkypePlugin
                   var skype_plugin = window.document.getElementById("skype_plugin_object");
                   if (skype_plugin != null)
                   {
                        skype_plugin.RefreshHighlightingSettings();
                   }
                   sendResponse({status: "OK"});
                   return;
              }

         }
         catch(e)
         {
              console.log("error: "+e);
              // sendResponse({status: "ERROR"});
         }
    }
);


// delay an initialization of the plug-in until all custom JS objects are ready
function WaitForCustomScripts()
{
    // make a local copy of the array with JS-file names
    // use slice method to make an independent copy of an array rather than a copy of the refence to it
    var set_of_js_files = window.set_of_js_files.slice();

    var metaCollection = document.getElementsByTagName('meta');
    var length = metaCollection.length;
    for(var i = 0; i < length; ++i)
    {
        // remove name from the array
        var index = set_of_js_files.indexOf(metaCollection[i].name);
        if (index != -1)
        {
            set_of_js_files.splice(index, 1);
        }
    } 

    // array should be empty == all files are loaded
    return (set_of_js_files.length == 0 && document.readyState != 'loading');
}


function initPlugin()
{
	try
    {
        if (!WaitForCustomScripts())
        {
            clearTimeout(custom_stripts_timeout_id);
            custom_stripts_timeout_id = setTimeout(function(){initPlugin()}, 100);
            return;
        }

		var docUrlLower = document.location.href.toLowerCase();
    	if (docUrlLower.indexOf("youtube.") != -1 || docUrlLower.indexOf("vimeo.") != -1)
		{
			console.log("Sorry no flash websites allowed for highlighting");
			return;
		}
			
        if (!skype_plugin)
        {
            // create new object
            skype_plugin = document.createElement("object");

            // append listener (this listener will open an URL in a new tab
            skype_plugin.addEventListener('OpenUrl',
                                     function(e)
                                     {
                                          chrome.extension.sendRequest({action:"open_url", url:e.data})
                                     });

            // set attributes
            skype_plugin.setAttribute("id",                "skype_plugin_object");
            // WORKAROUND: sometimes location.href is void when we receive it via NPAIP :( 
            skype_plugin.setAttribute("location.href",     encodeURI(document.location.href));
            skype_plugin.setAttribute("location.hostname", encodeURI(document.location.hostname));
            skype_plugin.style.position   = "absolute";
            skype_plugin.style.visibility = "hidden";
            skype_plugin.style.left       = "-100px";
            skype_plugin.style.top        = "-100px";
            skype_plugin.width            = 0;
            skype_plugin.height           = 0;
            skype_plugin.type             = "application/x-vnd.skype.click2call.chrome.5.7.0";

            // append object to the document
            document.documentElement.appendChild(skype_plugin);

            createPrefForIFrames();
//            initPluginForIframes();
            // actually we should wait for all JS files and only then create a skype_plugin object
            setTimeout(function(){initPluginForIframes()}, 1000);

        }
    }
    catch(e)
    {
         console.log('e is '+e);
    }                                
}
function initPluginForIframes()
{
	try
	{
		var frames = document.getElementsByTagName('iframe');
		for (var frameIdx = 0; frameIdx < frames.length; frameIdx++)
		{
			var frame = frames[frameIdx];
			if (!frame)
			{
				continue;
			}
			// Do not load the plugin for iframes from youtube or vimeo, to dramatically reduce the incidence of
			// crashes due to interactions with Flash in iframes. (TBAR-6920)			
			frameSrcLower = frame.src.toLowerCase();
			if (frameSrcLower.indexOf("youtube.") != -1 || frameSrcLower.indexOf("vimeo.") != -1)
			{
				continue;
			}
			var doc = frame.contentDocument;
			if (!doc || frame.skype_plugin)
			{
				continue;
			}

			var skype_plugin = doc.createElement("object");

			skype_plugin.addEventListener('OpenUrl',
                        			      function(e)
			                              {
		                        	              chrome.extension.sendRequest({action:"open_url", url:e.data})
                			              });
			skype_plugin.setAttribute("id", "skype_plugin_object");
			// WORKAROUND: sometimes location.href is void when we receive it via NPAIP :(
			skype_plugin.setAttribute("location.href",     encodeURI(document.location.href));
			skype_plugin.setAttribute("location.hostname", encodeURI(document.location.hostname));
			skype_plugin.style.position   = "absolute";
			skype_plugin.style.visibility = "hidden";
			skype_plugin.style.left       = "-100px";
			skype_plugin.style.top        = "-100px";
			skype_plugin.width            = 0;
			skype_plugin.height           = 0;
			skype_plugin.type             = "application/x-vnd.skype.click2call.chrome.5.7.0";

			doc.documentElement.appendChild(skype_plugin);
			frame.skype_plugin = skype_plugin;
		}
	}
	catch(e)
	{
		console.log(e);
	}

}

function createPrefForIFrames()
{
	try 
	{
		var prefParent = window.document.getElementById("skype_highlighting_settings");
		if (!prefParent) return;
		var frames = document.getElementsByTagName('iframe');
		for (var i = 0; i < frames.length; i++)
		{
			var frame = frames[i];
			//console.log('[pref] frame: '+frame+" "+frame.src);
			if (!frame || (frame.src != "" && frame.src != "about:blank"))
			{
				 continue;
			}
			var doc = frame.contentDocument;
			if (!doc)
			{
				 continue;
			}
			var pref_element = doc.getElementById("skype_highlighting_settings");
			if (pref_element == null)
			{
				pref_element = doc.createElement("span");
				pref_element.setAttribute("id", "skype_highlighting_settings");
				pref_element.setAttribute("display", "none");
				doc.documentElement.appendChild(pref_element);
			}
            pref_element.setAttribute(AutoExtractNumbers, prefParent.getAttribute(AutoExtractNumbers));
            pref_element.setAttribute(hightlightingSwitched, prefParent.getAttribute(hightlightingSwitched));
			//pref_element.setAttribute(NameHighlighterEnabled, prefParent.getAttribute(NameHighlighterEnabled));

			if (doc.head)
			{
			    // load JS scripts with custom objects
				for(var jsIdx = 0, jsLength = set_of_js_files.length; jsIdx < jsLength; ++jsIdx)
				{
					doc.head.appendChild(doc.createElement('script')).src = chrome.extension.getURL(set_of_js_files[jsIdx]);
				}
			}
			else
			{
				console.log("document.head is NULL, " + doc.location);
				continue;
			}

		}
	}
	catch(e)
	{
		console.log(e);
	}

}

//create element for exchangeing highlighting settings between localStorage and SkypePlugin
function createPref(numbers, switched, names) 
{
    if (pref_element != null) return;
    pref_element = document.createElement("span");
    pref_element.setAttribute("id", "skype_highlighting_settings");
    pref_element.setAttribute("display", "none");
    pref_element.setAttribute(AutoExtractNumbers, numbers);
    pref_element.setAttribute(hightlightingSwitched, switched);
    //pref_element.setAttribute(NameHighlighterEnabled, names);
    document.documentElement.appendChild(pref_element);
    pref_element.addEventListener('settingsChanged', function() {sendSetRequest();});  
}

//request highlighting settings from localStorage and init SkypePlugin
function sendGetRequest() 
{
    if (pref_element != null) return;
    chrome.extension.sendRequest({action: "get"}, 
        function(response)
        {
            createPref(response.numbers, response.switched, response.names);
            initPlugin();
        }
    );
}

//send highlighting settings to localStorage
function sendSetRequest() 
{
    try
    {
        if (pref_element == null) return;
        chrome.extension.sendRequest(
        { 
             action : "set",
             numbers: pref_element.getAttribute(AutoExtractNumbers),
             switched: pref_element.getAttribute(hightlightingSwitched),
             names  : '0'//pref_element.getAttribute(NameHighlighterEnabled)
        }, 
        function(response) {});
    }
    catch(e)
    {
        console.log('error: '+e);
    }        
}

function removeHighlighting(parent) 
{ 
try
{
	var children = parent.childNodes; 
	for(var i = 0; i < children.length; i++) 
	{ 
		var child = children[i];
		if (child.className == 'skype_pnh_container' 
			|| child.className == 'skype_name_container')
		{
			parent.removeChild(child);
			continue;
		}
		if (child.className == 'skype_pnh_print_container' )
		{
		        parent.replaceChild(child.firstChild, child);
			continue;
		}
		removeHighlighting(child); 
	}
}
catch(e)
{
	console.log(e);
}
}

function removePluginObjects()
{
try
{
	if (pref_element)
	{
		document.documentElement.removeChild(pref_element);
	}
	if (skype_plugin)
	{
		document.documentElement.removeChild(skype_plugin);
	}
}
catch(e)
{
	console.log(e);
}
}

try
{
    //Creates connection with background page to handle onDisconnect event.
    var port = chrome.extension.connect({name:"skypeport"});

    //Called when extension is turned off or removed.
    port.onDisconnect.addListener( function(msg) 
    { 
        removePluginObjects();
        removeHighlighting(document.body);
    });

    // create document's header if it does not exist (see TBAR-1532)
    var scripts_container = document.head;
    if (!scripts_container)
    {
        if (document.body)
        {
            scripts_container = document.body.parentNode.appendChild(document.createElement('head'));
        }
    }

    if (scripts_container)
    {
        // Load JS scripts with custom objects.
        // We are delaying this for 100ms to avoid problems with some PDF files.
        setTimeout(function()
        {
            for (var i = 0, length = set_of_js_files.length; i < length; i++) {
            scripts_container.appendChild(document.createElement('script')).src = chrome.extension.getURL(set_of_js_files[i]);
        }
        }, 100);
    }
    else
    {
        //console.log("document.head is NULL, " + document.location)
    }

    sendGetRequest();
}
catch(e)
{
    console.log('error: '+e);
}

} // alreadyLoaded


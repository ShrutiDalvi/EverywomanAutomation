/**
 * @file menu_injection_handler.js
 * @brief JS implementation of the menu injection handler.
 */

// Define a namespace for C2C
if (!window.SkypeClick2Call)
{
  window.SkypeClick2Call = {};
}

if (!SkypeClick2Call.MenuInjectionHandler)
{
  SkypeClick2Call.MenuInjectionHandler = {};
}

/**
 * Reference to the Click to Call menu.
 */
SkypeClick2Call.MenuInjectionHandler.menu = document.getElementById(
                                                   "skype_pnh_menu_container");

/**
 * Reference to the Skype actions
 */
SkypeClick2Call.MenuInjectionHandler.SkypeAction =
[
  document.getElementById("skype_pnh_menu_click2call_action"),
  document.getElementById("skype_pnh_menu_click2sms_action"),
  document.getElementById("skype_pnh_menu_add2skype_text")
];

/**
 * Maximum number of iteration allowed to check if mouse is over an element.
 */
SkypeClick2Call.MenuInjectionHandler.MOUSE_OVER_MAX_ITERATION = 10;

/**
 * How long should you mouseover over highlight to make popup appear, millisecs
 */
SkypeClick2Call.MenuInjectionHandler.HOVER_TIMER =  650;

/**
 * How long should mouse be out of highlight to make popup hide, millisecs
 */
SkypeClick2Call.MenuInjectionHandler.MOUSEOUT_TIMER = 500;

/**
 * Variables to manage delayed menu display
 */
SkypeClick2Call.MenuInjectionHandler.menuUpdateTimer = null;
SkypeClick2Call.MenuInjectionHandler.lastTarget = null;

/**
 * Identify IE browser
 */
SkypeClick2Call.MenuInjectionHandler.isIE =
                                     navigator.userAgent.indexOf('MSIE') != -1;

/**
 * Based on the specified event (mouse over), extracts mouse position, and page
 * and element scroll offsets to compute menu coordinates.
 *
 * @param element   the element which triggered the event
 * @param event     the mouse event
 * @return menu coordinates
 */
SkypeClick2Call.MenuInjectionHandler.getMenuCoordinates = function (element,
                                                                         event) {
    // Adjust event according to browser
    event = event || window.event;

    // Menu coordinates
    var coordinates = {};

    // Compute menu position based on the method getBoundingClientRect
    var textElement = SkypeClick2Call.MenuInjectionHandler.getChildElement(
                                       element, "span", "skype_pnh_text_span");
    if (textElement != null && textElement.getBoundingClientRect) {
        var elementRect = textElement.getBoundingClientRect();

        // If 'Free' text span visible use it as X reference, otherwise use number
        // text span. In case hightlighted number spans into two or more lines,
        // always use number text span as reference.
        var freeTextElement = SkypeClick2Call.MenuInjectionHandler.
                  getChildElement(element, "span", "skype_pnh_free_text_span");

        // Use 'Free' text span bounding rect to check if highlight spans into more
        // than one line.
        var freeElementRect = freeTextElement.getBoundingClientRect();


        coordinates.y = elementRect.bottom;
        coordinates.x = SkypeClick2Call.MenuInjectionHandler.isRtl ? elementRect.right : elementRect.left;

        //TBAR-4687 - FREE is now on right
        //          - with FREE on right we should not configure the menu next to the FREE
        //          - this is a placeholder to make menu position configurable
        var alignWithFree = 0;
        if (alignWithFree > 0) {

            if (freeTextElement != null &&
            freeTextElement.offsetWidth > 0 &&
            // Free text is now bold and may get higher value for bottom than phone
            // number
            freeElementRect.bottom >= elementRect.bottom) {
                coordinates.x = SkypeClick2Call.MenuInjectionHandler.isRtl ?
                          freeTextElement.getBoundingClientRect().right :
                          freeTextElement.getBoundingClientRect().left;
            }
        }

        // var logoImageElement = element.getElementsByTagName("img");
        // coordinates.x = logoImageElement[0].getBoundingClientRect().left - 4;
        // get width considering phone number may be wrapped
        coordinates.width = elementRect.right - coordinates.x;
        // get height based on skype_pnh_highlighting_inactive_free or skype_pnh_highlighting_inactive_common
        var pnhElement = SkypeClick2Call.MenuInjectionHandler.
      getChildElement(element, "span", "skype_pnh_highlighting");

        coordinates.height = textElement.offsetHeight;
        if (pnhElement != null && pnhElement.offsetHeight > coordinates.height) {
            coordinates.height = pnhElement.offsetHeight;
        }

        // Adjust the coordinates provided by getBoundingClientRect() considering the element and body borders
        if (SkypeClick2Call.MenuInjectionHandler.isIE) {
            var borderOffset;
            if (element.currentStyle) {
                if (!isNaN(borderOffset = parseInt(element.currentStyle["borderLeftWidth"])))
                    coordinates.x -= borderOffset;
                if (!isNaN(borderOffset = parseInt(element.currentStyle["borderTopWidth"])))
                    coordinates.y -= borderOffset;
            }
            if (document.body.currentStyle) {
                if (!isNaN(borderOffset = parseInt(document.body.currentStyle["borderLeftWidth"])))
                    coordinates.x -= borderOffset;
                if (!isNaN(borderOffset = parseInt(document.body.currentStyle["borderTopWidth"])))
                    coordinates.y -= borderOffset;
            }
        }
    }

    // Compute document offset
    var xScroll = yScroll = 0;
    if (typeof (window.pageYOffset) == 'number' || typeof (window.pageXOffset) == 'number') {
        yScroll = window.pageYOffset;
        xScroll = window.pageXOffset;
    }
    else if (document.documentElement &&
          (typeof (document.documentElement.scrollLeft) == 'number' || typeof (document.documentElement.scrollTop) == 'number')) {
        yScroll = document.documentElement.scrollTop;
        xScroll = document.documentElement.scrollLeft;
    }
    else if (document.body && (document.body.scrollLeft || document.body.scrollTop)) {
        yScroll = document.body.scrollTop;
        xScroll = document.body.scrollLeft;
    }

    coordinates.x += xScroll;
    coordinates.y += yScroll;
    // Adjust gap between number and menu
    coordinates.y += 2;
    coordinates.x += 2;

    // TBAR-3647 + 3328 adjust the coordinates provided by
    // getBoundingClientRect() for bodies with relative and absolute position.
    var bodyPos = SkypeClick2Call.MenuInjectionHandler.getCurrentStyle(
                                                    document.body, "position");
    if (bodyPos == "absolute" || bodyPos == "relative") {
        var box = document.body.getBoundingClientRect();
        coordinates.x -= (box.left + xScroll);
        coordinates.y -= (box.top + yScroll);
    }
    return coordinates;
};

/**
 * Get current style property applied to the given element.
 *
 * @param element      the element
 * @param styleProp    the style property to be retrieved
 * @return the styleProp value
 */
SkypeClick2Call.MenuInjectionHandler.getCurrentStyle = function(element,
                                                                     styleProp)
{
  var propValue;
  if (element.currentStyle)
  {
    // IE
    propValue = element.currentStyle[styleProp];
  }
  else if (window.getComputedStyle)
  {
    // FF and Chrome
    propValue = document.defaultView.getComputedStyle(element,
                                                              null)[styleProp];
  }

  return propValue;
};

/**
 * Get child element based on its tagId and className
 *
 * @param parentElement   the parent element
 * @param childTag     child´s tag id
 * @param childClassName     child´s class name
 * @return the child element
 */
SkypeClick2Call.MenuInjectionHandler.getChildElement = function(parentElement, childTag,  childClassName)
{
  var result = null;
  var spanElements = parentElement.getElementsByTagName(childTag);
  for (var i=0; i<spanElements.length; i++)
  {
    if (spanElements[i].className.indexOf(childClassName) == 0)
    {
      result = spanElements[i];
      break;
    }
  }
  return result;
};

/**
 * Check menu visibility.
 *
 * @return true if menu is visible, false otherwise.
 */
SkypeClick2Call.MenuInjectionHandler.isVisible = function()
{
  return (SkypeClick2Call.MenuInjectionHandler.menu.style.display != 'none');
};

/**
 * Set menu visibility.
 *
 * @param visible     boolean which tells whether menu should be visible or not.
 * @param coordinates coordinates where to place menu
 */
SkypeClick2Call.MenuInjectionHandler.displayMenu = function(visible,
                                                                   coordinates)
{
  // Convert parameter into CSS value and set up menu visibility
  var visibility = visible ? "" : "none";

  if (visible && coordinates)
  {
    SkypeClick2Call.MenuInjectionHandler.menu.style.left =
                                                          coordinates.x + "px";
    SkypeClick2Call.MenuInjectionHandler.menu.style.top = coordinates.y + "px";
  }

  SkypeClick2Call.MenuInjectionHandler.menu.style.display = visibility;
};

SkypeClick2Call.MenuInjectionHandler.switchToFree = function()
{
  SkypeClick2Call.MenuInjectionHandler.menu.className =
                              "skype_pnh_menu_container skype_pnh_free_active";
};

SkypeClick2Call.MenuInjectionHandler.switchToMobile = function()
{
  SkypeClick2Call.MenuInjectionHandler.menu.className =
                            "skype_pnh_menu_container skype_pnh_mobile_active";
};

/**
 * Add the skype action attribute for all actions. Basically the attribute
 * carries the phone number, that is, the actions target.
 *
 * @param skypeProps   the set of Skype properties
 */
SkypeClick2Call.MenuInjectionHandler.addSkypeAction = function(skypeProps)
{
  for (var ii = 0; ii < SkypeClick2Call.MenuInjectionHandler.SkypeAction.length; ii++)
  {
    var action = SkypeClick2Call.MenuInjectionHandler.SkypeAction[ii];
    action.href = '#';
    action.setAttribute('skypeaction', skypeProps.numberToCall);
  }
};

/**
 * Render Click to Call menu components.
 *
 * @param element   the C2C button element
 */
SkypeClick2Call.MenuInjectionHandler.renderMenu = function(element)
{
  // Extract 'skype_menu_props' from the element. The attribute holds a JSON:
  // object with all information required to render menu:
  // - whether it is a mobile;
  // - whether it is a free call.
  var skypeProps = element.getAttribute("skype_menu_props");

  // Prepare actionParms structure
  if (skypeProps)
  {
    // Convert JSON to object
    skypeProps = eval("(" + skypeProps + ")");

    // Add skype action attribute for all actions
    SkypeClick2Call.MenuInjectionHandler.addSkypeAction(skypeProps);

    // Set whether menu is being rendered for RTL languages
    SkypeClick2Call.MenuInjectionHandler.isRtl = skypeProps.isRtl;

    // Inject CSS class according to call or phone type
    SkypeClick2Call.MenuInjectionHandler.menu.className =
                                                    "skype_pnh_menu_container";
    if (skypeProps.isFreecall)
    {
      // Activate 'Free call' version of menu
      SkypeClick2Call.MenuInjectionHandler.switchToFree();
    }
    else if (skypeProps.isMobile)
    {
      // Activate 'Mobile' version of menu
      SkypeClick2Call.MenuInjectionHandler.switchToMobile();
    }
  }

  return (skypeProps) ? true : false;
};

/**
 * Display the Click to Call menu.
 *
 * @param event     the mouse event
 * @param element   the C2C button element
 */
SkypeClick2Call.MenuInjectionHandler.showMenuDelayed = function(element, event)
{
  // Render menu according to the number being hovered
  if (SkypeClick2Call.MenuInjectionHandler.renderMenu(element))
  {
    // Get menu position on the screen
    var position =
       SkypeClick2Call.MenuInjectionHandler.getMenuCoordinates(element, event);

    // Compute document offset
    var yScroll = 0;
    var xScroll = 0;
    if (typeof(window.pageYOffset) == 'number')
    {
      yScroll = window.pageYOffset;
      xScroll = window.pageXOffset;
    }
    else if (document.documentElement && (typeof(document.documentElement.scrollTop) == 'number'))
    {
      yScroll = document.documentElement.scrollTop;
      xScroll = document.documentElement.scrollLeft;
    }
    else if (document.body && (document.body.scrollTop))
    {
      yScroll = document.body.scrollTop;
      xScroll = document.body.scrollLeft;
    }

    var windowHeight = 0;
    if (typeof (window.innerHeight) == 'number') 
    {
      windowHeight = window.innerHeight; //Non-IE
    } 
    else if (document.documentElement && (document.documentElement.clientHeight)) 
    {
      windowHeight = document.documentElement.clientHeight; //IE 6+ in 'standards compliant mode
    } 
    else if (document.body && (document.body.clientHeight))
    {   
      windowHeight = document.body.clientHeight; //IE 4 compatible
    }

    var docWidth = document.documentElement.scrollWidth;

    // Force menu displaying so that we can calculate its width and height.
    // Any UI update will only occur when we exit the current method, so this
    // step is not expected to cause menu flickering.
    SkypeClick2Call.MenuInjectionHandler.displayMenu(true, {'x': 0, 'y': 0});

    var menuHeight = SkypeClick2Call.MenuInjectionHandler.menu.offsetHeight;
    var menuWidth = SkypeClick2Call.MenuInjectionHandler.menu.offsetWidth;

    // We got what we need. Hide menu.
    SkypeClick2Call.MenuInjectionHandler.displayMenu(false);

    // IF menu bottom is under windows bottom border 
    // AND there is enough room available for menu on the top of the number
    // THEN shift menu to the top of the number
    if (position.y + menuHeight >= windowHeight + yScroll)
    {
      if (position.y - position.height - menuHeight >  yScroll)
      {
        position.y -= menuHeight + position.height;

        // Adjust gap between number and menu
        position.y -= 4;
      }
      else
      {
        // TBAR-3283 hide menu if no room available for the menu either below or above the number
        if (document.body.clientHeight  && document.body.clientHeight <= windowHeight)
        {
          return false;
        }
      }
    }

    // Adjustments for when menu is being rendered for RTL languages
    if (SkypeClick2Call.MenuInjectionHandler.isRtl)
    {
      position.x -= menuWidth;
      position.x = (position.x > 0) ? position.x : 0;
    }

    // IF menu is outside windows right border, shift it to the left
    if (position.x + menuWidth >= docWidth)
    {
      position.x -= menuWidth - position.width;
    }

    // Update last target since it was really responsible to show menu
    SkypeClick2Call.MenuInjectionHandler.lastTarget = element;
    SkypeClick2Call.MenuInjectionHandler.displayMenu(true, position);
  }
};

/**
 * Hide the Click to Call menu.
 *
 * @param event   the mouse event
 */
SkypeClick2Call.MenuInjectionHandler.hideMenuDelayed = function(event)
{
  // Reset last target since menu is hidden
  SkypeClick2Call.MenuInjectionHandler.lastTarget = null;

  // Actually hide menu
  SkypeClick2Call.MenuInjectionHandler.displayMenu(false);
};

/**
 * Triggered by number or menu mouseover event, shows the Menu after hover
 * timer.
 *
 * @param elem    the C2C button element
 * @param event   the mouse event
 */
SkypeClick2Call.MenuInjectionHandler.showMenu = function(elem, event)
{
  event = event ? event : window.event;

  if (SkypeClick2Call.MenuInjectionHandler.menuUpdateTimer)
  {
    clearTimeout(SkypeClick2Call.MenuInjectionHandler.menuUpdateTimer);
    SkypeClick2Call.MenuInjectionHandler.menuUpdateTimer = null;
  }

  if ((event.target != SkypeClick2Call.MenuInjectionHandler.menu) &&
      (event.target != SkypeClick2Call.MenuInjectionHandler.lastTarget))
  {
    SkypeClick2Call.MenuInjectionHandler.menuUpdateTimer = setTimeout(
    function(event)
    {
      SkypeClick2Call.MenuInjectionHandler.showMenuDelayed(elem, event);
    }, SkypeClick2Call.MenuInjectionHandler.HOVER_TIMER);
  }
};

/**
 * Triggered by number or menu mouseout event, hides Menu after mouseout timer
 *
 * @param event   the mouse event
 */
SkypeClick2Call.MenuInjectionHandler.hideMenu = function(event)
{
  event = event ? event : window.event;

  if (SkypeClick2Call.MenuInjectionHandler.menuUpdateTimer)
  {
    clearTimeout(SkypeClick2Call.MenuInjectionHandler.menuUpdateTimer);
    SkypeClick2Call.MenuInjectionHandler.menuUpdateTimer = null;
  }

  SkypeClick2Call.MenuInjectionHandler.menuUpdateTimer = setTimeout(
  function()
  {
    SkypeClick2Call.MenuInjectionHandler.hideMenuDelayed(event);
  }, SkypeClick2Call.MenuInjectionHandler.MOUSEOUT_TIMER);
};




import System;
import System.Windows.Forms;
import Fiddler;

// GLOBALIZATION NOTE:
// Be sure to save this file with UTF-8 Encoding if using any non-ASCII characters
// in strings, etc.
//
// JScript Reference
// http://www.fiddler2.com/redir/?id=msdnjsnet
//
// FiddlerScript Reference
// http://www.fiddler2.com/redir/?id=fiddlerscriptcookbook
//
// FiddlerScript Editor:
// http://www.fiddler2.com/redir/?id=fiddlerscripteditor

class Handlers
{
    /* Added for miiiCasa Bar development (start) */
    RulesString("&Enable Host Name Mappings", true)
    RulesStringValue(0, "Joseph Chiang", "02")
    RulesStringValue(1, "Richard Wang", "03")
    RulesStringValue(2, "Hunter Wu", "04")
    RulesStringValue(3, "Vivian Huang", "05")
    RulesStringValue(4, "Kevin Luo", "06")
    RulesStringValue(5, "Caesar Chi", "07")
    RulesStringValue(6, "Mei Lin", "08")
    RulesStringValue(7, "Milo Lo", "09")
    RulesStringValue(8, "Ting Cheng", "10")
    RulesStringValue(9, "Ash Wu", "11")
    RulesStringValue(10, "Kevin Zhuang", "15")
    RulesStringValue(11, "CMS Tools", "13")
    public static var PORT: String = null;

    RulesString("&Inject miiiCasa Bar", true)
    RulesStringValue(0, "Development", "http://a.mimgs.com/index/bar/seed/seed.js")
    RulesStringValue(1, "Other Env", "http://a.mimgs.com/i/toolbar.js")
    public static var INJECTION_PATH: String = null;

    public static RulesOption("Highlight Translation Strings")
    var IS_TRANSLATION: boolean = false;

    public static RulesOption("Show Development Info")
    var IS_DEV_INFO: boolean = false;

    public static RulesOption("JavaScript && CSS Debugging Mode (&&nominify)")
    var IS_NO_MINIFY: boolean = false;

    public static RulesOption("Redirect Router's Traffic to Development PORT")
    var IS_DEV_MODE: boolean = false;

    public static RulesOption("Enable Firebug Lite")
    var IS_INCLUDE_FIREBUG: boolean = false;

    public static RulesOption("Enable YUI Console")
    var IS_INCLUDE_YCONSOLE: boolean = false;

    public static RulesOption("Enable Preview Translation")
    var IS_PREVIEW_TRANSLATION: boolean = false;

    public static RulesOption("Check if <XSS> tag exists")
    var IS_XSS_DETECT: boolean = false;

    public static RulesOption("Enable Y2D Toolbar")
    var IS_INCLUDE_Y2D: boolean = false;

    public static RulesOption("Enable Livereload")
    var IS_LIVERELOAD_MIIICASA: boolean = false;

    /* Added for miiiCasa Bar development (end) */

    // The following snippet demonstrates a custom-bound column for the web sessions list.
    // See http://www.fiddler2.com/fiddler/help/configurecolumns.asp for more info
    //public static BindUIColumn("Method", 60)
    //function FillMethodColumn(oS: Session){
    //  if ((oS.oRequest != null) && (oS.oRequest.headers != null))
    //  return oS.oRequest.headers.HTTPMethod; else return String.Empty;
    //}

    public static RulesOption("Hide 304s")
    var m_Hide304s: boolean = false;

    // Cause Fiddler to override the Accept-Language header with one of the defined values
    public static RulesOption("Request &Japanese Content")
    var m_Japanese: boolean = false;

    // Cause Fiddler to override the User-Agent header with one of the defined values
    RulesString("&User-Agents", true)
    RulesStringValue(0,"Netscape &3", "Mozilla/3.0 (Win95; I)")
    RulesStringValue(1,"KIN2 &IEMobile", "Mozilla/4.0 (compatible; MSIE 6.0; Windows CE; IEMobile 6.12; en-US; KIN.Two 1.0)")
    RulesStringValue(2,"WinMobile7", "Mozilla/4.0 (compatible; MSIE 7.0; Windows Phone OS 7.0; Trident/3.1; IEMobile/7.0) Microsoft;FuturePhone")
    RulesStringValue(3,"&Safari5 (Win7)", "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/533.16 (KHTML, like Gecko) Version/5.0 Safari/533.16")
    RulesStringValue(4,"IPAD", "Mozilla/5.0 (iPad; U; CPU iPhone OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B314 Safari/531.21.10")
    RulesStringValue(5,"IE &6 (XPSP2)", "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)")
    RulesStringValue(6,"IE &7 (Vista)", "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; SLCC1)")
    RulesStringValue(7,"IE 8 (Win2k3 x64)", "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.2; WOW64; Trident/4.0)")
    RulesStringValue(8,"IE &8 (Win7)", "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)")
    RulesStringValue(9,"IE 8 (IE7 CompatMode)", "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Trident/4.0)")
    RulesStringValue(10,"IE 9 (Win7)", "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)")
    RulesStringValue(11,"&Opera", "Opera/9.80 (Windows NT 6.1; U; en) Presto/2.5.28/2.5.23 Version/10.60")
    RulesStringValue(12,"&Firefox 2", "Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.10) Gecko/20071115 Firefox/2.0.0.10")
    RulesStringValue(13,"&Firefox 3.6", "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.2.7) Gecko/20100625 Firefox/3.6.7")
    RulesStringValue(14,"&Firefox (Mac)", "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.1.3) Gecko/20090824 Firefox/3.5.3")
    RulesStringValue(15,"Chrome", "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/533.4 (KHTML, like Gecko) Chrome/5.0.375.99 Safari/533.4")
    RulesStringValue(16,"GoogleBot Crawler", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")
    RulesStringValue(17,"&Custom...", "%CUSTOM%")
    public static var sUA: String = null;

    // Cause Fiddler to delay HTTP traffic to simulate typical 56k modem conditions
    public static RulesOption("Simulate &Modem speeds", "Per&formance")
    var m_SimulateModem: boolean = false;

    // Removes HTTP-caching related headers and specifies "no-cache" on requests and responses
    public static RulesOption("&Disable Caching", "Per&formance")
    var m_DisableCaching: boolean = false;

    // Show the duration between the start of Request.Send and Response.Completed in Milliseconds
    public static RulesOption("&Show Time-to-Last-Byte", "Per&formance")
    var m_ShowTTLB: boolean = false;

    // Show the time of response completion
    public static RulesOption("Show Response &Timestamp", "Per&formance")
    var m_ShowTimestamp: boolean = false;

    // Force a manual reload of the script file.  Resets all
    // RulesOption variables to their defaults.
    public static ToolsAction("Reset Script")
    function DoManualReload(){
        FiddlerObject.ReloadScript();
    }

    public static ContextAction("Decode Selected Sessions")
    function DoRemoveEncoding(oSessions: Session[]){
        for (var x = 0; x < oSessions.Length; x++){
            oSessions[x].utilDecodeRequest();
            oSessions[x].utilDecodeResponse();
        }
    }

    static function OnBoot(){
        //      MessageBox.Show("Fiddler has finished booting");
        //      System.Diagnostics.Process.Start("iexplore.exe");

        //      FiddlerObject.UI.ActivateRequestInspector("HEADERS");
        //      FiddlerObject.UI.ActivateResponseInspector("HEADERS");
    }

    static function OnShutdown(){
        //      MessageBox.Show("Fiddler has shutdown");
    }

    static function OnAttach(){
        //      MessageBox.Show("Fiddler is now the system proxy");
        //      System.Diagnostics.Process.Start("proxycfg.exe", "-u"); // Notify WinHTTP of proxy change
    }

    static function OnDetach(){
        //      MessageBox.Show("Fiddler is no longer the system proxy");
        //      System.Diagnostics.Process.Start("proxycfg.exe", "-u"); // Notify WinHTTP of proxy change
    }

    static function OnBeforeRequest(oSession: Session)
    {
        // Sample Rule: Color ASPX requests in RED
        //      if (oSession.uriContains(".aspx")) {    oSession["ui-color"] = "red";   }

        // Sample Rule: Flag POSTs to fiddler2.com in italics
        //      if (oSession.HostnameIs("www.fiddler2.com") && oSession.HTTPMethodIs("POST")) { oSession["ui-italic"] = "yup";  }

        // Sample Rule: Break requests for URLs containing "/sandbox/"
        //      if (oSession.uriContains("/sandbox/")){
        //          oSession.oFlags["x-breakrequest"] = "yup";  // Existence of the x-breakrequest flag creates a breakpoint; the "yup" value is unimportant.
        //      }

        if ((null != gs_ReplaceToken) && (oSession.url.indexOf(gs_ReplaceToken)>-1)){   // Case sensitive
            oSession.url = oSession.url.Replace(gs_ReplaceToken, gs_ReplaceTokenWith);
        }

        if ((null != gs_OverridenHost) && (oSession.host.toLowerCase() == gs_OverridenHost)){
            oSession["x-overridehost"] = gs_OverrideHostWith;
        }

        if ((null!=bpRequestURI) && oSession.uriContains(bpRequestURI)){
            oSession["x-breakrequest"]="uri";
        }

        if (IS_PREVIEW_TRANSLATION) {
            if (oSession.oRequest["Cookie"]) {
                oSession.oRequest["Cookie"] += ";preview_translation=1";
            }
        }

        if ((null!=bpMethod) && (oSession.HTTPMethodIs(bpMethod))){
            oSession["x-breakrequest"]="method";
        }

        if ((null!=uiBoldURI) && oSession.uriContains(uiBoldURI)){
            oSession["ui-bold"]="QuickExec";
        }

        if (m_SimulateModem){
            // Delay sends by 300ms per KB uploaded.
            oSession["request-trickle-delay"] = "300";
            // Delay receives by 150ms per KB downloaded.
            oSession["response-trickle-delay"] = "150";
        }

        if (m_DisableCaching){
            oSession.oRequest.headers.Remove("If-None-Match");
            oSession.oRequest.headers.Remove("If-Modified-Since");
            oSession.oRequest["Pragma"] = "no-cache";
        }

        // User-Agent Overrides
        if (null != sUA){
            oSession.oRequest["User-Agent"] = sUA;
        }

        if (m_Japanese){
            oSession.oRequest["Accept-Language"] = "ja";
        }

        var mappings = null;
        /* Added for miiiCasa Bar Development (start) */
        if (null != PORT) {

            mappings = {
                "www.miiicasa.com"             : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "apps.miiicasa.com"            : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "api.miiicasa.com"             : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "developer.miiicasa.com"       : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "f.mimgs.com"                  : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "comet.miiicasa.com"           : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "cms.corp.miiicasa.com"        : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "a.mimgs.com"                  : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "developer.apps.miiicasa.com"  : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "reporting.miiicasa.com"       : "devm1.corp.miiicasa.com:50" + PORT + "0",
                "caja.miiicasa.com"            : "devm1.corp.miiicasa.com:80",
                "dashboard.miiicasa.com"       : "devm1.corp.miiicasa.com:50" + PORT + "0"
                };

            /* CMS Developer Environment */
            if (13 == PORT) {
                mappings = {
                    "www.miiicasa.com"             : "doc1.corp.miiicasa.com:50" + PORT + "0",
                    "apps.miiicasa.com"            : "doc1.corp.miiicasa.com:50" + PORT + "1",
                    "api.miiicasa.com"             : "doc1.corp.miiicasa.com:50" + PORT + "3",
                    "developer.miiicasa.com"       : "doc1.corp.miiicasa.com:50" + PORT + "4",
                    "cms.corp.miiicasa.com"        : "doc1.corp.miiicasa.com:50" + PORT + "5",
                    "f.mimgs.com"                  : "doc1.corp.miiicasa.com:50" + PORT + "6",
                    "comet.miiicasa.com"           : "doc1.corp.miiicasa.com:50" + PORT + "7",
                    "c.mimgs.com"                  : "doc1.corp.miiicasa.com:50" + PORT + "8",
                    "a.mimgs.com"                  : "doc1.corp.miiicasa.com:50" + PORT + "9"
                    };
            }

            if (mappings.hasOwnProperty(oSession.host)) {
                if (
                    oSession.PathAndQuery !== "/miiicasa_bar_api/proxy.html" &&
                    oSession.PathAndQuery !== "/miiicasa_bar_api/status.html"
                ) {
                    // Prevent this request from going through an upstream proxy
                    oSession.bypassGateway = true;
                    // DNS name or IP address of target server
                    oSession["x-overrideHost"] = mappings[oSession.host];
                }
            }
        }

        if (INJECTION_PATH) {
            var hostname = "a.mimgs.com";
            switch (oSession.PathAndQuery) {
                case "/miiicasa_bar_api/proxy.html":
                    oSession.url = hostname + "/index/bar/api/proxy.html";
                    break;
                case "/miiicasa_bar_api/status.html":
                    oSession.url = hostname + "/index/bar/api/status.html";
                    break;
            }
        }

        if (IS_DEV_MODE) {
            if (!PORT) {
                return;
            }
            if (oSession.host == "w1.alpha.corp.miiicasa.com") {
                oSession.host = mappings["api.miiicasa.com"];
            }
        }

        if (IS_NO_MINIFY) {
            if (oSession.PathAndQuery.indexOf("fuse") !== -1 && oSession.PathAndQuery.indexOf("&nominify") === -1) {
                oSession.PathAndQuery += "&nominify";
            }
        }
        /* Added for miiiCasa Bar Development (end) */
    }

    //
    // If a given session has response streaming enabled, then the OnBeforeResponse function
    // is actually called AFTER the response was returned to the client.
    //
    // In contrast, this OnPeekAtResponseHeaders method is called before the response headers are
    // sent to the client (and before the body is read from the server).  Hence this is an opportune time
    // to disable streaming (oSession.bBufferResponse = true) if there is something in the response headers
    // which suggests that tampering with the response body is necessary.
    //
    // Note: oSession.responseBodyBytes is not available within this function!
    //
    static function OnPeekAtResponseHeaders(oSession: Session) {
        //FiddlerApplication.Log.LogFormat("Session {0}: Response header peek shows status is {1}", oSession.id, oSession.responseCode);
        if (m_DisableCaching) {
            oSession.oResponse.headers.Remove("Expires");
            oSession.oResponse["Cache-Control"] = "no-cache";
        }
    }

    static function OnBeforeResponse(oSession: Session)
    {

        if (m_ShowTimestamp){
            oSession["ui-customcolumn"] = DateTime.Now.ToString("H:mm:ss.ffff") + " " + oSession["ui-customcolumn"];
        }

        if (m_ShowTTLB){
            oSession["ui-customcolumn"] = oSession.oResponse.iTTLB + "ms " + oSession["ui-customcolumn"];
        }

        if (m_Hide304s && oSession.responseCode == 304){
            oSession["ui-hide"] = "true";
        }

        if ((bpStatus>0) && (oSession.responseCode == bpStatus)){
            oSession["x-breakresponse"]="status";
        }

        if ((null!=bpResponseURI) && oSession.uriContains(bpResponseURI)){
            oSession["x-breakresponse"]="uri";
        }


        /* Added for miiiCasa Bar Development (start) */
        var aHtml = [];
        //aHtml.push('<script src="http://josephj.com/lab/2011/fix-flash/fix-flash.js"></script>');
        if (IS_INCLUDE_Y2D) {
            aHtml.push([
                '<script src="http://josephj.com/lab/2011/y2d/toolbar_hackday.js"></script>'
                ].join("\n"));
        }
        if (IS_INCLUDE_YCONSOLE) {
            aHtml.push([
                '<script src="http://yui.yahooapis.com/3.3.0/build/yui/yui-min.js"></script>',
                '<script>',
                'YUI().use("console-filters", function (Y) {',
                '    if (this !== top) {',
                '        return;',
                '    }',
                '    Y.one(document.body).addClass("yui3-skin-sam");',
                '    var console = new Y.Console({',
                '        "logSource": Y.Global,',
                '        "height": "400px",',
                '        "width": "450px",',
                '        "plugins": [Y.Plugin.ConsoleFilters]',
                '    });',
                '    console.render();',
                '});',
                '</script>'
                ].join("\n"));
        }
        if (IS_LIVERELOAD_MIIICASA) {
            if (PORT) {
                if (
                    oSession.host.match("www.miiicasa.com") ||
                    oSession.host.match("devm1.corp.miiicasa.com") ||
                    oSession.host.match("w1.alpha.corp.miiicasa.com")
                ) {
                    aHtml.push([
                        '<script src="http://code.jquery.com/jquery-1.4.3.min.js"></script>',
                        '<script src="http://a.mimgs.com/lib/livereload/background.js"></script>',
                        '<script src="http://a.mimgs.com/lib/livereload/content.js"></script>',
                        '<script src="http://a.mimgs.com/lib/livereload/livereload.js"></script>',
                        '<script>',
                        '$(document).ready( function () {',
                        '   livereload.background.port = 50' + PORT + '2;',
                        '   livereload.run();',
                        '});',
                        '</script>',
                        ].join("\n"));
                }
            }
        }
        if (INJECTION_PATH) {
            // TODO - Load white list instead of explicitly listing.
            if (
                oSession.host !== "apps.miiicasa.com" &&
                oSession.host !== "caja.miiicasa.com"  &&
                oSession.PathAndQuery.indexOf("gadget") === -1
            ) {
                aHtml.push([
                    '<div id="miii-root"></div>',
                    '<script>',
                    '(function () {',
                    '    if (typeof window.miii_url !== "undefined") {',
                    '        return;',
                    '    }',
                    // TODO - Allow user to choose MAC address from menu.
                    //IHtMvUgMJFX8besumM6lNv64CUngzXMi8WEMO%2FRGFHHT9HBNyrgK9a3CqqtyOaU6
                    //Jn4%2F7lC8XeErB56CaFCb78phc9QhdtNnvNC2xnxekIbMi5dB1DFV%2BTAq%2BZpvn7u9
                    //YV8pDCKoWh3uQfntIlkLbkkCbpz53wXjfyhF8qJiFVDDgms1RzrWEUwg5iGln7U6
                    '    window.miii_url = "'+ INJECTION_PATH + '?frameset=0&m=YV8pDCKoWh3uQfntIlkLbkkCbpz53wXjfyhF8qJiFVDDgms1RzrWEUwg5iGln7U6&did=7ad81302ae297cdc457520a2997b8fa4";',
                    '    if (self !== top) {',
                    '        return;',
                    '    }',
                    '    var e, APP_URL, APP_MODE, counter, win;',
                    '    e       = document.createElement("script");',
                    '    e.id    = "miii-seed";',
                    '    e.src   = miii_url;',
                    '    e.async = true;',
                    '    document.getElementById("miii-root").appendChild(e)',
                    '})();',
                    '</script>'
                    ].join("\n"));
            }
        }
        if (IS_INCLUDE_FIREBUG) {
            aHtml.push('<script src="https://getfirebug.com/firebug-lite.js"></script>');
        }
        if (IS_TRANSLATION) {
            aHtml.push([
                '<script src="http://code.jquery.com/jquery-1.4.3.min.js"></script>',
                '<script>',
                '$(document).ready( function () {',
                '    $(".intl-translatable").css({"border-bottom": "solid 3px #f00", "opacity": "0.6", "-moz-border-radius": "1px"});',
                '    $(".intl-translated").css({"border-bottom": "solid 3px #0c0", "opacity": "0.6", "-moz-border-radius": "1px"});',
                '    $(".intl-translated, .intl-translatable").attr("title", "Double click to modify translation.");',
                '    $(".intl-translated, .intl-translatable").dblclick(function(e) {e.preventDefault();window.open("http://cms.corp.miiicasa.com/l10n/lang/q/" + this.id.split(":")[1]);});',
                '});'
                ].join("\n"));
            aHtml.push("</script>");
        }
        if (IS_DEV_INFO) {
            aHtml.push([
                '<style>.miiicasa-dev-info {position:absolute;top:0;left:0;font-weight:bold;font-size:11px;display:inline-block;display:-moz-inline-box;padding:2px 4px;color:yellow;background:#000;opacity:1;border-radius:3px;-moz-border-radius:3px;-webkit-border-radius:3px;behavior:url(/static/css3-pie/pie.htc);}</style>',
                '<script src="http://code.jquery.com/jquery-1.4.3.min.js"></script>',
                '<script>',
                '$(document).ready( function () {',
                '    if (location.host.indexOf("miiicasa.com") === -1) return;',
                '    $("div[id]").each(function(index, el){',
                '        if (this.id === "hd" || this.id === "bd" || this.id === "ft" || this.id === "miii-root" || this.id === "doc") {',
                '            return;',
                '        }',
                '        $(this).append("<span class=miiicasa-dev-info>#" + this.id + "</span>");',
                '        $(this).parent().css("position", "relative");',
                '        $(this).dblclick(function(){',
                '            var tag = $(this).find("span[id^=trans]");',
                '            tag = tag[0].id.split(":")[1];',
                '                    alert("codeigniter o " + tag.split("-")[0] + "/_" + this.id.replace(/-/g, "_"));',
                '        });',
                '        $(this).hover(',
                '            function(e){$(this).parent().css("border", "solid 1px blue");},',
                '            function(e){$(this).parent().css("border", "none");}',
                '        );',
                '    });',
                '});'
                ].join("\n"));
            aHtml.push("</script>");
        }
        if (aHtml.length) {
            oSession.utilDecodeResponse();
            if (
                oSession.responseCode == 200 &&
                oSession.oResponse.headers.ExistsAndContains("Content-Type", "html") &&
                oSession.utilFindInResponse("<body", false) > -1
            ) {
                var enc = Utilities.getResponseBodyEncoding(oSession);
                var oBody = enc.GetString(oSession.responseBodyBytes);
                var oRegEx = /<(body[^>]*)>/;

                oBody = oBody.replace(oRegEx, '<$1>\n' + aHtml.join("\n"));
                oSession.responseBodyBytes = enc.GetBytes(oBody);
                oSession.utilSetResponseBody(oBody);
            }
        }
        if (IS_XSS_DETECT) {
            oSession.utilDecodeResponse();
            if (
                oSession.oResponse.headers.ExistsAndContains("Content-Type", "text/html") &&
                oSession.utilFindInResponse("<xs>", false) > -1
            ) {
                var enc = Utilities.getResponseBodyEncoding(oSession),
                    oBody = enc.GetString(oSession.responseBodyBytes),
                    oRegEx = /(<xs>)/ig;

                oBody = oBody.replace(oRegEx, '<blink style="background:red">FIX XSS PLEASE!</blink>');
                oSession.responseBodyBytes = enc.GetBytes(oBody);
                oSession.utilSetResponseBody(oBody);
                oSession["ui-color"] = "red";
                oSession["ui-bold"] = "true";
            }
        }
        /* Added for miiiCasa Bar Development (end) */
    }

    static function Main()
    {
        var today: Date = new Date();
        FiddlerObject.StatusText = " CustomRules.js was loaded at: " + today;
        // Uncomment to add a "Server" column containing the response "Server" header, if present
        // FiddlerObject.UI.lvSessions.AddBoundColumn("Server", 50, "@response.server");
    }

    // These static variables are used for simple breakpointing & other QuickExec rules
    static var bpRequestURI:String = null;
    static var bpResponseURI:String = null;
    static var bpStatus:int = -1;
    static var bpMethod: String = null;
    static var uiBoldURI: String = null;
    static var gs_ReplaceToken: String = null;
    static var gs_ReplaceTokenWith: String = null;
    static var gs_OverridenHost: String = null;
    static var gs_OverrideHostWith: String = null;

    // The OnExecAction function is called by either the QuickExec box in the Fiddler window,
    // or by the ExecAction.exe command line utility.
    static function OnExecAction(sParams: String[]){
        FiddlerObject.StatusText = "ExecAction: " + sParams[0];

        var sAction = sParams[0].toLowerCase();
        switch (sAction){
            case "bold":
                if (sParams.Length<2) {uiBoldURI=null; FiddlerObject.StatusText="Bolding cleared"; return;}
                uiBoldURI = sParams[1]; FiddlerObject.StatusText="Bolding requests for " + uiBoldURI;
                break;
            case "bp":
                FiddlerObject.alert("bpu = breakpoint request for uri\nbpm = breakpoint request method\nbps=breakpoint response status\nbpafter = breakpoint response for URI");
                break;
            case "bps":
                if (sParams.Length<2) {bpStatus=-1; FiddlerObject.StatusText="Response Status breakpoint cleared"; return;}
                bpStatus = parseInt(sParams[1]); FiddlerObject.StatusText="Response status breakpoint for " + sParams[1];
                break;
            case "bpv":
            case "bpm":
                if (sParams.Length<2) {bpMethod=null; FiddlerObject.StatusText="Request Method breakpoint cleared"; return;}
                bpMethod = sParams[1].toUpperCase(); FiddlerObject.StatusText="Request Method breakpoint for " + bpMethod;
                break;
            case "bpu":
                if (sParams.Length<2) {bpRequestURI=null; FiddlerObject.StatusText="RequestURI breakpoint cleared"; return;}
                if (sParams[1].toLowerCase().StartsWith("http://")){sParams[1] = sParams[1].Substring(7);}
                bpRequestURI = sParams[1];
                FiddlerObject.StatusText="RequestURI breakpoint for "+sParams[1];
                break;
            case "bpafter":
                if (sParams.Length<2) {bpResponseURI=null; FiddlerObject.StatusText="ResponseURI breakpoint cleared"; return;}
                if (sParams[1].toLowerCase().StartsWith("http://")){sParams[1] = sParams[1].Substring(7);}
                bpResponseURI = sParams[1];
                FiddlerObject.StatusText="ResponseURI breakpoint for "+sParams[1];
                break;
            case "overridehost":
                if (sParams.Length<3) {gs_OverridenHost=null; FiddlerObject.StatusText="Host Override cleared"; return;}
                gs_OverridenHost = sParams[1].toLowerCase();
                gs_OverrideHostWith = sParams[2];
                FiddlerObject.StatusText="Connecting to [" + gs_OverrideHostWith + "] for requests to [" + gs_OverridenHost + "]";
                break;
            case "urlreplace":
                if (sParams.Length<3) {gs_ReplaceToken=null; FiddlerObject.StatusText="URL Replacement cleared"; return;}
                gs_ReplaceToken = sParams[1];
                gs_ReplaceTokenWith = sParams[2].Replace(" ", "%20");  // Simple helper
                FiddlerObject.StatusText="Replacing [" + gs_ReplaceToken + "] in URIs with [" + gs_ReplaceTokenWith + "]";
                break;
            case "select":
                if (sParams.Length<2) { FiddlerObject.StatusText="Please specify Content-Type to select."; return;}
                FiddlerObject.UI.actSelectSessionsWithResponseHeaderValue("Content-Type", sParams[1]);
                FiddlerObject.StatusText="Selected sessions returning Content-Type: " + sParams[1] + ".";
                if (FiddlerObject.UI.lvSessions.SelectedItems.Count > 0){
                    FiddlerObject.UI.lvSessions.Focus();
                }
                break;
            case "allbut":
            case "keeponly":
                if (sParams.Length<2) { FiddlerObject.StatusText="Please specify Content-Type to retain during wipe."; return;}
                FiddlerObject.UI.actSelectSessionsWithResponseHeaderValue("Content-Type", sParams[1]);
                FiddlerObject.UI.actRemoveUnselectedSessions();
                FiddlerObject.UI.lvSessions.SelectedItems.Clear();
                FiddlerObject.StatusText="Removed all but Content-Type: " + sParams[1];
                break;
            case "stop":
                FiddlerObject.UI.actDetachProxy();
                break;
            case "start":
                FiddlerObject.UI.actAttachProxy();
                break;
            case "cls":
            case "clear":
                FiddlerObject.UI.actRemoveAllSessions();
                break;
            case "g":
            case "go":
                FiddlerObject.UI.actResumeAllSessions();
                break;
            case "help":
                Utilities.LaunchHyperlink("http://www.fiddler2.com/redir/?id=quickexec");
                break;
            case "hide":
                FiddlerObject.UI.actMinimizeToTray();
                break;
            case "log":
                FiddlerApplication.Log.LogString((sParams.Length<2) ? FiddlerApplication.Log.LogString("User couldn't think of anything to say...") : sParams[1]);
                break;
            case "nuke":
                FiddlerObject.UI.actClearWinINETCache();
                FiddlerObject.UI.actClearWinINETCookies();
                break;
            case "show":
                FiddlerObject.UI.actRestoreWindow();
                break;
            case "tail":
                if (sParams.Length<2) { FiddlerObject.StatusText="Please specify # of sessions to trim the session list to."; return;}
                FiddlerObject.UI.TrimSessionList(int.Parse(sParams[1]));
                break;
            case "quit":
                FiddlerObject.UI.actExit();
                break;
            case "dump":
                FiddlerObject.UI.actSelectAll();
                FiddlerObject.UI.actSaveSessionsToZip(CONFIG.GetPath("Captures") + "dump.saz");
                FiddlerObject.UI.actRemoveAllSessions();
                FiddlerObject.StatusText = "Dumped all sessions to " + CONFIG.GetPath("Captures") + "dump.saz";
                break;

            default:
                if (sAction.StartsWith("http") || sAction.StartsWith("www")){
                    System.Diagnostics.Process.Start(sAction);
                }
                else
                    FiddlerObject.StatusText = "Requested ExecAction: " + sAction + " not found. Type HELP to learn more.";
        }
    }
}

/*global Y, YUI, window*/
YUI().use("node-style",  function (Y) {
    Y.log(">>>>>> debugger-running");
    var showMessage,
        debuggerNode;

    debuggerNode = Y.Node.create('<div class="debugger-info">aaaa</div>');

    debuggerNode.setStyles({
        "position"         : "absolute",
        "top"              : "10px",
        "left"             : "10px",
        "z-index"          : "999",
        "width"            : "200px",
        "height"           : "110px",
        "background-color" : "#eee"
    });
    Y.one("body").append(debuggerNode);
});

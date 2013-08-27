(function ($) {
    var editor = $('#editor'),
        container = $('.container'),
        selectedRange,

        getCurrentRange = function () {
            var sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                return sel.getRangeAt(0);
            }
        },

        saveSelection = function () {
            selectedRange = getCurrentRange();
        },

        restoreSelection = function () {
            var selection = window.getSelection();
            if (selectedRange) {
                try {
                    selection.removeAllRanges();
                } catch (ex) {
                    document.body.createTextRange().select();
                    document.selection.empty();
                }

                selection.addRange(selectedRange);
            }
        },

        exec = function (command, value) {

        };

    editor.on('mouseup keyup mouseout', function () {
        saveSelection();
    });



}(window.jQuery));

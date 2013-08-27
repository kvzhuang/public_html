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
        restoreSelection();
        document.execCommand(command, false, value);
    };

    editor.on('mouseup keyup mouseout', function () {
        saveSelection();
    });

    container.find('a[data-command]').click(function () {
        var command = $(this).data('command'),
        value = $(this).data('value');
        exec(command, value);
    });


}(window.jQuery));

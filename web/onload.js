var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

/*jshint node:false, jquery:true, strict:false */
$(function() {

  read_settings_from_cookie();

  $.getJSON("./package.json", function(data) {
    $('#version-number').text('(v' + data.version + ')');
  });

  var default_text =
    "// This is just a sample script. Paste your real code (javascript or HTML) here.\n\nif ('this_is'==/an_example/){of_beautifier();}else{var a=b?(c%d):e[f];}";
  var textArea = $('#source')[0];
  $('#source').val(default_text);

  if (the.use_codemirror && typeof CodeMirror !== 'undefined') {

    the.editor = CodeMirror.fromTextArea(textArea, {
      lineNumbers: true
    });
    set_editor_mode();
    the.editor.focus();

    $('.CodeMirror').click(function() {
      if (the.editor.getValue() === default_text) {
        the.editor.setValue('');
      }
    });
  } else {
    $('#source').bind('click focus', function() {
      if ($(this).val() === default_text) {
        $(this).val('');
      }
    }).bind('blur', function() {
      if (!$(this).val()) {
        $(this).val(default_text);
      }
    });
  }


  $(window).bind('keydown', function(e) {
    if (e.ctrlKey && e.keyCode === 13) {
      beautify();
    }
  });

  $('.submit').click(beautify);
  $('select').change(beautify);
  $(':checkbox').change(beautify);
  $('#additional-options').change(beautify);


});


}
/*
     FILE ARCHIVED ON 06:21:15 Sep 08, 2021 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 03:54:33 Sep 09, 2021.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 116.33
  exclusion.robots: 0.098
  exclusion.robots.policy: 0.09
  RedisCDXSource: 0.889
  esindex: 0.01
  LoadShardBlock: 88.496 (3)
  PetaboxLoader3.datanode: 99.187 (4)
  CDXLines.iter: 22.412 (3)
  load_resource: 64.981
  PetaboxLoader3.resolve: 33.038
*/

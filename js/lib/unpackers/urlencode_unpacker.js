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

/*global unescape */
/*jshint curly: false, scripturl: true */

/*

  The MIT License (MIT)

  Copyright (c) 2007-2018 Einar Lielmanis, Liam Newman, and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

//
// trivial bookmarklet/escaped script detector for the javascript beautifier
// written by Einar Lielmanis <einar@beautifier.io>
//
// usage:
//
// if (Urlencoded.detect(some_string)) {
//     var unpacked = Urlencoded.unpack(some_string);
// }
//
//

/*jshint strict:false */


var isNode = (typeof module !== 'undefined' && module.exports);
if (isNode) {
  var SanityTest = require(__dirname + '/../../test/sanitytest');
}

var Urlencoded = {
  detect: function(str) {
    // the fact that script doesn't contain any space, but has %20 instead
    // should be sufficient check for now.
    if (str.indexOf(' ') === -1) {
      if (str.indexOf('%2') !== -1) return true;
      if (str.replace(/[^%]+/g, '').length > 3) return true;
    }
    return false;
  },

  unpack: function(str) {
    if (Urlencoded.detect(str)) {
      if (str.indexOf('%2B') !== -1 || str.indexOf('%2b') !== -1) {
        // "+" escaped as "%2B"
        return unescape(str.replace(/\+/g, '%20'));
      } else {
        return unescape(str);
      }
    }
    return str;
  },



  run_tests: function(sanity_test) {
    var t = sanity_test || new SanityTest();
    t.test_function(Urlencoded.detect, "Urlencoded.detect");
    t.expect('', false);
    t.expect('var a = b', false);
    t.expect('var%20a+=+b', true);
    t.expect('var%20a=b', true);
    t.expect('var%20%21%22', true);
    t.expect('javascript:(function(){var%20whatever={init:function(){alert(%22a%22+%22b%22)}};whatever.init()})();', true);
    t.test_function(Urlencoded.unpack, 'Urlencoded.unpack');

    t.expect('javascript:(function(){var%20whatever={init:function(){alert(%22a%22+%22b%22)}};whatever.init()})();',
      'javascript:(function(){var whatever={init:function(){alert("a"+"b")}};whatever.init()})();'
    );
    t.expect('', '');
    t.expect('abcd', 'abcd');
    t.expect('var a = b', 'var a = b');
    t.expect('var%20a=b', 'var a=b');
    t.expect('var%20a=b+1', 'var a=b+1');
    t.expect('var%20a=b%2b1', 'var a=b+1');
    return t;
  }


};

if (isNode) {
  module.exports = Urlencoded;
}


}
/*
     FILE ARCHIVED ON 06:21:14 Sep 08, 2021 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 04:15:10 Sep 09, 2021.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 172.216
  exclusion.robots: 0.168
  exclusion.robots.policy: 0.156
  RedisCDXSource: 8.534
  esindex: 0.014
  LoadShardBlock: 131.372 (3)
  PetaboxLoader3.datanode: 93.988 (4)
  CDXLines.iter: 22.757 (3)
  load_resource: 86.162
  PetaboxLoader3.resolve: 71.009
*/

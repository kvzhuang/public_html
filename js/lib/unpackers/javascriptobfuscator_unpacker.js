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
// simple unpacker/deobfuscator for scripts messed up with javascriptobfuscator.com
// written by Einar Lielmanis <einar@beautifier.io>
//
// usage:
//
// if (JavascriptObfuscator.detect(some_string)) {
//     var unpacked = JavascriptObfuscator.unpack(some_string);
// }
//
//

/*jshint strict:false */

var JavascriptObfuscator = {
  detect: function(str) {
    return /^var _0x[a-f0-9]+ ?\= ?\[/.test(str);
  },

  unpack: function(str) {
    if (JavascriptObfuscator.detect(str)) {
      var matches = /var (_0x[a-f\d]+) ?\= ?\[(.*?)\];/.exec(str);
      if (matches) {
        var var_name = matches[1];
        var strings = JavascriptObfuscator._smart_split(matches[2]);
        str = str.substring(matches[0].length);
        for (var k in strings) {
          str = str.replace(new RegExp(var_name + '\\[' + k + '\\]', 'g'),
            JavascriptObfuscator._fix_quotes(JavascriptObfuscator._unescape(strings[k])));
        }
      }
    }
    return str;
  },

  _fix_quotes: function(str) {
    var matches = /^"(.*)"$/.exec(str);
    if (matches) {
      str = matches[1];
      str = "'" + str.replace(/'/g, "\\'") + "'";
    }
    return str;
  },

  _smart_split: function(str) {
    var strings = [];
    var pos = 0;
    while (pos < str.length) {
      if (str.charAt(pos) === '"') {
        // new word
        var word = '';
        pos += 1;
        while (pos < str.length) {
          if (str.charAt(pos) === '"') {
            break;
          }
          if (str.charAt(pos) === '\\') {
            word += '\\';
            pos++;
          }
          word += str.charAt(pos);
          pos++;
        }
        strings.push('"' + word + '"');
      }
      pos += 1;
    }
    return strings;
  },


  _unescape: function(str) {
    // inefficient if used repeatedly or on small strings, but wonderful on single large chunk of text
    for (var i = 32; i < 128; i++) {
      str = str.replace(new RegExp('\\\\x' + i.toString(16), 'ig'), String.fromCharCode(i));
    }
    str = str.replace(/\\x09/g, "\t");
    return str;
  },

  run_tests: function(sanity_test) {
    var t = sanity_test || new SanityTest();

    t.test_function(JavascriptObfuscator._smart_split, "JavascriptObfuscator._smart_split");
    t.expect('', []);
    t.expect('"a", "b"', ['"a"', '"b"']);
    t.expect('"aaa","bbbb"', ['"aaa"', '"bbbb"']);
    t.expect('"a", "b\\\""', ['"a"', '"b\\\""']);
    t.test_function(JavascriptObfuscator._unescape, 'JavascriptObfuscator._unescape');
    t.expect('\\x40', '@');
    t.expect('\\x10', '\\x10');
    t.expect('\\x1', '\\x1');
    t.expect("\\x61\\x62\\x22\\x63\\x64", 'ab"cd');
    t.test_function(JavascriptObfuscator.detect, 'JavascriptObfuscator.detect');
    t.expect('', false);
    t.expect('abcd', false);
    t.expect('var _0xaaaa', false);
    t.expect('var _0xaaaa = ["a", "b"]', true);
    t.expect('var _0xaaaa=["a", "b"]', true);
    t.expect('var _0x1234=["a","b"]', true);
    return t;
  }


};


}
/*
     FILE ARCHIVED ON 06:21:14 Sep 08, 2021 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 03:59:04 Sep 09, 2021.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 344.819
  exclusion.robots: 0.1
  exclusion.robots.policy: 0.092
  RedisCDXSource: 5.263
  esindex: 0.009
  LoadShardBlock: 307.945 (3)
  PetaboxLoader3.datanode: 353.011 (4)
  CDXLines.iter: 26.861 (3)
  load_resource: 110.146
  PetaboxLoader3.resolve: 45.693
*/

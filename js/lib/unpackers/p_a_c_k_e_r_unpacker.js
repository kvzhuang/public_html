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
// Unpacker for Dean Edward's p.a.c.k.e.r, a part of javascript beautifier
//
// Coincidentally, it can defeat a couple of other eval-based compressors.
//
// usage:
//
// if (P_A_C_K_E_R.detect(some_string)) {
//     var unpacked = P_A_C_K_E_R.unpack(some_string);
// }
//
//

/*jshint strict:false */

var P_A_C_K_E_R = {
  detect: function(str) {
    return (P_A_C_K_E_R.get_chunks(str).length > 0);
  },

  get_chunks: function(str) {
    var chunks = str.match(/eval\(\(?function\(.*?(,0,\{\}\)\)|split\('\|'\)\)\))($|\n)/g);
    return chunks ? chunks : [];
  },

  unpack: function(str) {
    var chunks = P_A_C_K_E_R.get_chunks(str),
      chunk;
    for (var i = 0; i < chunks.length; i++) {
      chunk = chunks[i].replace(/\n$/, '');
      str = str.split(chunk).join(P_A_C_K_E_R.unpack_chunk(chunk));
    }
    return str;
  },

  unpack_chunk: function(str) {
    var unpacked_source = '';
    var __eval = eval;
    if (P_A_C_K_E_R.detect(str)) {
      try {
        eval = function(s) { // jshint ignore:line
          unpacked_source += s;
          return unpacked_source;
        }; // jshint ignore:line
        __eval(str);
        if (typeof unpacked_source === 'string' && unpacked_source) {
          str = unpacked_source;
        }
      } catch (e) {
        // well, it failed. we'll just return the original, instead of crashing on user.
      }
    }
    eval = __eval; // jshint ignore:line
    return str;
  },

  run_tests: function(sanity_test) {
    var t = sanity_test || new SanityTest();

    var pk1 = "eval(function(p,a,c,k,e,r){e=String;if(!''.replace(/^/,String)){while(c--)r[c]=k[c]||c;k=[function(e){return r[e]}];e=function(){return'\\\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c]);return p}('0 2=1',3,3,'var||a'.split('|'),0,{}))";
    var unpk1 = 'var a=1';
    var pk2 = "eval(function(p,a,c,k,e,r){e=String;if(!''.replace(/^/,String)){while(c--)r[c]=k[c]||c;k=[function(e){return r[e]}];e=function(){return'\\\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c]);return p}('0 2=1',3,3,'foo||b'.split('|'),0,{}))";
    var unpk2 = 'foo b=1';
    var pk_broken = "eval(function(p,a,c,k,e,r){BORKBORK;if(!''.replace(/^/,String)){while(c--)r[c]=k[c]||c;k=[function(e){return r[e]}];e=function(){return'\\\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c]);return p}('0 2=1',3,3,'var||a'.split('|'),0,{}))";
    var pk3 = "eval(function(p,a,c,k,e,r){e=String;if(!''.replace(/^/,String)){while(c--)r[c]=k[c]||c;k=[function(e){return r[e]}];e=function(){return'\\\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c]);return p}('0 2=1{}))',3,3,'var||a'.split('|'),0,{}))";
    var unpk3 = 'var a=1{}))';

    t.test_function(P_A_C_K_E_R.detect, "P_A_C_K_E_R.detect");
    t.expect('', false);
    t.expect('var a = b', false);
    t.test_function(P_A_C_K_E_R.unpack, "P_A_C_K_E_R.unpack");
    t.expect(pk_broken, pk_broken);
    t.expect(pk1, unpk1);
    t.expect(pk2, unpk2);
    t.expect(pk3, unpk3);
    t.expect("function test (){alert ('This is a test!')}; " +
      "eval(function(p,a,c,k,e,r){e=String;if(!''.replace(/^/,String))" +
      "{while(c--)r[c]=k[c]||c;k=[function(e){return r[e]}];e=function" +
      "(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp(" +
      "'\\b'+e(c)+'\\b','g'),k[c]);return p}('0 2=\\\'{Íâ–+›ï;ã†Ù¥#\\\'',3,3," +
      "'var||a'.split('|'),0,{}))",
      "function test (){alert ('This is a test!')}; var a='{Íâ–+›ï;ã†Ù¥#'");


    var filler = '\nfiller\n';
    t.expect(filler + pk1 + "\n" + pk_broken + filler + pk2 + filler, filler + unpk1 + "\n" + pk_broken + filler + unpk2 + filler);

    return t;
  }


};


}
/*
     FILE ARCHIVED ON 06:21:14 Sep 08, 2021 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 04:15:46 Sep 09, 2021.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  exclusion.robots.policy: 0.178
  CDXLines.iter: 16.802 (3)
  LoadShardBlock: 93.441 (3)
  captures_list: 117.919
  PetaboxLoader3.datanode: 104.038 (4)
  exclusion.robots: 0.191
  load_resource: 203.756
  esindex: 0.012
  PetaboxLoader3.resolve: 106.827
  RedisCDXSource: 0.989
*/

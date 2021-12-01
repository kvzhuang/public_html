<?php
  header('P3P: CP=HONK');
  setcookie('test_cookie', '1', 0, '/');
?>
<iframe src="http://198.199.116.28/test/iframe2.php" id="i1" ></iframe>
<div id="test_cookie" style="position: absolute; top: -10000px"></div>
<script>
  window.setTimeout(function() {
var cookieName = 'HelloWorld';
var cookieValue = 'HelloWorld';
var myDate = new Date();
myDate.setMonth(myDate.getMonth() + 12);
var i = document.getElementById('i1').contentWindow.document;
debugger;
i.cookie = cookieName +"=" + cookieValue + ";expires=" + myDate
                  + ";path=/";
  }, 100);
console.log(document.cookie);
</script>

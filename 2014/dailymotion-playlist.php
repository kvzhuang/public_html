<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="author" content="">
<title> Prototype</title>
<link rel="stylesheet" href="http://yui.yahooapis.com/3.7.2/build/cssreset/reset-min.css">
<link rel="stylesheet" href="http://yui.yahooapis.com/3.7.2/build/cssfonts/fonts-min.css">
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.0/jquery.min.js"></script>
<style type="text/css">

</style>
</head>
<body>
<?php
$pid = $_GET['pid'];
if (isset($pid) && $pid ===''){
} else {

    $url = 'https://api.dailymotion.com/playlist/' . $pid . '?fields=videos_total';
    $count = json_decode(file_get_contents($url))->videos_total;
?>
<div style='float:left'>
<?php
    for ($offset = 1; $offset <= ($count/10)+1; $offset = $offset + 1 ) {
echo $offset . "<br/>";
?>
<span>
<?php
        $url = 'https://api.dailymotion.com/playlist/' . $pid . '/videos?page=' . $offset . '&fields=id,title,url';
        $cont = json_decode(file_get_contents($url));
        foreach($cont->list as $index => $item) {
?>
<?php
echo urldecode($item->url);
?>
<br/>
<?php
        }
?>

</span>
<?php
    }
}
?>
</div>
<script>

$('span').click(function (){
    var range, selection;
    return;
    if (window.getSelection && document.createRange) {
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents($(this)[0]);
        selection.removeAllRanges();
        selection.addRange(range);
    } else if (document.selection && document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText($(this)[0]);
        range.select();
    }
});
</script>
</body>
</html>

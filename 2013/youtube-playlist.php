<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="author" content="">
<title> Prototype</title>
<link rel="stylesheet" href="http://yui.yahooapis.com/3.7.2/build/cssreset/reset-min.css">
<link rel="stylesheet" href="http://yui.yahooapis.com/3.7.2/build/cssfonts/fonts-min.css">
<script type="text/javascript" src="http://yui.yahooapis.com/3.7.2/build/yui/yui-min.js"></script>
<style type="text/css">

</style>
</head>
<body>
<?php
$playlistId = $_GET['pid'];
if (isset($playlistId)&& $playlistId ==''){
exit;
}
$offset = 1;
for ($x=1; $x<=40; $x++) {
$cont = json_decode(file_get_contents('http://gdata.youtube.com/feeds/api/playlists/'.$playlistId.'/?v=2&alt=json&feature=plcp&max-results=15&start-index='.$offset));
?>

<?php echo ($x==1)?$cont->feed->title->{'$t'}.'<br/>':$x.'<br/>'; ?>
<?php $feed = $cont->feed->entry; ?>
<?php if(count($feed)): foreach($feed as $item): // youtube start ?>
<?php echo  $item->link[0]->href;  ?> <br />
<?php endforeach; endif; // youtube end ?>
<?php

$offset += 15;
}
?>
</body>
</html>
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
$pid= $_GET['pid'];
if (isset($pid)&& $pid ===''){
exit;
} else {
?>
<div style='float:left'>
<?php
    $offset = 1;
    for ($x=1; $x<=40; $x++) {
        $cont = json_decode(file_get_contents('http://gdata.youtube.com/feeds/api/playlists/'.$pid.'/?v=2&alt=json&feature=plcp&max-results=15&start-index='.$offset));

        if (count($cont->feed->entry)===0) break;
?>

<?php echo ($x==1)?$cont->feed->title->{'$t'}.'<br/>':$x.'<br/>'; ?>
<span>
<?php $feed = $cont->feed->entry; ?>
<?php if(count($feed)): foreach($feed as $item): // youtube start ?>
<?php echo  $item->link[0]->href;  ?> <br />
<?php endforeach; endif; // youtube end ?>
</span>
<?php
    $offset += 15;
    }
?>
</div>
<div>
<?php
    $offset = 1;
    for ($x=1; $x<=40; $x++) {
        $cont = json_decode(file_get_contents('http://gdata.youtube.com/feeds/api/playlists/'.$pid.'/?v=2&alt=json&feature=plcp&max-results=15&start-index='.$offset));

        if (count($cont->feed->entry)===0) break;
?>

<?php echo ($x==1)?$cont->feed->title->{'$t'}.'<br/>':$x.'<br/>'; ?>
<?php $feed = $cont->feed->entry; ?>
<?php if(count($feed)): foreach($feed as $item): // youtube start ?>
<?php echo  $item->title->{'$t'};  ?> <br />
<?php endforeach; endif; // youtube end ?>
<?php
    $offset += 15;
    }
?>
<?php
}
?>
</div>
<?php
$uid = $_GET['uid'];
if (isset($uid)&& $uid ===''){
exit;
} else {
?>
<div style='float:left'>
<?php
    $offset = 1;
    for ($x=1; $x<=40; $x++) {
        $cont = json_decode(file_get_contents('http://gdata.youtube.com/feeds/api/users/'.$uid.'/uploads/?v=2&alt=json&max-results=15&start-index='.$offset));

        if (count($cont->feed->entry)===0) break;
?>

<?php echo ($x==1)?$cont->feed->author[0]->name->{'$t'}.'<br/>':$x.'<br/>'; ?>
<?php $feed = $cont->feed->entry; ?>
<span>
<?php if(count($feed)): foreach($feed as $item): // youtube start ?>
<?php echo  $item->link[0]->href;  ?> <br />
<?php endforeach; endif; // youtube end ?>
</span>
<?php
    $offset += 15;
    }
?>
</div>
<div>
<?php
    $offset = 1;
    for ($x=1; $x<=40; $x++) {
        $cont = json_decode(file_get_contents('http://gdata.youtube.com/feeds/api/users/'.$uid.'/uploads/?v=2&alt=json&max-results=15&start-index='.$offset));

        if (count($cont->feed->entry)===0) break;
?>

<?php echo ($x==1)?$cont->feed->author[0]->name->{'$t'}.'<br/>':$x.'<br/>'; ?>
<?php $feed = $cont->feed->entry; ?>
<?php if(count($feed)): foreach($feed as $item): // youtube start ?>
<?php echo  $item->title->{'$t'};  ?> <br />
<?php endforeach; endif; // youtube end ?>
<?php
    $offset += 15;
    }
?>
<?php
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

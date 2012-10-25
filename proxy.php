<?php
/**
 * This file is for test only and should be removed in production.
 */
header('Content-Type: text/plain');
$vid = (isset($_GET["vid"]) && $_GET["vid"] !== "") ? $_GET["vid"] : "8ipi4Ak1ZjA";
$url = 'http://www.youtube.com/get_video_info?video_id=' . $vid;
$oResource = curl_init();
curl_setopt($oResource, CURLOPT_URL, $url);
curl_setopt($oResource, CURLOPT_RETURNTRANSFER, true);
curl_setopt($oResource, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($oResource, CURLOPT_SSL_VERIFYPEER, false);
$xml = curl_exec($oResource);
echo $xml;
curl_close($oResource);
?>

<?php
$videoUrl = $_GET["url"];

if(empty($videoUrl))
{
    echo "No DM video url";
    return;
}
else
{
    $tubePage = $videoUrl;
}


//$videosFolder="videos/";
//if (!file_exists($videosFolder)){mkdir($videosFolder, 0777, true);}


function randomName($length=10) {
    return substr(str_shuffle("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, $length);
}


function downloadFile($url, $path) {
  $newfname = $path;
  $file = fopen ($url, "rb");
  if ($file) {
    $newf = fopen ($newfname, "wb");
        print "\nDownloading video";
    if ($newf)
    while(!feof($file)) {
      fwrite($newf, fread($file, 1024 * 8 ), 1024 * 8 );
      print ".";
    }
  }
  if ($file) {fclose($file);}
  if ($newf) {fclose($newf);}
}


function getVideoUrl($url){
    global $cookiejar;


    $userAgent = "Mozilla/5.0 (X11; Linux i686; rv:18.0) Gecko/20100101 Firefox/18.0";
    $headers = array("Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                                                                                                                                    "Accept-Language: en-us,en;q=0.5");
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, TRUE);
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
    curl_setopt($ch, CURLOPT_PORT , 80);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_COOKIEFILE, $cookiejar);
    curl_setopt($ch, CURLOPT_COOKIEJAR, $cookiejar);
    curl_setopt($ch, CURLOPT_COOKIE, 'family_filter=off;');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $output = curl_exec($ch);

    curl_close($ch);
    preg_match("/name=\"flashvars\"\svalue=\"(.*?)\"/i",$output,$flashvars);
    if(isset($flashvars[1])){
        $flashvars=urldecode($flashvars[1]);
        preg_match("/\"video_url\":\"(.*?)\"/i",$flashvars,$flvUrl);
        if(empty($flvUrl[1])){
            preg_match("/\"sdURL\":\"(.*?)\"/i",$flashvars,$flvUrl);
        }
    }
    if(isset($flvUrl[1])) {
        echo "DailyMotion Video URL : ";
        echo(urldecode($flvUrl[1]));
        return urldecode($flvUrl[1]);
    }else{
        return false;
    }
}


if($flvUrl=getVideoUrl($tubePage)){
  $flvUrl=str_replace("\/","/",$flvUrl);
  $flvFilename=randomName();
//  downloadFile($flvUrl,$videosFolder.$flvFilename.".mp4");
}else{echo "Unable to get video from Dailymotion.";}
?>

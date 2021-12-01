<?php
    define('NICKNAME', 'kvzhuangbot');
    define('PASSWORD', 'rt1olala');
    define('USER_ID', '10413189');
    ini_set('display_errors', 1);


    $message = '天氣預報'."\n";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_COOKIEJAR, 'cookie.txt');
    curl_setopt($ch, CURLOPT_COOKIEFILE, 'cookie.txt');

    // login
    curl_setopt($ch, CURLOPT_URL, 'http://opendata.cwb.gov.tw/opendata/MFC/F-C0032-001.xml');
    $weather_data = curl_exec($ch);
    $data = simplexml_load_string($weather_data);
    $data = json_decode(json_encode($data), TRUE);
    $message .= (string) $data["data"]["location"][0]["name"] ."\n";
    $message .= (string) $data["data"]["location"][0]["weather-elements"]["PoP"]["time"][0]["@attributes"]["start"] . "-";
    $message .= (string) $data["data"]["location"][0]["weather-elements"]["PoP"]["time"][0]["@attributes"]["end"] . "\n";
    $message .= "降雨機率:" . (string) $data["data"]["location"][0]["weather-elements"]["PoP"]["time"][0]["value"] ."%" . "\n";
    $message .= "最低氣溫:" . (string) $data["data"]["location"][0]["weather-elements"]["MinT"]["time"][0]["value"] ."度C" . "\n";
    $message .= "最高氣溫:" . (string) $data["data"]["location"][0]["weather-elements"]["MaxT"]["time"][0]["value"] ."度C";

    $reply = $data["data"]["location"][0]["weather-elements"]["Wx"]["time"][0]["text"] . "\n";
    $reply .= $data["data"]["location"][0]["weather-elements"]["CI"]["time"][0]["text"];

    curl_setopt($ch, CURLOPT_URL, 'https://www.ptt.cc/bbs/Beauty/index.html');
    $bdata = curl_exec($ch);

    $dom = new DOMDocument;
    $dom->loadHTML($bdata);
    $finder = new DomXPath($dom);
    $classname="title";
    $nodes = $finder->query("//*[contains(@class, '$classname')]");


    $dom->loadHTML($dom->saveHTML($nodes->item(0)));
    $urls = $dom->getElementsByTagName('a');
    if($urls->length != 0)
    {
        curl_setopt($ch, CURLOPT_URL, 'https://www.ptt.cc' . $urls->item(0)->attributes->item(0)->nodeValue);
        $ddata = curl_exec($ch);
        $dom->loadHTML($ddata);
        $imgs = $dom->getElementsByTagName("img");
        if ($imgs->length != 0)
        {
            $message .= "\n" . $imgs->item(0)->attributes->item(0)->nodeValue;
        }
    }
    // login
    curl_setopt($ch, CURLOPT_URL, 'http://www.plurk.com/Users/login');
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'nick_name='.NICKNAME.'&password='.urlencode(PASSWORD).'&logintoken=1');
    curl_exec($ch);

    // post
    curl_setopt($ch, CURLOPT_URL, 'http://www.plurk.com/TimeLine/addPlurk');
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'qualifier=says&content='.urlencode($message).'&lang=tr_ch&no_comments=0&uid='.USER_ID);
    $response = curl_exec($ch);

    $pos_s = strpos($response, '"plurk_id": ') + 12;
    $plurk_id = substr($response, $pos_s, strpos($response, ',', $pos_s) - $pos_s);

    // reply
    curl_setopt($ch, CURLOPT_URL, 'http://www.plurk.com/Responses/add');
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'content='.urlencode($reply).'&lang=tr_ch&p_uid='.USER_ID."&plurk_id=$plurk_id&posted=".date('c').'&qualifier=says&uid='.USER_ID);
    curl_exec($ch);
    curl_close($ch);


    echo $message;
    echo $reply;
?>


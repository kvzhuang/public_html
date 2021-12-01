<?php

    ini_set('display_errors', 1);
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_COOKIEJAR, 'cookie.txt');
    curl_setopt($ch, CURLOPT_COOKIEFILE, 'cookie.txt');

    // login
    curl_setopt($ch, CURLOPT_URL, 'https://www.ptt.cc/bbs/Beauty/index.html');
    $bdata = curl_exec($ch);

    $dom = new DOMDocument;
    $dom->loadHTML($bdata);
    $finder = new DomXPath($dom);
    $classname="title";
    $nodes = $finder->query("//*[contains(@class, '$classname')]");
    $pics = $nodes->length;
    $ind = rand(0, (int)$pics);
    print_r($dom->saveHTML($nodes->item($ind)));
    $dom->loadHTML($dom->saveHTML($nodes->item($ind)));

    $urls = $dom->getElementsByTagName('a');
    if($urls->length != 0)
    {
        curl_setopt($ch, CURLOPT_URL, 'https://www.ptt.cc' . $urls->item(0)->attributes->item(0)->nodeValue);
        $ddata = curl_exec($ch);
        $dom->loadHTML($ddata);
        $imgs = $dom->getElementsByTagName("img");
        if ($imgs->length != 0)
        {
            print_r($imgs->item(0)->attributes->item(0)->nodeValue);
        }
    }
?>

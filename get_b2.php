<?php
function cURL($url, $header=NULL, $cookie=NULL, $post=NULL)
{
    //$user_agent = $_SERVER['HTTP_USER_AGENT'];
    $user_agent = 'Mozilla/5.0 (Windows NT 5.1; rv:10.0.2) Gecko/20100101 Firefox/10.0.2';
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_HEADER, $header);
    curl_setopt($ch, CURLOPT_NOBODY, $header);
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_COOKIE, $cookie);
    curl_setopt($ch, CURLOPT_USERAGENT, $user_agent);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);

    if ($post) {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
    }
    $result = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if($result){
        return $result;
    }else{
        return $error;
    }
}

function curl_fb($url){
    //輸入要用來登入的e-mail與密碼
    $EMAIL = "kevinzhuang72@gmail.com";
    $PASSWORD = "rt1olala";

    $fb_login_url = "https://login.facebook.com/login.php?login_attempt=1";
    $result = cURL($fb_login_url,true,null,"email=$EMAIL&pass=$PASSWORD");
    preg_match('%Set-Cookie: ([^;]+);%',$result,$M);
    $result = cURL($fb_login_url,true,$M[1],"email=$EMAIL&pass=$PASSWORD");
    preg_match_all('%Set-Cookie: ([^;]+);%',$result,$M);

    $cookie = '';
    for($i=0;$i<count($M[0]);$i++){
        $cookie .= $M[1][$i].";";
    }

    return cURL($url,null,$cookie,null);
}

    $url = 'https://www.facebook.com/timliaofb.beauty';
    $bdata = curl_fb($url);
    $html = str_get_html($bdata);
    print_r('a');
    foreach ($html->find('img[src]') as $img) {
        echo $img->getAttribute('src');
    }
    exit;
    $finder = new DomXPath($dom);
    $classname="img";
    $nodes = $finder->query("//*[contains(@class, '$classname')]");
    $pics = $nodes->length;
    print_r($pics);
    $ind = rand(0, (int)$pics);
    $dom->loadHTML($dom->saveHTML($nodes->item($ind)));
?>

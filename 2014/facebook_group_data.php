<?php
$access_token = $_POST["access_token"];
$since = $_POST["since"];
$until = $_POST["until"];
$group_id = $_POST["group_id"];

$post_data = array(
    "access_token" => $access_token,
    "since" => $since,
    "until" => $until
);
$param = http_build_query($post_data);
$url = "https://graph.facebook.com/" . $group_id . "/feed?".$param;
$content = json_decode(file_get_contents($url));
//echo "<pre>";print_r($content->data);
$feed_count = sizeof($content->data);



?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Facebook Group List</title>
<link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.0.3/css/bootstrap.min.css">
<script type="text/javascript" src="//netdna.bootstrapcdn.com/bootstrap/3.0.3/js/bootstrap.min.js"></script>
<style>
</style>
</head>
<body>
    <div class="">
    <span>總共:<?php echo $feed_count;?>訊息</span>
<br/>
<?php
foreach($content->data as $data)
    {
    //echo "<pre>";print_r($data->type);
    if (isset($data->message))
    {
            $d = explode("_", (string)$data->id);
?>
            訊息:<a href="https://www.facebook.com/<?php echo $d[0]; ?>/posts/<?php echo $d[1]; ?>" target="_blank">
            <?php echo (string)$data->message; ?>
            </a>
            讚: <?php echo sizeof($data->likes->data); ?>
            作者:<?php echo $data->from->name; ?>
            <br>
<?php
    }
    else if ($data->type == "link" ||$data->type == "photo")
    {
//    echo "<pre>";print_r($data);
?>
             訊息:<a href="https://www.facebook.com/<?php echo $d[0]; ?>/posts/<?php echo $d[1]; ?>" target="_blank">
                <img src="<?php echo $data->picture; ?>" >
             </a>
             <a src="<?php $data->link; ?>" target="_blank"><?php echo (string)$data->link; ?></a>
             讚: <?php echo sizeof($data->likes->data); ?>
             作者:<?php echo $data->from->name; ?>
             <br>

<?php
    }

}
?>
    </div>
</body>
</html>


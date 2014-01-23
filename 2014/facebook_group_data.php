<?php
$post_data = array();
$access_token = $_POST["access_token"];
if (! isset($_POST["access_token"]) ||  trim($access_token) == "")
{
    echo "No access token!";
    continue;
} else
{
    $post_data["access_token"] = $access_token;
}


$group_id = $_POST["group_id"];

if (! isset($group_id) || trim($group_id) == "")
{
    echo "No group id!";
    continue;
}

$since = $_POST["since"];
if (isset($since) && trim($since) != "")
{
    $since = strtotime($since);
    $post_data["since"] = $since;
}
$until = $_POST["until"];
if (isset($until) && trim($until) != "")
{
    $until = strtotime($until);
    $post_data["until"] = $until;
}

$param = http_build_query($post_data);
$url = "https://graph.facebook.com/" . $group_id . "/feed?".$param;
$content = json_decode(file_get_contents($url));
//echo "<pre>";print_r($content);
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
.col1 {
    width: 80%
}
.col2 {
    width: 10%
}
.col3 {
    width: 10%
}
</style>
</head>
<body>
    <h1>Facebook 公開社團資料分析器</h1>
    <span>總共:<?php echo $feed_count;?>訊息</span>
    <br/>
<table class="table table-striped">
<thead>
    <tr>
        <th>文章連結</th>
        <th>讚數</th>
        <th>作者</th>
    </tr>
</thead>
<?php
foreach($content->data as $data)
    {
    //echo "<pre>";print_r($data->type);
    if (isset($data->message))
    {
            $d = explode("_", (string)$data->id);
?>
    <tr>
            <td class="col1">
            訊息:<a href="https://www.facebook.com/<?php echo $d[0]; ?>/posts/<?php echo $d[1]; ?>" target="_blank">
            <?php echo (string)$data->message; ?>
            </a>
            </td>
            <td class="col2">
            讚: <?php echo sizeof($data->likes->data); ?>
            </td>
            <td class="col3">
            作者:<?php echo $data->from->name; ?>
            </td>
    </tr>
<?php
    }
    else if ($data->type == "link" ||$data->type == "photo")
    {
//    echo "<pre>";print_r($data);
?>
    <tr>
        <td class="col1">
             訊息:<a href="https://www.facebook.com/<?php echo $d[0]; ?>/posts/<?php echo $d[1]; ?>" target="_blank">
                <img src="<?php echo $data->picture; ?>" >
             </a>
             <a src="<?php $data->link; ?>" target="_blank"><?php echo (string)$data->link; ?></a>
        </td>
        <td class="col2">
             讚: <?php echo sizeof($data->likes->data); ?>
        </td>
        <td class="col3">
             作者:<?php echo $data->from->name; ?>
        </td>
    </tr>

<?php
    }

}
?>
</table>
</body>
</html>


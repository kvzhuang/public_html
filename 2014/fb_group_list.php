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
if ( trim($since) != "")
{
    $since = strtotime($since);
    $post_data["since"] = $since;
}
$until = $_POST["until"];
if ( trim($until) != "")
{
    $until = strtotime($until);
    $post_data["until"] = $until;
}
$group_info = json_decode(file_get_contents( "https://graph.facebook.com/" . $group_id));
$group_name = (string)$group_info->name;

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
    width: 70%
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
    <div class="container">
        <h1>Facebook 公開社團資料分析器</h1>
        <h2>by 莊為任</h2>
        <h3><?php echo htmlspecialchars($group_name); ?></h3>
        <span>總共:<?php echo $feed_count;?>條訊息</span>
        <br/>
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>文章連結</th>
                    <th>討論數</th>
                    <th>讚數</th>
                    <th>作者</th>
                </tr>
            </thead>
<?php
foreach($content->data as $data)
    {
    if (isset($data->message))
    {
            $d = explode("_", (string)$data->id);
?>
    <tr>
            <td class="col1">
            訊息:<a href="https://www.facebook.com/<?php echo $d[0]; ?>/posts/<?php echo $d[1]; ?>" target="_blank">
            <?php echo htmlspecialchars((string)$data->message); ?>
            </a>
            </td>
            <td class="col2">
                回文數: <?php echo sizeof($data->comments->data); ?>
            </td>
            <td class="col2">
                 讚: <?php echo sizeof($data->likes->data); ?>
            </td>
            <td class="col3">
            作者:<?php echo htmlspecialchars($data->from->name); ?>
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
                <img src="<?php echo htmlspecialchars($data->picture); ?>" >
             </a>
             <a src="<?php echo htmlspecialchars($data->link); ?>" target="_blank"><?php echo htmlspecialchars((string)$data->link); ?></a>
        </td>
        <td class="col2">
             回文數: <?php echo sizeof($data->comments->data); ?>
        </td>
        <td class="col2">
             讚: <?php echo sizeof($data->likes->data); ?>
        </td>
        <td class="col3">
             作者:<?php echo htmlspecialchars($data->from->name); ?>
        </td>
    </tr>

<?php
    }

}
?>
            </table>
        </div>
    </body>
</html>


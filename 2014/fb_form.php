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
        <form action="facebook_group_data.php" METHOD="POST">
            Access_token <input type="text" name="access_token">
            Since:<input type="text" name="since"/>
            Until:<input type="text" name="until"/>
            Group id<input type="text" name="group id"/>
            <input type="submit"/>
        </form>
    </div>
</body>
</html>


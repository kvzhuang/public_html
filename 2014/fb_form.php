<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Facebook Group List</title>
<link href="//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.2/css/bootstrap-combined.min.css" rel="stylesheet">
<script src="//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.2/js/bootstrap.min.js"></script>
<link rel="stylesheet" href="//code.jquery.com/ui/1.10.4/themes/smoothness/jquery-ui.css">
<script src="//code.jquery.com/jquery-1.9.1.js"></script>
<script src="//code.jquery.com/ui/1.10.4/jquery-ui.js"></script>
<style>
</style>
</head>
<body>
    <form action="facebook_group_data.php" METHOD="POST" class="form-horizontal" >
        <div class="control-group">
             <label for="access_token" class="control-label">Access token *</label>
             <div class="controls">
                 <input type="text" id="access_token" name="access_token" placeholder="access token">
                 <span class="help-block"><a href="https://developers.facebook.com/tools/explorer/" target="_blank">登入facebook取得access token.</a></span>
            </div>
        </div>
        <div class="control-group">
             <label for="group_id" class="control-label">Group id *</label>
             <div class="controls">
                <input type="text" id="group_id" name="group_id" placeholder="Group id">
             </div>
        </div>
        <div class="control-group">
             <label for="since" class="control-label">日期起自:</label>
             <div class="controls">
                <input type="text" id="since" name="since" placeholder="Since from">
             </div>
        </div>
        <div class="control-group">
             <label for="until" class="control-label">日期止自:</label>
             <div class="controls">
                <input type="text" id="until" name="until" placeholder="Until...">
             </div>
        </div>
        <div class="control-group">
             <div class="controls">
                <input type="submit" class="btn btn-default">
             </div>
        </div>
    </form>
<script>
$(function() {
    $("#since").datepicker();
    $("#until").datepicker();
  });
</script>
</body>
</html>


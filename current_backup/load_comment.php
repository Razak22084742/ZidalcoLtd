<?php
include 'db_connect.php';

$result = $conn->query("SELECT * FROM comments ORDER BY created_at DESC");
while($row = $result->fetch_assoc()){
    echo "<div class='comment'>
            <h4>".htmlspecialchars($row['name'])."</h4>
            <p>".htmlspecialchars($row['message'])."</p>
            <span>".$row['created_at']."</span>
          </div>";
}
?>

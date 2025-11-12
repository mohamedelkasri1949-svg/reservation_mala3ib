<?php
include 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = checkAuth();
    $action = $_POST['action'] ?? '';
    
    switch($action) {
        case 'get_notifications':
            $sql = "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $notifications = [];
            while($row = $result->fetch_assoc()) {
                $notifications[] = $row;
            }
            
            sendResponse($notifications, true, "الإشعارات");
            break;
            
        case 'mark_read':
            $notification_id = intval($_POST['notification_id']);
            $sql = "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $notification_id, $user_id);
            
            if ($stmt->execute()) {
                sendResponse([], true, "تم标记为已读");
            } else {
                sendResponse([], false, "خطأ في التحديث");
            }
            break;
    }
}

$conn->close();
?>
<?php
include 'config.php';

// رؤوس إضافية للـ API
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

try {
    $sql = "SELECT id, name, description, icon, is_active FROM categories WHERE is_active = TRUE ORDER BY name";
    $result = $conn->query($sql);

    $categories = [];
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }
    }
    
    sendResponse($categories, true, "تم جلب " . count($categories) . " تصنيف");
    
} catch (Exception $e) {
    sendResponse([], false, "خطأ في جلب التصنيفات: " . $e->getMessage());
}

$conn->close();
?>
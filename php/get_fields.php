<?php
// php/get_fields.php - النسخة الكاملة المصححة
session_start();
header('Content-Type: application/json; charset=utf-8');

// إعدادات قاعدة البيانات
$servername = "localhost";
$username = "root";
$password = "123";
$dbname = "reservation_mala3ib";
$port = 3307;

// دالة للإرسال
function sendResponse($success, $message, $data = []) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// إنشاء الاتصال
try {
    $conn = new mysqli($servername, $username, $password, $dbname, $port);
    
    if ($conn->connect_error) {
        sendResponse(false, 'فشل الاتصال بقاعدة البيانات: ' . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");

    // جلب جميع الملاعب المتاحة
    $sql = "SELECT m.*, c.name as category_name, c.icon as category_icon 
            FROM mala3ib m 
            LEFT JOIN categories c ON m.category_id = c.id 
            WHERE m.is_available = 1 
            ORDER BY m.id DESC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("خطأ في الاستعلام: " . $conn->error);
    }
    
    $fields = [];
    while ($row = $result->fetch_assoc()) {
        // تنظيف البيانات
        $fields[] = [
            'id' => intval($row['id']),
            'name' => $row['name'],
            'description' => $row['description'] ?? '',
            'address' => $row['address'],
            'city' => $row['city'],
            'latitude' => floatval($row['latitude'] ?? 0),
            'longitude' => floatval($row['longitude'] ?? 0),
            'price_per_hour' => floatval($row['price_per_hour']),
            'field_type' => $row['field_type'],
            'capacity' => intval($row['capacity'] ?? 0),
            'phone' => $row['phone'] ?? '',
            'email' => $row['email'] ?? '',
            'owner_id' => intval($row['owner_id'] ?? 0),
            'is_available' => intval($row['is_available']),
            'rating' => floatval($row['rating'] ?? 0),
            'opening_time' => $row['opening_time'] ?? '08:00',
            'closing_time' => $row['closing_time'] ?? '22:00',
            'category_name' => $row['category_name'] ?? 'عام',
            'category_icon' => $row['category_icon'] ?? '🏆'
        ];
    }
    
    sendResponse(true, "تم جلب " . count($fields) . " ملعب", $fields);
    
} catch (Exception $e) {
    sendResponse(false, "حدث خطأ: " . $e->getMessage());
}

$conn->close();
?>
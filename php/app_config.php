<?php
session_start();

// إعدادات قاعدة البيانات
$servername = "localhost";
$username = "root";
$password = "123";
$dbname = "reservation_mala3ib";
$port = 3307;

// إنشاء الاتصال
$conn = new mysqli($servername, $username, $password, $dbname, $port);

// فحص الاتصال
if ($conn->connect_error) {
    die("فشل الاتصال: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");

// إعدادات التطبيق
define('APP_NAME', 'سبورت لاين');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'http://localhost/reservation_mala3ib');

// دوال مساعدة
function formatPrice($price) {
    return number_format($price, 2) . ' درهم';
}

function formatDate($date) {
    $months = [
        'January' => 'يناير', 'February' => 'فبراير', 'March' => 'مارس',
        'April' => 'أبريل', 'May' => 'مايو', 'June' => 'يونيو',
        'July' => 'يوليو', 'August' => 'أغسطس', 'September' => 'سبتمبر',
        'October' => 'أكتوبر', 'November' => 'نوفمبر', 'December' => 'ديسمبر'
    ];
    
    $english_date = date('d F Y', strtotime($date));
    return str_replace(array_keys($months), array_values($months), $english_date);
}

function sendResponse($data = [], $success = true, $message = "") {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function sanitize($input) {
    global $conn;
    return $conn->real_escape_string(trim($input));
}

function checkAuth() {
    if (!isset($_SESSION['user_id'])) {
        sendResponse([], false, "يجب تسجيل الدخول أولاً");
    }
    return $_SESSION['user_id'];
}

function calculateDistance($lat1, $lon1, $lat2, $lon2) {
    $earth_radius = 6371;
    
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    
    $a = sin($dLat/2) * sin($dLat/2) + 
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * 
         sin($dLon/2) * sin($dLon/2);
    
    $c = 2 * atan2(sqrt($a), sqrt(1-$a));
    
    return round($earth_radius * $c, 2);
}

function sendNotification($user_id, $title, $message) {
    global $conn;
    
    $sql = "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $user_id, $title, $message);
    
    return $stmt->execute();
}
?>
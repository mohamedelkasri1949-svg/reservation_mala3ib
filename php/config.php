<?php
// config.php - النسخة المحسنة
ob_start();

// رؤوس CORS و JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    ob_end_clean();
    exit(0);
}

session_start();

// إعدادات قاعدة البيانات
$servername = "localhost";
$username = "root";
$password = "123";
$dbname = "reservation_mala3ib";
$port = 3307;

// إنشاء الاتصال
try {
    $conn = new mysqli($servername, $username, $password, $dbname, $port);
    
    if ($conn->connect_error) {
        throw new Exception("فشل الاتصال بقاعدة البيانات: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'data' => []
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// دوال مساعدة محسنة
function sendResponse($data = [], $success = true, $message = "") {
    if (ob_get_length()) ob_end_clean();
    
    http_response_code($success ? 200 : 400);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function sanitize($input) {
    global $conn;
    if (is_array($input)) {
        return array_map('sanitize', $input);
    }
    return $conn->real_escape_string(trim($input));
}

function checkAuth() {
    if (!isset($_SESSION['user_id'])) {
        sendResponse([], false, "يجب تسجيل الدخول أولاً");
    }
    return $_SESSION['user_id'];
}

// دوال الأمان
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validatePhone($phone) {
    return preg_match('/^[0-9]{10,15}$/', $phone);
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// دالة للتحقق من الصلاحيات
function checkRole($allowed_roles = ['user']) {
    if (!isset($_SESSION['user_role']) || !in_array($_SESSION['user_role'], $allowed_roles)) {
        sendResponse([], false, "ليس لديك صلاحية للوصول إلى هذا القسم");
    }
}

// إغلاق الـ buffer
register_shutdown_function(function() {
    if (ob_get_length()) ob_end_flush();
});
?>
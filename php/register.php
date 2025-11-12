<?php
// register.php 
session_start();
header('Content-Type: application/json; charset=utf-8');

// إعدادات قاعدة البيانات
$servername = "localhost";
$username = "root";
$password = "123";
$dbname = "reservation_mala3ib";
$port = 3307;

// إنشاء الاتصال
$conn = new mysqli($servername, $username, $password, $dbname, $port);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'فشل الاتصال بقاعدة البيانات']);
    exit;
}

$conn->set_charset("utf8mb4");

// دالة للإرسال
function sendResponse($success, $message, $data = []) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // ✅ الحصول على البيانات بشكل صحيح
    $full_name = isset($_POST['full_name']) ? $conn->real_escape_string(trim($_POST['full_name'])) : '';
    $email = isset($_POST['email']) ? $conn->real_escape_string(trim($_POST['email'])) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $phone = isset($_POST['phone']) ? $conn->real_escape_string(trim($_POST['phone'])) : '';

    // ✅ سجل البيانات المستلمة
    error_log("📨 بيانات التسجيل المستلمة:");
    error_log("الاسم: $full_name");
    error_log("البريد: $email");
    error_log("الهاتف: $phone");
    error_log("كلمة المرور: " . (empty($password) ? 'فارغة' : 'موجودة'));

    // ✅ التحقق من البيانات المطلوبة
    if (empty($full_name) || empty($email) || empty($password) || empty($phone)) {
        error_log("❌ حقل ناقص: الاسم=$full_name, البريد=$email, الهاتف=$phone, كلمة المرور=" . (empty($password) ? 'نعم' : 'لا'));
        sendResponse(false, "جميع الحقول مطلوبة");
    }

    // ✅ التحقق من صيغة البريد الإلكتروني
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, "صيغة البريد الإلكتروني غير صحيحة");
    }

    // ✅ التحقق من طول كلمة المرور
    if (strlen($password) < 6) {
        sendResponse(false, "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }

    try {
        // ✅ التحقق إذا كان البريد مستخدم مسبقاً
        $check_sql = "SELECT id FROM users WHERE email = ?";
        $check_stmt = $conn->prepare($check_sql);
        
        if (!$check_stmt) {
            throw new Exception("خطأ في إعداد استعلام التحقق: " . $conn->error);
        }
        
        $check_stmt->bind_param("s", $email);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows > 0) {
            sendResponse(false, "البريد الإلكتروني مسجل مسبقاً");
        }
        $check_stmt->close();

        // ✅ تشفير كلمة المرور
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        
        // ✅ إدراج المستخدم الجديد
        $insert_sql = "INSERT INTO users (full_name, email, password, phone, role, is_active) 
                      VALUES (?, ?, ?, ?, 'user', 1)";
        $insert_stmt = $conn->prepare($insert_sql);
        
        if (!$insert_stmt) {
            throw new Exception("خطأ في إعداد استعلام الإدراج: " . $conn->error);
        }
        
        $insert_stmt->bind_param("ssss", $full_name, $email, $hashed_password, $phone);
        
        if ($insert_stmt->execute()) {
            // ✅ نجح التسجيل
            $user_id = $conn->insert_id;
            
            error_log("✅ تم إنشاء حساب جديد: $email - ID: $user_id");
            
            sendResponse(true, "تم إنشاء الحساب بنجاح", [
                'id' => $user_id,
                'name' => $full_name,
                'email' => $email,
                'phone' => $phone,
                'role' => 'user'
            ]);
        } else {
            throw new Exception("فشل في إنشاء الحساب: " . $insert_stmt->error);
        }
        
        $insert_stmt->close();
        
    } catch (Exception $e) {
        error_log("❌ خطأ في التسجيل: " . $e->getMessage());
        sendResponse(false, "حدث خطأ في إنشاء الحساب");
    }
} else {
    sendResponse(false, "طريقة الطلب غير مسموحة");
}

$conn->close();
?>

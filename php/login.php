<?php
// login.php 
session_start();
header('Content-Type: application/json; charset=utf-8');

// إعدادات قاعدة البيانات
$conn = new mysqli("localhost", "root", "123", "reservation_mala3ib", 3307);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'فشل الاتصال بقاعدة البيانات']);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $conn->real_escape_string($_POST['email']);
    $password = $_POST['password'];

    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'البريد الإلكتروني وكلمة المرور مطلوبان']);
        exit;
    }

    // جلب بيانات المستخدم مع المدينة
    $sql = "SELECT id, full_name, email, password, role, phone, city FROM users WHERE email = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'البريد الإلكتروني غير مسجل']);
        exit;
    }

    $user = $result->fetch_assoc();
    
    // التحقق من كلمة المرور
    if (password_verify($password, $user['password']) || $password === $user['password']) {
        
        // إذا كانت كلمة المرور نص عادي، قم بتشفيرها
        if ($password === $user['password']) {
            $hashed = password_hash($password, PASSWORD_DEFAULT);
            $conn->query("UPDATE users SET password = '$hashed' WHERE email = '$email'");
        }
        
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['full_name'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_phone'] = $user['phone'];
        $_SESSION['user_city'] = $user['city'];
        
        // التوجيه الصحيح بناءً على الدور
        $redirect_page = 'map.html'; // افتراضي للمستخدم العادي
        
        if (trim($user['role']) === 'owner') {
            $redirect_page = 'owner_dashboard.html';
        } else if (trim($user['role']) === 'admin') {
            $redirect_page = 'admin_dashboard.html';
        }
        
        // ✅ إرجاع بيانات المستخدم مع المدينة
        $userData = [
            'id' => $user['id'],
            'name' => $user['full_name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'phone' => $user['phone'],
            'city' => $user['city'] // ✅ المدينة موجودة الآن
        ];
        
        echo json_encode([
            'success' => true,
            'message' => 'تم تسجيل الدخول بنجاح',
            'data' => $userData,
            'redirect' => $redirect_page
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        echo json_encode(['success' => false, 'message' => 'كلمة المرور غير صحيحة']);
    }
    
    $stmt->close();
} else {
    echo json_encode(['success' => false, 'message' => 'طريقة الطلب غير مسموحة']);
}

$conn->close();
?>

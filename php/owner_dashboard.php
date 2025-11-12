<?php
// php/owner_dashboard.php
session_start();

// وضع الرؤوس أولاً قبل أي إخراج
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

    // التحقق من تسجيل الدخول ودور صاحب الملعب
    if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'owner') {
        sendResponse(false, "ليس لديك صلاحية للوصول");
    }

    $owner_id = $_SESSION['user_id'];
    $city = $_SESSION['user_city'] ?? '';

    if (!$city) {
        sendResponse(false, "لا توجد مدينة محددة");
    }

    // معالجة طلب تأكيد استلام الدفع
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] == 'complete_booking') {
        $booking_id = intval($_POST['booking_id'] ?? 0);
        
        if ($booking_id === 0) {
            sendResponse(false, "بيانات غير صالحة");
        }

        // التحقق من أن الحجز يتبع لمدينة صاحب الملعب
        $check_sql = "SELECT r.*, m.city, r.user_id 
                      FROM reservations r 
                      JOIN mala3ib m ON r.field_id = m.id 
                      WHERE r.id = ? AND m.city = ?";
        
        $check_stmt = $conn->prepare($check_sql);
        $check_stmt->bind_param("is", $booking_id, $city);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows === 0) {
            sendResponse(false, "الحجز غير موجود أو ليس في مدينتك");
        }

        $booking = $check_result->fetch_assoc();

        // التحقق من أن الحجز ليس مكتملاً بالفعل
        if ($booking['status'] === 'completed') {
            sendResponse(false, "الحجز مكتمل بالفعل");
        }

        // التحقق من أن الحجز مدفوع نقدياً
        if ($booking['payment_method'] !== 'cash') {
            sendResponse(false, "يمكن تأكيد الدفع للحجوزات النقدية فقط");
        }

        // تحديث حالة الحجز والدفع
        $update_sql = "UPDATE reservations SET status = 'completed', payment_status = 'paid' WHERE id = ?";
        $update_stmt = $conn->prepare($update_sql);
        $update_stmt->bind_param("i", $booking_id);

        if ($update_stmt->execute()) {
            // إضافة ملاحظة
            $current_notes = $booking['notes'] ?? '';
            $new_notes = $current_notes . " \n تم استلام الدفع النقدي وتأكيد إكمال الحجز من قبل المالك في " . date('Y-m-d H:i:s');
            
            $notes_sql = "UPDATE reservations SET notes = ? WHERE id = ?";
            $notes_stmt = $conn->prepare($notes_sql);
            $notes_stmt->bind_param("si", $new_notes, $booking_id);
            $notes_stmt->execute();

            sendResponse(true, "تم تأكيد استلام الدفع وإكمال الحجز بنجاح");
        } else {
            sendResponse(false, "فشل في تأكيد استلام الدفع");
        }
        
        exit;
    }

    // معالجة طلب إلغاء الحجز
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] == 'cancel_booking') {
        $booking_id = intval($_POST['booking_id'] ?? 0);
        $reason = $_POST['reason'] ?? '';
        
        if ($booking_id === 0) {
            sendResponse(false, "بيانات غير صالحة");
        }

        // التحقق من أن الحجز يتبع لمدينة صاحب الملعب
        $check_sql = "SELECT r.*, m.city, r.user_id 
                      FROM reservations r 
                      JOIN mala3ib m ON r.field_id = m.id 
                      WHERE r.id = ? AND m.city = ?";
        
        $check_stmt = $conn->prepare($check_sql);
        $check_stmt->bind_param("is", $booking_id, $city);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows === 0) {
            sendResponse(false, "الحجز غير موجود أو ليس في مدينتك");
        }

        $booking = $check_result->fetch_assoc();

        // التحقق من أن الحجز ليس ملغى بالفعل
        if ($booking['status'] === 'cancelled') {
            sendResponse(false, "الحجز ملغى بالفعل");
        }

        // التحقق من أن الحجز ليس منتهياً
        $current_date = date('Y-m-d');
        $current_time = date('H:i');
        if ($booking['reservation_date'] < $current_date || 
            ($booking['reservation_date'] == $current_date && $booking['start_time'] <= $current_time)) {
            sendResponse(false, "لا يمكن إلغاء الحجز المنتهي");
        }

        // إلغاء الحجز
        $update_sql = "UPDATE reservations SET status = 'cancelled' WHERE id = ?";
        $update_stmt = $conn->prepare($update_sql);
        $update_stmt->bind_param("i", $booking_id);

        if ($update_stmt->execute()) {
            // إضافة ملاحظة إذا كان هناك سبب
            if (!empty($reason)) {
                $current_notes = $booking['notes'] ?? '';
                $new_notes = $current_notes . " \n سبب الإلغاء من المالك: " . $reason;
                
                $notes_sql = "UPDATE reservations SET notes = ? WHERE id = ?";
                $notes_stmt = $conn->prepare($notes_sql);
                $notes_stmt->bind_param("si", $new_notes, $booking_id);
                $notes_stmt->execute();
            }

            sendResponse(true, "تم إلغاء الحجز بنجاح");
        } else {
            sendResponse(false, "فشل في إلغاء الحجز");
        }
        
        exit;
    }

    // جلب جميع الحجوزات في مدينة صاحب الملعب
    $sql = "SELECT r.*, u.full_name as user_name, u.phone as user_phone, m.name as field_name, m.city
            FROM reservations r
            JOIN mala3ib m ON r.field_id = m.id
            JOIN users u ON r.user_id = u.id
            WHERE m.city = ?
            ORDER BY r.reservation_date DESC, r.start_time DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $city);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $bookings = [];
    while($row = $result->fetch_assoc()) {
        $bookings[] = [
            'id' => intval($row['id']),
            'user_name' => $row['user_name'],
            'user_phone' => $row['user_phone'],
            'field_name' => $row['field_name'],
            'city' => $row['city'],
            'reservation_date' => $row['reservation_date'],
            'start_time' => $row['start_time'],
            'end_time' => $row['end_time'],
            'duration' => floatval($row['duration']),
            'total_price' => floatval($row['total_price']),
            'payment_method' => $row['payment_method'],
            'payment_status' => $row['payment_status'],
            'status' => $row['status'],
            'notes' => $row['notes'] ?? ''
        ];
    }
    
    sendResponse(true, "تم جلب الحجوزات بنجاح", $bookings);
    
} catch (Exception $e) {
    sendResponse(false, "حدث خطأ: " . $e->getMessage());
}

$conn->close();
?>
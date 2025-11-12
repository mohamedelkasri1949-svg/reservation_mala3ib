<?php
// php/booking_system.php - النسخة المصححة للدفع الإلكتروني
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

// دالة التنظيف
function sanitize($input) {
    global $conn;
    return $conn->real_escape_string(trim($input));
}

// دالة التحقق من المصادقة
function checkAuth() {
    if (!isset($_SESSION['user_id'])) {
        sendResponse(false, "يجب تسجيل الدخول أولاً");
    }
    return $_SESSION['user_id'];
}

// إنشاء الاتصال
try {
    $conn = new mysqli($servername, $username, $password, $dbname, $port);
    
    if ($conn->connect_error) {
        sendResponse(false, 'فشل الاتصال بقاعدة البيانات: ' . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");

} catch (Exception $e) {
    sendResponse(false, "خطأ في الاتصال: " . $e->getMessage());
}

class BookingSystem {
    private $conn;
    
    public function __construct($connection) {
        $this->conn = $connection;
    }
    
    public function createBooking($user_id, $field_id, $date, $start_time, $end_time, $duration, $total_price, $payment_method, $notes = '') {
        try {
            // التحقق من وجود الملعب
            $field_sql = "SELECT name FROM mala3ib WHERE id = ? AND is_available = TRUE";
            $field_stmt = $this->conn->prepare($field_sql);
            $field_stmt->bind_param("i", $field_id);
            $field_stmt->execute();
            $field_result = $field_stmt->get_result();
            
            if ($field_result->num_rows === 0) {
                return ['success' => false, 'message' => 'الملعب غير متاح'];
            }
            
            $field = $field_result->fetch_assoc();
            
            // التحقق من توفر الوقت
            if (!$this->checkAvailability($field_id, $date, $start_time, $end_time)) {
                return ['success' => false, 'message' => 'الوقت غير متاح'];
            }
            
            // ✅ تحديد حالة الدفع - الإصلاح هنا
            $payment_status = ($payment_method === 'online') ? 'paid' : 'pending';
            $booking_status = 'confirmed';
            
            // إدخال الحجز في قاعدة البيانات
            $insert_sql = "INSERT INTO reservations (user_id, field_id, reservation_date, start_time, end_time, duration, total_price, payment_method, payment_status, notes, status) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $insert_stmt = $this->conn->prepare($insert_sql);
            $insert_stmt->bind_param("iisssidssss", $user_id, $field_id, $date, $start_time, $end_time, $duration, $total_price, $payment_method, $payment_status, $notes, $booking_status);
            
            if ($insert_stmt->execute()) {
                $booking_id = $insert_stmt->insert_id;
                
                // إرجاع بيانات الحجز
                return [
                    'success' => true,
                    'message' => 'تم الحجز بنجاح',
                    'data' => [
                        'id' => $booking_id,
                        'field_name' => $field['name'],
                        'reservation_date' => $date,
                        'start_time' => $start_time,
                        'end_time' => $end_time,
                        'duration' => $duration,
                        'total_price' => $total_price,
                        'payment_method' => $payment_method,
                        'payment_status' => $payment_status,
                        'status' => $booking_status
                    ]
                ];
            } else {
                return ['success' => false, 'message' => 'خطأ في إنشاء الحجز: ' . $insert_stmt->error];
            }
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'خطأ في النظام: ' . $e->getMessage()];
        }
    }
    
    private function checkAvailability($field_id, $date, $start_time, $end_time) {
        $sql = "SELECT id FROM reservations 
                WHERE field_id = ? AND reservation_date = ? 
                AND status IN ('confirmed', 'pending')
                AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("isssss", $field_id, $date, $end_time, $start_time, $start_time, $end_time);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->num_rows === 0;
    }
    
    // الحصول على إحصائيات المستخدم
    public function getUserStats($user_id) {
        $sql = "SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN status = 'confirmed' AND reservation_date >= CURDATE() THEN 1 ELSE 0 END) as upcoming_bookings,
                SUM(CASE WHEN (status = 'completed' OR (status = 'confirmed' AND reservation_date < CURDATE())) THEN 1 ELSE 0 END) as completed_bookings,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END), 0) as total_spent
                FROM reservations 
                WHERE user_id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $stats = $result->fetch_assoc();
        
        return [
            'total_bookings' => intval($stats['total_bookings'] ?? 0),
            'upcoming_bookings' => intval($stats['upcoming_bookings'] ?? 0),
            'completed_bookings' => intval($stats['completed_bookings'] ?? 0),
            'cancelled_bookings' => intval($stats['cancelled_bookings'] ?? 0),
            'total_spent' => floatval($stats['total_spent'] ?? 0)
        ];
    }
    
    // الحصول على حجوزات المستخدم
    public function getUserBookings($user_id) {
        $sql = "SELECT r.*, m.name as field_name, m.city, m.field_type, m.price_per_hour
                FROM reservations r
                JOIN mala3ib m ON r.field_id = m.id
                WHERE r.user_id = ?
                ORDER BY r.reservation_date DESC, r.start_time DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $bookings = [];
        while($row = $result->fetch_assoc()) {
            $bookings[] = [
                'id' => intval($row['id']),
                'field_name' => $row['field_name'],
                'city' => $row['city'],
                'field_type' => $row['field_type'],
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
        
        return $bookings;
    }
    
    // إلغاء الحجز
    public function cancelBooking($user_id, $booking_id) {
        $check_sql = "SELECT id, reservation_date, status FROM reservations 
                     WHERE id = ? AND user_id = ? AND status IN ('confirmed', 'pending')";
        $check_stmt = $this->conn->prepare($check_sql);
        $check_stmt->bind_param("ii", $booking_id, $user_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        
        if ($check_result->num_rows === 0) {
            return false;
        }
        
        $booking = $check_result->fetch_assoc();
        
        $current_date = date('Y-m-d');
        if ($booking['reservation_date'] < $current_date) {
            return false;
        }
        
        $sql = "UPDATE reservations SET status = 'cancelled' WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $booking_id);
        
        return $stmt->execute();
    }
}

// التعامل مع الطلبات
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $bookingSystem = new BookingSystem($conn);
    $action = $_POST['action'] ?? '';
    
    switch($action) {
        case 'create_booking':
            $user_id = checkAuth();
            
            // تسجيل البيانات المستلمة
            error_log("🎯 بيانات الحجز المستلمة:");
            error_log("field_id: " . ($_POST['field_id'] ?? ''));
            error_log("reservation_date: " . ($_POST['reservation_date'] ?? ''));
            error_log("start_time: " . ($_POST['start_time'] ?? ''));
            error_log("end_time: " . ($_POST['end_time'] ?? ''));
            error_log("duration: " . ($_POST['duration'] ?? ''));
            error_log("total_price: " . ($_POST['total_price'] ?? ''));
            error_log("payment_method: " . ($_POST['payment_method'] ?? ''));
            
            $result = $bookingSystem->createBooking(
                $user_id,
                intval($_POST['field_id']),
                sanitize($_POST['reservation_date']),
                sanitize($_POST['start_time']),
                sanitize($_POST['end_time']),
                intval($_POST['duration']),
                floatval($_POST['total_price']),
                sanitize($_POST['payment_method']),
                sanitize($_POST['notes'] ?? '')
            );
            
            sendResponse($result['success'], $result['message'], $result['data'] ?? []);
            break;
            
        case 'get_user_stats':
            $user_id = checkAuth();
            $stats = $bookingSystem->getUserStats($user_id);
            sendResponse(true, "إحصائيات الحجوزات", $stats);
            break;
            
        case 'get_user_bookings':
            $user_id = checkAuth();
            $bookings = $bookingSystem->getUserBookings($user_id);
            sendResponse(true, "حجوزات المستخدم", $bookings);
            break;
            
        case 'cancel_booking':
            $user_id = checkAuth();
            $booking_id = intval($_POST['booking_id']);
            $success = $bookingSystem->cancelBooking($user_id, $booking_id);
            sendResponse($success, $success ? "تم إلغاء الحجز بنجاح" : "فشل في إلغاء الحجز");
            break;
            
        default:
            sendResponse(false, "إجراء غير معروف: $action");
    }
} else {
    sendResponse(false, "طريقة الطلب غير مسموحة");
}

$conn->close();
?>
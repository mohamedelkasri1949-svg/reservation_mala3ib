<?php
include 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $admin_id = checkAuth();
    
    // التحقق من صلاحية المدير
    $check_sql = "SELECT role FROM users WHERE id = ? AND role = 'admin'";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param("i", $admin_id);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    
    if ($check_result->num_rows === 0) {
        sendResponse([], false, "ليس لديك صلاحية للوصول");
    }
    
    $action = $_POST['action'] ?? '';
    
    switch($action) {
        case 'get_dashboard_stats':
            $stats = [
                'total_users' => 0,
                'total_fields' => 0,
                'total_bookings' => 0,
                'total_revenue' => 0,
                'pending_bookings' => 0
            ];
            
            // إجمالي المستخدمين
            $users_sql = "SELECT COUNT(*) as count FROM users WHERE role = 'user'";
            $users_result = $conn->query($users_sql);
            $stats['total_users'] = $users_result->fetch_assoc()['count'];
            
            // إجمالي الملاعب
            $fields_sql = "SELECT COUNT(*) as count FROM mala3ib";
            $fields_result = $conn->query($fields_sql);
            $stats['total_fields'] = $fields_result->fetch_assoc()['count'];
            
            // إجمالي الحجوزات
            $bookings_sql = "SELECT COUNT(*) as count, SUM(total_price) as revenue FROM reservations WHERE payment_status = 'paid'";
            $bookings_result = $conn->query($bookings_sql);
            $bookings_data = $bookings_result->fetch_assoc();
            $stats['total_bookings'] = $bookings_data['count'];
            $stats['total_revenue'] = $bookings_data['revenue'] ?? 0;
            
            // الحجوزات المنتظرة
            $pending_sql = "SELECT COUNT(*) as count FROM reservations WHERE status = 'pending'";
            $pending_result = $conn->query($pending_sql);
            $stats['pending_bookings'] = $pending_result->fetch_assoc()['count'];
            
            sendResponse($stats, true, "إحصائيات لوحة التحكم");
            break;
            
        case 'get_recent_bookings':
            $sql = "SELECT r.*, u.full_name as user_name, m.name as field_name 
                    FROM reservations r 
                    JOIN users u ON r.user_id = u.id 
                    JOIN mala3ib m ON r.field_id = m.id 
                    ORDER BY r.created_at DESC 
                    LIMIT 10";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $bookings = [];
            while($row = $result->fetch_assoc()) {
                $bookings[] = $row;
            }
            
            sendResponse($bookings, true, "آخر الحجوزات");
            break;
            
        default:
            sendResponse([], false, "إجراء غير معروف");
    }
}

$conn->close();
?>
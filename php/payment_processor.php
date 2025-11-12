<?php
include 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'simulate_payment') {
        $booking_id = intval($_POST['booking_id']);
        $amount = floatval($_POST['amount']);
        
        // محاكاة عملية الدفع
        sleep(2); // محاكاة وقت المعالجة
        
        // في التطبيق الحقيقي، هنا نتحقق من بوابة الدفع
        $success = true; // محاكاة نجاح الدفع
        
        if ($success) {
            // تحديث حالة الدفع
            $sql = "UPDATE reservations SET payment_status = 'paid', status = 'confirmed' WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $booking_id);
            
            if ($stmt->execute()) {
                sendResponse(['transaction_id' => 'TXN_' . time()], true, "تم الدفع بنجاح");
            } else {
                sendResponse([], false, "خطأ في تحديث حالة الدفع");
            }
        } else {
            sendResponse([], false, "فشل في عملية الدفع");
        }
    }
}

$conn->close();
?>
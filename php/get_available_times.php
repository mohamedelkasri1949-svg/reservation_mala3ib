<?php
// php/get_available_times.php 
include 'config.php';

header('Content-Type: application/json; charset=utf-8');

$field_id = isset($_GET['field_id']) ? intval($_GET['field_id']) : 0;
$date = isset($_GET['date']) ? sanitize($_GET['date']) : '';

if (!$field_id || !$date) {
    echo json_encode(['success'=>false, 'message'=>'الملعب أو التاريخ غير محدد']);
    exit;
}

try {
    // جلب مواعيد الملعب
    $sql = "SELECT opening_time, closing_time, price_per_hour FROM mala3ib WHERE id = ? AND is_available = TRUE";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $field_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success'=>false,'message'=>'الملعب غير موجود أو غير متاح']);
        exit;
    }
    
    $field = $result->fetch_assoc();
    $opening_time = $field['opening_time'];
    $closing_time = $field['closing_time'];
    $price_per_hour = floatval($field['price_per_hour']);

    // جلب الحجوزات الموجودة
    $sql2 = "SELECT start_time, end_time FROM reservations WHERE field_id = ? AND reservation_date = ? AND status IN ('confirmed','pending')";
    $stmt2 = $conn->prepare($sql2);
    $stmt2->bind_param("is", $field_id, $date);
    $stmt2->execute();
    $booked = $stmt2->get_result();
    $booked_slots = [];
    
    while($row = $booked->fetch_assoc()) {
        $booked_slots[] = ['start'=>$row['start_time'],'end'=>$row['end_time']];
    }

    // التحقق من التاريخ والوقت الحالي
    $today = date('Y-m-d');
    $current_time = date('H:i');
    $is_today = ($date === $today);

    // إنشاء قائمة الأوقات المتاحة
    $slots = [];
    $start = strtotime($opening_time);
    $end = strtotime($closing_time);

    while($start < $end) {
        $slot_start = date('H:i', $start);
        $slot_end = date('H:i', $start + 3600);

        // التحقق إذا الوقت محجوز
        $available = true;
        foreach($booked_slots as $b) {
            if (!($slot_end <= $b['start'] || $slot_start >= $b['end'])) {
                $available = false;
                break;
            }
        }

        // التحقق إذا الوقت قد مضى (لليوم الحالي فقط)
        if ($is_today && $available) {
            $slot_start_time = strtotime($slot_start);
            $current_time_stamp = strtotime($current_time);
            
            // إذا كان الوقت الحالي بعد بداية الفترة، احذف الفترة
            if ($current_time_stamp >= $slot_start_time) {
                $available = false;
            }
        }

        if ($available) {
            $slots[] = [
                'start' => $slot_start,
                'end' => $slot_end,
                'display' => $slot_start . ' - ' . $slot_end,
                'price' => $price_per_hour
            ];
        }
        $start += 3600; // ساعة
    }

    echo json_encode([
        'success'=>true, 
        'data'=>$slots, 
        'message'=> 'تم جلب ' . count($slots) . ' وقت متاح',
        'debug' => [
            'today' => $today,
            'current_time' => $current_time,
            'is_today' => $is_today,
            'total_slots' => count($slots)
        ]
    ]);

} catch(Exception $e) {
    echo json_encode(['success'=>false, 'message'=>'خطأ في السيرفر: '.$e->getMessage()]);
}

$conn->close();
?>

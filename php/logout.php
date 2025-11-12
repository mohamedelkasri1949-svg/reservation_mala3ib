<?php
include 'config.php';

session_start();
session_destroy();

sendResponse([], true, "تم تسجيل الخروج بنجاح");
?>
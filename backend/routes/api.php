<?php

use App\Http\Controllers\Api\ClientAuthController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [ClientAuthController::class, 'register']);
Route::post('/login', [ClientAuthController::class, 'login']);
Route::post('/update-fcm-token', [\App\Http\Controllers\Api\FcmController::class, 'updateToken']);
Route::post('/update-profile', [ClientAuthController::class, 'updateProfile']);
Route::match(['get', 'post'], '/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);

Route::get('/', function () {
    return view('api_docs');
});

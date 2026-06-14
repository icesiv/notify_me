<?php

use App\Http\Controllers\Api\ClientAuthController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [ClientAuthController::class, 'register']);
Route::post('/login', [ClientAuthController::class, 'login']);

Route::get('/', function () {
    return view('api_docs');
});

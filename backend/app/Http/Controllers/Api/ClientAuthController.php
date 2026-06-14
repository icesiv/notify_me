<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ClientAuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|min:3|max:255',
            'phone_number' => 'required|string|unique:clients,phone_number',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $client = Client::create([
            'full_name' => $request->full_name,
            'phone_number' => $request->phone_number,
            'password' => $request->password, // automatically hashed via cast in Client model
            'api_token' => Str::random(60),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Registration successful',
            'client' => [
                'id' => $client->id,
                'full_name' => $client->full_name,
                'phone_number' => $client->phone_number,
            ],
            'api_token' => $client->api_token,
        ], 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone_number' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $client = Client::where('phone_number', $request->phone_number)->first();

        if (!$client || !Hash::check($request->password, $client->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        // Generate a new token on login
        $client->update([
            'api_token' => Str::random(60)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'client' => [
                'id' => $client->id,
                'full_name' => $client->full_name,
                'phone_number' => $client->phone_number,
            ],
            'api_token' => $client->api_token,
        ], 200);
    }
}

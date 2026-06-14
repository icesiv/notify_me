<?php

namespace Tests\Feature;

use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_register()
    {
        $response = $this->postJson('/api/register', [
            'full_name' => 'Jane Doe',
            'phone_number' => '+15551234567',
            'password' => 'secret123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'client' => [
                    'id',
                    'full_name',
                    'phone_number',
                ],
                'api_token',
            ]);

        $this->assertDatabaseHas('clients', [
            'phone_number' => '+15551234567',
            'full_name' => 'Jane Doe',
        ]);
    }

    public function test_client_cannot_register_with_duplicate_phone_number()
    {
        Client::create([
            'full_name' => 'Existing User',
            'phone_number' => '+15551234567',
            'password' => 'secret123',
        ]);

        $response = $this->postJson('/api/register', [
            'full_name' => 'New User',
            'phone_number' => '+15551234567',
            'password' => 'secret123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone_number']);
    }

    public function test_client_can_login()
    {
        $client = Client::create([
            'full_name' => 'John Doe',
            'phone_number' => '+15557654321',
            'password' => 'mypassword',
        ]);

        $response = $this->postJson('/api/login', [
            'phone_number' => '+15557654321',
            'password' => 'mypassword',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'client' => [
                    'id',
                    'full_name',
                    'phone_number',
                ],
                'api_token',
            ]);
    }

    public function test_client_cannot_login_with_invalid_credentials()
    {
        Client::create([
            'full_name' => 'John Doe',
            'phone_number' => '+15557654321',
            'password' => 'mypassword',
        ]);

        $response = $this->postJson('/api/login', [
            'phone_number' => '+15557654321',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }

    public function test_api_playground_renders_successfully()
    {
        $response = $this->get('/api');

        $response->assertStatus(200)
            ->assertSee('NotifyMe API Documentation')
            ->assertSee('Try it out');
    }
}

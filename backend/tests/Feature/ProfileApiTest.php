<?php

namespace Tests\Feature;

use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_update_their_name()
    {
        $client = Client::create([
            'full_name' => 'Original Name',
            'phone_number' => '+15551111111',
            'password' => 'secret123',
            'api_token' => 'test_profile_token',
        ]);

        $response = $this->postJson('/api/update-profile', [
            'api_token' => 'test_profile_token',
            'full_name' => 'Updated Name',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Profile updated successfully',
                'client' => [
                    'full_name' => 'Updated Name',
                    'phone_number' => '+15551111111',
                ]
            ]);

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'full_name' => 'Updated Name',
        ]);
    }

    public function test_client_can_update_their_password()
    {
        $client = Client::create([
            'full_name' => 'Some Name',
            'phone_number' => '+15551111111',
            'password' => 'oldpassword123',
            'api_token' => 'test_profile_token',
        ]);

        $response = $this->postJson('/api/update-profile', [
            'api_token' => 'test_profile_token',
            'password' => 'newpassword123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Profile updated successfully',
            ]);

        $client->refresh();
        $this->assertTrue(Hash::check('newpassword123', $client->password));
    }

    public function test_profile_update_fails_without_api_token()
    {
        $response = $this->postJson('/api/update-profile', [
            'full_name' => 'Valid Name',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['api_token']);
    }

    public function test_profile_update_fails_with_invalid_api_token()
    {
        $response = $this->postJson('/api/update-profile', [
            'api_token' => 'invalid_token_xyz',
            'full_name' => 'Valid Name',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthorized',
            ]);
    }

    public function test_profile_update_validation_rules()
    {
        Client::create([
            'full_name' => 'Original Name',
            'phone_number' => '+15551111111',
            'password' => 'secret123',
            'api_token' => 'test_profile_token',
        ]);

        // Name too short (min:3)
        $response1 = $this->postJson('/api/update-profile', [
            'api_token' => 'test_profile_token',
            'full_name' => 'Jo',
        ]);
        $response1->assertStatus(422)
            ->assertJsonValidationErrors(['full_name']);

        // Password too short (min:6)
        $response2 = $this->postJson('/api/update-profile', [
            'api_token' => 'test_profile_token',
            'password' => 'short',
        ]);
        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}

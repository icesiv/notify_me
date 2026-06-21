<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\SentNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_fetch_their_notifications_and_global_notifications()
    {
        $clientA = Client::create([
            'full_name' => 'Client A',
            'phone_number' => '+15550000001',
            'password' => 'secret123',
            'api_token' => 'token_client_a',
        ]);

        $clientB = Client::create([
            'full_name' => 'Client B',
            'phone_number' => '+15550000002',
            'password' => 'secret123',
            'api_token' => 'token_client_b',
        ]);

        // Create notification for Client A
        $notifA = SentNotification::create([
            'title' => 'To Client A Only',
            'body' => 'Private body for A',
            'client_id' => $clientA->id,
            'sent_to_all' => false,
            'created_at' => now()->subMinutes(5),
        ]);

        // Create global notification
        $notifGlobal = SentNotification::create([
            'title' => 'Global Notification',
            'body' => 'Everyone should see this',
            'client_id' => null,
            'sent_to_all' => true,
            'created_at' => now(),
        ]);

        // Create notification for Client B
        $notifB = SentNotification::create([
            'title' => 'To Client B Only',
            'body' => 'Private body for B',
            'client_id' => $clientB->id,
            'sent_to_all' => false,
            'created_at' => now()->subMinutes(10),
        ]);

        // Request notifications for Client A (using POST request as matches documentation playground)
        $responsePost = $this->postJson('/api/notifications', [
            'api_token' => 'token_client_a',
        ]);

        $responsePost->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonCount(2, 'notifications');

        $notificationsPost = $responsePost->json('notifications');
        $this->assertEquals('Global Notification', $notificationsPost[0]['title']); // newest first
        $this->assertEquals('To Client A Only', $notificationsPost[1]['title']);

        // Request notifications for Client A (using GET request)
        $responseGet = $this->getJson('/api/notifications?api_token=token_client_a');

        $responseGet->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonCount(2, 'notifications');

        $notificationsGet = $responseGet->json('notifications');
        $this->assertEquals('Global Notification', $notificationsGet[0]['title']);
        $this->assertEquals('To Client A Only', $notificationsGet[1]['title']);
    }

    public function test_fetching_notifications_fails_without_api_token()
    {
        $response = $this->postJson('/api/notifications', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['api_token']);
    }

    public function test_fetching_notifications_fails_with_invalid_api_token()
    {
        $response = $this->postJson('/api/notifications', [
            'api_token' => 'nonexistent_token',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthorized',
            ]);
    }
}

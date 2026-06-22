<?php

namespace Tests\Feature;

use App\Filament\Pages\Notifications;
use App\Models\Client;
use App\Models\SentNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Kreait\Laravel\Firebase\Facades\Firebase;
use Kreait\Firebase\Contract\Messaging;
use Livewire\Livewire;
use Tests\TestCase;

class SentNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_notification_sent_to_client_is_saved_in_database()
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->actingAs($user);

        $messagingMock = $this->createMock(Messaging::class);
        $messagingMock->expects($this->once())
            ->method('send')
            ->willReturn([]);
        
        Firebase::shouldReceive('messaging')
            ->once()
            ->andReturn($messagingMock);

        $client = Client::create([
            'full_name' => 'John Doe',
            'phone_number' => '+15551234567',
            'password' => 'secret123',
            'fcm_token' => 'mock_token',
        ]);

        Livewire::test(Notifications::class)
            ->fillForm([
                'title' => 'Test Title',
                'body' => 'Test Body',
                'client_id' => $client->id,
            ])
            ->call('send');

        $this->assertDatabaseHas('sent_notifications', [
            'title' => 'Test Title',
            'body' => 'Test Body',
            'client_id' => $client->id,
            'sent_to_all' => false,
        ]);
    }

    public function test_notification_sent_to_all_is_saved_in_database()
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->actingAs($user);

        $messagingMock = $this->createMock(Messaging::class);
        $messagingMock->expects($this->once())
            ->method('sendMulticast')
            ->willReturn(\Kreait\Firebase\Messaging\MulticastSendReport::withItems([]));
        
        Firebase::shouldReceive('messaging')
            ->once()
            ->andReturn($messagingMock);

        Client::create([
            'full_name' => 'John Doe',
            'phone_number' => '+15551234567',
            'password' => 'secret123',
            'fcm_token' => 'mock_token',
        ]);

        Livewire::test(Notifications::class)
            ->fillForm([
                'title' => 'Global Title',
                'body' => 'Global Body',
                'client_id' => null,
            ])
            ->call('send');

        $this->assertDatabaseHas('sent_notifications', [
            'title' => 'Global Title',
            'body' => 'Global Body',
            'client_id' => null,
            'sent_to_all' => true,
        ]);
    }

    public function test_send_notification_page_populates_from_query_params()
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->actingAs($user);

        $client = Client::create([
            'full_name' => 'John Doe',
            'phone_number' => '+15551234567',
            'password' => 'secret123',
            'fcm_token' => 'mock_token',
        ]);

        Livewire::withQueryParams([
            'title' => 'Duplicated Title',
            'body' => 'Duplicated Body',
            'client_id' => (string) $client->id,
        ])
        ->test(Notifications::class)
        ->assertSet('data.title', 'Duplicated Title')
        ->assertSet('data.body', 'Duplicated Body')
        ->assertSet('data.client_id', (string) $client->id);
    }

    public function test_sent_notification_can_be_deleted()
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->actingAs($user);

        $notification = SentNotification::create([
            'title' => 'Title to delete',
            'body' => 'Body to delete',
            'sent_to_all' => true,
        ]);

        Livewire::test(Notifications::class)
            ->callTableAction('delete', $notification);

        $this->assertModelMissing($notification);
    }

    public function test_sent_notification_can_be_resent()
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->actingAs($user);

        $messagingMock = $this->createMock(Messaging::class);
        $messagingMock->expects($this->once())
            ->method('sendMulticast')
            ->willReturn(\Kreait\Firebase\Messaging\MulticastSendReport::withItems([]));
        
        Firebase::shouldReceive('messaging')
            ->once()
            ->andReturn($messagingMock);

        Client::create([
            'full_name' => 'John Doe',
            'phone_number' => '+15551234567',
            'password' => 'secret123',
            'fcm_token' => 'mock_token',
        ]);

        $notification = SentNotification::create([
            'title' => 'Title to resend',
            'body' => 'Body to resend',
            'sent_to_all' => true,
        ]);

        Livewire::test(Notifications::class)
            ->callTableAction('resend', $notification);

        $this->assertDatabaseCount('sent_notifications', 2);
    }

    public function test_title_longer_than_65_characters_fails_validation()
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->actingAs($user);

        Livewire::test(Notifications::class)
            ->fillForm([
                'title' => str_repeat('a', 66),
                'body' => 'Test Body',
            ])
            ->call('send')
            ->assertHasErrors(['data.title' => 'max']);
    }
}

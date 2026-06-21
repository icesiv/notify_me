<?php

namespace App\Filament\Pages;

use App\Models\Client;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;
use Filament\Notifications\Notification as FilamentNotification;
use Filament\Pages\Page;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Kreait\Firebase\Messaging\AndroidConfig;
use Kreait\Laravel\Firebase\Facades\Firebase;

use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Concerns\InteractsWithForms;

class SendNotification extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-paper-airplane';
    protected string $view = 'filament.pages.send-notification';

    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'title' => request()->query('title'),
            'body' => request()->query('body'),
            'client_id' => request()->query('client_id'),
        ]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('title')
                    ->required()
                    ->maxLength(255),
                Textarea::make('body')
                    ->required()
                    ->maxLength(1000),
                Select::make('client_id')
                    ->label('Target Client (Leave empty for all)')
                    ->options(Client::all()->pluck('full_name', 'id'))
                    ->searchable()
                    ->nullable(),
            ])
            ->statePath('data');
    }

    public function send(): void
    {
        $data = $this->form->getState();

        try {
            $messaging = Firebase::messaging();

            $notification = Notification::create($data['title'], $data['body']);
            $androidConfig = AndroidConfig::fromArray([
                'priority' => 'high',
            ]);

            if (!empty($data['client_id'])) {
                $client = Client::find($data['client_id']);
                if ($client && $client->fcm_token) {
                    $message = CloudMessage::new()
                        ->withToken($client->fcm_token)
                        ->withNotification($notification)
                        ->withAndroidConfig($androidConfig);
                    $messaging->send($message);

                    \App\Models\SentNotification::create([
                        'title' => $data['title'],
                        'body' => $data['body'],
                        'client_id' => $client->id,
                        'sent_to_all' => false,
                    ]);

                    FilamentNotification::make()
                        ->title('Notification sent to client successfully')
                        ->success()
                        ->send();
                } else {
                    FilamentNotification::make()
                        ->title('Client does not have an FCM token')
                        ->danger()
                        ->send();
                }
            } else {
                // Send to all clients with tokens
                $clients = Client::whereNotNull('fcm_token')->get();
                $tokens = $clients->pluck('fcm_token')->toArray();
                
                if (count($tokens) > 0) {
                    $message = CloudMessage::new()
                        ->withNotification($notification)
                        ->withAndroidConfig($androidConfig);
                    $messaging->sendMulticast($message, $tokens);

                    \App\Models\SentNotification::create([
                        'title' => $data['title'],
                        'body' => $data['body'],
                        'client_id' => null,
                        'sent_to_all' => true,
                    ]);

                    FilamentNotification::make()
                        ->title('Notification sent to all clients')
                        ->success()
                        ->send();
                } else {
                    FilamentNotification::make()
                        ->title('No clients with FCM tokens found')
                        ->warning()
                        ->send();
                }
            }

            $this->form->fill(); // Reset form
        } catch (\Exception $e) {
            Log::error('FCM Error: ' . $e->getMessage());
            FilamentNotification::make()
                ->title('Error sending notification')
                ->body($e->getMessage())
                ->danger()
                ->send();
        }
    }
}

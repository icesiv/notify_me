<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SentNotificationResource\Pages;
use App\Models\SentNotification;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class SentNotificationResource extends Resource
{
    protected static ?string $model = SentNotification::class;

    protected static ?string $navigationLabel = 'Sent Notifications';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-clock';

    protected static ?int $navigationSort = 3;

    public static function form(Schema $schema): Schema
    {
        return $schema;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('body')
                    ->limit(50)
                    ->searchable(),
                Tables\Columns\TextColumn::make('recipient')
                    ->label('Recipient')
                    ->getStateUsing(fn (SentNotification $record): string => $record->sent_to_all ? 'All Clients' : ($record->client?->full_name ?? 'Unknown / Deleted Client')),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Sent At')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                //
            ])
            ->actions([
                Actions\DeleteAction::make(),
                Actions\Action::make('resend')
                    ->label('Resend')
                    ->icon('heroicon-o-paper-airplane')
                    ->color('success')
                    ->requiresConfirmation()
                    ->action(function (SentNotification $record) {
                        try {
                            $messaging = \Kreait\Laravel\Firebase\Facades\Firebase::messaging();
                            $notification = \Kreait\Firebase\Messaging\Notification::create($record->title, $record->body);
                            $androidConfig = \Kreait\Firebase\Messaging\AndroidConfig::fromArray([
                                'priority' => 'high',
                            ]);

                            if ($record->sent_to_all) {
                                $clients = \App\Models\Client::whereNotNull('fcm_token')->get();
                                $tokens = $clients->pluck('fcm_token')->toArray();

                                if (count($tokens) > 0) {
                                    $message = \Kreait\Firebase\Messaging\CloudMessage::new()
                                        ->withNotification($notification)
                                        ->withAndroidConfig($androidConfig);
                                    $messaging->sendMulticast($message, $tokens);
                                    
                                    SentNotification::create([
                                        'title' => $record->title,
                                        'body' => $record->body,
                                        'client_id' => null,
                                        'sent_to_all' => true,
                                    ]);

                                    \Filament\Notifications\Notification::make()
                                        ->title('Notification resent to all clients')
                                        ->success()
                                        ->send();
                                } else {
                                    \Filament\Notifications\Notification::make()
                                        ->title('No clients with FCM tokens found')
                                        ->warning()
                                        ->send();
                                }
                            } else {
                                $client = $record->client;
                                if ($client && $client->fcm_token) {
                                    $message = \Kreait\Firebase\Messaging\CloudMessage::new()
                                        ->withToken($client->fcm_token)
                                        ->withNotification($notification)
                                        ->withAndroidConfig($androidConfig);
                                    $messaging->send($message);

                                    SentNotification::create([
                                        'title' => $record->title,
                                        'body' => $record->body,
                                        'client_id' => $client->id,
                                        'sent_to_all' => false,
                                    ]);

                                    \Filament\Notifications\Notification::make()
                                        ->title('Notification resent to client successfully')
                                        ->success()
                                        ->send();
                                } else {
                                    \Filament\Notifications\Notification::make()
                                        ->title($client ? 'Client does not have an FCM token' : 'Client no longer exists')
                                        ->danger()
                                        ->send();
                                }
                            }
                        } catch (\Exception $e) {
                            \Illuminate\Support\Facades\Log::error('FCM Resend Error: ' . $e->getMessage());
                            \Filament\Notifications\Notification::make()
                                ->title('Error resending notification')
                                ->body($e->getMessage())
                                ->danger()
                                ->send();
                        }
                    }),
                Actions\Action::make('duplicate')
                    ->label('Duplicate')
                    ->icon('heroicon-o-document-duplicate')
                    ->color('info')
                    ->url(fn (SentNotification $record): string => \App\Filament\Pages\SendNotification::getUrl([
                        'title' => $record->title,
                        'body' => $record->body,
                        'client_id' => $record->sent_to_all ? null : $record->client_id,
                    ])),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSentNotifications::route('/'),
        ];
    }
}

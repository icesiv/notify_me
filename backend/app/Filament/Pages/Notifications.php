<?php

namespace App\Filament\Pages;

use App\Models\Client;
use App\Models\SentNotification;
use App\Models\Group;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;
use Filament\Notifications\Notification as FilamentNotification;
use Filament\Pages\Page;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FirebaseNotification;
use Kreait\Firebase\Messaging\AndroidConfig;
use Kreait\Laravel\Firebase\Facades\Firebase;

use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Table;
use Filament\Tables;
use Filament\Actions;

class Notifications extends Page implements HasForms, HasTable
{
    use InteractsWithForms;
    use InteractsWithTable;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-bell';
    protected static ?string $navigationLabel = 'Notifications';
    protected static ?string $title = 'Notifications';
    protected static ?int $navigationSort = 3;

    protected string $view = 'filament.pages.notifications';

    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'title' => request()->query('title'),
            'body' => request()->query('body'),
            'client_id' => request()->query('client_id'),
            'group_ids' => request()->query('group_ids') ? json_decode(request()->query('group_ids'), true) : [],
            'type' => request()->query('type', 'general'),
            'reminder_date' => request()->query('reminder_date'),
            'reminder_time' => request()->query('reminder_time'),
            'timer_duration' => request()->query('timer_duration'),
            'task_priority' => request()->query('task_priority', 'low'),
            'task_due_date' => request()->query('task_due_date'),
        ]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('type')
                    ->options([
                        'general' => 'General (Standard Notification)',
                        'reminder' => 'Reminder (Data Message)',
                        'timer' => 'Timer (Data Message)',
                        'tasks' => 'Task (Data Message)',
                    ])
                    ->required()
                    ->default('general')
                    ->live(),

                TextInput::make('title')
                    ->required()
                    ->maxLength(65)
                    ->live()
                    ->helperText(function ($state) {
                        $length = mb_strlen($state ?? '');
                        if ($length >= 65) {
                            $color = '#ef4444'; // Red
                        } elseif ($length >= 30) {
                            $color = '#f97316'; // Orange
                        } else {
                            $color = '#22c55e'; // Green
                        }
                        return new \Illuminate\Support\HtmlString(
                            "<span style=\"color: {$color}; font-weight: 600;\">{$length} / 65 characters</span>"
                        );
                    }),

                Textarea::make('body')
                    ->required()
                    ->maxLength(240)
                    ->live()
                    ->helperText(function ($state) {
                        $length = mb_strlen($state ?? '');
                        if ($length >= 240) {
                            $color = '#ef4444'; // Red
                        } elseif ($length >= 80) {
                            $color = '#f97316'; // Orange
                        } else {
                            $color = '#22c55e'; // Green
                        }
                        return new \Illuminate\Support\HtmlString(
                            "<span style=\"color: {$color}; font-weight: 600;\">{$length} / 240 characters</span>"
                        );
                    }),

                // Reminder-specific inputs
                TextInput::make('reminder_date')
                    ->label('Reminder Date (YYYY-MM-DD)')
                    ->placeholder('e.g. ' . date('Y-m-d'))
                    ->required()
                    ->visible(fn ($get) => $get('type') === 'reminder'),

                TextInput::make('reminder_time')
                    ->label('Reminder Time (HH:MM)')
                    ->placeholder('e.g. 14:30')
                    ->required()
                    ->visible(fn ($get) => $get('type') === 'reminder'),

                // Timer-specific inputs
                TextInput::make('timer_duration')
                    ->label('Timer Duration (in seconds)')
                    ->integer()
                    ->placeholder('e.g. 300 for 5 minutes')
                    ->required()
                    ->visible(fn ($get) => $get('type') === 'timer'),

                // Task-specific inputs
                Select::make('task_priority')
                    ->label('Task Priority')
                    ->options([
                        'low' => 'Low',
                        'medium' => 'Medium',
                        'high' => 'High',
                    ])
                    ->default('low')
                    ->required()
                    ->visible(fn ($get) => $get('type') === 'tasks'),

                TextInput::make('task_due_date')
                    ->label('Task Due Date (Optional)')
                    ->placeholder('e.g. Tomorrow, or June 24')
                    ->visible(fn ($get) => $get('type') === 'tasks'),

                Select::make('client_id')
                    ->label('Target Client (Leave empty for all or target groups)')
                    ->options(Client::all()->pluck('full_name', 'id'))
                    ->searchable()
                    ->nullable(),

                Select::make('group_ids')
                    ->label('Target Groups (Leave empty for all or target client)')
                    ->multiple()
                    ->options(Group::all()->pluck('name', 'id'))
                    ->searchable(),
            ])
            ->statePath('data');
    }

    public function send(): void
    {
        $data = $this->form->getState();

        try {
            $messaging = Firebase::messaging();

            // Prepare payload
            $messagePayload = [
                'type' => $data['type'],
                'title' => $data['title'],
                'body' => $data['body'],
            ];

            $payloadDb = [];

            if ($data['type'] === 'reminder') {
                $messagePayload['date'] = $data['reminder_date'];
                $messagePayload['time'] = $data['reminder_time'];
                $payloadDb = [
                    'date' => $data['reminder_date'],
                    'time' => $data['reminder_time'],
                ];
            } elseif ($data['type'] === 'timer') {
                $messagePayload['duration'] = $data['timer_duration'];
                $payloadDb = [
                    'duration' => $data['timer_duration'],
                ];
            } elseif ($data['type'] === 'tasks') {
                $messagePayload['priority'] = $data['task_priority'];
                $messagePayload['dueDate'] = $data['task_due_date'] ?? '';
                $payloadDb = [
                    'priority' => $data['task_priority'],
                    'dueDate' => $data['task_due_date'] ?? '',
                ];
            }

            // Helper to build the CloudMessage
            $buildMessage = function ($targetToken = null) use ($data, $messagePayload) {
                $message = CloudMessage::new();
                if ($targetToken) {
                    $message = $message->withToken($targetToken);
                }

                $androidConfig = AndroidConfig::fromArray([
                    'priority' => 'high',
                ]);
                $message = $message->withAndroidConfig($androidConfig);

                if ($data['type'] === 'general') {
                    // Standard notification message
                    $notification = FirebaseNotification::create($data['title'], $data['body']);
                    $message = $message->withNotification($notification)
                        ->withData(['type' => 'general', 'title' => $data['title'], 'body' => $data['body']]);
                } else {
                    // Data-only message
                    // FCM data values must be strings
                    $stringPayload = [];
                    foreach ($messagePayload as $key => $val) {
                        $stringPayload[$key] = (string)$val;
                    }
                    $message = $message->withData($stringPayload);
                }

                return $message;
            };

            if (!empty($data['client_id'])) {
                $client = Client::find($data['client_id']);
                if ($client && $client->fcm_token) {
                    $message = $buildMessage($client->fcm_token);
                    $messaging->send($message);

                    SentNotification::create([
                        'title' => $data['title'],
                        'body' => $data['body'],
                        'client_id' => $client->id,
                        'sent_to_all' => false,
                        'target_group_ids' => null,
                        'type' => $data['type'],
                        'payload' => $payloadDb,
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
            } elseif (!empty($data['group_ids'])) {
                $clients = Client::whereHas('groups', function ($query) use ($data) {
                    $query->whereIn('groups.id', $data['group_ids']);
                })->whereNotNull('fcm_token')->get();
                $tokens = $clients->pluck('fcm_token')->unique()->toArray();

                if (count($tokens) > 0) {
                    $message = $buildMessage();
                    $messaging->sendMulticast($message, array_values($tokens));

                    SentNotification::create([
                        'title' => $data['title'],
                        'body' => $data['body'],
                        'client_id' => null,
                        'sent_to_all' => false,
                        'target_group_ids' => $data['group_ids'],
                        'type' => $data['type'],
                        'payload' => $payloadDb,
                    ]);

                    FilamentNotification::make()
                        ->title('Notification sent to target groups')
                        ->success()
                        ->send();
                } else {
                    FilamentNotification::make()
                        ->title('No clients with FCM tokens found in selected groups')
                        ->warning()
                        ->send();
                }
            } else {
                // Send to all clients with tokens
                $clients = Client::whereNotNull('fcm_token')->get();
                $tokens = $clients->pluck('fcm_token')->toArray();
                
                if (count($tokens) > 0) {
                    $message = $buildMessage();
                    $messaging->sendMulticast($message, $tokens);

                    SentNotification::create([
                        'title' => $data['title'],
                        'body' => $data['body'],
                        'client_id' => null,
                        'sent_to_all' => true,
                        'target_group_ids' => null,
                        'type' => $data['type'],
                        'payload' => $payloadDb,
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

    public function table(Table $table): Table
    {
        return $table
            ->query(SentNotification::query())
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'reminder' => 'warning',
                        'timer' => 'info',
                        'tasks' => 'success',
                        default => 'gray',
                    })
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('body')
                    ->limit(50)
                    ->searchable(),
                Tables\Columns\TextColumn::make('recipient')
                    ->label('Recipient')
                    ->getStateUsing(function (SentNotification $record): string {
                        if ($record->sent_to_all) {
                            return 'All Clients';
                        }
                        if (!empty($record->target_group_ids)) {
                            $groups = Group::whereIn('id', $record->target_group_ids)->pluck('name')->toArray();
                            return 'Groups: ' . implode(', ', $groups);
                        }
                        return $record->client?->full_name ?? 'Unknown / Deleted Client';
                    }),
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
                            $messaging = Firebase::messaging();
                            
                            $buildResendMessage = function ($targetToken = null) use ($record) {
                                $message = CloudMessage::new();
                                if ($targetToken) {
                                    $message = $message->withToken($targetToken);
                                }
                                $androidConfig = AndroidConfig::fromArray([
                                    'priority' => 'high',
                                ]);
                                $message = $message->withAndroidConfig($androidConfig);

                                $type = $record->type ?? 'general';
                                if ($type === 'general') {
                                    $notification = FirebaseNotification::create($record->title, $record->body);
                                    $message = $message->withNotification($notification)
                                        ->withData(['type' => 'general', 'title' => $record->title, 'body' => $record->body]);
                                } else {
                                    $payload = $record->payload ?? [];
                                    $messagePayload = array_merge([
                                        'type' => $type,
                                        'title' => $record->title,
                                        'body' => $record->body,
                                    ], $payload);
                                    
                                    // Make sure all values are strings as FCM data fields require string values
                                    $stringPayload = [];
                                    foreach ($messagePayload as $key => $value) {
                                        $stringPayload[$key] = (string)$value;
                                    }
                                    $message = $message->withData($stringPayload);
                                }
                                return $message;
                            };

                            if ($record->sent_to_all) {
                                $clients = Client::whereNotNull('fcm_token')->get();
                                $tokens = $clients->pluck('fcm_token')->toArray();

                                if (count($tokens) > 0) {
                                    $message = $buildResendMessage();
                                    $messaging->sendMulticast($message, $tokens);
                                    
                                    SentNotification::create([
                                        'title' => $record->title,
                                        'body' => $record->body,
                                        'client_id' => null,
                                        'sent_to_all' => true,
                                        'target_group_ids' => null,
                                        'type' => $record->type ?? 'general',
                                        'payload' => $record->payload,
                                    ]);

                                    FilamentNotification::make()
                                        ->title('Notification resent to all clients')
                                        ->success()
                                        ->send();
                                } else {
                                    FilamentNotification::make()
                                        ->title('No clients with FCM tokens found')
                                        ->warning()
                                        ->send();
                                }
                            } elseif (!empty($record->target_group_ids)) {
                                $clients = Client::whereHas('groups', function ($query) use ($record) {
                                    $query->whereIn('groups.id', $record->target_group_ids);
                                })->whereNotNull('fcm_token')->get();
                                $tokens = $clients->pluck('fcm_token')->unique()->toArray();

                                if (count($tokens) > 0) {
                                    $message = $buildResendMessage();
                                    $messaging->sendMulticast($message, array_values($tokens));
                                    
                                    SentNotification::create([
                                        'title' => $record->title,
                                        'body' => $record->body,
                                        'client_id' => null,
                                        'sent_to_all' => false,
                                        'target_group_ids' => $record->target_group_ids,
                                        'type' => $record->type ?? 'general',
                                        'payload' => $record->payload,
                                    ]);

                                    FilamentNotification::make()
                                        ->title('Notification resent to target groups')
                                        ->success()
                                        ->send();
                                } else {
                                    FilamentNotification::make()
                                        ->title('No clients with FCM tokens found in selected groups')
                                        ->warning()
                                        ->send();
                                }
                            } else {
                                $client = $record->client;
                                if ($client && $client->fcm_token) {
                                    $message = $buildResendMessage($client->fcm_token);
                                    $messaging->send($message);

                                    SentNotification::create([
                                        'title' => $record->title,
                                        'body' => $record->body,
                                        'client_id' => $client->id,
                                        'sent_to_all' => false,
                                        'target_group_ids' => null,
                                        'type' => $record->type ?? 'general',
                                        'payload' => $record->payload,
                                    ]);

                                    FilamentNotification::make()
                                        ->title('Notification resent to client successfully')
                                        ->success()
                                        ->send();
                                } else {
                                    FilamentNotification::make()
                                        ->title($client ? 'Client does not have an FCM token' : 'Client no longer exists')
                                        ->danger()
                                        ->send();
                                }
                            }
                        } catch (\Exception $e) {
                            Log::error('FCM Resend Error: ' . $e->getMessage());
                            FilamentNotification::make()
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
                    ->url(fn (SentNotification $record): string => static::getUrl([
                        'title' => $record->title,
                        'body' => $record->body,
                        'client_id' => $record->sent_to_all || !empty($record->target_group_ids) ? null : $record->client_id,
                        'group_ids' => !empty($record->target_group_ids) ? json_encode($record->target_group_ids) : null,
                        'type' => $record->type ?? 'general',
                        'reminder_date' => $record->payload['date'] ?? null,
                        'reminder_time' => $record->payload['time'] ?? null,
                        'timer_duration' => $record->payload['duration'] ?? null,
                        'task_priority' => $record->payload['priority'] ?? null,
                        'task_due_date' => $record->payload['dueDate'] ?? null,
                    ])),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }
}

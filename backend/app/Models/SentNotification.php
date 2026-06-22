<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SentNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'body',
        'client_id',
        'sent_to_all',
        'target_group_ids',
        'type',
        'payload',
    ];

    protected $casts = [
        'sent_to_all' => 'boolean',
        'target_group_ids' => 'array',
        'payload' => 'array',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}

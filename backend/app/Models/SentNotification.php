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
    ];

    protected $casts = [
        'sent_to_all' => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}

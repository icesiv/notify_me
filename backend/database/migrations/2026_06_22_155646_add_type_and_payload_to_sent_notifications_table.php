<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sent_notifications', function (Blueprint $table) {
            $table->string('type')->default('general')->after('body');
            $table->json('payload')->nullable()->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sent_notifications', function (Blueprint $table) {
            $table->dropColumn(['type', 'payload']);
        });
    }
};

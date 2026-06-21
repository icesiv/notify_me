<?php

namespace Tests\Feature;

use App\Filament\Widgets\StatsOverview;
use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatsOverviewWidgetTest extends TestCase
{
    use RefreshDatabase;

    public function test_stats_widget_displays_correct_counts()
    {
        // Initially, counts should be zero
        $widget = new StatsOverview();
        
        // Use reflection to access protected getStats method
        $reflection = new \ReflectionClass($widget);
        $method = $reflection->getMethod('getStats');
        $method->setAccessible(true);
        
        $stats = $method->invoke($widget);
        
        $this->assertCount(2, $stats);
        
        // Total Clients Stat
        $this->assertEquals('Total Clients', $stats[0]->getLabel());
        $this->assertEquals(0, $stats[0]->getValue());

        // Total Users Stat
        $this->assertEquals('Total Users', $stats[1]->getLabel());
        $this->assertEquals(0, $stats[1]->getValue());

        // Create 3 clients and 2 users
        Client::create([
            'full_name' => 'Client A',
            'phone_number' => '+15550000001',
            'password' => 'secret123',
        ]);
        Client::create([
            'full_name' => 'Client B',
            'phone_number' => '+15550000002',
            'password' => 'secret123',
        ]);
        Client::create([
            'full_name' => 'Client C',
            'phone_number' => '+15550000003',
            'password' => 'secret123',
        ]);
        User::factory()->count(2)->create();

        // Refresh stats
        $stats = $method->invoke($widget);
        
        $this->assertEquals(3, $stats[0]->getValue());
        $this->assertEquals(2, $stats[1]->getValue());
    }
}

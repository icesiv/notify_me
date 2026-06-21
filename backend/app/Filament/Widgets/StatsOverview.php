<?php

namespace App\Filament\Widgets;

use App\Models\Client;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Total Clients', Client::count())
                ->description('Registered mobile application clients')
                ->descriptionIcon('heroicon-m-users')
                ->color('success'),
            Stat::make('Total Users', User::count())
                ->description('Admin panel users')
                ->descriptionIcon('heroicon-m-user-group')
                ->color('primary'),
        ];
    }
}

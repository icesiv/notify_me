<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Group;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $groups = Group::all();

        Client::factory(10)->create()->each(function (Client $client) use ($groups) {
            if ($groups->isNotEmpty()) {
                // Attach 1 to 3 random groups to the client
                $randomGroups = $groups->random(rand(1, min(3, $groups->count())));
                $client->groups()->attach($randomGroups->pluck('id')->toArray());
            }
        });
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class GroupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $groups = [
            'HR', 'Admin', 'Accounts', 'Marketing', 'Sales', 
            'Team Lead', 'IT', 'Developer', 'Designers', 
            'Manager', 'QA', 'Support', 'Purchase'
        ];

        foreach ($groups as $group) {
            \App\Models\Group::firstOrCreate(['name' => $group]);
        }
    }
}

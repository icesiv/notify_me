<x-filament-panels::page>
    <div class="space-y-6">
        <x-filament::section>
            <x-slot name="heading">
                Send Notification
            </x-slot>

            <form wire:submit="send">
                {{ $this->form }}

                <div class="mt-6">
                    <x-filament::button type="submit">
                        Send Notification
                    </x-filament::button>
                </div>
            </form>
        </x-filament::section>

        <div class="space-y-2">
            {{ $this->table }}
        </div>
    </div>
</x-filament-panels::page>

<div
    x-data="{
        toggleTheme() {
            const current = window.Alpine.store('theme');
            const target = current === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', target);
            $dispatch('theme-changed', target);
        }
    }"
    class="flex items-center justify-center mr-2 theme-toggle-container"
>
    <button
        type="button"
        x-on:click="toggleTheme()"
        class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-transparent bg-white/5 text-gray-400 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 dark:bg-black/10 dark:text-gray-400 dark:hover:border-emerald-400/30 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300"
        x-tooltip="{
            content: $store.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
            theme: $store.theme,
        }"
    >
        <!-- Sun icon (shown in dark mode) -->
        <span x-show="$store.theme === 'dark'" x-cloak class="flex items-center justify-center transition-transform duration-500 hover:rotate-45">
            <x-filament::icon
                icon="heroicon-m-sun"
                class="h-6 w-6 text-amber-400"
            />
        </span>
        <!-- Moon icon (shown in light mode) -->
        <span x-show="$store.theme === 'light'" x-cloak class="flex items-center justify-center transition-transform duration-500 hover:-rotate-12">
            <x-filament::icon
                icon="heroicon-m-moon"
                class="h-6 w-6 text-indigo-500"
            />
        </span>
    </button>
</div>

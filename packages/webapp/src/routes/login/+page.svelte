<script lang="ts">
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<div class="flex min-h-screen flex-col items-center justify-center">
  <div class="w-full max-w-md">
    <h1 class="mb-8 text-center text-3xl font-bold text-gray-900">Sign in to Oselvar</h1>

    <div class="space-y-4">
      {#if !data.providers.github && !data.providers.linear}
        <p class="text-center text-gray-600">Sign-in isn't set up yet.</p>
      {/if}
      {#if data.providers.github}
        <a
          href="/login/github"
          class="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            />
          </svg>
          Continue with GitHub
        </a>
      {/if}

      {#if data.providers.linear}
        <a
          href="/login/linear"
          class="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg class="h-5 w-5 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" />
          </svg>
          Continue with Linear
        </a>
      {/if}
    </div>

    <p class="mt-8 text-center text-sm text-gray-500">
      By signing in, you agree to our Terms of Service and Privacy Policy.
    </p>
  </div>
</div>

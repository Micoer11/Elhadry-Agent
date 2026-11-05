import { Logo, Mark } from "@elhadry/ui/logo"
import "./wordmark.css"

export function NewSessionWordmark() {
  return (
    <div
      data-component="new-session-wordmark"
      aria-hidden="true"
      class="pointer-events-none mx-auto flex w-full max-w-[300px] items-center justify-center gap-3"
      dir="ltr"
    >
      <div data-slot="wordmark-app-icon" class="flex shrink-0 items-center justify-center">
        <Mark class="block size-7" />
      </div>
      <div data-slot="wordmark-reveal" class="relative min-w-0 flex-1 text-white">
        <Logo class="block aspect-[720/129] w-full" />
        <Logo class="wordmark-shimmer absolute inset-0 aspect-[720/129] w-full" />
      </div>
    </div>
  )
}


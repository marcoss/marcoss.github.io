export function Header() {
  return (
    <header>
      <div class="flex items-center gap-4 sm:gap-6 mb-4">
        <img
          src="/assets/images/profile.jpg"
          alt="Marcos Castaneda"
          class="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover flex-shrink-0 border-2 border-gray-200 dark:border-gray-800"
        />
        <div class="flex-1 min-w-0">
          <h1 class="text-3xl sm:text-4xl font-bold mb-2">Marcos Castaneda</h1>
          <p class="text-lg sm:text-xl text-gray-600 dark:text-gray-300">
            Senior Software Engineer
          </p>
        </div>
      </div>

      <p class="text-base sm:text-lg text-gray-500 dark:text-gray-300 mb-5 leading-relaxed">
        Experienced Google/AWS engineer building scalable web applications, secure backend APIs and
        distributed systems.
      </p>

      <div class="flex gap-4 text-base sm:text-lg">
        <a
          href="https://www.linkedin.com/in/mcasta"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-gray-900 dark:text-gray-100 hover:underline"
        >
          LinkedIn
        </a>
        <span class="text-gray-400">•</span>
        <a
          href="https://github.com/marcoss"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-gray-900 dark:text-gray-100 hover:underline"
        >
          GitHub
        </a>
        <span class="text-gray-400">•</span>
        <a
          href="mailto:hello@marcos.me"
          class="font-medium text-gray-900 dark:text-gray-100 hover:underline"
        >
          Email
        </a>
      </div>
    </header>
  );
}

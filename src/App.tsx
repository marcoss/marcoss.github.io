import { Header } from './components/Header';
import { ChatSection } from './components/ChatSection';

export function App() {
  return (
    <div class="min-h-dvh overflow-x-hidden bg-neutral-50 px-4 py-5 text-gray-900 dark:bg-neutral-900 dark:text-gray-100 sm:p-12">
      <div class="mx-auto max-w-2xl space-y-6 fade-in sm:space-y-8">
        <Header />
        <hr class="border-gray-300 dark:border-gray-700" />
        <ChatSection />
      </div>
    </div>
  );
}

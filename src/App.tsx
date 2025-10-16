import { Header } from './components/Header';
import { ChatSection } from './components/ChatSection';

export function App() {
  return (
    <div class="bg-neutral-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100 p-6 sm:p-12 md:p-12 min-h-screen">
      <div class="max-w-2xl mx-auto space-y-8 fade-in">
        <Header />
        <hr class="border-gray-300 dark:border-gray-700" />
        <ChatSection />
      </div>
    </div>
  );
}

import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)]">
        <ChatInterface />
      </div>
    </main>
  );
}

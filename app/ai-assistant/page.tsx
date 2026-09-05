import { redirect } from 'next/navigation';

// The AI assistant is now a floating chat popup available on every page.
// Anyone visiting this URL directly is sent to the dashboard.
export default function AiAssistantPage() {
  redirect('/dashboard');
}

import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen.tsx';
import { LearnedScreen } from './components/LearnedScreen.tsx';
import { StudyScreen } from './components/StudyScreen.tsx';

type Screen = { name: 'home' } | { name: 'study'; topicSlug: string } | { name: 'learned' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  if (screen.name === 'study') {
    return (
      <StudyScreen
        topicSlug={screen.topicSlug}
        onExit={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'learned') {
    return <LearnedScreen onBack={() => setScreen({ name: 'home' })} />;
  }

  return (
    <HomeScreen
      onSelectTopic={(slug) => setScreen({ name: 'study', topicSlug: slug })}
      onViewLearned={() => setScreen({ name: 'learned' })}
    />
  );
}

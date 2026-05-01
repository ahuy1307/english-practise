import { HomeScreen } from './components/HomeScreen.tsx';
import { LearnedScreen } from './components/LearnedScreen.tsx';
import { StudyScreen } from './components/StudyScreen.tsx';
import { navigate, useRoute } from './lib/router.ts';

export default function App() {
  const route = useRoute();

  if (route.name === 'study') {
    return (
      <StudyScreen
        topicSlug={route.topicSlug}
        onExit={() => navigate('')}
      />
    );
  }

  if (route.name === 'learned') {
    return <LearnedScreen onBack={() => navigate('')} />;
  }

  return (
    <HomeScreen
      onSelectTopic={(slug) => navigate(`topic/${slug}`)}
      onStartPractice={() => navigate('practice')}
      onViewLearned={() => navigate('learned')}
    />
  );
}

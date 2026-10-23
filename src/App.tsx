import { MotionConfig } from 'motion/react';
import { useErabit, type Screen } from './game';
import { ChoiceScreen } from './screens/ChoiceScreen';
import { LearningScreen } from './screens/LearningScreen';
import { ListScreen } from './screens/ListScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SituationScreen } from './screens/SituationScreen';
import { TitleScreen } from './screens/TitleScreen';

export function App() {
  const screen = useErabit();
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-mint/45 sm:px-6 sm:py-10">
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-5 pb-8 pt-3 sm:min-h-[calc(100dvh-5rem)] sm:rounded-card sm:px-8 sm:shadow-[0_12px_40px_rgb(39_63_90/0.12)]">
          <ScreenView key={screen.key} screen={screen} />
        </main>
      </div>
    </MotionConfig>
  );
}

function ScreenView({ screen }: { screen: Screen }) {
  switch (screen.kind) {
    case 'title':
      return <TitleScreen screen={screen} />;
    case 'list':
      return <ListScreen screen={screen} />;
    case 'situation':
      return <SituationScreen screen={screen} />;
    case 'choice':
      return <ChoiceScreen screen={screen} />;
    case 'result':
      return <ResultScreen screen={screen} />;
    case 'learning':
      return <LearningScreen screen={screen} />;
    default:
      return assertNever(screen);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled screen ${JSON.stringify(value)}`);
}

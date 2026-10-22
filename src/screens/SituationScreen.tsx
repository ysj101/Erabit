import type { ScreenOf } from '../game';
import { Button } from '../ui/Button';
import { COPY } from '../ui/copy';
import { Frame } from '../ui/Frame';
import { Scenario } from '../ui/Scenario';

export function SituationScreen({ screen }: { screen: ScreenOf<'situation'> }) {
  const { mission } = screen;
  return (
    <Frame eyebrow={mission.id} heading={mission.title} ella={screen.ella} onExit={screen.toList}>
      <Scenario text={mission.scenario} />
      <div className="mt-auto">
        <Button onClick={screen.next}>{COPY.next}</Button>
      </div>
    </Frame>
  );
}

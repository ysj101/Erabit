import { useState } from 'react';
import type { ScreenOf } from '../game';
import { Button } from '../ui/Button';
import { COPY } from '../ui/copy';
import { Frame } from '../ui/Frame';
import { CheckIcon } from '../ui/icons';
import { Scenario } from '../ui/Scenario';

type Choice = ScreenOf<'choice'>['mission']['choices'][number];

export function ChoiceScreen({ screen }: { screen: ScreenOf<'choice'> }) {
  const [selected, setSelected] = useState<Choice['id'] | null>(null);
  const { mission } = screen;
  return (
    <Frame eyebrow={mission.id} heading={mission.title} ella={screen.ella} onExit={screen.toList}>
      <Scenario text={mission.scenario} compact />
      <form
        className="flex flex-1 flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (selected) screen.confirm(selected);
        }}
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-lg font-bold">{mission.prompt}</legend>
          {mission.choices.map((choice) => (
            <ChoiceOption
              key={choice.id}
              choice={choice}
              checked={selected === choice.id}
              onSelect={() => setSelected(choice.id)}
            />
          ))}
        </fieldset>
        <div className="mt-auto">
          <Button type="submit" disabled={selected === null}>
            {COPY.confirm}
          </Button>
        </div>
      </form>
    </Frame>
  );
}

/** Every option is styled identically until picked; picked adds a check mark and a heavier border. */
function ChoiceOption({ choice, checked, onSelect }: { choice: Choice; checked: boolean; onSelect: () => void }) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-button border-2 bg-white px-4 py-3 text-base font-bold transition-colors has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ink ${
        checked ? 'border-ink bg-mint/40' : 'border-ink/20 hover:border-ink/50'
      }`}
    >
      <input type="radio" name="choice" value={choice.id} checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden
        className={`grid size-7 shrink-0 place-items-center rounded-full border-2 ${checked ? 'border-ink bg-ink text-background' : 'border-ink/40'}`}
      >
        {checked && <CheckIcon className="size-4" />}
      </span>
      <span>{choice.label}</span>
    </label>
  );
}

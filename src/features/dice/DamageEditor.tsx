import { Plus, Trash2 } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { Button, IconButton, Select, TextInput } from '@/features/ui/primitives';
import {
  DAMAGE_TYPES,
  MAX_DAMAGE_COMPONENTS,
  type DamageComponent,
  type DamageType,
  type TargetDefenses,
} from './damage';
import { MAX_EXPRESSION_LENGTH, validateExpression } from './engine';
import { DamageBadge } from './DamageBadge';
import { DamageTarget } from './DamageTarget';

const PHYSICAL_DAMAGE_TYPES: DamageType[] = ['bludgeoning', 'slashing', 'piercing'];

export function DamageEditor({
  components,
  onChange,
  defenses,
  onDefenses,
}: {
  components: DamageComponent[];
  onChange: (components: DamageComponent[]) => void;
  defenses: TargetDefenses;
  onDefenses: (defenses: TargetDefenses) => void;
}) {
  const { locale, t } = useT();
  const damageTypes = [
    ...PHYSICAL_DAMAGE_TYPES,
    ...DAMAGE_TYPES.filter((type) => !PHYSICAL_DAMAGE_TYPES.includes(type)).sort(
      (left, right) =>
        t(`dice.damageTypes.${left}`).localeCompare(
          t(`dice.damageTypes.${right}`),
          locale,
        ),
    ),
  ];
  const update = (id: string, patch: Partial<DamageComponent>) =>
    onChange(
      components.map((component) =>
        component.id === id ? { ...component, ...patch } : component,
      ),
    );
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-ink-300">{t('dice.damageHelp')}</p>
      {components.map((component, index) => {
        const error = component.expression
          ? validateExpression(component.expression).error
          : null;
        const prefix = `component-${component.id}`;
        return (
          <fieldset
            key={component.id}
            className="damage-panel min-w-0 p-4"
            data-damage={component.type}
          >
            <legend className="px-1 text-sm font-semibold text-ink-200">
              {t('dice.componentNumber', { number: index + 1 })}
            </legend>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <DamageBadge type={component.type} />
              <IconButton
                label={t('dice.removeComponent', { number: index + 1 })}
                variant="ghost"
                size="sm"
                disabled={components.length === 1}
                onClick={() =>
                  onChange(components.filter((entry) => entry.id !== component.id))
                }
              >
                <Trash2 size={16} aria-hidden="true" />
              </IconButton>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="field-label">{t('dice.componentName')}</span>
                <TextInput
                  value={component.name}
                  maxLength={120}
                  onChange={(event) => update(component.id, { name: event.target.value })}
                  placeholder={t('dice.componentNamePlaceholder')}
                />
              </label>
              <label className="grid gap-1">
                <span className="field-label">{t('dice.damageType')}</span>
                <Select
                  value={component.type}
                  onChange={(event) =>
                    update(component.id, { type: event.target.value as DamageType })
                  }
                >
                  {damageTypes.map((type) => (
                    <option value={type} key={type}>
                      {t(`dice.damageTypes.${type}`)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="field-label">{t('dice.componentExpression')}</span>
                <TextInput
                  value={component.expression}
                  maxLength={MAX_EXPRESSION_LENGTH}
                  onChange={(event) =>
                    update(component.id, { expression: event.target.value })
                  }
                  placeholder={t('dice.savedRollExpressionPlaceholder')}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${prefix}-error` : undefined}
                />
              </label>
            </div>
            {error && (
              <p id={`${prefix}-error`} className="mt-2 text-sm text-red-300">
                {t(`dice.errors.${error}`)}
              </p>
            )}
          </fieldset>
        );
      })}
      <Button
        disabled={components.length >= MAX_DAMAGE_COMPONENTS}
        onClick={() =>
          onChange([
            ...components,
            { id: crypto.randomUUID(), name: '', expression: '', type: 'radiant' },
          ])
        }
      >
        <Plus size={16} aria-hidden="true" />
        {t('dice.addComponent')}
      </Button>
      <DamageTarget
        types={[...new Set(components.map((component) => component.type))]}
        defenses={defenses}
        onDefenses={onDefenses}
      />
    </div>
  );
}

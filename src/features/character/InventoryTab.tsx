import { ExternalLink } from 'lucide-react';
import type { ItemEntry } from '@/data/compendium/types';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { CURRENCY_KEYS, LIMITS, parseArmorType, uid, type InventoryItem } from './model';
import { NumberField, TextField } from './fields';
import { CompendiumPicker } from './CompendiumPicker';
import type { SectionProps } from './sections';
import { AddButton, RemoveButton, RemovedNotice } from './rows';
import { focusNewRow, useRowRemoval } from './rowRemoval';

export function InventoryTab({ character, update }: SectionProps) {
  const { t } = useT();
  const removal = useRowRemoval(character, 'inventory', update);
  const add = () => {
    const id = uid();
    update({
      inventory: [...character.inventory, { id, name: '', quantity: 1, notes: '' }],
    });
    focusNewRow(id);
  };
  const patch = (id: string, patchObj: Partial<InventoryItem>) =>
    update({
      inventory: character.inventory.map((i) =>
        i.id === id ? { ...i, ...patchObj } : i,
      ),
    });
  const addFromCompendium = (entry: ItemEntry) => {
    const armorType = parseArmorType(entry.type);
    const baseAc = Number.parseInt(entry.ac, 10);
    update({
      inventory: [
        ...character.inventory,
        {
          id: uid(),
          name: entry.name,
          quantity: 1,
          notes: [entry.type, entry.rarity].filter(Boolean).join(' - '),
          itemId: entry.id,
          ...(armorType ? { armorType, equipped: true } : {}),
          ...(Number.isFinite(baseAc) ? { baseAc } : {}),
        },
      ],
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-ink-200">
          {t('character.sheet.inventoryTab.currency')}
        </legend>
        <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-5">
          {CURRENCY_KEYS.map((key) => (
            <NumberField
              key={key}
              label={t(`character.sheet.inventoryTab.coins.${key}`)}
              value={character.currency[key]}
              min={LIMITS.currency.min}
              max={LIMITS.currency.max}
              onChange={(value) =>
                update({ currency: { ...character.currency, [key]: value } })
              }
            />
          ))}
        </div>
      </fieldset>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink-200">
          {t('character.sheet.inventoryTab.items', { count: character.inventory.length })}
        </h3>
        <CompendiumPicker
          categoryId="items"
          label={t('character.sheet.inventoryTab.addFromCompendium')}
          placeholder={t('character.sheet.inventoryTab.addFromCompendium')}
          describe={(item) => {
            const entry = item as ItemEntry;
            return [entry.type, entry.rarity].filter(Boolean).join(', ');
          }}
          onPick={(item) => addFromCompendium(item as ItemEntry)}
        />
        <RemovedNotice name={removal.removed?.name ?? null} onUndo={removal.undo} />
        {character.inventory.length === 0 && (
          <p className="empty-state">{t('character.sheet.inventoryTab.empty')}</p>
        )}
        {character.inventory.map((item) => {
          const name = item.name.trim() || t('character.sheet.rows.unnamed');
          return (
            <div
              key={item.id}
              data-row={item.id}
              className="flex items-start gap-2 rounded-lg border border-ink-700 p-3"
            >
              <NumberField
                label={t('character.sheet.inventoryTab.quantityOf', { name })}
                hideLabel
                value={item.quantity}
                min={LIMITS.quantity.min}
                max={LIMITS.quantity.max}
                className="w-16 shrink-0"
                inputClassName="text-center"
                onChange={(quantity) => patch(item.id, { quantity })}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <TextField
                  label={t('character.sheet.inventoryTab.nameLabel')}
                  hideLabel
                  value={item.name}
                  onChange={(value) => patch(item.id, { name: value })}
                  placeholder={t('character.sheet.inventoryTab.namePlaceholder')}
                />
                <TextField
                  label={t('character.sheet.inventoryTab.descLabel')}
                  hideLabel
                  value={item.notes}
                  onChange={(notes) => patch(item.id, { notes })}
                  placeholder={t('character.sheet.inventoryTab.descPlaceholder')}
                />
                <div className="flex flex-wrap items-center gap-3">
                  {item.armorType && (
                    <label className="flex items-center gap-2 text-sm text-ink-300">
                      <input
                        type="checkbox"
                        checked={item.equipped ?? false}
                        onChange={(e) => patch(item.id, { equipped: e.target.checked })}
                        className="accent-arcane-500"
                      />
                      {t('character.sheet.fields.equipped')}
                    </label>
                  )}
                  {item.itemId && (
                    <Link
                      to={`/compendium/items/${item.itemId}`}
                      className="back-link mb-0"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      {t('character.sheet.inventoryTab.openItem', { name })}
                    </Link>
                  )}
                </div>
              </div>
              <RemoveButton onClick={() => removal.remove(item)} name={item.name} />
            </div>
          );
        })}
        <AddButton label={t('character.sheet.inventoryTab.add')} onClick={add} />
      </section>
    </div>
  );
}

import { useId, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, IconButton, Select, TextInput } from '@/features/ui/primitives';
import { inputClass } from '@/features/ui/styles';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useT } from '@/i18n/useT';
import { useSessionStore, type CampaignContext, type Session } from './store';

export function CampaignContextsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useT();
  const titleId = useId();
  const ref = useDialogFocus(open, onClose);
  const contexts = useSessionStore((state) => state.contexts);
  const [selectedId, setSelectedId] = useState('');
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [removed, setRemoved] = useState<{
    context: CampaignContext;
    sessions: string[];
  } | null>(null);
  const context = contexts.find((item) => item.id === selectedId) ?? contexts[0];
  if (!open) return null;
  return (
    <div className="dialog-overlay z-50" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-panel flex max-h-[90dvh] w-full max-w-3xl flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ink-700 p-4">
          <div>
            <h2 id={titleId} className="section-title">
              {t('sessionLog.contextHeading')}
            </h2>
            <p className="mt-2 text-sm text-ink-400">{t('sessionLog.contextHelp')}</p>
          </div>
          <IconButton
            label={t('common.close')}
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="space-y-6 overflow-y-auto p-4">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (!newName.trim()) {
                setCreateError(true);
                return;
              }
              setSelectedId(useSessionStore.getState().addContext(newName));
              setNewName('');
              setCreateError(false);
              setNameError(false);
            }}
          >
            <label className="field-label" htmlFor="new-context-name">
              {t('sessionLog.contextNew')}
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <TextInput
                id="new-context-name"
                className="min-w-0 flex-1"
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value);
                  setCreateError(false);
                }}
                placeholder={t('sessionLog.contextNamePlaceholder')}
                aria-invalid={createError}
                aria-describedby={createError ? 'new-context-error' : undefined}
              />
              <Button type="submit" variant="secondary">
                <Plus size={16} aria-hidden="true" />
                {t('sessionLog.contextCreate')}
              </Button>
            </div>
            {createError && (
              <p
                id="new-context-error"
                role="alert"
                className="mt-2 text-sm text-red-300"
              >
                {t('sessionLog.contextNameRequired')}
              </p>
            )}
          </form>
          {context ? (
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="context-select">
                  {t('sessionLog.contextChoose')}
                </label>
                <Select
                  id="context-select"
                  className="mt-2 w-full"
                  value={context.id}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setNameError(false);
                  }}
                >
                  {contexts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || t('sessionLog.contextUntitled')}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="field-label" htmlFor="context-name">
                  {t('sessionLog.contextName')}
                </label>
                <TextInput
                  key={context.id}
                  id="context-name"
                  className="mt-2 w-full"
                  defaultValue={context.name}
                  onChange={() => setNameError(false)}
                  onBlur={(event) => {
                    const name = event.target.value.trim();
                    if (!name) {
                      setNameError(true);
                      return;
                    }
                    useSessionStore.getState().updateContext(context.id, { name });
                  }}
                  aria-invalid={nameError}
                  aria-describedby={nameError ? 'context-name-error' : undefined}
                />
                {nameError && (
                  <p
                    id="context-name-error"
                    role="alert"
                    className="mt-2 text-sm text-red-300"
                  >
                    {t('sessionLog.contextNameRequired')}
                  </p>
                )}
              </div>
              <div>
                <label className="field-label" htmlFor="context-text">
                  {t('sessionLog.contextText')}
                </label>
                <p id="context-shared-help" className="mt-1 text-sm text-ink-400">
                  {t('sessionLog.contextSharedLabel')}
                </p>
                <textarea
                  id="context-text"
                  className={inputClass('mt-2 w-full resize-y')}
                  rows={10}
                  value={context.text}
                  onChange={(event) =>
                    useSessionStore
                      .getState()
                      .updateContext(context.id, { text: event.target.value })
                  }
                  placeholder={t('sessionLog.contextPlaceholder')}
                  aria-describedby="context-shared-help"
                />
              </div>
              <Button
                variant="danger"
                onClick={async () => {
                  const sessions = useSessionStore
                    .getState()
                    .sessions.filter((session) =>
                      session.contextIds?.includes(context.id),
                    )
                    .map((session) => session.id);
                  if (
                    !(await confirmDialog(
                      t('sessionLog.contextDeleteConfirm', {
                        name: context.name,
                        count: sessions.length,
                      }),
                      {
                        tone: 'danger',
                        confirmLabel: t('common.delete'),
                        initialFocus: 'cancel',
                      },
                    ))
                  )
                    return;
                  setRemoved({ context, sessions });
                  useSessionStore.getState().deleteContext(context.id);
                  setSelectedId('');
                  setNameError(false);
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
                {t('sessionLog.contextDelete')}
              </Button>
            </div>
          ) : (
            <p className="empty-state">{t('sessionLog.contextEmpty')}</p>
          )}
          {removed && (
            <div
              role="status"
              className="notice flex flex-wrap items-center justify-between gap-2"
            >
              <span>{t('sessionLog.contextDeleted')}</span>
              <Button
                onClick={() => {
                  useSessionStore
                    .getState()
                    .restoreContext(removed.context, removed.sessions);
                  setSelectedId(removed.context.id);
                  setRemoved(null);
                }}
              >
                {t('sessionLog.undo')}
              </Button>
            </div>
          )}
        </div>
        <footer className="flex shrink-0 justify-end border-t border-ink-700 p-4">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </footer>
      </section>
    </div>
  );
}

export function SessionContextPanel({
  session,
  onManage,
}: {
  session: Session;
  onManage: () => void;
}) {
  const { t } = useT();
  const contexts = useSessionStore((state) => state.contexts);
  const selected = contexts.filter((context) => session.contextIds?.includes(context.id));
  const [targetId, setTargetId] = useState('');
  const [fact, setFact] = useState('');
  const [added, setAdded] = useState<{
    id: string;
    before: string;
    after: string;
  } | null>(null);
  const target = selected.find((context) => context.id === targetId) ?? selected[0];
  const canUndo =
    added &&
    contexts.some((context) => context.id === added.id && context.text === added.after);
  return (
    <details className="rounded-xl border border-ink-700 bg-ink-900 p-4">
      <summary className="cursor-pointer font-semibold text-ink-100">
        {t('sessionLog.contextHeading')}{' '}
        <span className="ml-2 text-sm font-normal text-ink-400">
          {t('sessionLog.contextSelected', { count: selected.length })}
        </span>
      </summary>
      <p className="mt-3 text-sm text-ink-400">{t('sessionLog.contextHelp')}</p>
      <div className="mt-3 space-y-2">
        {contexts.map((context) => (
          <label
            key={context.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-ink-800"
          >
            <input
              type="checkbox"
              checked={Boolean(session.contextIds?.includes(context.id))}
              aria-label={t('sessionLog.contextSelect', {
                name: context.name || t('sessionLog.contextUntitled'),
              })}
              onChange={(event) =>
                useSessionStore
                  .getState()
                  .setSessionContext(session.id, context.id, event.target.checked)
              }
            />
            <span className="min-w-0 break-words">
              {context.name || t('sessionLog.contextUntitled')}
            </span>
          </label>
        ))}
      </div>
      {!contexts.length && (
        <p className="empty-state mt-3">{t('sessionLog.contextEmpty')}</p>
      )}
      <Button className="mt-3" onClick={onManage}>
        {t('sessionLog.contextManage')}
      </Button>
      {target ? (
        <form
          className="mt-5 space-y-3 border-t border-ink-700 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!fact.trim()) return;
            const before = target.text;
            useSessionStore.getState().appendContext(target.id, fact);
            const after = useSessionStore
              .getState()
              .contexts.find((context) => context.id === target.id)!.text;
            setAdded({ id: target.id, before, after });
            setFact('');
          }}
        >
          <h3 className="font-semibold">{t('sessionLog.contextAppend')}</h3>
          <div>
            <label className="field-label" htmlFor="context-target">
              {t('sessionLog.contextTarget')}
            </label>
            <Select
              id="context-target"
              className="mt-2 w-full"
              value={target.id}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {selected.map((context) => (
                <option key={context.id} value={context.id}>
                  {context.name || t('sessionLog.contextUntitled')}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="field-label" htmlFor="context-fact">
              {t('sessionLog.contextFact')}
            </label>
            <textarea
              id="context-fact"
              className={inputClass('mt-2 w-full resize-y')}
              rows={3}
              value={fact}
              onChange={(event) => setFact(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={!fact.trim()}>
            {t('sessionLog.contextAddFact')}
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-ink-400">{t('sessionLog.contextNoneSelected')}</p>
      )}
      {added && (
        <div
          role="status"
          className="notice mt-3 flex flex-wrap items-center justify-between gap-2"
        >
          <span>{t('sessionLog.contextAdded')}</span>
          {canUndo && (
            <Button
              onClick={() => {
                useSessionStore
                  .getState()
                  .updateContext(added.id, { text: added.before });
                setAdded(null);
              }}
            >
              {t('sessionLog.undo')}
            </Button>
          )}
        </div>
      )}
    </details>
  );
}

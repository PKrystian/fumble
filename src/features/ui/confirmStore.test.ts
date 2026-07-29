import { beforeEach, describe, expect, it } from 'vitest';
import { alertDialog, confirmDialog, useDialogStore } from './confirmStore';

describe('dialog store', () => {
  beforeEach(() => useDialogStore.setState({ request: null }));

  it('resolves confirmations with configured labels', async () => {
    const result = confirmDialog('Delete it?', {
      title: 'Confirm',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      tone: 'danger',
    });
    expect(useDialogStore.getState().request).toMatchObject({
      kind: 'confirm',
      title: 'Confirm',
      message: 'Delete it?',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      tone: 'danger',
    });
    useDialogStore.getState().respond(true);
    await expect(result).resolves.toBe(true);
    expect(useDialogStore.getState().request).toBeNull();
  });

  it('resolves alerts and supports defaults', async () => {
    const result = alertDialog('Saved');
    expect(useDialogStore.getState().request).toMatchObject({
      kind: 'alert',
      title: '',
      message: 'Saved',
      confirmLabel: '',
      cancelLabel: '',
      tone: 'default',
    });
    useDialogStore.getState().respond(false);
    await expect(result).resolves.toBeUndefined();
    useDialogStore.getState().respond(true);
  });
});

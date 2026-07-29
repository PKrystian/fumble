import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  render: vi.fn(),
  createRoot: vi.fn(),
}));

vi.mock('react-dom/client', () => ({
  createRoot: mocks.createRoot,
}));

vi.mock('./App', () => ({
  App: () => null,
}));

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.render.mockReset();
    mocks.createRoot.mockReset();
    mocks.createRoot.mockReturnValue({ render: mocks.render });
  });

  it('mounts the application', async () => {
    await import('./main');

    expect(mocks.createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(mocks.render).toHaveBeenCalledOnce();
  });
});

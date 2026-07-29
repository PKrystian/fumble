import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageCropperModal } from './ImageCropperModal';

let resizeCallback: ResizeObserverCallback;

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }

  observe() {}
  disconnect() {}
  unobserve() {}
}

class PointerEventMock extends MouseEvent {
  pointerId: number;

  constructor(type: string, init: PointerEventInit) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}

describe('image cropper', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('PointerEvent', PointerEventMock);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => ({ drawImage: vi.fn() })),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
      configurable: true,
      value: vi.fn(() => 'data:image/jpeg;base64,result'),
    });
  });

  it('loads, zooms, drags and saves an image', async () => {
    const onCancel = vi.fn();
    const onSave = vi.fn();
    const view = render(
      <MemoryRouter>
        <ImageCropperModal
          file={new Blob(['image'], { type: 'image/png' })}
          aspect={2}
          outputWidth={600}
          title="Crop portrait"
          onCancel={onCancel}
          onSave={onSave}
        />
      </MemoryRouter>,
    );

    resizeCallback(
      [
        {
          contentRect: { width: 280, height: 140 },
        } as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );

    const image = view.container.querySelector('img')!;
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 800 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 400 });
    fireEvent.load(image);

    const zoom = screen.getByRole('slider', { name: 'Zoom' });
    fireEvent.change(zoom, { target: { value: '2' } });
    expect(zoom).toHaveValue('2');

    const frame = image.parentElement!;
    Object.defineProperty(frame, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 40, clientY: 30 });
    fireEvent.pointerDown(frame, { pointerId: 2, clientX: 60, clientY: 20 });
    fireEvent.pointerMove(frame, { pointerId: 2, clientX: 90, clientY: 30 });
    fireEvent.pointerCancel(frame, { pointerId: 2 });
    fireEvent.pointerMove(frame, { pointerId: 99, clientX: 10, clientY: 10 });
    fireEvent.pointerLeave(frame, { pointerId: 99 });
    fireEvent.pointerUp(frame, { pointerId: 1 });
    fireEvent.pointerDown(frame, { pointerId: 3, clientX: 10, clientY: 10 });
    fireEvent.pointerDown(frame, { pointerId: 4, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(frame, { pointerId: 4, clientX: 20, clientY: 10 });
    fireEvent.pointerUp(frame, { pointerId: 3 });
    fireEvent.pointerUp(frame, { pointerId: 4 });
    fireEvent.wheel(frame, { deltaY: -100 });
    fireEvent.wheel(frame, { deltaY: -10000 });
    fireEvent.wheel(frame, { deltaY: 10000 });

    class ImageMock {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal('Image', ImageMock);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('data:image/jpeg;base64,result'),
    );
  });

  it('cancels from the button, backdrop and Escape', () => {
    const onCancel = vi.fn();
    const view = render(
      <MemoryRouter>
        <ImageCropperModal
          file={new Blob()}
          shape="circle"
          onCancel={onCancel}
          onSave={vi.fn()}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[0]!);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(view.container.firstElementChild!);
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it('handles an empty resize notification and an incomplete image', () => {
    const onSave = vi.fn();
    const view = render(
      <MemoryRouter>
        <ImageCropperModal file={new Blob()} onCancel={vi.fn()} onSave={onSave} />
      </MemoryRouter>,
    );
    resizeCallback([], {} as ResizeObserver);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Adjust image')).toBeInTheDocument();
    const image = view.container.querySelector('img')!;
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 100 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 100 });
    fireEvent.load(image);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();

    view.rerender(
      <MemoryRouter>
        <ImageCropperModal file={new Blob(['next'])} onCancel={vi.fn()} onSave={onSave} />
      </MemoryRouter>,
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('keeps the editor open when loading or exporting fails', async () => {
    const onSave = vi.fn();
    const view = render(
      <MemoryRouter>
        <ImageCropperModal
          file={new Blob(['image'])}
          onCancel={vi.fn()}
          onSave={onSave}
        />
      </MemoryRouter>,
    );
    resizeCallback(
      [{ contentRect: { width: 200, height: 200 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );
    const image = view.container.querySelector('img')!;
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 400 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 400 });
    fireEvent.load(image);

    class FailingImageMock {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onerror?.();
      }
    }
    vi.stubGlobal('Image', FailingImageMock);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );

    class ImageMock {
      onload: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal('Image', ImageMock);
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});

import JsonWorker from './jsonWorker?worker';

interface WorkerResponse {
  ok: boolean;
  value?: unknown;
}

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Failed to load JSON: ${url}`);
    return response.json() as Promise<T>;
  });
}

export function loadJson<T>(url: string, offload = false): Promise<T> {
  if (!offload || typeof Worker === 'undefined') return fetchJson<T>(url);

  let worker: Worker | undefined;
  try {
    worker = new JsonWorker();
  } catch {
    return fetchJson<T>(url);
  }
  return new Promise<T>((resolve, reject) => {
    const finish = () => {
      worker!.terminate();
    };
    worker!.onmessage = (event: MessageEvent<WorkerResponse>) => {
      finish();
      if (event.data.ok) {
        resolve(event.data.value as T);
        return;
      }
      reject(new Error(`Failed to load JSON: ${url}`));
    };
    worker!.onerror = () => {
      finish();
      reject(new Error(`Failed to load JSON: ${url}`));
    };
    worker!.postMessage(url);
  });
}

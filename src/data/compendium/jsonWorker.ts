interface WorkerResponse {
  ok: boolean;
  value?: unknown;
}

self.onmessage = async (event: MessageEvent<string>) => {
  try {
    const response = await fetch(event.data);
    if (!response.ok) throw new Error();
    self.postMessage({ ok: true, value: await response.json() } satisfies WorkerResponse);
  } catch {
    self.postMessage({ ok: false } satisfies WorkerResponse);
  }
};

export {};

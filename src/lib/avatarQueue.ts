const MAX = 8;
let active = 0;
const waiters: Array<() => void> = [];

export function acquireAvatarSlot(): Promise<void> {
  if (active < MAX) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      active += 1;
      resolve();
    });
  });
}

export function releaseAvatarSlot() {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

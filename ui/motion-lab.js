(() => {
  'use strict';
  const root = document.getElementById('cyber-motion-lab');
  if (!root || root.dataset.motionReady === 'true') return;
  root.dataset.motionReady = 'true';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const products = new Map(Array.from(root.querySelectorAll('[data-motion-concept]'), panel => [panel.dataset.motionConcept, panel]));
  const state = new Map(Array.from(products.keys(), key => [key, { phase: 0, wantsPlay: false }]));
  const names = { privesc: 'privilege escalation', hashcat: 'Hashcat' };
  const messages = {
    privesc: [
      'Start with a normal user account and inspect its permissions.',
      'A misconfiguration exposes a path across a permission boundary.',
      'The weakness allows a process to run with higher privileges.'
    ],
    hashcat: [
      'Prepare candidate passwords and the saved target hash.',
      'Compute candidate hashes in parallel using the target’s format and salt.',
      'Compare against the target. A match identifies a candidate password.'
    ]
  };
  const outputs = {
    privesc: ['ACCESS user · LIMITED PERMISSIONS', 'BOUNDARY weak · MISCONFIGURATION FOUND', 'ACCESS root · ELEVATED PROCESS'],
    hashcat: ['CANDIDATES → PARALLEL WORKLOAD', 'GPU LANES → CANDIDATE HASHES', 'CANDIDATE HASH = TARGET HASH · MATCH']
  };
  let active = 'privesc';
  let inView = !('IntersectionObserver' in window);
  let timer = null;
  let pageActive = true;

  function isPlaying(key) {
    return key === active && state.get(key).wantsPlay && inView && pageActive && !document.hidden && !reduced.matches;
  }

  function render() {
    products.forEach((panel, key) => {
      const current = state.get(key);
      const selected = key === active;
      panel.hidden = !selected;
      panel.dataset.step = String(current.phase);
      panel.dataset.playing = String(isPlaying(key));
      panel.querySelectorAll('[data-motion-phase]').forEach(button => {
        button.setAttribute('aria-pressed', String(Number(button.dataset.motionPhase) === current.phase));
      });
      const description = panel.querySelector('[data-motion-status]');
      if (description.textContent !== messages[key][current.phase]) description.textContent = messages[key][current.phase];
      panel.querySelector('[data-motion-output]').textContent = outputs[key][current.phase];
      const play = panel.querySelector('[data-motion-play]');
      play.setAttribute('aria-pressed', String(current.wantsPlay && !reduced.matches));
      play.setAttribute('aria-disabled', String(reduced.matches));
      play.setAttribute('aria-label', reduced.matches
        ? `Automatic ${names[key]} playback is off for reduced motion. Use the numbered stages.`
        : `${current.wantsPlay ? 'Pause' : 'Play'} ${names[key]} animation`);
      panel.querySelector('[data-motion-play-icon]').textContent = reduced.matches ? '−' : current.wantsPlay ? 'Ⅱ' : '▶';
      panel.querySelector('[data-motion-play-label]').textContent = reduced.matches ? 'Manual mode' : current.wantsPlay ? 'Pause' : 'Play';
    });
    root.querySelectorAll('[data-motion-tool]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.motionTool === active));
    });
    root.querySelector('[data-motion-reduced-note]').hidden = !reduced.matches;
  }

  function stopTimer() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  }

  function reconcile() {
    stopTimer();
    render();
    if (!isPlaying(active)) return;
    timer = window.setTimeout(() => {
      timer = null;
      if (!root.isConnected) {
        if (observer) observer.disconnect();
        return;
      }
      if (isPlaying(active)) {
        const current = state.get(active);
        current.phase = (current.phase + 1) % 3;
      }
      reconcile();
    }, 4300);
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-motion-tool')) {
      const next = button.dataset.motionTool;
      if (!products.has(next) || next === active) return;
      state.get(active).wantsPlay = false;
      active = next;
      reconcile();
      return;
    }
    const panel = button.closest('[data-motion-concept]');
    if (!panel || panel.dataset.motionConcept !== active) return;
    const current = state.get(active);
    if (button.hasAttribute('data-motion-phase')) {
      const phase = Number(button.dataset.motionPhase);
      if (!Number.isInteger(phase) || phase < 0 || phase > 2) return;
      current.phase = phase;
      current.wantsPlay = false;
    } else if (button.hasAttribute('data-motion-play')) {
      if (reduced.matches) return;
      current.wantsPlay = !current.wantsPlay;
    } else return;
    reconcile();
  });

  const visibleNodes = new Set();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleNodes.add(entry.target);
      else visibleNodes.delete(entry.target);
    });
    inView = visibleNodes.has(products.get(active));
    reconcile();
  }, { threshold: 0 }) : null;
  if (observer) products.forEach(panel => observer.observe(panel));
  document.addEventListener('visibilitychange', reconcile);
  reduced.addEventListener('change', () => {
    if (reduced.matches) state.forEach(current => { current.wantsPlay = false; });
    reconcile();
  });
  window.addEventListener('pagehide', () => { pageActive = false; reconcile(); });
  window.addEventListener('pageshow', () => { pageActive = true; reconcile(); });
  reconcile();
})();

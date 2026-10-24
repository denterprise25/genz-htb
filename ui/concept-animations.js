(() => {
  'use strict';
  if (window.GenzConcepts) return;

  const stage = (label, description, output) => Object.freeze({ label, description, output });
  const catalog = {
    nmap: {
      title: 'Nmap',
      description: 'A network map starts with questions and replies.',
      why: 'Different replies reveal different port states. An open port points to a listening service; a filtered result means Nmap cannot determine whether it is open or closed.',
      docsUrl: 'https://nmap.org/book/man-port-scanning-basics.html',
      stages: [
        stage('Discover', 'Discover hosts that respond on the network.', 'EXAMPLE HOST · 192.0.2.10 · UP'),
        stage('Probe', 'Send probes and use the replies to classify ports.', 'EXAMPLE · 22/TCP OPEN · 80/TCP CLOSED'),
        stage('Report', 'Read the observed port states before choosing the next step.', 'FILTERED · OPEN OR CLOSED IS UNKNOWN')
      ]
    },
    john: {
      title: 'John the Ripper',
      description: 'Follow a password guess through the hash workshop.',
      why: 'A candidate is hashed with the target’s format, settings, and salt, then compared with the saved hash. This is an offline comparison, not decryption or a live login.',
      docsUrl: 'https://www.openwall.com/john/',
      stages: [
        stage('Guess', 'Generate candidate passwords to test against a saved hash.', 'CANDIDATES · ORBIT → PIXEL → MAPLE'),
        stage('Hash', 'Compute each candidate’s hash using the target’s settings.', 'CANDIDATE → HASH → COMPARISON'),
        stage('Compare', 'A matching hash identifies a candidate password.', 'CANDIDATE HASH = TARGET HASH')
      ]
    },
    wireshark: {
      title: 'Wireshark',
      description: 'Slow the traffic down and look inside a packet.',
      why: 'A capture records packet data. Display filters narrow the view, while packet details expose protocol layers and fields for inspection. A display filter does not block network traffic.',
      docsUrl: 'https://www.wireshark.org/docs/wsug_html_chunked/ChapterIntroduction.html',
      stages: [
        stage('Capture', 'Capture packet data from a network interface.', 'EXAMPLE CAPTURE · SAMPLE.PCAPNG'),
        stage('Filter', 'Use a display filter to focus on relevant packets.', 'EXAMPLE DISPLAY FILTER · TCP'),
        stage('Inspect', 'Expand a selected packet’s protocol layers and fields.', 'ETHERNET → IPV4 → TCP')
      ]
    },
    firewall: {
      title: 'Packet checkpoint',
      description: 'Watch a firewall apply its traffic rules.',
      why: 'A firewall controls traffic according to configured rules. The checkpoint is a visual metaphor: allowed traffic passes, while disallowed traffic is dropped or rejected.',
      docsUrl: 'https://csrc.nist.gov/glossary/term/firewall',
      stages: [
        stage('Arrive', 'Packets arrive at the network boundary.', 'INCOMING TRAFFIC → NETWORK BOUNDARY'),
        stage('Inspect', 'The firewall checks traffic against its rules.', 'TRAFFIC DETAILS → RULE CHECK'),
        stage('Filter', 'Allowed traffic passes. Blocked traffic is turned away.', 'RULE RESULT · ALLOW OR BLOCK')
      ]
    },
    vault: {
      title: 'Cipher vault',
      description: 'See how a key protects readable information.',
      why: 'Encryption transforms plaintext into ciphertext using an algorithm and key. Decryption uses the appropriate key to restore readable data. The vault illustrates the idea, not the mathematics.',
      docsUrl: 'https://csrc.nist.gov/glossary/term/encryption',
      stages: [
        stage('Data', 'Readable information is ready to be protected.', 'PLAINTEXT · READABLE DATA'),
        stage('Encrypt', 'Encryption transforms that information into ciphertext.', 'ALGORITHM + KEY → CIPHERTEXT'),
        stage('Unlock', 'The appropriate decryption key restores readable data.', 'CIPHERTEXT + KEY → PLAINTEXT')
      ]
    },
    privesc: {
      title: 'Privilege escalation',
      description: 'Follow a process across a permission boundary.',
      why: 'A vulnerability or misconfiguration can let a process obtain permissions beyond its current account. The raised platform represents increased privileges, not an automatic outcome for every machine.',
      docsUrl: 'https://attack.mitre.org/tactics/TA0004/',
      stages: [
        stage('Inspect', 'Start with a normal user account and inspect its permissions.', 'USER ACCESS · LIMITED PERMISSIONS'),
        stage('Weakness', 'A misconfiguration exposes a path across a permission boundary.', 'BOUNDARY · MISCONFIGURATION FOUND'),
        stage('Elevate', 'The weakness allows a process to run with higher privileges.', 'ELEVATED PROCESS · HIGHER PRIVILEGES')
      ]
    },
    hashcat: {
      title: 'Hashcat',
      description: 'Many candidates. Parallel work. One comparison.',
      why: 'Compatible hardware can compute many candidate hashes in parallel. Hashcat compares the results with a saved target hash; a match identifies a candidate password. It does not decrypt a hash.',
      docsUrl: 'https://hashcat.net/hashcat/',
      stages: [
        stage('Prepare', 'Prepare candidate passwords and the saved target hash.', 'CANDIDATES → PARALLEL WORKLOAD'),
        stage('Compute', 'Compute candidate hashes using the target’s format and salt.', 'COMPUTE LANES → CANDIDATE HASHES'),
        stage('Compare', 'Compare the results with the target and look for a match.', 'CANDIDATE HASH = TARGET HASH')
      ]
    }
  };
  Object.values(catalog).forEach(concept => {
    concept.stageLabels = Object.freeze(concept.stages.map(item => item.label));
    Object.freeze(concept.stages);
    Object.freeze(concept);
  });
  Object.freeze(catalog);

  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const figures = new Map();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interval = 4300;
  let sequence = 0;
  let timer = null;
  let pageActive = true;

  function render(key, { id = key, compact = false } = {}) {
    const concept = catalog[key];
    const asset = window.GenzConceptAssets?.[key];
    if (!concept || !asset) return '';
    const unique = `gc-${String(id).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64)}-${++sequence}`;
    const svg = asset.replaceAll('__GC__', unique);
    return `<figure id="${unique}" class="gc-concept ${unique}${compact ? ' gc-compact' : ''}" data-gc-figure="${key}" data-step="0" data-playing="false" aria-labelledby="${unique}-heading">
      <figcaption class="gc-caption">
        <p class="gc-eyebrow">CONCEPT IN MOTION <span>3 STAGES</span></p>
        <p class="gc-title" id="${unique}-heading">${escape(concept.title)}</p>
        <p class="gc-description">${escape(concept.description)}</p>
      </figcaption>
      <div class="gc-scene" id="${unique}-scene">${svg}</div>
      <div class="gc-readout" aria-hidden="true"><span>↳</span><span data-gc-output>${escape(concept.stages[0].output)}</span></div>
      <div class="gc-controls">
        <div class="gc-stages" role="group" aria-label="${escape(concept.title)} stages">${concept.stages.map((item, index) => `<button type="button" data-gc-stage="${index}" aria-pressed="${index === 0}" aria-controls="${unique}-scene" aria-label="${escape(concept.title)}: stage ${index + 1}, ${escape(item.label)}"><span>0${index + 1}</span>${escape(item.label)}</button>`).join('')}</div>
        <button type="button" class="gc-play" data-gc-play aria-pressed="false" aria-controls="${unique}-scene" aria-label="Play ${escape(concept.title)} animation"><span data-gc-play-icon aria-hidden="true">▶</span><span data-gc-play-label>Play</span></button>
      </div>
      <p class="gc-status" data-gc-status role="status" aria-live="polite" aria-atomic="true">${escape(concept.stages[0].description)}</p>
      <div class="gc-explanation"><p><strong>Why it works</strong> ${escape(concept.why)}</p><a href="${escape(concept.docsUrl)}" target="_blank" rel="noopener noreferrer">Read the reference <span aria-hidden="true">↗</span></a></div>
      <p class="gc-reduced" data-gc-reduced hidden>Reduced motion is on. Use the three stage buttons to explore.</p>
    </figure>`;
  }

  function visible(state) {
    if (!state.inView || !state.element.isConnected || !state.element.getClientRects().length) return false;
    if (state.element.closest('[hidden]')) return false;
    for (let parent = state.element.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS' && !parent.open) return false;
    }
    return true;
  }

  function playing(state) {
    return state.wantsPlay && pageActive && !document.hidden && !reduced.matches && visible(state);
  }

  function update(state) {
    const { element, concept } = state;
    const selected = concept.stages[state.phase];
    const runs = playing(state);
    element.dataset.step = String(state.phase);
    element.dataset.playing = String(runs);
    element.querySelectorAll('[data-gc-stage]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.gcStage) === state.phase)));
    const status = element.querySelector('[data-gc-status]');
    if (status.textContent !== selected.description) status.textContent = selected.description;
    element.querySelector('[data-gc-output]').textContent = selected.output;
    const play = element.querySelector('[data-gc-play]');
    play.setAttribute('aria-pressed', String(state.wantsPlay && !reduced.matches));
    play.setAttribute('aria-disabled', String(reduced.matches));
    play.setAttribute('aria-label', reduced.matches ? `${concept.title}: reduced motion is on; use the stage buttons` : `${state.wantsPlay ? 'Pause' : 'Play'} ${concept.title} animation`);
    element.querySelector('[data-gc-play-icon]').textContent = reduced.matches ? '−' : state.wantsPlay ? 'Ⅱ' : '▶';
    element.querySelector('[data-gc-play-label]').textContent = reduced.matches ? 'Manual mode' : state.wantsPlay ? 'Pause' : 'Play';
    element.querySelector('[data-gc-reduced]').hidden = !reduced.matches;
    if (!runs) state.nextAt = null;
    else if (state.nextAt === null) state.nextAt = performance.now() + interval;
  }

  function remove(element) {
    observer?.unobserve(element);
    figures.delete(element);
    element.dataset.playing = 'false';
    delete element.dataset.gcReady;
  }

  // One timeout serves every visible instance. Hidden or collapsed figures do
  // not consume a phase timer, and detached figures are released on each pass.
  function reconcile() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    let next = Infinity;
    figures.forEach((state, element) => {
      if (!element.isConnected) { remove(element); return; }
      update(state);
      if (state.nextAt !== null) next = Math.min(next, state.nextAt);
    });
    if (next === Infinity) return;
    timer = window.setTimeout(() => {
      timer = null;
      const now = performance.now();
      figures.forEach(state => {
        if (playing(state) && state.nextAt !== null && state.nextAt <= now + 10) {
          state.phase = (state.phase + 1) % state.concept.stages.length;
          state.nextAt = now + interval;
        }
      });
      reconcile();
    }, Math.max(0, next - performance.now()));
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = figures.get(entry.target);
      if (state) state.inView = entry.isIntersecting;
    });
    reconcile();
  }, { threshold: 0 }) : null;

  function mount(container = document) {
    const found = [...container.querySelectorAll('[data-gc-figure]')];
    if (container.matches?.('[data-gc-figure]')) found.unshift(container);
    found.forEach(element => {
      if (figures.has(element) || !catalog[element.dataset.gcFigure]) return;
      figures.set(element, { element, concept: catalog[element.dataset.gcFigure], phase: 0, wantsPlay: false, inView: !observer, nextAt: null });
      element.dataset.gcReady = 'true';
      observer?.observe(element);
    });
    reconcile();
  }

  function unmount(container) {
    figures.forEach((state, element) => {
      if (element === container || container.contains(element)) remove(element);
    });
    reconcile();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-gc-stage], [data-gc-play]');
    if (!button) return;
    const state = figures.get(button.closest('[data-gc-figure]'));
    if (!state) return;
    if (button.hasAttribute('data-gc-stage')) {
      const phase = Number(button.dataset.gcStage);
      if (!Number.isInteger(phase) || !state.concept.stages[phase]) return;
      state.phase = phase;
      state.wantsPlay = false;
    } else {
      if (reduced.matches) return;
      state.wantsPlay = !state.wantsPlay;
    }
    state.nextAt = null;
    reconcile();
  });
  document.addEventListener('toggle', event => {
    if (event.target.tagName === 'DETAILS') reconcile();
  }, true);
  document.addEventListener('visibilitychange', reconcile);
  reduced.addEventListener('change', () => {
    if (reduced.matches) figures.forEach(state => { state.wantsPlay = false; });
    reconcile();
  });
  window.addEventListener('pagehide', () => { pageActive = false; reconcile(); });
  window.addEventListener('pageshow', () => { pageActive = true; reconcile(); });
  window.GenzConcepts = Object.freeze({ catalog, render, mount, unmount });
})();

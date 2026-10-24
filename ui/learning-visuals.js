(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const concepts = {
    nmap: {title:'Nmap', category:'Discover services', why:'A port scan turns replies into evidence about reachable services. Open means a service accepted the probe; filtered means the scan could not determine whether the port is open.', next:'Start with a service-enumeration guide below. Compare what a reply proves with what still needs investigation.'},
    john: {title:'John the Ripper', category:'Recover passwords', why:'John tests candidate passwords against a saved hash. It applies the target format and parameters, then compares the result. A successful guess produces a match.', next:'Watch this beside the password-recovery notes in the guides below.'},
    wireshark: {title:'Wireshark', category:'Read network traffic', why:'A packet capture records network traffic you can inspect. Display filters narrow the packets shown without deleting the rest of the capture. Protocol layers help explain who sent what.', next:'A useful companion to network enumeration: inspect a permitted lab capture to connect requests with replies. This is a background lesson; the current reading guides do not name Wireshark.'},
    firewall: {title:'Packet checkpoint', category:'Understand filtering', why:'A firewall applies rules to network traffic. Whether a packet is allowed or blocked can depend on its addresses, ports, protocol and connection state.', next:'Connect this to Nmap’s filtered state: missing or blocked replies can leave the port’s actual state unknown. The checkpoint is a simplified firewall illustration.'},
    vault: {title:'Cipher vault', category:'Protect data with a key', why:'Encryption turns readable data into ciphertext. Decryption uses the appropriate key to recover it. Password hashing is a different process: it supports comparison rather than decryption.', next:'Explore the encrypted SSH key discussed in the Valentine reading guide.'},
    privesc: {title:'Privilege escalation', category:'Cross permission boundaries', why:'A process starts with the rights of its account. A misconfiguration or vulnerability may allow it to gain higher privileges. The exact weakness determines which boundary can be crossed.', next:'Use the notes below to connect permissions, SUID or sudo with the reason an escalation succeeds.'},
    hashcat: {title:'Hashcat', category:'Compare hashes in parallel', why:'Hashcat computes candidate hashes and compares them with a target. Compatible GPUs can process many candidates in parallel; the hash format and settings determine the work required.', next:'Compare this with John the Ripper in the password-hash notes. Both illustrations show offline password recovery.'}
  };
  const keys = Object.keys(concepts);
  const contextData = () => window.GenzSiteData?.visualContexts || {};
  const contextRows = slug => Array.isArray(contextData()[slug]) ? contextData()[slug].filter(row => concepts[row.concept]) : [];
  const href = raw => window.GenzSite?.href(raw) || raw;
  const normal = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const anchorFor = (concept, index) => 'learn-' + concept + '-' + index;

  function mountLibrary(records) {
    const root = document.querySelector('#visual-lab');
    if (!root || !window.GenzConcepts || root.dataset.ready) return;
    root.dataset.ready = 'true';
    const picker = root.querySelector('#concept-picker');
    const stage = root.querySelector('#concept-stage');
    const reading = root.querySelector('#concept-reading');
    let current = new URLSearchParams(location.search).get('concept');
    if (!concepts[current]) current = 'nmap';
    picker.innerHTML = keys.map((key, index) => `<button type="button" data-library-concept="${key}" aria-pressed="false"><span class="mono">${String(index+1).padStart(2,'0')}</span><span>${concepts[key].title}<small>${concepts[key].category}</small></span><span aria-hidden="true">↗</span></button>`).join('');
    function select(key, updateAddress) {
      current = key;
      picker.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.libraryConcept === key)));
      window.GenzConcepts.unmount(stage);
      stage.innerHTML = window.GenzConcepts.render(key, {id:'library-' + key});
      const related = records.filter(record => contextRows(record.slug).some(row => row.concept === key)).slice(0,4);
      reading.innerHTML = `<div class="concept-explanation"><span class="mono accent">WHY IT WORKS</span><p>${escape(concepts[key].why)}</p></div><p class="concept-next">${escape(concepts[key].next)}</p>` + (related.length ? `<nav class="concept-guide-links" aria-label="Read about ${escape(concepts[key].title)} in a guide">${related.map(record => {const index=contextRows(record.slug).findIndex(row=>row.concept===key); return `<a href="${escape(href('./machines/'+record.slug+'/#'+anchorFor(key,index)))}"><span>${escape(record.title)}</span><span>${record.platform==='Hack The Box'?'HTB':'THM'} ↗</span></a>`;}).join('')}</nav>` : '');
      window.GenzConcepts.mount(stage);
      window.GenzSite?.fixLinks(reading);
      if (updateAddress) {
        const url = new URL(location.href); url.searchParams.set('concept', key); url.hash = 'visual-lab';
        try { history.replaceState(null, '', url); } catch { /* Selection still works without history access. */ }
      }
    }
    picker.addEventListener('click', event => {
      const button = event.target.closest('[data-library-concept]');
      if (button && concepts[button.dataset.libraryConcept]) select(button.dataset.libraryConcept, true);
    });
    select(current, false);
  }

  function enhanceGuide(record) {
    const topics = document.querySelector('#topics');
    if (!record || !topics || !window.GenzConcepts) return;
    const rows = contextRows(record.slug);
    if (!rows.length) {
      topics.insertAdjacentHTML('beforeend', '<p class="visual-guide-link">Build your foundations in the <a href="./#visual-lab">visual lab</a>: explore scanning, packets, passwords and permissions.</p>');
      return;
    }
    const sequence = document.createElement('div');
    sequence.className = 'learning-sequence';
    sequence.innerHTML = rows.map((row, index) => {
      const concept = concepts[row.concept];
      const id = anchorFor(row.concept, index);
      return `<article class="learning-step" id="${id}"><div class="learning-step-kicker"><span class="mono accent">${String(index+1).padStart(2,'0')} / ${escape(row.topic)}</span><span class="learning-relation">${row.relation==='guide'?'Concept in this guide':'Related concept'}</span></div><h3>${escape(row.title)}</h3><p>${escape(row.context)}</p><div class="learning-why"><strong>Why it works</strong><p>${escape(row.why)}</p></div><details class="concept-disclosure"${index===0?' open':''}><summary><span>See ${escape(concept.title)} in motion</span><span class="disclosure-symbol" aria-hidden="true">+</span></summary>${window.GenzConcepts.render(row.concept,{id:record.slug+'-'+index,compact:true})}</details></article>`;
    }).join('');
    topics.append(sequence);
    topics.querySelectorAll('.topic-list > div').forEach(item => {
      const label = item.querySelector('strong');
      if (!label) return;
      const index = rows.findIndex(row => normal(row.topic) === normal(label.textContent) || normal(concepts[row.concept].title) === normal(label.textContent));
      if (index < 0) return;
      const link = document.createElement('a');
      link.href = location.href.split('#')[0]+'#'+anchorFor(rows[index].concept,index);
      link.dataset.learningJump = anchorFor(rows[index].concept,index);
      link.className = 'topic-animation-link';
      link.innerHTML = `<span>${escape(label.textContent)}</span><small>Watch ↓</small>`;
      label.replaceWith(link);
      item.querySelector('span[aria-hidden]')?.remove();
    });
    const aside = document.querySelector('.detail-aside nav');
    if (aside) {
      const nested = document.createElement('div'); nested.className='learning-contents';
      nested.innerHTML = rows.map((row,index) => `<a href="${escape(location.href.split('#')[0])}#${anchorFor(row.concept,index)}" data-learning-jump="${anchorFor(row.concept,index)}">↳ ${escape(concepts[row.concept].title)}</a>`).join('');
      aside.querySelector('[data-scroll="topics"]')?.after(nested);
    }
    document.querySelector('#machine-page').addEventListener('click', event => {
      const jump=event.target.closest('[data-learning-jump]');
      if (!jump) return;
      const target=document.getElementById(jump.dataset.learningJump);
      if (!target) return;
      event.preventDefault();
      target.querySelector('details').open=true;
      target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      try {const address=new URL(location.href);address.hash=target.id;history.replaceState(null,'',address.href);} catch {}
    });
    window.GenzConcepts.mount(sequence);
  }
  window.GenzLearning = {mountLibrary, enhanceGuide};
})();

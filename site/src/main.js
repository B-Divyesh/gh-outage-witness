import './styles.css';

const scenarios = {
  runner: {
    title: 'Self-hosted runner disappears',
    label: 'Runner failure',
    tone: 'error',
    sources: [
      ['Run + jobs', '2 attempts · job never completed'],
      ['Actions logs', 'Available · session failure'],
      ['Runner journal', 'Attached · communication lost'],
      ['GitHub Status', 'Operational when observed']
    ],
    note: 'Medium confidence · runner logs contain “lost communication with the server.” This is a signal, not a root-cause verdict.'
  },
  code: {
    title: 'Test process exits',
    label: 'Repository failure',
    tone: '',
    sources: [
      ['Run + jobs', '1 attempt · test step failed'],
      ['Actions logs', 'Available · process exit 1'],
      ['Runner journal', 'Not requested'],
      ['GitHub Status', 'Operational when observed']
    ],
    note: 'Medium confidence · an available job log records the repository process exit. Platform state is supporting context only.'
  },
  platform: {
    title: 'Public Actions incident',
    label: 'Probable platform degradation',
    tone: 'warning',
    sources: [
      ['Run + jobs', '3 attempts · 18m queue wait'],
      ['Actions logs', 'Unavailable at capture time'],
      ['Runner journal', 'Not requested'],
      ['GitHub Status', 'Actions: degraded performance']
    ],
    note: 'Medium confidence · the public Actions component was degraded when observed. After-the-fact status is not historical proof.'
  },
  partial: {
    title: 'Logs and status unavailable',
    label: 'Inconclusive',
    tone: 'warning',
    sources: [
      ['Run + jobs', '1 attempt · 14m queue wait'],
      ['Actions logs', 'Unavailable · HTTP 404'],
      ['Runner journal', 'Not requested'],
      ['GitHub Status', 'Unavailable · network error']
    ],
    note: 'Low confidence · delay and missing evidence are preserved, but they cannot distinguish a runner issue from platform degradation.'
  }
};

const form = document.querySelector('[data-demo-form]');
const output = document.querySelector('[data-demo-output]');
const reset = document.querySelector('[data-reset]');

function emptyMarkup() {
  return `<div class="empty-state" data-empty>
    <span class="empty-mark" aria-hidden="true">◇</span>
    <p><strong>No specimen selected yet.</strong><br>Build one to inspect its source states and label.</p>
  </div>`;
}

if (form && output && reset) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    output.setAttribute('aria-busy', 'true');
    output.innerHTML = `<div class="loading-state"><span class="loading-shard" aria-hidden="true"></span><p><strong>Assembling evidence strata…</strong><br>Reading attempts, logs, runner witness, and status.</p></div>`;
    window.setTimeout(() => {
      const data = scenarios[new FormData(form).get('scenario')];
      const items = data.sources.map(([name, state]) => `<li><span>${name}</span><small>${state}</small></li>`).join('');
      output.innerHTML = `<article class="receipt">
        <header class="receipt-head">
          <div><p class="receipt-kicker">Example · run 44500807</p><h3>${data.title}</h3></div>
          <span class="classification ${data.tone}">${data.label}</span>
        </header>
        <ul class="receipt-sources">${items}</ul>
        <p class="receipt-note">${data.note}</p>
      </article>`;
      output.setAttribute('aria-busy', 'false');
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420);
  });

  reset.addEventListener('click', () => {
    output.innerHTML = emptyMarkup();
    output.setAttribute('aria-busy', 'false');
    document.querySelector('#scenario').focus();
  });
}

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const label = button.querySelector('span');
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      label.textContent = 'Copied';
    } catch {
      label.textContent = 'Select';
      const command = button.previousElementSibling;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(command);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    window.setTimeout(() => { label.textContent = 'Copy'; }, 1600);
  });
});

const networkState = document.querySelector('[data-network-state]');
function updateNetworkState() {
  if (networkState) networkState.hidden = navigator.onLine;
}
window.addEventListener('online', updateNetworkState);
window.addEventListener('offline', updateNetworkState);
updateNetworkState();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

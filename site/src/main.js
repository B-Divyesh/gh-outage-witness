import './styles.css';

const DEMO_KEY = 'demo:ci-outage-witness:scenario';
const DEFAULT_SCENARIO = 'platform';

if (location.pathname === '/' && new URLSearchParams(location.search).get('demo') === '1') {
  location.replace('/demo/');
}

const scenarios = {
  platform: {
    title: 'Deploy production',
    label: 'Probable platform degradation',
    tone: 'warning',
    sources: [
      ['Run and jobs', '3 attempts · 18-minute queue wait'],
      ['Actions logs', 'Unavailable at capture time'],
      ['Runner journal', 'Attached · runner connected'],
      ['GitHub Status', 'Actions reported degraded performance']
    ],
    note: 'Medium confidence. The public status observation supports the label but does not prove root cause.'
  },
  runner: {
    title: 'Self-hosted runner disconnects',
    label: 'Runner failure',
    tone: 'error',
    sources: [
      ['Run and jobs', '2 attempts · job did not complete'],
      ['Actions logs', 'Available · session failed'],
      ['Runner journal', 'Attached · communication lost'],
      ['GitHub Status', 'Operational when observed']
    ],
    note: 'Medium confidence. The attached runner log contains a lost-communication signal.'
  },
  code: {
    title: 'Test process exits',
    label: 'Repository failure',
    tone: '',
    sources: [
      ['Run and jobs', '1 attempt · test step failed'],
      ['Actions logs', 'Available · process exited with code 1'],
      ['Runner journal', 'Not requested'],
      ['GitHub Status', 'Operational when observed']
    ],
    note: 'Medium confidence. The job log records a repository process exit.'
  },
  partial: {
    title: 'Logs and status unavailable',
    label: 'Inconclusive',
    tone: 'warning',
    sources: [
      ['Run and jobs', '1 attempt · 14-minute queue wait'],
      ['Actions logs', 'Unavailable · HTTP 404'],
      ['Runner journal', 'Not requested'],
      ['GitHub Status', 'Unavailable · network error']
    ],
    note: 'Low confidence. The missing evidence cannot separate a runner issue from platform degradation.'
  }
};

const form = document.querySelector('[data-demo-form]');
const output = document.querySelector('[data-demo-output]');
const reset = document.querySelector('[data-demo-reset]');
const startReal = document.querySelector('[data-start-real]');

function storedScenario() {
  try {
    const value = localStorage.getItem(DEMO_KEY);
    return Object.hasOwn(scenarios, value) ? value : DEFAULT_SCENARIO;
  } catch {
    return DEFAULT_SCENARIO;
  }
}

function saveScenario(value) {
  try {
    localStorage.setItem(DEMO_KEY, value);
  } catch {
    // The sample still works when browser storage is unavailable.
  }
}

function clearDemo() {
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    // There may be no stored sample state to clear.
  }
}

function receiptMarkup(key) {
  const data = scenarios[key];
  const items = data.sources.map(([name, state]) => `<li><span>${name}</span><small>${state}</small></li>`).join('');
  return `<article class="receipt">
    <header class="receipt-head">
      <div><p class="receipt-kicker">Sample · run 44500807</p><h3>${data.title}</h3></div>
      <span class="classification ${data.tone}">${data.label}</span>
    </header>
    <ul class="receipt-sources">${items}</ul>
    <p class="receipt-note">${data.note}</p>
  </article>`;
}

function renderScenario(key) {
  if (!form || !output) return;
  form.elements.scenario.value = key;
  output.innerHTML = receiptMarkup(key);
  output.setAttribute('aria-busy', 'false');
}

if (form && output) {
  const initial = storedScenario();
  saveScenario(initial);
  renderScenario(initial);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const key = new FormData(form).get('scenario');
    if (!Object.hasOwn(scenarios, key)) return;
    output.setAttribute('aria-busy', 'true');
    output.innerHTML = '<div class="loading-state"><span class="loading-shard" aria-hidden="true"></span><p><strong>Updating the sample bundle.</strong><br>Reading the saved evidence.</p></div>';
    window.setTimeout(() => {
      saveScenario(key);
      renderScenario(key);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220);
  });
}

reset?.addEventListener('click', () => {
  clearDemo();
  saveScenario(DEFAULT_SCENARIO);
  renderScenario(DEFAULT_SCENARIO);
  form?.elements.scenario.focus();
});

startReal?.addEventListener('click', clearDemo);

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
let offlineSignaled = !navigator.onLine;
function updateNetworkState(online = navigator.onLine) {
  if (networkState) networkState.hidden = online;
}
async function checkNetworkState() {
  if (!navigator.onLine || offlineSignaled) {
    updateNetworkState(false);
    return;
  }
  try {
    const response = await fetch(`/robots.txt?connectivity=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
    if (!offlineSignaled) updateNetworkState(response.ok);
  } catch {
    updateNetworkState(false);
  }
}
window.addEventListener('online', () => {
  offlineSignaled = false;
  checkNetworkState();
});
window.addEventListener('offline', () => {
  offlineSignaled = true;
  updateNetworkState(false);
});
checkNetworkState();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

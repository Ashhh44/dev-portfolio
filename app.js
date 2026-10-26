/* ============================================================================
   6 · MENU BAR
   ========================================================================== */
function battSVG(pct, charging) {
  const w = clamp(pct, 0, 100) / 100 * 18.4;
  const col = charging ? '#34c759' : pct <= 10 ? '#ff453a' : pct <= 20 ? '#ff9f0a' : 'currentColor';
  return `<svg viewBox="0 0 28 13" style="width:26px;height:12px">
    <rect x=".6" y=".6" width="22.8" height="11.8" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.1"/>
    <path d="M24.9 4.6a3.1 3.1 0 0 1 0 3.8z" fill="currentColor" fill-opacity=".45"/>
    <rect x="2.2" y="2.2" width="${w.toFixed(1)}" height="8.6" rx="2.1" fill="${col}"/>
    ${charging ? '<path d="M13.6 1.6 8.4 7.4h3.4l-1.4 4.8 5.4-6h-3.4z" fill="#fff" stroke="#1d1d1f" stroke-opacity=".25" stroke-width=".7" stroke-linejoin="round"/>' : ''}
  </svg>`;
}

const MenuBar = {
  app: 'Finder',
  menus: null,
  openIdx: -1,

  init() {
    const bar = $('#menubar');
    bar.innerHTML =
      `<div class="mb-left">
         <div class="mb-item apple" data-menu="apple">${ic('g-apple', '')}</div>
         <div id="mb-titles" style="display:flex;align-items:stretch"></div>
       </div>
       <div class="mb-right"><div id="mb-status">
         <div class="mb-st" data-st="bt"    title="Bluetooth">${ic('g-bt')}</div>
         <div class="mb-st" data-st="vol"   title="Sound"><span id="mb-volico">${ic('g-vol')}</span></div>
         <div class="mb-st" data-st="batt"  title="Battery"><span class="batt-pct" id="mb-battpct"></span><span id="mb-batt"></span></div>
         <div class="mb-st" data-st="wifi"  title="Wi-Fi">${ic('g-wifi')}</div>
         <div class="mb-st" data-st="spot"  title="Spotlight">${ic('g-spot')}</div>
         <div class="mb-st" data-st="cc"    title="Control Center">${ic('g-cc')}</div>
         <div class="mb-st" data-st="clock" id="mb-clock"></div>
       </div></div>`;
    $('#menubar [data-st="bt"] svg').style.cssText = 'width:11px;height:16px';
    $('#menubar [data-st="wifi"] svg').style.cssText = 'width:16px;height:13px';
    $('#menubar [data-st="vol"] svg').style.cssText = 'width:16px;height:13px';
    $('#menubar [data-st="cc"] svg').style.cssText = 'width:15px;height:15px';
    $('#menubar [data-st="spot"] svg').style.cssText = 'width:14px;height:14px';
    $('#menubar .apple svg').style.cssText = 'width:13px;height:16px';

    this.setApp('Finder', APP_MENUS.finder);
    this.paintStatus();
    everySecond(d => {
      $('#mb-clock').textContent =
        `${DAYS3[d.getDay()]}${NBSP}${MONS3[d.getMonth()]}${NBSP}${d.getDate()}${NBSP}${NBSP}${time12(d)}`;
    });

    /* titles: click opens, hover switches while a menu is open */
    on(bar, 'mousedown', '.mb-item', (e, t) => { e.preventDefault(); this.toggle(t); });
    on(bar, 'mouseenter', '.mb-item', (e, t) => { if (this.openIdx >= 0 && !t.classList.contains('open')) this.toggle(t); }, true);
    on(bar, 'mousedown', '.mb-st', (e, t) => { e.preventDefault(); this.status(t); });
    /* The shield no longer covers the bar, so dead space has to dismiss itself. */
    bar.addEventListener('mousedown', e => { if (!e.target.closest('.mb-item,.mb-st')) Pop.close(); });

    Bus.on('theme', () => this.paintStatus());
    Bus.on('volume', () => this.paintStatus());
  },

  paintStatus() {
    $('#mb-batt').innerHTML = battSVG(SYS.battery, SYS.charging);
    $('#mb-battpct').textContent = SYS.battery + '%';
    const v = SYS.muted || SYS.volume === 0 ? 'g-vol-mute' : SYS.volume < .5 ? 'g-vol-lo' : 'g-vol';
    $('#mb-volico').innerHTML = ic(v);
    const s = $('#mb-volico svg'); if (s) s.style.cssText = 'width:16px;height:13px';
    $('#menubar [data-st="wifi"]').style.opacity = SYS.wifi ? '1' : '.45';
    $('#menubar [data-st="bt"]').style.opacity = SYS.bluetooth ? '1' : '.45';
  },

  setApp(name, menus) {
    this.app = name;
    this.menus = menus || APP_MENUS.finder;
    const titles = [{ label: name, app: true }, ...this.menus];
    $('#mb-titles').innerHTML = titles.map((m, i) =>
      `<div class="mb-item${m.app ? ' app' : ''}" data-menu="${i}">${esc(m.label)}</div>`).join('');
  },

  menuSpec(key) {
    if (key === 'apple') return APPLE_MENU();
    const i = +key;
    if (i === 0) return (APP_ABOUT[this.app] || APP_ABOUT._)(this.app);
    return (this.menus[i - 1] || { items: [] }).items;
  },

  toggle(t) {
    const key = t.dataset.menu;
    if (t.classList.contains('open')) { Pop.close(); return; }
    $$('#menubar .mb-item.open').forEach(n => n.classList.remove('open'));
    t.classList.add('open');
    this.openIdx = key;
    const r = t.getBoundingClientRect();
    const node = Pop.menu(this.menuSpec(key), 'wide');
    Pop.open(node, {
      x: r.left, y: r.bottom + 2, origin: 'top left',
      onClose: () => { t.classList.remove('open'); this.openIdx = -1; }
    });
  },

  status(t) {
    const k = t.dataset.st, r = t.getBoundingClientRect();
    /* Clock first: it wears .open while Notification Centre is up, so the generic
       "already open → dismiss the popover" branch would swallow the toggle. */
    if (k === 'clock') { NotifCenter.toggle(); return; }
    if (t.classList.contains('open')) { Pop.close(); return; }
    if (k === 'spot') { Spotlight.open(); return; }
    $$('#menubar .mb-st.open').forEach(n => n.classList.remove('open'));
    t.classList.add('open');
    const node = STATUS_PANELS[k]();
    Pop.open(node, {
      x: r.right + 6, y: r.bottom + 4, right: true, origin: 'top right',
      onClose: () => t.classList.remove('open')
    });
  }
};

/* ---- Apple menu ---------------------------------------------------------- */
const APPLE_MENU = () => [
  { id: 'about', label: 'About This Mac', run: () => WM.open('about') },
  '-',
  { id: 'set', label: 'System Settings…', run: () => WM.open('settings') },
  { id: 'store', label: 'App Store…', key: '1 update', run: () => Toast('App Store is not part of this build') },
  '-',
  { id: 'recent', label: 'Recent Items', key: '▸' },
  '-',
  { id: 'force', label: 'Force Quit…', key: '⌥⌘⎋', run: () => WM.forceQuitPanel() },
  '-',
  { id: 'sleep', label: 'Sleep', run: () => Screen.sleep() },
  { id: 'restart', label: 'Restart…', run: () => Startup.restart() },
  { id: 'shut', label: 'Shut Down…', run: () => Startup.shutDown() },
  '-',
  { id: 'lock', label: 'Lock Screen', key: '⌃⌘Q', run: () => Startup.lock() },
  { id: 'logout', label: `Log Out ${SYS.user}…`, key: '⇧⌘Q', run: () => Startup.lock() },
];

const APP_ABOUT = {
  _: name => [
    { id: 'a', label: `About ${name}`, run: () => WM.open('about') }, '-',
    { id: 'p', label: 'Settings…', key: '⌘,', run: () => WM.open('settings') }, '-',
    { id: 'h', label: `Hide ${name}`, key: '⌘H', run: () => WM.hideFront() },
    { id: 'o', label: 'Hide Others', key: '⌥⌘H', run: () => WM.hideOthers() },
    { id: 's', label: 'Show All', run: () => WM.showAll() }, '-',
    { id: 'q', label: `Quit ${name}`, key: '⌘Q', run: () => WM.quitFront() },
  ]
};

/* ---- Per-app menu bars --------------------------------------------------- */
const M = (label, items) => ({ label, items });
const APP_MENUS = {
  finder: [
    M('File', [
      { id: 'nw', label: 'New Finder Window', key: '⌘N', run: () => WM.open('finder') },
      { id: 'nf', label: 'New Folder', key: '⇧⌘N', run: () => Finder.newFolder() },
      '-',
      { id: 'op', label: 'Open', key: '⌘O', run: () => Finder.openSelected() },
      { id: 'cl', label: 'Close Window', key: '⌘W', run: () => WM.closeFront() },
      '-',
      { id: 'gi', label: 'Get Info', key: '⌘I', run: () => Toast('Get Info') },
      { id: 'tr', label: 'Move to Trash', key: '⌘⌫', run: () => Finder.trashSelected() },
    ]),
    M('Edit', [
      { id: 'u', label: 'Undo', key: '⌘Z', disabled: true },
      { id: 'r', label: 'Redo', key: '⇧⌘Z', disabled: true }, '-',
      { id: 'x', label: 'Cut', key: '⌘X' }, { id: 'c', label: 'Copy', key: '⌘C' }, { id: 'v', label: 'Paste', key: '⌘V' },
      '-', { id: 'a', label: 'Select All', key: '⌘A' },
    ]),
    M('View', [
      { id: 'icons', label: 'as Icons', key: '⌘1', run: () => Finder.setView('icon') },
      { id: 'listv', label: 'as List', key: '⌘2', run: () => Finder.setView('list') },
      { id: 'colv', label: 'as Columns', key: '⌘3', run: () => Finder.setView('column') },
      { id: 'galv', label: 'as Gallery', key: '⌘4', run: () => Finder.setView('gallery') },
      '-',
      { id: 'sb', label: 'Hide Sidebar', key: '⌥⌘S', run: () => Finder.toggleSidebar() },
      { id: 'pb', label: 'Hide Path Bar', key: '⌥⌘P', run: () => Finder.togglePathBar() },
    ]),
    M('Go', [
      { id: 'g1', label: 'Recents', key: '⇧⌘F', run: () => Finder.goto('Recents') },
      { id: 'g2', label: 'Documents', key: '⇧⌘O', run: () => Finder.goto('Documents') },
      { id: 'g3', label: 'Desktop', key: '⇧⌘D', run: () => Finder.goto('Desktop') },
      { id: 'g4', label: 'Downloads', key: '⌥⌘L', run: () => Finder.goto('Downloads') },
      { id: 'g5', label: 'Applications', key: '⇧⌘A', run: () => Finder.goto('Applications') },
    ]),
    M('Window', WINDOW_MENU_LAZY()),
    M('Help', [
      { field: 'Search' },
      { id: 'h', label: 'macOS Help', key: '⌘?', run: () => Toast('Everything here is one HTML file.') },
      { id: 'n', label: 'New Features in macOS', run: () => WM.open('about') },
    ]),
  ],
};
function WINDOW_MENU_LAZY() {
  return [
    { id: 'min', label: 'Minimize', key: '⌘M', run: () => WM.minFront() },
    { id: 'zoo', label: 'Zoom', run: () => WM.zoomFront() },
    { id: 'fil', label: 'Fill', key: '⌃⌥⏎', run: () => WM.zoomFront() },
    '-',
    { id: 'cyc', label: 'Cycle Through Windows', key: '⌘`', run: () => WM.cycle() },
    { id: 'brf', label: 'Bring All to Front', run: () => WM.showAll() },
  ];
}
/* Every app gets File/Edit/View/Window/Help; apps override the interesting bits. */
/* `order` lets an app place its own menus where AppKit puts them — Terminal has a
   Shell menu instead of File, Music slots Controls between View and Window. Without
   it, merged-in keys land after Help, which no Mac app does. */
function stdMenus(appId, over = {}, order = null) {
  const base = {
    File: [
      { id: 'n', label: 'New Window', key: '⌘N', run: () => WM.open(appId, { force: true }) },
      { id: 'w', label: 'Close Window', key: '⌘W', run: () => WM.closeFront() },
    ],
    Edit: [
      { id: 'u', label: 'Undo', key: '⌘Z', run: () => document.execCommand('undo') },
      { id: 'r', label: 'Redo', key: '⇧⌘Z', run: () => document.execCommand('redo') }, '-',
      { id: 'x', label: 'Cut', key: '⌘X', run: () => document.execCommand('cut') },
      { id: 'c', label: 'Copy', key: '⌘C', run: () => document.execCommand('copy') },
      { id: 'v', label: 'Paste', key: '⌘V', run: () => document.execCommand('paste') }, '-',
      { id: 'a', label: 'Select All', key: '⌘A', run: () => document.execCommand('selectAll') },
    ],
    View: [
      { id: 'f', label: 'Enter Full Screen', key: '⌃⌘F', run: () => WM.zoomFront() },
      { id: 't', label: 'Show Toolbar', key: '⌥⌘T', checked: true },
    ],
    Window: WINDOW_MENU_LAZY(),
    Help: [
      { field: 'Search' },
      { id: 'h', label: `${APPS[appId] ? APPS[appId].name : appId} Help`, run: () => Toast('No help needed — click things.') },
      { id: 'k', label: 'Keyboard Shortcuts', run: () => Toast('⌘Space, ⌘W, ⌘Q, ⌃⌘F all work.') },
    ],
  };
  Object.assign(base, over);
  return (order || Object.keys(base)).filter(k => base[k]).map(k => M(k, base[k]));
}

/* ---- Status panels ------------------------------------------------------- */
const NETWORKS = [
  { n: 'Ashhh 5G', s: 3, lock: true }, { n: 'Ashhh 2.4G', s: 3, lock: true },
  { n: 'JioFiber-4821', s: 2, lock: true }, { n: 'Airtel_Xstream', s: 2, lock: true },
  { n: 'TP-Link_9C40', s: 1, lock: true }, { n: 'CoffeeHouse Guest', s: 1, lock: false },
];
const wifiBars = s => `<svg viewBox="0 0 16 13" style="width:15px;height:12px">${[0, 1, 2].map(i =>
  `<path d="${['M2 9.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8', 'M5.4 6.6a5 5 0 0 1 0 0', ''][0]}" />`).join('')}
  <path d="M8 9.3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill="currentColor" opacity="1"/>
  <path d="M8 5.8c-1.2 0-2.3.45-3.1 1.2a.6.6 0 0 0 0 .9l.5.5c.24.24.6.25.86.03A2.6 2.6 0 0 1 8 7.8c.65 0 1.25.22 1.74.63.26.22.62.21.86-.03l.5-.5a.6.6 0 0 0 0-.9A4.55 4.55 0 0 0 8 5.8z" fill="currentColor" opacity="${s >= 2 ? 1 : .3}"/>
  <path d="M8 2.1a8 8 0 0 0-5.6 2.28.6.6 0 0 0 0 .87l.5.5c.24.24.62.25.87.02A6.2 6.2 0 0 1 8 4.1a6.2 6.2 0 0 1 4.23 1.67c.25.23.63.22.87-.02l.5-.5a.6.6 0 0 0 0-.87A8 8 0 0 0 8 2.1z" fill="currentColor" opacity="${s >= 3 ? 1 : .3}"/>
</svg>`;

const STATUS_PANELS = {
  wifi() {
    const node = el(`<div class="panel" style="min-width:290px">
      <div class="row" style="height:32px"><h4 style="margin:0">Wi-Fi</h4><div class="tail"><div class="sw${SYS.wifi ? ' on' : ''}" data-t="wifi"></div></div></div>
      <div class="sep"></div>
      <div class="mhead" style="padding-left:0">Known Network</div>
      <div class="row" data-net="${esc(SYS.wifiName)}"><span style="width:16px;color:var(--blue)">${ic('g-check')}</span><span class="nm">${esc(SYS.wifiName)}</span><span class="tail">${ic('g-lock')}${wifiBars(3)}</span></div>
      <div class="sep"></div>
      <div class="mhead" style="padding-left:0">Other Networks</div>
      <div id="netlist"></div>
      <div class="sep"></div>
      <div class="row" data-open-net-settings><span class="nm">Wi-Fi Settings…</span></div>
    </div>`);
    node.querySelector('#netlist').innerHTML = NETWORKS.filter(x => x.n !== SYS.wifiName).map(x =>
      `<div class="row" data-net="${esc(x.n)}"><span style="width:16px"></span><span class="nm">${esc(x.n)}</span><span class="tail">${x.lock ? ic('g-lock') : ''}${wifiBars(x.s)}</span></div>`).join('');
    node.querySelectorAll('.tail svg').forEach(s => { if (s.querySelector('use')) s.style.cssText = 'width:12px;height:12px' });
    on(node, 'click', '[data-t="wifi"]', (e, t) => { SYS.wifi = !SYS.wifi; t.classList.toggle('on', SYS.wifi); MenuBar.paintStatus(); });
    on(node, 'click', '[data-net]', (e, t) => { SYS.wifiName = t.dataset.net; SYS.wifi = true; Pop.close(); MenuBar.paintStatus(); Toast('Connected to ' + t.dataset.net); });
    on(node, 'click', '[data-open-net-settings]', () => { Pop.close(); WM.open('settings', { section: 'wifi' }); });
    return node;
  },
  bt() {
    const devs = [['AirPods Pro', 'Connected'], ['Magic Keyboard', 'Connected'], ['Magic Trackpad', '92%'], ['Sony WH-1000XM5', 'Not Connected']];
    const node = el(`<div class="panel" style="min-width:280px">
      <div class="row" style="height:32px"><h4 style="margin:0">Bluetooth</h4><div class="tail"><div class="sw${SYS.bluetooth ? ' on' : ''}" data-t="bt"></div></div></div>
      <div class="sep"></div><div class="mhead" style="padding-left:0">Devices</div>
      ${devs.map(([n, s]) => `<div class="row"><span class="nm">${n}</span><span class="tail sub">${s}</span></div>`).join('')}
      <div class="sep"></div><div class="row" data-bts><span class="nm">Bluetooth Settings…</span></div></div>`);
    on(node, 'click', '[data-t="bt"]', (e, t) => { SYS.bluetooth = !SYS.bluetooth; t.classList.toggle('on', SYS.bluetooth); MenuBar.paintStatus(); });
    on(node, 'click', '[data-bts]', () => { Pop.close(); WM.open('settings', { section: 'bluetooth' }); });
    return node;
  },
  batt() {
    const mins = Math.round(SYS.battery / 100 * 11.4 * 60);
    const node = el(`<div class="panel" style="min-width:250px">
      <h4>Battery</h4>
      <div class="row" style="height:auto;padding:2px 6px 8px"><div><div style="font-size:26px;font-weight:500;letter-spacing:-.03em">${SYS.battery}%</div>
      <div class="sub">${SYS.charging ? 'Charging' : `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} Remaining`}</div></div>
      <div class="tail" style="transform:scale(1.5);transform-origin:right center">${battSVG(SYS.battery, SYS.charging)}</div></div>
      <div class="sep"></div><div class="mhead" style="padding-left:0">Energy Use</div>
      <div class="row"><span class="nm">Safari</span><span class="tail sub">Low</span></div>
      <div class="row"><span class="nm">Music</span><span class="tail sub">Low</span></div>
      <div class="sep"></div>
      <div class="row" data-t="chg"><span class="nm">${SYS.charging ? 'Unplug Power Adapter' : 'Simulate Charging'}</span></div>
      <div class="row" data-bs><span class="nm">Battery Settings…</span></div></div>`);
    on(node, 'click', '[data-t="chg"]', () => { SYS.charging = !SYS.charging; Pop.close(); MenuBar.paintStatus(); Bus.emit('battery'); });
    on(node, 'click', '[data-bs]', () => { Pop.close(); WM.open('settings', { section: 'battery' }); });
    return node;
  },
  vol() {
    const node = el(`<div class="panel" style="min-width:270px">
      <h4>Sound</h4>
      <div class="row" style="height:30px;gap:11px">
        <span style="color:var(--txt-2)">${ic('g-vol-lo')}</span>
        <div class="sl" data-slider="vol"><div class="trk"><div class="fil"></div></div><div class="kn"></div></div>
        <span style="color:var(--txt-2)">${ic('g-vol-hi')}</span>
      </div>
      <div class="sep"></div><div class="mhead" style="padding-left:0">Output</div>
      <div class="row on"><span style="width:15px;color:var(--blue)">${ic('g-check')}</span><span class="nm">MacBook Pro Speakers</span></div>
      <div class="row"><span style="width:15px"></span><span class="nm">AirPods Pro</span></div>
      <div class="sep"></div><div class="row" data-ss><span class="nm">Sound Settings…</span></div></div>`);
    node.querySelectorAll('svg').forEach(s => { if (!s.closest('.sl')) s.style.cssText = 'width:15px;height:15px' });
    Slider(node.querySelector('[data-slider="vol"]'), SYS.volume, v => { SYS.volume = v; SYS.muted = v === 0; Bus.emit('volume', v); });
    on(node, 'click', '[data-ss]', () => { Pop.close(); WM.open('settings', { section: 'sound' }); });
    return node;
  },
  cc() { return ControlCentre(); }
};

/* Re-usable slider behaviour */
function Slider(root, value, onChange, opts = {}) {
  if (!root) return;
  const fil = root.querySelector('.fil'), kn = root.querySelector('.kn');
  const paint = v => { fil.style.right = (100 - v * 100) + '%'; kn.style.left = `calc(${v * 100}% )`; };
  let v = clamp(value, 0, 1); paint(v);
  const move = e => {
    const r = root.querySelector('.trk').getBoundingClientRect();
    v = clamp((e.clientX - r.left) / r.width, 0, 1);
    paint(v); onChange(v);
  };
  root.addEventListener('pointerdown', e => {
    e.preventDefault(); root.setPointerCapture(e.pointerId); move(e);
    const mv = ev => move(ev);
    const up = () => { root.removeEventListener('pointermove', mv); root.removeEventListener('pointerup', up); if (opts.done) opts.done(v); };
    root.addEventListener('pointermove', mv); root.addEventListener('pointerup', up);
  });
  return { set(nv) { v = clamp(nv, 0, 1); paint(v); } };
}

/* Control Centre */
function ControlCentre() {
  const tile = (body, style = '') => `<div class="cc-tile" style="${style}">${body}</div>`;
  const node = el(`<div class="panel cc" style="min-width:0;width:302px;padding:12px">
    <div class="cc-grid">
      ${tile(`<div class="cc-row" data-t="wifi"><i class="cc-b${SYS.wifi ? ' on' : ''}">${ic('g-wifi')}</i><div><b>Wi‑Fi</b><span>${esc(SYS.wifiName)}</span></div></div>
              <div class="cc-row" data-t="bt"><i class="cc-b${SYS.bluetooth ? ' on' : ''}">${ic('g-bt')}</i><div><b>Bluetooth</b><span>${SYS.bluetooth ? 'On' : 'Off'}</span></div></div>
              <div class="cc-row" data-t="ad"><i class="cc-b on">${ic('g-airdrop')}</i><div><b>AirDrop</b><span>Contacts Only</span></div></div>`, 'grid-column:span 2')}
      ${tile(`<div class="cc-row" data-t="focus"><i class="cc-b">${ic('g-moon')}</i><div><b>Focus</b><span>Off</span></div></div>`, 'grid-column:span 2')}
      ${tile(`<div class="cc-row" data-t="dark"><i class="cc-b${SYS.theme === 'dark' ? ' on' : ''}">${ic('g-moon')}</i><div><b>Dark Mode</b><span>${SYS.theme === 'dark' ? 'On' : 'Off'}</span></div></div>`, 'grid-column:span 1')}
      ${tile(`<div class="cc-row" data-t="stage"><i class="cc-b">${ic('g-grid')}</i><div><b>Stage Mgr</b><span>Off</span></div></div>`, 'grid-column:span 1')}
      ${tile(`<div class="cc-slab"><b>Display</b><div class="sl" data-slider="bri"><div class="trk"><div class="fil"></div></div><div class="kn"></div></div></div>`, 'grid-column:span 2')}
      ${tile(`<div class="cc-slab"><b>Sound</b><div class="sl" data-slider="snd"><div class="trk"><div class="fil"></div></div><div class="kn"></div></div></div>`, 'grid-column:span 2')}
    </div></div>`);
  node.querySelectorAll('.cc-b svg').forEach(s => s.style.cssText = 'width:15px;height:15px');
  Slider(node.querySelector('[data-slider="bri"]'), Screen.brightness, v => Screen.setBrightness(v));
  Slider(node.querySelector('[data-slider="snd"]'), SYS.volume, v => { SYS.volume = v; SYS.muted = v === 0; Bus.emit('volume', v); MenuBar.paintStatus(); });
  on(node, 'click', '[data-t]', (e, t) => {
    const k = t.dataset.t, b = t.querySelector('.cc-b'), sp = t.querySelector('span');
    if (k === 'wifi') { SYS.wifi = !SYS.wifi; b.classList.toggle('on', SYS.wifi); sp.textContent = SYS.wifi ? SYS.wifiName : 'Off'; MenuBar.paintStatus(); }
    if (k === 'bt') { SYS.bluetooth = !SYS.bluetooth; b.classList.toggle('on', SYS.bluetooth); sp.textContent = SYS.bluetooth ? 'On' : 'Off'; MenuBar.paintStatus(); }
    if (k === 'dark') { Theme.toggle(); b.classList.toggle('on', SYS.theme === 'dark'); sp.textContent = SYS.theme === 'dark' ? 'On' : 'Off'; }
    if (k === 'focus' || k === 'stage' || k === 'ad') { b.classList.toggle('on'); sp.textContent = b.classList.contains('on') ? 'On' : 'Off'; }
  });
  return node;
}
/* ============================================================================
   7 · DESKTOP
   ========================================================================== */
/* Resume image: paste your base64 between the quotes (only the text after "base64,").
   Leave it empty and the desktop falls back to a resume.png file next to index.html. */
const RESUME_B64 = "iVBORw0KGgoAAAANSUhEUgAAAtEAAAOVCAYAAACvd7zJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAP+lSURBVHhe7J13WBXH18e/lw6KKCiIoKCggKAUQUBEFBB7iyjW2GLUxJJEjcaSoklMYqIxiSYxlsTeYu+ioliwoSiCvSFVikjnlvP+kXvnvbu3AJb8TDKf5+Hh7syZ3ZkzZ2fPzk6RhISEEDgcDofD4XA4HE61MRAHcDgcDofD4XA4HP1I+vTpw3uiORwOh8PhcDicGiDx9vamK1euiMM5HA6Hw+FwOByOCF9fX0gkEj6cg8PhcDgcDofDqSncieZwOBwOh8PhcGoId6I5HA6Hw+FwOJwawp1oDofD4XA4HA6nhnAnmsPhcDgcDofDqSHcieZwOBwOh8PhcGoId6I5HA6Hw+FwOJwawp1oDofD4XA4HA6nhnAnmsPhcDgcDofDqSHcieZwOBwOh8PhcGoId6I5HA6Hw+FwOJwawp1oDofD4XA4HA6nhnAnmsPhcDgcDofDqSHcieZwOC8dmUyG8vJycTDnP4pMJkNZWZk4mMPhcP7RcCeaw/kPsWjRIrRt2xb+/v4IDQ3FnDlzIJfLxWKM+/fvo3///ggICIC/vz+ioqKQlpYmFgMAxMbGYuDAgbC1tYWJiQnMzc1haWmJiIgIrFq1ClKpVJwEixcvhpubG1q3bo34+HhxNEpLSxESEoLmzZujb9++4mjG48ePERQUBBcXF7Ro0QJvvvmmWIRx9OhRtGvXDv7+/ggKCsKoUaOQk5MjFmNUVFRgwoQJCAwMhL+/P0JCQhAbG8viFQoFRowYAX9/fwQEBCAiIgLr168XnENMbGwsIiMjWZoRI0ZAoVCIxYAalu369evo2LEj/P392V9wcDC6du2K8ePHY8OGDc/tzBIR3njjDTRv3hwuLi4IDQ1Fbm6uWIxRUVGBBQsWwMPDAyYmJrCwsED9+vUxaNAgXLt2TSA7ZMgQNG/eHEFBQSgoKBDEAcCFCxfg7e0NNzc3fPHFFyy8vLwcffr0EZQ3ICAAoaGhGDZsGNasWaPV7tQ5cOAAWrVqhWbNmqFly5ZYsmSJWIQxa9Ysdi+I/wICAnDy5ElxEg6H82/G29ubOBzOfwMnJycCIPhbsWKFWIzRq1cvDfnVq1cLZCorK2n48OEacuK/oKAgevLkiSDt0KFDdZ6XiOjJkycs3srKShzNmD9/vsb1rl69KhYjIqIRI0ZoyA4bNkwsxvjuu+805EeMGMHi79+/rxEvkUjo9u3bgvOoKC8vp/r162ukuX//vliUqIZlW7FihYas+K9+/fq0bds2cdIqiY+P1zjXDz/8IBYjUtpE+/btNeRVf2FhYQJ5BwcHFqdND1u3bmXxffr0YeF37tzROLf4r3Xr1pSeni44nzoRERECeVtbW5LJZGIxIiJydHTUOL/6388//yxOwuFw/oX4+PiQr68v8Z5oDuc/hEwmAwAYGhrC1NQUAPD777+LpP4iIyMD+/fvBwDUqlWLhavOoeLdd9/F2rVrAQASiQT9+vXDwoULsXDhQvTp0wcSiQQAkJCQgGHDhgnSviw2btwoDtIaBlH+LSwsAADbt29HUVGRmtT/89tvvwF6dKDtfESEP/74g4Wrs2PHDtaDq+uc6mgrh7YwKK+rwtPTE1OmTMH48ePRo0cPdq3c3FxER0dX2VsuRts1tYUBwC+//IJTp04BABo1aoSlS5di27Zt+PTTT9GsWTO9Xz9qgnp5rays8Mknn2DOnDkYNmwYzMzMAABXr17FpEmT1FL9P1lZWYiLixOE5eTk4OjRo4IwFerX69GjB2JiYtjfoEGDEBQUJJDncDj/cnhPNIfz30HV42dqakp9+vQhKHtN7927JxalBQsWsB429R7j3377jcmcP3+ehRsYGGjt4dy0aZOgt+7EiRMs7mX0RCclJTGZ/v37s9/Ozs5iUSLRNWNiYvRe/+zZsyxePd3QoUOZzO3bt1l4REQE62V2dnYmhUIhOB8RUZcuXQjKHs/IyEiWVlvPdU3L9ttvvzGZMWPGCOJyc3MFXxZq1apFubm5AhldSKVSatCgAQGgtm3bCnpktdlO9+7dWfyaNWsEcVKpVKOsz9sTra57JycnQZpt27axOENDQyovLxfEExEtWbKEyajrV/1Lgzrq+RSXgcPh/HfgPdEczn+cQYMGAfird03Vk6yOqoe6devW8PLyEkcDAH799Vf2e9iwYejfv78gHgBiYmLQrVs3drx582ZB/Iui3hs6a9Ys+Pj4AAAePHiAs2fPqklqMnDgQBgY/NUMrlmzRhyN1atXAwCMjIwQExMjjtbAyMiI6eDBgwca47zT09Nx5MgRQKl/Q0NDQbyYFymbGBsbG2zevBnNmjUDAJSUlGDlypViMa0cPXoUT548AZT1GR0dzeI2bdqkJvkXxcXF7Ld4DL2RkRFcXV0FYa+C8PBw9lsul6OyslIQDzX9Wltb46effoKRkRGg/FrAJ8ZyOJyq4E40h/MfpXfv3uwTv9iJPnv2LG7evAkonWNdnDhxgv1Wd6zEdO/enf2+ePGiIO5FUTlxLi4u8PPzw4ABA1icruEGKho1aoQOHToAAOLi4gQOX3l5OXP4o6Ki0KBBAxanj8GDB7PfYr2uWbOGTSDUp1cVL1I2bZibm2PMmDHsWH2CpD5U15JIJIiOjq4yH56enuz33LlzMXPmTK0TBl8lCQkJ7HejRo1gaWkpiL9//z6T6devHxo2bIhOnToBAJ49e8aGMnE4HI4uuBPN4fxHsbCwQK9evQAAd+7cEfRsqnpgDQwMBE6hOgqFAvfu3WPHzs7Ognh1HBwc2O+srCxBnIrx48ejdu3agj9954TS2X/w4AEAMMdu4MCBLH7Lli1Vjr9V75Fft24dC9++fTsKCwsBAEOHDmXhVREaGsrKu3XrVkGPpqp3v0WLFggICGDh2ngZZdNGy5Yt2W/V+fVRXl6OHTt2AAACAwPRpEkTBAcHw9HREQBw7do1JCcnC9LMnDkTtWvXBpR28vXXX6NJkyaYOnUq8vLyBLJiPD09Nexg+PDhYjENysrKsHfvXmzfvh3z5s0T1NmMGTMEshD1oGvT74YNG9hvbezatQvr1q1jf1u3bhWLcDicfzncieZw/sNo6zUtKyvDli1bAABhYWHMWRJTVFQkWJatfv36gnh1bGxs2O/S0lJBnIqKigqUlJRo/OlDvRdU5Qi5urqyYQ/Z2dk4duwYk9FGdHQ0jI2NAVHPscrhrVWrlt7l9cQYGBgwZ6ywsBC7d+8GAJw5cwa3bt0CqumUv4yyaUP9hUbXZEp19u/fj2fPngFq+VD1SKsQ90Y3adIEsbGxAtspLi7GokWL4ObmpjGZT53S0lING6jO0IqcnBz06tUL/fv3xyeffIKCggLUq1cP3333HSZPniwWFwzlUA396NevHxvSsW/fPlZubUybNg3Dhw9nfwMHDkRmZqZYjMPh/IvhTjSH8x+ma9euqFu3LqAcq1xZWYkdO3ZUqwdWtbqHCn0Ox9OnT9nvOnXqCOJUdOjQAWPGjBH86RvyIJfLmbOvGu6gQn24QVU9ijY2NoiMjAQApKam4uLFi3j8+DFboaFfv35s1Y3qourdhtpYa/VVUIYMGcJ+a+NllU0b6uOVVXWvD/FQDhVVDekIDAzEzZs3sXDhQoEznZeXh379+un8IhETE6NhBxEREWIxDSQSiWC1EwAICAjA2LFjBWFQrqetWqu6X79+7CXKxsaGDelQ74GvDoaGhjA3NxcHczicfzHcieZw/sOYmJjgjTfeAADk5+dj3759bCiHqamp3nHOZmZmAqdF34Yl6enp7HeTJk0EcSpGjRqFFStWCP4WL14sFmMcP34c2dnZgLIXu2/fvuxPfTzrjh07UFFRoZZSE3GP/B9//FGjscti2rZtCxcXFwDAoUOH8PDhQza+OigoqMqJdS+zbGLUNzrRVRcqioqKsG/fPkBpD5MnT2b5+Prrr5mc+vhidSwsLDBt2jTcuXMHX3zxBVvu8OnTp1i+fLlYHADw1VdfadjB+PHjxWIaNGnSBMXFxUhLS2Pj3A8fPozRo0eLRQVO/6VLlwT6ffTokVY5MUlJSSgqKhL8VeelhMPh/HvgTjSH8x9Hvdf066+/ZkMEevbsCSsrKzVJTVq3bs1+69ut7cCBA+x3cHCwIO55UXdwHj9+jF27drG/06dPs7jCwsIqJ4n17duXrSu8ceNG1mtsa2vLeqlrimo1D5lMhsGDB7Oeen29+ypeZtnUEa/EonI2dbFz5062w2F5ebkgH6phKir0OZympqaYNWsW3nrrLRb28OFDgczLwtHREevXr2dfSrZt26YxmVV9PPSVK1cE5VJNqIVoVRIxFhYWgnHbvBeaw/nvwZ1oDuc/Tnh4OGxtbQEA586dYz2w1XH2evTowX7/+OOPWj/RHzhwAHv37mXH+ratri6VlZXYvn07oByzPGLECI0/9Yl7VQ17sLS0ZCuIPHnyBHfu3AGquQydLtR7t1WTNquzVN7LLpsKIsKsWbOYQ2lqaoqRI0eKxQSoO8b9+/fXyIdqYipEEx1PnDihdRtz9bDqrnbyPDg6Ogq+ICxatIj9Pn/+PO7evQsoh8qIyzRixAg0btwYUL4AqYbVcDgcjgZ8sxUO57+D+mYr6rz77rtsEwkAVLduXaqoqGDx6huvqG+2kpOTQzY2NiyucePGtGTJEjp27BgdPHiQpk6dSsbGxiz+rbfeYmnpBTZb2blzJwsfMmSIII2Kc+fOMRkzMzN69uwZkeiaZ8+eZfLqG3qo/s6fP8/ixRuvqFDf8KNLly4snIjI09NTcL7u3bsL4lUbr0Bt844XKZv6ZisdOnSg1atX0/Lly+njjz8mb29vQV4WLFggPq2AJ0+ekJGREQEgBwcHrRvHVFRUUN26ddk5jxw5QlKplCQSCXl6etKSJUvo5MmTdPHiRfrqq6/Y+SDS/avYbEV9IyBjY2PKyMggIqL33nuPhS9fvlyQRsXXX3/NZEJCQlg432yFw+EQ32yFw+Gooz6kA8pJYyYmJoIwbTRo0ADr169nE+/S0tIwZcoUhIeHo2vXrvjuu+8glUoBAF26dMGSJUtEZ3g+1HtIdY3bbtu2LZycnADlUISdO3eKRQT07NlTsJZwdZahqwqxXqvTu/+yynby5EmMGjUKb7/9NubNm4ekpCRAOQFu3rx5mDlzpjiJgG3btrGtyPv378/GM6tjYmKC3r17s+ONGzfCyMgIZmZmuH79OqZMmYIOHTrA398fM2fOZOd79913X/kW2QEBAfD19QUASKVS/PLLL1AoFKxn2dDQEP369ROl+gv1SZNnzpx5ZUNPOBzOPxvuRHM4/yFUK2OIxzqHhISw9YONjIw0JmOpr6ghXl2jS5cuOH/+PKKjo7WOC/Xw8MDPP/+MvXv3aqxyoT4RS5wnKJ001Vhlddlz584BSie+a9euLFyMutN65swZQC3/hoaGgomRZmZmgiEA4lUdatWqxYZ2qOfV3Nycre4gLsPQoUPZNWxtbTWWylPlxdjYmOnuRcrWvHlzjRUqTExM0KBBA7Rr1w4zZszAzZs3MXfuXIGMNlT5MDIy0ruayNChQ5mDrcrHtm3b4O/vr+F4Ozk5YenSpfjxxx8F4aq6NTEx0WpDderUYedStwNzc3P2sqdtUp/60naHDx/GgwcP2JCjbt266VyWsWnTpmjXrh2Av4bBqCZNWltbA0pbEdsyh8P57yHx9vamK1euiMM5HM6/EIVCgZKSEtSqVYttd62CiFBUVAQzMzOtvdBlZWWQSCTMqdVGZWUlbt26hfz8fJiZmaFx48awt7cXiwkoKSmBkZGRxpJ5KuRyOUpLSwV5lkqlKCsrEzi2uigpKYFcLkft2rVZ+uLiYpiamjLnV53i4mIYGBhodZIqKyshlUo1HFWZTIby8nK2wYg4rrS0VHB9dYqLi2FmZsbWJ37Rsr0sFAoFy5s2e1CnoqIC5eXlsLCwEOg0NzcX9+/fR3l5ORwcHNiW42KICMXFxTA3N2d6EFNRUQGpVKqhY5lMhrKyMtSuXVvDaYfSblXpDAwMUF5eDqlUqrGDoRjV/SCRSJhsdfLJ4XD+/fj6+kIikXAnmsPhcDgcDofDqS4qJ/rldl1wOBwOh8PhcDj/AbgTzeFwOBwOh8Ph1BDuRHM4HA6Hw+FwODWEO9EcDofD4XA4HE4N4U40h8PhcDgcDodTQ7gTzeFwOBwOh8Ph1BDuRHM4HA6Hw+FwODWEO9EcDofzApSWluLWrVviYM4/CIVCgRs3bqCiokIcxeFwODrhTjTnX0dBQQHi4+Nf2LGJi4vDO++8g9zcXHEUFAoFpk2bhrVr14qjnpuMjAzs2rULR44cQXl5uThaAyLCe++9Bzc3N8yePVsc/T/lypUrSEhIwIULF3D//n1x9Etl2rRp6Natmzj4b2Pt2rVwc3NDdna2OEpAUlISTp06hbKyMnFUtdi9ezcCAgKQlpYmjtJLVbb68ccfo0ePHuJg5ObmIiEhAQkJCUhKSkJRUZFY5KWxefNmeHt7Iz09XRz1t3D79m14eHhg586d4ihUVFQgPj5eUL9PnjxBfHy8QCePHz9mW6Xrorrl/Dt1f+fOHbRu3Rp79uwRR3E4nCrgTjTnX8fMmTPRoUMHtG3b9oV6luLi4vDrr79qfeBVVFRg2bJlWh+6z8P69evRtGlTDBgwAFFRUejdu7dYRIO4uDgsWbIE7dq1g6+vL548eYKxY8fizJkzYtG/lezsbPj6+iI4OBht27ZFs2bN0LRpU+zbt08s+lK4ceMGLl++LA7+2yAiwX9tpKenw8/PD6GhoViyZIk4ulo8evQIFy9eRGFhoThKL1XZakpKilbnb+7cuQgODkZwcDB8fHxgbW2NESNGoLi4WCz6wqSlpeHq1auv1FnUh746zMzMRIcOHTBz5kwWNmPGDHTo0AE///wzC5swYQL69+/PjrVR3XL+nbp/+vQprl27prWd43A4+uFONOdfhVQqxbZt29C8eXMUFhZi//79gviMjAxcunQJJSUlAIDy8nLk5OQASmciIyODyc6cORM3b96Et7c3k6usrERiYiJMTExw8+ZNrFq1CgBQWFiIZ8+eQS6X4/r163j69Ck7D5QPqsuXLyM9PR1ZWVmQSqWC+Hnz5sHZ2RmFhYXIzc3F5MmTBfFZWVm4cuUKe4jKZDIkJSUBAGJiYtCzZ0+kpqZixYoVOHHiBPLz85Gfn4+8vDx2jpycHMFDOD09nfWKlpWVITExESkpKZDL5YDSoUhPTwcRaTz4Hz58iJSUFMhkMhamQlW2sWPH4vHjx9i3bx/kcjneeOMNpKSkMLnS0lIkJSUJevrT09MFvfAFBQXIz89nx7m5uUhKSmL1pw0iwt27d5GSkiLQs6qOpFIpLl++jGfPngnSacuPuN5VuqkpmzZtgqGhIZycnLBx40YWrtIxlGW7ceOGhiN37949PH78WBCmq260ld3c3FxgqwCYnepzyFXpb968iRs3bmD8+PFYs2YNxo8fL5AT20Jubq7A/ktLS5GZmSk4FutZG2KbRxX3qwpxfqB8sausrMT9+/dr7Cw6OzvD2dkZp0+fZmEnT54EABw/fhxQ6v3MmTPo1KkTk6mqnNevX9eaf7yA7ouKipCVlcXi5XI5Hj9+zOxWJpMhJSUFDx8+ZDLaKCoqwuXLl5muIbLVx48f4+bNmxq2Ks4PXlD3HM5rj7e3N3E4/xb27NlDAOjo0aNkZmZG0dHRLG727NlkaGhINjY2ZGdnR0RE3377LVlbW1P37t0JAAGgzz77jMUBoJs3b9K3335LdevWpXbt2hEAunbtGtWuXZsGDx5MREQ9e/akgIAAcnV1JQBUu3ZtOnv2LBERrV69mkxNTalWrVrsGmvXrmX5IiJydnamOnXq0IkTJwThpaWl1LdvX5bO3NycVq9eTdu3b2dhAOibb74RHDdp0oR69epFVlZWJJPJqKioiIyNjSk0NJSIiC5evEgAaPXq1bRz506ysLAgiURCAMjb25uKi4uZjEo3P/74IxUXF1NkZCQZGRmRubk5NW/enO7fvy/Ic1paGgGgKVOmsLADBw4QAPrggw+IiGjbtm1Uu3ZtqlOnDhkYGNC8efNYHgcNGkRERHK5nGxtbal///5ERDRjxgySSCRkaWlJderUof379xMRUY8ePVh93r59mzw9PZkeHB0d6eLFi0TKOgoMDKTmzZsTADIzM6NDhw7pzA8pbUBc72J+/vlnAkCZmZniKEabNm2oW7duNGfOHAJAycnJRGr1EBMTw/SvKq9CoaD+/fsTAJJIJNSqVSuWB211o6/s6raanZ1NHh4eBIAsLS2padOmZGNjo5bbvxgzZgwBoIKCAhYWGBhIhoaGVFBQoNMWgoODqVGjRqRQKIiIqH///uz8uvS8cOFCAkCpqak6bZ6quF915YeU5Y+KiiJDQ0OmX3VSU1MJAG3cuFEcRUREo0ePJgCUk5NDGRkZBIAaNWpElpaWJJVK6fr16wTl/UTVKKefnx/L//z580VXe37df/TRRwSAbty4QUREP/74I0FpM9evX6dmzZqRhYUFGRoaUrdu3UgqldKFCxcIAP38889ERDR//nwyNDRk+Rs/fjyRmq0OGTKE2Wrnzp1JJpPpzA9VQ/cczj8RHx8f8vX1Je5Ec/5VDBkyhJo0aUJERP369SMzMzN69uwZkbIxf/vtt4mIKCUlhUjtoTZ48GC6fPky+fj4kImJCRUUFAge7KrfnTp1oh07dlBRURHVqlWLYmJiiJSOHACaN28e7dq1iyQSCY0ZM4aIiJycnGjy5MkklUqpQ4cO1L17d6qoqFDm+C9WrlxJBgYGBIDCwsKYk/XFF18QANqyZQtlZWVRSEgI1apVi54+fcocsjVr1lBubi5t2bKFAND06dMpNTWVfvrpJwJAZ86cYU6ssbExFRUV0VdffUUAKD09nc6cOUNHjx4lqVRK69atIwC0a9cu9nB1dHSkbdu20e3bt+nzzz8nExMTunv3LhUUFFD9+vVp3LhxgrJoc6KLiooIAPXu3ZuKioqoXr16TD+qh/bjx4+pW7duZGVlRZWVlXTq1ClWPtXvtWvXklwup6ioKHJzcyMSOdGdO3em+vXr07Vr1yg5OZlsbGwoJCSEyQGgb7/9luLi4qhWrVrUtm1bvfnRVu9iqnKib926RQBo1apVlJSURABo9uzZRERMxy1btqS4uDiWx7S0NDp06BABoIkTJ1JCQgK1bNmSoHSItNWNvrKr26rK0VqzZg1t376dLC0tq+1ET506lQBQYmKiTlv4+uuvCQCdO3eOysvLqXbt2jR69Ohq6Tk1NVWvzeu7X3Xlh5TlNzY2pmXLlrGXW3WqcqJV98XOnTtp06ZNJJFIaNGiRQSAEhISaPny5QSAHj16VK1yDh06lOXf1NRUoGN6Ad2fO3eOANDXX39NRESRkZHUrFkz9tvLy4tKS0spPj6elVfdiT59+jQBoPfff5/y8vLovffeIwB05MgRJte6dWu6cOECjRw5kgDQ/v37deaHqqF7DuefiMqJ5sM5OP8aSktLsXv3boSGhuLGjRsICAhAeXk5duzYAQAIDQ3Fb7/9hp49e2oMt/j444/h4+ODIUOGoLKyErdv3xbEq1iyZAn69u2L2rVri6NgZ2eHuXPnonfv3rCzs2OfQi0tLXH16lWcPHkSjx8/hr29PUxMTARpR48ejQsXLuCNN97AiRMn0KlTJxQVFSEuLg6Ojo4YMGAA7OzsMGTIEJSUlCAlJQVOTk4AAA8PD9jY2MDDwwMA0KRJE7i7u7PJYocPH0ZcXBw8PDwglUpx4sQJHDt2DL6+vmjUqBECAgKQk5ODGTNmYMuWLQAgGELx4Ycfon///nB1dcXp06dhZGSEDz/8EG+99RZb1aAqSktLAQBmZmZISUlBQUEBkpKSEB0djUOHDkEul+P27dsYOHAgCgsLERcXh127dsHExAS9e/dmn9I3bNiAgQMH4uHDh7h9+7ZgeAURIT4+Hl27doWXlxc8PT0RHh6OS5cusc/OdnZ2mDp1KsLCwhAWFobk5GS9+VGhr96rYuPGjZBIJHBzc4OJiQkcHBwEQzoAYNKkSQgLC0OvXr0A5dCbS5cuAQCmTJmCwMBATJgwQZAGanXj4uJSZdlVXLp0CQ4ODhg+fDj69euHqKgoQbw+1OtRly0MHDgQALBr1y4cPXoUxcXFiI6OrpaeoRzrr8vmVWi7X3XlR0WvXr0wYcIEBAUFsbDqEh4eDgA4c+YMTp48CS8vL7zxxhuAMr+nTp1CixYt0Lhx42qVc86cOSz/FRUVGjrQRnV037ZtWzg7O2PXrl0oLCzEiRMnEB0dDSjzXlRUhOHDh2PRokWAcj6BOnFxcQCAd999F9bW1hg7diwA4MKFC0xmwoQJ8Pf3xzvvvAMASE5O1pkfFS+iew7ndYY70Zx/DXv27EFxcTHWr18PDw8PzJo1C1A6MQCwY8cOLF26FKmpqejYsaNglQOVo1FZWQkAsLCwYHHqGBsbi4O0YmhoCIVCAQBwcHDAgwcPMGLECHh6emLevHlicQCAn58f/vzzT7z99tt48uQJUlNToVAoBI5iVflTx9nZGZ6enjhy5AiOHz+OYcOGwd3dHfv27cOpU6fQs2dPAMBHH32EUaNGoV69emjTpo34NIIyExHMzc3Rt29f9O3bF0uWLME333wjkNeGaua/n58f07Wvry/69u2LcePGYcOGDWjbti369u0LY2Nj7Nq1C7t27ULnzp1hZWXF0nTu3Bl9+/bFnDlzsHPnThgaGrJrEJFWfZmZmUEikTAZ9TgLCwu9+VFR3XrXxqZNm0BECAkJgYeHB9LT03Hv3j2tk/lU5VEoFMx+VONLxc4w1PJVnbKrUCgUgjGr2s6rDalUikOHDsHS0hKurq46bcHZ2Rn+/v6sDuvWrYvIyMhq6RnK/InLAZHNa7tfdeVHxYvUob29PTw8PHD69GnEx8cjNDQUTk5OaNq0KeLi4nD69GlEREQAannTV06VjKoeqrqfq6t7AIiOjkZCQgJWr14NqVSKAQMGgIhARGjcuDH69u2LN954A2vXrsWoUaME11HZnEr/r4PuOZzXGe5Ec/41bNy4ETY2Nrh37x7u37+P+/fvIzw8HLGxscjOzsamTZswePBgfPDBB6isrBQsWfXBBx9g7969WLlyJerXrw9XV1fBuZ+XyspKHDlyBP7+/vj4448xatQojQfK06dP0a9fP+zevRsnTpxAYmIizM3N4ebmhuDgYGRmZuLnn39GYmIiVq5cicaNG7NeZ3Vq1aoFADh27Bji4+MBAD169MC5c+eQmJiI8PBwdOnSBatXr0ZpaSlzoi9dugQ7OztMnDiRnUMXgYGByM/Ph4mJCaKiotC8eXOBI6vOnTt3sGHDBsycORMTJ05Ew4YNMWbMGHh4eMDS0hJ37txBu3btEBoaCgMDA1hYWDCHa+3atbh16xbrRQsMDASUEw8jIiLQpk0bDT0aGBigbdu2OHDgAI4ePYpDhw4hNjYWXbp0YTI5OTmYNm0a1q1bh5MnTyI4OFhvfl6UK1euIDU1FZ999hmzyd27dwPKXnV9+Pn5AQAWLFiA/fv347vvvhOLMKpTdhV+fn7Izs7G999/j1WrVlW5asru3bvx888/IywsDPfu3cOMGTNgbGys1xYGDBiA69evY9OmTejTpw+MjY2rrefq2Ly2+1Vffl4G4eHhuHDhApKTk9G+fXsAQMeOHREXF4e7d+8yJ7o65Xzvvfewd+9erFq1Sm9787y6VygU+OSTT9gLjUQiQdu2bXH37l24ubkhMjISNjY2Gl/EgoODAQDffPMNkpOTsXDhQhgYGCAyMpLJfPvtt9i1axcWLFjA0ujLD4fzr4aPieb8GygvLydTU1M2DlHFypUrCQCtXLmSmjVrRlBO0ho2bBjJ5XI2RrFDhw4EgCwsLGjLli1ERPT9998TALpz547gt4q6devSsGHDiIiob9++5OjoyOKcnZ2pb9++pFAoKDAwkBwcHKhDhw5Ut25dsrKyorS0NCZbUVFB7du3Jygn8jRq1Ih2795NRESFhYXUs2dPNpHH1dWVTp8+TUREv//+OwGgK1euECknooWHhxMAcnd3JyKiU6dOkUQiobp165JUKqXDhw8TAHJwcGATvzZv3kzm5uYEgMLDw8nc3JzWrFlDV65cIQC0YsUKltdnz55Rr169WH5MTU3p999/Z/FERPn5+WRqakoAyMDAgBo2bEiDBw8W6G7btm1Uv359VmZVfomI1q5dS1BOKMvPz2fhs2bNIhMTE4KyDlXj29V1f+3aNTa5TiKRUHh4OGVkZBApx0TXqVOHfHx8CAA5OTnR9evXifTkR1u9i9E3JvrTTz8lQ0NDevDgAQtTKBTk5ORETk5OGjpWr1OFQsEmcVlYWNCUKVMIAKWkpGikoyrKrm6r2dnZTAeNGzemYcOGka2tLTuPiunTpzN9mJubk6+vLy1btozZjT5buH//PhkZGREAOnjwIDtndfSsz+b13a/68qNefm1UNSaaiGjfvn0kkUjI1NSU0tPTiYjYPIRatWpRXl4ek9VVzkWLFpGNjQ2bOGlubk6bN29m6VS8iO6JiE2enTlzJgtLTk4mLy8vdl5ra2tKTk7WsKWPPvqIjI2NCQBZWVnR8uXLidTG7wcHB5OxsTEZGBiwicL68lOV7jmcfyJ8YiHnX0dlZSV7yKhTXl5OpHRe0tLSqLCwkMWpT2jKysqiyspKtZREUqlU628iIplMxq6nUChIJpNpxMXGxhIA2rt3L5FypQ4oVw8Rk5+fTxkZGVrLUFxcTE+ePBEHa+RJoVBQZmYmlZaWCmTU8yY+JiIqKSlh59dXZhUlJSX08OFDjQmSNUGhUFBGRgbl5OSIo7TmURX+6NEjNlmUtOieiCg3N1djEqBqAqJCoaD09HQNPevKjy4dqNDnRCsUCg2bIqV9qM4rPr/4uKCggJ1DXd9iORXayq5uqypycnJIoVDozGN10WULMplM63mrq2dtNl/V/Uo68qOt/OpUx4kmHXYplUpJLpcLwkhHORUKBStnZmamhs5qiraykvI6qnZPTF5eHj1+/FigD7HupVKpRlukPgHx6dOngntQhbb8VKV7DuefCJ9YyPnXYWxsrDH+EwBMTU0BABKJBI6OjqhTp45YBFBOOhMPETAyMtL6G8rxq6rrSSQSwedLVZybmxvs7OwwePBg+Pj4YMKECejevTv7HKxOvXr1YG9vr7UMtWrVQv369cXBGnmSSCRo2LAhzM3NBTLqeRMfQzmuUXV+fWVWYWFhgSZNmmh8Dq4JEokE9vb2aNCggThKax5V4Y0bN4alpSULE+seAGxsbHROApRIJGjUqJGGnnXlR5cOqoNEItGwKSjtQ3Ve8fnFx3Xr1mXnUNe3WE6FtrKr26qKBg0aQCKR6MxjddFlC4aGhlrPW10967J5FdruV+jIj7byPw/a7NLIyAgGBpqPUm3llEgkrJwNGzbU0FlN0VZWKK+javfEWFtbw8HBQaAPse6NjIx0tkUAYGVlJbgHVWjLz8vSPYfzOiLx9vamK1euiMM5nP8EGRkZuHbtGjp16qTxIHpZlJeX4+LFiyguLkbTpk3h5uYmFuH8DVy7dg3Pnj1DSEiIOOqFyMzMxOXLl9GlSxcNB4vzcnlV92tFRQWOHDmC4OBg2NjYiKM5yg2ZTpw4AT8/P9ja2oqjOZz/FL6+vn91QnAnmsPhcDgcDofDqR4qJ1rzGxSHw+FwOBwOh8PRC3eiOZz/KOobqnA4/yS47XI4nNcB7kRz/hHcv38fBw4cwN27d8VRKC0txdmzZ8XBAmqSXqFQ4Ny5c0hISGB/586dQ0VFBaBc1/ngwYNISEhgmxOoSEtLw969e5GUlCQIV5GcnIzU1FRxMBQKBc6ePYuMjAwWVllZiZMnT+LYsWMoKSkRyENLmsLCQkGeExIScPnyZXEyhp2dnTjoufjxxx+xbNkycXCNuX79OkJCQuDt7Y2ioiL4+vpq6DchIUFjg4gXJS8vD4cPH8bp06c1NiG5cuUKDh48iLy8PEEaAHjy5AnbyEa18YS+OpPL5Th58iQOHDiAZ8+eCeKqshsASE1NxZYtW7B8+XIcOHAAZWVlYpFXQlZWFg4ePAi8Iv0/D9Wx3Vu3buHWrVvi4NcOmUyGDRs2aNi6mFu3buHOnTviYADA48ePcfXqVXGwBsOHD8fFixfFwa8MqVSq9T7mcP418CXuOK878+bNIw8PD5owYQLZ29vTypUrWdzBgwfJ1dWVbGxsBGnUqWn6goIC6tSpE4WFhbE/iURCiYmJdPLkSXJ2dqbo6GhycnKiyMhItrzVxo0bqVGjRjRy5Ehq3rw5ffjhh+ycRERXr16lWrVqUZs2bQThRETLli0jU1NTmjp1KpEyD66urtSrVy/y9/cnBwcHtuavrjRxcXGCPPv4+FCdOnUEadQxNDQUBz0XM2bMoNmzZ4uDa8zw4cNpwYIFVFhYSCUlJQRAY+mtAwcOUEhIiCDsRYiPjycnJyeaMmUK9ezZk3x8fKisrIxkMhl16dKFwsPDafTo0WRjY0NJSUks3dq1a6lJkyY0cuRIGjZsGG3fvl1vnZWWllLbtm0pPDycYmJiyN7enu7fv09UDbt59OgRRUREUFRUFH388cf03Xff0Ztvvkn29vZ04sQJgeyr4NixY2yd35et/+elKtuVy+Xk4OBADRs21FiS7n/NzZs36fvvv2fH+fn5FBISIlh6UxsODg5kampKycnJgvDi4mKyt7cnAFWWNTAwkI4cOSIOfmWUlZVpvY9JufTdlClT+PJ3nH8kfJ1ozmvJvn37BI18dnY2WVhYsPViY2NjqWHDhkRElJGRQQMHDqT9+/frdKJfND0R0aFDh8jV1ZUUyjWYi4uLiZTODQC6evUqKZQbaJw5c4aIiB4/fkwWFhaCzUI6duxIc+bM0XCic3NzqUWLFjRhwgTmEFdUVLANWeRyObm6utIPP/ygN42Yjz76SGPzGXWqckTKy8vp/v37GuvNFhcX06NHj9ixyomWy+UaayWXlZURKXWtWrtaLpfTgwcPBE5DZWUlhYWF0Z9//kmVlZUaD9/y8nKSyWQCJy4rK0vDadCWZ/U1c8Vp3nzzTfr222/ZsZOTEyUkJNCff/4pqKc5c+ZQTEwMkfIc9erVo7t377J4qqLOVqxYQVFRUUx23LhxNH369CrtpqCggFq2bEmHDh0iImJ2XFFRQYcOHSJ7e3tBeYqLi+nx48dUVlbG1upV1UFJSYlgzeKMjAyNdZZ16U91jqqc6NLSUsFGQiry8/OpoKBAEFaTfImpynYPHTpEkZGR5OnpSQcOHGDh6raQnp7OrlNWVkbZ2dlMThVGRPTgwQP2oqxNP6r2QEVFRYXAbtXlFQoF7d69m9q1a0dlZWXsvOrruuvCzs6O+vbtS5MmTRKE//rrrzRo0CANZzUzM5OysrIEsionuqysTLA5jAptaap7D5OyfI8fP2brlKvfx/n5+YJyFhYWEgAqLi5m+a6uzjmc/zV8nWjOa0liYiLUV4t5/PgxLC0t2XqxHTt2RG5uLtLT02Fvb4/NmzejcePGamcQ8qLpAWDRokWYPHkyJMo1mFVbY6vWSTU3N0dqaiqKi4vZtrkODg5wdnbG+fPnAQCbNm1Cw4YNERYWpnbmv5g9ezY++OADWFtbszATExM4OjoCyi2da9WqJVj7WVsadUpLS7F8+XJMmTJFHFUtli1bBj8/P4wbNw7Ozs7Yv38/AGDlypUIDAzEuHHjBJ/1ExMTERAQgNDQUISGhkIqlQIAOnXqhLFjxyIgIABffvklEhIS4OXlhbFjx8LLywufffYZAODdd9/FhQsX8P7772PChAnsvABw+fJlNG3alNlFfn4+oqKi0LVrVzg5ObEhOrryfPjwYURFRSEsLEwjjaurKw4ePIiysjJcvnwZcrkcHh4eePDggWAr5sjISFy6dAkAsGfPHnTu3BnNmjUTDP/QV2eHDh1Cr169mGxERATi4+OrtJuvvvoKQ4YMQevWreHj44M+ffqgR48e6NOnD6KiolC/fn3cvn0bAPDdd9+hbdu2GDZsGMzNzdGxY0dAWQcTJ05EcHAwWrRogQULFmDIkCHo3r07GjVqxIaQVKW/qli0aBFcXV3Rr18/+Pv7Qy6XIycnB506dULHjh3Rtm1bdOvWjQ1lqW6+nod169Zh0KBBGDJkCNauXcvCVWXp2LEjOnfuDA8PD2zatAlBQUHw8/PDmDFjAOWSd46OjoiOjkaHDh1w+PBhrfohIri4uLD6grKNOXjwoFb5ixcvYtKkSbhy5Qr8/f2xfft2VFRUwMLCAnK5nJ1DF2PGjMG6desEQ3mWLVsmuGcKCwvRtm1bDBo0CJGRkYiKihKce82aNQgMDIS7uztmzJhRZZrq3sPPnj1DYGAg3n77bYSGhgrq75133kFERATs7e2xc+dOyOVytlZ+YGAgZs+eXW2dczivFbwnmvM6kJubS2lpaTR9+nSaM2cOpaWlUX5+Pj19+pQsLS1p27ZtlJeXR/v37ycTExNKTU1laa9du6azJ/lF0ycnJ5OVlZXGDnCk3MLX39+fiIiOHj1Kbm5ugvgOHTrQunXrqLi4mNzd3SktLY2OHDki6OFMTEykgIAAksvlNHv2bK29ypcuXSJLS0vWy1udND/99BOFh4eLgwXo68178OAB+8y6evVq6tatGxER+fv7sy2YVb1HM2bMIB8fH8rPzyeZTEYeHh6s9y8wMJD69OnDekuzs7NZz939+/fJwsKCVISFhdGePXuI1Hqwbty4Qc2aNaO4uDgiZU9o3bp1KTExkYiIxo4dSzNmzCDSk2d9aSorK2n06NHUuHFjsre3p2vXrhEp69POzo6uXr1KWVlZ9OWXX5KdnR0REX344YfUsmVL8vT0pKZNm1Lr1q3Z9uEqxHUWGhoq2A3v2LFj5OrqqtduiIgaN25MT548oQkTJtBXX31FRETvv/8+2845PDyc4uPjqbKykiwtLVnPYHh4OB0+fJhIWQdjxowhhUJBx48fJwBsq+kZM2aw7dP16U/V+6yrJ/rOnTtkY2PDesovX75MCoWCxo4dSxMnTiRS9lL26tWLPv74Y6Ia5Esb+my3pKSEbGxsKD8/n+7du0e1atVi96/KFlRDczp27EiBgYFUVFRE+fn5ZG5uThkZGcz+1L9S6NLP5MmT6f3332cyNjY2VFFRoVNerEPxVxdd2NnZUWpqKoWFhbEttU+dOkW+vr6Cc1RUVNDjx4+JlDp3dnamc+fOESl1PnLkSJLL5ZSWlkbGxsZUXFxcZZrq3MN79+6lzp07kwqZTMbytXr1aiIiWr9+PQUGBhJpKXdNdM7h/K/hPdGc14rp06ejb9++WL9+PX7//Xf07dsXs2bNgpWVFXbs2IGVK1eiR48eOHjwICQSidbdsrTxoukXLVqE0aNHa+wAd/XqVSxYsAArVqwAlDuEEZFABsreyS+++AIjRoxgvZTqTJ48Gd9//73WHc+g7N1588038e2336Jhw4ZANdIoFAosWbLkuXuhAcDR0REHDx7E119/jdjYWLYaQnR0NIYPH45ffvlF0Avbo0cP1KtXD4aGhvD09BRMkJw4cSLbhMTW1hY3b97E4sWL8dtvv6G0tBTl5eVMVkz//v0xffp0QQ++p6cnfH19gb86Adi1dOVZX5qLFy/i/PnzmDt3LoKCgvD222+jsLAQ4eHhmDNnDiZOnIiYmBjcuXOH2UxFRQV8fHyQlJSEe/fuoXv37pgzZw67lrY602YfJiYmWsNVcTk5OTA2Nkb9+vVx7NgxREdHAwBKSkpYWe7du4dmzZpBoty18dmzZ5BKpcjPz4eFhQU736BBgyCRSNC6dWsYGhpi4MCBgFIv1dFfVZw/fx6BgYHsi4+Pjw8kEgni4uIwdOhQQKmD6OhoJCQksHTVyVdN2blzJwIDA2Fubg57e3t4enpi+/btLN7T0xOtW7cGALRq1Qo9e/ZE7dq12Y6h6tdVv4d06Wfo0KHYsmULiAhbtmxBdHQ0+yqhTf5Feeutt7B8+XJA2Qs9fvx4QbyJiQmICL/88gs+/fRTyOVywbWHDh0KAwMDODo6wsrKCtnZ2VWmqc493LZtW9y6dQsjRoxAUlKSYOOhYcOGAaJ7TxfV0TmH87qg/SnM4fzNrFq1ChcvXsSECRMwZcoUXLx4ET///DOg/PS9f/9+nD17Fh988AEsLS3h4OAgPoVOnjd9Tk4ONm3ahIkTJwrCHz58iD59+uC3336Dt7c3oFwtIDMzU/DZND09HU2aNMHKlSuxZcsWBAUFYfLkybhx4wa6deuG1NRUXLhwAR988AGCgoLw+++/Y8OGDZg9ezagdNb69++Pbt264e233waUKzToSwPlcAOFQoGePXuysJoyYcIE/P777/Dz84O/vz8LnzFjBrZt24YjR46gU6dOgjQqDA0Ndc7G37BhA8aMGYOmTZtWa4jAjBkz8PXXX+t8eKpfS1eexainGTlyJBYvXoyxY8di+/btqFu3LltpZOLEiThx4gTi4uLQoUMHVtc2NjYwMzNjTkJgYCBzDLTVGZT2kZaWxo5VtqHPbgoKCpjjXlxcjLKyMly9ehW7du1Cw4YNcezYMTg6OqJRo0YgIjRt2hTR0dHw8/NDt27dtO7MKH7xUnfiq6s/bUilUq0vA2I7UCgUWrej1pevmrJu3TokJyfDx8cHPj4+SE9PFwzpUKcm19Wln7Zt28Lc3Bzx8fHYvHkzcxh1yb8o0dHRSE1NxfHjx3H48GEMGTJEEH/r1i20a9cOZmZmiIyMRN26dQXx6qjuhZqk0XUPN2jQANevX0dQUBC6du2qdeiFvrZBG69KhxzOy4I70ZzXHpWDIZPJMGPGDIFzUh2eN/3SpUsRFRWFZs2asbDs7GxERUXh888/R58+fVi4h4cH6tWrh927dwMATp8+jcrKSgQEBODq1avYvXs3tm3bho8//hguLi74448/4Obmhrt372Lbtm3Ytm0b+vfvj969e+PDDz+EXC5HTEwMXFxcsHDhQnYdfWlULFq0CJMmTdJwEGpCbGws3nvvPXTu3FkQnpGRAV9fX6xatQqXLl0S9EZXh9jYWAwcOBB9+/aFlZWVOFqDwYMHo3v37hg+fLhO50aFrjzro6SkhC1Pp8LS0hIKhYJdLycnB9988w3GjRsHAGjXrh0OHTqEoqIiAMDevXsRFBSks84AoEuXLtiyZQukUinkcjnWrVuHN954Q6/dNGrUiDnn48aNQ7du3fDNN99g/vz5GDNmDObPn4/Vq1cDAB49eoTc3FzMmzcPq1evxqRJkwTXrw411V9hYSE2b94MKHfvOn36NMtvXFwcKisrERQUhE2bNgHK+2/jxo3VPv/zkJOTgxMnTiApKQk3btzAjRs3cO7cOcTFxSE9PV0sXiP06Wfo0KFYsGAB8vPz2cuLLnkLCwsUFBQIwtTZsWOH3t5aMzMzDBkyBAMHDsTAgQM1vpIlJCTAw8MDI0eOhJeXF4qLiwXx2qhJGl33cHZ2NszNzTFhwgQMGjQIFy5cEKQTY2JiAiMjI7260KVDDud14fmfshzOK2DIkCEYMGCAIMzT0xMBAQFwdHREnTp18OmnnwLKh3jTpk3RpUsXFBQUwNnZWfBZ/UXSS6VS/PLLL3jvvfcE51qxYgXu3r2LKVOmoH79+qhfvz5mz54NiUSC33//HRMmTICXlxeGDBmCrVu3wsDAAHZ2dnB0dISjoyNsbW1hamoKW1tbGBgYwMHBgcVZWVmhTp06sLKyQkJCAnbt2oWtW7ey63Ts2FFvGgBISkpCUlLSC6/l+84776Bfv35o164dLly4wBzyvn37on379ggMDMTcuXNhZGQEAwMDgcOufiyOe/PNN7FkyRKEhITg008/hZ2dHSQSiYasRCJhf4sXL0Zubi4WL16scT71Y1151pfmhx9+wNtvv4127drBzc0NJiYmGDNmDK5fv45mzZqhTZs28PHxwTvvvMMe5OHh4ejRoweaN28ODw8PpKenY+7cuTrrDMr1eV1cXODs7IxmzZrBwcEBo0eP1ms3lpaWaNSoETZu3Ii5c+ciLS0N69atw9ixY3H79m0cP36cTX50dHSEhYUF1q5diyVLliA0NBTTpk3TKK9EItGpi+roT/33lStXMHz4cJSWlqJVq1aYPHkyWrVqhZYtW+KTTz6BRCLBl19+idOnT6NFixZo3rw5HBwc2MtIdfNVE/7880+NnlQHBwd06NCB6VXfdVTH6vanQpd+oHSiDx8+jGHDhrE0uuT9/f1RWVmJli1bYt26dRrXmj59OpvEqo56XseOHYv8/Hw2lEOlP4lEgi5duuDhw4cICAhAz549YWdnx9LpKm9N0ui6h0+cOAE3Nzd07NgRR48exciRIzXKpn4uAwMDDBw4EP7+/pgyZYqGLPTokMN5XZB4e3uT+moIHM7rhkKhQFZWFmxtbWFkZCSOrpLnTS+VSmFsbCwO1otUKkVubi5sbW0FYwLVkclkWvOh+sxZkweFtjS6zi/GyMhIb09ycXExDAwM2MoBqvJkZ2ejTp06bOUJcR7kcjkMlA90bXmprKxESUkJ6tWrJzivWFZd/6qeYUNDQ4EcEUGhULBz6MqzvjQKhQJPnjwRlAkAysvL8fTpU4Gjr05RUREMlKtwVJf8/HwYGBhofC7XZTeJiYno168funfvjvbt26NWrVrIyMiAtbU1Bg0axOQ2btyILVu2YMeOHQCAa9euoXfv3rh//75evYp1UR39qf8W3yMVFRUoKSnRWDXm6dOnMDc3FwzlqEm+xOiyXbEtqpDL5czRVL+uejhEeRCXDXr0U1N5hUKBvLw8NGjQQJD2xo0b6N+/PxITEzWGvYivJ9afrvMrFApWPnEa8T1WnTTQcw+XlZWhqKgItra2TFasF/FxXl4erKysYGRkpBEHPTrkcP6X+Pr6/vXSx51oDue/iS5HhPN6UVJSgj179iA1NRWVlZWwt7dHjx494OLiwmSuX7+OqKgoREdHo1atWjhw4ADeeustvPvuu4Jz/Vv4t9ruF198gYiICAQFBYmjOBzOawR3ojmc/ziHDh1Cly5dxMGcfyjPnj3DpUuXIJfL4eXlxVYG+TfCbZfD4fwv4U40h8PhcDgcDodTQ1ROdPUHX3I4HA6Hw+FwOBwAfHUODofD4XA4HA6nxnAnmsPhcDgcDofDqSHciSZCWeZjFKZchaxE9wLz/0ZIIUfJo/uoyM0RR3E4HA6Hw+Fw9PDaTSwsuHIBxffvAMoF5A3NLVDL2QV13DzFoi+MvLQEFyYOR8GVv3ZWsnR1Q/stsWKxl07u2RO4/uUsGFvVRdtfN8OolnDHqb+LzCN7cGXGO5AYGaHr+fviaAHyinJkHzuIkgd3IK8oR+2mzWHbIRIm9WzEohwOh8PhcDj/Wl7b1TliO7WCtPCpOBi1nF3h/cUPsPJoJY56bh6s/w2p382DUa3aaD5hKgyMTdFkwHCx2EtHdV2JgSE6HTwP0/r/vzD930nmod248tG7kBgYouvFB+JoRvHdWzg/PgYVebmCcHN7R3Tcd1YQxuFwOBwOh/Nv5rVdnUNRWQkAcOwTg7a/bkarT7+DqU19lDy4g8QPxkAhlYqTPDdFd28BAOr5BcJ5yFt/iwMNAE6DR6P9pkPouO/M/8yBrglXP3kfFXm5sPJohfabD6PjnjPw/vwHWAcEi0U5HA6Hw+Fw/hO8dj3Rh0PcIC8rRYt3psPlrckAgEdb1uD6V7MBAO23HIG5vSOuzJgA0/q2aBI9HKnffQZpUSEClq6HmZ09ZCXFeLBhJZ6cPo6KvBwYmpnDqqU3nIeMYcNCLn84Hk+vXkJ5ThZMbeqjTktvOPYagIaRPQAipO/ZhrRdm1CekwmjWpaw8W8HlzET2fAFWXER7v2+DLnnT6GyIA/mdo3QJGYE7Dv3AgDknYvHg42rUfLoHiQGBrDy9IHH1E9gXMcKhSlXcWvp1zCubQWfr5exsucnnsOjLX/g2a1UkLQSZnb2sO3YBc6DRkGi3HY1bfsGZB7aDZe3JqE07SEe794CWVEh6ni0QouJM2De0AEAUJH3BA83/46CxHMoz86ExMgIls090PTNcajr5QvUoCda9XWgUfd+8P78B3E0AODavOkoS09Ds5ETUD84DABQmHIVN39YAOM6VvD95hdAlP+Sh/fweNdmyIqewcrLF+7vz0VFbjbuLP8eRbdSYNrADs3HfwCbtu1fOC0AZMcdRubh3Si+cwOy0hKY1LWGXXg3OA99C4amZpCVFGu1q2Yj30H63j9hZtsQrectZucrTL2Gm0u+hEk9a/gsWMrCORwOh8Ph/Ht5bXuitaGQ/X/vs6GpGeTlZXhyJg6ZR/bi/ITBKEi6iOJ7tyEtLICsuAhnR/bB7Z+/RfG9WzBv6ADp0wKk79mKs2/2+mv8MxGeXr2Eivy/hidUPn2KgsvnUZaZDgC4PGMCrn76AcpzMmEbEg4DY2M82LAC58fFgJRbzV6Z+Q7urvoJEkhgFxYFiZEx0ndtAQAUJF3EhXeHI+9cPKzbBKOuly9yE06i+P5tAEBp2gPknj2JrKP7WbnStm/AubEDkHl4DwyMDGFczxoFVy7ixqJ5uPTBGCZXmHoNeRdOI2nWJCR/PgOlj+6j+MFdZOzfgQsThoDkf+Xv9rKFuLvyR8hKS1HH3QsSIyNkxe7D+fGDUZ6dyc5XHeq2bgMAyNi/A5enj2NjyNXJPROHvAunWRkBoCwjDXnnTyHn5BEW9v/5n4jrX85CWXoaSh7dR8b+7Tg35g2cHdEbeedPofxJFgquXMCFd4ejNP3RC6ctz8lC4gdjkJcQDzO7RqjToiWK7tzErZ++xq0fvwIAnXZlbu+IvPOnkL53G/IunGFlebh5NfLOn4L0WSEL43A4HA6H89/gtXWiy7LSkX8pAWnb1+POb0sAAFZePrBo7Mxk5GWlMGvYCB12nkT4kUTUdnXH/fW/ofjuLRjXsUKHP48j8LetCNt9CpYtWkIhleLO8sWARIJOBy/APuqvXmPb0HB0PpmCpsPfRt6FM8iK3QdDM3O0W7MHLWd+juDfd8LMzh5Fd24iO+4QQIS8i385U81GvQuPaZ+i7S8b0eaH3wEA+RfPghRy1HZ1g+eM+Wj16XfodOA86imdUTGykmKkLpoHEKHZiAlovyUW7dbsYb2eT04dQ0HSRWGa4iL4fL0MEceS4PPVX72gJQ/voVg5RMV5yFvouO8sQjbsh+/CXxGy4SCMrepCXlqCgsvnBeeqCq9ZC1DH3QsAkHV0PxJGv4HTQ7rV+DzqyIqL4ffdb4g4loQWE2cAAEoe3Yd9516IOHoFHXaehIGJKUguw5P4oy+c1rR+A7T9ZSPCYxPh/+Ma+C1aiRbvTAcAPDl9XHB+sV3V822LOu5/jcVP+3PdXzIV5cg+egAA0LjfYEF6DofD4XA4/35eWyda1TOb/PlMSAsLYO0fjDbfrRCLoeX0z1CrSVOY2jSAxMAAeedPAwAatA+HaQM7AIChuQVzmJ8m6x+6UpB4DgAgMTJC6nefIWnOZFz95AM2FrvkwV1AIkGDkE4AgMvT38bFicORsX8HO0f94DBIDI1QeD0JcT2DcWPJFyjLSAMkEiajTmFKEuSlJQCAxm8MYeH2XfvAwMT0L5nrwnzX9fZnQ0catPsrLwDY5L/aLi0gK3qGh5tW49bSb3Bj8XxAoQAAVBYWMPnqYGZnj3br9sLn62WwCWgHAHh2IxnnxsXg2Y1rYvFqUdfbH3adugIAbNqGsPDmE6bBwMQU5g0dUMvZBQDYFwMVz5NWYmCIuq38kHV0P+6u/BE3Fs1D7rmTAIDKp5r6ENuV86BRAIDs4wdRmZ+LnOOHICsphkk9G9h17CJOzuFwOBwO51/Oa+tE23XqglaffAvfhb8ibFc8ApdvYU6xOionUwUpnV1DMwtBuIGxyV/xSkdSF7LyUvabZDL2Z+MfDPuufWATFAoA8FmwDG6TZsKisTOenIlD0pzJuDhpBEAEq5atEfz7TtiFd0Pl0wLc/+MXxEdHIO/CXw6+GPXJkobm/59viYEBGwtNct35NjA2Zr+J/pK7ueRLnIqJwo3F85GfeA7lWelQyOVqqWqGxMAQ9p17oe2vm+H/4xpAqZ+MQ7uVAtpfEKqDxMBQHAQAMDBUhhOJoxjVTVv6+CFO9O2AKzPeQdrOjSi+f0frKjAqxHZl37UPTOrZQCGV4vHuLUjfuw0A4NDjDVZHHA6Hw+Fw/ju8tk60lUdrOPaJQcOI7oIhHFVh0aQpAODp1UsC5ys/MQEAqlxv2qJRE0C5RnWrT7+Dz1fL/v/vy5/YpDwDExM0G/UuOuw4wSbN5Z49gZK0vyboWXl6w+/b5Qg/fAn1fAKgqKzA452b1K70/9RS5hnKdbJVPLuRzHqo67jrz7c68rJS3F/7KwDA79vfELTyT/gtWgkzLS8hVaGQSjWGkli3CYKhmbkgzKi2JQCgND3trwAinS8N/wvS/lyPiifZsPLyQdiuU/D/cQ2aDntbLKYTAxMT9pXg4abVyE2IBwA49vv/LwccDofD4XD+O7y2TvTz4tgrGpBIUHTnBs6/MxT3fl+GyzMmIOfEEUAigcuod8VJBDTs3APGdawgLXqGCxOG4NG2tUjfvRV3fl2M8+MGQVpYAHlpCU4P7op7f/yMnBNHUHg9CQBgaGYOk3o2uLP8e1z9+H1k7N+BvHPxqCzIA5TrKmvDwtEJ9XzbAgCufTYNN39YgDu/LsbFKSMBAHVb+cHG/69hFNXBwNSM9WhnHt2H7LjDuPbpVJQ8vCcWrZKy9IdIGNUPp2KicH3BLNxYNA9nhveEvLwMBiamcOw1EABg1dIbUK6kcmXWRJwd0QePtv01fvh1wMS6PgCgPPMxMg7sQNqOjbjx/ediMb04DRwBiaERynOyQAo56nn7o3ZTV7EYh8PhcDic/wCvnROt+oxuYGomjmIYGBmxz/iqYRoqbAJD4f35DzBv5Ii8c/G4+cMCZB3Zi1rOLvD95hc0aB/OZFVp1T/dm9S1RsDPG1HXyxcFSRdx/ctZuPrpB7jz2/eQl5XCwNgEBqamMDS3wM0lX+LS+6Nx74+fUcupGfwWrYSxZR3UcmqG7LhDSJozGZdnTEBZRhocew+E69vvC65nYPr/1/X7djnsO/eCvLwc935fhtu/LoK0sAAOPaPh/8MfbLiEoTKNelpI/n/Yh6GJKSQGBmg9bzFM6tkgffdWJH4wBs9upaJR935/pRWVW3AuEeYOTnDoNQClaQ/waOta3F/318RNm8BQBK7YitrNmgMAWrwzHVae3iC5DJkHd6Ei7wn8vlsBiZGRoI605d/AxASQSATDV/4K/0vGUGkLL5K2yYDhsA3rjIq8XFyd+x5Svp4Dh94DYWBi+tc5qrArADBtYIdG3fqyY0c+oZDD4XA4nP8sr9060aSQQyGVMudHFySTgRQK5gBpozw7E7LiIhhb1dW+qQkR5BXlf11Ly5he6bNCVOTmQGJoCDM7e40hDKp4Y6u6MLVpIIgjhRxlGY9BCsVfaUXlUVRWQGJoCImhcDytvLwM5VnpACQwb9RYa/nk5WUaedamD5LJUJaVDomhIesFV1RWCF4adOVDjOpcJJfDrGEjjfKoKMt4DIVMilqNnQGJhC0JqO7gasu/Qir9awtNNTlSKKCorBDo/UXSAoC0sAAV+Xkwb9gIhuYWf+VPAlZ+bXpU597vy3DzhwUwqlUb4YcvCcawczgcDofD+ffz2m77zeG8rpBMhriewSjPyUKT6OHwnPWlWITD4XA4HM6/nH/UZisczuvA02uJIIUCtZxd0GTgCHE0h8PhcDic/xC8J5rD4XA4HA6Hw6kmvCeaw+FwOBwOh8N5TrgTzeFwOBwOh8Ph1BDuRHM4HA6Hw+FwODWEO9EcDofD4XA4HE4Nea0mFpZlPEZZhnLbaA6Hw+FwOBwOR4mlmyeMLeuIg/92+DrRHA6Hw+FwOBxODeGrc3A4HA6Hw+FwOM8Jd6I5HA6Hw+FwOJwa8o9zogsKCpCcnIzr168jKytLHP1aUFlZievXryM5ORl3796FXC4XiwhISUlBXFwc8vPzxVE1IjMzE61btxaEyeVyXL58GadPn0ZxcbEg7t9GSUkJkpKSoFAoxFHPxXvvvYe4uDgAwK1bt/Ayhz3Fx8cjMzNTHFwj9u3bhxEj/t6dE9etW4cffvhBHPxaUZVuw8LC8PTpU3GwBur1/6qIjIxEYWGhOPhfCxFh9+7dqKysFEf9bbzovXznzh299lUVycnJGD16tDi4WhQUFCA2NlYczHiV9qQr3xkZGRr6SE9P1wjLyclBRkaGIEzM2rVr8d1334mD9fKi9SFG1T68bFutqu6eB5Wvcf36ddy7dw9SqVQs8lL5O9rEfxr/OCf6o48+Qq9evTB58mQEBwejU6dOL+x8Pg+rVq3CtWvXxMEAgO3btyM0NBTTpk3DwIED4eLigqSkJLEYZDIZevbsiWHDhmHp0qVo3bo1UlNTxWLV5qeffkKvXr3Y8ZkzZ+Di4oI333wTH3/8MVxcXLBt2zZBmv8VJ06cwM6dO8XBL8SXX34JHx8fbN++XRz1XCQnJ7MXtd27d2PTpk1ikWozd+5cwUvMjz/+iISEBIFMTYmKisKRI0fw6NEjcdQr486dO0hJSREH14hXUffqqOv28ePHWLRokSD+9OnTKC8vF4RpQ73+XxVHjx5FWVmZOPhfS0lJCT7++ONXrld9vMi9/OzZM3h7e6Nz587iqGqTm5uLM2fOiIOrxbVr1/Dll1+Kgxmv0p505XvdunUYNmyYICw6OlojbNKkSfj9998FYWIePnyI27dvi4N18jLqQ4yqfXhRWxW3PVXV3fOwfft2hISEYMqUKRg8eDDs7e0xf/78V+ZM/x1t4stArPtXyT/OiZbJZBg6dCiOHj2KO3fuIDc3F8uXLxfIFBcX62xI8vPzIZPJBGFEhLy8PEEYlL24UN6o4t7kDRs2aHWMocxj69atcfDgQVy6dAldu3bFt99+KxbDqVOnkJiYiAsXLmDr1q24ffs2mjZtKpDRll9dbNiwAW+88QYAoLS0FAMHDsSUKVNw7do1HD16FKmpqXBychKkycvL0+i5VZVVLpejoKCAhZeUlGjoVSVbWlqKkpISrXHajuPj47F3715BPABIpVKNXkIiAhGhvLxcI06FQqHA2rVr8c4772D16tUacVDWi3p5qopTZ+rUqRoNoDY7q6ioQHZ2NohIEL5gwQJB3jdt2oR+/foJZCoqKrT2IumyQ2NjY3Tp0gVbt25VkxZSVlamoTNd+nz27JnW+wAA65kRo6+OAeDJkycadlGTuldHfG5dx+q6ffDgAZYtWyaQU1FeXq5Rf9pQKBRa60VXXeuqLxUymQxFRUXiYEB5v5eWloqDNSgsLERFRYUgTFWvUPZ6VYU2fYvbGlX+q3OfaLsfVOkLCwtRXl6O2rVr49KlS2jSpAmTeZ72F8peOHH+oaNc6qjfyzXV2aZNm9C7d29kZWXhwoULgriq8ltSUqK1V1Ml++TJE0FbrFAokJubqyYJdOjQAUeOHBGE6bMndXTd38+bbxU9evTAqVOn2H1eWFiI1NRUnD59muVLoVAgNjYWPXv2ZOmqqqcnT56IgzTQVx8qXRYUFGiUS1+cCl22Kq4T6NCtuO3RVneo4hmsq+1RIZPJ4OXlhdjYWJw7dw4XL17Eli1b8NlnnwnktOlaXG5xHrTdz9rQ9dzSp2PV8dOnTwVtjjbdQkde9OlIrPtXire3N/2TGDNmDM2ePZsdh4WF0TfffENERAUFBdSzZ08KDAwkHx8fGjp0KMlkMiIiunjxInl4eJC3tzc5OTnRgQMHiIhoy5Yt1KJFC4qIiKAWLVrQ8ePHiYjo9OnTFBQURL179yYvLy+ytramI0eOEBHRm2++Sebm5mRnZ0fNmzen4uJilh8iorVr11JYWBg7fuedd2jChAkCGSKipKQkMjY2pjNnzoijdOZXF/fu3SMzMzNW3l9//ZVcXFxIoVCIRYmIaPv27eTs7Ey+vr5ka2tLX375JYvr3Lkzvf/+++Tl5UU2NjY0btw4+u6778jDw4OsrKzo+++/Z7J16tShOXPmkIeHB9nY2NCUKVOIiKi8vJwkEgkVFhYyWQMDA8rOzqalS5eStbU11alTh1xcXJjOZ86cSe7u7tShQwcKCgqitLQ0IiL64osvaMiQIeTs7EyOjo7sfOocPHiQ2rVrR1lZWWRqakoZGRksrnPnzjRjxgzy8PAgR0dH6tSpE8uXvriIiAjauHEjERF9+eWX9M477xARUW5uLkVGRpKbmxs5OTnR/PnziYhoypQp5OnpSe3bt6dGjRrR6dOnSS6Xk4eHBwEgZ2dn6tevHxERRUVF0ZYtW4iI6OnTp9S/f39q1qwZubu7k7+/P92+fZuoCjskZT336NGDHaszbtw4at26NXl7e5OBgQGFhIQQadFnSUkJderUifz9/cnb25tat25Nubm5RESUnZ1NwcHBLG9RUVE0btw4IiI6dOgQ+fn5seudOHGCWrZsSUREV65codatW1P79u3JycmJhg4dSkRU47pXUVBQQCYmJpSVlUVERH/++SfVrVuXKisriYho9erVTA8q3V68eJEcHBzI2NiYXFxc6KuvviIiIkNDQ5o8eTJ5enpS3bp1BbavTkREBI0YMYJatWpF9vb21LNnT5LL5UQ66pqqWV82Njbk4eFBb775JgGgzMxMKi0tpfDwcAoLCyNfX1/avn07S6PO9evXyc/Pj1q1akWOjo4UExNDpaWlRMp6HTp0KLVt25aaN29Obm5uGnpUoU3fFRUV1LRpU2bzy5cvp06dOhFVcZ/oa3c7d+5MEydOJFtbW+rfvz8REZmamlJOTg7Rc7a/RESTJk2ixo0bk7u7O3Xt2pWFayuXGPV7uSY6IyIKCgqiw4cP08SJEwVtur78yuVyGjVqFNnZ2ZGrqyvFxMSQm5sbS1urVi2mo0WLFhER0ccff0wODg7k4+NDTZo0of379xMR0ZkzZ9g9RnrsSR199/eL5FudZs2a0Z49e4iIaMeOHdSvXz/y8/OjHTt2EBFRQkICNWnShMnrqqf58+dTREQEBQYGUosWLcjZ2ZmuX7/O0onRVx8hISHUr18/8vT0pHr16jG71hdHyvZBpUN1W/3jjz/I0dGRvL29qWXLlpSWlqZTt9raHnHdVfUM/uCDD8jT01Oj7VFn7dq1rF1XERsbS6ampqxd0Kbr1NRUql27NhUVFbF07u7udPjwYb33s/ozsarnli4dnz59mgIDA6lXr17UsmVLsrOzo927d1NoaCi5urpSy5YtKTs7m6gabYs2HWnT/avAx8eHfH196R/pRLdv354++ugj6tmzJ3Xq1IkKCgqIiGjq1Kk0adIkIiJSKBTUqVMnWrt2LREReXh40Jo1a4iUlX/t2jXKysoiW1tbevToERERxcXFkYuLCxERxcfHk6mpKXNeFy9eTKGhoaQiIiKCnVvM2rVrydbWloYOHUpRUVFkZ2dH9+/fF4sREdGCBQvI1NSUBgwYQElJSSxcW371sWfPHkEDN2nSJIqOjhbIqMjMzKQ6derQlStXiIgoPT2d6taty5z5iIgI6t69O5WXl9Pjx4/J0NCQJkyYQAqFguLj48nS0pI554aGhjRv3jwiIsrKyiJLS0s6f/48lZWVEQBWN/RXdw9rnObPn09jxoxhcXv27KE2bdpQRUUFERF9+umnLH7+/PlkbW1Nt27dYvJiBg0aRMuWLSMiou7du9PXX3/N4iIiIqhHjx5UWlpKMpmMgoOD2YtXVXGqG3/+/PnMeRw/fjyNHj2aSPmgOXv2LBERpaSkKK/4l/zAgQPZsaGhoeDhrH7u999/nwYOHMgayenTp1NUVBRRNezw2LFj5OzszI5VXLx4kVq0aEFyuZwUCgW5u7vTuXPniLToUyqVssaPlHlT6XLSpEk0ePBgIiLKyckhHx8fpocDBw6Qevtx/PhxZoNZWVmUn59PpHyIW1paMv3UpO7VCQsLo99++41I2Q6Ym5tTbGwsERH17duXli9fTiTSbXx8PLunVRgaGtKnn35KRESXL18mExMTKisrE8iQ8jxdu3al0tJSKikpIXt7ezp69CiRnrrWV1+ZmZlkbm7O0i5fvpzdE4cOHSJ/f392Tm35ISLy8/Ojn376iYiIKioqqH379uzhO3/+fHJ2dqZ79+4REVGfPn1o7ty5gvRUhb6PHDlCtra2lJSURA0bNmR2oe8+0dfuRkREUFBQEJWUlCiv/v9OyvO2v5s2bSJPT0/mJJw6dYqoinKpo34vV1dnREQ3btygRo0akVwup/Pnz1O9evWovLycqIr8/vnnn6yzRSqV0ogRIwRtteqlTsWuXbvI1dWVtZ379u0ja2trKi4upvj4eJZWnz2po+/+fpF8qzNp0iSaOHEiERG9++67tHTpUpo9eza9/fbbRET02Wef0bvvvktURT3Nnz+fmjZtSg8ePCBS2lbPnj2VVxFSnfo4fPgwERHt37+frK2tqby8XG8ciZxo1e9Hjx6RpaUl3blzh4iIbt68STk5OVXqVr3tEdddVc9gXW2POtqc6GfPnhEASklJ0atrPz8/dp9euHCBGjZsSFKptMr7uSbPLW06jo+PJzMzM/ayNm7cOKpfvz5dvXqViIgiIyPp22+/JapG26JLR2LdvwpUTvQ/bjgHANjY2MDJyQn3799H586dUbduXUA5Huzx48eYNm0apk+fjqKiIly9ehW5ublITU1F//79AQBWVlbw8vJCQkICJBIJlixZgmnTpmH79u24e/cu+5zq7OyMrl27AgACAgKQnp6ulgv9NGrUCOPHj8cHH3yAqKgo9OrVS+snsZkzZ+LmzZto0KAB2rZtiyNHjujMrz4KCwthaWnJjk1NTTU+M6s4deoUWrRoAW9vb0CZ144dO+LkyZNMZvjw4TA1NYWDgwNsbW0xevRoSCQS+Pn5oaioCM+ePWOyY8eOBQDY2dkhMDBQ47NadTh69CgkEglmzZqFadOmISkpCVevXmXx0dHRaN68uSCNiqdPn2Lfvn3o378/ZDIZhg0bpjGkY9iwYTA3N4ehoSF69OghyKO+OG3Ex8cjOjoaAGBgYICgoCAAQNOmTbF9+3Z88803SExMrPZY/cOHD+PNN9+EgcFft+PQoUNx6tQpVn/67LBOnToan+kAwNDQEJWVlaisrERZWRlKSkpgZmbG4tX1aWRkhDp16uD333/HF198gfz8fJb3s2fPYuDAgQCABg0aoE+fPuwc+rCzs0NWVhaWLVuGb7/9FkZGRjr1UVXdq+jfvz92794NADh+/Dg++OAD7N69G+Xl5Th27Fi18wYA48aNAwD4+PiAiHR+Oh4xYgTMzc1hYWEBT09Ppnt9da2rvi5duoQWLVrAw8MDULtvAKBNmzbIy8vDsGHDcO7cOZiZmeHmzZt466238NZbb+HDDz9Ebm4uEhMTMXLkSACAiYkJoqOjBfdtly5d2JAwsa2o0KfvyMhI9OrVC8HBwZg2bRpcXV1ZOl33ia52V8XkyZNhYWHBjlU8b/sbHx+PHj16wNzcHAAQEhICVFEufVRHZwCwevVqDBw4EAqFAr6+vrCzsxOM7deV37Nnz6J79+6oVasWjIyMWP2pM3PmTPb78OHD6Nu3L3uude/eHUSE5ORktRT67Ukdffc3XjDfKnr27ImDBw8CAGJjYxEZGYnu3bvjwIEDAIBDhw6hd+/eQDXqKSoqig077NevH86dO8fi1KlOfajGSnft2hXFxcW4e/dulXHaOHfuHDw8PODi4gIAaNGiBRo0aFClbnVRnWewrranKlTDHkxNTfXqeuTIkVi3bh0AYP369Rg2bBiMjIyqvJ9VVOe5pUvHTk5OiIyMBAD4+fkhMDAQrVq1ApTrLz9+/BioRtvyvDp6mfwjnWgvLy+MGzcOO3fuxLx58/DgwQNAOT4oODgY0dHRiI6Oxo8//ojp06ezQfaqylYhk8lgZWXF5AcPHozExEStDb6hoaHGuB59WFlZoX379ujSpQtWrVqFGzduaDVEKA1q6dKlGDVqFFauXKkzv/qwsLAQjKV0d3dHYmKi1jzLZDIYGhqKg2FqaioOAkT5UP3W5aDLZDKYmJgwOW3X14ZMJoOrqyuriw8//BAbN25k8RKJRCCvzqZNm2BgYIB27drB3d0dc+fOxd27d3U2vqo8akNfnAqpVKqRHyJCSEgITp06BR8fH3h4eOjUkRht9WFsbKxxDWixw9LSUtSqVUsgAwDW1tYwMDBAYGAg2rZtiwkTJghWblE/98OHD+Hn54fi4mIEBQXB3t6e5V1bWVUYGBjorN+dO3eib9++qFevHjp06ABzc3Od+qiq7lX069cPR48exYULF+Do6IihQ4diz549OHr0KPz8/GBraytOUi30lUMdle5rUtfq9aVPlzY2Nrh+/TrCw8MRExODpUuXolGjRhg2bBiGDRuGAQMGsLGDYlvRdd+KbUVFVfouKChAnTp19K54oH6f6Gp3Vegq8/O2v7r0WFW5qoMuncnlcqxduxa7du2Cu7s73N3dUVBQoHOiXHXyq456vLb2gIg06rk650UV97eYmuZbRceOHZGdnY2TJ0+irKwMLVq0QFBQEEpLS3H69GmkpKSgY8eOQA3riYi0tsc1rQ+FQgGFQqH1XPriVOjSRU10q462OsZz3MvaiI+PR/369eHs7KxX10OGDMHJkyeRkZGBzZs3s5ekqu5nFdrKoOu5pU/HYj/HwMCA6bC6eUENdfQyqb6X9hri6uqKbt264aeffgKUPRI3b95EUFAQgoKC4O/vj9q1a6Nhw4ZwdHRkqzbk5+fj3Llz8Pf3R2ZmJurXr8/SqPe86MPc3LxaE1Gg7DUzNDSEk5MTSktLsWXLFshkMpw9e1bwAvDgwQM0a9ZMZ34B4Pz581onNDZr1gyPHj1ixhcTE4PS0lJ89NFH7OGbkpKCnTt3IiAgAFevXmUrgaSlpeHEiRPPPcN51apVgHIw/7lz5xAcHAwTExPUr18fly5dAgD88ccfgjRi/YWEhCA5ORne3t6sLqrrFK1evRo//fQT7ty5w/6GDh0q6I1ev349KioqUFFRwWY0VydOGwEBAaxuZDIZjhw5gidPnuDy5cuYP38+oqKiNG5mcXnVCQ4OxoYNG9jxH3/8wXqGquLBgwdwdnYWB+P06dNwcHDAkiVL8Mcff+Ctt94SizDOnTuHRo0aYeLEiQgNDRWsIuLr64s9e/YAykkfu3btYnEODg64f/8+8vPzIZfLWa8GlL0Uffr0weDBg9G8eXPBahhiXVS37h0dHdGqVStMmzYNXbp0gYeHBwwMDPDVV1+xrzZizM3NUVhYWK0HW3Wpqq514ePjg5SUFNy/fx8AsHLlShaXk5MDExMTjB49GlOnTkVcXBwsLS3RsWNHdOzYEQEBAWjYsCGaNm2K9evXA8oJPZs2baq2rajQp+9NmzbhwYMHOHv2LFasWIHz58+zdLruE13tblU8b/sbEBCAAwcOsB63Q4cOsRcbXeV6UQ4fPgwLCwvcu3ePtTEJCQmIjY2tsvfL19cXhw8fRkVFBWQymUZbKCY4OBi7d+9m9+GuXbtgaWmJli1bCuT02ZM6+u5vfdQk3yYmJujcuTOmT5+OiIgIQOkMRUVFYdq0aYiIiGAOVFX1FBsby1Yc2rRpE9q1a8fiVFSnPh4+fIhjx44BALZu3Qo7OzvWVuqL00abNm1w9epV3Lt3D1A+Sx89eqRXt/ranpf9DIbSUY2Pj8cHH3yAOXPmwMDAQK+ubWxs0LVrV4wfPx6Ojo7w9PQEanA/V/XcqqmOtVHdvIjRp/uXzT/OiTYwMBC8ubzzzjtYtWoVZDIZ5s+fjwcPHsDDwwOdOnVC69atkZycDIlEglWrVmHatGlo1aoV/Pz8kJeXBycnJ/zwww/o2LEjOnTogDZt2mDSpElaryM+jomJwdy5c+Hp6akxM7p27dpISEiAo6MjHBwc8P7772Pz5s1o0KABUlNTMXjwYGRnZ+Pp06do164dXF1d0ahRI5iZmWHWrFk68wsAX3zxBZYuXSq4HgB4enrC0NAQN27cAJR5OHz4MOLj41GvXj3Y29sjJiYG1tbWcHFxweLFi9GpUyf4+/ujffv2WLhwIbuJxGVVP1a9ZarHX7t2De7u7vDz88Ps2bPZeT7//HMMGDAA3t7eOHv2LBo2bMjSdevWDSdOnECrVq0QGxuLmJgYhIWFwc3NDeHh4fD09GTOgjg/6ty+fRspKSkaK12MHDkSmzZtYi8QBgYG8PLyQtOmTdGsWTPBeqe64tSvq/77888/x4ULF9C8eXO4uLggISEBtra2GDx4MPz9/RESEoJHjx4J8jxkyBB06dKF5VP9fF9++SUePnwIV1dXeHp64tq1a/j+++815LQdX7p0CUHK4STqBAUF4ebNm1i3bh2+++47+Pv74+OPPwa0nCMyMhJlZWVo3749QkNDUbt2bRY/d+5cnDp1Ch4eHoiMjERISAiL8/T0RL9+/eDh4QEfHx/Ur1+fxQ0fPhzr169HZGQk3nzzTTRu3JjF1aTuxUQrhy90794dANC7d2+cPXtWUP/q5WvVqhXs7e3h5uaGzz//XCNe27GucNWxvrrWlQbKz5sfffQRAgIC0Lp1a1y5cgWOjo4wMDDA6dOnWfl//PFHfPDBB+wc6qxbtw4LFiyAj48P3N3d0aZNG/aCpO/a6ujSd35+Pt5//338+uuvcHZ2xvz58zFmzBg2y95Ax32iq91VpRHnQRX2vO3vm2++iRYtWqBZs2Zwc3Nj94qucolRP5e+66ijbRk3Z2dntG/fHhs3btRIp34cExODpk2bwtXVFa1bt4aTk5NOWSiHzbRv3x4tWrRAmzZtMGvWLGzZsoV94VPJ6rMndfTd3+Jr1yTfYvr27Yvz58+jS5cuLKx3795ISEhA3759WZi+ejIwMICvry+6du2KFi1aIC4uDl9//TVLq6Kq+oDSSfziiy/g6emJKVOmYMWKFTAyMqoyTl0Hqt8tWrTAp59+ioCAALRq1QoDBw4EEenVrbjtUT/vizyD1alduzbOnz8Pe3t71K9fH1OnTsWPP/6IKVOmAFXoGgBGjx6NPXv2YMyYMSysuvezvucW9OhYXBZ9x9XNi/hYrPtXyj9tYqFqopQ6qhn6KoqLi9ksfnUUCgVlZWWx2Z3q4aoZ8uqIzys+Li4upmfPngnCqoNqkD/pubYqTpxfuVyukX8VI0aMoIULF4qDqaKiQjALV4VCoWAzj9WRSqUCHYvLrX6smniRn5/PJmaoU1ZWxiYVaTuPapa4elhGRgZJpVIWpq/MpMyvNlR6Vk2GKCkpEawWUlWcuh605SEvL09jAlheXh67rlheXUdiHZNyQoh4pRfSoTcVzZs3ZxMb1Rk/fjybPEdEdPToUXJ3dyfSURaFQkHZ2dmkUCjYnzo5OTkkk8lIoVBopC0sLGRh6nlTr19xmurWvTbE949YP2LdquxcFSaWFx+rEJ9HfKyrrsXnEx+XlZXR06dPiUS2W15eTpmZmVpn4YvJzc3V0JO4XsXHYrTpW3xOVd713ScqtLW7Yp2RFn0odLSBYjnxcXFxMdOjOtrKpY66XsQ6Eh+r0BZGynBttq/t+OnTp6y9UM+bWE5FZWUlm5wrDldHlz2po+/+Fp9PfKwr39rQ9gxQv1/V0VZPcrmc5HI5SaVSrc8mFVXVh/okPlW5VeiLI1H5xbqorKxkK0eo0KfbqtoeVbwY8X0jPq4p2nStQlf9VPd+1vbcqomOFQqFVhtQpzp5ER+Ldf+y+ceuzsHRzeXLlwVL6PwdqM9kfl1Rn1EsRl/c686JEycoKChIHExEROvWraMmTZrQtGnT6MMPPyR3d3dauXKlWIzDqRb/5PuE899D3YkToy+O83L4L+hY5URLvL296UW2QOW8Xty5c6da4wpfFrGxsejYsSP7FPY6olowv0GDBuIovXGvO6qF6uvXry+OAgBkZ2cjNTUVBgYG8PT0hI2NjViEw6kW/+T7hPPf49mzZ0hOTtY6nlpfHOfl8F/Qsa+vLyQSCbgTzeFwOBwOh8PhVBOVE605Up3D4XA4HA6Hw+HohTvRHA6Hw+FwOBxODeFONIfD4XA4HA6HU0P+8U709evXMXToUHHw30pYWJjWrZdfNUeOHEFhYaE4+B9BZGTkK8s7EWH37t1at1n/X6PPXgsKChAbGysOrjEFBQVITk5GSkqKzu2sq4tUKsWECRMQEBCArVu3Ij4+Xu9Odn+X7qvKhz4ePXqkc+ObV8mtW7cEm86kpaUhJydHIFMd1G3oZes7Ozsb8fHxuHXrljhKLyUlJThz5gwSExPZ2uyvgsrKSly/fh3Xr18XbC5VU9577z3ExcWJg18Z+vJdVFTENkxRD1Nt7AEAjx8/RnJyMlJTU6u9WQoAFBYW4saNGzr1dOvWrWptUy2VSnHhwgWcOXMGFRUV4mjcvHkTx44dw/Xr18VRyMjIQG5urjhYL9rSZGZm4smTJygqKkJycrLGn8pmMzIy2GYtYiorK5GSksLuQ4VCwdYdrilyuRyXL1/G6dOnBXWiT1cpKSmIi4urls5VFBQUIC0tTRz8UtCX1+pw69YtvK5z6pKTkwX7Qbwy/mlL3MXFxdGOHTvY8euwlMr/apm30NBQSkhIEAdXmzlz5mhdP/rvAMAr01lRURF5e3vTw4cPxVEaiO3pVaPPXk+cOEGdOnUSB9eYcePGkbOzM4WHh5ODgwN17dpV59q+VbFt2zby8fGh3NxcysnJoQEDBtD27dvFYoya6F4fK1eupKtXr4qDGVXlQx99+vShxYsXi4NfOS4uLnTkyBEiIkpKSiJra2uKj48Xi2kgtlF1G3pZ+pZKpTRu3DiqV68ehYeHk4eHBwUHB2us16qNX375haytraldu3YUFBRETZo0oVu3bonFXgobN24kKysrioiIIA8PD3Jzc6Nr166JxTQQt3V/95J9+vK9du1aCgkJ0ZAPDAxkx25ubuTr60sdOnQga2trmjZtmkBeFxMmTCAjIyPBmvEqVq5cScbGxjR06FBxlIC0tDRydXWlqKgo6t69O7m6urK4R48eUdu2bcnT05P69etHLi4uFBoaKrDHMWPG0OzZs9lxddCWZty4cTRjxgw6cOAAhYWFUVhYGFlaWpK7uzuFhYVR165diYjIw8ODjIyM6Pjx44L0RETDhw8nY2Nj+u2334iUZQOgdf1kfZw+fZqcnJzIy8uLwsPDydbWlrZu3apTV1KplHr06EG+vr4UHR1NDg4OlJKSIj6tVhYvXkx9+vQRB78wuvJaExYuXEgzZswQB2uQlpZG3333nTj4lXL8+HGdz9qXgWqJu39cT3R8fDz27t0rDgaUy6qIt+CVy+VQKBQaPT4VFRVae0K1pVfn6dOnKC0tFYSpKC8vZ1vR6kJ1vtLSUpSUlGiNe/LkCdslDMq3ZfFbOZTbiQcGBgrCVFswiyEijXMsWLBAowe9tLS0yrdkhUKBrKwsSKVSQbjquhUVFVr1IJPJNHZ31MWTJ0906kehUGitOxW1a9dmS3KhinS67ImI2C6R6ojtiYhYL4+23k2ZTIbs7GxxMKDFXjt06IAjR46wY322og+ZTIahQ4fi6NGjuHv3LjIyMrBs2TJA7ZyFhYWCXlEAyMvLE9gdlL22LVu2hI2NDRo0aIBNmzZp7A6Zn5/Peh/FuleXEdulPnvZsGGD1u3tVajno6o6qApt9kxEGrpQz39FRQWys7N19vDpIycnB3369MGSJUvQvn17QZy2OtBlo9Cib3061cdPP/2E48ePIyUlBUePHkVKSgo+++wzsZgGly9fxvvvv499+/bh9OnTOHv2LA4ePAgzMzMmc/HiRWzdulWQTkVV9SxGJpPBy8sLsbGxSElJQVhYGKZNmwZoaavVj7W1ddDRJqgoLCzU6J3T15boQ1++q4NMJsM333yDEydOIDExET/88AMSEhLEYhpUVlaiZ8+e+PnnnzW+VixatAjR0dHs3hV/QVDdAytWrICfnx8OHTqEffv2CbaCf+utt+Dp6YmrV69i+/btuHXrFlxdXdkumq+Crl27Ii4uDnFxcWjZsiVmz56NuLg4HDhwAFAr8w8//CBIl5GRgcOHD6NTp04aZa0JpaWlGDhwIKZMmYJr167h6NGjSE1NhZOTk05dnTp1ComJibhw4QK2bt2K27dvo2nTpuJTVwtt7ZXY9sVh2torXXlVoc1nED//pk6dii+//JLJq84vTvfgwQP2DKou2vIMtXKJn58qSkpKNGz9VfKPcqKXLVuGxYsXY+vWrXB1dWWf48rKyjBo0CCEhITA1taWfRI/c+YMQkNDERoaCi8vLyQmJqKwsBDR0dFo2bIlgoKCEBAQgDt37gAADh8+jLZt27LrnTx5Eq1btwaUznO7du3Qp08fuLm5wdLSUrA174IFC+Dv749GjRphwYIFLFyMtbU15s6dC39/fzg5OeG9995jcVZWVpg0aRK8vLywZMkSAMAnn3yCJk2aoHPnznBycmINBQC0aNECFy5cAJRbb/v5+aF///7w8PBg6QFgzZo1aNKkCSIjI+Hp6ckcI7lcjtDQULzxxhsAgBkzZrAyfvjhhyy9OuvWrYOnpydiYmLg6Ogo2ILcysoKs2bNQps2bTT0sHz5cjRs2BCBgYEYMWIECxeTlJQEb29vvPHGG/D09BRs7dqtWzdMnToVrVu3hoeHB3r16qXhcKioVasWG8qgK50ue9q6dSvc3d0RExMDNzc3Fq7NnhYsWIDhw4cjMDAQgYGBcHd3x+PHjwEA27Ztg5eXF4YPH46OHTuyvOmy17NnzzJ7QxW2Ul1MTU3Rpk0b5sh369YNkyZNQosWLZhud+zYgaZNm6Jz586wt7dn9fbbb7/hiy++wO7du9G8eXOkp6ejW7duzCG6dOkSWrZsifDwcLi6uuLgwYOASPf67FKXvYwYMQJnzpzBtGnT0KJFC60vEOr50FcHVaHLnn/99VdEREQwufT0dNSpUwfFxcV477330KZNG0RHR8PR0RFnzpxRO6N+Kisr0a9fP7z11lsC29ZVB7psVB11fevSaVV88803mDNnDho2bMjCOnfurHWrYXUWLlyIwYMHC7ae9/DwQOPGjdlxcnIyjh49yo7VOXz4MFJTU8XB1SYkJATZ2dm4efMm6tatK3hJ9/LywtGjR7W2dQBw8OBB+Pj4aLQlKSkpaNOmDUJDQ+Hq6opBgwaxFxJdbUlNUeX7eXBycoKDg0O107dp0waNGzfGn3/+ycKOHDmCWrVqCZ53Tk5OOH78ODt+55138Mknn8Da2hqJiYnIysoCANSrVw9Q7kkQGxuLr7/+mtmJgYEBPvvsMxw5cgQZGRnsXH83I0eOxOHDhwXDIJYuXYoRI0bA3NxcIFtT1q1bBzMzM0F7bG1tjYCAAJ26sra2Rm5uLnNUzc3NBS+a1UVXezV06FDBS++mTZvQoUMHQDl0SVt7pSuv0OIzPH78WOvz76uvvsKkSZMAZTs8atQoBAYGon379mjatCmSk5Nx6dIlDBo0CI8ePYKrq6vWbdzF6MrzmTNn0L59e/Tp00fj+alQKDB69Gi4uLjA09MTv/zyi+isr4h/2nCO+fPn05gxY9hxfHw8mZqa0oEDB4iUnz5CQ0NZnEQioW3btjH5999/nwYOHMg+U06fPp2ioqKIiOjAgQOkrg/1zwHffvstu25GRgZZWlqyT0CGhobsc9nly5fJxMREYztoFYaGhjRv3jwiIsrKyiJLS0s6f/48i5s8eTKT3bVrF7m6ulJBQQEREe3bt4+sra3ZFptOTk5sy+c2bdrQn3/+SUREBQUFZGNjQw8ePKBHjx6RpaUl3blzh4iIbt68ybYZNTQ0pLS0NCLldq0GBgbsk6eu/N++fZtt2RkfH0+2trYsTpceMjMzydzcnH2+Wr58uc7hHFlZWWyr25KSErK0tGTpIiIiqGvXrlRaWkolJSVkb29PR48eFZ3hL9SH2OhLJ7anrKwssrW1pUePHhEpP6W7uLgQ6bCn+fPnk7OzM927d49IOVRg7ty5REQUHBxMe/fuJVLTZ1X2qv75SZ+t6EP1KVQmk9Hp06fJxsaGDSOIiIigoKAgthV7ZmYm1alTh65cuUJEROnp6VS3bl06c+YMkfJznfrnXvXP4B4eHrRmzRoi5dbAqs/T6rrXZZcqOW32orrO2rVrSRfq+dBXB9pQH86hy55zc3PJ1NSUfZZeuHAhRUdHExEJPsPOnz+fBg4cyI714eLiQt7e3qy9UVFVHYhtVJudqPStT6e6yMvLIwCUnJwsjqqSVq1a0U8//SQOJlIONXny5An9+OOPNGLECHry5Am7t/Pz8+nJkyc0aNAgWr58OT158qRaQ8vUhz7cvXuXAgMDac6cOUREFBgYyHblPH/+PNnb27PtodXbOqqiTfDz82NlqqiooPbt29OXX35ZZTp96Mv32rVr2VAP1Z+Xl5dgOIdqKFBpaSmtWLGCrK2ttW4XLWbMmDE0f/58WrFihWDISPfu3Wnt2rW0ePFiiomJISKiGTNm0PDhw4mU5ba2tqbr169TeXk59e/fn2rXrk1Tp05l214fOHCA7O3t2TnVqV27NhuqpG1oRlWMGTOGnJ2dBTpxcHDQGDoQGBio0U64uLhQfHw8DRs2jF23rKyM7Ozs6MGDB9SnTx/6+eefiZ5zOMekSZNYWyBGl66IiBYsWECmpqY0YMAASkpKEqTTh/pwDl3t1e7du9lzioioR48ezIZ1tVe68qrLZ9D1/Bs3bhz73bRpU9a+f/jhh9S9e3ciZV7V81cVuvKs7/n5559/UvPmzam4uJikUimNGDGCD+eoLs7OzujatSsAICAgAOnp6SyuefPm6N+/Pzs+fPgw3nzzTfbmPHToUJw6dUrjk4EYQ0ND1iOWl5cHY2NjGBoasvhx48YBAHx8fEBEeid0jR07FgBgZ2eHwMBA1psMADNnzmS/Dx8+jL59+6Ju3boAgO7du4OINCZCFBYW4tKlSzhx4gSmTZuGzz//HEZGRrh+/TrOnTsHDw8PuLi4AMrea227jpmamqJHjx7o0qULtm/fDhMTE7EIAMDFxQWnT5/G999/jx07dmgM/dCmh0uXLqFFixbw8PAA1MqvDTs7O2RlZWHZsmX49ttvYWRkJLiGqifBwsICnp6egrrWR3XTJSQkQCKRYMmSJZg2bRq2b9+Ou3fvsiE8YnsCgC5durBPc+r2179/f7z77rv46aefBJ/e9NmrGH22oo8ffvgBrq6umD17Nn7++WdERkayuMmTJ8PCwgJQfmZs0aIFvL29AQCNGjVCx44dcfLkSSavjdzcXKSmpjJdWFlZwcvLSyCjzy5VaLOX50FXHVSFLnu2sbFBjx49sGHDBgDA+vXrMXLkSABA06ZNsX37dnzzzTdITEzUuAf0MXToUJw7d07w6fR560AXNdWpqakpoPwcW1NMTU11pnv//fcRGRmJb775Bnv37kVkZCS6du0KhUKBzp07IzIyEocOHcIXX3yByMhInV+/xFy4cAFNmjTB4MGD0bt3b3z88ccAgDFjxuD3338HlD12w4cPF7TRYrS1Cbm5uUhMTGR1bWJigujoaEFdaEtXHXTlG8pe4M8//5z9xcTECNICwODBg+Hj44N9+/YhNjZWazuui8GDByM5ORlJSUm4ffs2EhMTMXDgQIHMmDFjsH37dhQVFWHfvn1wdXVFy5YtYWpqim3btuHIkSO4evUqfHx82KRebcMiiAhSqRQSiUQcVSM6duwo0Il6r3l1GD9+PH777TdUVlZi3bp1CA4OhpOTk1isxuizeX26mjlzJm7evIkGDRqgbdu2gqF71UVXe9WtWzcUFRUhISEBeXl5OHHiBAYPHgzoaa905VWfz6Dt+adOVFQU03Hv3r2r/bwSoyvP0PP8PHv2LLp3745atWrByMiI3cOvmn+FE62OoaGhYJyM+EaWyWQaDauxsfFfO88YGGgdYwMA9vb2uHLlClq3bo0333wTa9eu1Ti3Cn3nESOTyQQOq/o5teWViNhDT4WqIevduzeio6MRHR2NXbt2ISIiokaN2a5du/Dxxx9j8eLFGDRokDgaUI6B+vrrr+Hi4oKgoCCdjQnU9FCTPOzcuRN9+/ZFvXr10KFDB5ibm+u8hriuq4u+dDKZDFZWVkyPgwcPRmJiInM6qyqH+rmnTp2KPXv24NKlS/D29tY6q15fXsSIbUUfkydPxv3793H8+HEMGDBAEFeVjUHNsdKF6qVA3+d+fXapjZrcN/qojk5VOtBnzyNGjMD69euRmpqK7OxsdO3aFUSEkJAQnDp1ig0F0GWf2vD19cXChQvRv39/5tw+bx1Uh+rotFatWnB0dNQYE1kd3N3ddab77bffcOXKFcybNw/R0dG4cuUKzp07BwMDA1y8eBFXrlxB79698dVXX+HKlSvVHjMZEBCAR48e4dy5c5g1axaMjY0BpaN45coV3Lp1C5s3b67RQ1RlMyqbFdeHrrqojq2p0JVvALC0tERQUBD7c3V1FaQFgI0bN+LmzZvYvn07fH19xdF6sbCwwPDhw7F06VL88MMPGDt2rEZb0rx5c7Rp0wZbt27F+vXrMWrUKEF8UFAQDh48iHr16mHXrl1wdXVFbm6uxtCpy5cvQy6Xw9PTUxBeUxwcHAQ6sbW1FYvoJSQkBHZ2dti6dSt++OEHNuzgRXF3d0diYqLeehfrSoWTkxOWLl2KUaNGYeXKlYI0+qiqvTIyMsLQoUOxfv16bNmyBd26dYO1tXW12itxXvU9r3WFa6Mmzyt1qpNnFer3n758v0p0PwFfU8zNzZ9r8pCK4OBg1rsEAH/88Qd7q3FwcMD9+/fZJKh169YxuWPHjiE8PBw///wzVq9ejbCwMBZXU1atWgUoB9ufO3cOwcHBYhFAmdfdu3cz52vXrl2wtLREy5YtBXI2NjZwc3NDRkYGa3A8PT3ZeNirV6+y5ZJSUlLY8j/quiwtLcWzZ8/QpUsXLFu2TDA2Tp2DBw9i0qRJ6NWrFywtLcXRWvHx8UFKSgpbxklf43H48GH06dMHgwcPRvPmzTUmv71sxPbk7++PzMxM1K9fX+8DrTpkZGSgVatWWLlyJYqLi/Hw4UOxSJXospU9e/ZUe0ykPgICAnD16lU2LjUtLQ0nTpxA586dxaICGjZsCEdHR2zfvh1QThw8d+6cQEafXVaFuF5eBqqvCRkZGezrjj577t69O3JycjBjxgwMGzYMhoaGePLkCS5fvoz58+cjKipK8CBVKBT4/ffftY7hVmfs2LGIiIhATEwM5HJ5lXXwsnSxf/9+3L17VxwMKF+6Pv30U1y7dg1QTupZtmwZysvLceXKFcTHx4uTAAAmTZqETZs2CcbbHjhwoEaTBcXou54+ateujQEDBmDUqFFwdnZmX75QAx02bNgQTZs2xfr16wGlHjZt2sSeEfrIzs7Gli1bxMGvHH31qs748eOxfv16rF+/HuPHjxdHA8qJgkuXLsXRo0dZR8revXvx7NkzQPkVNj8/H82aNYOrqys6duyIyZMnszHjeXl5mDRpEkaNGsXuMV1UN98vwrhx4/DBBx9ALpcjPDxcHK0TfXUZExOD0tJSfPTRR+ylKyUlBTt37tSpq7Nnz+LBgweA0rl88OABmjVrBuix95q2VyNHjsTmzZuxZs0a9gKpr73SlVd9PkNVxMbGsnHoGzduREhICKC8/woLCwXOsK7615dnffj6+uLw4cOoqKiATCbDH3/8IRZ5JfzjnOhu3brhxIkTaNWqFWJjY2FgYCDoDVM/FscBwJdffomHDx/C1dUVnp6euHbtGr7//nsAgKenJ/r16wcPDw/4+Pigfv36LH2nTp0QGxuLVatW4dNPP4Wrqyv27dun9TriYzHXrl2Du7s7/Pz8MHv2bPbGLk43bNgwtG/fHi1atECbNm0wa9YsbNmyRevb3dq1a/HFF18gMDAQ7dq1Q4cOHVBeXo4WLVrg008/RUBAAFq1aoWBAwcyQx4yZAi6dOmCfv364cmTJ/D390fHjh3xxhtvYN68eeJLAADeffddvP322wgPD8e6detQu3ZtFifOv+rY2dkZH330EQICAtC6dWtcuXIFjo6OWnU0fPhwrF+/HpGRkXjzzTfRuHFjnfUpPlZHPU4sp34sticnJyf88MMP6NixIzp06IA2bdqwHgzxebSFqR8PGDAAwcHB8Pb2Rs+ePeHh4aFXXhwHPbYybNgwnZO1tJ1HhTjOxcUFixcvRqdOneDv74/27dtj4cKFOm1SdSyRSLBq1SpMmzYNrVq1gp+fH1vNRD2NLrsUy4mPY2JiMHfuXHh6empd0UVdVt951JkwYQKaNGmCwsJC9OzZE6jCno2MjDB8+HDs27eP9crZ2tpi8ODB8Pf3R0hICB49esSu9ezZM4waNUrn+tUGBgash/Pnn39Gfn4+vvjiiyrrQGyj4vJVVxezZs3S+XL8/vvvY9SoUejUqRN7Qbpy5QpMTEzw+++/49dffxUnAQC0bdsWGzZswPTp02FtbY0GDRpg8eLFqF+/PpOJiorS2Qs4depUdOrUSRCm73ri8okZO3Yszpw5o9ELrd7WQct51I/XrVuHBQsWwMfHB+7u7mjTpg1bbUJfurNnzwomm6sjTqeOtjhxmPhYHX31qp7O09MT/v7+6NKlCxo1aqQRDwDR0dG4f/8+unTpwhy3K1euwNnZGe7u7vDw8MBbb72FqKgoQDnMSS6Xw9raGu7u7mjZsiUKCwuRkZHBJhZaWlri22+/Rd26dVG3bl32QlLdfL9I2PDhw1FaWorJkydrjTczM4ORkRHq16/P8hcXF6e3LmvXro3Dhw8jPj4e9erVg729PWJiYmBtba1TV6qFCVxdXdGoUSOYmZlh1qxZgB5737hxIxwdHbFy5Upmf/raq9atW6NJkyZIS0tDly5dgCraK1151eUzVKVrKF9Cu3XrhhYtWuDUqVP46quvAACtWrWCvb093Nzc8PnnnwN66l9fnsXXUz+OiYlB06ZN4erqitatW8PJyUkjv6+Ef9rEQiKiyspKys3NFRyL47X9VufZs2dsgp6YwsJCNiFFld7d3Z3i4uKYzNy5c2n8+PECGRXiY3VUk4Dy8/OpvLxcEKcrXWVlJZuQo46tra3GBIW8vDw2EVGdyspKwSQHFer5kMvllJGRQRUVFWIxASUlJfTs2TMiIqYn0pJ/8XFZWRk9ffqUSLlupi7U61f9/FKplBQKhc5jddSvLZYTH4vtiYhIoVBQZmYmlZaWCsLFZZLL5YI8io9zcnI0JkyJz6HLXp/HVkiZB116EZddhUKh0DpRSVwecXqFQkFZWVl67YB02KVYTnxcXFzM7EyMej7EeRQfq9BVRl32TMo04nyRsjyq+0SV5o8//qDevXuLJP8fbedWX4dZV/5Ii43qshlxXlXHd+/epWbNmrH7Tx9Pnz5leZXJZOTh4VGtCa3FxcUadlpTqnM9sR7VuXv3LllYWGgtp/p9JLZj8TEpJ5eK2ymxnPrxqFGjaNGiRWrSQvTlW1ucepi2eKpGvYrbAplMpmFz6sdyuZyaNm1Khw4dYmGknGiYkZGhoQ8VxcXFlJmZSXK5nKRSKX366adkY2NDp06dEosSPUe+dYVp04s4TJxn9fLqoqq6VFFRUaHRvuvSlULLM6Uqe8/NzdUoj772SiaTaYSRjvaK9OSVlG2H2GcQty/qba1qkqFUKtXajqnaN4VCUWX9k548i/MgPn769CmbTK2tXC8L1cTCf6QT/b9g/Pjx5OfnR3PmzKF33nmHXFxcKDExUSxWJS9jY5aUlBSKjo6mJk2avPBDi/P68jJshfP3MWzYMI2HzuvCggULtG4+URVHjhyhhQsXioNfGS96venTp9OQIUPEwa+c3NxcGjZsmIaT96p53nrVxb59+8jR0bFajmZVFBYWajiYKl52vl8mf2ddvqi9v06or9RRFa9z/VcXlRMt8fb2ptd128bXjdu3b+Phw4eoXbs2fHx8nmudx9jYWHTs2BFGRkbiqGpTVFSEc+fOwc/PD9bW1uJozr+El2ErHM5/iQsXLqBx48aC9a451efu3buoqKjQmHfD4VTFgwcPUF5eDnd3d3HUvxJfX19IJBJwJ5rD4XA4HA6Hw6kmKif6bxh1zeFwOBwOh8Ph/LvgTjSHw+FwOBwOh1NDuBPN4XA4HA6Hw+HUkH+sE52dnY1bt26Jg2tEZGQkCgsLxcFVQkTYvXs3KisrxVGAcu1TbYunqygsLMSpU6eQlJQkWHz85s2bSE5Oxq1bt7Tubnfr1i3B5iNpaWnIyckRyOhCKpXiwoULOHPmDCoqKsTR/3PCwsLw9OlTcfAr53mv+7y287z8+OOPCAwMxEcffSSOYshkMly6dAnHjx/XuTh+VTIqG7x9+7Zgq/LqkJ6ejri4OLapAABUVlbi+vXruH79Ou7du6dxToVCobGNvTolJSU4c+YMEhMT2cYGVVFQUIDk5GRcv35dYze1l8nz2s6Lcvv2bbYmt5iCggLcuHFDHMwR8SI28t577yEuLk4c/EqIj4/Xue7460RV7aG2tqEqjh8/jrCwMLYm9etEVlYWkpOTNf6quwV8Vdy6dQuveq6aLj/kedB1T/wd5fif809d4q5du3ZkZGT0QkuAAXiu9EVFReTt7U0PHz4URxERUVhYGG3cuFEcTEREBw8eJHt7e+rfvz+1a9eOhg8fTkREmZmZBIDCw8MpNDSUGjRoQEOGDBEsmeXi4kJHjhwhIqKkpCSytram+Ph4Fq+LtLQ0cnV1paioKOrevTu5urqyuDlz5uhchujv5H+1nNvzXvd5bed5yM7OJjMzM7pz5w6lp6eLo4mI6OjRo+To6EhhYWHUo0cPatCgAY0cOZJKSkqqLaNug23btqUGDRrQpk2b1K6im/nz55OTkxMNHDiQ3NzcaMWKFUREtHHjRrKysqKIiAhq27Yt2djY0Lx589janmlpaQRA63qev/zyC1lbW1O7du0oKCiImjRpQrdu3RKLaTBu3Dhydnam8PBw8vLyoiZNmtDWrVvFYlpZuXIlXb16VRyslee1nRchOzubJBIJ2djYaKyxKpPJyMXFhQwNDen27duCuH87cXFxtGPHDnGwTl7ERiIiInS27y+bAQMG0Pbt28XBrx362kNdbUNVeHl50bp16ygtLY3oNXpWkXKJtrCwMAoNDSUAFBQURGFhYTRz5kyxaLUQtzsLFy6kGTNmCGReJrr8kOdF1z3xqsvxv+QfvU70zZs3ycnJiXr27EnffPONIE61KHd5ebnGRhmkXHxbtVC5+o2vSqe+UDcpFxN/8uQJO1ahbUFz1YYo+pzosLAwWrZsGTtWpRE7E8XFxTRw4EAKDQ1l61WqnOjs7GxydnamtWvXsvPo45NPPqGBAweyY/WNWwwNDVkjRXr0QMr1M8Xrh6rk5XK5xkNdRU5OjlYnSR11h0R9A4DqnP/p06ca62Xr21BA/VibI5SXl6e1fnXZDhFRaWmpxmYiKnSdTxvaypKYmEiNGjUShKnz7NkzatCgAa1evZqFFRQUkI+PD3322WfVlhHb4IYNG6h27doai9mLqaioIBMTE0pJSSFS6leli7Vr11JISAiTvX//Pnl5edHs2bOJtFxTRWJiIpmbm9PZs2dZWEpKCj169Eggp40xY8aw8xMRHTt2jCwtLdkLqIqcnByNDZciIiI07iu5XE6ZmZkaelDZTnFxseBlRUVhYaHGJj6ktKOsrCxxMFVWVuq0IRVpaWlkaGhIPXv2pCVLlgjiNm/eTN26dSMrKytKTU1l4eXl5ZSVlaWx7q3KJtU3l1JHm35ImX9tmymQjjIoFAp2bfGGMWJZFdruGX1twfz582nMmDGCMH1U10aKioo0niMqh6FSyyZY6mVVHYvbTF3tobY2RD2tvvKr0HVufeiy7+d9lqqjr21QUV5errU8derUEbw0i59Vutp0bcfabFlVV2VlZRp50mZ/2igrKyMAgnyp0GXf2u5/cbujnv//Y++8w6I62r//ZUEQBKQJUgQUQRARFBFU7L3GHmOvSayxxpJiEmNMNMXEaNTExBJLjJqosUexYO8FewMbAoLS637fP7I7z+5hd0Fjnof83vlcF5eemXvaPffMuXfOnDm6NqW0Ny3P2+/G/BAtxurOEsaEFq3u/ql2GJtbS5rTXib/aid62rRpnDFjBjds2MCaNWvqxVWoUIHTp09ncHAwHRwc+Mknn4i4JUuW0NnZmUFBQRw4cKDewG/dujXHjBlDV1dX9ujRgyT5/vvv09PTk2FhYfT29ub27dtFXlZWVuJGcvToUXp7ezMoKIiNGjViUFCQUSe6W7du7NGjR7GvAhpyJp4+fcoKFSpw7969pMaJ3rZtGxs2bMiPP/5YJ7Vpvv76a1avXl1vkisqKmJQUBAB0NfXl926dSON6GHTpk309fVlnTp16OrqqqfT1q1bc+LEiQwODqa7uzs7deokBs2JEydYo0YNtmrVira2tnR1dTWqF61D8ujRI9aoUUM4e6byj4uLY926dRkSEkIvLy+++uqrzM7O5pYtWxgcHCzyHjt2LDt06CCuBw0aJA6413WiL1y4wDp16rBZs2b09/fn/PnzRRpTtvPGG2+wdu3aDA0NpUqlEk6jqfyUGGvL+fPn6eXlRXNzc/r5+XHjxo3KpPzhhx8YEhKiDObKlSvp7+9fahmlDcbHxxOA0clUi1qtprOzMz///HNlVDEnmiT//PNPWllZMTs7u1iZWl577TUOHTpUL6y0KB0kalaxGjduTJI8d+4ca9euzejoaPr4+LBfv34kyYEDB9La2ppubm709/dnZmYmV61axcDAQDZp0oSurq789ttvRZ7m5uYcNWoUAwMD6ezszAkTJpCaL4o1b96c9erVY2hoKGvXri0m/F9//ZU1atRg69at2bRpU5HXtGnTRDlRUVEGb8rUcaL/+OMP1qhRQ89ha9iwIbdv367nRL/11lsMDg5mdHQ0PTw8ePjwYZLk4cOHGRUVxS5durBWrVp0cnISDqQx/VBjR/7+/mzatCnNzMzo6+vLW7dukSbaMHv2bPbt25cRERH08fFhvXr1+PvvvzMkJESshmkxNWaMzQULFy6kk5MT7e3t6efnV6qPOJRkI2lpaezUqRMjIyMZFhbGfv36iZtyy5Yt2a9fP9asWZNeXl5s0aKFcCanT5/OiRMnijw//PBDjho1iixhPjQ2h7Rp04br168nTbS/pLxNYcq+X/ReqoupueHp06fs0aMHq1WrxsDAQNarV088QalVqxbNzMzo7e3NyZMnF7tXlXaON2XLWrv09fWll5cXWYL9GcKYE21sLBga/4bmnU8++UTYzezZs9mvXz/Wr1+f/v7+rFGjhsjvRfvdmB9CE3UvaUysXbuWBQUF7N69OwcPHkySL70dpuZWU3PaP8G/1okuKiqip6cnL1++zLy8PDo5OfH48eMi3tzcnB988AFJ8uzZs7S0tGROTg4fPXpEa2tr8Yt46dKlegO/ZcuWjIqKEitKmzdvZvXq1YUDsW3bNjo5OYlfs7rOV0hICJcsWUKSPH78OB0dHQ0aAEnevn2bISEh9Pb25vz584URG3Mm6tatK34x+vn5MTQ0lG3atNGTKYnc3Fz26NGDtra2nDRpkt4WEeWve6UeHj16RHt7e547d44k+eDBAzo4OPDIkSNCvl27dszOzmZWVhbd3d2F09+pUyfx63rt2rVs3769KEeJubk5L126xJCQEC5evFiEm8q/bt26YtLPy8tjdHQ0P/nkE2ZlZdHGxkZMyAEBAaxYsSIzMzNZWFhIZ2dnXrt2TZSr7cfw8HDhpKalpdHZ2Zl37941aTunTp1iQEAAizSfpA0MDBT2aCw/QxhrC0mePHmSnp6eihT/YerUqXzttdeUwTx16hQtLS2pVqtLJaNrg6mpqRwxYgSjo6OVSQyyc+dOOjs7MzIykps3bxbhhpzo9PR0AuDly5eN2n1ISIjeDf15MOQgbdmyha6uriTJxMREsRKSlZVFOzs70bfKFaEbN26IFbpDhw6JPKixnY8++ogk+fDhQ9rZ2fHkyZMsKCjQ207RsmVLMYYbNGjAP/74g9TcgEly69atDA8PF3PBBx98YHRVVetEFxUV0cfHR9wkTp48yerVq1OtVus50dp2UbNaq30idejQIVpZWXHHjh0kya+++ko4kMb0o1araW9vL+aLN954g5999hlZQhtmzZrFqlWrMj4+ngUFBQwODmb9+vX59OlTpqen08HBgadOnSJLGDOm5oK/uxJNhY1MmjSJY8eOJTWOYPPmzYVdtGzZkh07dmR2djYLCgoYGRkpnMSpU6fyrbfeEnnOnDlTfMXN2Hxoag7RXeEz1X5jeZdESfb9IvdSJcbmhgkTJrB3797ih8CUKVP07m0VKlTQG0e696rSzvHGbJkam3FyctJb7TZlf4Yw5ESbGguGxj8NzDu6X/+bNWsWfX19efv2bZLkK6+8wvfee4/8G/1uzA8xVfeSxsTq1av52muvccCAAcK5ftntMDW3mprT/gm0TvS/7sXC3bt3w9XVFf7+/lCpVOjVqxd++uknPZk33ngDABAWFgaSSE5OxunTpxEQEICgoCAAwIgRI/TSAMC4ceNgY2MDaMrp2rUrHBwcAAAdOnQAyWIvQWVlZeHixYvo3bs3AKB+/fqoXbu2nowuVatWxdmzZ/H5559j4cKFaN++PdRqtVJMkJOTAysrK3Hdr18/HD9+HCdOnNCTM4WVlRU2bNiAPXv24MKFCwgLCzP5soquHmJjYxEQEIDQ0FAAgIeHB5o1a4aDBw8K+UGDBsHa2ho2NjYIDg4WL1eYm5sjKysLAJCcnFziFx779u2LNm3aiP7TYij/lJQUnDlzBoMHDwYAWFpaomfPnjh48CBsbGzQrl07bNmyBbdv34aDgwMaNmyI3bt348iRI/Dw8EBAQIBeGc+ePcPp06dx4MABTJ48GR9//DEsLCwQFxdn0nbMzc2Rn5+P/Px85OTkICsrC+XLlzeZnxJTbSkthl66y8/Ph42NDczMzEotAwC+vr5o2rQpVCoVNmzYoCdvjLZt2+LOnTvo2bMnBgwYgA8++EApIsjJyQE0dmkMKyurv/2yiy6648jNzQ2JiYlYtGgRPv/8c1hYWCA1NVWZBADg5+eHw4cPY/78+fjtt9+KyWltwd3dHZGRkThx4gQsLCxgb2+P5cuXY/bs2UhNTRXpevTogdGjR+Pbb78VL1nu3bsXZmZmmDFjBiZPnozz58/jwoULeuUoUalUGDFiBBYuXAgAmD9/PsaMGaPXj9DMN5s2bcLcuXNx5swZvfr7+vqiXbt2AICIiAgxbk3pR6VSiZeeU1JSxJguqQ1t2rSBt7c3LCwsULt2bfTq1QsVK1aEnZ0d/P39cf/+/VKNGUNzwctC10b27t2L+/fvY/LkyZgyZQoyMjL02tO/f39YW1vDwsICnTt3xvHjx3VyMoyx+dDYHGIIY+03lndJlGTfL3ov1cXY3LB7924MHDgQKtVfbki/fv0QGxtbqnFf2jnelC0DQM+ePeHv7w+UcA94HkyNBUPjvzS0bdsWVatWBRRj9UX73ZgfYqruJY2Jzz77DDdv3sTy5cthbm6uU9p/+LvtMDW3wsSc9k/yr3Oily9fjkePHiEwMBCBgYHYtWsX1q1bp3dqhS4qlQpFRUUoKCgodoNRohtfWFhYzBBIFrvxawdCSXnrYm5ujl69euHgwYOIiYkxesrIw4cPcevWLdSrV0+E1alTB/PmzUOPHj2QnJysJ18SUVFR2LlzJxwdHbF582ZltKAkPcCEA2Rubo6ioiJA41gsXboUYWFh2LRpEz777DOluB6TJk3C8uXLcfPmTWWUQJu/1iFU1k1br+7du2Pz5s3YsWMH2rVrh86dO2Pr1q3YsmULevTooZcGOg5mly5d0LNnT/Ts2RObN29Gy5YtTdqOk5MTVCoVIiMjUb9+fYwcORK1a9c2mZ+SktpSEn5+fgbfgD569CiCg4NLLaPl7t27uHDhAhYvXgw3Nze9OFPY2dlh8uTJWLp0KRYvXqyMFhw6dAguLi7w9fVVRgkCAwOf64diSRw6dEiMo99//x1du3aFo6MjmjRpAmtra6M37kmTJuGzzz6Dn58foqKijMpBMz9YWloiPj4edevWRWZmJqKiouDu7i7STZo0CVu3bsXp06cRGhqKzMxMFBYWonr16sJO3n77baxdu1aZfTGGDRuGnTt34vjx49ixY4f4EaaFJBo1aoTY2FiEhYUhKCjIaP11x60x/ZBEtWrVMHjwYISEhMDKyko4UM/TBq3TpHtN8rnGDBR1fhno2khhYSEaNGgg6rFgwQJMmTJFmQTQ6Xfo3G8MYWw+NDaHlMTfmWu1PI99P8+9VImhucHQvaVcuXKlzrs0c7wxW9aivNfhOezPGKbGgqHx/7y8jH6HET/EVN1LGhMDBw7EvXv3sGnTJp1SjPMi7TA1typ52fODMf5VTnRaWhq2bNmC48eP4+bNm7h58yZu374NR0dH/P7770pxPcLCwnD58mXcuXMHALBs2TKliB4NGjTAli1bhJFv3rwZdnZ2qFmzpp6cg4MDfH19sXXrVgDAqVOncP78eT0ZLSTx66+/io69efMmLC0t4eHhoRTF7du30b9/f3To0KHYhDpixAi0bNkSr776qshr69atePz4sZ6clj/++APp6ekAgCdPniA1NRXVqlUDAFhbWyMtLU2R4j9ERETgwoULuHLlCqA5Vu/AgQNo3bq1UrQY+/btw5tvvonFixfju+++E79AjdGmTRtMmjQJXbt2LXFyqVy5MqpWrYrVq1cDAPLy8rBu3TrxK7RTp044deoU1qxZg7Zt26JTp07Ytm2bUSfa2dkZNWrUwMOHDxEVFYWoqCgEBwfDysrKpO0cPnwYnp6e+Prrr7FixQoMHz68xPyUlNSWkujduzdSUlIwd+5cMaGcO3cOc+fOFZNcaWRMoVarsXz5crFaoEt8fDwOHz4srm/cuCHsSxe1Wo1Dhw5h4sSJePfdd4s5U7qMHTsW69atw8aNG0XYjh07cP78eZN1UZKfn4/ly5dj+fLl4njA3bt345VXXsFrr70Gf39/vR/gyvGwc+dOjB07Fp07d4adnZ0I1/Ljjz8CABISEnD06FE0aNAAx48fh4eHB8aMGYPGjRvr2fLDhw8REhKCZcuWITMzE/Hx8WjUqBEuXbqE0NBQYSuurq46pRimcuXK6NSpE7p06YI+ffqgYsWKevHJyck4e/YsZs2ahTZt2pT6hmJMP4mJiUhISMDMmTOxbNkyzJ49G9bW1gDwwm3Q5XnGjBJlv/1dG2nUqBGuXbsm6lGvXj3Y2tqKNGvWrEFeXh7y8/OxadMmNGzYEADg6emJs2fPgiRSU1PFfQEm5kNjc8jzYCzvkvRQkn0bwtR8qMTU3NCgQQOsWbNGxK1YscLknKfs49LM8cZs2RB/x/50MTUWDI1/GGhbaTHW7zDhE5jyQ0zVvaQx4enpifXr12PEiBHFntiXhKl26GJqbv1fYfwuVgbZsGEDIiMj4e3tLcLMzMwwaNAg/Pzzz4Dm17LuzVl77evri+nTpyMiIgK1a9fGuXPn4OXlJWSV6fr374/o6GgEBAQgPDwcM2bMwPr16/VWHLTy3377LSZMmIDQ0FC88847aNiwoVEHYeXKlXB1dUVgYCD69OmD1atXw97eHuXLl4eFhQW8vLzg7OyMdu3aoWPHjli/fr1Iq1KpxC/37777DqmpqZg9ezagqe/evXuFrC7nzp2Dr68vAgMDERQUhOHDh4uzN/v27Yu2bduiW7dugAE9+Pn54auvvkLz5s1Rr149REdHY968eWL1Uimve928eXOsXr0aS5YswdixY+Hv72/wbGLopJs+fTqCgoLEY0RT+f/888+YM2cOwsLCEBgYiPDwcHEDqlixIpo3b45r164hMjISVapUgaenJ8zMzFCrVi2D+a1atQqzZ89GZGQkGjZsiCZNmiA3N9ek7URFReHatWv4+eef8cUXX6BevXp4//33TeZnCFNtUepAScWKFbFz5078/PPPcHBwQI0aNdC+fXvMnTsXr7zySqllVCoVzMzMDK4EpaenY8iQIUa3Ab355pvw9PSEr68vNm7ciO+//x4AYGtrixMnTsDd3R0uLi6YNGkSFixYgLfeegsAhN27uLjAwcEBDg4O2L9/P+rXr481a9ZgypQpcHJyQqVKlfDVV1/BxcWlxLrY2dlh/vz5qFy5Mjw8PLBx40YcPXoUERERAIABAwZg9erVaNWqFQYOHIgqVaoI/b766qt47733EBwcjIyMDIwePRqvv/46WrRogZ9//lnvpmFjY4N79+6hRo0aqFOnDmbMmIHg4GC0atUKOTk5iI6ORuPGjWFrayvy79WrFxo0aIDQ0FB06tQJQUFBePXVV9G0aVPUqFEDLVq0QHBwsPhBpUSlMwcAwMiRI5GSkoIxY8boyahUKri6uuK1115DvXr10KhRIyQkJIh6KG1K99qYfipVqgR3d3esXLkSCxcuRNeuXdGyZUuo1WqTbTBVlvLa1Jgxla59+/Y4cOAAQkJC8Oeff/5tG5k1axbu3r2LoKAgNG/eHLVr1xaOgUqlgoeHB4KDg1G1alX4+Phg2LBhAIDXXnsNmZmZqF69Olq3bo06deqIOhqbD03NIbptNNV+Y3mXpAdT9m2sPFPzoSGMzQ2ffPIJ4uPjUb16dQQHB+PixYuYP3++SKcsX3mvKs0cb8yWDeWPEuzPENr5UjcfU2PB0PjXptGdd3Trpqyn7rWxfkcJPoExP8RU3UsaEyqVCo0bN8ZHH32Erl27Ijc396W0QxdTc6up/P9R/k0vFuoel6IM174coTymR3mdk5MjjtPRfZmpoKBA7013LYaOMdKG61JUVCRO6ygsLDSYl5aMjAy9l/tKi/LIFl19KOujJC8vjw8fPiz2Ahc1x81oj1Uzpge1Wm3wWCulvPb60aNHLF++vN7bv40bNzZ67rCy/tprY/nrkpKSYrBdRUVFeuGFhYXFdKgsl5rjjQydSGHIdt58803x8g01ZzEHBgaKa5rIzxDG2mKonoZ48uQJHz16VExHupiSUepHy4oVK9ilSxdlsB4pKSmlbufzkJmZqXfsX2nqUhL5+fnirW5lmzMzM8VpC9S8kKS91pXV9tOTJ0+KHUuoVqv5+PFjqjXHOunqOikpyeB5t/n5+UbHqC7K+iptQxn/5MkTMQ5145TpdK8N6WfdunVs1qyZkMnLy6OFhYXecV2G2lBUVKRXbmFhod48bqi9hsaMcuwrr3Xr/DJshBpbUB5Hpq1vVlaWwaPZqKk/NXZQWFhocj40NYfotlHZ3tLMtaXRgzH7NmUfNDIfGsPU3JCenl7s+DkaKI+KexWfY45X2jIN2KUuhuzPGMbyMDQWaGL86847unVT1lN7barfaUR/upjyQ4zVnSbGhK5tauv0MtqhxNTcqmyz8vplon2x0Cw0NJSG9kpKJH+H/Px8REREoGrVqggNDcW1a9dw+/Zt7Nmzp9hj538zq1evxowZM9C7d2+oVCps2bIFU6ZMwdChQ5Wi/2oGDBiAL7744rkf0f8TlKW6/P/E1atX0bx5c7zyyiuoVKkSYmJiEBQUJFYWyxJlzUZMzYd//PHH35pDTOU9ZsyYMqUHycvDVL//m+6x/9Z21KlT568nEdKJlvxTqNVqnDt3DikpKahcuTJCQkIMbhX4t/P48WNcuXIFKpUKwcHBcHZ2VopIJP8nyM7Oxrlz55CTkwM/Pz+TL4dK9DE1H/7dOcRU3pL/u/xf6fd/YzukEy2RSCQSiUQikTwnWif6v7DrWiKRSCQSiUQi+b+FdKIlEolEIpFIJJLnRDrRL8CqVavwxRdfKINfCuPHj8f+/fuVwYDmi0qxsbE4f/680QPGlSQkJKBr166Iiooy+lGX/xX379/HpUuXcOXKFaSkpCijXzqmdFvWiIuLQ79+/ZTB/xgvatPXr18XH3Epqc6tWrXCs2fPlMEvhdLW35QNmIr7b9K0aVM8ffoUJLFlyxbk5+crRV6ItLQ0/Pnnn8rg/xmm+kzXrkzJ/a942X3zMihp/Bniv23zhw4dMnrcXlnin5yrXhYv0t+lQTv/vChlbZ75p/n/xon+8ccfcfHiRWXwCxEfH48bN24og18Kly5dQmJiojIYu3btQlBQEObPn49Ro0Zh0KBBShGDzJs3D+7u7ti6dSs8PT1fqh7+LtqzO0eNGoV69eqhYcOGBr+q97IwptuySFpaGk6fPq0MLpH33nvvhQ6gf1Gb3rJlC9atWweUos579+4Vn/x+2ZS2/qZswFTcf5PDhw8jNzcXWVlZeP/991+4Tvfv38eXX34pri9evIhPPvlET+Z/iak+07UrU3L/LZS6/Lt9809Q0vgzxH/b5hcsWIBjx44pg8sc/+RcpeVF52otL9LfpUE7/7woZW2e+af51zrRqampxb7Apb3Oy8srNgDWrFmj9yVB7Wdsc3NzxaqPWq3WS6PM3xSZmZl6ZZYmP2UaU8yZMwfvvfceNmzYgMOHD+Prr7/Wi8/LyzP4yzkhIQF169ZFpUqVUKFChWJ6UNbJ1HVeXh4eP36stwqu1KMuhvpIl8LCQsydOxcxMTG4e/cuevTogZYtWyIpKUlPTqmnl6nbZ8+eIS8vTy9M2yYARlfIDeWvrcOzZ88MTkLa+OTkZL36G+s7JSTx5MkTZbAec+bMKdYPMNJOYyg/J6+rD+21tv6TJk0yOWEWFhYiIyNDGVyM1NRUZGdnK4MN6tmQHRoiOTnZ6JfaCgoKSvWFMEPlKzFWH62O0tLSitmnqTgttra2OH36tN7HpUgatMn09PRitnH37l0sWrRIXDdp0gR79uzRk4HmK6bGxpOhuRSaUzpSU1OVwYCBsVjSNTR60KUkuypNv8CEnKHxoK2XWq0uNh6VulT2jam0yvYqr2GkPqbGHTRjy9AX6WCkDENhhjA2bxuyMUPzvyldrFu3TnwsRbd9yv7XkpycLD7HbQhtWdnZ2Xrzh7E2qNVqg+MHJcxVxubeoqIiqNVqcc8qTZu0GJurjdXd2NiHpm+UabTXxsYwjIx9QxiyT2h0prxfGJpnCgoKDLbVlA3/W/jXOdEXL15E3bp10aNHDwQFBek5kxUrVsSMGTMQHh4ODw8PzJkzBwAwaNAgHDlyBJMnT0ZAQACysrIwZ84c9O/fH0FBQQgJCcH333+P5s2bi7wePHiAihUrGr0Ja3n69Ck6d+6MVq1aoWHDhujfvz+KioqwZMkStGzZUsg9ePAA9vb2yMzMNJrGFE5OTti7d694fOjo6AhojLtnz56oWbMmoqKiEBERgZs3bwIAhg8fjj///BPvvPMOmjVrVkwPDx48gI2NjTDiTZs2wcXFBQUFBQCA5cuXi6/ZjR8/HuHh4ejZsye8vLxw5MgRQDMR6OoRJfSRKSZNmoSaNWvi22+/Bf5h3V6+fBnh4eFo3Lgxqlevjj59+oiJZs6cORgyZAgiIyMRHR2NqlWrii8zmcq/ffv2GDt2LAICAtC/f3+98qCxz7Fjx6JWrVr4+uuvTfadkl9//RWBgYF49dVXUaNGjWKPYNVqNWrWrImioiI0btwY3bt3B0pop5KbN28iKipKtPny5csAgHfeeQeTJ08WcrNmzcLYsWMBAJ9++qn4v5KlS5eicuXKiIyMNPrkJCcnBy1btkT37t0RHR2N3377DdBM7q1bt0a9evUQFBSEjz/+GDBhh7qcP38eoaGh6N69O4KDg4v1xR9//IGwsDDUrl0bLVu2NHjjNNXPuhirz5EjR9CkSRN0794djRs3RqVKlcTKqqk4JRUqVBA3qZUrV8Lb2xutWrVCcHAw7t+/j+zsbLRo0QItW7ZEy5YtERoaiidPnuD06dPo06cPEhISUL16dXz22Wc4evQoateuLfL+7bffULVqVbRu3Rru7u5ivoSJuRQApk6dioYNG+KVV17B22+/LcK11K9fHxs2bAA0TpCVlRVOnjwJALhz5w6cnZ2FLm/duoXo6GhERkYiMDAQ9+/fB0zYVWn7xZj9mBoP7du3x6RJk1C7dm0EBQWhc+fOUKvVBnUJRd8YSwsAjRs31vv8d+vWrfHrr7+WWB9T427Dhg2oVasWBgwYgGbNmgkZLQMGDMDMmTPF9S+//GJQThdj87YxG4OR+d+ULtq3by/aPmfOHAwYMACRkZHF+v/kyZMIDAxE37594ejoCDc3N4NjpGLFipg2bRrq168Pd3d3LFmyBIMGDULjxo3h5uaG2NhYITtz5kx4e3ujdevW8PHxwY4dO0ScqbnK2Nx75MgRNG7cGI0bN0atWrVw5swZk23SYmyuNqZ/GBn70Myfffr0QaNGjeDq6qq3jcLUGDY19nUxZZ/Lli1DzZo10atXL6hUKlStWhW3b98uNs9Mnz4dtWvXxiuvvIIGDRqIupdkw/8a/k1fLCTJ8PBwbty4kSSZlpZGZ2dn3r17lyRpbm4uvvx09uxZWlpaMicnhyTZsmVLrlq1SuQza9YsOjk58fr16yIva2tr3rx5kyQ5d+5c9u7dW8jrMmvWLL7xxhskyUmTJnHs2LGk5ks6zZs356pVq5iSkkIrKyvGx8eTJOfNm8eePXuaTENNPdeuXasp6T/cvn2bISEh9Pb25vz588XXfSZMmMDevXuLL4BNmTKFbdq0Eek6duzI77//Xlwr9dC0aVMRP2zYMFpbW/PPP/8kSXbt2pVLly4lSV6+fFmkmTVrltCNUo8soY908fPz4549e/TCJk6cKPI2pqeXodu6devy22+/JTVfV4qOjuYnn3xCatpUtWpVUee3336bHTp0KFX+UVFRzMrKoiHMzc05btw4cW2q7w4dOsQaNWqQJBMTE+nq6sqEhASS5P79++nn5yfy0cXc3Jz37t0T16baqYuyzZMmTWKnTp1IklOnTuVbb70lZGfOnCnsX3cs6Nb50aNHtLa2FnazdOlSAuCjR49EPiS5a9cu1qtXT1xrx+ubb77JoUOHkpovWx09epQswQ619UhMTBRfGc3KyqKdnZ1I17JlS3bs2JHZ2dksKChgZGQkP//8cxGntQ9T/ayLsfocOnSIVlZW3L17N0ly+/btdHJyYm5ursk4avpQqyft/xMSEmhnZyfmp2vXrjEpKYkFBQW8ceOGpgZ/tWHRokWkpg66dqLsH3t7e547d44k+eDBAzo4OPDIkSOkibk0NzeXKpVKfHFN21+6zJw5k/369SNJrlq1itbW1nz33XdJkvPnz2ffvn1Jjb58fX15+/ZtkuQrr7zC9957T8QZsrHS9osx+zE1Hlq2bMl27doxOzubWVlZdHd35969e0kDuqSin0yljYyM5G+//SbSNW3atFTzkKlx16BBA/7xxx+kTh/o9u+OHTvo4+MjvubWoUMHYRe66Nq8sXnblI0Zmv9N6UK3PFP936lTJ9Gva9euZfv27UX+upibm3PWrFmkRs7MzIyrV68mNflr57DNmzezevXq4iuE27Zto5OTEzMzM03OVabm3kOHDtHMzIwbNmygFlNtUqKcq43p39jY184jO3bsIEl+9dVXbNy4scjP2BguzdjX2rUx+1Sr1bS3txf1f+ONN/jZZ5+RCjvcunUrw8PDhb/ywQcfcNiwYaQRG/43of1i4b9qJfrZs2c4ffo0Dhw4gMmTJ+Pjjz+GhYUF4uLihMwbb7wBAAgLCwPJYo8adOnZsyf8/f0BAA4ODujWrRtWrFgBAPj5558xePBgqNVqvPHGGxg+fDhGjBhRLL+9e/fi/v37mDx5MqZMmYKMjAxcuHABzs7O6NixI9asWQNovmw3ePBgk2lMUbVqVZw9exaff/45Fi5ciPbt20OtVmP37t0YOHCg+EZ8v379EBsbW+zRsjF69OiBLVu2AABiYmIwceJEbNmyBbm5udi3b59Yia5atSo2bdqEuXPn4syZM3qPcnX1WJo+MkVOTg6srKwAE3r6u7pNSUnBmTNnRBpLS0v07NkTBw8eFDJt2rSBj48PAKBLly5iJa2k/MeNGwcbGxtxrWTatGni/6Xtu2PHjsHMzAxff/01Jk+ejE2bNuHWrVsGtz/oUpp26qLb5m7duuH48eNKkVJz+vRpBAQEICgoCAAwYsQIpQgAIDw8HE+ePEH//v1x/PhxlC9fHtC8gNSzZ08AgEqlQlRUFFCCHWpxc3NDYmIiFi1ahM8//xwWFhZ6cv3794e1tTUsLCzQuXNng+0sqZ+1mKqPr68vWrduDQBo164dMjMzcevWrRLjDHH8+HEEBQXBz88PABAQEIBKlSrBwsIC9vb2WL58OWbPno3U1FSDOlESGxuLgIAAhIaGAgA8PDzQrFkzPdswNJdaWVmhY8eOaNu2LTZt2gRLS0shr6VHjx7Yvn07CgsLsWvXLkydOlXMMVu2bEGPHj2EbNu2bVG1alUAQEREBB48eCDiDFHafjFkP6UZD4MGDYK1tTVsbGwQHBxcYn10ed60pamPMXr06IHRo0fj22+/FU8OdWnTpg3UajViYmKQnJyMgwcPok+fPkoxgal5uyQb053/tZRWF8b639zcXDwFTk5OFvOCIYYPHw4AqFu3LmxsbNC3b19xrV313L17N7p27QoHBwcAQIcOHUASly5dMjlXlTT3+vv769kzTLTJFKb0b2zsQzOPtGvXDjBSlqExXJqxj1LYp0qlEnu6U1JSDPbR3r17YWZmhhkzZmDy5Mk4f/68GK8l2fC/hX+VE63dG9WlSxf07NkTPXv2xObNm/Ue7euiUqkMPurTovwizvDhw7Fy5UpcvHgRKSkpaNOmDVQqFfr37y/+tINQS2FhIRo0aCDqs2DBAkyZMgXQTCSrV6/GlStX8PjxY2HsptKYwtzcHL169cLBgwcRExOD69evo7CwEObm5npy5cqVK9Y2Y3Tr1g179+7FyZMn4eXlhX79+mHr1q3Yu3cv6tatC1dXV5BEo0aNEBsbi7CwMAQFBek5erplPW8f6UIShw8fRr169YAS9PR3dKuto1JvWuddSWFhoXAWSsq/JL0rdaWsg6G+KywsRMWKFUWZr732Gs6cOWPSWccLtFMXkqLNJY0jQxQUFBRrhyGcnZ0RFxeHFi1a4NVXX8XChQsBI+lLskMtv//+O7p27QpHR0c0adIE1tbWBuWgaKcuJfUznqM+0DzCVavVBssyFafFkD6geemubt26yMzMRFRUFNzd3Y3WQRdDtgcTtqFrA5s3b8b777+Pr776yqBjFhISAhcXFxw8eBAHDx7E5MmTkZSUhAsXLuD06dNirCoxNzcv0c5K0y8woq/nHQ+lqY8xdNMaGz8l1cdYOmi2vm3duhWnT59GaGhosRfUVCoVhgwZguXLl+OXX35Bx44dxRZAQ5iat0uyMaWelZRWj7py7u7uWLp0KcLCwrBp0yaxhcYU2sUI3WttPQ3ZO0lYWVkZtBUtJc29xtJpKW3bTenfVP10KaksrT0Z0gUMjANT9kkS1apVw+DBgxESEgIrKyuDCyWFhYWoXr26aNPbb7+NtWvXAqWw4X8L/yon2tnZGTVq1MDDhw8RFRWFqKgoBAcHF+t8Q1hbW5e40b9Zs2awsLDAm2++iQEDBgjjady4MZo1a4amTZuiXLlyemkaNWqEa9euifrUq1cPtra2gObXblJSEqZOnYr+/fuL/EylMQRJ/Prrr2KA3Lx5E5aWlvDw8ECDBg3EiiwArFixwuhNCgb04OXlhZCQEEyePBlt27ZFUFAQVCoVPv30U/ELOzk5GWfPnsWsWbPQpk0bkwP1Rfvo2bNnGD9+PJ49eyZ++ZrS09/RbeXKlVG1alWsXr0a0Lx4sW7dOj29/fnnn7h37x4AYO3atWjUqBFQyvxLS2n7rl69enj06BFcXFxEudWrV1eKAYr+LU07dfnzzz+RkJAAaF4AatiwIQDA09MTZ8+eBUmkpqbq7e80RlhYGC5fvow7d+4Amv1zhkhKSoKlpSWGDh2KSZMmif2GERER2LRpE6CZiPfs2VNqO9y9ezdeeeUVvPbaa/D39y/2kueaNWuQl5eH/Px8bNq0SbRTl9L0c0n1iY+Px759+wDNvko3NzfxmWxTcYYIDw/HhQsXcPv2bUCzVzEhIQHHjx+Hh4cHxowZg8aNG+vdiKytrfHs2TODTnVERAQuXLiAK1euAADu3buHAwcOiNVxY2RnZyM9PR1t27bFokWLEBMToxQBAHTv3h0ffvghatSogQoVKqBDhw4YPXo0WrVqVeKPP1OUpl9gxH6edzzoYkqXJeHp6SlOUTh37px4sbuk+pgadw8fPkRISAiWLVuGzMxMxMfHizgtQ4cOxe+//44ffvhBzKnGMDVvm7Kxf4p9+/bhzTffxOLFi/Hdd9+Jld0XpUGDBtiyZYuo++bNm2FnZ4eaNWuanKueZ+59XnTnalP6Nzb2X5TSjn1T9pmYmIiEhATMnDkTy5Ytw+zZs2Ftba2XHprxeunSJYSGhop2ubq6AiZseOvWrf+qlw3/VU40NGeGzp49G5GRkWjYsCGaNGkibpIqlUrv16ju9auvvor33nsPwcHByMjIKCYLza/K4cOH48iRIyYnHd20s2bNwt27dxEUFITmzZujdu3a4iU0CwsLDBgwANu2bcOQIUNEelNpDNULmhcLXF1dERgYiD59+mD16tWwt7fHJ598gvj4eFSvXh3BwcG4ePEi5s+fL9Ip81PqAZrHcQcPHkSHDh0Aza/ho0ePireoXV1d8dprr6FevXpo1KgREhISRJ7K/FFCH+liZ2eH3r17w9XVFUFBQSgoKMCpU6dgb28PlKCnv6vbn3/+GXPmzEFYWBgCAwMRHh4uHgtCM4G0b98eAQEBiI2Nxaeffvpc+RtCGW+q73RlfXx88M0336BZs2Zo0qQJwsPDDb50BQB9+/ZF27ZtRd+V1E4tKpUKderUQbt27RAQEID9+/eL1Z/XXnsNmZmZqF69Olq3bo06deoY7H/d//v6+mL69OmIiIhA7dq1ce7cOXh5eRXTz+HDh1GjRg20aNECCxYswMSJEwEAH3/8MU6ePAl/f3/4+fnh2LFjpbbDAQMGYPXq1eIIxSpVqujJeXh4IDg4GFWrVoWPjw+GDRtWLA9T/azFVH2guTHOnj0bwcHBeOutt/DDDz/AwsKixDhDOg0ICMAHH3yAiIgIhISEoHfv3iCJVq1aIScnB9HR0WjcuDFsbW1F2pCQELi7u6NGjRr4+OOP9fL18/PDV199hebNm6NevXqIjo7GvHnzEBwcXKwOutfJycmoV68emjVrhu7du+Ojjz4SMroo55RXXnkFsbGx6NWrl5AxVoap/5emX2DEflDCeDBVH6UulfGm0k6ZMgU//PADQkJC8PbbbyMiIkLEmaqPqXHXq1cvNGjQAKGhoejUqZNY/NCtg4+PDxo2bIjk5ORiDpIW3TTG5m1TNqYs01CY7rWx/yuvmzdvjtWrV2PJkiUYO3Ys/P39DTqOpc2vf//+iI6ORkBAAMLDwzFjxgysX78elpaWJucqU3OvsjxDYcprXZRztTH9Gxv7yrxLe/08Y9+YfVaqVAnu7u5YuXIlFi5ciK5du6Jly5ZQq9V66V999VU0bdpUzPHBwcHCKTdkw9D01d69e0W9yzz/thcLtTx58kS8JKAlPz/f5HVmZibT09NJzcsmhYWFevEk+eOPP7JBgwbKYD0Mpc3MzGRiYqJeGDUvvyjrocVQmoKCAvEyiJKMjAw+fvxYGUySTE9PZ2ZmpjLYYH66etCi3fhPE3V+8uSJkNO235AutBjqoxfBkJ5oop40ksaQLlJSUlhQUKAXpn2RqaCggElJSXpxWkqbvy7G6mqs75TyarWajx49YnZ2tl64ktTUVPGSmhZD7dSlqKiIRUVFJtv85MkTUlMPY/2vrHNOTg6fPn1KavRjiNzcXD569Ei8YKnLkydPir10Uho7zM/PZ0pKip4MdeqQlZUl6qUbp+w/Q/2sxFB9dF+uefz4sV6+puKo0KFSn/n5+cXmALVaLfLR/unGJSUliTBlftp4JUo53euioiI+fPhQb84whDJeaZPKPtO9NvZ/LaXpFxqxHxoZD8r+V16b0qVSVnldVFQk5sLCwsJifW6oPloMjTuSTEpKEi94alH228CBAzl9+nS9MF2U9aSReduYjRnqG2Weute6/1em1V4/evSI5cuX17Ofxo0bc926deJai7K9ymulTvPz88VLx0pMzVVqI3OvsjxjbTKGobnakP5pZOwryy9p7tBFa89KlHI0YJ/r1q1js2bNxHVeXh4tLCzEmFTmkZ+fz4cPHxbTa2lsuKyifbHQLDQ0lP/kBy7+bdSvXx8jRowwuL9H8v8HH3/8Me7fv4/FixcroySSUhEbG4vhw4fj6tWryiiTcRLJyyI1NRVeXl44d+4cAgIClNFllvz8fERERKBq1aoIDQ3FtWvXcPv2bezZswcVK1ZUikv+B1y9ehXNmzfHK6+8gkqVKiEmJgZBQUH4/vvvlaL/Z6lTpw7MzMwgnWgFe/bsQZMmTUrcwyv5v8vdu3eRm5uLwMBAZZREUirS09Nx6dIlg/utTcVJJC+LtLQ0xMXFITo6WhlV5lGr1Th37hxSUlJQuXJlhISElOrlOsl/j+zsbJw7dw45OTnw8/Mz+U7H/0WkEy2RSCQSiUQikTwnWifa8I53iUQikUgkEolEYhTpREskEolEIpFIJM+JdKIlEolEIpFIJJLnRDrREolEIpFIJBLJcyKdaIlEIpFIJBKJ5DmRTrREIpFIJBKJRPKcSCdaIpFIJBKJRCJ5TqQTLZFIJBKJRCKRPCfSiZZIJBKJRCKRSJ4T6URLJBKJRCKRSCTPiXSiJRKJRCKRSCSS50Q60RKJRCKRSCQSyXMinWiJRCKRSCQSieQ5kU60RCKRSCQSiUTynPzfcqJJ5D5+iPzUFGWMRCKRSCQSiUTy0jALDQ3luXPnlOH/MwozM/A4ZifUhYXKKFg6OMGteVtlsCDp4B6cHj8UANBy7zlYOjorRf6nnJs+Gk/Pn4ZHh24IGDNVGS2RSCQSiUQiKePUqVMHZmZmZc+JfrDlV1z4YKIyGABg6eSCln+eVQYLHsfswplJwwEALfacgZVzJaXIP05hViauff0J1IUFqD5sHKw9q4i4mHYRyE1KhEuDJohYuFovnUQikUgkEomk7KN1osvcdg510X9WoEM//gb1v1sj/up9s0JPtixS8OwpEjaswv3f1yEz/pZeXKO1O9FozXbU/fx7vXCJRCKRSCQSyb+LMrcSfe+3tbg0620AQLM/jsLaw0spAgAoys3BrR+/RdLBP8GiQjjViYRdQBDiPpkB6KxEX/7sPWTevg7Pjj3h2aUXAECdn4czU96AOj8fNUa/jYq1wgAAVKtx//d1SDr0J7Lvx8Pc0gpO9RrAb/hbsLCxwf0tvyI5dh+y7t5EUV4uLB2d4Vw/Gn5Dx8Cigi0e79uB+F9W4MnJwwCAirXCYOnojCpd+8CteTtcXzgXTy+eReWWHeDda4BoS+Le7XjwxwZkxd8GCwpg5VoZlRo1h2/fYTAvbw0AuPbNHDy7fAGB499B6pnjeLRzM/LTnsC2eg0EvvUOKvj6ifwkEolEIpFIJP8MZXYlWpeMm1fw7PKFv/6uXAR1VqnPTRuNWz98g4zrl1GUlYUHf2xA3Jx39NIDQMrxQ3hy8gieXT4vwory8pB8aC+eHD+E7AcJIvz8u+Nw6eOpSDqwB2YqcxRkpOPOqqV4HLMTybExuDTrbTy7fB42Xr6wqx6EjBtXcPunhbgw86/tJzmJD/XKybx1HWlnTyDn0QMAwJPjsXhyIhZp508Kmbg5M3B2yhtIOrAH5uWtUc7RCU/Pn8b1bz/D8eE9oc7PBwCknjqKJydicWrsQFz5/ANkP0hA9sN7SDqwB8eG9UBhVqbIUyKRSCQSiUTyz1KmnejT44fiSP+Of/3164BncX85qE8vnkHSwT0AgMDx76LZ9mNotv0YnCMaKXIoPWnnTuLRzs0AgFrvzEH0L7vRdEssIr//FU7hUXCsUx9RP/2G5jtOIPzrnxA+/0f4j5wMAEjVrDz79h2G6F/+qhcA1Jm3BK0PXoZv32EiTJenl84i4ddVAICaU2eh0ZodaLhyK0LnLAAAPLt8AY92b9FLo87PQ8TCn9Fy7znUmbsYAJCf9gSpZ47pyUkkEolEIpFI/jnKtBPt/+Yk1Jw666+/aR/DtloAoHEuAcBMpYJPnyGA5uQOn1cH66V/Hp6c+MsRNlOZw6trHxHuFB4FG09vlLOvCFtfPzzYthHXF83D5Xkz8eT4IQBAQUa63ip5aUk5ehDQtKNK934i3L11Z5SzswcAPLukv9WmUuOWcGnQ9K//N2ouwvOSH+tISSQSiUQikUj+Scq0E+3ZqSd8Xh3811/vQbCwtQM0L+8BgJmFBVSWlopUSsyUAQYpzMkCNHmamVsoo5F8ZD9iOkThwnvjkfjnNmTfuyvq8aIUZv+1BcPMwgKqcuX04lSWVoBmn7YxdNOYkpNIJBKJRCKRvFzKtBNtDO2xcer8fDy9cFqEp545riP1F+U0jrfu3ueUowd0JP7CxtMb0GyX0M2zIP0Z8lKScPvHb1GUk43KLTugyab9qPfNCvgY2KZhZv4flarz8vTilFSoUhXQtEN3xTnzzk3kaT4YYx8YLMIlEolEIpFIJGWDMu1EX/7sPZybNkr8xX3614uDlZu3Q7mKjgCAM5OGI+7Td3B8eE/cXV386DjtyRvJh2Nw6q3BOD1hKM5NHw2Y6a9Qe7TvhvJuHgCAU28NxuVP38Wlj6fiwCuN8Wj3Vlg6uQAAMm5exaPdW5GwYRWuzZ+tlwcAWLm4ilXk64vm4vK8mUjc84dSDADg3qazOMv61PghuL5wLm4s+RInR74GkLDx8oFH+27KZBKJRCKRSCSS/zFlzoku7+YutlMkHfoTj3ZvFX+Ju/9yRs1tKiBiwUpYe1ZB3pMUJKxfiewHCQj75FuUs68ImJnBzNwcAFD99fFwrh8NAEg+tBepp44iYNQUVIpuAQBiO4hFBVtEfLsKTuFRKEh/hvj1K3Bv0xqUr+QG5/qNEDj+XVSsWRtZ8bdxbtooXP3iI1Tp0Q8qSyuYWVgIp9zM3AI13/4Q5uWtkXnrOuLX/oi8J8l/lWX1l3OtdbItbO1Qf+l6ONePRsHTVNxatgA3l3yF/KepcG/TGVHLNsLc2sZgWgCAmZnY0mFuWf4/4RKJRCKRSCSSf5Qyd070c0H+tU2DhLWnN8xUKrCwECSL7THOTUpEYVYmbDy9obK0BNVqsLBA3ynVoM7PQ07iQ1hWdBAr3lryUpJQkJEOaw8vmFuVBwsLAbO/nGdd1Pn5yEt+DFV5a1g5/7WKTbUa6vw8cfazLoVZmchNSoSZSgVrd89i9TKWlkWFYFFRMXmJRCKRSCQSycunzH72WyKRSCQSiUQiKav8Kz62IpFIJBKJRCKRlEWkEy2RSCQSiUQikTwn0omWSCQSiUQikUieE+lESyQSiUQikUgkz4l0oiUSiUQikUgkkuekTJ3OsaPuX18ilEgkEolEIpFIyiIz6CKPuJNIJBKJRCKRSJ4HecSdRCKRSCQSiUTygkgnWiKRSCQSiUQieU6kEy2RSCQSiUQikTwn0omWSCQSiUQikUieE+lESyQSiUQikUgkz0mZc6LT0tJw6dIlXLp0CVeuXEFqaqpS5IXIyclB8+bNMWrUKGVUqfi76f8ucXFx6NatG8LDw/Hll18qowWPHj3C3r17sX//fqSnpyuji3Hz5k1MnToVf/75pzKqTLBt2zZYW1tj7dq1euHZ2dk4cuQI9uzZg1u3bunF/f9KZmYmzp49i7i4OJBURv8tTp48iejoaHz//fcAgD179mDq1Kn/iO6XLFmCmTNnIjc3Vxn1QowYMQKurq5ISUlRRkkkEonkb5CXl4djx45h165duH37tjIamZmZiImJwe7du/HkyRO9uLS0NMTExGDfvn0G5+f8/HxcuHABu3fvxtWrV5XRZYPQ0FCWJbp3704Aen/R0dFMSEhQij4XaWlpBMAXbe/fTf93iYyMJADOmDGDq1evVkZTrVZz9OjRNDc3F3orX74879y5oxTV48cffyQADh48WBlVJqhXrx4rVqzIrKwsETZ79mza2trq2Ujnzp310pU1vv/+e06YMIHp6enKqJdG//79hT7WrFmjjP5b/PbbbwTAt956iyQ5cOBAAuDy5cuVos+FIb14e3tTpVLx1q1berIvSkxMDAFw+vTpyiiJRCKRvCD79u2jo6Oj3r14yJAhIn7v3r10cHDQ80nWrl1Lkpw7dy7LlSsn4qysrLhkyRKRdvv27fT09CQAqlQqAuCNGzdE/P+asLAw1qlTh2XOie7YsSMBcOfOnUxISOCoUaMIgCNHjtSTS05O5vnz53nv3j29cC3379/n5cuXWVhYSCqcYLVazdu3bzMxMVGZjCT56NEjXr9+nQUFBSLMmBNdUFDAmzdv8s6dO6IsLRkZGczMzGRhYSEvXrzInJwcvXglqampjIuL49OnT/XCnz17Rnt7ezo6OjItLa1YOSR54MABAmDDhg2ZkZHBJ0+ecPny5UxJSdGTS01N5YULF5iZmUlqnO+rV68yNzdXT+7p06e8fPmynvNKknl5eUxNTSVJZmVl8erVq8zLy9OToYFydDGkX0OcP3+eANinTx8R9sUXXxAAq1Spws2bN/PWrVvcvHlzsR8B2dnZvHz5crE+VqvVTE5OplqtZkFBAS9fvsxnz56J+GvXrvHRo0d6afLy8piWlkZq2nXlyhW9uqvVaiYlJemFpaeni37Myspio0aNCIDnz58vplNjuk5NTWVeXh4zMjIYFxdHtVqtF69LSkoKraysWKNGDQJg48aN9eJLakNJ8UonOicnh9euXRPx1IyFGzdu8Pbt23rhJJmQkMALFy7o2aMxvTx58sTgj+YHDx7w6tWrxcaRdpxRMy/cunVLT1dFRUV0dXWlh4cHi4qKdFJKJBKJ5EXZuHEjZ86cydjYWH711VfCIb58+TLVajVr1KhBR0dHxsXF8dq1a7S1taWnpycLCwv50UcfcfHixTxy5IhYlHF1dSU1PoKNjQ1DQkJ45coV4bPl5+crq/A/o8w70UePHiVJLl68mAD49ttvk5obr3ZVVvsXHBzMBw8ekCTPnDnD4OBgEefh4cGkpCThBLu7u//VcE38iBEjRNlxcXEMCwujSqWilZUV7e3txUqbISd69uzZtLGxEXm5uLiIX1kkWadOHQYHBzMiIoIA+O2334o4Xa5cucKoqCi9NnXu3JmpqanMzs7WCwfAZcuWKbPgjh07CIBeXl48fvy4Mpqpqans1KmTyMPa2pp79uzhli1bCIATJ04kNQ57jx49hIxKpeKYMWOEUzJhwgQC4Lhx42hhYUEAdHNz45kzZ0yWwxL0a4h58+YRABcsWEBqnKFKlSoRAP/880+lOKlxXvv3708zMzNRh1q1avHs2bMkyc2bNxOaX8vaX8jly5fn559/zrCwMJFG1y4mTJhAMzMzTpw4UfxydnR05L59+0iSv/zyCwHwvffeE2mqVKlCa2trkmR4eLjIV1sflqDrZ8+eEQA7duwo2nzp0iWRv5K5c+cSAH/77TfWrVu3mHxJbSgpXulET5w4kQC4ZcsWkuSaNWvo4uIi2tiqVStSMx69vb312t+jRw8WFhYa1Yu2/tofN1u3bmWVKlWEXLly5cR8QM04q1mzJtu1aydk6tatq7e6/corrxAAL1y4IMIkEolE8nJ4+vSpmH9v377Nc+fOEQB79eolZDp06EBoFk10+f333wmA3t7eJCkc8k2bNjElJYVJSUl68mWBMu9EBwYGslatWjQ3N2dQUJBQYk5ODj/77DNeu3aNubm5/PTTTwmAH330EUkyICCAFhYW3LRpE69fv87Zs2fzyZMnwgk2MzPju+++y/3794ub+9WrV0mSISEhdHJyYkJCAnNzc9m0aVNaWlrywYMHxZzo9evXEwDbtGnDu3fv8ujRo3R1dWX58uV5//59kmRoaCgBsEmTJvz111955coV0U4tarWawcHBNDc358aNG/ngwQOOGzeOADhmzBiS5NGjR2ltbc2KFSvy0KFDYsVQl8LCQnbu3FkYcb169bhx40YRP2LECALgu+++y1u3bnH58uU8fPhwMedozJgxBMA//viDJDlt2jQC4IYNG0iSb731FqH54bJr1y5Onz6d0FktNlYOS9CvIQYNGkQA3LFjB6lZzYTm0Y6xX6TaJxfTp0/nw4cPuWrVKkLHQdO218HBgatWreJ3330ndDZx4kTGxMSIR0jarTDaNoeGhvLAgQNigNeoUYMkuXbtWgLgO++8I+rh6elJKysrUufHAwD++uuvwrk1pWutvQHgG2+8wbVr1+qtmOuiVqvp5+fHypUrs6CggIsWLSIAjh49WsiU1IaS4pV2opX/7bffePv2bVpZWdHX15cnT57k6dOn+cknn5Catv/www98+PAhs7Ky2KVLFwLgwYMHjepFO27S0tJ49+5d2tjY0Nvbm6dOneKtW7cYHR0t9KQr3717dx48eFA404sXL9a0npwyZQoBGNwKJZFIJJK/x6xZswiAHTp0IDWLH8r70ODBgwnFIpharWbr1q0JgHPnziV1/AjdxZOaNWu+tC1+L4My70S//fbb/OabbzhgwAChQO1j3Bs3bvCLL77g+PHjhfyYMWN49+5dQrOHWonSCSbJoUOHEgD37t3Le/fuEQArV67Mfv36sV+/fmJFe+fOncXSa+ulawwjR44kNL+eqHNzV24P0OXWrVvF6vz48WMCYO3atUVYhQoV6OzsLK6NsXPnTnbp0kXsIfrhhx9Ikr6+vgadT6Vz5OfnRzMzM6GDFi1aEACnTZtGKpwn6ji22u0DxsopSb+G6Nq1KwEwNjaWJBkfH09ofggpH+lrqVKlClUqld4Wk6CgIALgkydPirWXJMuVK0dPT09x3adPH71ylW0mycqVKxOa1dKSnGiSbNq0KaHjmLMEXWvtLTAwUMgbY+fOnYRmdf3GjRs8ffo0y5UrR3t7e2ZkZJClaENJ8Uq96covX76c0PxwMkRsbCw/+ugjjh49WjwF0jrAhvSi60QvW7asWN7alf9x48YVkyfJlStXEoonA9oJfuHChSJMIpFIJH+fNWvW0NzcnP7+/kxOTiZJ8ZRb14nWbtvQ3lu173JBswiifeKtXUB79913eeXKFX788ccEwOHDh4u8/tdonegydzqHlm7dumHs2LFYuXIlgoODcfnyZZw/fx5nzpxBSEgIli9fDm9vbwQFBQEASIq3+YuKihS5GaZcuXIAALVajYKCAgCAg4MDWrVqhVatWmHy5MlYuXIlGjZsqEgJFBYWAppyteTn5wMAypcvL8IMXevyPPmUhrZt22Lz5s34/PPPAQC//fYbAJRaN1o9tGzZEq1atcKAAQOwfPlyjBgxQikKKHQIE+U8r34BwMbGBtCcjAIAnp6ecHJyAkns3r1bIf0XxvSpUqlgZWWlI/kfVCr9YWBubg4o8tC9JomioiKYmZnB0tJSpNeWrStritLo2liddfnuu+8AAD/99BP8/f0RHh6OgoICpKenY82aNXqyxtpQ2nhDGOtzAFi0aBGio6Nx8uRJ1KxZE15eXkAp9QMT/QkT40Npk9Cc5gIdm5JIJBLJ32fZsmXo378/QkJCcPDgQbi4uAAAKleuDACIj48Xsvfu3QMA+Pr6oqioCMOHD8fChQvRv39/rFu3DmZmZgAAJycnAED9+vURGBiIvn37AgCSkpJEXmWFMutEnzx5Env27MFXX32Fa9euwcHBATVq1MCJEyeQm5uLrl274vXXX9e7wfv5+cHT0xPHjx/H0qVLERsbizFjxhg8dkWJj48PfHx8EB8fDzc3N3Tp0gXR0dEoV64c7OzslOJo0aIFAODTTz/FuXPnsG3bNmzYsAFubm5GnUJDVKtWDT4+Pjh27BhWrVqFS5cuYfr06QCA7t27K8WN8t1332HixInYs2cPDh8+jH379gEA6tSpAwBo2rQp1Go1Jk2ahKNHj2LevHnYsGGDIpe/5EgiKSkJHTp0QOvWreHo6AhbW1ulqEGMlfO8+oWmPwHg7t27gMa5/eijjwAAgwcPxrx587B582Z88cUXaNKkCaDpF7VajRkzZiAuLg7z58/HrVu30KZNG1SoUEEn9+dn2rRp2Lx5M9577z0kJyejYcOGKF++PDw9PQEAv//+O7Zt24Zhw4bh4cOHemnt7e0BzY+aI0eOAC9B1wBw//59/PHHHwgODsaNGzfE36pVqwAdB1uLsTaUNt4Q0dHRUKlUWL58ObZt24adO3diyJAhAICDBw8CAMaOHYvevXsXO7bOkF50ady4MSwsLLBixQrExMTg5MmT+OKLL2BmZoauXbsqxY1y584dAED16tWVURKJRCJ5AdasWYMRI0bA3t4eI0eOxP79+7Fu3TrExcUhPDwcXl5e2Lt3LzZv3oz169cjNjYWzZo1g6enJ0aNGoUff/wRtWrVQocOHbBx40asW7cOycnJaNasGaBZhLl06RLmz58PaBacyhxlbTuHdhkfmr2vlSpVYteuXXnu3DmSZFJSknjxyMzMjF27dmX58uXFY+bDhw8zICBA5FGzZk0+fvyY6enpVKlUjIiIEGVp96QeOHCAJHnixAmRt/avTp06pOaFNd30arWaU6ZMES8WmpmZMSIigidOnBD5R0RE0NzcvMRjzU6ePKlXrp2dHadNm6Z3OoKDgwPd3d310umyc+dOenl5iTxsbW05fvx4kcfDhw/ZsmVL8cJdpUqVuG/fPm7bto0AOGXKFFKj365du4rtINC8jKndN67dW7pt2zYhb2ZmxubNm5sshyXo1xC7du0iFC/5qdVqLl68mL6+vnr6mjBhAqnZCtO1a1dx1F+5cuXYs2dPsaVG2V6StLW1ZdWqVcX1kCFDCIDHjh0jdbYuNG/enJaWloTGri5fvkxq6tS3b19CYwft27dnhw4daGtrK/Lcvn27OJavfv36ZAm6VtqbMbQvFM6fP18vvKioSOjo4sWLJbahpHil3pR2sHTpUvGippmZGbt3705qtnK4ubkRmiOMtEdYareNGNKLctysWrWKHh4eQkdVqlThqlWrqEUpv2HDBgLghx9+KGSqVq3KChUqMDs7W4RJJBKJ5MXRvr+l/NNutduzZ494xwgAGzVqJE5Uq127drF00GyHVavVHDt2rHjJvXz58hw/frzBk8n+V5TZPdGlJTExUez3LCgoKHb8V0pKCh8/fqwXVlhYWExOuXeXmhNA7t69W8z5NZRerVbz4cOHBm/ORUVFz9XpmZmZRvdPFxYWlup4rsTERD548MCobFZWFhMSEvTiDekgPz+fCQkJYn+TMk4XQ/o3VI5unCH9KiksLKSHhwcrV65sUI9ZWVl8+PChwbj8/Hzev3/f4DF6yvordavWHH+nRXf/b0ZGhtE3hdPT08XLf2q1uli98vLyeP/+/WLlG9O1IXtTolarix1PqKWwsFDsDS+pDSXF04DelNdqtZoPHjwo9gJkYWGhXruV6ZR6MTZukpOTxfGKuhiS1y1D+5b4oEGD9GQkEolE8s+iVqt5//59g/eUksjJyeH9+/cN+hH/a8r8nuiScHNzE4+9LSwsxF4aLc7OznB1ddULMzc3Lyan3T+pi42NDXx8fIptMzCU3szMDO7u7rC2ttYLh2avrXZ/bWmoUKGC2EekxNzcvNjeXUO4ubnBw8PDqKyNjQ2qVKmiF29IB+XKlUOVKlXE/iZlnC6G9G+oHN04Q/pVYm5ujhkzZiAxMRG///67Mho2NjZwd3c3qONy5crB09MTFhYWyqhi9Vfq1szMzGA6ALC1tUWlSpWUwQAAOzs7sT3BzMysWL0sLS3h6elZrHxjujZkb0rMzMyM7ps2Nzc3uJ/ZVBtgIt5QvXUxMzODh4eH0IEWc3NzvXYr0yn1YmzcuLi4wNHRURlsUF63jMWLF8Pc3BzTpk3Tk5FIJBLJP4uZmRk8PT0N3lNKQrtd0pAfUVYwCw0N5blz55ThEkmZoKioCKdPn0bVqlVfaBC+DO7evYurV6+iYcOGxRzEfwsltaGk+H8zN27cQEFBAWrWrKmMkkgkEonkualTpw7MzMykEy2RSCQSiUQikZQWrRNddtfIJRKJRCKRSCSSMkqZdaIfP36MgwcPIi4uThn1j5KVlYWzZ8/i4MGDSE5OVkaXmpUrV+LLL79UBr8wJHH16lVcunQJN2/eRF5enlLEKHl5eWjcuDFSU1OVUS9EVlYWzp07p3cu8r+JM2fO4MyZM8pg5Ofn4/Lly8pgJCQklFp327dvx4MHD5TBL528vDz88ssv4szkv8PWrVvRvn17cV3S2IuPj8eBAwdw/vx5vbOhS2ujjx8/xpUrV5TBiI+PL6ZnZZ+0atXKaL0kEolE8ve5du0aLl26JP605+xD812AI0eO4MyZMwa/DaClJDm1Wo0LFy4gJSVFhKWmpuLUqVPF7h2HDh0Sx5SWOcri6RzTpk1jlSpV2Lt3b9auXVt8QvjvsGzZMp45c0YZLHj69ClHjBjBypUrs2XLlmzbti2dnZ3Fl/qel44dO3LBggXK4Bfmt99+o6OjI9u2bcuoqCg6ODhw8+bNSjGDHD16lC4uLsrgF6Z3794EwD179iijyhwJCQn87LPP9MJ69+7Nb775Ri+Mms93az8PrkvNmjW5bt06ZXAxcnNzGRQUxKNHjyqjXjqHDx9maGgoMzMzyVLYtzGePn1Kb29vnj59mixh7G3ZsoUhISEMDg5mly5dGBYWRm9vb/Ep1tLYaHZ2NqtWrUpzc/NiX52sUaOG+JKhlvXr1+t9tXHYsGHFjvOTSCQSycvh3LlzdHBwYGRkJCMjIxkVFSWOOj169CirVKnC7t27Mzw8nNHR0QZPziiN3MiRI6lSqfjll1+SJPft28eGDRty+PDh7NSpk5DbsmULO3TooPcV4rJAmT3i7tixY6xQoQJTUlJEWFZWlp7MkydPxP+1HaNWq8VxYCkpKcWOBqtcubJR5+bZs2cMCgrikCFD9I7nysnJ4cmTJ4vJao8/UxpFbm6uOILLxcVF78zooqIi8VliZTpqjkfTHtlniEmTJnHo0KHievDgwezTp4+eTG5urnCqdMuYP38+O3bsSGqOCTNUvql26bJ7924GBQWxTZs2wvi1aI8ZKyws1Ou/goICvT7TylDTbt3jAY3pSXmEmbKOxtr+3XffsW3btjqSxfPSMn78eA4bNkwv7NmzZ1SpVOKz1CXZma4OdFGr1cXqnJKSUmxi0KZLTk7WyyMlJUVPT7r1oAH7VpavLFvLxIkT+frrr5MljL2lS5fqnfmt5fz582LMlMZGp0+fzmHDhtHOzk7P6U9LS6OZmZk4Q1TLxIkT9Y6me//998UZpBKJRCJ5uXz33XccNWqUMphZWVl0d3fn9u3bSc3RpBUrVizmV5VG7ttvv2XXrl1ZpUoVHjp0iCQZHR3N8+fPMzExkTVr1iRJxsTEsEWLFsV8wLJAmT3iLjU1FdT5hDd0PtV74sQJBAYGomHDhggICECXLl0wb948QPMFu6lTp6JevXoICwtDcHAwsrOzcefOHXh7eyM5ORn9+/dHz549Rb5aZsyYAQ8PDyxbtkzvZILy5cujXr16gOZzk61bt0adOnXg4+ODoUOHolOnToDmscS4ceNQrVo1hISEoFu3bsjMzERYWBig+RxzlSpVUL9+fbRo0QKhoaE4fvw4AODKlSto3Lgx2rVrh1q1amHw4MGifF2OHz+OyMhIQPMo/8yZM+KrPmq1GmPHjkXVqlURHByM4cOHw9nZWXz2+Pjx43BwcEBkZCQiIyPh7+8vHqGYapeSvLw8jB49Gt988w1CQ0Nx8eJFvfhq1aph7ty5qF27NqpVq4aJEydi8eLFCAsLg7e3N95++20h6+Pjg2nTpsHf3x9TpkwBNHry8vIqpqcHDx7AyspKPFIqKCiAh4cHDhw4YLLtEydOxKRJk3DmzBlUr14dBw8exI0bN2Bvb2/w8dKxY8cQFRWlF3b8+HFUqlQJvr6+gAk7A4AffvgBHTp0AAAEBgZi165dIp8ePXpg1qxZAIAtW7YgJCQE3bt3h4+PDxYvXgxoTpHQfuI0KCgIGzZswPXr11G3bl306dMHdevWxf79+wEAAwYMwKeffmrQvpOSkmBpaYn09HRA8+lsLy8v8RVLLc+ePcP333+Pt956CzAx9u7du4fx48djw4YNaN68uU4OQO3atcWYMWWjAHD16lX8+OOPmDNnDgIDA/Xs5/jx43B3dxefBdei7BOVSoW0tDQ9GYlEIpG8HE6cOIH69esrg7F69WpUq1ZNbP2ztLSEs7Nzsfm4JLm9e/fip59+wldffYVHjx6hbt26AIDr168jMDAQ+/fvR4MGDXDixAm899572Lhxo/AByyRlbSW6sLCQr7zyCl1cXLhkyRKx2vb06VO6urpy48aNJMnLly/TyspKrIxVr16d9erVY2JiInNzc2lpaSlWutauXcvIyEidUv5DdnY2bW1tGRMTQ5K8fv0658yZwzlz5nDevHliRa9t27ZiBezZs2esVasW33//fZLkrFmz2KBBA2ZlZVGtVrN///5s2LAhqflim7OzM2/evEmS/PHHH2lpacnc3Fw+e/aMnp6e3Lp1K0nyypUrtLCwKPaYu6CggNbW1mzVqhVfffVVVqtWTawekuScOXP0yh80aBCbNGki4qtVq8awsDA+fPiQRUVFDAgI4LJly8gS2qXkww8/ZI8ePUiSy5cvZ7169UTcgwcPaGZmxiFDhjA/P58bNmyglZUVR44cycLCQq5atUr8uoyPjycADh06VOj38OHDRvWkVqtpa2sr+nP9+vUMCgoiS9H2GjVqcMeOHeJ6xYoVom90yc/Pp5WVFS9cuKAX/tFHH7FLly7i2pSdDRkyhDNmzCBJdujQQazUP3jwgNbW1rx37x6PHj1KT09P3r59m9T86o+OjiY1dVOpVKJvSLJ///5iS5HuanbVqlW5e/du0oh9u7i48PDhw6Rmm4W/v3+xVfPvvvuOUVFR4trY2Pvwww/ZtGlTIffjjz+KMRIbG0uWwkZJskWLFmKL0+DBgzl58mQR9+GHH4qvHGrJz89n+fLl9VasR44cybFjx+rJSSQSieTl0LhxY3p7e9Pd3Z2tW7fm9evXSZKdO3fmp59+KuQKCwsN3jNNyV2/fp2BgYGMj4/n9u3bqet/jho1itHR0WzdujV37drFqKgoPnz4kHfu3Cn2xLYsUGa3c2jZsGED3dzcOGbMGJLkwoUL9ZyfxMREmpubMyMjgykpKQTAs2fPkprtHmZmZuILcOPGjROfBVei/ZqZdivAxYsXuWDBAo4aNYoVK1akWq1mXFwcy5cvr/eFvcDAQG7fvp1FRUV0cXHhrl27RNyoUaM4ceJEkmSPHj04ffp0Ebdu3TrxeeMvvviCLi4unDBhAgcOHMjAwEB+++23QlbL6dOnaWdnx0OHDvHAgQP85ptvWL58eR4/fpxqtZpubm7CoSLJN998k2+//Tap2RYAQM8RCQ8P548//miyXUpu3bpFR0dH3rx5kwUFBTx69ChtbGyEU6ftL+0PgGXLltHX11d8Oe6bb75hu3btSI0T7O7urvelvV69egkHlAo9kWT9+vW5Zs0aUvOZ55UrV5bY9tTUVKpUKr2v3On2jS4nTpygra1tsW0PHTt2FPuCS7KzmjVrcsuWLSTJt99+WziRkydPFtscOnfuzDp16nDcuHHs0aMHg4ODefDgQVJTt27dulGX+fPns1KlSlywYIHQV1JSElUqFZ8+fUoase+WLVty8eLFJMlGjRpx6dKlevHU2OY777yjDC429rp27arn8C5btowLFiygr68vv/jiC7IEGyXJn3/+mbVq1WJubi4LCgr46aef6m2z6dChA+fOnSuuSfLkyZO0sbHR+3pkdHQ0v/76az05iUQikbxc8vLy+Oqrr4rFDQ8PD7177ZkzZ2hra1vsq8DG5J4+fcrQ0FCxuPPhhx9y+PDhOin/4ubNm4yMjOSxY8cYFRXFYcOGMTg4WCn2P6fMO9Ek+f3339PDw4PUrMhNnTpVxH355ZesXbs2SXLbtm16Lx/t2LGD1atXF9e6DpiSy5cvEwATEhL0wufOncvWrVuTJH/44Qe9lb4zZ84QAJ88ecIbN24QgNizk5eXR3d3d/7yyy8kSS8vL72V0C5duoiVtJ49e3LUqFE8ceIEr127VswYtSxcuJDNmjXTC/P19eX333/PmzdvEoBwXnNycujm5sZNmzaRJP/44w893aSnp7N8+fKMi4sz2S4l7du3p4eHB/38/MQfAN64cYMkOWXKFL755ptCfsSIEXqOV79+/fjBBx+Qmr2zI0eOFHE0oifdva9Dhgzh+++/z3Xr1jE0NJSFhYUltn379u0MCAgQeVDzA2L9+vV6YST5008/FXupMDMzkxUqVODFixfJEuwsPT2dKpVKfGp+xYoVbNKkCe/evUtnZ2fGx8eTmhXiH374gadOnRJhWsLDw4Xd6HLw4EGGh4ezZ8+eJMmtW7eKVX0ase+JEydy9OjR3LJlC2vVqmXQtgICAvjbb78pg0nF2Ovdu7feXmdq9ljb2dmJCdGUjT59+pSVK1fWsx1PT096enoKWR8fn2IvFc6cOVM8+aDmqZGlpWWxlQ+JRCKRvHzefvttcd8xNzcX90KSfOedd9i3b18d6b8wJvfee+/RycmJjRo1YqNGjejq6kofHx8uWrRIyD548ICRkZG8du0aJ02aJBZ/PDw8ij2h/19TJvdEx8bGir26ubm52LZtG5o2bSris7KyAM2enY8++kjsvzx27BgaNmwo5I4fP663j/LixYvw8/MT17oEBAQgMDAQEydOREZGBqDZcxsTE6OXh3bf6+PHjzFs2DD4+/vDyckJJEV8QUEBRo8ejUePHom0ZmZmot7fffcdtm3bJuptaWkJCwsLREREICAgQOSlRHevKQAsW7YMaWlpYv8tAGRmZqKgoABvvvkmHj9+LOSPHz8OS0tLUf/33nsPTZs2FV9vM9YuXTZu3IgLFy7g+vXruHnzpvjz8PAQ+1oN9YHyWquTEydOoEGDBiJOizE9AUCtWrVw+PBhTJ48GUuWLNH7zLOxtiv7PTc3FxcuXNDLV0vlypVx9+5d3L9/H9DkOWLECLRt2xa1atUCjLRR26aTJ0/Cx8dHfGq+Vq1auHr1KkaMGIEZM2bA29sb0PS5k5MTwsPD4e3tjYKCAkCnbrp6SUxMBAA0btwYr7/+OhISEgCN/nTboGwn/tqmhdjYWIwZMwZLliwx+BnzlJQUuLu7AyWMvS5dumDt2rV6e6oPHz6M3NxcsZ/NlI2+++67iIqK0rOdmJgYPHjwQBxpV7lyZcTGxor0+/fvx8KFCzF16lQR9ssvvyAwMBAhISEiTCKRSCQvh9u3b4v/nzt3Dj/88AOGDh0KAPDw8BDHjcbFxWHp0qWYPn06CgsLsWrVKmRmZpqUmzhxIk6fPo2ff/4ZP//8M/Ly8rB06VIMHDgQ0NyPevXqhSVLliAgIAAXLlxAnTp1EB8fD2dnZ5QvX17UrUxRllaiP/30Uzo6OrJGjRp0cXHhgAEDxCPrffv20d7enrVq1WKnTp3YuXNn/vTTT6RmX6/u4+pOnTrp/bqJjo5mlSpVOHr0aBGmy7Vr19imTRva2tqyatWqdHZ2ZosWLXj16lVSs3WkatWqrFGjBuvVq8dx48bpnRjQvn17enl5sWbNmvzggw/0Vtjmzp1Le3t7hoSEcOLEibS3txf7fk+cOEFPT09GRUWxQYMGbNiwYbHtBCRZr149Ojg40MvLix4eHmzXrh3PnTsn4jt06EBPT08GBwdz1qxZ9PHxEXHt27fnwIED6eXlxerVq7Nly5ZitbSkdlGzsl6lShWDR7y1adOGs2fPZlFREStUqCD2TmVlZdHCwoIPHjwgNScvmJubMy0trZislk8//ZT29vYMDg7m+PHj6evrK/YNk+SePXsIoNjxZqbavmPHDtrY2LB27dqMi4vj0aNHxeqqErVazTfffJP29vYMCAigi4sLx4wZo3cihik7mzNnjt6v8pycHFpYWLBbt256e5G///57uri4sFmzZgwPDxdbJgzVbfr06axRowabNGnC4OBgHjt2jDRQD0P2rd2m9OGHH4owJV5eXsKOTI09kvz888/p5uZGNzc3enl50dvbmx9//LGIN2ajFy9epK2trV5fUrNPztraWqxkHz16lNWrV6enpye9vb0ZGhrKP//8Uy9N3bp1uXz5cr0wiUQikfx98vPzWaNGDfr7+7NGjRqsVq2a3ny7evVqOjo6sk6dOvTz8+Mff/xBauZuCwsL8WTVmJwuCQkJrFChgnhCmp6eziZNmoj7ATX3pAYNGrBBgwbFToUqC2hXosvcZ78LCgqQkpICV1dXvdVGaD68kJWVBUdHRxQVFYn4goIClCtXTsgVFhbqrbyRRHJyMipVqgQzMzMRrqSoqAipqalwcHDQyw+aPFJSUlCpUiWo1eq/vpmuk1dSUhKcnJxgYWGhVzcASE9PR7ly5XDixAkMHjxY79Bwknj8+DGsrKzg6Ogowp+XJ0+eoGLFisXKV6vVUKlUKCgoQHZ2NipWrKiXrqR2wYB+tRQVFf312UtN/roypq6VcVoyMjJgbm4OGxubYn0ITf9bWlrqhcFE26FZUSYJOzs7kERRUVGxfHUpKioS9leSHnTrqKsLXXkLCwuD+SQlJcHR0VG8dWysbunp6SgoKICzs7MIU9bDkH2/8847OHPmDLZt26ZXJ10aNmyIDz74AG3atAFKGHta0tPToVar4eDgoIwyiqG+hIF2AMDTp09hYWEBW1tbvfC1a9fi448/xvnz5w3mJZFIJJK/T3JyMlQqld49R0tBQQGePXsGFxcXvfDc3Fy9lWJjcrrozv8ZGRl48uSJOAVLS2ZmJmxsbIzew/6XaD/7Xeac6P9LFBYWolatWmjcuDHMzc2xe/dufPPNN0aPkJNIXgYrV67ErFmzcOLECZM/zKZOnQpXV1dMmjRJGVWmSE9PR3BwMDZs2GBwK45EIpFIJP9NpBP9XyIpKQmXLl2CpaUlQkNDYWdnpxSRSF4qhw8fRtWqVeHh4aGM0iM9PR15eXmoVKmSMqpMkZubi8ePH8PHx0cZJZFIJBLJfx3pREskEolEIpFIJM+J1okuextNJBKJRCKRSCSSMo50oiUSiUQikUgkkudEOtESiUQikUgkEslzIp1oiUQikUgkEonkOZFOtEQikUgkEolE8pxIJ1oikUgkEolEInlOpBMtkUgkEolEIpE8J9KJlkgkEolEIpFInhPpREskEolEIpFIJM+JdKIlEolEIpFIJJLnRDrREolEIpFIJBLJcyKdaIlEIpFIJBKJ5DmRTrREIpFIJBKJRPKcSCdaIpFIJBKJRCJ5TsqcE/3o0SOcP38eBQUFIkytVuPChQu4d+8eACAnJwczZ87E0qVLdVIaZ+TIkWjevDlycnKUUf8I165dw86dO3H8+HG9dpQlvvrqK7Rs2RK3bt1SRv1XSE5ORkxMDGJiYpCcnKyM/tsYspG4uDh069YN4eHh+PLLL7Fnzx5MnTr1f6YDQzx+/BguLi4YOXIkACAjIwNnz57Fs2fP9ORu3bqFy5cv64U9evQIe/fuxf79+5Genq4XBwDZ2dk4cuQI9uzZo9fmgIAANGvWTE9WIpFIJJKSyMvLw7Fjx7Br1y7cvn1bGY3MzEzExMRg9+7dePLkiV5cWloaYmJisG/fPqSkpOjFQeP7nT59Gnfu3FFGlR1CQ0NZlujUqRMBcP/+/SLs6tWrBMB69eqRJG/evEmVSkVfX1+dlMYJDQ0lAKalpSmjXiqpqals3LgxAYi/wMBApViZoF+/fgTAo0ePKqP+UdLT09mvXz+qVCqhI3Nzc86dO1cpWmoSEhL41ltvcePGjSLMkI1ERkYSAGfMmMHVq1dz4MCBBMDly5cLmRchJiaG48aN4/nz55VRz83kyZMJgLGxsSTJzz//nAD4wQcf6MlVrlyZAJiZmUm1Ws3Ro0fT3Nxc6LR8+fK8c+eOkJ89ezZtbW31bLNz584kyZkzZxIAd+3apVOCRCKRSCTG2bdvHx0dHfXuK0OGDBHxe/fupYODg959ae3atSTJuXPnsly5ciLOysqKS5YsEWkPHDjAOnXqEADbtm0rwssKYWFhrFOnDsvcSjRJvX8Nhfn5+eHOnTs4c+aMkAGApKQk3LhxA2lpaXj69Cny8/P14rUyt2/f1stfy7Nnz3DlyhVkZ2frhaelpSE/Px+ZmZm4fPmywbQAsGDBAhw6dAgTJkxAQUEB7ty5g0mTJinFkJiYiBs3bqCwsFAZhZycHFy+fNng6mxOTg6uXLmCx48f64WTREpKCkiiqKgI169fR0ZGhp4MNOmvXbtmdHVcm/by5cvIzMzUizOkg5SUFD0da8OKior00urSr18/rF69Go0bN8aRI0dw48YNLFq0qFidDOlIt52JiYm4e/cu1Go1zp8/j6+//hobNmzA06dPoVari9lIeno6rly5AkdHR0yZMgWvvvoqlixZgmvXrmHQoEE6JQMPHjzAlStXirXj3r17uHjxot6v6fz8fOzcuRPffPMNYmNji60A5+Xl4erVq8V+gRuisLAQK1asgLu7Oxo2bAgYsH0tuuGHDh3CwoULERkZiYyMDDx58gSLFy+GnZ0dAODLL7/EO++8A0dHR2zevBm3bt3C5s2b4ezsDADo1asXAOCnn37SKUEikUgkEuOkpaVh3LhxiI2NxVdffQVo7iNXrlwBSYwaNQpmZmaIi4vDtWvXYGFhgcmTJ6OoqAi5ublYsGABjhw5goEDByIvLw/vvfceoHma3759e/j5+SlKLIOUtZXojh07EgBjYmJE2JUrVwiA4eHhJMlnz54RAOvWrUuSTEpKYoMGDahSqWhhYSF+2QwbNozUWYnu0KGDiKtbty7T09NFfj169CAAWltbU6VSccyYMVSr1aKsjh07slKlSgTAS5cuibrpMnXqVAJgixYteO/ePWU04+LiGBYWRpVKRSsrK9rb2+utgk6ZMkX8MjMzM+OsWbNIzept//79aWZmJupfq1Ytnj17liS5efNmAuDQoUPFr0JLS0v+9NNPIu/58+fT0tKSAOjm5sagoCBCZyX6xx9/pL29vcjfysqKn332Gamjb10d7N+/nwDYrFkzUcaCBQsIgF999ZUI0+XixYsEQHt7e6ampiqjyRJ0pG1nv379aGFhQRcXF27dulXUWfu3YcMGPRvJzs4uJrNs2TJOnDiRALhlyxaS5JkzZxgcHCxkPDw8mJSUxDNnztDb21svfY8ePVhYWMhJkyYVyzslJYXUrPBaWlqyfPnyhMYukpOT9dqry8mTJ0XeWubNm0cAnDlzpp6sm5sbATAjI4M7duwgAHp5efH48eN6ckVFRaLP/vzzT704XRwcHOjs7KwMlkgkEomkRJ4+fSrugbdv3+a5c+cIgL169RIyWh9M+dT2999/JwB6e3uTJPPy8picnCx8v7K8El1mnegKFSqwYsWKrFixIu3s7AgdJzotLY0AqK37u+++SwA8e/Ysnz17Rn9/f9asWVM4alonunv37jx48CDbtWtHAFy8eDFJcsyYMQTAP/74gyQ5bdo0QuOMacsCwDfeeINr167ls2fPRH11uX//Pv39/QmAFhYW7NKli3B0STIkJIROTk5MSEhgbm4umzZtSktLSz548ICrV68mNI7+9evXuXv3bq5YsYIkOWrUKALg9OnT+fDhQ65atYrQONIk+dtvvxEAK1asyOXLl3P9+vVUqVSsXLkyqdnaYG5uTk9PT+7fv5/ff/89K1SoQOg40Vu2bOHWrVv57NkzJiYm0svLi5aWliwoKDCqA61etT8qwsPDaWFhwUePHok267Jy5UoCYOPGjZVRAlM60rbTysqKX3zxBTds2MCMjAx+8803BMD27dvz0KFDTE9PL2YjR48epbW1NStWrMhDhw4xLS2Nb731FgHwt99+I0kGBATQwsKCmzZt4vXr1zl79mw+efKEcXFx/OGHH/jw4UNmZWWxS5cuBMCDBw/y/v37HDJkCKHZJnLkyBGS5IYNGwiAU6ZMIUnu3LmTADhmzBid1urz008/EQCnTp0qwrROtJWVlRgPFStWFD+oMjIyWFhYyM6dO4s+qlevntjakpCQQABUqVTMz8/XKU2fiIgIAuCDBw+UURKJRCKRmGTWrFmExochKRa4Ro8eLWQGDx5MKBZ01Go1W7duTQDFtnX+G5zoMredQ0vfvn0xbdo0TJs2DSNGjFBG66F9bL1//36cOXMGaWlpcHV1haOjo57csmXL0LhxY/Tt2xfQPLYHgB07dsDMzAxr165F//79ceLECQDAqVOnRNrAwEAsXrwYffr0gb29vQjXxdPTExcvXsSyZcsQGhqKLVu2ICoqCnFxcbh//z4uXrwIS0tLTJ8+HcOGDRPbIS5evIg9e/YAACZOnAh/f3+0bt0aAwcOBABs3boVKpUKH3zwAdzd3dG/f38EBQXh0qVLSE1NFeUPHjwYgwYNQq9eveDr64vExEQUFRXhyJEjKCoqwuDBg9G0aVMMHz4cXbt2FekAoF27digoKMDcuXMxc+ZMFBYWIj8/X++FNqUOJkyYAABYtGgR4uLicPr0aXTp0gWVK1fWyfk/aLcgKLduaClJR1oGDx6MiRMnokePHrC1tUVISAgAwNXVFdHR0cIedImKioJKpYKFhQWio6Ph4OCgFx8fH4/r168jKioK3bp1g7+/P2bMmAEnJyfUrFkTgYGB+OGHH/D222+LF1yTkpLg6ekJb29vAIC/vz8aNGgAaGwKAM6fP4/+/ftjxYoVgMKmlGh1baj+0dHRYjxMmzYNFSpUEHHm5ubYsmULdu7ciS5duuDMmTPo0aMHli1bprftQ7k9RRetTT99+lQZJZFIJBKJUdauXYsPPvgA/v7+4l6n3IIIzYuCAFC+fHlAIzN27Fjs2bMH3bt3x+TJkxUpyj7/J5zoatWqQaVSYfHixejbty8aNGiAH374QSkmKFeuHKDToVqnrmXLlmjVqhUGDBiA5cuX65VrZWUl/m8KKysrDB06FKdOncIrr7yCvLw87NixQ5Th4OCAVq1aoVWrVpg8eTJWrlyJhg0bIjc3F9DsS1ai3Resa5T5+flQqVRG66VtI0lRtm56pYH369cPPXr0QGZmJurWrSucKl05ZVmvvfYa3NzcsGrVKixYsAAA8Prrr+vJ6KJ1di9cuIBHjx4po0vUkRbtAHyZmNL/okWLEB0djZMnT6JmzZrw8vICDOhQF21b6tati1atWqFNmzb46aef8OWXXypFBTY2NoBm77oSU060lrZt22Lz5s34/PPPAQC//fYbPD094eTkBJLYvXu3MolA+x6Atg4SiUQikZTEsmXL0L9/f4SEhODgwYNwcXEBALGYFh8fL2S1C1C+vr4oKirC8OHDsXDhQvTv3x/r1q2DmZmZkP23UGad6Ofh559/Rrly5fD666/jk08+wdChQ5/LGWjatClIIikpCR06dEDr1q3h6OgIW1tbpahJRo4ciblz5yI2NhY7d+4UR5CFhYXBx8cHPj4+iI+Ph5ubG7p06YLo6GiUK1cOdnZ2aNq0KQDg448/RmxsLFavXo2PPvoIANCiRQuo1WrMmDEDcXFxmD9/Pm7duoU2bdoYdKaUNGjQAGZmZlixYgV27NiBb775Bhs3btSTOXjwIBwcHDBjxgw0atSo2MuVhrC0tMSoUaOQkZGBJUuWwNfXF61bt1aKCerUqYOePXsiOzsbrVq1wrJly/Dbb79h2rRpGDVqVIk6MobW4T916hQOHTqEhw8fKkVKxM/PD56enjh+/DiWLl2K2NhYjBkzBrdv38bBgwcBAGPHjkXv3r2Fw61FW/6ff/6JvXv3orCwUPTnzZs30bx5c3Ts2BHVqlWDtbW1XlpdtC9R3L17Vxllku+++w4TJ07Enj17cPjwYezbtw/Q6Nvc3FzY0eDBgzFv3jxs3rwZX3zxBZo0aSLyuHPnDsqXLw9PT08RJpFIJBKJMdasWYMRI0bA3t4eI0eOxP79+7Fu3TrExcUhPDwcXl5e2Lt3LzZv3oz169cjNjYWzZo1g6enJ0aNGoUff/wRtWrVQocOHbBx40asW7cOycnJKCgowK5duxAbGwsASElJwc6dO4UTXqYoa3uiu3XrRgA8fPiwCLt58ybNzMzYoEEDUvOinUqlYkREBEny22+/JQDWr1+fDRs2pK2tLcuVK8c9e/aQmv2e5ubm4kVC7X7VDz/8kNS8mNi1a1e9Y9fc3d159erVYmWZYs6cOWL/NjQvev3www8i/sSJE6xbt66IB8A6deqQJAsLCzlq1CjxYmH58uU5b948kuTjx4/ZtWtXcYRZuXLl2LNnT7H3eNu2bYTO/luSrFWrFi0sLFhYWEhq9tZqX3CrXr06R44cSQA8efIkqXkpUBvv6urKli1bEgBTU1NN6iApKUnsr/7444+V0cVIT0/n5MmT9Y7F8fT05KpVq8gSdGSondTork2bNkJ++/btBuvs4OBAd3d3cT1lyhQC4LZt20iShw8fZkBAgMinZs2afPz4MWNjY8WLfFZWVuzevTuhs5c6ISGBvr6+hOaFzrS0NKrVak6ePJk2NjYiP1tbW65evVqUr+TZs2e0srKiv7+/CPv6668JgLNnz9aTrVKlCs3NzZmdnc2dO3fSy8tLr5zx48ezoKCA1Ow5W7x4sagjANrZ2XHChAkkyfj4eAJg8+bN9cqQSCQSicQY48aNE/cU3b9x48aRJPfs2UNPT08R3qhRI3HoQu3atYulA8BNmzbx5s2bxcIBiMMWygLaPdFmoaGhPHfunNK3/p+h3btpYWGhF15YWAhzc3Ox3F9UVASVSgWSsLe3h7e3t1j5/e677zBq1Ch88MEHmDlzJtRqNUjC3Nxc5FdQUCC2POiGJSYmwtraWjySgE5ZpXnUUFRUhEePHqF8+fJ6eeiSnZ2N5ORkODk5FVth1dbB1dW12PaJgoICJCUlwc3NrZh+lDfe0dQAAP/0SURBVO0x1ObCwkKkpaWhUqVKgOb4Nd0ycnNzkZqaCnd3dyGvzdOYDgoKCuDn54fExEQkJCQY3Q9tiNTUVKjVaoN6MqYjZTt1SUlJgZmZmTi6TVnnoqIimJmZQaX6zwMYQ/k9efIERUVFcHV1FWFFRUWiX8qVK1csnVqtxuPHj2FnZ6f3BIOa4/hIonLlynplG6JPnz745ZdfcOnSJQQHBwOarTuWlpZ6cob69/HjxygqKjJZTnZ2Np49ewZXV1eR9uuvv8b48ePx008/YfDgwcokEolEIpG8ECTx8OFDWFpaCt/j/wJ16tSBmZkZypwT/SL07NkTGzduhJ+fH2xtbXHp0iVERkZi06ZNcHNzU4pLXiKrVq3CwIED0bNnT/z666/KaMlzcvHiRYSFhWHUqFFin/k/Tc2aNcUZ4kpnXSKRSCQSiT7/p5xoaDav37lzByTh4+ODatWqKUUk/wA3btzArVu3EBkZWew0FMmLERcXh/Lly//XDpo/ffo03NzcxAuTEolEIpFIjPN/zomWSCQSiUQikUj+abROtOGNkxKJRCKRSCQSicQoZdKJTk9Px5UrV8Q5zkpu3LiBpKQkZXAx9u7di4kTJyqD/yv8t8tOSEjA/v37kZCQoIz6xyksLMTly5dx6dIlxMfHGzxr+Z9g5cqVWLRokTK4RJKSktC/f3/Uq1dPHF+nC0nExcVh//79ZeLjIxMmTMCRI0eUwWUOU/VMSkoqdjZ4cnKyCLt165bBvlCSkpKCli1bKoNfCqmpqYiNjdX7sM//ihe17efh1q1buHTpkvhLTk5WigD/pboAQEZGRrGjNyUSSdnh3r17enPGpUuXcP/+fRF/584d7N+/v8RjZlNTU3HgwAHcuHGjWPipU6eQl5enF37o0CHcuXNHL6ysUCad6BEjRiA0NBTLli1TRmHWrFkICgrCzJkzlVHF2Llzp97pBf9NTJV95coVfP/998rgF4IkRowYgVatWuG7775D48aNcejQIeA5y8nJycG7775r8gMixvjhhx/QunVrTJ48GZ06dUL16tX1Dlj/p9i4cWOxE0xKw/jx4+Hl5YXdu3cjPDxcLy41NRWRkZEYMWIEvvnmGwQFBRUb0P9NSGL58uVl/gXZkuo5evRo8SUrLePGjRNhy5cvx/bt2/XiDXH8+HGkp6crg/8233//PWrXro2vv/4agwYNwscff6wU+a/yorZdWm7evIng4GCMHz9e/G3btk0pBvyDdVHOTwcOHMC3336rJyORSMoOkydPxvDhw8Wf9iNgANC1a1cMGTIEixYtgr+/v9H5ZPHixQgLC8PixYvRqlUrzJgxAwAQExODzp07Y8mSJejZs6eQ37p1Kz799NOy+w2DsnZONDVn4Pbq1YuDBg3SC7948SK9vb3ZsGFDLl26VC8uNTWV1JyJq6Vp06Zcu3Yt8/Ly+PTpUx3p/2AoXVFREUkyMzOTmZmZIjwzM5N5eXl6MtScU5yYmFjqsj/66COOGDFCL6yoqIgFBQV88uSJXrih+umyc+dOVqlShbm5uSTJ/Px8cT6woXJIinOMqdOOgwcP6p1PrEtSUpJee5UMHDhQnLlNkv7+/vzpp5/0ZLKysorpQYuh+hjrg4KCAqakpJAk3d3deeHCBRGnpKCggMnJyXphRUVFtLW15a1bt/TCtUybNo29evUS11lZWXrxhYWFxfLUkpqaKs7l1mKoDtTkQ8252dq+0yUzM5MZGRm8du0anZycisUZskOlDSn7TFk3XQoKCsQ56krbJmnQjllCPXXx9vbmn3/+qRdWrVo1Eaasm7H6zJw5k2+88QbVarWwAyWG7FWpG10yMjJYrlw5xsXFibDs7Gw9mdTUVIP9lJ+fb1AvhuS1dTJWd1O2bUwfWr0lJSXpXSvjlaxYsYJNmjRRBguM1UWZn/I6IyOjmO5oZB5Tzk9FRUXF5rkX0aNEIvnnuXTpEh0cHHjt2jWS5I0bN0Rct27dOHnyZB3pvzh58iQrVarE+/fvkySPHz9Oa2trqtVqRkdH8/z580xMTGTNmjVJkjExMWzRokWx+3BZQHtOdJlzoh89ekRLS0vu2LGDQUFBIryoqIiRkZHcsGEDXV1defbsWVKjZF9fXwYEBLBhw4asU6cOjx07xqKiItrZ2XHSpEkMCgqivb09v/vuO5GfsXQk2aFDB44ePZoeHh4cNGgQ8/PzOWDAAHp7e9PT05ODBw9m+/btSZJr1qxhUFAQW7duzaZNm4q6Git75MiRtLKyoru7O/39/ZmYmMi5c+fy1VdfZUBAAGvUqFFi/XRZs2YNPT09+ezZM71wQ+UkJCQwMjKSAQEBrFq1Kl955RV++umnXL58OR0cHOjg4EA/Pz9u2bKFJLlq1SoGBQUxOjqaXl5ejI2N1StDS1BQELdv306SvHfvHitWrCgGVmJiItu3b8+goCBWrVqVLVq0YE5ODqn5SImh+tBAH5Dkl19+ycqVK9Pb25tdunShjY1NsZs4NQ7AW2+9RV9fX4aFhbFatWq8cuUKr1+/Tg8PD1paWtLPz4/Lly9XJuXrr7/Ozp07F7uZFxUVccqUKaxZsyYjIiIYEhIinOMDBw4wMDCQtWvXppeXF48ePWq0DiR55swZRkVFccCAAfT396ednR3PnDlDapzV/v3709vbm25ubmzbti3btm1Lahw2Y3aotKGffvpJpCPJlStXMjo6WlzrMn/+fFauXJlVq1blwIED6ezsLBwaNzc3fvzxxwwKCqK1tTWXLFlCllBPJY8fP6aZmZmes5mSkkIzMzOmpaWxqKiI9vb2jI+PJzX97O7uXqw+JNm+fXsOHTqUISEh9PDw4GuvvSbyNGavSt0oefjwIQHw1KlTyiieOnWKERERbNy4Md3d3fnNN9+Qmr4YMWKEGKOvvvoqSfLIkSMMDQ1l3bp16erqyqlTp4q8unTpwhkzZjAkJIQuLi7s16+fiDNl28b658SJE4yIiGDLli3p5OTE69ev08bGRujqzp07tLW1ZUZGhihHy+jRow3e5GiiLocOHdKbk1etWsV27dqRmnHfrFkzBgUF0cvLiwsWLCBNzGOG5qeOHTtyxYoV5N/Qo0Qi+ecpKChgeHg4P//8c2UUExMTWblyZe7du1cZxb59+/Kdd94R1wkJCQTA7Oxsurq6Mi8vj+vWreOwYcN4/PhxRkdHMy0tTS+PskKZdaK3bNnCevXq8enTp3pfGfzqq6/YpUsXxsfH09raWqyUVKpUSdws169fTwsLC+bk5PDixYtUqVScNGkS1Wq1SE/NDdxYOpJ0cXFh+/btxfX777/PTp06saCggNnZ2QwPD+e7774rZM+dO0dqDIuaFXNjZZOkq6ur3ipTjx496OPjw7t375KlqJ8uubm5bN68OatWrcqtW7fqxSnLadKkiXBSb9++zQoVKoiVwF69egkHgST37dtHf39/4SgOGzZMz/i1aL8M2KVLF/bo0YNubm7iRqhWqxkZGck5c+aQGkc0MDCQa9euJUuoj7IPduzYQR8fHz5+/Jgk+cYbbxh1CqdMmcLOnTuL1doRI0bwjTfeIEkuW7aMHTp0UKT4Dzdu3KC3tzebNm3Ky5cvi/APPviAPXr0YEFBAdVqNf39/blnzx4+ePCAlSpV4vHjx0nNj8CkpCSTdVi0aBGtrKzEj5WOHTvyyy+/JElOnTqVnTt3ZkFBAbOyslinTh1ha6bsUGlDR44coaenJ7U0a9as2NMBkty7dy+9vb3FSuaoUaOEXi9fvkwLCwtOnTqVarWa8+bNE3Zsqp5Ktm7dynLlyrFly5biLyIiggEBAaRmvLi4uJAkd+3axSpVqoh+1q0PNXbRokULpqen8+zZs7S3tydLsFelbgwxffp02tnZ8fPPPxfOa0pKCj08PMSP11WrVrFRo0YkyUmTJrFnz55izF+4cIGPHj2ii4sLDxw4QJK8f/8+zczM+PDhQ5Kkm5sb27Rpw4yMDJ48eVLU3ZRtm+qfBQsW0NLSkrt37yY148va2lqsCH3wwQfFnuZp0f4Q7NixIzt27MiYmBiyhLp8/vnn7N+/v8hjzJgxfPfdd6lWqxkREcH58+eTmh9Y165dK3EeU85PLi4uvHTp0gvrUSKR/Hf46KOPGBUVpfdU7O2332avXr3o5+fH9evX68lTMz9VrFhRbzHw0KFD4gmmdm5r3bo1d+3axaioKD58+JB37twR99GyRJl1ot977z2OGjWKJOnn58d9+/bxzp07dHd3571797hhwwY2bNiQJPnFF1/oOadbt24Vn4j+8ccfGRAQIG6IM2bM4OjRo0tMd+vWLVpYWPDBgwek5nGlo6OjWCkkyfDwcG7evJkk2aJFCzZq1IiHDh0S8abKjo+PL7aCWqVKFf7yyy/i2lT9DFFUVMSlS5eyQoUKwoFVlnP69Gk6OzszPz+f1Hxi2tzcXKwOVq1alUePHhV5tm7dmg0aNOCYMWPYvn17NmrUSDyC0WXfvn308fHhoUOHuG/fPk6YMIGVK1dmdnY2Y2Ji6OXlpdfWFi1a8PvvvzdZH2UfULMC+fXXX4vrKVOmcOLEieJaS1ZWFq2trcVKODUDXrta9cYbb/CDDz7QSVGcZ8+ecfz48axQoQKvXLnC3Nxc2tnZsXfv3nzzzTcZGRnJwYMHMz8/nx9++CH79u2rl76kOgwePJivv/66iGvYsCE3bNjAgoIC2tvb8/z58yIuIiKCW7ZsKdEOlTaUkZEhVnrPnDnDypUrF3ssTpKdO3cWDjw1zqH2c+DLly9nYGCgmChnzJjBMWPGmKynId5//3126dKFR48eFX9Dhw4V+li2bJlYUdf9QUFNfbT9fPv2bapUKuEM7969m8HBwWQJ9qrUjTFiYmJYrVo1DhkyhCQ5e/Zsenl5cfz48Xz11VcZHBzM/fv3Mycnh9bW1rx+/bpe+pkzZ+qtjBcVFdHCwoI3btzg3bt3aW5uLj55u3v3btaqVYsswbZN9c+AAQM4cuRIEUeS9erV4++//86cnBxWrlxZ/MDXJS8vj1ZWVtyzZw8vXrzIixcvii0Ypury6quv6sXVr1+fmzdv5oEDB+jp6Vns6Y2peUw5P926dYu2trYsKip6YT1KJJJ/nnPnztHOzk48WdUSGxvLbdu2sXv37gwNDS32lPj69etUqVR6i4FffvllsSeYN2/eZGRkJI8dO8aoqCgOGzZMzPNliTLrRLdr106smPXu3Zuffvop27Rpw4ULF5KaFbC33nqLJNmzZ0+xyknN3lztat+bb76pt3LaunVr8fjeVLp169aJbRnU7PvR7tmhZrI3MzPjo0ePSM0NaeHChbSzsxOrOabK3rBhg97KWmJiIq2srPQcHFP1M8WECRPYrVs30kA53377rZ6x/vjjj+LRdkpKCsuVK6dn3La2tvzll194+vRpJiYminAln332mXiUTU17APDOnTv84osv2LVrVxGXl5dHR0dHnj171mR9lH1Aks7OzmK1t6ioiNWrVxcr2rqcPn2aDg4OemEdOnTgV199RZKsW7cut23bphdvjDp16vDrr7/mqVOn6OzszGPHjvH8+fPi6Qg1Tp+uY8FS1CEoKEhvL7CNjQ3j4+N58eJF2tjYiDR3794VtmbKDg3ZEDU/jA4fPsxOnTpx0aJFenFaXFxcxI+nwsJCVqtWTeh15MiReqvLrVu35ooVK0zW0xDt2rXjt99+qxfWuXNnsXL55ptvcubMmaSmPtqVCm191q1bR2rsQrsSTI2TO3jwYNKEvRrTjTE2b95MR0dHkmSnTp04depUnjhxgrdv3xa6P3nypJDRRbdNJHnixAk6OTmxsLCQv/zyi954nD17tnDWTdm2qf4JDAwUc46WIUOGcPbs2fz888/Zu3dvvTgtJ06cYKVKlZTBZAl18fPz45EjR0jNjU7b5/PmzRPzji6m5jHl/KQ75l9UjxKJ5J8lPz+foaGh/Oyzz5RRgsuXLxMAExIS9MIPHTpEZ2dnvbBGjRrpvd/24MEDRkZG8tq1a5w0aZKI8/DwMPgk/n+J1okuc6dznDx5EhEREQCA8PBwfPHFF8jIyMCbb75ZLB4AsrOzAc0b5GvXrhVxJ0+eRFRUlJA7ffp0qdNFRkYKOWhOHsjJyUF6ejqGDRsGT09PVK5cGYmJibC0tMSoUaNQq1YtcVyXqbLPnz8Pf39/EXfy5EmEhoYWe/vdWP10iY2NRVpaGgDg6dOniImJQaNGjQAD5UAnz2vXruHdd9/Vq5OXlxfKly8vZC0tLeHm5oa6devCzc0NBQUFIk6XEydOiHwKCwsxZ84cREREwNfXF7a2tnj48KE48eOjjz5C3bp1ERYWBpioj7E+SE9PB0lMnz4dt2/fNqgTW1tb5OTkCL3s2rULp0+fxqBBg5CXl4eLFy8aTAcAO3bsEO28dOkSbt68iQYNGsDS0hK5ubmoVasWateuDTs7OyFXrlw50e/Z2dk4f/68yTpkZGTgxo0bog5xcXGws7ODt7c3SKKwsBDZ2dnIyMjA8OHDha3BhB0as6HatWvjo48+wqNHj/D666/rxemSnZ0Nkpg8eTLu3r0r6nbixAm9fjh9+jTq169fYj2VnDp1qpjOdcex7v/NzMyQlZUFkpgyZQru3LmD+vXrCzndcaWbrzF7NaYbLdeuXcP169cBjf1u2bJFjCFLS0tYW1sjIiICVatWRWFhIaDp85ycHDx79gwAcOzYMZCEra0tHjx4AGhOu5k+fTomTJgAc3PzYro8deqUaFdJtm2of9LT03Hz5k3Uq1dPyEHT59u3b8eXX36JefPm6cVpOXHihChbiam63LlzB5UqVSpmf+XKlUNiYqJIf+zYMZGfsXlMOT/p2sCL6lEikfyzzJo1C1ZWVpg0aZIIu3btGp48eQIAKCoqwqJFi1CjRg14eXkhMTER69evBwB4eHjg6dOn4n75888/49GjRxgwYACgOb60V69eWLJkCQICAnDhwgXUqVMH8fHxcHZ21vNPyhRlaSX6zp07tLe3F4+P9+3bRysrK166dEnIODg4iD1/O3fupL29PWvVqsVhw4YxNDSUFy9eZH5+Pq2srMS+vjt37tDOzk7kaywdNadq/Prrr6I8tVrN5s2b09fXl6GhoZwyZQp79uxJan5FRUVFsXbt2uzTpw/z8/NLLPvXX39lhQoVGBYWxqdPn3LmzJliq4cWU/XTZc6cOXR0dGSNGjVYqVIlvv3220bLuXfvHj09PVmzZk02b96cffr0EauDd+/eZcWKFRkcHCxeBvj222/p6urK5s2bMywsjIsXL9YrW0twcDCdnJzo5eVFT09P9u/fX6wEPn36lBEREfT392eNGjXYuXNncTqCqfoo+4CabT7Ozs6sWbMmP/roI7q6uurF6zJixAi6ubmxbt26DAsL4+nTp0mSR48epa+vr1Jc0KVLFzo5OdHf35/e3t5ctWoVqbEB7Ut0zZs3Z61atUSeu3fvpoODA2vXrs2goCCxj9NYHWJiYvQeTf3000985ZVXRDnNmjWjr68vQ0JCxL5bbZwxOzRkQyT57rvv0sbGhlevXlVGCd5//306OzszODiYs2fPFno1ZMcODg5Uq9Um66nk7t27xVaC79+/T0tLS2ZnZxcr5/3336eTkxNr1arFyZMn662YKu3Cx8eHJ0+eJE3YqzHdaNm9ezcrV67M6tWr083NjV27dhV1iY2NpYeHB6Ojo1m/fn0OGzaM1KzQduzYkW5ubgwODhZbD06dOkVPT0/WrVuXPj4+euPRUN21L0ebsm1j/aO0Iy1//vknAQjbNcSbb75Ja2trurm50c3NTe/FZFN1ad++PX18fBgSEsJp06axR48epGb1yM/Pj9WrV2dAQIBYRTY1jynnJ139vKgeJRLJP8eFCxdoZ2end4oRNWPZxcWFtWvXppubG5s1ayZ8tDlz5uid+jVu3Di6uLgwJCSE9evXF/em9PR0NmnShIcPHxayn376KRs0aMAGDRpw3759IrysoF2JLnOf/S4qKtI7X1mtVkOl+s+CuTI+NzcX+fn5sLe314srKChAuXLlhJzyurTptKSkpMDJyQlmZmYgKeqUlJQEOzs7WFtbC1llHsrr9PR0WFhYwMbGBkVFRX99OlKnjTBRPyX5+flITU2Fm5sbzMzM9OJ0y4FGl6mpqXBxcSmWZ25uLnJycuDo6CjC8vLykJKSgkqVKsHS0lKEPy+pqakoX768qIeW/8feeYdHVXx9/LtJSEgoIQkQQigJAdI7kISE3puAIL0JUVHBBlJUFAXBjogoioKKVBGlCEiH0HvvIAHSGyE92d3v+4e789u92d0kFF/E+TzPPsm0M+eeOTP37N2595rTR2kvPRkZGahatSrs7OxK6a8kPz8fRUVFRsfzwQcf4NKlS1i8eLFRXUNycnJQVFSEmjVrKouQk5ODnJwcuLm5Gdm6pKQEGRkZpcbAlA4kodFoYGNjA+hsQFIcC0mkpaWhZs2apXwNZvzQlA8VFhaiVatWGD9+PEaMGCHyTZGdnY3KlSuXsqtyHAzTZelpiKmxstTPnTt34ODggIULF2LPnj1YuXKlyXrKtCl/NWUbJVqtFikpKXBxcSnl5/qyqlWrolq1akZlmZmZsLW1RdWqVUWe3i7Ozs5ijGFCV2Xakm+bGh+lH+l58cUXUVBQgEWLFhnlVwRzuijHXKvVGpWlpqbCycnJyIaW1jHD9Ulpj3u1o0QieTiYW3Og+xUvJSUFNWrUQJUqVUS+VquFRqMxmqP5+flQq9WoXr26yMvJyUFGRgY8PDxEHgDk5ubCwcHB4vr9/4X+td+PXBAtkTxo/vrrL3z44YdYv349Nm3ahKCgIGWVx46hQ4eKQPTfQnFxMYKDg9GmTRsUFxcjLi4O69atg6+vr7KqxAQLFy7EvHnzcOjQIaMv9RKJRCJ5sMggWvKf4e7duzh06BCCgoLMvlHvcaKkpAQ7d+5EmzZtzO4FflRJTk7GuXPn4ODggPDw8FJXhiXm2bdvHxo3bvyf8HGJRCL5/0QG0RKJRCKRSCQSSQXRB9GP3kYTiUQikUgkEonkEUcG0RKJRCKRSCQSSQWRQbREIpFIJBKJRFJBZBAtkUgkEolEIpFUEBlESyQSiUQikUgkFUQG0RKJRCKRSCQSSQWRQbREIpFIJBKJRFJBZBAtkUgkEolEIpFUEBlESyQSiUQikUgkFUQG0RKJRCKRSCQSSQWRQbREIpFIJBKJRFJBZBAtkUgkEolEIpFUEBlESyQSiUQikUgkFUQG0RKJRCKRSCQSSQWRQbREIpFIJBKJRFJBZBAtkUgkEolEIpFUEBlESyQSiUQikUgkFUQG0RKJRCKRSCQSSQVRBQcH8+TJk8r8/zeK72Qidc82UKNRFqFGQAiqNfFVZv+/UZSeiiMvDoOmsAAh78+DY0CIsopEIpFIJBKJ5DEiNDQUKpXq0Quibyz7Dhc+eVeZDQBoOOhp+E16T5n9/8bdi2exb0g3AEDoh1+jTqeeyioSiUQikUgkkseIRzaI/uunb3Dx85lQ2dig+byfjMqqeHihsmtdo7z/b/Ju/gWq1ajaqImySCKRSCQSiUTymPHIB9FWtrbocvCashgFibdxduYkAIDX6PFwbhYFarU4O2MSChJvo/Gzr6C6TwBOTBoL+zp14TV6PK4snIM7J4/Cyq4y3Hv2h+fwZ/8nkETC+tW4tXYFClOTYFOlGlyatYTXmHGwdXIBAJz/4C3k3foLPq++javffIa7l87B9/XpcAmPwsk3xoPqEvhPnQV79/oAAE1hAa7/8BVS92xHyd0s2NV0RZ323eAxdAxU1jZQ5+Xi5OTnYVezNrxiX8LVhXNx59RR2LrUgnuPJ1H/yaH/U0+txo0Vi5FxcA/yE2/D1skZbl2eQMMBI8vVl0QikUgkEonkwfHoB9GVKiFy8e8i38ahCqp4eAEAjrw4FOkH9sChXkO0Wr0dt9etwrlZb6BKA0/ErNqKkpy72NEpDNb2DlBZ/X3vpJWtHYqzMgAAjZ99BU3GTgAAnJg0Fsnb/oC9e33Ujm6PO+dOIvvcKVRr7I3oZZuhsrHBnifbIu/GNdi51EJRRhoAwHfidLh1eQI7OoUBACIXrYFTSHOU3M3GgRG9kHfzL9QICoejTwBSdm9FYUoi6vcbhoA3Z6MoI+1v/ewqQ2VjA21JCawqVYI6LxcAEDTjc7j36AcAODpuONL274LKxgbVm/iiMDUJRRnp6LD9JFTWNmX2JZFIJBKJRCJ5cOiD6Ef26RzakhLsH9ZDfA7G9hdlAW98AOvK9si/HY8Ln72Hy19+CADwf3M2rGztRD1NQT6cwyLRbvMRdNh2AnU6dAcA3Fj6HahWI+PIfiRv+wPWle3R8qf18JsyE1E//I7Krm7IuXoJKbv+FLKgu+rbfP7P6BR3AfV6DzQq03Nj2XfIu/kXHANCELX4N/hNmYkWXy8FANxas1QE8gCgKSpEjaAwtN9yDB22n0R1n0AAQMqOTQCA9AO7kbZ/FwCg+fylaLl0I9ptPoKQD75CJUenCvUlkUgkEolEInlwPLJBtMraBn6TZ/zvM3G6KLN3ry+uJN9c9RNK7mbDvddTcGkebSDhbxo9/QJsqlQFVCrUe2IAAECdl4uClERkHT8EAFDZ2ODCp+/i1Fsv4fQ7r0FbUgIAyLthvJ2k4eDRqBnVBjZVqv4t0wSZOpnqnLs4Ne1lnHrrJVz97ou/C0nkxV83qt/4mVdQqbojrGzt4BweCQAoykgHAGSeOAwAsK9bDy7NWwI6u7h17gWVlVWF+5JIJBKJRCKRPBge4SDaCg0HjhIft669jcor1XAySkNlnDSFVeXK/0uQUBfm/y+pVouPS7MouHXtDZfIVv+rD8Da4Cq3OTQFOpmkkUy3zr3g/sRTYkuKKawqVfr7H60WAEBdMG9tZ6C3AffTl0QikUgkEonk3nlkg2hLFGWk4eJnfz/qTr93OGHdL8g4sl9RE8g8dlD8n34wDtAFq/Zu7nCo2wAAoFKpEDj9U4R88NX/PrO+RI2AUNG2vOhlVnarZyzvg68QNP0z2NZwVjYxi0N9DwBA/u14FKYmi/y8m3+BWs0D7UsikUgkEolEUn4e2SCaajVOTnnB6JO4cQ0A4NzsN1FyNxs1o9ogaMbnYqvDuVlToS0uNpJzef5HOPbqaJx6czz++vFrAEC9voOhsrZBnU49UKm6I0py7uLI80Nwc/USJKz7BVe/mYPDzw1CSXaWkazyUP/JwYBKhYxDcTg97RXcXrcKt9Ysw8XP3sPJqS8qq1ukTscesHVygbakBAdH98WFT97FyckvIK5/exQmJz3QviQSiUQikUgk5eeRC6Iru9WFysoK1GqRtGW90efOmRNIPxiHlB2bYG1XWbx4xW/y34/Ey4u/jvgVi43k1e87GFnHDyFx0+8gCbeuveE9fioAwLaGM5p/vRw1AkKRdeoozs16A6env4arCz+HpiAfVpVsAd2TPQz/6rGysYHKyvrv/3V1XSJaIXjmF7B3q4eEP37FmekTcHbmZNz8ZYnYR22qHQBY2er6s/u7n0rVHdHsyyVw9A1EQeJt3Fj2HZK3/4Fa0e1gV7N2ufqSSCQSiUQikTx4HrlH3JUHTWEBrGwqQWXzv+cgU62GtqQY1pXtUZSZbvToOUe/YOTfjoetk7N49rOSkrvZKEpPhcraGpVd3WBd2V6UUav9W7aJvclUq0GtVgTAhhSmJqPkbjas7e1hX6eu0XObzbXTFBbAytZOPJpP5OfnoTA9FZVr1oa1QxWjMpTRl0QikUgkEonkwfDIPif6QaB/DjMMnt8skUgkEolEIpHcL4/8c6LvBytbOzi4N0Bl17qwqVpdWSyRSCQSiUQikdwXj+WVaIlEIpFIJBKJ5GHwWF+JlkgkEolEIpFIHiYyiJZIJBKJRCKRSCqIDKIlEolEIpFIJJIK8kjtid4UVl+ZJZFIJBKJRCKRPDK8wZqP7yPuJBKJRCKRSCSSh4G8sVAikUgkEolEIrlHZBAtkUgkEolEIpFUEBlESyQSiUQikUgkFUQG0RKJRCKRSCQSSQWRQbREIpFIJBKJRFJBHqkgOicnB8ePH0daWppR/vXr13Hq1Cmo1WqRp9Vqcfr0aSQkJBjVNcWRI0cQExODhQsXKovKJCUlBcePH8eNGzeURfdNQUEB2rVrhxdeeAEAcPXqVUyePBnbtm1TVr1vCgoK8M477+Dbb79VFj0wsrKycPbsWZw9exYXL15EamqqsspD5/nnn0e7du1QUFCgLHqsSEpKwqlTp1BSUqIskkgkEolE8g/wSAXRW7duRXh4OIYPHy7ycnNz4evri5CQECxatMiobnBwMN577z2RZ46EhATs27cP586dUxZZRKvVIiIiAuHh4WjSpAlu376trHJfFBUVYdeuXdi/fz8AIC4uDh999BGWLl2qrFphJk+ejI8++kikExMTMXPmTMyePduo3oMkNjYWgYGBCAwMhK+vL1xdXVG/fn3MmjXL6AvQw+TAgQPYtWsXioqKlEX/Gr777ju89tpryMnJURYJnn32WYSEhGDPnj3KIpPcunULr7zyCtasWaMskkgkkn+clJQUnDt3zuzFloSEBJw9exYZGRnKogdGVlYWdu7ciR07diA9PV1ZjNzcXOzcuRNbtmwppUdRUREOHjyIP//8E9evXzcqS09PFxeU9B9L6/n9cO7cuVL9/9NYsgV08ceff/6JPXv2oLCw0Kjs5s2b+PPPP3HgwAGji1+FhYU4d+6ckQ2Tk5ON2j4SBAcH81Hh7t27tLOzo729PQsLC0mSv//+OwEQAJ944glRd8KECQTAdevWGUggk5KSePnyZZaUlIi83377jQD48ssvs6CggGfOnGFubq5RO1OsX7+eAOjt7U0AnDZtmlF5UVERs7KySJKZmZm8cOGCUb9arZZpaWnUarUsLCzk2bNnjfrNysoiAOrHQKvV8uLFi+LY9WRmZvL06dOldE5LS+OpU6d469Yto/zs7GwCYP369ZmVlcWioiKSZHx8PDMzM43qkmRCQgIvXrzIgoICo/ycnBzRZ1paGq9du0atVmtUx5AePXoQAH/++WdeuHCBv/76K318fAiAzz//vLK6ybHKyMgodZxZWVml8ky1Jcng4GACEOOipzzHeOvWLV6/ft2ovKioSNgsJyeH586dY3FxMUmyuLiYZ8+eZXZ2tlEbPeZ0zMzMFGPy119/MTk5WZTl5eUxOjqaAHjq1Cnm5eUZtPwfeltv3bqVLGOsNBqN8OXBgwczKyuLGo1GyCosLOSFCxeYnp4u8mggU61W88yZMywoKDDyabVazUuXLvHu3btG7SQSiaQsHB0dCYBWVlZiHdOjX68AMCQkxKjsQfHRRx+xUqVKoh87Ozt+8803onz79u2sUaOGKK9cuTKXL19OktyxYwed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";
const RESUME_IMG = RESUME_B64 ? 'data:image/png;base64,' + RESUME_B64 : 'resume.png';

const GRID = { w: 92, h: 98, padTop: 8, padRight: 12 };

const Desktop = {
  items: [
    { id: 'hd', name: 'Macintosh HD', icon: 'f-hd', cell: [0, 0], open: () => WM.open('finder', { path: ['Macintosh HD'] }) },
    { id: 'projects', name: 'Projects', icon: 'f-folder', cell: [0, 2], open: () => WM.open('finder', { path: ['Ashhh', 'Projects'] }) },
    { id: 'notes', name: 'Ashhhx.txt', icon: 'f-txt', cell: [0, 4], open: () => WM.open('textedit', { file: 'Ashhhx.txt' }) },
    { id: 'guide', name: 'Interface Guidelines.pdf', icon: 'f-pdf', cell: [1, 0], open: () => WM.open('preview', { file: 'Interface Guidelines.pdf' }) },
    { id: 'resume', name: 'Resume.pdf', icon: 'f-pdf', cell: [0, 1], open: () => WM.open('preview', { file: 'Resume.pdf', url: RESUME_IMG }) },
    { id: 'contactme', name: 'Contact Me', icon: 'app-mail', cell: [0, 3], open: () => WM.open('contactme') },
  ],

  init() {
    const host = $('#desktop');
    this.items.forEach(it => {
      const n = el(`<div class="dicon" data-id="${it.id}" tabindex="-1">
        <div class="art">${ic(it.icon)}</div><div class="lbl">${esc(it.name)}</div></div>`);
      host.append(n); it.node = n;
    });
    this.layout();
    addEventListener('resize', () => this.layout());

    on(host, 'pointerdown', '.dicon', (e, t) => this.grab(e, t));
    on(host, 'dblclick', '.dicon', (e, t) => {
      const it = this.items.find(i => i.id === t.dataset.id);
      if (it && it.open) it.open();
    });
    on(host, 'contextmenu', '.dicon', (e, t) => {
      this.select(t.dataset.id);
      const it = this.items.find(i => i.id === t.dataset.id);
      ctxMenu(e, [
        { id: 'o', label: 'Open', run: () => it.open && it.open() },
        { id: 'w', label: 'Open With', key: '▸' }, '-',
        { id: 'i', label: 'Get Info', key: '⌘I', run: () => Toast(`${it.name} — 0 bytes`) },
        { id: 'r', label: 'Rename', run: () => Toast('Renaming is left as an exercise.') },
        { id: 'd', label: 'Duplicate', key: '⌘D', run: () => Toast('Duplicated') }, '-',
        { id: 't', label: 'Move to Trash', key: '⌘⌫', run: () => this.trash(it) }, '-',
        { id: 'q', label: 'Quick Look', key: '␣', run: () => it.open && it.open() },
      ]);
    });

    /* marquee + deselect */
    host.addEventListener('pointerdown', e => {
      if (e.target.closest('.dicon, .wgt')) return;
      if (e.button !== 0) return;
      this.select(null);
      this.marquee(e);
    });
    host.addEventListener('contextmenu', e => {
      if (e.target.closest('.dicon, .wgt')) return;
      ctxMenu(e, [
        { id: 'nf', label: 'New Folder', run: () => this.newFolder() },
        { id: 'gi', label: 'Get Info', run: () => WM.open('about') }, '-',
        { id: 'cw', label: 'Change Wallpaper…', run: () => WM.open('settings', { section: 'wallpaper' }) },
        { id: 'ew', label: 'Edit Widgets…', run: () => Toast('Widgets are already on the desktop.') }, '-',
        { id: 'st', label: 'Use Stacks', key: '⌃⌘0' },
        { id: 'sb', label: 'Sort By', key: '▸' },
        { id: 'vo', label: 'Show View Options', key: '⌘J' },
      ]);
    });
    this.buildWidgets();
  },

  cellPos(col, row) {
    return {
      x: innerWidth - GRID.padRight - (col + 1) * GRID.w,
      y: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--mb-h')) + GRID.padTop + row * GRID.h,
    };
  },
  posCell(x, y) {
    const mb = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--mb-h'));
    const col = Math.round((innerWidth - GRID.padRight - GRID.w - x) / GRID.w);
    const row = Math.round((y - mb - GRID.padTop) / GRID.h);
    const maxRow = Math.floor((innerHeight - mb - GRID.padTop - 110) / GRID.h);
    return [clamp(col, 0, Math.floor(innerWidth / GRID.w) - 2), clamp(row, 0, Math.max(0, maxRow))];
  },
  layout() {
    this.items.forEach(it => {
      const p = this.cellPos(it.cell[0], it.cell[1]);
      it.node.style.left = p.x + 'px'; it.node.style.top = p.y + 'px';
    });
  },
  select(id) {
    this.items.forEach(i => i.node.classList.toggle('sel', i.id === id));
  },

  grab(e, node) {
    if (e.button !== 0) return;
    const it = this.items.find(i => i.id === node.dataset.id);
    this.select(it.id);
    const sx = e.clientX, sy = e.clientY;
    const ox = parseFloat(node.style.left), oy = parseFloat(node.style.top);
    let moved = false;
    node.setPointerCapture(e.pointerId);
    const mv = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      if (!moved) { moved = true; node.classList.add('drag'); node.classList.remove('settle'); }
      node.style.left = (ox + dx) + 'px';
      node.style.top = clamp(oy + dy, 22, innerHeight - 120) + 'px';
    };
    const up = () => {
      node.removeEventListener('pointermove', mv); node.removeEventListener('pointerup', up);
      if (!moved) return;
      node.classList.remove('drag');
      const [c, r] = this.posCell(parseFloat(node.style.left), parseFloat(node.style.top));
      /* nudge aside if the target cell is taken */
      let col = c, row = r, guard = 0;
      while (this.items.some(i => i !== it && i.cell[0] === col && i.cell[1] === row) && guard++ < 40) {
        row++; if (row > 5) { row = 0; col++; }
      }
      it.cell = [col, row];
      node.classList.add('settle');
      const p = this.cellPos(col, row);
      node.style.left = p.x + 'px'; node.style.top = p.y + 'px';
      setTimeout(() => node.classList.remove('settle'), 300);
    };
    node.addEventListener('pointermove', mv); node.addEventListener('pointerup', up);
  },

  marquee(e) {
    const box = $('#marquee'), sx = e.clientX, sy = e.clientY;
    let live = false;
    const mv = ev => {
      if (!live && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
      live = true; box.style.display = 'block';
      const l = Math.min(sx, ev.clientX), t = Math.min(sy, ev.clientY);
      const w = Math.abs(ev.clientX - sx), h = Math.abs(ev.clientY - sy);
      Object.assign(box.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px' });
      const R = { l, t, r: l + w, b: t + h };
      this.items.forEach(i => {
        const b = i.node.getBoundingClientRect();
        i.node.classList.toggle('sel', !(b.right < R.l || b.left > R.r || b.bottom < R.t || b.top > R.b));
      });
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); box.style.display = 'none'; };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  },

  newFolder() {
    const n = this.items.filter(i => i.name.startsWith('untitled folder')).length;
    const name = 'untitled folder' + (n ? ' ' + (n + 1) : '');
    let col = 0, row = 0, guard = 0;
    while (this.items.some(i => i.cell[0] === col && i.cell[1] === row) && guard++ < 40) { row++; if (row > 5) { row = 0; col++; } }
    const it = { id: 'nf' + Date.now(), name, icon: 'f-folder', cell: [col, row], open: () => WM.open('finder', { path: ['Ashhh', 'Desktop'] }) };
    const node = el(`<div class="dicon" data-id="${it.id}"><div class="art">${ic(it.icon)}</div><div class="lbl">${esc(name)}</div></div>`);
    $('#desktop').append(node); it.node = node; this.items.push(it);
    this.layout(); this.select(it.id);
  },
  trash(it) {
    it.node.style.transition = 'transform .22s var(--e-io),opacity .22s ease';
    it.node.style.transform = 'scale(.4)'; it.node.style.opacity = '0';
    setTimeout(() => { it.node.remove(); this.items = this.items.filter(i => i !== it); Dock.setTrashFull(true); }, 230);
  },

  buildWidgets() {
    $('#dwidgets').innerHTML = '';
    $('#dwidgets').append(Widgets.calendar({ compact: true }), Widgets.weather({ compact: true }), Widgets.stocks({ compact: true }));
  }
};

/* Sleep / lock screen */
const Screen = {
  brightness: 0.92,
  /* Dim with an overlay, never `filter` on the wallpaper: a filtered element gets
     its own render surface, and Chromium then composites the desktop icons *above*
     any backdrop-filter panel instead of blurring them into it. Dimming the whole
     stage is also what real brightness does — windows included. */
  setBrightness(v) {
    this.brightness = clamp(v, .25, 1);
    const d = $('#dimmer');
    if (d) d.style.opacity = ((1 - this.brightness) * .78).toFixed(3);
  },
  sleep() {
    Pop.close();
    const v = el(`<div id="sleeper"></div>`);
    document.body.append(v);
    setTimeout(() => { v.classList.add('wake'); setTimeout(() => v.remove(), 900); }, 1000);
  }
};

/* Toast — used for the handful of actions that have no real destination */
let toastTimer;
function Toast(msg) {
  let t = $('#toast');
  if (!t) { t = el(`<div id="toast"></div>`); $('#stage').append(t); }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2100);
}
/* ============================================================================
   8 · DOCK  —  parabolic magnification driven by one rAF loop
   ========================================================================== */
const DOCK_ITEMS = [
  'finder', 'launchpad', 'safari', 'mail', 'messages', 'maps', 'photos',
  'notes', 'calendar', 'music', 'terminal', 'calculator', 'settings', '|', 'trash'
];

const Dock = {
  gap: 5, padX: 8, spread: 2.9,
  slots: [],           /* {node, base, w, id} */
  mx: null,            /* pointer x in dock space, null = not hovering */
  cur: [], tgt: [],    /* per-icon scale, smoothed */
  running: false, trashFull: false,

  init() {
    const dock = $('#dock');
    dock.innerHTML = '';
    this.slots = [];
    DOCK_ITEMS.forEach(id => {
      if (id === '|') { const d = el('<div class="divider"></div>'); dock.append(d); this.slots.push({ divider: true, node: d }); return; }
      const app = APPS[id];
      const node = el(`<div class="di" data-app="${id}" role="button" aria-label="${esc(app.name)}">
          <div class="art">${ic(app.icon)}</div><span class="dot"></span><span class="hit"></span></div>`);
      dock.append(node);
      this.slots.push({ node, id, app });
    });
    dock.append(el('<div id="docktip"></div>'));

    this.cur = this.slots.map(() => 1);
    this.tgt = this.slots.map(() => 1);
    this.measure();

    dock.addEventListener('pointermove', e => { this.mx = e.clientX; this.kick(); });
    dock.addEventListener('pointerenter', e => { this.mx = e.clientX; this.kick(); });
    dock.addEventListener('pointerleave', () => { this.mx = null; this.hideTip(); this.kick(); });

    on(dock, 'pointerdown', '.di', (e, t) => {
      if (e.button !== 0) return;
      t.classList.add('press');
      const up = () => { t.classList.remove('press'); removeEventListener('pointerup', up); };
      addEventListener('pointerup', up);
    });
    on(dock, 'click', '.di', (e, t) => this.activate(t.dataset.app, t));
    on(dock, 'contextmenu', '.di', (e, t) => this.ctx(e, t));

    addEventListener('resize', () => this.measure());
    Bus.on('dockprefs', () => { this.measure(); });
  },

  /** Recompute base geometry; called on resize and preference changes. */
  measure() {
    const S = SYS.dockSize;
    document.documentElement.style.setProperty('--dock-size', S + 'px');
    this.gap = Math.round(S * 0.095);
    this.padX = Math.round(S * 0.15);
    let x = this.padX;
    this.slots.forEach(s => {
      if (s.divider) { s.w = Math.round(S * 0.30); s.base = x + s.w / 2; x += s.w; return; }
      s.w = S; s.base = x + S / 2; x += S + this.gap;
    });
    this.baseW = x - this.gap + this.padX;
    this.paint(true);
  },

  kick() { if (!this.running) { this.running = true; raf(this.frame); } },

  frame: null,   /* assigned below (needs `this` bound) */

  step() {
    const S = SYS.dockSize, dock = $('#dock');
    const rect = dock.getBoundingClientRect();
    const MAG = SYS.dockMagOn ? SYS.dockMag : 1;
    const reach = this.spread * S;

    /* --- targets ------------------------------------------------------- */
    /* Measured against the *rest* layout, not the live one. Feeding the magnified
       centres back in makes the scale an input to itself, which drags the peak off
       the icon you are actually pointing at as soon as magnification gets large.
       The tray is centre-anchored, so its midpoint is the one stable reference. */
    const restLeft = rect.left + rect.width / 2 - this.baseW / 2;
    let hovered = -1, best = 1e9;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s.divider) { this.tgt[i] = 1; continue; }
      if (this.mx == null) { this.tgt[i] = 1; continue; }
      const cx = restLeft + s.base;
      const d = Math.abs(this.mx - cx);
      if (d < best) { best = d; hovered = i; }
      const u = clamp(1 - d / reach, 0, 1);
      /* cosine bell — matches the real dock's falloff far better than linear */
      this.tgt[i] = 1 + (MAG - 1) * (0.5 - 0.5 * Math.cos(Math.PI * u)) ** 0.86;
    }

    /* --- smoothing (critically damped feel) ------------------------------ */
    let settled = true;
    for (let i = 0; i < this.cur.length; i++) {
      const d = this.tgt[i] - this.cur[i];
      if (Math.abs(d) > 0.0007) { this.cur[i] += d * 0.38; settled = false; }
      else this.cur[i] = this.tgt[i];
    }

    this.paint();

    /* tooltip follows the nearest icon while hovering */
    if (this.mx != null && hovered >= 0 && best < S * 0.75) this.showTip(hovered);
    else this.hideTip();

    if (!settled) raf(this.frame); else this.running = false;
  },

  /** Lay icons out from their smoothed widths so nothing ever overlaps. */
  paint(force) {
    const S = SYS.dockSize;
    let total = this.padX * 2;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      total += (s.divider ? s.w : S * this.cur[i]) + (s.divider ? 0 : this.gap);
    }
    total -= this.gap;

    let x = this.padX;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i], k = this.cur[i];
      if (s.divider) {
        s.laidCenter = x + s.w / 2;
        s.node.style.transform = `translateX(${(x).toFixed(2)}px)`;
        x += s.w; continue;
      }
      const w = S * k;
      s.laidCenter = x + w / 2;
      /* translate so the (unscaled) box lands centred on its slot, then scale from the base */
      const tx = s.laidCenter - S / 2;
      s.node.style.setProperty('--tf', `translate3d(${tx.toFixed(2)}px,0,0) scale(${k.toFixed(4)})`);
      s.node.style.transform = `translate3d(${tx.toFixed(2)}px,0,0) scale(${k.toFixed(4)})`;
      x += w + this.gap;
    }
    $('#dock').style.width = total.toFixed(2) + 'px';
  },

  showTip(i) {
    const s = this.slots[i]; if (!s || !s.app) return;
    const tip = $('#docktip');
    tip.textContent = s.app.name;
    tip.style.left = s.laidCenter + 'px';
    tip.classList.add('on');
  },
  hideTip() { const t = $('#docktip'); if (t) t.classList.remove('on'); },

  slotFor(id) { return this.slots.find(s => s.id === id); },
  rectFor(id) {
    const s = this.slotFor(id);
    if (!s) { const d = $('#dock').getBoundingClientRect(); return { x: d.left + d.width / 2, y: d.top + d.height / 2, w: SYS.dockSize, h: SYS.dockSize }; }
    const d = $('#dock').getBoundingClientRect();
    return { x: d.left + s.laidCenter, y: d.bottom - 9 - SYS.dockSize / 2, w: SYS.dockSize, h: SYS.dockSize };
  },

  activate(id, node) {
    if (id === 'launchpad') { Launchpad.toggle(); return; }
    if (id === 'trash') { WM.open('finder', { path: ['Trash'] }); return; }
    const existing = WM.byApp(id);
    if (existing.length) {
      const mini = existing.find(w => w.min);
      if (mini) WM.unmin(mini.id);
      else WM.focus(existing[existing.length - 1].id);
      return;
    }
    this.bounce(id);
    WM.open(id);
  },

  bounce(id) {
    const s = this.slotFor(id); if (!s) return;
    s.node.classList.remove('bounce'); void s.node.offsetWidth;
    s.node.classList.add('bounce');
    setTimeout(() => s.node.classList.remove('bounce'), 3200);
  },
  stopBounce(id) { const s = this.slotFor(id); if (s) s.node.classList.remove('bounce'); },

  setRunning(id, on) { const s = this.slotFor(id); if (s) s.node.classList.toggle('run', on); },
  setTrashFull(full) {
    this.trashFull = full;
    const s = this.slotFor('trash'); if (s) s.node.querySelector('.art').innerHTML = ic(full ? 'app-trash-full' : 'app-trash');
  },

  ctx(e, t) {
    const id = t.dataset.app, app = APPS[id];
    const open = WM.byApp(id);
    if (id === 'trash') {
      return ctxMenu(e, [
        { id: 'o', label: 'Open', run: () => WM.open('finder', { path: ['Trash'] }) },
        { id: 'e', label: 'Empty Trash', disabled: !this.trashFull, run: () => { this.setTrashFull(false); Toast('Trash emptied'); } },
      ]);
    }
    const items = [];
    if (open.length > 1) items.push({ head: 'Windows' }, ...open.map((w, i) => ({ id: 'w' + i, label: w.title, run: () => WM.focus(w.id) })), '-');
    items.push(
      { id: 'new', label: 'New Window', run: () => WM.open(id, { force: true }) },
      { id: 'opt', label: 'Options', key: '▸' },
      { id: 'show', label: 'Show in Finder', run: () => WM.open('finder', { path: ['Macintosh HD', 'Applications'], select: app.name + '.app' }) },
      '-',
      open.length
        ? { id: 'quit', label: 'Quit', run: () => WM.quitApp(id) }
        : { id: 'open', label: 'Open', run: () => this.activate(id, t) }
    );
    ctxMenu(e, items);
  }
};
Dock.frame = () => Dock.step();
/* ============================================================================
   9 · WINDOW MANAGER
   ========================================================================== */
const TL_HTML =
  `<div class="tl" data-tl>
     <b class="c" data-w="close">${ic('g-x')}</b>
     <b class="m" data-w="min">${ic('g-minus')}</b>
     <b class="f" data-w="zoom">${ic('g-chev-ud')}</b>
   </div>`;

/** Standard title bar markup for apps that want one. */
function titlebar(title, o = {}) {
  return `<div class="tb${o.tall ? ' tall' : ''}${o.plain ? ' plain' : ''}${o.dark ? ' dark' : ''}" data-drag>
    <div class="title">${esc(title)}</div>
    <div class="tbz">${TL_HTML}${o.left || ''}</div>
    <div class="grow"></div>
    <div class="tbz">${o.right || ''}</div>
  </div>`;
}

const WM = {
  list: [], z: 10, seq: 0, cascade: 0,

  mb() { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--mb-h')) || 25; },
  dockTop() { return innerHeight - (SYS.dockSize + 14 + 12); },

  byApp(id) { return this.list.filter(w => w.app === id && !w.dead); },
  get front() { return this.list.filter(w => !w.min && !w.dead).sort((a, b) => a.zi - b.zi).pop(); },

  open(appId, opts = {}) {
    const app = APPS[appId];
    if (!app) return Toast('Unknown app: ' + appId);
    if (!opts.force) {
      const ex = this.byApp(appId);
      if (ex.length && app.single !== false) {
        const w = ex[ex.length - 1];
        if (w.min) this.unmin(w.id); else this.focus(w.id);
        if (app.reopen) app.reopen(w, opts);
        return w;
      }
    }
    Dock.bounce(appId);

    const id = 'w' + (++this.seq);
    const W = Math.min(opts.w || app.w || 860, innerWidth - 60);
    const H = Math.min(opts.h || app.h || 560, innerHeight - this.mb() - 90);
    const step = 26, n = this.cascade++ % 7;
    const L = opts.x != null ? Math.round(clamp(opts.x, 14, innerWidth - W - 14))
      : Math.round(clamp((innerWidth - W) / 2 - 90 + n * step, 14, innerWidth - W - 14));
    const T = opts.y != null ? Math.round(clamp(opts.y, this.mb() + 6, innerHeight - H - 90))
      : Math.round(clamp(this.mb() + 26 + n * step, this.mb() + 6, innerHeight - H - 90));

    const node = el(`<div class="win opening" id="${id}" data-app="${appId}"></div>`);
    Object.assign(node.style, { left: L + 'px', top: T + 'px', width: W + 'px', height: H + 'px' });

    const w = {
      id, app: appId, node, title: app.name, min: false, zoomed: false,
      minW: app.minW || 380, minH: app.minH || 240, zi: 0, api: {}
    };
    this.list.push(w);

    node.innerHTML = (app.mount ? app.mount(w, opts) : `<div class="wb"></div>`) +
      ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'].map(d => `<div class="rz rz-${d}" data-rz="${d}"></div>`).join('');

    const slot = node.querySelector('[data-tl]');
    if (slot) slot.outerHTML = TL_HTML.replace(' data-tl', '');
    else node.insertAdjacentHTML('afterbegin', TL_HTML.replace('class="tl"', 'class="tl float"'));

    $('#layer-win').append(node);
    if (app.ready) app.ready(w, opts);

    this.wire(w);
    this.focus(id);
    Dock.setRunning(appId, true);
    setTimeout(() => { node.classList.remove('opening'); Dock.stopBounce(appId); }, 320);
    return w;
  },

  wire(w) {
    const node = w.node;
    node.addEventListener('pointerdown', e => {
      if (!e.target.closest('.tl')) this.focus(w.id);
    }, true);
    on(node, 'click', '.tl b', (e, t) => {
      e.stopPropagation();
      const a = t.dataset.w;
      if (a === 'close') this.close(w.id);
      if (a === 'min') this.minimize(w.id);
      if (a === 'zoom') this.zoom(w.id);
    });
    on(node, 'pointerdown', '[data-drag]', (e, t) => {
      if (e.button !== 0) return;
      if (e.target.closest('button,input,.tl,.seg,.sfield,[data-nodrag]')) return;
      this.drag(w, e);
    });
    on(node, 'dblclick', '[data-drag]', e => {
      if (e.target.closest('button,input,.tl,.seg,.sfield,[data-nodrag]')) return;
      this.zoom(w.id);
    });
    on(node, 'pointerdown', '[data-rz]', (e, t) => { if (e.button === 0) this.resize(w, e, t.dataset.rz); });
  },

  focus(id) {
    const w = this.list.find(x => x.id === id); if (!w || w.dead) return;
    w.zi = ++this.z;
    this.list.forEach(x => { x.node.classList.toggle('front', x === w); x.node.style.zIndex = x.zi || 1; });
    const app = APPS[w.app];
    MenuBar.setApp(app.name, app.menus ? app.menus() : stdMenus(w.app));
    this.syncMenubarFill();
  },

  /* The menu bar goes opaque when a zoomed window reaches it, like the real thing. */
  syncMenubarFill() {
    const any = this.list.some(w => !w.dead && !w.min && w.zoomed);
    $('#menubar').classList.toggle('opaque', any);
  },

  close(id) {
    const w = this.list.find(x => x.id === id); if (!w || w.dead) return;
    w.dead = true;
    if (APPS[w.app].onClose) APPS[w.app].onClose(w);
    w.node.classList.add('closing');
    setTimeout(() => {
      w.node.remove();
      this.list = this.list.filter(x => x !== w);
      if (!this.byApp(w.app).length) Dock.setRunning(w.app, false);
      this.syncMenubarFill();
      const f = this.front;
      if (f) this.focus(f.id);
      else { MenuBar.setApp('Finder', APP_MENUS.finder); }
    }, 200);
  },

  minimize(id) {
    const w = this.list.find(x => x.id === id);
    if (!w || w.min || w.busy) return;
    w.busy = true; w.min = true;
    const n = w.node, r = n.getBoundingClientRect(), d = Dock.rectFor(w.app);
    const tx = d.x - (r.left + r.width / 2), ty = d.y - (r.top + r.height / 2);
    const sx = (d.w * 0.82) / r.width, sy = (d.h * 0.82) / r.height;
    n.classList.add('mini');
    const a = n.animate([
      { transform: 'translate(0px,0px) scale(1,1)', clipPath: 'polygon(0% 0%,100% 0%,100% 100%,0% 100%)', opacity: 1, borderRadius: '11px' },
      { transform: `translate(${tx * .5}px,${ty * .58}px) scale(${lerp(1, sx, .5)},${lerp(1, sy, .42)})`, clipPath: 'polygon(20% 0%,80% 0%,93% 100%,7% 100%)', opacity: .92, borderRadius: '22px', offset: .55 },
      { transform: `translate(${tx}px,${ty}px) scale(${sx},${sy})`, clipPath: 'polygon(43% 0%,57% 0%,100% 100%,0% 100%)', opacity: .3, borderRadius: '40px' },
    ], { duration: 430, easing: 'cubic-bezier(.42,.02,.58,1)', fill: 'forwards' });
    a.onfinish = () => {
      n.style.visibility = 'hidden'; w.busy = false;
      this.syncMenubarFill();
      const f = this.front; if (f) this.focus(f.id);
    };
    w.anim = a;
  },

  unmin(id) {
    const w = this.list.find(x => x.id === id);
    if (!w || !w.min || w.busy) return;
    w.busy = true; w.min = false;
    const n = w.node;
    n.style.visibility = '';
    /* Raise it without repainting the rest of the stack: a full focus() re-shadows
       every other window, and those shadows are expensive enough to eat frames off
       the front of the warp. The real focus lands when the window arrives. */
    n.style.zIndex = ++this.z;
    /* Un-hiding still costs a re-raster of the window's contents, since hidden layers
       get thrown away. Give the compositor two frames to catch up while the window
       sits shrunk in the dock, too small to see. */
    if (w.anim) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (w.min || !w.anim) return;
        w.anim.reverse();
        w.anim.onfinish = () => {
          n.classList.remove('mini'); if (w.anim) w.anim.cancel(); w.anim = null; w.busy = false;
          this.focus(id);
        };
      }));
    } else { n.classList.remove('mini'); w.busy = false; this.focus(id); }
  },

  /* AppKit's visibleFrame: zoom stops short of the dock instead of tucking under
     it. Read from the tokens, not the tray's box, so a mid-magnification hover
     can't change the answer. */
  visibleH() {
    const cs = getComputedStyle(document.documentElement);
    const px = k => parseFloat(cs.getPropertyValue(k)) || 0;
    return innerHeight - this.mb() - (px('--dock-size') + 14 + px('--dock-bottom') + 5);
  },

  zoom(id) {
    const w = this.list.find(x => x.id === id); if (!w) return;
    const n = w.node;
    const mb = this.mb();
    if (!w.zoomed) {
      w.prev = { left: n.style.left, top: n.style.top, width: n.style.width, height: n.style.height };
      w.zoomed = true; n.classList.add('zoomed');
      this.tweenBox(n, { left: 0, top: mb, width: innerWidth, height: this.visibleH() });
    } else {
      w.zoomed = false;
      this.tweenBox(n, {
        left: parseFloat(w.prev.left), top: parseFloat(w.prev.top),
        width: parseFloat(w.prev.width), height: parseFloat(w.prev.height)
      }, () => n.classList.remove('zoomed'));
    }
    this.syncMenubarFill();
  },

  tweenBox(n, to, done) {
    const from = { left: n.offsetLeft, top: n.offsetTop, width: n.offsetWidth, height: n.offsetHeight };
    const t0 = performance.now(), D = 300;
    const ease = t => 1 - Math.pow(1 - t, 3.2);
    const tick = now => {
      const t = clamp((now - t0) / D, 0, 1), k = ease(t);
      n.style.left = lerp(from.left, to.left, k) + 'px';
      n.style.top = lerp(from.top, to.top, k) + 'px';
      n.style.width = lerp(from.width, to.width, k) + 'px';
      n.style.height = lerp(from.height, to.height, k) + 'px';
      if (t < 1) raf(tick); else if (done) done();
    };
    raf(tick);
  },

  drag(w, e) {
    if (w.zoomed) return;
    const n = w.node;
    const sx = e.clientX, sy = e.clientY;
    const ox = n.offsetLeft, oy = n.offsetTop;
    const mb = this.mb();
    let vx = 0, vy = 0, lx = sx, ly = sy, lt = performance.now(), moved = false;
    n.classList.add('drag');
    document.body.style.cursor = 'default';
    const mv = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 2) return;
      moved = true;
      const now = performance.now(), dt = Math.max(8, now - lt);
      vx = (ev.clientX - lx) / dt * 16; vy = (ev.clientY - ly) / dt * 16;
      lx = ev.clientX; ly = ev.clientY; lt = now;
      n.style.left = clamp(ox + dx, -n.offsetWidth + 90, innerWidth - 90) + 'px';
      n.style.top = clamp(oy + dy, mb, innerHeight - 34) + 'px';
    };
    const up = () => {
      removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true);
      n.classList.remove('drag');
      if (!moved) return;
      /* short damped glide so releasing a flick feels physical, not abrupt */
      const speed = Math.hypot(vx, vy);
      if (speed < 3) return;
      let px = parseFloat(n.style.left), py = parseFloat(n.style.top);
      const tick = () => {
        vx *= 0.86; vy *= 0.86;
        px = clamp(px + vx, -n.offsetWidth + 90, innerWidth - 90);
        py = clamp(py + vy, mb, innerHeight - 34);
        n.style.left = px + 'px'; n.style.top = py + 'px';
        if (Math.hypot(vx, vy) > 0.4) raf(tick);
      };
      raf(tick);
    };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true);
  },

  resize(w, e, dir) {
    const n = w.node;
    if (w.zoomed) { w.zoomed = false; n.classList.remove('zoomed'); this.syncMenubarFill(); }
    const s = { x: e.clientX, y: e.clientY, l: n.offsetLeft, t: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight };
    const mb = this.mb();
    n.classList.add('rsz');
    const cursor = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' }[dir];
    document.body.style.cursor = cursor;
    const mv = ev => {
      const dx = ev.clientX - s.x, dy = ev.clientY - s.y;
      let L = s.l, T = s.t, W = s.w, H = s.h;
      if (dir.includes('e')) W = Math.max(w.minW, s.w + dx);
      if (dir.includes('s')) H = Math.max(w.minH, s.h + dy);
      if (dir.includes('w')) { W = Math.max(w.minW, s.w - dx); L = s.l + (s.w - W); }
      if (dir.includes('n')) { H = Math.max(w.minH, s.h - dy); T = s.t + (s.h - H); if (T < mb) { H -= (mb - T); T = mb; } }
      Object.assign(n.style, { left: L + 'px', top: T + 'px', width: W + 'px', height: H + 'px' });
    };
    const up = () => {
      removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true);
      n.classList.remove('rsz'); document.body.style.cursor = '';
      if (APPS[w.app].onResize) APPS[w.app].onResize(w);
    };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true);
  },

  /* ---- menu-driven helpers ---- */
  closeFront() { const f = this.front; if (f) this.close(f.id); },
  minFront() { const f = this.front; if (f) this.minimize(f.id); },
  zoomFront() { const f = this.front; if (f) this.zoom(f.id); },
  hideFront() { const f = this.front; if (f) this.minimize(f.id); },
  hideOthers() { const f = this.front; this.list.forEach(w => { if (w !== f && !w.min) this.minimize(w.id); }); },
  showAll() { this.list.filter(w => w.min).forEach(w => this.unmin(w.id)); },
  quitFront() { const f = this.front; if (f) this.quitApp(f.app); },
  quitApp(id) { this.byApp(id).forEach(w => this.close(w.id)); },
  cycle() {
    const vis = this.list.filter(w => !w.min && !w.dead);
    if (vis.length < 2) return;
    const back = vis.sort((a, b) => a.zi - b.zi)[0];
    this.focus(back.id);
  },
  forceQuitPanel() {
    const apps = [...new Set(this.list.filter(w => !w.dead).map(w => w.app))];
    const node = el(`<div class="pop wide" style="width:280px;padding:0">
      <div style="padding:12px 14px 8px;font-weight:600">Force Quit Applications</div>
      <div style="max-height:220px;overflow:auto;padding:0 6px 6px">
        ${apps.length ? apps.map(a => `<div class="mi" data-q="${a}" style="height:30px">${ic(APPS[a].icon, 'ico')}<span>${esc(APPS[a].name)}</span></div>`).join('')
        : '<div style="padding:14px;color:var(--txt-2);font-size:12.5px">No applications are open.</div>'}
      </div></div>`);
    node.querySelectorAll('.ico').forEach(s => s.style.cssText = 'width:19px;height:19px');
    on(node, 'click', '[data-q]', (e, t) => { Pop.close(); WM.quitApp(t.dataset.q); });
    Pop.open(node, { x: innerWidth / 2 - 140, y: innerHeight / 2 - 140, origin: 'center' });
  }
};

/* ---- global shortcuts ---------------------------------------------------- */
addEventListener('keydown', e => {
  const meta = e.metaKey || e.ctrlKey;
  const typing = /input|textarea/i.test(document.activeElement.tagName) || document.activeElement.isContentEditable;

  if (e.key === 'Escape') {
    if (Pop.cur) { Pop.close(); return; }
    if ($('#spot')) { Spotlight.close(); return; }
    if ($('#lpad')) { Launchpad.close(); return; }
    if ($('#nc')) { NotifCenter.close(); return; }
  }
  if (meta && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); Spotlight.toggle(); return; }
  if (meta && e.code === 'Space') { e.preventDefault(); Spotlight.toggle(); return; }
  if (e.key === 'F4') { e.preventDefault(); Launchpad.toggle(); return; }
  if (typing) return;
  if (meta && (e.key === 'w' || e.key === 'W')) { e.preventDefault(); WM.closeFront(); }
  else if (meta && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); WM.minFront(); }
  else if (meta && (e.key === 'q' || e.key === 'Q')) { e.preventDefault(); WM.quitFront(); }
  else if (meta && e.key === '`') { e.preventDefault(); WM.cycle(); }
  else if (meta && (e.key === 'n' || e.key === 'N')) {
    const f = WM.front; if (f) { e.preventDefault(); WM.open(f.app, { force: true }); }
  }
});
addEventListener('pointerup', () => { document.body.style.cursor = ''; });
/* ============================================================================
   10 · VIRTUAL FILESYSTEM
   ========================================================================== */
const dt = (m, d, h = 10, mi = 24) => new Date(2026, m - 1, d, h, mi);
/* A folder's date mirrors its newest child, the way the real Finder reports it. */
const FOLD = (name, children, icon = 'f-folder') => {
  const ds = (children || []).map(c => c.date).filter(Boolean);
  return { name, kind: 'folder', icon, children, k: 'Folder', date: ds.length ? new Date(Math.max(...ds)) : dt(7, 12, 9, 41) };
};
const FILE = (name, icon, size, k, date, extra) => Object.assign({ name, kind: 'file', icon, size, k, date }, extra);

const APP_FILES = ['Safari', 'Mail', 'Messages', 'Maps', 'Photos', 'Notes', 'Calendar', 'Music', 'Terminal',
  'Calculator', 'System Settings', 'Preview', 'Reminders', 'FaceTime', 'App Store', 'Podcasts', 'TV',
  'Weather', 'Stocks', 'Books', 'Contacts', 'Freeform', 'Clock']
  .map(n => FILE(n + '.app', 'f-app', 92 + n.length * 7 + 'MB', 'Application', dt(6, 12)));

const FS = FOLD('Macintosh HD', [
  FOLD('Applications', APP_FILES),
  FOLD('Library', [FOLD('Fonts', [FILE('SFPro.ttf', 'f-code', '4.2 MB', 'TrueType font', dt(3, 2))]), FOLD('Caches', []), FOLD('Preferences', [])]),
  FOLD('System', [FOLD('Library', []), FOLD('Volumes', [])]),
  FOLD('Users', [
    FOLD('Ashhh', [
      FOLD('Desktop', [
        FOLD('Projects', [
          FOLD('desktop-web', [
            FILE('index.html', 'f-code', '412 KB', 'HTML document', dt(7, 27, 16, 34)),
            FILE('README.md', 'f-txt', '3 KB', 'Markdown', dt(7, 27, 15, 10)),
            FILE('screenshot.png', 'f-img', '2.1 MB', 'PNG image', dt(7, 27, 16, 40)),
          ]),
          FOLD('cleantype', [FILE('main.swift', 'f-code', '18 KB', 'Swift source', dt(7, 19)), FILE('Package.swift', 'f-code', '2 KB', 'Swift source', dt(7, 19))]),
          FOLD('aurora-synth', [FILE('synth.ts', 'f-code', '44 KB', 'TypeScript', dt(7, 22)), FILE('index.html', 'f-code', '9 KB', 'HTML document', dt(7, 22))]),
          FILE('todo.md', 'f-txt', '1 KB', 'Markdown', dt(7, 26)),
        ]),
        FILE('Ashhhx.txt', 'f-txt', '1 KB', 'Plain text', dt(7, 27, 14, 2)),
        FILE('Screenshot 2026-07-27 at 4.34.11 PM.png', 'f-img', '3.8 MB', 'PNG image', dt(7, 27, 16, 34)),
        FILE('Interface Guidelines.pdf', 'f-pdf', '188 KB', 'PDF document', dt(7, 4)),
        FILE('Resume.pdf', 'f-pdf', '120 KB', 'PDF document', dt(7, 27), { url: RESUME_IMG }),
      ]),
      FOLD('Documents', [
        FOLD('Specs', [FILE('materials.pdf', 'f-pdf', '96 KB', 'PDF document', dt(7, 1)), FILE('motion-audit.pdf', 'f-pdf', '94 KB', 'PDF document', dt(7, 20))]),
        FOLD('Writing', [FILE('on-restraint.md', 'f-txt', '11 KB', 'Markdown', dt(7, 24)), FILE('shadow-notes.md', 'f-txt', '7 KB', 'Markdown', dt(7, 26))]),
        FILE('design-review.key', 'f-app', '24 MB', 'Keynote', dt(7, 23)),
        FILE('roadmap-2026.numbers', 'f-app', '1.8 MB', 'Numbers', dt(5, 9)),
      ]),
      FOLD('Downloads', [
        FILE('Xcode_26.xip', 'f-zip', '7.94 GB', 'Archive', dt(7, 15)),
        FILE('sf-symbols-7.dmg', 'f-app', '148 MB', 'Disk image', dt(7, 11)),
        FILE('wallpaper-tahoe-6k.heic', 'f-img', '32 MB', 'HEIC image', dt(7, 9)),
        FILE('render-final.mp4', 'f-movie', '412 MB', 'MPEG-4 movie', dt(7, 13)),
      ]),
      FOLD('Movies', [FILE('interaction-study.mp4', 'f-movie', '208 MB', 'MPEG-4 movie', dt(7, 13)), FILE('capture-timelapse.mov', 'f-movie', '1.2 GB', 'QuickTime movie', dt(7, 13))]),
      FOLD('Music', [FILE('aurora-synth-demo.wav', 'f-music', '58 MB', 'WAV audio', dt(7, 22)), FILE('lofi-loop.mp3', 'f-music', '6 MB', 'MP3 audio', dt(6, 30))]),
      FOLD('Pictures', [FILE('lake-braies.jpg', 'f-img', '5.2 MB', 'JPEG image', dt(6, 18)), FILE('dolomites-dawn.jpg', 'f-img', '4.4 MB', 'JPEG image', dt(6, 18)), FILE('night-sky.jpg', 'f-img', '3.1 MB', 'JPEG image', dt(5, 2))]),
      FOLD('Public', [FOLD('Drop Box', [])]),
    ]),
    FOLD('Shared', []),
  ]),
], 'f-hd');

const TRASH = FOLD('Trash', [FILE('old-draft.md', 'f-txt', '2 KB', 'Markdown', dt(7, 12))], 'app-trash');

/* Extension → icon / kind, for files created at runtime (terminal, New Folder). */
const EXT_MAP = {
  txt: ['f-txt', 'Plain text'], md: ['f-txt', 'Markdown'], rtf: ['f-txt', 'Rich text'],
  html: ['f-code', 'HTML document'], css: ['f-code', 'CSS'], js: ['f-code', 'JavaScript'],
  ts: ['f-code', 'TypeScript'], swift: ['f-code', 'Swift source'], json: ['f-code', 'JSON'],
  png: ['f-img', 'PNG image'], jpg: ['f-img', 'JPEG image'], jpeg: ['f-img', 'JPEG image'],
  gif: ['f-img', 'GIF image'], heic: ['f-img', 'HEIC image'], pdf: ['f-pdf', 'PDF document'],
  mp3: ['f-music', 'MP3 audio'], wav: ['f-music', 'WAV audio'], mov: ['f-movie', 'QuickTime movie'],
  mp4: ['f-movie', 'MPEG-4 movie'], zip: ['f-zip', 'ZIP archive'], app: ['f-app', 'Application'],
};
const extOf = n => (n.includes('.') ? n.split('.').pop() : '').toLowerCase();
const iconFor = n => (EXT_MAP[extOf(n)] || ['f-txt'])[0];
const kindFor = n => (EXT_MAP[extOf(n)] || [, 'Document'])[1];

function fsGet(path) {
  if (path[0] === 'Trash') return TRASH;
  let node = FS;
  for (let i = 1; i < path.length; i++) {
    if (!node.children) return null;
    const next = node.children.find(c => c.name === path[i]);
    if (!next) return null;
    node = next;
  }
  return node;
}
/* Friendly “Go”/sidebar shortcuts → absolute paths */
const PLACES = {
  'AirDrop': null, 'Recents': null,
  'Desktop': ['Macintosh HD', 'Users', 'Ashhh', 'Desktop'],
  'Documents': ['Macintosh HD', 'Users', 'Ashhh', 'Documents'],
  'Downloads': ['Macintosh HD', 'Users', 'Ashhh', 'Downloads'],
  'Movies': ['Macintosh HD', 'Users', 'Ashhh', 'Movies'],
  'Music': ['Macintosh HD', 'Users', 'Ashhh', 'Music'],
  'Pictures': ['Macintosh HD', 'Users', 'Ashhh', 'Pictures'],
  'Applications': ['Macintosh HD', 'Applications'],
  'Ashhh': ['Macintosh HD', 'Users', 'Ashhh'],
  'Macintosh HD': ['Macintosh HD'],
  'Trash': ['Trash'],
};
const RECENTS = () => [
  fsGet(['Macintosh HD', 'Users', 'Ashhh', 'Desktop', 'Projects', 'desktop-web', 'index.html']),
  fsGet(['Macintosh HD', 'Users', 'Ashhh', 'Desktop', 'Ashhhx.txt']),
  fsGet(['Macintosh HD', 'Users', 'Ashhh', 'Documents', 'Writing', 'on-restraint.md']),
  fsGet(['Macintosh HD', 'Users', 'Ashhh', 'Downloads', 'render-final.mp4']),
  fsGet(['Macintosh HD', 'Users', 'Ashhh', 'Desktop', 'Interface Guidelines.pdf']),
].filter(Boolean);

const fmtDate = d => d ? `${MONS3[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${time12(d).replace(NBSP, ' ')}` : '--';

/* ============================================================================
   11 · APP REGISTRY  (each app supplies mount/ready/menus)
   ========================================================================== */
const APPS = {};

/* ---------------------------------------------------------------- FINDER -- */
const SIDEBAR = [
  {
    head: 'Favourites', items: [
      ['AirDrop', 'g-airdrop'], ['Recents', 'g-clock-a'], ['Desktop', 'g-desktop'],
      ['Documents', 'g-docs'], ['Downloads', 'g-download'], ['Applications', 'g-apps'],
      ['Ashhh', 'g-folder-g'],
    ]
  },
  { head: 'iCloud', items: [['iCloud Drive', 'g-icloud-o']] },
  { head: 'Locations', items: [['Macintosh HD', 'g-hd'], ['Network', 'g-network']] },
  { head: 'Tags', items: [['Red', 'dot#ff5f57'], ['Orange', 'dot#ff9f0a'], ['Green', 'dot#30d158'], ['Blue', 'dot#0a84ff']] },
];

APPS.finder = {
  name: 'Finder', icon: 'app-finder', w: 940, h: 600, minW: 560, minH: 340, single: false,
  menus: () => APP_MENUS.finder,
  mount(w, opts) {
    const start = (opts.path || PLACES.Ashhh).slice();
    w.st = {
      path: start, view: 'icon', hist: [start.slice()], hi: 0,
      sidebar: true, pathbar: true, sel: null, q: '', colSel: [],
    };
    if (opts.path && opts.path.length === 1 && opts.path[0] === 'Trash') w.st.view = 'list';
    return `<div class="wb">
      <div class="sbar" data-drag data-fsb><div class="sb-top"><div data-tl></div></div>${SIDEBAR.map(g => `
        <div class="grp"><div class="gh">${g.head}</div>${g.items.map(([n, i]) => `
          <div class="si" data-place="${esc(n)}">${i.startsWith('dot#')
            ? `<span class="ico" style="width:11px;height:11px;margin:0 2px;border-radius:50%;background:${i.slice(3)}"></span>`
            : ic(i, 'ico')}<span class="nm">${esc(n)}</span></div>`).join('')}</div>`).join('')}
      </div>
      <div class="fx">
        <div class="fx-tb" data-drag>
          <button class="tbtn" data-nav="back" title="Back">${ic('g-chev-l')}</button>
          <button class="tbtn" data-nav="fwd" title="Forward">${ic('g-chev-r')}</button>
          <div class="fx-title" data-title></div>
          <div class="grow" style="flex:1"></div>
          <div class="seg" data-nodrag>
            <button data-view="icon" title="Icons">${ic('g-grid')}</button>
            <button data-view="list" title="List">${ic('g-list')}</button>
            <button data-view="column" title="Columns">${ic('g-columns')}</button>
            <button data-view="gallery" title="Gallery">${ic('g-gallery')}</button>
          </div>
          <button class="tbtn" data-sort title="Sort">${ic('g-sort')}</button>
          <button class="tbtn" data-share title="Share">${ic('g-share')}</button>
          <button class="tbtn" data-more title="More">${ic('g-ellipsis')}</button>
          <div class="sfield" data-nodrag style="width:150px"><span>${ic('g-search')}</span><input placeholder="Search" data-q></div>
        </div>
        <div class="fx-body scroll" data-body></div>
        <div class="fx-path" data-path></div>
      </div>
    </div>`;
  },
  ready(w) { Finder.wire(w); Finder.render(w); },
  onResize(w) { if (w.st.view === 'column') Finder.render(w); }
};

const Finder = {
  active() { const f = WM.front; return f && f.app === 'finder' ? f : WM.byApp('finder').filter(x => !x.min).pop(); },
  /* After anything mutates the FS, repaint every open Finder window. */
  reloadAll() { WM.byApp('finder').forEach(w => { if (!w.dead) this.render(w); }); },

  wire(w) {
    const n = w.node;
    on(n, 'click', '[data-place]', (e, t) => this.goto(t.dataset.place, w));
    on(n, 'click', '[data-view]', (e, t) => this.setView(t.dataset.view, w));
    on(n, 'click', '[data-nav="back"]', () => this.back(w));
    on(n, 'click', '[data-nav="fwd"]', () => this.fwd(w));
    on(n, 'click', '[data-sort]', (e, t) => {
      const r = t.getBoundingClientRect();
      Pop.open(Pop.menu([{ head: 'Sort By' },
        { id: 'n', label: 'Name', checked: w.st.sort !== 'date' && w.st.sort !== 'size', run: () => { w.st.sort = 'name'; this.render(w) } },
        { id: 'd', label: 'Date Modified', checked: w.st.sort === 'date', run: () => { w.st.sort = 'date'; this.render(w) } },
        { id: 's', label: 'Size', checked: w.st.sort === 'size', run: () => { w.st.sort = 'size'; this.render(w) } },
        { id: 'k', label: 'Kind', checked: w.st.sort === 'kind', run: () => { w.st.sort = 'kind'; this.render(w) } },
      ]), { x: r.left, y: r.bottom + 4, origin: 'top left' });
    });
    on(n, 'click', '[data-share]', () => Toast('Nothing to share — it is all local.'));
    on(n, 'click', '[data-more]', (e, t) => {
      const r = t.getBoundingClientRect();
      Pop.open(Pop.menu([
        { id: 'sb', label: w.st.sidebar ? 'Hide Sidebar' : 'Show Sidebar', key: '⌥⌘S', run: () => this.toggleSidebar(w) },
        { id: 'pb', label: w.st.pathbar ? 'Hide Path Bar' : 'Show Path Bar', key: '⌥⌘P', run: () => this.togglePathBar(w) },
        '-', { id: 'nf', label: 'New Folder', key: '⇧⌘N', run: () => this.newFolder(w) },
      ]), { x: r.right, y: r.bottom + 4, right: true, origin: 'top right' });
    });
    n.querySelector('[data-q]').addEventListener('input', e => { w.st.q = e.target.value; this.render(w); });

    on(n, 'dblclick', '.fitem,.fv-list .r', (e, t) => this.enter(w, t.dataset.name));
    on(n, 'click', '.fitem,.fv-list .r', (e, t) => { w.st.sel = t.dataset.name; this.markSel(w); });
    on(n, 'click', '.fv-col .ci', (e, t) => this.colClick(w, t));
    on(n, 'dblclick', '.fv-col .ci', (e, t) => { if (t.dataset.kind === 'file') this.enter(w, t.dataset.name); });
    on(n, 'click', '.fv-gal .strip .t', (e, t) => { w.st.sel = t.dataset.name; this.render(w); });
    on(n, 'click', '.fx-path .seg', (e, t) => { const i = +t.dataset.i; this.nav(w, w.st.path.slice(0, i + 1)); });
    on(n, 'contextmenu', '.fitem,.fv-list .r,.fv-col .ci', (e, t) => {
      w.st.sel = t.dataset.name; this.markSel(w);
      ctxMenu(e, [
        { id: 'o', label: 'Open', run: () => this.enter(w, t.dataset.name) },
        { id: 'w', label: 'Open With', key: '▸' }, '-',
        { id: 'i', label: 'Get Info', key: '⌘I', run: () => this.info(w, t.dataset.name) },
        { id: 'r', label: 'Rename' }, { id: 'd', label: 'Duplicate', key: '⌘D' }, '-',
        { id: 't', label: 'Move to Trash', key: '⌘⌫', run: () => this.trashSelected(w) }, '-',
        { id: 'q', label: 'Quick Look', key: '␣', run: () => this.info(w, t.dataset.name) },
      ]);
    });
    on(n, 'contextmenu', '[data-body]', e => {
      if (e.target.closest('.fitem,.r,.ci')) return;
      ctxMenu(e, [
        { id: 'nf', label: 'New Folder', run: () => this.newFolder(w) },
        { id: 'gi', label: 'Get Info' }, '-',
        { id: 'v', label: 'View', key: '▸' },
        { id: 's', label: 'Sort By', key: '▸' },
      ]);
    });
  },

  /* Stable per-name seed so a file's generated preview never changes. */
  seed(name) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997; return h; },

  contents(w) {
    const p = w.st.path;
    if (p[0] === 'Recents') return RECENTS();
    if (p[0] === 'AirDrop') return [];
    if (p[0] === 'iCloud Drive') return [FOLD('Desktop', []), FOLD('Documents', []), FILE('Keynote.key', 'f-app', '18 MB', 'Keynote', dt(6, 2))];
    if (p[0] === 'Network') return [FOLD('Ashhh-nas', [], 'f-hd')];
    const node = fsGet(p);
    let list = node && node.children ? node.children.slice() : [];
    if (w.st.q) { const q = w.st.q.toLowerCase(); list = this.deepSearch(node, q).slice(0, 200); }
    const s = w.st.sort;
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      if (s === 'date') return (b.date || 0) - (a.date || 0);
      if (s === 'kind') return String(a.k).localeCompare(b.k);
      if (s === 'size') return String(b.size || '').localeCompare(a.size || '');
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    return list;
  },
  deepSearch(node, q, out = []) {
    if (!node || !node.children) return out;
    node.children.forEach(c => {
      if (c.name.toLowerCase().includes(q)) out.push(c);
      if (c.children) this.deepSearch(c, q, out);
    });
    return out;
  },

  title(w) {
    const p = w.st.path;
    return w.st.q ? `Searching “${w.st.q}”` : p[p.length - 1];
  },

  render(w) {
    const st = w.st, n = w.node;
    n.querySelector('[data-title]').textContent = this.title(w);
    n.querySelector('.sbar').style.display = st.sidebar ? '' : 'none';
    $$('[data-view]', n).forEach(b => b.classList.toggle('on', b.dataset.view === st.view));
    $$('[data-place]', n).forEach(b => b.classList.toggle('on', b.dataset.place === st.path[st.path.length - 1] || (PLACES[b.dataset.place] || []).join('/') === st.path.join('/')));
    n.querySelector('[data-nav="back"]').classList.toggle('dis', st.hi <= 0);
    n.querySelector('[data-nav="fwd"]').classList.toggle('dis', st.hi >= st.hist.length - 1);

    const body = n.querySelector('[data-body]');
    const items = this.contents(w);
    body.classList.toggle('scroll', st.view !== 'column');
    body.style.overflow = st.view === 'column' ? 'hidden' : '';

    if (st.view === 'icon') {
      body.innerHTML = `<div class="fv-icon">${items.map(f => `
        <div class="fitem${f.name === st.sel ? ' sel' : ''}" data-name="${esc(f.name)}">
          <div class="art">${f.icon === 'f-img'
        ? `<div class="shot">${photoArt(this.seed(f.name), [0, 1, 3][this.seed(f.name) % 3])}</div>`
        : ic(f.icon)}</div><div class="nm">${esc(f.name)}</div></div>`).join('')}</div>`
        + (items.length ? '' : `<div style="padding:40px;text-align:center;color:var(--txt-3);font-size:13px">${st.q ? 'No results' : st.path[0] === 'AirDrop' ? 'No one nearby' : 'Empty folder'}</div>`);
    } else if (st.view === 'list') {
      body.innerHTML = `<div class="fv-list">
        <div class="hd"><div class="c1" style="padding-left:26px">Name</div><div class="c2">Date Modified</div><div class="c3">Size</div><div class="c4">Kind</div></div>
        ${items.map(f => `<div class="r${f.name === st.sel ? ' sel' : ''}" data-name="${esc(f.name)}">
          <div class="c1"><span class="tw">${f.kind === 'folder' ? ic('g-chev-r') : ''}</span><span class="art">${f.icon === 'f-img'
        ? `<div class="shot">${photoArt(this.seed(f.name), [0, 1, 3][this.seed(f.name) % 3])}</div>`
        : ic(f.icon)}</span><span>${esc(f.name)}</span></div>
          <div class="c2">${f.date ? `${MONS3[f.date.getMonth()]} ${f.date.getDate()}, ${f.date.getFullYear()} at ${time12(f.date).replace(NBSP, ' ')}` : '--'}</div>
          <div class="c3">${f.kind === 'folder' ? '--' : esc(f.size || '--')}</div>
          <div class="c4">${esc(f.k || (f.kind === 'folder' ? 'Folder' : 'Document'))}</div></div>`).join('')}
      </div>`;
    } else if (st.view === 'column') {
      this.renderColumns(w, body);
    } else {
      const cur = items.find(f => f.name === st.sel) || items[0];
      /* Gallery view previews real content for images instead of a file icon. */
      const art = (f, big) => f.icon === 'f-img'
        ? `<div class="shot${big ? ' big' : ''}">${photoArt(this.seed(f.name), [0, 1, 3][this.seed(f.name) % 3])}</div>`
        : `<div class="art">${ic(f.icon)}</div>`;
      body.innerHTML = `<div class="fv-gal">
        <div class="stage">${cur ? art(cur, true) : '<span style="color:var(--txt-3)">Nothing to preview</span>'}</div>
        ${cur ? `<div class="cap"><b>${esc(cur.name)}</b><span>${esc(cur.k || (cur.kind === 'folder' ? 'Folder' : 'Document'))}${cur.size ? ' · ' + esc(cur.size) : ''}${cur.date ? ' · ' + fmtDate(cur.date) : ''}</span></div>` : ''}
        <div class="strip">${items.map(f => `<div class="t${f === cur ? ' sel' : ''}" data-name="${esc(f.name)}">${art(f)}</div>`).join('')}</div>
      </div>`;
    }

    this.paintPath(w);
  },

  paintPath(w) {
    const st = w.st, pb = w.node.querySelector('[data-path]');
    if (!pb) return;
    pb.style.display = st.pathbar ? '' : 'none';
    /* in column view the selection lives in colSel, so the bar has to walk that
       too or it skips every folder the user clicked into */
    const segs = st.view === 'column' ? st.path.concat(st.colSel) : st.path;
    const tail = st.view === 'column' ? null : st.sel;
    pb.innerHTML = segs.map((s, i) =>
      `${i ? ic('g-chev-r') : ''}<span class="seg" data-i="${i}">${ic(i === 0 ? 'g-hd' : 'g-folder-g')}${esc(s)}</span>`).join('')
      + (tail ? `${ic('g-chev-r')}<span class="seg">${esc(tail)}</span>` : '');
    pb.querySelectorAll('svg').forEach(s => { s.style.width = '11px'; s.style.height = '11px'; });
  },

  renderColumns(w, body) {
    const st = w.st;
    const chain = [];
    let node = st.path[0] === 'Trash' ? TRASH : fsGet(st.path);
    if (!node) node = FS;
    chain.push({ node, items: this.contents(w) });
    /* follow the selection chain of folders */
    let sel = st.colSel.slice();
    let cur = node;
    for (let i = 0; i < sel.length; i++) {
      const nx = (cur.children || []).find(c => c.name === sel[i]);
      if (!nx) { sel = sel.slice(0, i); break; }
      chain.push({ node: nx, items: nx.children ? nx.children.slice().sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1) : null, file: nx.kind === 'file' });
      cur = nx;
      if (nx.kind === 'file') break;
    }
    st.colSel = sel;

    /* Only render the deepest columns that fit. macOS scrolls instead, but it
       always lands on a column boundary — dropping the ones that fall off the
       left gets the same look without a half-clipped first column. */
    const leafFile = chain.length && chain[chain.length - 1].file;
    const COL = 206.5, PREV = leafFile ? 250 : 0;
    const avail = (body.clientWidth || 620) - PREV;
    const cols = chain.filter(c => !c.file);
    const keep = Math.max(1, Math.floor(avail / COL));
    const from = Math.max(0, cols.length - keep);

    let html = '<div class="fv-col">';
    chain.forEach((c, ci) => {
      if (c.file || ci < from) return;
      const nextSel = sel[ci];
      html += `<div class="col" data-ci="${ci}">${(c.items || []).map(f => `
        <div class="ci${f.name === nextSel ? (ci === sel.length - 1 ? ' sel' : ' dim') : ''}" data-ci="${ci}" data-name="${esc(f.name)}" data-kind="${f.kind}">
          <span class="art">${ic(f.icon)}</span><span class="nm">${esc(f.name)}</span>${f.kind === 'folder' ? ic('g-chev-r', 'ch') : ''}</div>`).join('')
        || '<div style="padding:14px;color:var(--txt-3);font-size:12px;text-align:center">Empty</div>'}</div>`;
    });
    const leaf = chain[chain.length - 1];
    if (leaf && leaf.file) {
      const f = leaf.node;
      html += `<div class="fv-prev"><div class="big">${ic(f.icon)}</div><div class="nm">${esc(f.name)}</div>
        <dl><dt>Kind</dt><dd>${esc(f.k || 'Document')}</dd><dt>Size</dt><dd>${esc(f.size || '--')}</dd>
        <dt>Created</dt><dd>${fmtDate(f.date)}</dd><dt>Modified</dt><dd>${fmtDate(f.date)}</dd></dl>
        <button class="btn pri" data-openfile="${esc(f.name)}">Open</button></div>`;
    }
    body.innerHTML = html + '</div>';
    on(body, 'click', '[data-openfile]', (e, t) => this.enter(w, t.dataset.openfile));
  },

  colClick(w, t) {
    const ci = +t.dataset.ci;
    w.st.colSel = w.st.colSel.slice(0, ci);
    w.st.colSel[ci] = t.dataset.name;
    w.st.sel = t.dataset.name;
    this.render(w);
  },

  /* Repaint in place — a full render() here would swap the item nodes out from
     under the second click of a double-click, so folders would never open. */
  markSel(w) {
    $$('.fitem,.fv-list .r,.fv-gal .strip .t', w.node).forEach(n => n.classList.toggle('sel', n.dataset.name === w.st.sel));
    this.paintPath(w);
  },

  nav(w, path) {
    w = w || this.active(); if (!w) return;
    w.st.q = ''; const qi = w.node.querySelector('[data-q]'); if (qi) qi.value = '';
    w.st.path = path; w.st.sel = null; w.st.colSel = [];
    w.st.hist = w.st.hist.slice(0, w.st.hi + 1);
    w.st.hist.push(path.slice()); w.st.hi = w.st.hist.length - 1;
    this.render(w);
  },
  back(w) { w = w || this.active(); if (w && w.st.hi > 0) { w.st.hi--; w.st.path = w.st.hist[w.st.hi].slice(); w.st.sel = null; w.st.colSel = []; this.render(w); } },
  fwd(w) { w = w || this.active(); if (w && w.st.hi < w.st.hist.length - 1) { w.st.hi++; w.st.path = w.st.hist[w.st.hi].slice(); w.st.sel = null; w.st.colSel = []; this.render(w); } },

  goto(place, w) {
    w = w || this.active(); if (!w) return WM.open('finder', { path: PLACES[place] || PLACES.Ashhh });
    if (place === 'iCloud Drive') return this.nav(w, ['iCloud Drive']);
    if (place === 'AirDrop') return this.nav(w, ['AirDrop']);
    if (place === 'Recents') return this.nav(w, ['Recents']);
    if (place === 'Network') return this.nav(w, ['Network']);
    if (place.startsWith('Red') || place.startsWith('Orange') || place.startsWith('Green') || place.startsWith('Blue')) return Toast('No files tagged ' + place);
    this.nav(w, (PLACES[place] || PLACES.Ashhh).slice());
  },

  enter(w, name) {
    const items = this.contents(w);
    const f = items.find(x => x.name === name); if (!f) return;
    if (f.kind === 'folder') {
      /* search results / recents live outside the current path — resolve absolute */
      const abs = this.findPath(FS, f) || w.st.path.concat(name);
      this.nav(w, abs);
    } else this.openFile(f);
  },
  findPath(root, target, path = ['Macintosh HD']) {
    if (root === target) return path;
    for (const c of root.children || []) {
      const r = this.findPath(c, target, path.concat(c.name));
      if (r) return r;
    }
    return null;
  },
  openFile(f) {
    const n = f.name.toLowerCase();
    if (/\.app$/.test(n)) {
      const id = Object.keys(APPS).find(k => APPS[k].name.toLowerCase() === f.name.replace(/\.app$/i, '').toLowerCase());
      return id ? WM.open(id) : Toast(f.name + ' cannot open on this Mac.');
    }
    if (/\.(txt|md|swift|ts|html|json)$/.test(n)) return WM.open('textedit', { file: f.name, node: f });
    if (/\.(png|jpe?g|heic|pdf|key|numbers)$/.test(n)) return WM.open('preview', { file: f.name, node: f });
    if (/\.(mp3|wav)$/.test(n)) return WM.open('music');
    if (/\.(mp4|mov)$/.test(n)) return WM.open('preview', { file: f.name, node: f });
    Toast('No application can open “' + f.name + '”');
  },
  openSelected() { const w = this.active(); if (w && w.st.sel) this.enter(w, w.st.sel); },
  info(w, name) {
    const f = this.contents(w).find(x => x.name === name); if (!f) return;
    Toast(`${f.name} — ${f.k || 'Folder'}${f.size ? ', ' + f.size : ''}`);
  },
  setView(v, w) { w = w || this.active(); if (!w) return; w.st.view = v; this.render(w); },
  toggleSidebar(w) { w = w || this.active(); if (!w) return; w.st.sidebar = !w.st.sidebar; this.render(w); },
  togglePathBar(w) { w = w || this.active(); if (!w) return; w.st.pathbar = !w.st.pathbar; this.render(w); },
  newFolder(w) {
    w = w || this.active(); if (!w) return Desktop.newFolder();
    const node = fsGet(w.st.path);
    if (!node || !node.children) return;
    let name = 'untitled folder', i = 2;
    while (node.children.some(c => c.name === name)) name = 'untitled folder ' + i++;
    node.children.push(FOLD(name, []));
    w.st.sel = name; this.render(w);
  },
  trashSelected(w) {
    w = w || this.active(); if (!w || !w.st.sel) return;
    const node = fsGet(w.st.path);
    if (node && node.children) {
      const i = node.children.findIndex(c => c.name === w.st.sel);
      if (i >= 0) { TRASH.children.push(node.children[i]); node.children.splice(i, 1); Dock.setTrashFull(true); }
    }
    w.st.sel = null; this.render(w);
  }
};
/* ============================================================================
   12 · TERMINAL  —  a small but genuinely working shell
   ========================================================================== */
const HOME = ['Macintosh HD', 'Users', 'Ashhh'];
const shortPath = p => {
  if (p.join('/') === HOME.join('/')) return '~';
  if (p.slice(0, 3).join('/') === HOME.join('/')) return '~/' + p.slice(3).join('/');
  return '/' + p.slice(1).join('/');
};

APPS.terminal = {
  name: 'Terminal', icon: 'app-terminal', w: 760, h: 470, minW: 420, minH: 220, single: false,
  menus: () => stdMenus('terminal', {
    Shell: [
      { id: 'nt', label: 'New Tab', key: '⌘T', run: () => Term.newTab() },
      { id: 'nw', label: 'New Window', key: '⌘N', run: () => WM.open('terminal', { force: true }) }, '-',
      { id: 'cl', label: 'Clear Scrollback', key: '⌘K', run: () => Term.run('clear') },
    ],
    Edit: [{ id: 'c', label: 'Copy', key: '⌘C' }, { id: 'v', label: 'Paste', key: '⌘V' }, '-',
    { id: 'f', label: 'Find…', key: '⌘F', disabled: true }],
  }, ['Shell', 'Edit', 'View', 'Window', 'Help']),
  mount(w) {
    w.tabs = [Term.blankTab()]; w.tab = 0;
    return titlebar('Ashhh — -zsh', { dark: true, plain: false }) + `
      <div class="term">
        <div class="tm-tabs" data-tabs></div>
        <div class="tm-body" data-body tabindex="-1"></div>
      </div>
      <input data-ghost style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" autocomplete="off" spellcheck="false">`;
  },
  ready(w) { Term.wire(w); Term.render(w); }
};

const Term = {
  active() { const f = WM.front; return f && f.app === 'terminal' ? f : WM.byApp('terminal').filter(x => !x.min).pop(); },
  blankTab() {
    return {
      cwd: HOME.slice(), lines: [
        { html: `<span class="tdim">Last login: ${DAYS3[new Date().getDay()]} ${MONS3[new Date().getMonth()]} ${new Date().getDate()} ${time12(new Date()).replace(NBSP, ' ')} on ttys001</span>` }
      ], hist: [], hi: -1, buf: ''
    };
  },

  wire(w) {
    const body = w.node.querySelector('[data-body]');
    const ghost = w.node.querySelector('[data-ghost]');
    w.ghost = ghost;

    const focus = () => { ghost.focus({ preventScroll: true }); body.classList.remove('blur'); };
    body.addEventListener('mousedown', e => { if (!getSelection().toString()) setTimeout(focus, 0); });
    w.node.addEventListener('pointerdown', () => { if (WM.front === w) setTimeout(() => { if (!getSelection().toString()) focus(); }, 0); });
    ghost.addEventListener('blur', () => body.classList.add('blur'));

    ghost.addEventListener('input', () => { this.tab(w).buf = ghost.value; this.paintInput(w); });
    ghost.addEventListener('keydown', e => this.key(w, e));
    ghost.addEventListener('click', () => this.paintInput(w));

    on(w.node, 'click', '[data-newtab]', () => this.newTab(w));
    on(w.node, 'click', '.tm-tab', (e, t) => { if (e.target.closest('.x')) return; w.tab = +t.dataset.i; this.render(w); });
    on(w.node, 'click', '.tm-tab .x', (e, t) => { e.stopPropagation(); this.closeTab(w, +t.closest('.tm-tab').dataset.i); });
    setTimeout(focus, 60);
  },

  tab(w) { return w.tabs[w.tab]; },

  newTab(w) {
    w = w || this.active(); if (!w) return WM.open('terminal');
    w.tabs.push(this.blankTab()); w.tab = w.tabs.length - 1;
    this.render(w); w.ghost.focus();
  },
  closeTab(w, i) {
    if (w.tabs.length === 1) return WM.close(w.id);
    w.tabs.splice(i, 1); w.tab = clamp(w.tab, 0, w.tabs.length - 1); this.render(w);
  },

  /* One wrapper span, because the live input line is a flex row and flex throws
     away whitespace-only text nodes between items — which ate the gaps in
     "user@host ~ %" on the prompt you actually type at. */
  promptHTML(t) {
    return `<span class="tp"><span class="tg">${SYS.user.toLowerCase()}@${SYS.host}</span> ` +
      `<span class="tb2">${esc(shortPath(t.cwd))}</span> <span class="tw2">%</span> </span>`;
  },

  render(w) {
    const t = this.tab(w);
    w.node.querySelector('[data-tabs]').innerHTML =
      w.tabs.map((tb, i) => `<div class="tm-tab${i === w.tab ? ' on' : ''}" data-i="${i}">
        <span>${esc(shortPath(tb.cwd))} — -zsh</span><span class="x">${ic('g-x')}</span></div>`).join('') +
      `<div class="tm-tab" data-newtab style="padding:0 9px">${ic('g-plus')}</div>`;
    w.node.querySelector('.tm-tab[data-newtab] svg').style.cssText = 'width:10px;height:10px';
    const body = w.node.querySelector('[data-body]');
    body.innerHTML = t.lines.map(l => `<div class="tm-line">${l.html}</div>`).join('') +
      `<div class="tm-line tm-in" data-in>${this.promptHTML(t)}<span class="ed" data-ed></span></div>`;
    if (w.ghost) w.ghost.value = t.buf;
    this.paintInput(w);
    const tt = w.node.querySelector('.tb .title'); if (tt) tt.textContent = `${shortPath(t.cwd)} — -zsh — 80×24`;
  },

  paintInput(w) {
    const t = this.tab(w), ghost = w.ghost;
    const ed = w.node.querySelector('[data-ed]'); if (!ed) return;
    const v = t.buf, cp = ghost ? (ghost.selectionStart ?? v.length) : v.length;
    ed.innerHTML = `${esc(v.slice(0, cp))}<span class="tm-cur"></span>${esc(v.slice(cp))}`;
    const body = w.node.querySelector('[data-body]');
    body.scrollTop = body.scrollHeight;
  },

  key(w, e) {
    const t = this.tab(w);
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); this.exec(w, 'clear', true); return; }
    if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T')) { e.preventDefault(); this.newTab(w); return; }
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      t.lines.push({ html: this.promptHTML(t) + esc(t.buf) + '<span class="tr">^C</span>' });
      t.buf = ''; w.ghost.value = ''; this.render(w); return;
    }
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); this.exec(w, 'clear', true); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = t.buf;
      t.lines.push({ html: this.promptHTML(t) + esc(cmd) });
      if (cmd.trim()) { t.hist.push(cmd); }
      t.hi = t.hist.length;
      t.buf = ''; w.ghost.value = '';
      this.exec(w, cmd);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!t.hist.length) return;
      t.hi = clamp(t.hi - 1, 0, t.hist.length - 1);
      t.buf = t.hist[t.hi]; w.ghost.value = t.buf;
      setTimeout(() => { w.ghost.setSelectionRange(t.buf.length, t.buf.length); this.paintInput(w) }, 0);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!t.hist.length) return;
      t.hi = clamp(t.hi + 1, 0, t.hist.length);
      t.buf = t.hi >= t.hist.length ? '' : t.hist[t.hi];
      w.ghost.value = t.buf;
      setTimeout(() => { w.ghost.setSelectionRange(t.buf.length, t.buf.length); this.paintInput(w) }, 0);
      return;
    }
    if (e.key === 'Tab') { e.preventDefault(); this.complete(w); return; }
    setTimeout(() => this.paintInput(w), 0);
  },

  complete(w) {
    const t = this.tab(w), v = t.buf;
    const parts = v.split(/\s+/);
    const frag = parts[parts.length - 1] || '';
    let pool;
    if (parts.length <= 1) pool = Object.keys(CMDS).concat(['clear', 'help']);
    else {
      const node = fsGet(t.cwd);
      pool = (node && node.children ? node.children : []).map(c => c.name + (c.kind === 'folder' ? '/' : ''));
    }
    const hits = pool.filter(p => p.toLowerCase().startsWith(frag.toLowerCase()));
    if (!hits.length) return;
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0];
      t.buf = parts.join(' ') + (hits[0].endsWith('/') ? '' : ' ');
    } else {
      /* longest common prefix, then list the options like zsh does */
      let lcp = hits[0];
      hits.forEach(h => { while (!h.toLowerCase().startsWith(lcp.toLowerCase())) lcp = lcp.slice(0, -1); });
      parts[parts.length - 1] = lcp;
      t.buf = parts.join(' ');
      t.lines.push({ html: this.promptHTML(t) + esc(v) });
      t.lines.push({ html: hits.map(h => `<span class="${h.endsWith('/') ? 'tb2' : 'tw2'}">${esc(h.replace(/\/$/, ''))}</span>`).join('   ') });
    }
    w.ghost.value = t.buf;
    this.render(w);
    setTimeout(() => w.ghost.setSelectionRange(t.buf.length, t.buf.length), 0);
  },

  out(w, html) { this.tab(w).lines.push({ html }); },
  exec(w, raw, silent) {
    const t = this.tab(w);
    const line = raw.trim();
    if (!line) { this.render(w); return; }
    const [cmd, ...args] = line.split(/\s+/);
    const fn = CMDS[cmd];
    if (fn) {
      try { fn({ w, t, args, raw: line, out: h => this.out(w, h), term: this }); }
      catch (err) { this.out(w, `<span class="tr">${esc(cmd)}: ${esc(err.message)}</span>`); }
    } else {
      this.out(w, `<span class="tr">zsh: command not found: ${esc(cmd)}</span>`);
    }
    this.render(w);
    if (silent) w.ghost.focus();
  },
  run(cmd) { const w = this.active(); if (w) { this.tab(w).buf = ''; this.exec(w, cmd, true); } }
};

/* ---- the command table --------------------------------------------------- */
const CMDS = {
  help({ out }) {
    out(`<span class="ty">Available commands</span>`);
    const rows = [
      ['ls [-la] [dir]', 'list directory contents'],
      ['cd [dir]', 'change directory (.., ~, -, absolute)'],
      ['pwd', 'print working directory'],
      ['cat <file>', 'print a file'],
      ['open <file|.>', 'open in the matching app'],
      ['tree', 'recursive listing'],
      ['echo <text>', 'write text to stdout'],
      ['whoami / hostname / uname', 'identity'],
      ['date / uptime', 'time'],
      ['neofetch', 'system information'],
      ['mkdir / touch / rm', 'write to the virtual filesystem'],
      ['which <cmd>', 'locate a command'],
      ['history', 'command history'],
      ['df / top / ps', 'fake-but-plausible system stats'],
      ['theme [light|dark]', 'switch the appearance'],
      ['say <text>', 'notification banner'],
      ['clear', 'clear the screen (⌘K)'],
      ['exit', 'close the tab'],
    ];
    rows.forEach(([c, d]) => out(`  <span class="tg">${esc(c.padEnd(26))}</span><span class="tdim">${esc(d)}</span>`));
  },
  ls({ t, args, out }) {
    const flags = args.filter(a => a.startsWith('-')).join('');
    const rest = args.filter(a => !a.startsWith('-'));
    const target = rest.length ? resolve(t.cwd, rest[0]) : t.cwd;
    const node = fsGet(target);
    if (!node) return out(`<span class="tr">ls: ${esc(rest[0])}: No such file or directory</span>`);
    if (node.kind === 'file') return out(esc(node.name));
    const kids = node.children.slice().sort((a, b) => a.name.localeCompare(b.name));
    const all = flags.includes('a') ? [{ name: '.', kind: 'folder' }, { name: '..', kind: 'folder' }, { name: '.zshrc', kind: 'file', size: '1.2K', k: 'cfg' }, { name: '.gitconfig', kind: 'file', size: '312B' }].concat(kids) : kids;
    if (!all.length) return;
    if (flags.includes('l')) {
      out(`<span class="tdim">total ${all.length * 8}</span>`);
      all.forEach(f => {
        const dir = f.kind === 'folder';
        const perm = dir ? 'drwxr-xr-x' : '-rw-r--r--';
        const d = f.date || dt(7, 20);
        out(`<span class="tdim">${perm}</span>  <span class="tdim">${dir ? '12' : ' 1'} ${SYS.user.toLowerCase()} staff</span>  ` +
          `<span class="ty">${String(f.size || '4.0K').padStart(8)}</span>  <span class="tdim">${MONS3[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span>  ${colorName(f)}`);
      });
    } else {
      const cols = 4, rows = Math.ceil(all.length / cols);
      const wCol = Math.max(...all.map(f => f.name.length)) + 3;
      for (let r = 0; r < rows; r++) {
        let s = '';
        for (let c = 0; c < cols; c++) {
          const f = all[c * rows + r]; if (!f) continue;
          s += colorName(f, wCol);
        }
        out(s);
      }
    }
  },
  cd({ t, args, out }) {
    const a = args[0] || '~';
    if (a === '-') { const p = t.prev || HOME; t.prev = t.cwd; t.cwd = p; return; }
    const target = resolve(t.cwd, a);
    const node = fsGet(target);
    if (!node) return out(`<span class="tr">cd: no such file or directory: ${esc(a)}</span>`);
    if (node.kind !== 'folder') return out(`<span class="tr">cd: not a directory: ${esc(a)}</span>`);
    t.prev = t.cwd; t.cwd = target;
  },
  pwd({ t, out }) { out(esc('/' + t.cwd.slice(1).join('/')).replace('Macintosh HD', '')); },
  cat({ t, args, out }) {
    if (!args[0]) return out(`<span class="tr">usage: cat &lt;file&gt;</span>`);
    const node = fsGet(resolve(t.cwd, args[0]));
    if (!node) return out(`<span class="tr">cat: ${esc(args[0])}: No such file or directory</span>`);
    if (node.kind === 'folder') return out(`<span class="tr">cat: ${esc(args[0])}: Is a directory</span>`);
    const body = FILE_TEXT[node.name];
    if (!body) return out(`<span class="tdim">${esc(node.name)}: binary file (${esc(node.size || '?')})</span>`);
    body.split('\n').forEach(l => out(esc(l) || '&nbsp;'));
  },
  open({ t, args, out }) {
    const a = args[0] || '.';
    if (a === '.') { WM.open('finder', { path: t.cwd.slice() }); return out(`<span class="tdim">opening Finder at ${esc(shortPath(t.cwd))}</span>`); }
    const node = fsGet(resolve(t.cwd, a));
    if (!node) return out(`<span class="tr">Unable to find ${esc(a)}</span>`);
    if (node.kind === 'folder') WM.open('finder', { path: resolve(t.cwd, a) });
    else Finder.openFile(node);
  },
  tree({ t, out }) {
    const node = fsGet(t.cwd);
    out(`<span class="tb2">.</span>`);
    let dirs = 0, files = 0;
    (function walk(n, pre) {
      const kids = (n.children || []);
      kids.forEach((c, i) => {
        const last = i === kids.length - 1;
        out(`<span class="tdim">${pre}${last ? '└── ' : '├── '}</span>${colorName(c)}`);
        if (c.kind === 'folder') { dirs++; if (pre.length < 12) walk(c, pre + (last ? '    ' : '│   ')); }
        else files++;
      });
    })(node, '');
    out('');
    out(`<span class="tdim">${dirs} directories, ${files} files</span>`);
  },
  echo({ raw, out }) { out(esc(raw.slice(4).trim().replace(/^["']|["']$/g, ''))); },
  whoami({ out }) { out(SYS.user.toLowerCase()); },
  hostname({ out }) { out(SYS.host + '.local'); },
  uname({ args, out }) {
    out(args.includes('-a')
      ? `Darwin ${SYS.host}.local 25.0.0 Darwin Kernel Version 25.0.0: Tue Jun 16 21:04:12 PDT 2026; root:xnu-12377.41.5~19/RELEASE_ARM64_T6041 arm64`
      : 'Darwin');
  },
  date({ out }) {
    const d = new Date();
    out(`${DAYS3[d.getDay()]} ${MONS3[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${d.toTimeString().slice(0, 8)} IST ${d.getFullYear()}`);
  },
  uptime({ out }) { out(`${new Date().toTimeString().slice(0, 5)}  up ${upStr()}, 3 users, load averages: 1.82 2.04 1.96`); },
  history({ t, out }) { t.hist.forEach((h, i) => out(`<span class="tdim">${String(i + 1).padStart(5)}</span>  ${esc(h)}`)); },
  clear({ t }) { t.lines = []; },
  exit({ w, term }) { term.closeTab(w, w.tab); },
  df({ out }) {
    out(`<span class="ty">Filesystem      Size   Used  Avail Capacity  Mounted on</span>`);
    out(`/dev/disk3s1s1  1.8Ti  842Gi  921Gi    48%    /`);
    out(`/dev/disk3s6    1.8Ti  4.0Gi  921Gi     1%    /System/Volumes/VM`);
  },
  ps({ out }) {
    out(`<span class="ty">  PID TTY           TIME CMD</span>`);
    [['501', 'ttys000', '0:00.42', '-zsh'], ['842', '??', '2:14.08', '/System/Applications/Safari.app'], ['913', '??', '0:48.21', 'WindowServer'], ['1204', 'ttys001', '0:00.09', 'ps']]
      .forEach(([p, tt, tm, c]) => out(`${p.padStart(5)} ${tt.padEnd(9)} ${tm.padStart(8)} ${esc(c)}`));
  },
  top({ out }) {
    out(`<span class="ty">Processes: 512 total, 3 running, 509 sleeping, 2841 threads</span>`);
    out(`Load Avg: 1.82, 2.04, 1.96   CPU usage: 6.41% user, 3.12% sys, 90.47% idle`);
    out(`PhysMem: 34G used (2.1G wired), 94G unused.`);
    out(`<span class="tdim">(this is a snapshot — press ⌘K to clear)</span>`);
  },
  theme({ args, out }) {
    const m = (args[0] || '').toLowerCase();
    if (m === 'light' || m === 'dark') { Theme.set(m); out(`<span class="tg">appearance → ${m}</span>`); }
    else { Theme.toggle(); out(`<span class="tg">appearance → ${SYS.theme}</span>`); }
  },
  say({ raw, out }) { const m = raw.slice(3).trim(); Toast(m || 'Hello.'); out(`<span class="tdim">🔊 ${esc(m)}</span>`); },
  sudo({ out }) { out(`<span class="tr">${SYS.user.toLowerCase()} is not in the sudoers file. This incident has been reported.</span>`); },
  git({ args, out }) {
    if (args[0] === 'status') {
      out('On branch <span class="tg">main</span>');
      out("Your branch is up to date with 'origin/main'.");
      out(''); out('nothing to commit, working tree clean');
    } else if (args[0] === 'log') {
      [['a1f9c2e', 'ship the dock magnification curve'], ['7de4b01', 'genie minimize'], ['3c0aa88', 'squircle every icon']]
        .forEach(([h, m]) => { out(`<span class="ty">commit ${h}</span>`); out(`Author: ${SYS.user} <${SYS.user.toLowerCase()}@macbook.local>`); out(''); out('    ' + esc(m)); out(''); });
    } else out(`<span class="tdim">usage: git &lt;status|log&gt;</span>`);
  },
  curl({ args, out }) { out(`<span class="tdim">curl: (6) Could not resolve host: ${esc((args[0] || '').replace(/^https?:\/\//, '').split('/')[0] || 'localhost')}</span>`); },
  man({ args, out }) { out(`<span class="tdim">No manual entry for ${esc(args[0] || 'man')} — try <span class="tg">help</span>.</span>`); },
  /* mkdir / touch / rm write to the same virtual FS Finder reads from, so
     anything you create here shows up in an open Finder window. */
  mkdir({ t, args, out }) {
    const names = args.filter(a => !a.startsWith('-'));
    if (!names.length) return out(`<span class="tr">usage: mkdir &lt;name&gt;</span>`);
    const dir = fsGet(t.cwd);
    if (!dir || !dir.children) return out(`<span class="tr">mkdir: ${esc(t.cwd[t.cwd.length - 1])}: Not a directory</span>`);
    names.forEach(n => {
      if (dir.children.some(c => c.name === n)) return out(`<span class="tr">mkdir: ${esc(n)}: File exists</span>`);
      dir.children.push(FOLD(n, []));
    });
    Finder.reloadAll();
  },
  touch({ t, args, out }) {
    const names = args.filter(a => !a.startsWith('-'));
    if (!names.length) return out(`<span class="tr">usage: touch &lt;file&gt;</span>`);
    const dir = fsGet(t.cwd);
    if (!dir || !dir.children) return out(`<span class="tr">touch: ${esc(t.cwd[t.cwd.length - 1])}: Not a directory</span>`);
    names.forEach(n => {
      const hit = dir.children.find(c => c.name === n);
      if (hit) { hit.date = new Date(); return; }
      dir.children.push(FILE(n, iconFor(n), '0B', kindFor(n), new Date()));
    });
    Finder.reloadAll();
  },
  rm({ t, args, out }) {
    const names = args.filter(a => !a.startsWith('-'));
    const rec = args.some(a => a.startsWith('-') && a.includes('r'));
    if (names.some(n => n === '/' || n === '~' || n === '*')) {
      return out(`<span class="tr">rm: I am not doing that. Nice try.</span>`);
    }
    if (!names.length) return out(`<span class="tr">usage: rm [-rf] &lt;file&gt;</span>`);
    const dir = fsGet(t.cwd);
    names.forEach(n => {
      const i = (dir.children || []).findIndex(c => c.name === n);
      if (i < 0) return out(`<span class="tr">rm: ${esc(n)}: No such file or directory</span>`);
      if (dir.children[i].kind === 'folder' && !rec) return out(`<span class="tr">rm: ${esc(n)}: is a directory</span>`);
      TRASH.children.push(dir.children.splice(i, 1)[0]);
    });
    Finder.reloadAll();
  },
  which({ args, out }) {
    const c = args[0] || '';
    out(CMDS[c] ? `/usr/bin/${esc(c)}` : `<span class="tdim">${esc(c)} not found</span>`);
  },
  brew({ args, out }) {
    if (args[0] === 'install') return out(`<span class="tdim">==> Downloading… this Mac ships with everything already.</span>`);
    out(`<span class="tdim">Homebrew 4.6.2 — nothing left to install.</span>`);
  },
  vim({ out }) { out(`<span class="tdim">vim: this terminal has no modal editor. Use <span class="tg">open</span> and TextEdit.</span>`); },
  python({ out }) { out(`<span class="tdim">python: no interpreter here — the whole machine is one HTML file.</span>`); },
  neofetch({ out }) {
    const art = [
      ['                    \'c.', 0], ['                 ,xNMM.', 0], ['               .OMMMMo', 0], ['               OMMM0,', 0],
      ['     .;loddo:\' loolloddol;.', 0], ['   cKMMMMMMMMMMNWMMMMMMMMMM0:', 1], [' .KMMMMMMMMMMMMMMMMMMMMMMMWd.', 1],
      [' XMMMMMMMMMMMMMMMMMMMMMMMX.', 1], [';MMMMMMMMMMMMMMMMMMMMMMMM:', 2], [':MMMMMMMMMMMMMMMMMMMMMMMM:', 2],
      ['.MMMMMMMMMMMMMMMMMMMMMMMMX.', 3], [' kMMMMMMMMMMMMMMMMMMMMMMMMWd.', 3], [' .XMMMMMMMMMMMMMMMMMMMMMMMMMMk', 4],
      ['  .XMMMMMMMMMMMMMMMMMMMMMMMMK.', 4], ['    kMMMMMMMMMMMMMMMMMMMMMMd', 5], ['     ;KMMMMMMMWXXWMMMMMMMk.', 5],
      ['       .cooc,.    .,coo:.', 5],
    ];
    const cls = ['tg', 'ty', 'to', 'tr', 'tm2', 'tb2'];   // the six-stripe Apple
    const info = [
      [`${SYS.user.toLowerCase()}@${SYS.host}`, null],
      ['-'.repeat(SYS.user.length + SYS.host.length + 1), null],
      ['OS', 'macOS Tahoe 26.0 26A5240b arm64'],
      ['Host', 'MacBook Pro (16-inch, 2026)'],
      ['Kernel', '25.0.0'],
      ['Uptime', upStr()],
      ['Packages', '148 (brew), 62 (brew-cask)'],
      ['Shell', 'zsh 5.9'],
      ['Resolution', `${innerWidth * 2}x${innerHeight * 2}@120Hz`],
      ['DE', 'Aqua'],
      ['WM', 'Quartz Compositor'],
      ['WM Theme', SYS.theme === 'dark' ? 'Dark (Multicolour)' : 'Light (Multicolour)'],
      ['Terminal', 'Ashhh-term'],
      ['CPU', 'Apple M4 Max'],
      ['GPU', 'Apple M4 Max (40 cores)'],
      ['Memory', '34218MiB / 131072MiB'],
      ['Disk (/)', '842G / 1.8T (48%)'],
      ['Battery', `${SYS.battery}% ${SYS.charging ? '[charging]' : '[discharging]'}`],
    ];
    const blocks = ['#1b1b1d', '#ff6b6b', '#4fe07f', '#ffd866', '#5fb2ff', '#d68cff', '#5fe1e6', '#e6e6e6'];
    const rows = Math.max(art.length, info.length + 3);
    let html = '<div style="display:flex;gap:18px;padding:4px 0">';
    html += '<div>' + art.map(([l, c]) => `<div class="tm-line ${cls[c]}">${esc(l)}</div>`).join('') + '</div>';
    html += '<div style="padding-top:2px">' + info.map(([k, v]) =>
      `<div class="tm-line">${v === null ? `<span class="tg">${esc(k)}</span>` : `<span class="tg">${esc(k)}</span><span class="tw2">: ${esc(v)}</span>`}</div>`).join('')
      + `<div style="display:flex;margin-top:9px">${blocks.map(b => `<span style="width:16px;height:15px;background:${b}"></span>`).join('')}</div>`
      + `<div style="display:flex">${blocks.map(b => `<span style="width:16px;height:15px;background:${b};filter:brightness(1.5)"></span>`).join('')}</div>`
      + '</div></div>';
    out(html);
  },
};
CMDS['ls-la'] = CMDS.ls;
CMDS.ll = ({ t, out, term, w }) => CMDS.ls({ t, args: ['-l'], out, term, w });
CMDS['..'] = ({ t, out, w, term }) => CMDS.cd({ t, args: ['..'], out, w, term });

function colorName(f, pad) {
  const cls = f.kind === 'folder' ? 'tb2' : /\.app$/.test(f.name) ? 'tg'
    : /\.(png|jpe?g|heic|mp4|mov|wav|mp3)$/i.test(f.name) ? 'tm2'
      : /\.(zip|xip|dmg|gz)$/i.test(f.name) ? 'tr' : 'tw2';
  const bold = f.kind === 'folder' ? 'font-weight:700' : '';
  const txt = pad ? f.name.padEnd(pad) : f.name;
  return `<span class="${cls}" style="${bold}">${esc(txt)}</span>`;
}
function resolve(cwd, arg) {
  if (!arg || arg === '~') return HOME.slice();
  let parts;
  if (arg.startsWith('~/')) parts = HOME.concat(arg.slice(2).split('/'));
  else if (arg.startsWith('/')) parts = ['Macintosh HD'].concat(arg.split('/').filter(Boolean));
  else parts = cwd.concat(arg.split('/'));
  const out = [];
  parts.filter(Boolean).forEach(p => { if (p === '.') return; if (p === '..') { if (out.length > 1) out.pop(); } else out.push(p); });
  return out.length ? out : ['Macintosh HD'];
}
const upStr = () => {
  const ms = Date.now() - new Date(2026, 6, 24, 9, 12).getTime();
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
  return `${d} day${d === 1 ? '' : 's'}, ${h} hour${h === 1 ? '' : 's'}, ${m} min${m === 1 ? '' : 's'}`;
};

const FILE_TEXT = {
  'Ashhhx.txt': `Where to find me
================

About me     https://Ashhh4.dev
GitHub       https://github.com/ashrafff4
X            https://x.com/Ashhh4
Instagram    https://www.instagram.com/Ashhh4_/
linkedin       

Every link above opens in your real browser.`,
  'todo.md': `# todo

- [x] squircle clip path from a superellipse, not border-radius
- [x] layered window shadows (near + far)
- [x] cosine dock falloff
- [ ] Mission Control
- [ ] Stage Manager
- [ ] convince myself this is finished`,
  'README.md': `# desktop-web

A pixel-faithful desktop environment that runs in one file.

## Run it

    open index.html

That's the whole install process.`,
  'on-restraint.md': `# On restraint

Most interfaces fail by addition. A gradient here, a shadow there,
and then a spinner to cover the cost of all of it.

The details that actually land are the ones nobody can name:
traffic lights dimming when a window loses focus, the menu bar
filling in when something zooms, the dock tray widening as icons
grow and then holding perfectly steady.

Nobody will notice any of it. That's the point.`,
  'index.html': `<!DOCTYPE html>\n<html lang="en" data-theme="light">\n<head>\n  <title>macOS</title>\n  <!-- 400-odd KB of desktop -->\n</head>\n<body>\n  <div id="stage">…</div>\n</body>\n</html>`,
  'main.swift': `import SwiftUI\n\n@main\nstruct CleanTypeApp: App {\n    var body: some Scene {\n        MenuBarExtra("CleanType", systemImage: "textformat") {\n            SettingsView()\n        }\n        .menuBarExtraStyle(.window)\n    }\n}`,
  'synth.ts': `export class Voice {\n  constructor(private ctx: AudioContext) {}\n\n  play(freq: number, at = this.ctx.currentTime) {\n    const osc = this.ctx.createOscillator();\n    const gain = this.ctx.createGain();\n    osc.type = "sawtooth";\n    osc.frequency.value = freq;\n    gain.gain.setValueAtTime(0, at);\n    gain.gain.linearRampToValueAtTime(0.25, at + 0.01);\n    gain.gain.exponentialRampToValueAtTime(0.001, at + 1.2);\n    osc.connect(gain).connect(this.ctx.destination);\n    osc.start(at);\n    osc.stop(at + 1.3);\n  }\n}`,
  'shadow-notes.md': `## the four layers

0 0 0 .5px    the hairline. without it every edge looks soft.
0 3px 8px     contact. keeps the window sitting on something.
0 14px 28px   the body. this is the one people think of as "the shadow".
0 40px 80px   ambient spill. expensive, and the first to cut.

## focus

An unfocused window drops the outer two and lightens the rest.
That single difference is why a stack of windows reads as a stack
instead of a pile of rectangles.`,
};

/* ============================================================================
   13 · CALCULATOR
   ========================================================================== */
APPS.calculator = {
  name: 'Calculator', icon: 'app-calculator', w: 254, h: 366, minW: 232, minH: 320,
  menus: () => stdMenus('calculator', {
    View: [{ id: 'b', label: 'Basic', key: '⌘1', checked: true }, { id: 's', label: 'Scientific', key: '⌘2', checked: false, run: () => Toast('Scientific mode is not in this build') }],
  }),
  mount(w) {
    w.calc = { acc: null, op: null, cur: '0', fresh: true, lastOp: null, lastArg: null };
    const K = [
      ['AC', 'fn', 'ac'], ['+/−', 'fn', 'neg'], ['%', 'fn', 'pct'], ['÷', 'op', 'div'],
      ['7', '', 'n7'], ['8', '', 'n8'], ['9', '', 'n9'], ['×', 'op', 'mul'],
      ['4', '', 'n4'], ['5', '', 'n5'], ['6', '', 'n6'], ['−', 'op', 'sub'],
      ['1', '', 'n1'], ['2', '', 'n2'], ['3', '', 'n3'], ['+', 'op', 'add'],
      ['0', ' w2', 'n0'], ['.', '', 'dot'], ['=', 'op', 'eq'],
    ];
    return titlebar('Calculator', { dark: true }) + `<div class="calc">
      <div class="calc-out" data-out>0</div>
      <div class="calc-keys">${K.map(([l, c, k]) => `<button class="ck ${c}" data-k="${k}">${l}</button>`).join('')}</div>
    </div>`;
  },
  ready(w) {
    const paint = () => {
      const c = w.calc;
      w.node.querySelector('[data-out]').textContent = Calc.fmt(c.cur);
      $$('.ck.op', w.node).forEach(b => b.classList.toggle('on', c.op && b.dataset.k === c.op && c.fresh));
      $$('.ck.fn', w.node)[0].textContent = (c.cur !== '0' || c.op) ? 'C' : 'AC';
    };
    w.paint = paint;
    on(w.node, 'click', '[data-k]', (e, t) => { Calc.press(w, t.dataset.k); paint(); });
    on(w.node, 'pointerdown', '[data-k]', (e, t) => {
      t.classList.add('down');
      const up = () => { t.classList.remove('down'); removeEventListener('pointerup', up) };
      addEventListener('pointerup', up);
    });
    w.keyHandler = e => {
      if (WM.front !== w) return;
      const m = { '/': 'div', '*': 'mul', 'x': 'mul', '-': 'sub', '+': 'add', '=': 'eq', 'Enter': 'eq', '.': 'dot', ',': 'dot', '%': 'pct', 'Escape': 'ac', 'Backspace': 'del', 'Delete': 'ac' };
      let k = null;
      if (/^[0-9]$/.test(e.key)) k = 'n' + e.key;
      else if (m[e.key]) k = m[e.key];
      if (!k) return;
      e.preventDefault();
      const btn = w.node.querySelector(`[data-k="${k}"]`);
      if (btn) { btn.classList.add('down'); setTimeout(() => btn.classList.remove('down'), 95); }
      Calc.press(w, k); paint();
    };
    addEventListener('keydown', w.keyHandler);
    paint();
  },
  onClose(w) { removeEventListener('keydown', w.keyHandler); }
};

const Calc = {
  fmt(s) {
    if (s === 'Error' || s === '∞') return s;
    const neg = s.startsWith('-');
    let v = neg ? s.slice(1) : s;
    let [i, d] = v.split('.');
    if (i.length > 15) { const n = Number(v); return (neg ? '-' : '') + n.toExponential(6).replace('e+', 'e'); }
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + i + (d !== undefined ? '.' + d : '');
  },
  apply(a, b, op) {
    switch (op) {
      case 'add': return a + b; case 'sub': return a - b;
      case 'mul': return a * b; case 'div': return b === 0 ? NaN : a / b;
    }
    return b;
  },
  str(n) {
    if (!isFinite(n)) return isNaN(n) ? 'Error' : '∞';
    const r = Math.round(n * 1e12) / 1e12;
    return String(Math.abs(r) < 1e-12 ? 0 : r);
  },
  press(w, k) {
    const c = w.calc;
    if (k[0] === 'n' && k.length === 2) {
      const d = k[1];
      if (c.fresh) { c.cur = d; c.fresh = false; }
      else c.cur = c.cur === '0' ? d : (c.cur.replace(/[^\d.-]/g, '').length < 16 ? c.cur + d : c.cur);
      return;
    }
    if (k === 'dot') { if (c.fresh) { c.cur = '0.'; c.fresh = false; } else if (!c.cur.includes('.')) c.cur += '.'; return; }
    if (k === 'del') { if (c.fresh) return; c.cur = c.cur.length > 1 ? c.cur.slice(0, -1) : '0'; if (c.cur === '-') c.cur = '0'; return; }
    if (k === 'ac') {
      if (c.cur !== '0' && !c.fresh) { c.cur = '0'; c.fresh = true; return; }
      Object.assign(c, { acc: null, op: null, cur: '0', fresh: true, lastOp: null, lastArg: null }); return;
    }
    if (k === 'neg') { c.cur = c.cur.startsWith('-') ? c.cur.slice(1) : (c.cur === '0' ? '0' : '-' + c.cur); return; }
    if (k === 'pct') { c.cur = this.str(parseFloat(c.cur) / 100); c.fresh = false; return; }
    if (k === 'eq') {
      const b = parseFloat(c.cur);
      if (c.op != null && c.acc != null) { c.cur = this.str(this.apply(c.acc, b, c.op)); c.lastOp = c.op; c.lastArg = b; }
      else if (c.lastOp) { c.cur = this.str(this.apply(b, c.lastArg, c.lastOp)); }
      c.acc = null; c.op = null; c.fresh = true; return;
    }
    /* an operator */
    const b = parseFloat(c.cur);
    if (c.op != null && c.acc != null && !c.fresh) { c.acc = this.apply(c.acc, b, c.op); c.cur = this.str(c.acc); }
    else c.acc = b;
    c.op = k; c.fresh = true; c.lastOp = null;
  }
};

/* ============================================================================
   14 · ABOUT · TEXTEDIT · PREVIEW
   ========================================================================== */
APPS.about = {
  name: 'Finder', icon: 'app-finder', w: 400, h: 468, minW: 400, minH: 468,
  mount() {
    return titlebar('', { plain: true }) + `<div class="about">
      <svg class="mark" viewBox="0 0 15 18"><use href="#g-apple"/></svg>
      <h1>MacBook Pro</h1><div class="ver">16‑inch, 2026</div>
      <dl>
        <dt>Chip</dt><dd>Apple M4 Max</dd>
        <dt>Memory</dt><dd>128 GB</dd>
        <dt>Startup disk</dt><dd>Macintosh HD</dd>
        <dt>Serial number</dt><dd>C02PR4S3NX26</dd>
        <dt>macOS</dt><dd>Tahoe 26.0 (26A5240b)</dd>
        <dt>Display</dt><dd>${innerWidth * 2} × ${innerHeight * 2} @ 120 Hz</dd>
        <dt>Rendered by</dt><dd>one HTML file</dd>
      </dl>
      <div class="btns"><button class="btn" data-more>More Info…</button><button class="btn" data-rep>System Report…</button></div>
      <div style="margin-top:auto;padding-top:16px;font-size:10.5px;color:var(--txt-3);text-align:center;line-height:1.5">
        ™ and © 2026 Apple Inc.<br>All rights reserved.</div>
    </div>`;
  },
  ready(w) {
    on(w.node, 'click', '[data-more]', () => WM.open('settings', { section: 'general' }));
    on(w.node, 'click', '[data-rep]', () => WM.open('terminal'));
  }
};

/* ============================================================================
   CONTACT ME  —  window opened from the desktop icon
   Change your details here: email and the three social links.
   ========================================================================== */
const CONTACT = {
  email: 'ashrafkhan896200@gmail.com',
  links: [
    { name: 'GitHub', icon: '💻', url: 'https://github.com/ashrafff4' },
    { name: 'Portfolio Source', icon: '⭐', url: 'https://github.com/ashrafff/mac-portfolio' },
    { name: 'LinkedIn', icon: '💼', url: 'https://www.linkedin.com/in/mohammad-ashraf-rehman/' },
  ],
};

function contactForm() {
  return `
    <div class="ct-head">
      <div class="ct-app">📧</div>
      <div><h2>Contact Me</h2><p>Let’s connect and build something amazing!</p></div>
    </div>

    <div class="ct-label">Social Profiles</div>
    <div class="ct-links">${CONTACT.links.map(l =>
      `<a class="ct-link" data-openext="${esc(l.url)}"><span>${l.icon}</span><span class="t">${esc(l.name)}</span></a>`).join('')}
    </div>

    <div class="ct-label">Direct Email</div>
    <a class="ct-mail" href="mailto:${esc(CONTACT.email)}">
      <div class="ico">✉️</div>
      <div><b>${esc(CONTACT.email)}</b><small>Click to compose email in Mail client</small></div>
    </a>

    <form class="ct-form" autocomplete="off">
      <div class="ct-label" style="margin-top:0">Quick Message</div>
      <div class="ct-row">
        <label>Your Name<input name="name" placeholder="John Appleseed" required></label>
        <label>Your Email<input name="email" type="email" placeholder="john@apple.com" required></label>
      </div>
      <label>Subject<input name="subject" placeholder="Project Inquiry / Collaboration" required></label>
      <label>Message<textarea name="message" placeholder="Hi Ashraf, I’d love to chat about…" required></textarea></label>
      <div class="ct-acts">
        <button type="reset" class="btn">Clear</button>
        <button type="submit" class="btn pri">Send via Email</button>
      </div>
    </form>
    <div class="ct-foot">Looking forward to hearing from you! 🙌</div>`;
}
function contactDone() {
  return `<div class="ct-done">
    <div class="ct-ok">✉️</div>
    <h2>Email Client Opened</h2>
    <p>Complete sending the message in your Mail app. I’ll get back to you soon!</p>
    <button class="btn pri" data-again>Send Another Message</button>
  </div>`;
}

APPS.contactme = {
  name: 'Contact Me', icon: 'app-mail', w: 540, h: 660, minW: 420, minH: 380, single: true,
  menus: () => stdMenus('contactme'),
  mount() {
    return titlebar('Contact Me', { plain: true }) + `<div class="ct selectable" data-ct>${contactForm()}</div>`;
  },
  ready(w) {
    const box = w.node.querySelector('[data-ct]');
    on(box, 'submit', '.ct-form', (e, f) => {
      e.preventDefault();
      const d = new FormData(f);
      const link = `mailto:${CONTACT.email}?subject=${encodeURIComponent(d.get('subject'))}` +
        `&body=${encodeURIComponent(`From: ${d.get('name')} (${d.get('email')})\n\n${d.get('message')}`)}`;
      const a = document.createElement('a'); a.href = link; document.body.append(a); a.click(); a.remove();
      box.innerHTML = contactDone();
    });
    on(box, 'click', '[data-again]', () => { box.innerHTML = contactForm(); });
  },
};

APPS.textedit = {
  name: 'TextEdit', icon: 'f-txt', w: 620, h: 520, minW: 340, minH: 240, single: false,
  menus: () => stdMenus('textedit'),
  mount(w, o) {
    const name = (o.file && o.file.name) || o.file || 'Untitled.txt';
    const body = FILE_TEXT[name] || `${name}\n\n(this file is empty)`;
    /* TextEdit detects bare URLs and makes them clickable, so this one does too. */
    const doc = esc(body).replace(/https?:\/\/[^\s<]+[^\s<.,)]/g,
      u => `<a href="${u}" data-openext="${u}">${u}</a>`);
    return titlebar(name, { plain: true, right: `<button class="tbtn" data-nodrag data-tefmt title="Format">${ic('g-title')}</button>` }) +
      `<div class="te"><div class="te-doc selectable" contenteditable="true" spellcheck="false">${doc}</div></div>`;
  },
  ready(w) {
    const doc = w.node.querySelector('.te-doc');
    on(w.node, 'click', '[data-tefmt]', (e, t) => menuUnder(t, [
      { id: 'p', label: 'Plain Text', checked: !w.st || !w.st.rich, run: () => { w.st = { rich: false }; doc.style.font = ''; } },
      { id: 'r', label: 'Rich Text', checked: !!(w.st && w.st.rich), run: () => { w.st = { rich: true }; doc.style.font = '14px/1.65 -apple-system,Inter,sans-serif'; } }, '-',
      { id: 'b', label: 'Bold', key: '⌘B', run: () => { doc.focus(); document.execCommand('bold'); } },
      { id: 'i', label: 'Italic', key: '⌘I', run: () => { doc.focus(); document.execCommand('italic'); } }, '-',
      { id: 'w', label: 'Word Count', run: () => Toast(doc.textContent.trim().split(/\s+/).filter(Boolean).length + ' words') }]));
  }
};

APPS.preview = {
  name: 'Preview', icon: 'app-preview', w: 640, h: 560, minW: 360, minH: 300, single: false,
  menus: () => stdMenus('preview'),
  mount(w, o) {
    const name = (o.file && o.file.name) || o.file || 'Untitled';
    const url = o.url || (o.node && o.node.url);
    let inner;
    if (url && /\.pdf$/i.test(url)) inner = `<iframe src="${esc(url)}" title="${esc(name)}" style="width:100%;height:100%;min-height:440px;border:0;border-radius:6px;background:#fff"></iframe>`;
    else if (url) inner = `<img src="${esc(url)}" alt="${esc(name)}" style="display:block;width:100%;height:auto;align-self:start;justify-self:center;border-radius:4px;box-shadow:0 10px 40px -12px rgba(0,0,0,.55)">`;
    else if (/guidelines|spec/i.test(name)) inner = `<div class="sheet">
      <h1>Interface Guidelines</h1><p style="margin:0 0 2px;font-size:12.5px">Revision 4 · July 2026</p>
      <h3>1 · Materials</h3><p>Chrome is a material, not a colour. Every bar, sidebar and tray samples what sits behind it — blur, then saturate, then tint. Opacity alone always reads as a sticker pasted on the window.</p>
      <h3>2 · Depth</h3><p>Four shadow layers: a hairline for the edge, a contact shadow so it doesn't float, a body, and an ambient spill. Unfocused windows drop the outer two and lighten the rest.</p>
      <h3>3 · Motion</h3><p>Menus in 130ms, panels in 300ms, nothing past 350ms. Ease out harder than you ease in — the arrival is what the eye judges.</p>
      <h3>4 · Pointer</h3><p>The arrow is the default state and it stays the arrow over buttons. A hand means "this navigates". A hand on everything means nothing.</p>
      <h3>5 · Restraint</h3><p>If an effect cannot hold sixty frames, remove the effect. A dropped frame is more visible than any gradient you were trying to render.</p>
    </div>`;
    else if (/\.(mp4|mov)$/i.test(name)) inner = `<div style="width:min(520px,100%);aspect-ratio:16/9;border-radius:8px;background:#0c0c0e;display:grid;place-items:center;box-shadow:0 20px 60px -18px rgba(0,0,0,.6)">
      <button class="btn pri" style="height:44px;width:44px;padding:0;border-radius:50%">${ic('g-play')}</button></div>
      <div style="margin-top:14px;font-size:12px;color:var(--txt-2)">${esc(name)} — 1920×1080 · H.264</div>`;
    else inner = `<img src="${WALLPAPERS[/screenshot/i.test(name) ? 'tahoe' : 'ridges'].url}" alt="${esc(name)}" style="max-height:78%">
      <div style="margin-top:14px;font-size:12px;color:var(--txt-2)">${esc(name)}</div>`;
    return titlebar(name, {
      plain: true, right:
        `<button class="tbtn" data-nodrag data-pvshare title="Share">${ic('g-share')}</button>` +
        `<button class="tbtn" data-nodrag data-pvfind title="Search">${ic('g-search')}</button>` +
        `<div class="sfield" data-nodrag data-pvfield style="width:0;padding:0;opacity:0;overflow:hidden;transition:width .22s var(--e-out),opacity .16s,padding .22s">
          <span>${ic('g-search')}</span><input placeholder="Search" spellcheck="false"></div>`
    }) + `<div class="pv" style="flex-direction:column">${inner}</div>`;
  },
  ready(w) {
    const name = (w.node.querySelector('.tb .title') || {}).textContent || 'Document';
    on(w.node, 'click', '[data-pvshare]', (e, t) => menuUnder(t, [
      { id: 'm', label: 'Mail', icon: 'g-compose', run: () => Mail.compose(name) },
      { id: 'g', label: 'Messages', icon: 'g-facetime', run: () => WM.open('messages') }, '-',
      { id: 'c', label: 'Copy', run: () => Toast('Copied to clipboard') },
      { id: 'p', label: 'Print…', run: () => Toast('Sent to printer') }]));
    /* Find reveals an inline field and highlights matches in the rendered document. */
    on(w.node, 'click', '[data-pvfind]', () => {
      const f = w.node.querySelector('[data-pvfield]'), open = f.style.width !== '0px';
      f.style.width = open ? '0px' : '150px';
      f.style.padding = open ? '0' : '';
      f.style.opacity = open ? '0' : '1';
      if (!open) f.querySelector('input').focus(); else { f.querySelector('input').value = ''; mark(''); }
    });
    const body = w.node.querySelector('.pv');
    const mark = q => {
      $$('mark', body).forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
      body.normalize();
      if (!q || q.length < 2) return 0;
      let n = 0;
      const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      const hits = [];
      while (walk.nextNode()) if (walk.currentNode.nodeValue.toLowerCase().includes(q)) hits.push(walk.currentNode);
      hits.forEach(node => {
        const parts = node.nodeValue.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
        const frag = document.createDocumentFragment();
        parts.forEach(p => {
          if (p.toLowerCase() === q) { const m = el('<mark style="background:#fff2a8;color:inherit;border-radius:2px">' + esc(p) + '</mark>'); frag.append(m); n++; }
          else frag.append(document.createTextNode(p));
        });
        node.replaceWith(frag);
      });
      return n;
    };
    const inp = w.node.querySelector('[data-pvfield] input');
    inp.addEventListener('input', () => {
      const n = mark(inp.value.trim().toLowerCase());
      if (inp.value.trim().length > 1) Toast(n ? n + (n === 1 ? ' match' : ' matches') : 'Not found');
    });
  }
};
/* ============================================================================
   15 · NOTES
   ========================================================================== */
const NOTE_SEED = [
  {
    id: 1, folder: 'Notes', title: 'Interface rules', date: dt(7, 27, 16, 12), pin: true,
    body: `<h1>Interface rules</h1><div class="date">27 July 2026 at 4:12 PM</div>
<p>Collected from things that felt wrong and then didn't.</p>
<h2>Motion</h2>
<div class="todo done"><i>${ic('g-check')}</i><span>Nothing animates longer than <b>350ms</b>. Past that it reads as lag, not polish.</span></div>
<div class="todo done"><i>${ic('g-check')}</i><span>Menus open instantly. Panels can take their time.</span></div>
<div class="todo"><i>${ic('g-check')}</i><span>If a transition can't hold 60fps, cut the effect, not the duration.</span></div>
<div class="todo"><i>${ic('g-check')}</i><span>Easing out beats easing in — arrivals matter more than departures.</span></div>
<h2>Depth</h2><ul><li>One shadow reads as a sticker. Stack them.</li><li>Blur is not translucency. You need both.</li><li>An unfocused window should look asleep, not disabled.</li></ul>`
  },
  {
    id: 2, folder: 'Notes', title: 'Window shadow recipe', date: dt(7, 26, 21, 40),
    body: `<h1>Window shadow recipe</h1><div class="date">26 July 2026 at 9:40 PM</div>
<p>One shadow always looks fake. macOS stacks four.</p>
<table><tr><th>Layer</th><th>Purpose</th></tr>
<tr><td>0 0 0 .5px</td><td>the hairline that defines the edge</td></tr>
<tr><td>0 3px 8px</td><td>contact shadow, keeps it from floating</td></tr>
<tr><td>0 14px 28px</td><td>the body of the shadow</td></tr>
<tr><td>0 40px 80px</td><td>ambient spill — this is the expensive one</td></tr></table>
<p>Unfocused windows drop the last two and lighten the rest. That difference is why a stack of windows reads as a stack.</p>`
  },
  {
    id: 3, folder: 'Notes', title: 'Dock falloff', date: dt(7, 25, 11, 8),
    body: `<h1>Dock falloff</h1><div class="date">25 July 2026 at 11:08 AM</div>
<p>Linear distance → scale looks wrong. There's a visible crease where influence hits zero.</p>
<p>A raised cosine has zero slope at both ends, so the magnification eases in and out of the neighbouring icons instead of snapping:</p>
<p style="font-family:var(--font-mono);font-size:12.5px;background:var(--fill);padding:9px 12px;border-radius:7px">scale = 1 + (max−1) · (½ − ½cos(πu))<sup>0.86</sup></p>
<p>The 0.86 exponent narrows the peak slightly. Without it the whole row lifts and it feels mushy.</p>`
  },
  {
    id: 4, folder: 'Notes', title: 'Grocery', date: dt(7, 24, 19, 2),
    body: `<h1>Grocery</h1><div class="date">24 July 2026 at 7:02 PM</div>
<div class="todo done"><i>${ic('g-check')}</i><span>Coffee — the good one</span></div>
<div class="todo done"><i>${ic('g-check')}</i><span>Oat milk</span></div>
<div class="todo"><i>${ic('g-check')}</i><span>Paneer</span></div>
<div class="todo"><i>${ic('g-check')}</i><span>Tomatoes, ginger, green chilli</span></div>
<div class="todo"><i>${ic('g-check')}</i><span>Dark chocolate (85%)</span></div>`
  },
  {
    id: 5, folder: 'Notes', title: 'Sprint planning', date: dt(7, 20, 9, 30),
    body: `<h1>Sprint planning</h1><div class="date">20 July 2026 at 9:30 AM</div>
<h2>Ship</h2><ul><li>Column view in Finder, with a working preview pane</li><li>Terminal tab completion (longest common prefix, then list)</li><li>Genie minimise — clip-path polygon, four points, don't cheat it</li></ul>
<h2>Park</h2><ul><li>Mission Control</li><li>Stage Manager</li></ul>
<p>Review PR #142 before Thursday.</p>`
  },
  { id: 6, folder: 'Recently Deleted', title: 'Old draft', date: dt(7, 12, 8, 0), body: `<h1>Old draft</h1><div class="date">12 July 2026 at 8:00 AM</div><p>Scrapped. The framing was wrong.</p>` },
];

APPS.notes = {
  name: 'Notes', icon: 'app-notes', w: 940, h: 600, minW: 580, minH: 340,
  menus: () => stdMenus('notes', {
    File: [{ id: 'n', label: 'New Note', key: '⌘N', run: () => Notes.create() },
    { id: 'f', label: 'New Folder', key: '⇧⌘N' }, '-',
    { id: 'd', label: 'Delete Note', run: () => Notes.del() }],
    Format: [{ id: 'b', label: 'Bold', key: '⌘B', run: () => Notes.fmt('bold') },
    { id: 'i', label: 'Italic', key: '⌘I', run: () => Notes.fmt('italic') },
    { id: 'u', label: 'Underline', key: '⌘U', run: () => Notes.fmt('underline') }, '-',
    { id: 'c', label: 'Checklist', key: '⇧⌘L', run: () => Notes.checklist() },
    { id: 't', label: 'Table', run: () => Notes.table() }],
  }, ['File', 'Edit', 'Format', 'View', 'Window', 'Help']),
  mount(w) {
    w.st = { notes: NOTE_SEED.map(n => ({ ...n })), folder: 'Notes', sel: 1, q: '' };
    const F = [['All iCloud', 'g-icloud-o', 5], ['Notes', 'g-folder-g', 5], ['Recently Deleted', 'g-tag', 1]];
    return `<div class="wb">
      <div class="sbar" data-drag style="width:196px">
        <div style="display:flex;align-items:center;height:38px;padding:0 10px 0 12px">
          <div data-tl></div><div style="flex:1"></div>
          <button class="tbtn" data-nodrag data-sbtoggle title="Hide Folders">${ic('g-sidebar')}</button>
        </div>
        <div class="grp"><div class="gh">iCloud</div>
        ${F.map(([n, i, c]) => `<div class="si" data-folder="${esc(n)}">${ic(i, 'ico')}<span class="nm">${esc(n)}</span><span class="tail">${c}</span></div>`).join('')}
        </div></div>
      <div class="nt">
        <div class="nt-list">
          <div class="nt-search" data-drag style="display:flex;gap:8px;align-items:center;padding-top:9px">
            <div class="sfield" data-nodrag style="flex:1"><span>${ic('g-search')}</span><input placeholder="Search" data-q></div>
            <button class="tbtn" data-new2 data-nodrag title="New Note">${ic('g-compose')}</button>
          </div>
          <div class="nt-items scroll" data-items></div>
        </div>
        <div class="nt-ed">
          <div class="nt-fmt" data-drag>
            <div style="flex:1"></div>
            <button class="tbtn" data-f="bold" data-nodrag title="Bold">${ic('g-bold')}</button>
            <button class="tbtn" data-f="italic" data-nodrag title="Italic">${ic('g-italic')}</button>
            <button class="tbtn" data-f="underline" data-nodrag title="Underline">${ic('g-underline')}</button>
            <button class="tbtn" data-f="strikeThrough" data-nodrag title="Strikethrough">${ic('g-strike')}</button>
            <div class="sep"></div>
            <button class="tbtn" data-f="insertUnorderedList" data-nodrag title="Bulleted list">${ic('g-bullets')}</button>
            <button class="tbtn" data-check data-nodrag title="Checklist">${ic('g-checklist')}</button>
            <button class="tbtn" data-table data-nodrag title="Table">${ic('g-table')}</button>
            <div class="sep"></div>
            <button class="tbtn" data-new data-nodrag title="New note">${ic('g-plus')}</button>
            <div style="flex:1"></div>
          </div>
          <div class="nt-doc selectable" contenteditable="true" spellcheck="false" data-doc></div>
        </div>
      </div></div>`;
  },
  ready(w) {
    Notes.w = w;
    on(w.node, 'click', '[data-folder]', (e, t) => { w.st.folder = t.dataset.folder; Notes.render(w); });
    on(w.node, 'click', '.nt-i', (e, t) => { Notes.save(w); w.st.sel = +t.dataset.id; Notes.render(w); });
    on(w.node, 'contextmenu', '.nt-i', (e, t) => {
      w.st.sel = +t.dataset.id; Notes.render(w);
      ctxMenu(e, [{ id: 'p', label: 'Pin Note' }, { id: 'd', label: 'Duplicate' }, '-', { id: 'x', label: 'Delete', run: () => Notes.del(w) }]);
    });
    on(w.node, 'click', '[data-f]', (e, t) => Notes.fmt(t.dataset.f, w));
    on(w.node, 'click', '[data-check]', () => Notes.checklist(w));
    on(w.node, 'click', '[data-table]', () => Notes.table(w));
    on(w.node, 'click', '[data-new],[data-new2]', () => Notes.create(w));
    on(w.node, 'click', '[data-sbtoggle]', () => {
      const sb = w.node.querySelector('.sbar');
      sb.style.display = sb.style.display === 'none' ? '' : 'none';
      if (sb.style.display === 'none') w.node.querySelector('.nt-search').prepend(w.node.querySelector('.tl'));
      else sb.firstElementChild.prepend(w.node.querySelector('.tl'));
    });
    on(w.node, 'click', '.nt-doc .todo i', (e, t) => { e.preventDefault(); t.closest('.todo').classList.toggle('done'); });
    w.node.querySelector('[data-q]').addEventListener('input', e => { w.st.q = e.target.value; Notes.render(w); });
    const doc = w.node.querySelector('[data-doc]');
    doc.addEventListener('input', () => { Notes.saveDebounced(w); });
    doc.addEventListener('keyup', () => Notes.fmtState(w));
    doc.addEventListener('mouseup', () => Notes.fmtState(w));
    /* Focusing the editor already puts the caret somewhere — if that somewhere is a
       heading, Bold belongs lit before anyone clicks it. */
    doc.addEventListener('focus', () => setTimeout(() => Notes.fmtState(w), 0));
    doc.addEventListener('keydown', e => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const m = { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()];
      if (m) { e.preventDefault(); Notes.fmt(m, w); }
    });
    Notes.render(w);
  },
  onClose(w) { Notes.save(w); if (Notes.w === w) Notes.w = null; }
};

const Notes = {
  w: null,
  cur(w) { w = w || this.w; return w && w.st.notes.find(n => n.id === w.st.sel); },
  list(w) {
    const st = w.st;
    let ns = st.notes.filter(n => st.folder === 'All iCloud' ? n.folder !== 'Recently Deleted' : n.folder === st.folder);
    if (st.q) { const q = st.q.toLowerCase(); ns = ns.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(q)); }
    return ns.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.date - a.date);
  },
  snippet(n) {
    const d = document.createElement('div'); d.innerHTML = n.body;
    d.querySelectorAll('h1,.date').forEach(e => e.remove());
    /* block boundaries need a separator or "Ship" + "Column view" become one word */
    d.querySelectorAll('h2,h3,p,li,tr,div,br').forEach(e => e.insertAdjacentText('afterend', ' '));
    return (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'No additional text';
  },
  render(w) {
    w = w || this.w; if (!w) return;
    const st = w.st, list = this.list(w);
    if (!list.some(n => n.id === st.sel)) st.sel = list.length ? list[0].id : null;
    $$('[data-folder]', w.node).forEach(b => b.classList.toggle('on', b.dataset.folder === st.folder));
    w.node.querySelector('[data-items]').innerHTML = list.length ? list.map(n => `
      <div class="nt-i${n.id === st.sel ? ' on' : ''}" data-id="${n.id}">
        <b>${n.pin ? '📌 ' : ''}${esc(n.title || 'New Note')}</b>
        <div class="mt"><span>${this.when(n.date)}</span><span class="sn">${esc(this.snippet(n))}</span></div>
      </div>`).join('') : `<div style="padding:22px;text-align:center;color:var(--txt-3);font-size:12.5px">No notes</div>`;
    const doc = w.node.querySelector('[data-doc]'), n = this.cur(w);
    if (n) { doc.innerHTML = n.body; doc.style.display = ''; }
    else { doc.innerHTML = ''; }
  },
  when(d) {
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return time12(d).replace(NBSP, ' ');
    const diff = (now - d) / 864e5;
    if (diff < 7) return DAYS[d.getDay()];
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
  },
  save(w) {
    w = w || this.w; if (!w) return;
    const n = this.cur(w); if (!n) return;
    const doc = w.node.querySelector('[data-doc]'); if (!doc) return;
    n.body = doc.innerHTML;
    const h = doc.querySelector('h1');
    const t = (h ? h.textContent : (doc.textContent || '').split('\n')[0]).trim();
    if (t) n.title = t.slice(0, 60);
  },
  saveDebounced(w) { clearTimeout(this._t); this._t = setTimeout(() => { this.save(w); this.renderListOnly(w); }, 420); },
  renderListOnly(w) {
    const st = w.st, list = this.list(w);
    const host = w.node.querySelector('[data-items]'); if (!host) return;
    host.innerHTML = list.map(n => `
      <div class="nt-i${n.id === st.sel ? ' on' : ''}" data-id="${n.id}">
        <b>${n.pin ? '📌 ' : ''}${esc(n.title || 'New Note')}</b>
        <div class="mt"><span>${this.when(n.date)}</span><span class="sn">${esc(this.snippet(n))}</span></div></div>`).join('');
  },
  fmt(cmd, w) {
    w = w || this.w; if (!w) return;
    const doc = w.node.querySelector('[data-doc]');
    doc.focus();
    /* execCommand needs a range, and specifically one that lands inside a text node —
       a caret parked after the last block has nothing to hang a typing style on, so
       the command silently does nothing. */
    const sel = getSelection();
    if (!sel.rangeCount || !doc.contains(sel.anchorNode)) {
      const walk = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
      let last = null;
      while (walk.nextNode()) if (walk.currentNode.nodeValue.trim()) last = walk.currentNode;
      const r = document.createRange();
      if (last) r.setStart(last, last.nodeValue.length);
      else { r.selectNodeContents(doc); }
      r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    }
    document.execCommand(cmd, false, null);
    this.fmtState(w);
    this.saveDebounced(w);
  },
  /* Toolbar buttons light up for the current caret, so pressing Bold with nothing
     selected still tells you the next thing you type will be bold. */
  fmtState(w) {
    w = w || this.w; if (!w) return;
    $$('[data-f]', w.node).forEach(b => {
      let on = false;
      try { on = document.queryCommandState(b.dataset.f); } catch (e) { }
      b.classList.toggle('on', on);
    });
  },
  checklist(w) {
    w = w || this.w; if (!w) return;
    const doc = w.node.querySelector('[data-doc]'); doc.focus();
    document.execCommand('insertHTML', false, `<div class="todo"><i>${ic('g-check')}</i><span>&nbsp;</span></div>`);
    this.saveDebounced(w);
  },
  table(w) {
    w = w || this.w; if (!w) return;
    const doc = w.node.querySelector('[data-doc]'); doc.focus();
    document.execCommand('insertHTML', false,
      `<table><tr><th>&nbsp;</th><th>&nbsp;</th><th>&nbsp;</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></table><p>&nbsp;</p>`);
    this.saveDebounced(w);
  },
  create(w) {
    w = w || this.w; if (!w) return WM.open('notes');
    this.save(w);
    const id = Math.max(0, ...w.st.notes.map(n => n.id)) + 1;
    const d = new Date();
    w.st.notes.unshift({
      id, folder: w.st.folder === 'Recently Deleted' ? 'Notes' : (w.st.folder === 'All iCloud' ? 'Notes' : w.st.folder),
      title: 'New Note', date: d,
      body: `<h1>New Note</h1><div class="date">${d.getDate()} ${MONS[d.getMonth()]} ${d.getFullYear()} at ${time12(d).replace(NBSP, ' ')}</div><p><br></p>`
    });
    w.st.sel = id; w.st.q = ''; const qi = w.node.querySelector('[data-q]'); if (qi) qi.value = '';
    this.render(w);
    const doc = w.node.querySelector('[data-doc]');
    doc.focus();
    const r = document.createRange(); r.selectNodeContents(doc.querySelector('h1')); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  },
  del(w) {
    w = w || this.w; if (!w) return;
    const n = this.cur(w); if (!n) return;
    if (n.folder === 'Recently Deleted') w.st.notes = w.st.notes.filter(x => x !== n);
    else n.folder = 'Recently Deleted';
    this.render(w);
  }
};

/* ============================================================================
   16 · CALENDAR
   ========================================================================== */
/* Calendars are the filter *and* the colour source, exactly as in Calendar.app —
   an event has no colour of its own, it inherits the list it belongs to. */
const CALS = [
  { id: 'home', name: 'Home', c: '#ff375f', on: true },
  { id: 'work', name: 'Work', c: '#0a84ff', on: true },
  { id: 'bday', name: 'Birthdays', c: '#30d158', on: true },
  { id: 'hol', name: 'Holidays', c: '#bf5af2', on: true },
];
const calOf = id => CALS.find(c => c.id === id) || CALS[0];

/* `s` is minutes past midnight and null means all-day; `dur` is length in minutes.
   Storing real numbers rather than "3:50 PM" is what lets events be moved, resized
   and laid out against each other instead of just listed. */
let EV_ID = 0;
/* Function declarations, not consts: the seed list below is built at parse time,
   which is before Cal exists. */
function clockLabel(mins) {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
/** Keeps the fields other views read (`at`, `c`) in step with the underlying data. */
function syncEvent(ev) {
  ev.c = calOf(ev.cal).c;
  ev.at = ev.s == null ? 'all-day' : clockLabel(ev.s);
  return ev;
}
const mkEvent = o => syncEvent({ id: ++EV_ID, dur: 60, cal: 'work', loc: '', notes: '', ...o });
const EVENTS = [
  { d: [2026, 6, 27], t: 'Sprint planning', s: 570, dur: 45, cal: 'work' },
  { d: [2026, 6, 27], t: 'Dentist', s: 930, dur: 40, cal: 'home', loc: 'Dr. Reed · Stevens Creek' },
  { d: [2026, 6, 27], t: 'Dinner — Kate', s: 1200, dur: 120, cal: 'home', loc: 'Bar Aldo' },
  { d: [2026, 6, 28], t: 'One-on-one with Daniel', s: 630, dur: 30, cal: 'work' },
  { d: [2026, 6, 28], t: 'Deploy window', s: 1020, dur: 90, cal: 'work' },
  { d: [2026, 6, 29], t: 'Review PR #142', s: 660, dur: 60, cal: 'work' },
  { d: [2026, 6, 29], t: 'David — coffee', s: 1050, dur: 45, cal: 'home', loc: 'Third Wave' },
  { d: [2026, 6, 30], t: 'Podcast recording', s: 1020, dur: 90, cal: 'work', loc: 'Studio B' },
  { d: [2026, 7, 3], t: 'Flight to SFO', s: 375, dur: 210, cal: 'home', loc: 'BLR T2' },
  { d: [2026, 6, 21], t: 'Design review', s: 840, dur: 60, cal: 'work' },
  { d: [2026, 6, 15], t: 'Beta cutoff', s: null, cal: 'work' },
  { d: [2026, 6, 31], t: "John's birthday", s: null, cal: 'bday' },
  { d: [2026, 7, 15], t: 'Independence Day', s: null, cal: 'hol' },
].map(mkEvent);

/* Only events on visible calendars, in the order the day actually happens. */
const evOn = (y, m, d) => EVENTS
  .filter(e => e.d[0] === y && e.d[1] === m && e.d[2] === d && calOf(e.cal).on)
  .sort((a, b) => (a.s == null ? -1 : b.s == null ? 1 : a.s - b.s));

APPS.calendar = {
  name: 'Calendar', icon: 'app-calendar', w: 880, h: 600, minW: 560, minH: 380,
  menus: () => stdMenus('calendar', {
    View: [{ id: 'd', label: 'Day', key: '⌘1' }, { id: 'w', label: 'Week', key: '⌘2' },
    { id: 'm', label: 'Month', key: '⌘3', checked: true }, { id: 'y', label: 'Year', key: '⌘4' }, '-',
    { id: 't', label: 'Go to Today', key: '⌘T', run: () => Cal.today() }],
  }),
  mount(w) {
    const n = new Date();
    w.st = { y: n.getFullYear(), m: n.getMonth() };
    return `<div class="wb">
      <div class="cal-side" data-drag><div class="sb-top" style="height:44px"><div data-tl></div></div>
        <div class="grp" style="padding:0 10px"><div class="gh">iCloud</div>
          <div data-cals></div>
        </div>
        <div data-mini></div>
        <div style="margin-top:auto;padding:10px 14px" data-agenda></div>
      </div>
      <div class="cal-main">
        <div class="cal-head" data-drag>
          <h3 data-mon></h3>
          <div class="grow" style="flex:1"></div>
          <button class="tbtn" data-nodrag data-p="-1">${ic('g-chev-l')}</button>
          <button class="btn" data-nodrag data-today>Today</button>
          <button class="tbtn" data-nodrag data-p="1">${ic('g-chev-r')}</button>
          <div class="seg" data-nodrag style="margin-left:6px">
            ${['Day', 'Week', 'Month', 'Year'].map(v =>
      `<button data-view="${v.toLowerCase()}"${v === 'Month' ? ' class="on"' : ''} style="width:${{ Day: 38, Week: 42, Month: 46, Year: 38 }[v]}px;font-size:11.5px">${v}</button>`).join('')}
          </div>
          <button class="tbtn" data-nodrag data-new>${ic('g-plus')}</button>
        </div>
        <div class="cal-dows" data-dows>${DAYS3.map(d => `<div>${d}</div>`).join('')}</div>
        <div class="cal-grid" data-grid></div>
      </div></div>`;
  },
  ready(w) {
    Cal.w = w;
    w.st.view = 'month'; w.st.day = new Date().getDate();
    on(w.node, 'click', '[data-p]', (e, t) => Cal.shift(w, +t.dataset.p));
    on(w.node, 'click', '[data-today]', () => Cal.today(w));
    on(w.node, 'click', '[data-view]', (e, t) => Cal.setView(w, t.dataset.view));
    on(w.node, 'click', '[data-new]', () => Cal.newEvent(w));
    /* Toggling a calendar hides its events everywhere, including the widget. */
    on(w.node, 'click', '[data-cal]', (e, t) => {
      const c = calOf(t.dataset.cal);
      c.on = !c.on;
      Cal.render(w);
      Bus.emit('events');
    });
    on(w.node, 'click', '.cal-cell', (e, t) => {
      if (t.classList.contains('out')) return;
      $$('.cal-cell.pick', w.node).forEach(c => c.classList.remove('pick'));
      t.classList.add('pick');
      w.st.day = +t.dataset.d;
    });
    /* Same gesture as Calendar.app: double-click empty space in a day to add. */
    on(w.node, 'dblclick', '.cal-cell', (e, t) => {
      if (t.classList.contains('out') || e.target.closest('.cal-ev')) return;
      Cal.edit(w, null, { y: +t.dataset.y, m: +t.dataset.m, d: +t.dataset.d });
    });
    on(w.node, 'click', '[data-ev]', (e, t) => {
      e.stopPropagation();
      const ev = EVENTS.find(x => x.id === +t.dataset.ev);
      if (ev) Cal.edit(w, ev);
    });
    /* Clicking an hour row opens the editor already set to that time. */
    on(w.node, 'dblclick', '.col', (e, t) => {
      if (e.target.closest('.ev')) return;
      const r = t.getBoundingClientRect();
      const mins = Cal.H0 * 60 + Math.round((e.clientY - r.top) / Cal.ROW * 60 / 15) * 15;
      Cal.edit(w, null, { y: +t.dataset.y, m: +t.dataset.m, d: +t.dataset.d, s: clamp(mins, 0, 1425) });
    });
    /* A month cell in year view jumps into that month. */
    on(w.node, 'click', '[data-ym]', (e, t) => {
      w.st.m = +t.dataset.ym; Cal.setView(w, 'month');
    });
    Cal.dragMove(w);
    Cal.render(w);
  }
};

const Cal = {
  w: null,
  /* A full day, like Calendar.app — a 7-to-9 window would clamp the early flight to
     the top of the grid and pretend the small hours don't exist. */
  H0: 0, H1: 23, ROW: 42,

  sync: syncEvent,
  clock: clockLabel,
  /* Accepts what people actually type: "9", "9:30", "9:30 pm", "21:30", "9p". */
  parseClock(str, fallback) {
    const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*(a|p)?m?\s*$/i.exec(str || '');
    if (!m) return fallback;
    let h = +m[1]; const min = +(m[2] || 0);
    if (h > 23 || min > 59) return fallback;
    if (m[3]) { h %= 12; if (/p/i.test(m[3])) h += 12; }
    return h * 60 + min;
  },
  parseDate(str, fallback) {
    const t = Date.parse(str);
    if (isNaN(t)) return fallback;
    const d = new Date(t);
    return [d.getFullYear(), d.getMonth(), d.getDate()];
  },
  dateLabel(d) { return `${MONS3[d[1]]} ${d[2]}, ${d[0]}`; },

  /* The arrows step by whatever the current view shows. */
  shift(w, d) {
    w = w || this.w;
    const v = w.st.view || 'month';
    if (v === 'year') { w.st.y += d; }
    else if (v === 'week' || v === 'day') {
      const base = new Date(w.st.y, w.st.m, w.st.day || 1);
      base.setDate(base.getDate() + d * (v === 'week' ? 7 : 1));
      w.st.y = base.getFullYear(); w.st.m = base.getMonth(); w.st.day = base.getDate();
    } else {
      const m = w.st.m + d; w.st.y += Math.floor(m / 12); w.st.m = ((m % 12) + 12) % 12;
    }
    this.render(w);
  },
  today(w) {
    w = w || this.w; if (!w) return WM.open('calendar');
    const n = new Date();
    w.st.y = n.getFullYear(); w.st.m = n.getMonth(); w.st.day = n.getDate();
    this.render(w);
  },
  setView(w, v) {
    w = w || this.w; if (!w) return;
    w.st.view = v;
    $$('[data-view]', w.node).forEach(b => b.classList.toggle('on', b.dataset.view === v));
    this.render(w);
  },
  newEvent(w) {
    w = w || this.w; if (!w) return;
    this.edit(w, null, { y: w.st.y, m: w.st.m, d: w.st.day || 1 });
  },

  /** The one editor for both new and existing events, like Calendar's inspector. */
  edit(w, ev, seed = {}) {
    w = w || this.w; if (!w) return;
    const isNew = !ev;
    const now = new Date();
    const base = ev || {
      d: [seed.y ?? w.st.y, seed.m ?? w.st.m, seed.d ?? (w.st.day || 1)],
      t: '', s: seed.s ?? Math.min(1380, (Math.floor(now.getHours()) + 1) * 60),
      dur: 60, cal: 'work', loc: '', notes: '',
    };
    const allDay = base.s == null;
    const F = (label, inner) => `<div class="ce-row"><span>${label}</span>${inner}</div>`;
    const node = el(`<div class="pop ce" style="width:340px">
      <div class="ce-top">
        <div class="ce-title">${isNew ? 'New Event' : 'Event'}</div>
        ${isNew ? '' : `<button class="tbtn" data-del title="Delete">${ic('g-trash')}</button>`}
      </div>
      <input class="ce-name" data-f="t" placeholder="New Event" spellcheck="false" value="${esc(base.t)}">
      <input class="ce-loc" data-f="loc" placeholder="Add Location" spellcheck="false" value="${esc(base.loc || '')}">
      <div class="ce-body">
        ${F('all-day', `<div class="sw${allDay ? ' on' : ''}" data-allday style="margin-left:auto;transform:scale(.82);transform-origin:left center"></div>`)}
        ${F('date', `<input data-f="date" value="${this.dateLabel(base.d)}" spellcheck="false">`)}
        <div data-times style="${allDay ? 'display:none' : ''}">
          ${F('from', `<input data-f="from" value="${this.clock(base.s ?? 540)}" spellcheck="false">`)}
          ${F('to', `<input data-f="to" value="${this.clock((base.s ?? 540) + (base.dur || 60))}" spellcheck="false">`)}
        </div>
        ${F('calendar', `<div class="ce-cals" style="margin-left:auto">${CALS.map(c =>
      `<span class="acc${c.id === base.cal ? ' on' : ''}" data-pickcal="${c.id}" title="${c.name}" style="width:15px;height:15px;background:${c.c}"></span>`).join('')}</div>`)}
      </div>
      <textarea class="ce-notes" data-f="notes" placeholder="Add Notes" spellcheck="false">${esc(base.notes || '')}</textarea>
      <div class="ce-foot">
        <button class="btn" data-cancel>Cancel</button>
        <button class="btn pri" data-save>${isNew ? 'Add' : 'Done'}</button>
      </div></div>`);

    let cal = base.cal, day = !allDay;
    node.querySelector('[data-allday]').onclick = e => {
      const sw = e.currentTarget;
      sw.classList.toggle('on');
      day = !sw.classList.contains('on');
      node.querySelector('[data-times]').style.display = day ? '' : 'none';
    };
    on(node, 'click', '[data-pickcal]', (e, t) => {
      cal = t.dataset.pickcal;
      $$('[data-pickcal]', node).forEach(x => x.classList.toggle('on', x === t));
    });
    const val = f => node.querySelector(`[data-f="${f}"]`).value;
    node.querySelector('[data-cancel]').onclick = () => Pop.close();
    if (!isNew) node.querySelector('[data-del]').onclick = () => {
      const i = EVENTS.indexOf(ev);
      if (i >= 0) EVENTS.splice(i, 1);
      Pop.close(); this.render(w); Bus.emit('events');
      Toast('Event deleted');
    };
    node.querySelector('[data-save]').onclick = () => {
      const d = this.parseDate(val('date'), base.d);
      const s = day ? this.parseClock(val('from'), base.s ?? 540) : null;
      /* An end before its start means the next day in Calendar; here it just clamps
         to a fifteen-minute minimum, which is the only sane reading in one grid. */
      const dur = day ? Math.max(15, this.parseClock(val('to'), (s || 0) + 60) - s) : 0;
      const t = val('t').trim() || 'New Event';
      if (isNew) EVENTS.push(mkEvent({ d, t, s, dur, cal, loc: val('loc').trim(), notes: val('notes') }));
      else Object.assign(ev, { d, t, s, dur, cal, loc: val('loc').trim(), notes: val('notes') }) && this.sync(ev);
      w.st.y = d[0]; w.st.m = d[1]; w.st.day = d[2];
      Pop.close(); this.render(w); Bus.emit('events');
      Toast(isNew ? `Added “${t}” on ${MONS3[d[1]]} ${d[2]}` : 'Event updated');
    };
    const r = w.node.getBoundingClientRect();
    Pop.open(node, { x: Math.min(r.right - 356, innerWidth - 356), y: r.top + 64, origin: 'top right' });
    setTimeout(() => node.querySelector('.ce-name').focus(), 60);
    /* Enter saves, which is the whole point of a one-field-deep sheet. */
    node.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); node.querySelector('[data-save]').click(); }
      if (e.key === 'Escape') { e.preventDefault(); Pop.close(); }
    });
  },

  /* Dragging an event onto another day moves it, the way it does in month view. */
  dragMove(w) {
    let drag = null;
    w.node.addEventListener('pointerdown', e => {
      const chip = e.target.closest('.cal-ev[data-ev]');
      if (!chip || e.button) return;
      const ev = EVENTS.find(x => x.id === +chip.dataset.ev);
      if (!ev) return;
      drag = { ev, chip, x: e.clientX, y: e.clientY, live: false };
    });
    addEventListener('pointermove', e => {
      if (!drag) return;
      if (!drag.live) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
        drag.live = true;
        drag.chip.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
      }
      const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cal-cell:not(.out)');
      $$('.cal-cell.drop', w.node).forEach(c => c.classList.remove('drop'));
      if (cell) cell.classList.add('drop');
    });
    addEventListener('pointerup', e => {
      if (!drag) return;
      const d = drag;
      drag = null;
      document.body.style.cursor = '';
      $$('.cal-cell.drop', w.node).forEach(c => c.classList.remove('drop'));
      if (!d.live) return;
      d.chip.classList.remove('dragging');
      const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cal-cell:not(.out)');
      if (!cell) return;
      const to = [+cell.dataset.y, +cell.dataset.m, +cell.dataset.d];
      if (to.join() === d.ev.d.join()) return;
      d.ev.d = to;
      this.render(w); Bus.emit('events');
      Toast(`Moved to ${MONS3[to[1]]} ${to[2]}`);
    });
  },

  render(w) {
    w = w || this.w; if (!w) return;
    const v = w.st.view || 'month';
    if (v === 'day') return this.renderDay(w);
    if (v === 'week') return this.renderWeek(w);
    if (v === 'year') return this.renderYear(w);
    return this.renderMonth(w);
  },

  /* Shared chrome: the calendar list, mini-month and agenda don't change per view. */
  side(w) {
    const { y, m } = w.st, now = new Date();
    w.node.querySelector('[data-cals]').innerHTML = CALS.map(c =>
      `<div class="si cal-tick${c.on ? '' : ' off'}" data-cal="${c.id}">
        <span class="tick" style="--c:${c.c}">${ic('g-check')}</span><span class="nm">${c.name}</span></div>`).join('');
    w.node.querySelector('[data-mini]').innerHTML = this.miniHTML(y, m);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcoming = EVENTS
      .filter(e => calOf(e.cal).on && new Date(e.d[0], e.d[1], e.d[2]) >= today)
      .sort((a, b) => (new Date(a.d[0], a.d[1], a.d[2]) - new Date(b.d[0], b.d[1], b.d[2])) || (a.s ?? -1) - (b.s ?? -1))
      .slice(0, 4);
    w.node.querySelector('[data-agenda]').innerHTML =
      `<div class="gh" style="padding-left:0">Upcoming</div>` + (upcoming.length ? upcoming.map(e =>
        `<div class="cal-up" data-ev="${e.id}"><i style="background:${e.c}"></i>
        <div style="min-width:0"><div class="t">${esc(e.t)}</div>
        <div class="s">${MONS3[e.d[1]]} ${e.d[2]} · ${e.at}</div></div></div>`).join('')
        : `<div style="font-size:11.5px;color:var(--txt-3)">Nothing scheduled.</div>`);
  },

  /* Hour rows, shared by day and week. Events sit at their start minute, are as tall
     as they are long, and split the column when they overlap — the three things that
     separate a timetable from a list of times. */
  layout(evs) {
    const timed = evs.filter(e => e.s != null);
    const cols = [];
    timed.forEach(e => {
      const end = e.s + (e.dur || 60);
      let c = cols.findIndex(col => col.every(o => e.s >= o.s + (o.dur || 60) || end <= o.s));
      if (c < 0) { cols.push([e]); c = cols.length - 1; } else cols[c].push(e);
      e._col = c;
    });
    const n = Math.max(1, cols.length);
    timed.forEach(e => { e._w = 100 / n; e._x = e._col * (100 / n); });
    return { timed, allDay: evs.filter(e => e.s == null) };
  },
  /** The fixed band above the hour grid. Empty days still need a cell, for alignment. */
  allDayBand(days) {
    const cells = days.map(d => evOn(d.getFullYear(), d.getMonth(), d.getDate()).filter(e => e.s == null));
    if (!cells.some(c => c.length)) return '';
    return `<div class="cal-band"><div class="gut">all-day</div>
      ${cells.map(evs => `<div class="cell">${evs.map(e =>
      `<div class="chip" data-ev="${e.id}" style="background:${e.c}">${esc(e.t)}</div>`).join('')}</div>`).join('')}</div>`;
  },
  /** The scrolling hour grid, wrapped so the band can sit above it and stay put. */
  gridHTML(days) {
    return `<div class="cal-grid cal-stack" data-grid>${this.allDayBand(days)}
      <div class="scroll" data-scroller style="flex:1;min-height:0">${this.timeCol(days)}</div></div>`;
  },
  timeCol(days) {
    const { H0, H1, ROW } = this;
    const hours = [];
    for (let h = H0; h <= H1; h++) hours.push(h);
    const label = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return `<div class="cal-time">
      <div class="gut">${hours.map(h => `<div style="height:${ROW}px">${label(h)}</div>`).join('')}</div>
      ${days.map(d => {
      const { timed, allDay } = this.layout(evOn(d.getFullYear(), d.getMonth(), d.getDate()));
      const isToday = d.toDateString() === now.toDateString();
      void allDay; /* drawn in the band above, not in the hour grid */
      return `<div class="col${isToday ? ' today' : ''}" data-y="${d.getFullYear()}" data-m="${d.getMonth()}" data-d="${d.getDate()}">
          ${hours.map(() => `<div class="hr" style="height:${ROW}px"></div>`).join('')}
          ${timed.map(e => {
        const top = (e.s / 60 - H0) * ROW;
        const h = Math.max(17, (e.dur || 60) / 60 * ROW - 2);
        return `<div class="ev" data-ev="${e.id}" style="top:${top}px;height:${h}px;left:${e._x}%;width:calc(${e._w}% - 4px);background:${e.c}">
              <b>${esc(e.t)}</b><span>${e.at}${e.loc ? ' · ' + esc(e.loc) : ''}</span></div>`;
      }).join('')}
          ${isToday ? `<div class="cal-now" style="top:${(nowMins / 60 - H0) * ROW}px"></div>` : ''}
        </div>`;
    }).join('')}
    </div>`;
  },

  renderDay(w) {
    const { y, m } = w.st, d = new Date(y, m, w.st.day || 1);
    w.node.querySelector('[data-mon]').textContent = `${DAYS[d.getDay()]}, ${MONS[m]} ${d.getDate()}, ${y}`;
    w.node.querySelector('[data-dows]').innerHTML = `<div style="flex:1;text-align:left;padding-left:64px">${DAYS[d.getDay()]} ${d.getDate()}</div>`;
    w.node.querySelector('[data-grid]').outerHTML = this.gridHTML([d]);
    this.scrollToHour(w);
    this.side(w);
  },

  /* Open on the working day, and follow the clock once it's past mid-morning. The
     clamp is what stops a 2am visit from landing on an empty stretch of night. */
  scrollToHour(w) {
    const grid = w.node.querySelector('[data-scroller]');
    if (!grid) return;
    const now = new Date();
    const shown = new Date(w.st.y, w.st.m, w.st.day || 1);
    const anchor = shown.toDateString() === now.toDateString()
      ? clamp(now.getHours() - 2, 7, 16) : 7;
    grid.scrollTop = (anchor - this.H0) * this.ROW;
  },

  renderWeek(w) {
    const { y, m } = w.st, base = new Date(y, m, w.st.day || 1);
    const start = new Date(base); start.setDate(base.getDate() - base.getDay());
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    const a = days[0], b = days[6];
    w.node.querySelector('[data-mon]').textContent = a.getMonth() === b.getMonth()
      ? `${MONS[a.getMonth()]} ${a.getDate()} – ${b.getDate()}, ${b.getFullYear()}`
      : `${MONS3[a.getMonth()]} ${a.getDate()} – ${MONS3[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
    w.node.querySelector('[data-dows]').innerHTML =
      `<div style="width:52px;flex:none"></div>` + days.map(d =>
        `<div${d.toDateString() === new Date().toDateString() ? ' style="color:var(--blue);font-weight:650"' : ''}>${DAYS3[d.getDay()]} ${d.getDate()}</div>`).join('');
    w.node.querySelector('[data-grid]').outerHTML = this.gridHTML(days);
    this.scrollToHour(w);
    this.side(w);
  },

  renderYear(w) {
    const { y } = w.st, now = new Date();
    w.node.querySelector('[data-mon]').textContent = String(y);
    w.node.querySelector('[data-dows]').innerHTML = '';
    w.node.querySelector('[data-grid]').outerHTML = `<div class="cal-grid scroll cal-year" data-grid>
      ${MONS.map((name, mi) => {
      const first = new Date(y, mi, 1).getDay(), dim = new Date(y, mi + 1, 0).getDate();
      let cells = '';
      for (let i = 0; i < first; i++) cells += `<i></i>`;
      for (let d = 1; d <= dim; d++) {
        const t = d === now.getDate() && mi === now.getMonth() && y === now.getFullYear();
        const has = evOn(y, mi, d).length;
        cells += `<i class="${t ? 'today' : has ? 'has' : ''}">${d}</i>`;
      }
      return `<div class="ym" data-ym="${mi}"><div class="mh">${name}</div>
        <div class="mg">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(s => `<span>${s}</span>`).join('')}${cells}</div></div>`;
    }).join('')}</div>`;
    this.side(w);
  },

  renderMonth(w) {
    w = w || this.w; if (!w) return;
    const { y, m } = w.st, now = new Date();
    w.node.querySelector('[data-mon]').textContent = `${MONS[m]} ${y}`;
    w.node.querySelector('[data-dows]').innerHTML = DAYS3.map(d => `<div>${d}</div>`).join('');
    const gridNode = w.node.querySelector('[data-grid]');
    gridNode.outerHTML = `<div class="cal-grid" data-grid></div>`;
    const first = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const pdim = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push({ d: pdim - first + 1 + i, out: true, y: m === 0 ? y - 1 : y, m: (m + 11) % 12 });
    for (let d = 1; d <= dim; d++) cells.push({ d, y, m });
    while (cells.length % 7) cells.push({ d: cells.length - first - dim + 1, out: true, y: m === 11 ? y + 1 : y, m: (m + 1) % 12 });
    while (cells.length < 35) cells.push({ d: cells.length - first - dim + 1, out: true, y: m === 11 ? y + 1 : y, m: (m + 1) % 12 });

    w.node.querySelector('[data-grid]').innerHTML = cells.map(c => {
      const isToday = !c.out && c.d === now.getDate() && c.m === now.getMonth() && c.y === now.getFullYear();
      const evs = evOn(c.y, c.m, c.d);
      return `<div class="cal-cell${c.out ? ' out' : ''}${isToday ? ' today' : ''}" data-y="${c.y}" data-m="${c.m}" data-d="${c.d}">
        <span class="d">${c.d}</span>
        ${evs.slice(0, 3).map(e => `<div class="cal-ev${e.s == null ? ' allday' : ''}" data-ev="${e.id}" style="background:${e.c}" title="${esc(e.t)} · ${e.at}">${esc(e.t)}</div>`).join('')}
        ${evs.length > 3 ? `<div class="cal-more">${evs.length - 3} more</div>` : ''}
      </div>`;
    }).join('');
    this.side(w);
  },
  miniHTML(y, m) {
    const now = new Date();
    const first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < first; i++) cells += `<i class="out"></i>`;
    for (let d = 1; d <= dim; d++) {
      const t = d === now.getDate() && m === now.getMonth() && y === now.getFullYear();
      cells += `<i class="${t ? 'today' : ''}">${d}</i>`;
    }
    return `<div class="mini"><div class="mh"><span>${MONS[m]} ${y}</span></div>
      <div class="mg">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<span>${d}</span>`).join('')}${cells}</div></div>`;
  }
};

/* ============================================================================
   17 · SAFARI
   ========================================================================== */
/* Pages served from inside the file. Everything else goes to the network. */
const SITES = {
  'apple.com': {
    title: 'Apple', fav: '#111',
    html: `<div class="site light">
      <div class="avatar" style="background:#1d1d1f">${ic('g-apple')}</div>
      <h1 style="font-size:34px">macOS Tahoe 26</h1><p class="role">Liquid Glass. Everywhere.</p>
      <div class="links"><a data-goto="en.wikipedia.org/wiki/MacOS">Learn more</a><a data-openext="https://www.apple.com/macos/">Open apple.com</a></div>
      <div class="foot">Copyright © 2026 Apple Inc. All rights reserved.</div></div>`
  },
};
/* Just enough Markdown to read an article. The extractor's output is predictable,
   so this stays deliberately small — and every link is rewritten to navigate
   inside this browser instead of leaving the page. */
function mdInline(s) {
  return esc(s)
    .replace(/!\[(?:Image \d+:\s*)?([^\]]*)\]\(([^)\s]+)[^)]*\)/g,
      (m, a, u) => /^https?:/.test(u) ? `<img src="${u}" alt="${a}" loading="lazy">` : '')
    /* Link text that is itself a URL means an icon or vote arrow the extractor
       couldn't name — printing it just fills the page with addresses. */
    .replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (m, a, u) => {
      const txt = a.trim();
      if (!/^https?:/.test(u)) return txt;
      if (!txt || /^https?:\/\//.test(txt)) return '';
      return `<a data-goto="${u.replace(/^https?:\/\//, '')}">${txt}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
function mdHTML(src) {
  /* Listing pages come back as one enormous line with the item numbers inline.
     Long lines get split back into list items; short ones are left alone so
     ordinary prose keeps its decimals. */
  const src2 = src.replace(/\r/g, '').split('\n')
    .map(l => l.length > 140 ? l.replace(/\s(\d{1,3})\.(?!\d)\s*/g, '\n$1. ') : l).join('\n');
  const out = [], lines = src2.split('\n');
  let para = [], list = null, code = null;
  const flushP = () => {
    if (!para.length) return;
    const html = mdInline(para.join(' ').replace(/\s{2,}/g, ' ')).trim();
    if (html) out.push(`<p>${html}</p>`);
    para = [];
  };
  const flushL = () => {
    if (!list) return;
    const items = list.items.map(i => mdInline(i).trim()).filter(Boolean);
    if (items.length) out.push(`<${list.t}>${items.map(i => `<li>${i}</li>`).join('')}</${list.t}>`);
    list = null;
  };
  const flush = () => { flushP(); flushL(); };
  for (const raw of lines) {
    const ln = raw.trimEnd();
    if (code !== null) {
      if (/^```/.test(ln)) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = null; }
      else code.push(raw);
      continue;
    }
    if (/^```/.test(ln)) { flush(); code = []; continue; }
    if (!ln.trim()) { flush(); continue; }
    if (/^(Published Time|URL Source|Warning):/.test(ln)) continue;
    const h = ln.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flush(); const lvl = Math.min(h[1].length + 1, 6); out.push(`<h${lvl}>${mdInline(h[2])}</h${lvl}>`); continue; }
    if (/^([-*_])\1{2,}$/.test(ln.replace(/\s/g, ''))) { flush(); out.push('<hr>'); continue; }
    const li = ln.match(/^\s*(?:[-*+]\s+|\d{1,3}\.(?!\d)\s*)(.*)$/);
    if (li) {
      const t = /^\s*\d/.test(ln) ? 'ol' : 'ul';
      flushP(); if (list && list.t !== t) flushL();
      (list = list || { t, items: [] }).items.push(li[1]);
      continue;
    }
    const q = ln.match(/^>\s?(.*)$/);
    if (q) { flush(); out.push(`<blockquote>${mdInline(q[1])}</blockquote>`); continue; }
    flushL(); para.push(ln.trim());
  }
  if (code) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
  flush();
  return out.join('\n');
}

/* Whatever the URL bar can't resolve locally is searched for real. */
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
/* DuckDuckGo answers 200 even for hosts with no icon, so a missing favicon is a
   decode failure the markup can style around rather than a console error. */
const favicon = host => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`;

const FAVS = [['Apple', '#1d1d1f'], ['Wikipedia', '#636466'], ['YouTube', '#ff0033'],
['Hacker News', '#ff6600'], ['MDN', '#000'], ['Can I use', '#1d78c1'],
['Internet Archive', '#000'], ['JSFiddle', '#0084ff']];
const FAV_URL = {
  'Apple': 'apple.com', 'Wikipedia': 'en.wikipedia.org/wiki/MacOS',
  'YouTube': 'youtube.com', 'Hacker News': 'news.ycombinator.com',
  'MDN': 'developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter', 'Can I use': 'caniuse.com',
  'Internet Archive': 'archive.org', 'JSFiddle': 'jsfiddle.net',
};
/* Most recent first, deduplicated — feeds the History menu and the start page. */
const HISTORY = [];
const READING = [
  ['en.wikipedia.org/wiki/Bézier_curve', 'Bézier curve'],
  ['en.wikipedia.org/wiki/Subpixel_rendering', 'Subpixel rendering'],
];

APPS.safari = {
  name: 'Safari', icon: 'app-safari', w: 1020, h: 660, minW: 520, minH: 360, single: false,
  menus: () => stdMenus('safari', {
    File: [{ id: 't', label: 'New Tab', key: '⌘T', run: () => Saf.newTab() },
    { id: 'w', label: 'New Window', key: '⌘N', run: () => WM.open('safari', { force: true }) }, '-',
    { id: 'c', label: 'Close Tab', key: '⌘W', run: () => Saf.closeTab() }],
    View: [{ id: 'sb', label: (Saf.w && Saf.w.st.sidebar ? 'Hide' : 'Show') + ' Sidebar', key: '⌃⌘S', run: () => Saf.toggleSidebar() },
    { id: 'fb', label: (SYS.safariFavs ? 'Hide' : 'Show') + ' Favourites Bar', key: '⇧⌘B', run: () => Saf.toggleFavBar() }, '-',
    { id: 'r', label: 'Reload Page', key: '⌘R', run: () => Saf.reload() }],
    History: [{ id: 'b', label: 'Back', key: '⌘[', run: () => Saf.back() }, { id: 'f', label: 'Forward', key: '⌘]', run: () => Saf.fwd() }, '-',
    ...(HISTORY.length ? HISTORY.slice(0, 8).map((u, i) => ({ id: 'h' + i, label: Saf.titleFor(u), run: () => Saf.go(u) }))
      : [{ id: 'h', label: 'No history yet', disabled: true }])],
    Bookmarks: FAVS.map(([n]) => ({ id: n, label: n, run: () => Saf.go(FAV_URL[n]) })),
  }, ['File', 'Edit', 'View', 'History', 'Bookmarks', 'Window', 'Help']),
  mount(w) {
    w.st = { tabs: [{ url: '', hist: [''], hi: 0 }], t: 0, sidebar: false };
    return `<div class="sf" data-sf>
      <div class="sf-top" data-drag>
        <div class="sf-r1">
          <div class="sf-l">
            <div data-tl></div><div style="width:8px"></div>
            <button class="tbtn" data-nodrag data-sb title="Sidebar">${ic('g-sidebar')}</button>
            <div class="sf-sep"></div>
            <button class="tbtn" data-nodrag data-back title="Back">${ic('g-chev-l')}</button>
            <button class="tbtn" data-nodrag data-fwd title="Forward">${ic('g-chev-r')}</button>
          </div>
          <div class="sf-url" data-nodrag>
            <button class="tbtn rd" data-reader title="Show Reader">${ic('g-glasses')}</button>
            <span data-urlico>${ic('g-search')}</span>
            <input data-url spellcheck="false" autocomplete="off" placeholder="Search or enter website name">
            <button class="tbtn" data-reload style="min-width:20px;height:20px" title="Reload">${ic('g-reload')}</button>
          </div>
          <div class="sf-r">
            <button class="tbtn" data-nodrag data-share title="Share">${ic('g-share')}</button>
            <button class="tbtn" data-nodrag data-overview title="Show Tab Overview">${ic('g-grid')}</button>
            <button class="tbtn" data-nodrag data-newtab title="New Tab">${ic('g-plus')}</button>
          </div>
        </div>
        <div class="sf-tabs" data-tabs></div>
        <div class="sf-fav" data-nodrag data-favbar></div>
      </div>
      <div class="sf-body">
        <div class="sf-side" data-side></div>
        <div class="sf-page scroll" data-page><div class="sf-prog" data-prog></div></div>
      </div>
    </div>`;
  },
  ready(w) {
    Saf.w = w;
    const url = w.node.querySelector('[data-url]');
    on(w.node, 'click', '[data-back]', () => Saf.back(w));
    on(w.node, 'click', '[data-fwd]', () => Saf.fwd(w));
    on(w.node, 'click', '[data-reload]', () => Saf.reload(w));
    on(w.node, 'click', '[data-newtab]', () => Saf.newTab(w));
    on(w.node, 'click', '[data-share]', () => Saf.share(w));
    on(w.node, 'click', '[data-tryframe]', (e, t) => {
      const page = w.node.querySelector('[data-page]');
      page.innerHTML = `<div class="sf-prog" data-prog></div>` + Saf.framePage(t.dataset.tryframe, true);
    });
    on(w.node, 'click', '[data-overview]', () => Saf.overview(w));
    on(w.node, 'click', '[data-sb]', () => Saf.toggleSidebar(w));
    on(w.node, 'click', '[data-reader]', () => Saf.toggleReader(w));
    on(w.node, 'click', '[data-fav]', (e, t) => Saf.go(FAV_URL[t.dataset.fav] || t.dataset.fav, w));
    on(w.node, 'click', '.sf-tab', (e, t) => { if (e.target.closest('.x')) return; w.st.t = +t.dataset.i; Saf.render(w); });
    on(w.node, 'click', '.sf-tab .x', (e, t) => { e.stopPropagation(); Saf.closeTab(w, +t.closest('.sf-tab').dataset.i); });
    url.addEventListener('focus', () => url.select());
    url.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); url.blur(); Saf.go(url.value.trim(), w); }
      if (e.key === 'Escape') { url.blur(); Saf.render(w); }
    });
    Saf.render(w);
  }
};

const Saf = {
  w: null,
  tab(w) { w = w || this.w; return w.st.tabs[w.st.t]; },
  site(url) {
    const clean = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return SITES[clean] || null;
  },
  /* Classify what the user typed. Anything with a dot and no spaces is treated as
     an address; everything else is a search, same as the real omnibar. */
  kind(url) {
    const u = url.replace(/^https?:\/\//, '');
    if (!u.trim()) return 'start';
    if (SITES[u.replace(/\/$/, '')]) return 'local';
    if (/^en\.wikipedia\.org\/wiki\//.test(u)) return 'wiki';
    if (/(^|\.)youtube\.com\/watch\?v=|(^|\.)youtu\.be\//.test(u)) return 'video';
    if (/^[^\s/]+\.[a-z]{2,}(\/|$|\?)/i.test(u)) return 'web';
    return 'search';
  },
  host(url) { return url.replace(/^https?:\/\//, '').split('/')[0]; },
  /* Titles have to be known before content arrives, or the tab strip flickers. */
  titleFor(url) {
    const k = this.kind(url), u = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (k === 'start') return 'Start Page';
    if (k === 'local') return SITES[u].title;
    if (k === 'wiki') return decodeURIComponent(u.split('/wiki/')[1] || '').replace(/_/g, ' ') + ' — Wikipedia';
    if (k === 'search') return `${url} — Search`;
    return this.host(url);
  },
  favFor(url) {
    const k = this.kind(url), u = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (k === 'local') return SITES[u].fav;
    if (k === 'search' || k === 'start') return '#8e8e93';
    return null;                                  // real favicon, fetched
  },

  /* Chrome that lives outside the page: tab strip, favourites bar, sidebar. */
  paintChrome(w) {
    const st = w.st, t = this.tab(w), k = this.kind(t.url);
    w.node.querySelector('[data-url]').value = k === 'start' ? '' : t.url;
    w.node.querySelector('[data-urlico]').innerHTML = ic(k === 'start' || k === 'search' ? 'g-search' : 'g-lock');
    const rd = w.node.querySelector('[data-reader]');
    rd.classList.toggle('show', k === 'web');
    rd.classList.toggle('on', k === 'web' && (t.reader === true || (t.reader == null && !this.framable(t.url))));
    w.node.querySelector('[data-back]').classList.toggle('dis', t.hi <= 0);
    w.node.querySelector('[data-fwd]').classList.toggle('dis', t.hi >= t.hist.length - 1);
    w.node.querySelector('[data-sb]').classList.toggle('on', st.sidebar);
    w.node.querySelector('[data-sf]').classList.toggle('sb', st.sidebar);
    /* A lone tab needs no strip; the empty container collapses itself. */
    w.node.querySelector('[data-tabs]').innerHTML = st.tabs.length < 2 ? '' : st.tabs.map((tb, i) =>
      `<div class="sf-tab${i === st.t ? ' on' : ''}" data-i="${i}">
        <span class="x">${ic('g-x')}</span>
        <span class="mid">${this.favHTML(tb.url)}<span class="nm">${esc(this.titleFor(tb.url))}</span></span></div>`
    ).join('');
    w.node.querySelector('[data-favbar]').innerHTML = SYS.safariFavs
      ? FAVS.map(([n, c]) => `<a data-fav="${esc(n)}"><i style="background:${c}"></i>${esc(n)}</a>`).join('') : '';
    w.node.querySelector('[data-side]').innerHTML = st.sidebar ? this.sideHTML(t.url) : '';
  },
  favHTML(url, size = 14) {
    const c = this.favFor(url);
    return c ? `<span class="fav" style="background:${c};width:${size}px;height:${size}px"></span>`
      : `<img class="fav" src="${favicon(this.host(url))}" alt="" onerror="this.style.visibility='hidden'"
          style="width:${size}px;height:${size}px;border-radius:3px">`;
  },
  sideHTML(cur) {
    const row = (u, label, icon) => `<div class="si${u === cur ? ' on' : ''}" data-goto="${esc(u)}">
      ${icon || this.favHTML(u, 16)}<span class="nm">${esc(label)}</span></div>`;
    return `<div class="in">
      <div class="grp"><div class="gh">Favourites</div>${FAVS.map(([n]) => row(FAV_URL[n], n)).join('')}</div>
      <div class="grp"><div class="gh">Reading List</div>${READING.map(([u, n]) => row(u, n, ic('g-glasses', 'ico'))).join('')}</div>
    </div>`;
  },
  /* Safari's start page: favourites as tiles, then whatever you've actually opened. */
  startHTML() {
    const tile = (u, label, dot) => `<a class="sf-tile" data-goto="${esc(u)}">
      <span class="sq">${dot ? `<i style="background:${dot}">${esc((label[0] || '?').toUpperCase())}</i>`
        : `<img src="${favicon(this.host(u))}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('i'),{textContent:'${esc((label[0] || '?').toUpperCase())}',style:'background:#8e8e93'}))">`}</span>
      <span>${esc(label)}</span></a>`;
    const recent = HISTORY.filter(u => this.kind(u) !== 'start').slice(0, 8);
    return `<div class="sf-start">
      <h2>Favourites</h2>
      <div class="sf-grid">${FAVS.map(([n, c]) => tile(FAV_URL[n], n, SITES[FAV_URL[n]] ? c : null)).join('')}</div>
      ${recent.length ? `<h2>Frequently Visited</h2>
        <div class="sf-grid">${recent.map(u => tile(u, this.titleFor(u).split(' — ')[0], this.favFor(u))).join('')}</div>` : ''}
      <div class="sf-priv">${ic('g-shield')}<div><b>Privacy Report</b> · ${9 + (HISTORY.length % 7)} trackers prevented from profiling you</div></div>
    </div>`;
  },

  render(w) {
    w = w || this.w; if (!w) return;
    const t = this.tab(w);
    this.paintChrome(w);
    w.title = this.titleFor(t.url);
    const tt = w.node.querySelector('.tb .title'); if (tt) tt.textContent = w.title;

    const page = w.node.querySelector('[data-page]');
    page.innerHTML = `<div class="sf-prog" data-prog></div>`;
    page.dataset.kind = this.kind(t.url);
    const prog = page.querySelector('[data-prog]');
    prog.classList.add('on'); prog.style.width = '18%';
    raf(() => raf(() => { prog.style.width = '72%'; }));

    /* Every navigation gets a token; a slow fetch that lands after the user has
       moved on must not paint over the newer page. */
    const token = (w.nav = (w.nav || 0) + 1);
    const finish = html => {
      if (w.dead || w.nav !== token) return;
      page.innerHTML = `<div class="sf-prog on" data-prog style="width:100%"></div>` + html;
      setTimeout(() => { const p = page.querySelector('[data-prog]'); if (p) p.classList.remove('on'); }, 260);
    };
    this.paint(t.url, finish, w);
  },

  /* Resolves a URL to markup, hitting the network when it has to. */
  paint(url, done, w) {
    const k = this.kind(url), u = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (k === 'start') return done(this.startHTML());
    if (k === 'local') return done(SITES[u].html);
    if (k === 'wiki') return this.paintWiki(decodeURIComponent(u.split('/wiki/')[1] || 'MacOS'), done);
    if (k === 'search') return this.paintSearch(url, done);
    if (k === 'video') {
      const id = (u.match(/[?&]v=([\w-]{6,})/) || u.match(/youtu\.be\/([\w-]{6,})/) || [])[1];
      /* YouTube rejects players whose embedder has no origin, which is every page
         opened straight off the disk. Served over http it plays for real, so say
         which situation you're in rather than showing their error 153. */
      if (id && location.protocol === 'file:') return done(`<div class="sf-blocked">
        <div class="ico"><img src="${favicon('youtube.com')}" alt="" onerror="this.style.display='none'"></div>
        <h3>Embeds need a real origin</h3>
        <p>YouTube won't embed into a page opened from the filesystem. Served over http it plays here.</p>
        <div style="display:flex;gap:9px;margin-top:6px">
          <button class="btn pri" data-openext="https://www.youtube.com/watch?v=${esc(id)}">Watch on YouTube</button>
          <button class="btn" data-tryframe="youtube.com/embed/${esc(id)}">Try Anyway</button>
        </div></div>`);
      if (id) return done(`<iframe class="sf-frame" src="https://www.youtube.com/embed/${id}?autoplay=0&rel=0"
        allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
        allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`);
    }
    /* Embeddable hosts get a real frame; everything else is read for real
       through the extractor, which is what Reader does anyway. */
    const t = w && this.tab(w);
    if (t && t.reader === true) return this.paintReader(url, done);
    const frame = this.framePage(url, !!(t && t.reader === false));
    return frame ? done(frame) : this.paintReader(url, done);
  },

  /* A page served from a file:// document can't tell a refused frame from a real
     one — both fire load, and both refuse DOM access because the parent origin is
     opaque. So instead of guessing wrong, hosts known to allow embedding are framed
     straight away and the rest are read as text. */
  framable(url) {
    const h = this.host(url).replace(/^www\./, '');
    return /(^|\.)(example\.(com|org)|youtube(-nocookie)?\.com|youtu\.be|player\.vimeo\.com|jsfiddle\.net|archive\.org|wikipedia\.org|github\.io|caniuse\.com)$/.test(h);
  },

  framePage(url, force) {
    if (!force && !this.framable(url)) return null;
    const src = /^https?:\/\//.test(url) ? url : 'https://' + url;
    return `<iframe class="sf-frame" src="${esc(src)}" referrerpolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>`;
  },

  /* Reader. A CORS-enabled extractor hands back the article as Markdown, which
     renders here as type — no frame, so no X-Frame-Options to argue with. */
  reader: 'https://r.jina.ai/',
  async paintReader(url, done) {
    done(`<div class="sf-load"><div class="sf-spin"></div></div>`);
    const full = /^https?:\/\//.test(url) ? url : 'https://' + url;
    const ac = new AbortController(), kill = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await fetch(this.reader + full, { signal: ac.signal, referrerPolicy: 'no-referrer' });
      if (!r.ok) throw new Error(r.status);
      const raw = await r.text();
      clearTimeout(kill);
      const title = ((raw.match(/^Title:\s*(.*)$/m) || [])[1] || this.host(url)).trim();
      const body = raw.split(/^Markdown Content:\s*$/m).slice(1).join('\n') || raw;
      const html = mdHTML(body.trim());
      if (html.replace(/<[^>]*>/g, '').trim().length < 40) throw new Error('empty');
      done(`<div class="rdr">
        <h1>${esc(title)}</h1>
        <div class="meta">${this.favHTML(url, 15)}<span>${esc(this.host(url))}</span></div>
        <div class="body">${html}</div>
        <div class="foot">
          <button class="btn" data-tryframe="${esc(url)}">Load the live page</button>
          <button class="btn" data-openext="${esc(full)}">Open in New Window</button>
        </div></div>`);
    } catch (e) {
      clearTimeout(kill);
      done(this.blockedPage(url));
    }
  },

  blockedPage(url) {
    const h = this.host(url);
    return `<div class="sf-blocked">
      <div class="ico"><img src="${favicon(h)}" alt="" onerror="this.style.display='none'"></div>
      <h3>Can't open ${esc(h)}</h3>
      <p>This site refuses to be embedded and couldn't be read as text either.</p>
      <div style="display:flex;gap:9px;margin-top:6px">
        <button class="btn pri" data-tryframe="${esc(url)}">Load Anyway</button>
        <button class="btn" data-openext="${esc(/^https?:/.test(url) ? url : 'https://' + url)}">Open in New Window</button>
      </div></div>`;
  },

  async paintSearch(q, done) {
    done(`<div class="sf-load"><div class="sf-spin"></div></div>`);
    try {
      const r = await fetch(`${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(q)}` +
        `&srlimit=8&format=json&origin=*`, { referrerPolicy: 'no-referrer' });
      const j = await r.json();
      const hits = (j.query && j.query.search) || [];
      if (!hits.length) throw new Error('empty');
      done(`<div class="srch"><h2>${esc(q)}</h2>
        <div class="q">${hits.length} results</div>
        <div class="res">${hits.map(h => {
        const slug = h.title.replace(/ /g, '_');
        return `<a data-goto="en.wikipedia.org/wiki/${encodeURIComponent(slug)}">
            <div class="u">en.wikipedia.org › wiki › ${esc(slug)}</div>
            <div class="t">${esc(h.title)}</div>
            <div class="d">${h.snippet}</div></a>`;
      }).join('')}</div></div>`);
    } catch (e) {
      done(this.offlineSearch(q));
    }
  },

  async paintWiki(title, done) {
    done(`<div class="sf-load"><div class="sf-spin"></div></div>`);
    try {
      const [sum, body] = await Promise.all([
        fetch(WIKI_REST + encodeURIComponent(title), { referrerPolicy: 'no-referrer' }).then(r => r.json()),
        fetch(`${WIKI_API}?action=parse&page=${encodeURIComponent(title)}&prop=text&section=0` +
          `&format=json&origin=*`, { referrerPolicy: 'no-referrer' }).then(r => r.json()).catch(() => null),
      ]);
      if (sum.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') throw new Error('404');
      let lead = '';
      if (body && body.parse && body.parse.text) {
        const box = document.createElement('div');
        box.innerHTML = body.parse.text['*'];
        box.querySelectorAll('style,script,.mw-editsection,.reference,sup.reference,.hatnote,.navbox,table,figure,.thumb')
          .forEach(n => n.remove());
        /* Internal links keep working, but inside this browser. */
        box.querySelectorAll('a[href^="/wiki/"]').forEach(a => {
          a.setAttribute('data-goto', 'en.wikipedia.org' + a.getAttribute('href'));
          a.removeAttribute('href');
        });
        box.querySelectorAll('a[href]').forEach(a => a.removeAttribute('href'));
        /* MediaWiki emits protocol-relative sources, which resolve against file://
           and fail. Pin them to https and drop the responsive set. */
        box.querySelectorAll('img').forEach(im => {
          const s = im.getAttribute('src') || '';
          if (s.startsWith('//')) im.setAttribute('src', 'https:' + s);
          im.removeAttribute('srcset');
        });
        lead = box.innerHTML;
      }
      /* Articles carry a display title — macOS, not MacOS. */
      const shown = ((sum.titles && sum.titles.display) || sum.title || title).replace(/<[^>]+>/g, '');
      done(`<div class="wiki">
        <h1>${esc(shown)}</h1>
        ${sum.description ? `<p class="desc">${esc(sum.description)}</p>` : ''}
        <div class="lead">
          ${/* The parsed lead is the real article text; the summary extract is only
                a fallback, and printing both repeats the same paragraph twice. */''}
          <div class="body">${lead || `<p>${esc(sum.extract || '')}</p>`}</div>
          ${sum.thumbnail ? `<div class="thumb"><img src="${esc(sum.thumbnail.source)}" alt=""
            onerror="this.closest('.thumb').remove()"></div>` : ''}
        </div>
        <div class="foot">Text is available under CC BY-SA 4.0.</div>
      </div>`);
    } catch (e) {
      done(`<div class="sf-blocked"><div class="ico">${ic('g-globe')}</div>
        <h3>Couldn't reach Wikipedia</h3>
        <p>No network, or that article doesn't exist.</p>
        <button class="btn pri" data-goto="">Start Page</button></div>`);
    }
  },
  overview(w) {
    w = w || this.w; if (!w) return;
    const r = w.node.getBoundingClientRect();
    const node = el(`<div class="pop" style="width:min(560px,${Math.round(r.width - 40)}px);padding:14px">
      <div style="font-size:12px;font-weight:600;color:var(--txt-2);padding:0 2px 10px">${w.st.tabs.length} Tab${w.st.tabs.length > 1 ? 's' : ''}</div>
      <div class="sf-ov">${w.st.tabs.map((tb, i) => {
      const c = this.favFor(tb.url), title = this.titleFor(tb.url);
      return `<button data-ovi="${i}"${i === w.st.t ? ' class="on"' : ''}>
          <span class="pv">${esc(title[0] || '?')}</span>
          <span class="lb">${c ? `<i style="background:${c}"></i>`
        : `<img src="${favicon(this.host(tb.url))}" alt="" onerror="this.style.visibility='hidden'"
            style="width:12px;height:12px;border-radius:3px;flex:none">`}${esc(title)}</span></button>`;
    }).join('')}
      <button data-ovnew><span class="pv add">${ic('g-plus')}</span><span class="lb">New Tab</span></button></div></div>`);
    on(node, 'click', '[data-ovi]', (e, t) => { w.st.t = +t.dataset.ovi; Pop.close(); this.render(w); });
    on(node, 'click', '[data-ovnew]', () => { Pop.close(); this.newTab(w); });
    Pop.open(node, { x: r.left + 20, y: r.top + 70, origin: 'top' });
  },
  /* Used when the search API can't be reached, so the browser still answers. */
  offlineSearch(q) {
    const hits = [
      { u: 'en.wikipedia.org/wiki/MacOS', t: 'macOS — Wikipedia', d: 'A Unix operating system developed and marketed by Apple since 2001.' },
      { u: 'caniuse.com', t: 'Can I use — Support tables for HTML5, CSS3, etc', d: 'Browser support tables for modern web technologies.' },
      { u: 'developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter', t: 'backdrop-filter — CSS | MDN', d: 'Applies graphical effects such as blur to the area behind an element.' },
      { u: 'example.com', t: 'Example Domain', d: 'This domain is for use in illustrative examples in documents.' },
    ];
    return `<div class="srch"><h2>${esc(q)}</h2>
      <div class="q">Offline — showing local results</div>
      <div class="res">${hits.map(h => `<a data-goto="${esc(h.u)}"><div class="u">${esc(h.u)}</div><div class="t">${esc(h.t)}</div><div class="d">${esc(h.d)}</div></a>`).join('')}</div></div>`;
  },
  go(url, w) {
    w = w || this.w; if (!w) return;
    if (url == null) return;
    const t = this.tab(w);
    t.hist = t.hist.slice(0, t.hi + 1);
    t.url = url; t.reader = null; t.hist.push(url); t.hi = t.hist.length - 1;
    if (url.trim()) {
      const at = HISTORY.indexOf(url);
      if (at >= 0) HISTORY.splice(at, 1);
      HISTORY.unshift(url);
      HISTORY.length = Math.min(HISTORY.length, 24);
    }
    this.render(w);
  },
  toggleSidebar(w) {
    w = w || this.w; if (!w) return;
    w.st.sidebar = !w.st.sidebar;
    this.paintChrome(w);
  },
  toggleFavBar(w) {
    SYS.safariFavs = !SYS.safariFavs;
    WM.byApp('safari').forEach(x => this.paintChrome(x));
    Toast(SYS.safariFavs ? 'Favourites bar shown' : 'Favourites bar hidden');
  },
  toggleReader(w) {
    w = w || this.w; if (!w) return;
    const t = this.tab(w);
    if (this.kind(t.url) !== 'web') return Toast('Reader isn’t available on this page');
    t.reader = !(t.reader === true || (t.reader == null && !this.framable(t.url)));
    this.render(w);
  },
  share(w) {
    w = w || this.w;
    const url = w ? this.tab(w).url : '';
    if (navigator.clipboard && url) navigator.clipboard.writeText(/^https?:/.test(url) ? url : 'https://' + url).catch(() => { });
    Toast(url ? 'Copied link to clipboard' : 'Nothing to share');
  },
  back(w) { w = w || this.w; const t = this.tab(w); if (t.hi > 0) { t.hi--; t.url = t.hist[t.hi]; t.reader = null; this.render(w); } },
  fwd(w) { w = w || this.w; const t = this.tab(w); if (t.hi < t.hist.length - 1) { t.hi++; t.url = t.hist[t.hi]; t.reader = null; this.render(w); } },
  reload(w) { this.render(w || this.w); },
  newTab(w) {
    w = w || this.w; if (!w) return WM.open('safari');
    w.st.tabs.push({ url: '', hist: [''], hi: 0 });
    w.st.t = w.st.tabs.length - 1; this.render(w);
    const u = w.node.querySelector('[data-url]'); if (u) u.focus();
  },
  closeTab(w, i) {
    w = w || this.w; if (!w) return;
    if (i == null) i = w.st.t;
    if (w.st.tabs.length === 1) return WM.close(w.id);
    w.st.tabs.splice(i, 1); w.st.t = clamp(w.st.t, 0, w.st.tabs.length - 1); this.render(w);
  }
};
document.addEventListener('click', e => {
  const g = e.target.closest('[data-goto]');
  if (g) {
    e.preventDefault();
    /* A link inside a window navigates that window, not whichever Safari was
       focused last — two open browsers otherwise fight over each other. */
    const host = g.closest('.win');
    const w = host && WM.list.find(x => x.node === host && x.app === 'safari');
    return Saf.go(g.dataset.goto, w || undefined);
  }
  /* The only place this desktop hands off to the real browser. */
  const x = e.target.closest('[data-openext]');
  if (x) { e.preventDefault(); window.open(x.dataset.openext, '_blank', 'noopener'); }
});
/* ============================================================================
   18 · MUSIC
   ========================================================================== */
const ART = [
  { g: ['#ff6b8b', '#7c3aed'], s: 'circles' }, { g: ['#12c2e9', '#0b4f8a'], s: 'waves' },
  { g: ['#f9d423', '#e65c00'], s: 'sun' }, { g: ['#141e30', '#243b55'], s: 'bars' },
  { g: ['#43e97b', '#087f5b'], s: 'diag' }, { g: ['#f5f0e6', '#c0a880'], s: 'halftone' },
  { g: ['#0f0f12', '#3a3a45'], s: 'peaks' }, { g: ['#ff9a44', '#fc6076'], s: 'sun' },
  { g: ['#2b1055', '#7597de'], s: 'peaks' }, { g: ['#e0e5ec', '#9aa5b1'], s: 'arch' },
  { g: ['#00b4db', '#003357'], s: 'waves' }, { g: ['#ee0979', '#ff6a00'], s: 'diag' },
];
function albumArt(i) {
  const a = ART[i % ART.length], id = 'ag' + i;
  const shapes = {
    circles: `<circle cx="50" cy="42" r="26" fill="rgba(255,255,255,.14)"/><circle cx="50" cy="42" r="17" fill="rgba(255,255,255,.18)"/><circle cx="50" cy="42" r="8" fill="rgba(255,255,255,.85)"/><rect x="18" y="80" width="46" height="4" rx="2" fill="rgba(255,255,255,.5)"/>`,
    waves: `<path d="M0 62c14 0 14-14 28-14s14 14 28 14 14-14 28-14 14 14 28 14v46H0z" fill="rgba(255,255,255,.16)"/><path d="M0 76c14 0 14-12 28-12s14 12 28 12 14-12 28-12 14 12 28 12v34H0z" fill="rgba(255,255,255,.22)"/><rect x="16" y="18" width="34" height="4" rx="2" fill="rgba(255,255,255,.6)"/>`,
    sun: `<circle cx="50" cy="56" r="22" fill="rgba(255,255,255,.9)"/><g stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"><path d="M50 16v12M50 84v12M10 56h12M78 56h12M22 28l8 8M70 76l8 8M78 28l-8 8M30 76l-8 8"/></g>`,
    bars: (() => {
      const h = [34, 58, 22, 74, 46, 88, 30, 62, 40];
      return `<g fill="rgba(255,255,255,.26)">${h.map((v, k) => `<rect x="${10 + k * 9}" y="${94 - v}" width="5.5" height="${v}" rx="2.6"/>`).join('')}</g>
        <rect x="${10 + 5 * 9}" y="${94 - 88}" width="5.5" height="88" rx="2.6" fill="rgba(255,255,255,.9)"/>`;
    })(),
    halftone: `<g fill="rgba(0,0,0,.18)">${[...Array(7)].map((_, r) => [...Array(7)].map((_, c) => {
      const dx = c - 3, dy = r - 3, d = Math.sqrt(dx * dx + dy * dy);
      return `<circle cx="${14 + c * 12}" cy="${14 + r * 12}" r="${(5.4 - d * 1.05).toFixed(2)}"/>`;
    }).join('')).join('')}</g>`,
    diag: `<g stroke="rgba(255,255,255,.2)" stroke-width="7">${[...Array(8)].map((_, k) => `<path d="M${-30 + k * 22} 110L${20 + k * 22} -10"/>`).join('')}</g><circle cx="50" cy="50" r="14" fill="rgba(255,255,255,.9)"/>`,
    arch: `<path d="M26 92V44a24 24 0 0 1 48 0v48z" fill="rgba(255,255,255,.6)"/><path d="M38 92V46a12 12 0 0 1 24 0v46z" fill="rgba(0,0,0,.16)"/><rect x="14" y="92" width="72" height="4" fill="rgba(0,0,0,.2)"/>`,
    peaks: `<path d="M0 74 26 40l17 20 21-30 36 44v26H0z" fill="rgba(255,255,255,.2)"/><path d="M0 86 30 60l20 16 24-14 26 20v18H0z" fill="rgba(255,255,255,.34)"/><circle cx="74" cy="26" r="10" fill="rgba(255,255,255,.85)"/>`,
  }[a.s];
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%"><defs><linearGradient id="${id}" x1="0" y1="0" x2=".7" y2="1">
    <stop offset="0" stop-color="${a.g[0]}"/><stop offset="1" stop-color="${a.g[1]}"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#${id})"/>${shapes}</svg>`;
}
const ALBUMS = [
  { t: 'Neon Interiors', a: 'Kaida', y: 2026, n: 9 }, { t: 'Deep Field', a: 'Orbital Fold', y: 2025, n: 11 },
  { t: 'Golden Hour', a: 'The Vireo', y: 2024, n: 8 }, { t: 'Nightgraph', a: 'Sable Court', y: 2026, n: 10 },
  { t: 'Fernlight', a: 'Moss & Marrow', y: 2023, n: 7 }, { t: 'Soft Static', a: 'Lantern Bay', y: 2025, n: 12 },
];
const SONGS = [
  { t: 'Aurora Drift', a: 'Kaida', al: 0, d: 224 }, { t: 'Glass Cathedral', a: 'Kaida', al: 0, d: 191 },
  { t: 'Low Orbit', a: 'Orbital Fold', al: 1, d: 268 }, { t: 'Parallax', a: 'Orbital Fold', al: 1, d: 205 },
  { t: 'Sunbleach', a: 'The Vireo', al: 2, d: 178 }, { t: 'Ochre', a: 'The Vireo', al: 2, d: 243 },
  { t: 'Nightgraph', a: 'Sable Court', al: 3, d: 302 }, { t: 'Velvet Static', a: 'Sable Court', al: 3, d: 216 },
  { t: 'Fernlight', a: 'Moss & Marrow', al: 4, d: 189 }, { t: 'Soft Static', a: 'Lantern Bay', al: 5, d: 231 },
];
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ---- the sound ------------------------------------------------------------
   Music plays for real. There is no licensable audio to stream from a single
   HTML file, so each track is synthesised: a key, a mode, a tempo and a chord
   progression derived from its index, voiced with pads, bass, plucks and drums.
   Same song, same notes, every time — and the transport reads the audio clock,
   so the scrubber tracks what you are actually hearing.
   -------------------------------------------------------------------------- */
const MODES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};
const PROGS = [[0, 5, 3, 4], [0, 4, 5, 3], [5, 3, 0, 4], [0, 3, 1, 4]];
const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

const Synth = {
  ctx: null, master: null, wet: null, timer: null,
  startAt: 0, offset: 0, nextBeat: 0, beat: 0, rec: null,

  /** Built on first play — browsers refuse an AudioContext without a gesture. */
  ensure() {
    if (this.ctx) return this.ctx;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    const ctx = this.ctx = new C();

    /* A limiter on the end of the chain: pads, bass and drums all land on the same
       downbeat, and without it those peaks are what set the level for everything. */
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -10; lim.knee.value = 6;
    lim.ratio.value = 12; lim.attack.value = .004; lim.release.value = .18;
    lim.connect(ctx.destination);
    this.lim = lim;
    this.master = ctx.createGain();
    this.master.connect(lim);

    /* Reverb from a decaying noise impulse. Two seconds of tail is the difference
       between "synthesiser demo" and "record". */
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    this.wet = ctx.createGain(); this.wet.gain.value = .34;
    verb.connect(this.wet); this.wet.connect(this.master);
    this.verbIn = verb;

    /* One eighth-note of feedback delay, for the plucks to bounce around in. */
    const dl = ctx.createDelay(1); dl.delayTime.value = .34;
    const fb = ctx.createGain(); fb.gain.value = .3;
    const dw = ctx.createGain(); dw.gain.value = .22;
    dl.connect(fb); fb.connect(dl); dl.connect(dw); dw.connect(this.master);
    this.delayIn = dl;

    this.gain();
    return ctx;
  },
  gain() {
    if (!this.master) return;
    const v = SYS.muted ? 0 : Math.pow(SYS.volume, 1.4) * 1.15;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .04);
  },

  /* Everything musical about a track, from its position in the library. Fixed
     tables rather than randomness, so a song sounds the same on every play. */
  recipe(i) {
    const s = SONGS[i], al = s.al;
    const roots = [57, 55, 60, 53, 58, 62, 56, 59, 61, 54];
    const modeNames = ['minor', 'dorian', 'minor', 'major', 'dorian', 'lydian'];
    const warm = [2, 4, 5].includes(al);
    return {
      root: roots[i % roots.length],
      scale: MODES[modeNames[al % modeNames.length]],
      prog: PROGS[i % PROGS.length],
      bpm: warm ? 72 + (i * 5) % 14 : 88 + (i * 7) % 26,
      drums: !warm,
      /* Warm records get a slower, softer pluck and a wider tail. */
      arpDiv: warm ? 2 : 1,
      verb: warm ? .46 : .3,
      cutoff: warm ? 900 : 1500,
    };
  },
  /** Scale degree → midi note, wrapping into higher octaves past the seventh. */
  note(rec, deg, oct = 0) {
    const sc = rec.scale, n = sc.length;
    const o = Math.floor(deg / n) + oct;
    return rec.root + sc[((deg % n) + n) % n] + 12 * o;
  },

  /* ---- voices ---- */
  env(node, t, a, d, peak) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + d);
    node.connect(g);
    return g;
  },
  pad(degs, t, dur) {
    const ctx = this.ctx, rec = this.rec;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = rec.cutoff; lp.Q.value = .7;
    /* The filter drifting open and shut is what stops a held chord going static. */
    lp.frequency.setValueAtTime(rec.cutoff * .7, t);
    lp.frequency.linearRampToValueAtTime(rec.cutoff * 1.25, t + dur * .55);
    lp.frequency.linearRampToValueAtTime(rec.cutoff * .8, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.1, t + dur * .28);
    g.gain.setValueAtTime(.1, t + dur * .7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    lp.connect(g); g.connect(this.master); g.connect(this.verbIn);
    degs.forEach(deg => {
      [-5, 5].forEach(cents => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(this.note(rec, deg, 1));
        o.detune.value = cents;
        o.connect(lp); o.start(t); o.stop(t + dur + .05);
      });
    });
  },
  bass(deg, t, dur) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.value = hz(this.note(this.rec, deg, -1));
    const sub = ctx.createOscillator(); sub.type = 'sine';
    sub.frequency.value = hz(this.note(this.rec, deg, -2));
    const g = this.env(o, t, .012, dur, .3);
    const g2 = this.env(sub, t, .012, dur, .22);
    g.connect(this.master); g2.connect(this.master);
    o.start(t); o.stop(t + dur + .05); sub.start(t); sub.stop(t + dur + .05);
  },
  pluck(deg, t, vel = 1) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.value = hz(this.note(this.rec, deg, 2));
    const g = this.env(o, t, .004, .34, .085 * vel);
    g.connect(this.master); g.connect(this.delayIn); g.connect(this.verbIn);
    o.start(t); o.stop(t + .4);
  },
  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(46, t + .11);
    const g = this.env(o, t, .003, .17, .5);
    g.connect(this.master);
    o.start(t); o.stop(t + .22);
  },
  noise(t, dur, freq, peak, type = 'highpass') {
    const ctx = this.ctx;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    src.connect(f);
    const g = this.env(f, t, .002, dur, peak);
    g.connect(this.master);
    src.start(t); src.stop(t + dur + .02);
  },

  /* ---- transport ---- */
  /** Web Audio needs notes queued ahead of time; 40ms ticks, 180ms of lookahead. */
  tick() {
    const ctx = this.ctx, rec = this.rec;
    if (!ctx || !rec) return;
    const spb = 60 / rec.bpm / 2;               /* one eighth note */
    while (this.nextBeat < ctx.currentTime + .18) {
      const t = this.nextBeat, b = this.beat;
      const inBar = b % 8, barNo = Math.floor(b / 8);
      const chord = rec.prog[barNo % rec.prog.length];

      if (inBar === 0) this.pad([chord, chord + 2, chord + 4], t, spb * 8 * .98);
      if (inBar === 0 || inBar === 5) this.bass(chord, t, spb * 2.4);
      if (inBar === 3 && !rec.drums) this.bass(chord + 4, t, spb * 1.6);

      /* Rolling arpeggio over the chord tones, one note per eighth (or quarter
         on the warmer records), climbing then falling so it never marches. */
      if (b % rec.arpDiv === 0) {
        const shape = [0, 2, 4, 6, 4, 2, 4, 2];
        const deg = chord + shape[(b / rec.arpDiv | 0) % shape.length];
        this.pluck(deg, t, inBar % 2 ? .72 : 1);
      }
      if (rec.drums) {
        if (inBar === 0 || inBar === 6) this.kick(t);
        if (inBar === 4) this.noise(t, .12, 1900, .16);           /* snare */
        if (inBar % 2 === 1) this.noise(t, .035, 7200, .06);      /* hat */
      }
      this.nextBeat += spb;
      this.beat++;
    }
  },
  start(songIndex, from = 0) {
    const ctx = this.ensure();
    if (!ctx) return false;
    if (ctx.state === 'suspended') ctx.resume();
    this.stop(true);
    this.rec = this.recipe(songIndex);
    this.wet.gain.value = this.rec.verb;
    this.offset = from;
    this.startAt = ctx.currentTime + .06;
    /* Resume mid-song on a bar line so the progression stays intelligible. */
    const spb = 60 / this.rec.bpm / 2;
    this.beat = Math.round(from / spb / 8) * 8;
    this.nextBeat = this.startAt;
    this.offset = this.beat * spb;
    this.gain();
    this.tick();
    this.timer = setInterval(() => this.tick(), 40);
    return true;
  },
  stop(keep) {
    clearInterval(this.timer); this.timer = null;
    if (!keep && this.master && this.ctx) {
      /* Fade rather than cut, or every pause ends in a click. */
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .02);
    }
  },
  pos() {
    if (!this.ctx || !this.timer) return null;
    return this.offset + (this.ctx.currentTime - this.startAt);
  },
  get live() { return !!this.timer; },
};
Bus.on('volume', () => Synth.gain());

APPS.music = {
  name: 'Music', icon: 'app-music', w: 1000, h: 640, minW: 620, minH: 400,
  menus: () => stdMenus('music', {
    Controls: [{ id: 'p', label: 'Play', key: '␣', run: () => Mu.toggle() },
    { id: 'n', label: 'Next', key: '⌘→', run: () => Mu.skip(1) },
    { id: 'b', label: 'Previous', key: '⌘←', run: () => Mu.skip(-1) }, '-',
    { id: 's', label: 'Shuffle', key: '⌘S' }, { id: 'r', label: 'Repeat', key: '⌘R' }],
  }, ['File', 'Edit', 'View', 'Controls', 'Window', 'Help']),
  mount(w) {
    w.st = { view: 'Recently Added' };
    const S = [
      { head: 'Apple Music', items: [['Home', 'g-globe'], ['New', 'g-star'], ['Radio', 'g-podcast']] },
      { head: 'Library', items: [['Recently Added', 'g-clock-a'], ['Artists', 'g-contacts2'], ['Albums', 'g-grid'], ['Songs', 'g-list'], ['Made for You', 'g-star']] },
      { head: 'Playlists', items: [['Focus', 'g-list'], ['Late Night', 'g-list'], ['Shipping Music', 'g-list']] },
    ];
    return `<div class="wb col"><div class="mu">
      <div class="mu-top">
        <div class="sbar" data-drag style="width:206px"><div class="sb-top"><div data-tl></div></div>
        ${S.map(g => `<div class="grp"><div class="gh">${g.head}</div>${g.items.map(([n, i]) =>
      `<div class="si" data-mv="${esc(n)}">${ic(i === 'g-podcast' ? 'g-airplay' : i === 'g-contacts2' ? 'g-hand' : i, 'ico')}<span class="nm">${esc(n)}</span></div>`).join('')}</div>`).join('')}
        </div>
        <div class="mu-main">
          <div class="tbar" data-drag style="height:52px;border-bottom:.5px solid var(--line)">
            <button class="tbtn dis" data-nodrag data-mnav="-1" title="Back">${ic('g-chev-l')}</button>
            <button class="tbtn dis" data-nodrag data-mnav="1" title="Forward">${ic('g-chev-r')}</button>
            <div class="grow" style="flex:1"></div>
            <div class="sfield" data-nodrag style="width:180px"><span>${ic('g-search')}</span><input placeholder="Search" data-msearch></div>
          </div>
          <div class="mu-hd"><h2 data-mtitle>Recently Added</h2><span data-mcount></span></div>
          <div data-mbody style="flex:1;display:flex;flex-direction:column;min-height:0"></div>
        </div>
      </div>
      <div class="mu-bar">
        <div class="ctl">
          <button data-c="prev">${ic('g-bwd')}</button>
          <button class="big" data-c="play">${ic('g-play')}</button>
          <button data-c="next">${ic('g-fwd')}</button>
        </div>
        <div class="cv" data-npcv></div>
        <div class="meta"><b data-npt>—</b><span data-npa></span></div>
        <div class="prog"><span class="t" data-cur>0:00</span>
          <div class="sl plain" data-slider="seek"><div class="trk"><div class="fil"></div></div><div class="kn"></div></div>
          <span class="t r" data-dur>0:00</span></div>
        <div class="vol">${ic('g-vol-lo')}<div class="sl" data-slider="mvol"><div class="trk"><div class="fil"></div></div><div class="kn"></div></div></div>
        <button class="tbtn" data-c="shuffle">${ic('g-shuffle')}</button>
        <button class="tbtn" data-c="repeat">${ic('g-repeat')}</button>
      </div>
    </div></div>`;
  },
  ready(w) {
    Mu.w = w;
    /* Sidebar picks push onto a history stack so back/forward mean something. */
    w.st.hist = [w.st.view]; w.st.hi = 0;
    const navBtns = () => {
      w.node.querySelector('[data-mnav="-1"]').classList.toggle('dis', w.st.hi <= 0);
      w.node.querySelector('[data-mnav="1"]').classList.toggle('dis', w.st.hi >= w.st.hist.length - 1);
    };
    on(w.node, 'click', '[data-mv]', (e, t) => {
      w.st.view = t.dataset.mv;
      w.st.hist = w.st.hist.slice(0, w.st.hi + 1); w.st.hist.push(w.st.view); w.st.hi = w.st.hist.length - 1;
      Mu.render(w); navBtns();
    });
    on(w.node, 'click', '[data-mnav]:not(.dis)', (e, t) => {
      w.st.hi = clamp(w.st.hi + +t.dataset.mnav, 0, w.st.hist.length - 1);
      w.st.view = w.st.hist[w.st.hi];
      Mu.render(w); navBtns();
    });
    w.node.querySelector('[data-msearch]').addEventListener('input', e => { w.st.q = e.target.value.trim().toLowerCase(); Mu.render(w); });
    on(w.node, 'click', '[data-c]', (e, t) => {
      const c = t.dataset.c;
      if (c === 'play') Mu.toggle(); if (c === 'next') Mu.skip(1); if (c === 'prev') Mu.skip(-1);
      if (c === 'shuffle' || c === 'repeat') t.classList.toggle('on');
    });
    on(w.node, 'click', '.alb', (e, t) => Mu.playAlbum(+t.dataset.al));
    on(w.node, 'dblclick', '.mu-song', (e, t) => Mu.play(+t.dataset.si));
    on(w.node, 'click', '.mu-song', (e, t) => { $$('.mu-song', w.node).forEach(x => x.classList.remove('pick')); t.classList.add('pick'); });
    /* Dragging only moves the labels; the audio is re-cued once on release, or the
       synth would tear itself down and rebuild on every pointer move. */
    Mu.seek = Slider(w.node.querySelector('[data-slider="seek"]'), 0,
      v => Mu.scrub(v), { done: v => Mu.seekTo(v) });
    Slider(w.node.querySelector('[data-slider="mvol"]'), SYS.volume, v => { SYS.volume = v; Bus.emit('volume', v); MenuBar.paintStatus(); });
    Mu.render(w); Mu.paintBar();
  },
  onClose(w) { if (Mu.w === w) { Mu.w = null; Mu.stopAll(); } }
};

const Mu = {
  w: null, i: 0, pos: 0, playing: false, seek: null,
  cur() { return SONGS[this.i]; },
  render(w) {
    w = w || this.w; if (!w) return;
    const st = w.st;
    $$('[data-mv]', w.node).forEach(b => b.classList.toggle('on', b.dataset.mv === st.view));
    w.node.querySelector('[data-mtitle]').textContent = st.q ? `Search: ${st.q}` : st.view;
    const body = w.node.querySelector('[data-mbody]');
    /* A live query outranks the sidebar, the way typing in Music jumps to results. */
    if (st.q) {
      const hits = SONGS.map((s, i) => [s, i]).filter(([s]) =>
        (s.t + ' ' + s.a + ' ' + ALBUMS[s.al].t).toLowerCase().includes(st.q));
      w.node.querySelector('[data-mcount]').textContent = `${hits.length} result${hits.length === 1 ? '' : 's'}`;
      body.innerHTML = hits.length ? `<div class="mu-songs scroll">${hits.map(([s, i], k) => `
        <div class="mu-song${i === this.i ? ' on' : ''}" data-si="${i}">
          <span class="n">${k + 1}</span><span class="cv">${albumArt(s.al)}</span>
          <span class="ti"><b>${esc(s.t)}</b><span>${esc(s.a)} — ${esc(ALBUMS[s.al].t)}</span></span>
          <span class="du">${mmss(s.d)}</span></div>`).join('')}</div>`
        : `<div style="flex:1;display:grid;place-items:center;color:var(--txt-3);font-size:13px">No results for “${esc(st.q)}”</div>`;
      return;
    }
    if (st.view === 'Songs' || st.view.startsWith('Focus') || st.view === 'Late Night' || st.view === 'Shipping Music') {
      w.node.querySelector('[data-mcount]').textContent = `${SONGS.length} songs · ${mmss(SONGS.reduce((a, s) => a + s.d, 0))}`;
      body.innerHTML = `<div class="mu-songs scroll">${SONGS.map((s, i) => `
        <div class="mu-song${i === this.i ? ' on' : ''}" data-si="${i}">
          <span class="n">${i + 1}</span><span class="cv">${albumArt(s.al)}</span>
          <span class="ti"><b>${esc(s.t)}</b><span>${esc(s.a)} — ${esc(ALBUMS[s.al].t)}</span></span>
          <span class="du">${mmss(s.d)}</span></div>`).join('')}</div>`;
    } else if (st.view === 'Artists') {
      const artists = [...new Set(ALBUMS.map(a => a.a))];
      w.node.querySelector('[data-mcount]').textContent = `${artists.length} artists`;
      body.innerHTML = `<div class="mu-grid scroll">${artists.map((a, i) => `
        <div class="alb" data-al="${ALBUMS.findIndex(x => x.a === a)}"><div class="cv" style="border-radius:50%">${albumArt(i + 2)}
          <span class="pl">${ic('g-play')}</span></div><b>${esc(a)}</b><span>Artist</span></div>`).join('')}</div>`;
    } else {
      w.node.querySelector('[data-mcount]').textContent = `${ALBUMS.length} albums`;
      body.innerHTML = `<div class="mu-grid scroll">${ALBUMS.map((a, i) => `
        <div class="alb${this.cur().al === i ? ' on' : ''}" data-al="${i}"><div class="cv">${albumArt(i)}
          <span class="pl">${ic('g-play')}</span></div><b>${esc(a.t)}</b><span>${esc(a.a)} · ${a.y}</span></div>`).join('')}</div>`;
    }
  },
  paintBar() {
    const w = this.w; if (!w) return;
    const s = this.cur();
    w.node.querySelector('[data-npcv]').innerHTML = albumArt(s.al);
    w.node.querySelector('[data-npt]').textContent = s.t;
    w.node.querySelector('[data-npa]').textContent = `${s.a} — ${ALBUMS[s.al].t}`;
    w.node.querySelector('[data-cur]').textContent = mmss(this.pos);
    w.node.querySelector('[data-dur]').textContent = '-' + mmss(Math.max(0, s.d - this.pos));
    w.node.querySelector('[data-c="play"]').innerHTML = ic(this.playing ? 'g-pause' : 'g-play');
    if (this.seek && !this.scrubbing) this.seek.set(this.pos / s.d);
  },
  toggle() {
    if (!this.w) return WM.open('music');
    this.playing = !this.playing;
    if (this.playing) Synth.start(this.i, this.pos); else { this.pos = Synth.pos() ?? this.pos; Synth.stop(); }
    this.paintBar(); this.render();
  },
  play(i, from = 0) {
    this.i = clamp(i, 0, SONGS.length - 1);
    this.pos = from;
    this.playing = true;
    Synth.start(this.i, from);
    this.render(); this.paintBar();
  },
  playAlbum(al) { const i = SONGS.findIndex(s => s.al === al); this.play(i < 0 ? 0 : i); },
  skip(d) { this.play((this.i + d + SONGS.length) % SONGS.length); },
  scrub(frac) { this.scrubbing = true; this.pos = clamp(frac, 0, .999) * this.cur().d; this.paintBar(); },
  /** On release the piece picks up from the nearest bar to where you dropped it. */
  seekTo(frac) {
    const at = clamp(frac, 0, .999) * this.cur().d;
    this.scrubbing = false;
    this.pos = at;
    if (this.playing) Synth.start(this.i, at);
    this.paintBar();
  },
  stopAll() { this.playing = false; Synth.stop(); },
};
/* The transport follows the audio clock while sound is playing, and falls back to
   wall-clock stepping only if the browser gave us no AudioContext at all. */
setInterval(() => {
  if (!Mu.playing || !Mu.w) return;
  const p = Synth.pos();
  Mu.pos = p == null ? Mu.pos + 1 : p;
  if (Mu.pos >= Mu.cur().d) Mu.skip(1); else Mu.paintBar();
}, 1000);

/* ============================================================================
   19 · SYSTEM SETTINGS
   ========================================================================== */
const ST_SECTIONS = [
  { id: 'wifi', name: 'Wi‑Fi', icon: 'g-wifi', bg: '#0a84ff' },
  { id: 'bluetooth', name: 'Bluetooth', icon: 'g-bt', bg: '#0a84ff' },
  { id: 'network', name: 'Network', icon: 'g-network', bg: '#0a84ff' },
  { sep: true },
  { id: 'general', name: 'General', icon: 'g-gear', bg: '#8e8e93' },
  { id: 'appearance', name: 'Appearance', icon: 'g-display', bg: '#1d1d1f' },
  { id: 'wallpaper', name: 'Wallpaper', icon: 'g-globe', bg: '#30d158' },
  { id: 'dock', name: 'Desktop & Dock', icon: 'g-slider-h', bg: '#1d1d1f' },
  { id: 'displays', name: 'Displays', icon: 'g-display', bg: '#0a84ff' },
  { id: 'sound', name: 'Sound', icon: 'g-vol-hi', bg: '#ff375f' },
  { id: 'battery', name: 'Battery', icon: 'g-batt-glyph', bg: '#30d158' },
  { sep: true },
  { id: 'privacy', name: 'Privacy & Security', icon: 'g-hand', bg: '#0a84ff' },
];

APPS.settings = {
  name: 'System Settings', icon: 'app-settings', w: 800, h: 600, minW: 620, minH: 420,
  menus: () => stdMenus('settings'),
  mount(w, o) {
    w.st = { sec: o.section || 'appearance' };
    return `<div class="wb"><div class="st">
      <div class="st-side" data-drag>
        <div style="display:flex;align-items:center;height:38px;padding:0 12px"><div data-tl></div></div>
        <div class="top"><div class="sfield" data-nodrag><span>${ic('g-search')}</span><input placeholder="Search" data-stq></div></div>
        <div class="st-scroll">
          <div class="st-row" style="height:44px;margin-bottom:8px">
            <span class="bg" style="width:34px;height:34px;border-radius:50%;background-image:url('${AVATAR}');background-size:cover;background-position:center"></span>
            <span style="display:flex;flex-direction:column"><b style="font-size:13px;font-weight:600">Ashhh</b><span style="font-size:11px;color:var(--txt-2)">Apple Account</span></span>
          </div>
          ${ST_SECTIONS.map(s => s.sep ? `<div class="msep" style="margin:8px 8px"></div>` :
      `<div class="st-row" data-sec="${s.id}"><span class="bg" style="background:${s.bg}">${ic(s.icon)}</span><span>${esc(s.name)}</span></div>`).join('')}
        </div>
      </div>
      <div class="st-main scroll">
        <div class="st-head" data-drag><h2 data-sttitle></h2></div>
        <div class="st-body" data-stbody></div>
      </div>
    </div></div>`;
  },
  ready(w) {
    Set2.w = w;
    on(w.node, 'click', '[data-sec]', (e, t) => { w.st.sec = t.dataset.sec; Set2.render(w); });
    Set2.render(w);
    Bus.on('theme', () => { if (w.st.sec === 'appearance' && !w.dead) Set2.render(w); });
  },
  onClose(w) { if (Set2.w === w) Set2.w = null; }
};

const Set2 = {
  w: null,
  render(w) {
    w = w || this.w; if (!w) return;
    const sec = ST_SECTIONS.find(s => s.id === w.st.sec) || ST_SECTIONS[4];
    $$('[data-sec]', w.node).forEach(b => b.classList.toggle('on', b.dataset.sec === sec.id));
    w.node.querySelector('[data-sttitle]').textContent = sec.name;
    const body = w.node.querySelector('[data-stbody]');
    body.innerHTML = (this.panes[sec.id] || this.panes._)(sec);
    body.querySelectorAll('.st-row svg,.bg svg').forEach(s => s.style.cssText = 'width:13px;height:13px');
    this.wire(w, body, sec.id);
  },

  wire(w, body, id) {
    on(body, 'click', '.sw', (e, t) => {
      t.classList.toggle('on');
      const k = t.dataset.k, on2 = t.classList.contains('on');
      if (k === 'wifi') { SYS.wifi = on2; MenuBar.paintStatus(); }
      if (k === 'bt') { SYS.bluetooth = on2; MenuBar.paintStatus(); }
      if (k === 'mag') { SYS.dockMagOn = on2; Dock.measure(); }
      if (k === 'dark') Theme.set(on2 ? 'dark' : 'light');
    });
    on(body, 'click', '[data-appear]', (e, t) => {
      Theme.setAppearance(t.dataset.appear);
      this.render(w);
    });
    on(body, 'click', '[data-accent]', (e, t) => { Theme.setAccent(t.dataset.accent); this.render(w); });
    on(body, 'click', '[data-hilite]', (e, t) => {
      SYS.highlight = t.dataset.hilite;
      const a = Theme.ACCENTS[SYS.highlight];
      const s = document.documentElement.style;
      /* 'accent' means "whatever the accent is", so the override comes back off. */
      if (!a || !a.hex) s.removeProperty('--sel');
      else s.setProperty('--sel', (SYS.theme === 'dark' ? (a.dark || a.hex) : a.hex));
      this.render(w);
    });
    /* The two popup buttons in this pane are real menus with real consequences. */
    on(body, 'click', '[data-pick]', (e, t) => {
      const k = t.dataset.pick;
      const opts = k === 'sidebarIcons'
        ? [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]
        : [['auto', 'Automatically'], ['scrolling', 'When scrolling'], ['always', 'Always']];
      menuUnder(t, opts.map(([id, label]) => ({
        id, label, checked: SYS[k] === id,
        run: () => { SYS[k] = id; Set2.applyChrome(); this.render(w); },
      })));
    });
    on(body, 'click', '[data-wp]', (e, t) => {
      Wall.set(t.dataset.wp);
      $$('[data-wp]', body).forEach(x => x.classList.toggle('on', x === t));
    });
    on(body, 'click', '[data-net]', (e, t) => { SYS.wifiName = t.dataset.net; MenuBar.paintStatus(); this.render(w); });
    const dockSize = body.querySelector('[data-slider="dsize"]');
    if (dockSize) Slider(dockSize, (SYS.dockSize - 34) / 44, v => { SYS.dockSize = Math.round(34 + v * 44); Dock.measure(); Set2.dockPreview(body); });
    const dockMag = body.querySelector('[data-slider="dmag"]');
    if (dockMag) Slider(dockMag, (SYS.dockMag - 1) / 0.9, v => { SYS.dockMag = 1 + v * 0.9; SYS.dockMagOn = true; const sw = body.querySelector('[data-k="mag"]'); if (sw) sw.classList.add('on'); });
    const vol = body.querySelector('[data-slider="svol"]');
    if (vol) Slider(vol, SYS.volume, v => { SYS.volume = v; SYS.muted = v === 0; Bus.emit('volume', v); MenuBar.paintStatus(); });
    const bri = body.querySelector('[data-slider="sbri"]');
    if (bri) Slider(bri, Screen.brightness, v => Screen.setBrightness(v));
  },
  dockPreview(body) {
    const p = body.querySelector('[data-dockprev]');
    if (p) p.style.setProperty('--s', SYS.dockSize + 'px');
  },
  /* Sidebar icon size and scroll-bar policy are global, so they ride on the root as
     data attributes rather than being re-applied window by window. */
  applyChrome() {
    const d = document.documentElement.dataset;
    d.sbIcons = SYS.sidebarIcons;
    d.bars = SYS.scrollbars;
  },

  group: (label, rows) => `${label ? `<div class="st-label">${label}</div>` : ''}<div class="st-group">${rows}</div>`,
  row: (lb, rt, hint) => `<div class="st-item"><div class="lb">${lb}${hint ? `<div class="hint">${hint}</div>` : ''}</div><div class="rt">${rt}</div></div>`,
  sw: (k, on) => `<div class="sw${on ? ' on' : ''}" data-k="${k}"></div>`,
  slider: (k, extra = '') => `<div class="sl" data-slider="${k}" style="max-width:220px;${extra}"><div class="trk"><div class="fil"></div></div><div class="kn"></div></div>`,

  panes: {
    appearance(s) {
      const G = Set2.group, R = Set2.row;
      const swatch = (mode) => {
        const light = mode !== 'dark';
        return `<div class="sw2" style="background:${light ? 'linear-gradient(160deg,#a8d8ea,#3a91b8)' : 'linear-gradient(160deg,#243b55,#0d1b2a)'}">
          <div class="bar" style="background:${light ? 'rgba(255,255,255,.62)' : 'rgba(30,30,32,.7)'}"></div>
          <div class="wn" style="background:${light ? '#fff' : '#2c2c2e'};box-shadow:0 2px 6px rgba(0,0,0,.25)"></div>
          <div class="dk" style="background:${light ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.16)'}"></div></div>`;
      };
      const A = Theme.ACCENTS;
      const dot = (key) => {
        const a = A[key], on = SYS.accent === key;
        const bg = key === 'multi'
          ? 'conic-gradient(from 210deg,#ff375f,#ff9f0a,#ffd60a,#30d158,#0a84ff,#bf5af2,#ff375f)'
          : (SYS.theme === 'dark' ? (a.dark || a.hex) : a.hex);
        return `<span class="acc${on ? ' on' : ''}" data-accent="${key}" title="${esc(a.name)}" style="background:${bg}"></span>`;
      };
      const hi = (key) => {
        const a = A[key], on = SYS.highlight === key;
        const bg = key === 'accent' ? 'var(--blue)' : (SYS.theme === 'dark' ? (a.dark || a.hex) : a.hex);
        return `<span class="acc${on ? ' on' : ''}" data-hilite="${key}" title="${key === 'accent' ? 'Accent Colour' : esc(a.name)}" style="background:${bg}"></span>`;
      };
      const SIZES = { small: 'Small', medium: 'Medium', large: 'Large' };
      const BARS = { auto: 'Automatically', scrolling: 'When scrolling', always: 'Always' };
      return G('', `<div class="st-appear">
          <div class="opt${SYS.appearance === 'light' ? ' on' : ''}" data-appear="light">${swatch('light')}<span>Light</span></div>
          <div class="opt${SYS.appearance === 'dark' ? ' on' : ''}" data-appear="dark">${swatch('dark')}<span>Dark</span></div>
          <div class="opt${SYS.appearance === 'auto' ? ' on' : ''}" data-appear="auto"><div class="sw2" style="background:linear-gradient(110deg,#a8d8ea 0 50%,#243b55 50% 100%)">
            <div class="bar" style="background:linear-gradient(110deg,rgba(255,255,255,.62) 0 50%,rgba(30,30,32,.7) 50%)"></div>
            <div class="wn" style="background:linear-gradient(110deg,#fff 0 50%,#2c2c2e 50%)"></div></div><span>Auto</span></div>
        </div>`) +
        /* Multicolour, Blue, Purple, Pink, Red, Orange, Yellow, Green, Graphite —
           the order System Settings actually lists them in. */
        G('', R('Accent colour', `<div class="accs">${Object.keys(A).map(dot).join('')}</div>`) +
          R('Highlight colour', `<div class="accs">${['accent', ...Object.keys(A).slice(1)].map(hi).join('')}</div>`) +
          R('Sidebar icon size', `<button class="btn" data-pick="sidebarIcons">${SIZES[SYS.sidebarIcons]} ${ic('g-chev-d')}</button>`) +
          R('Allow wallpaper tinting', Set2.sw('tint', true)) +
          R('Show scroll bars', `<button class="btn" data-pick="scrollbars">${BARS[SYS.scrollbars]} ${ic('g-chev-d')}</button>`)) +
        `<div class="hint" style="margin:-8px 0 0 4px">${SYS.appearance === 'auto'
          ? 'Auto switches between light and dark as the day goes by.'
          : 'Accent colour applies to buttons, controls and selections.'}</div>`;
    },
    wallpaper() {
      return Set2.group('Desktop picture', `<div class="wp-grid">${Object.entries(WALLPAPERS).map(([k, v]) =>
        `<div class="wp${SYS.wallpaper === k ? ' on' : ''}" data-wp="${k}" style="background-image:url('${v.url.replace('w=3200', 'w=420')}')"><span>${esc(v.name)}</span></div>`).join('')}</div>`) +
        Set2.group('', Set2.row('Show on all Spaces', Set2.sw('spaces', true)) + Set2.row('Add wallpaper to Photos', Set2.sw('addp', false)));
    },
    dock() {
      const G = Set2.group, R = Set2.row;
      return G('Dock', R('Size', `<span style="font-size:11px;color:var(--txt-2)">Small</span>${Set2.slider('dsize')}<span style="font-size:11px;color:var(--txt-2)">Large</span>`) +
        R('Magnification', `<span style="font-size:11px;color:var(--txt-2)">Off</span>${Set2.slider('dmag')}<span style="font-size:11px;color:var(--txt-2)">Large</span>`) +
        R('Enable magnification', Set2.sw('mag', SYS.dockMagOn)) +
        R('Position on screen', `<button class="btn">Bottom ${ic('g-chev-d')}</button>`) +
        R('Minimise using', `<button class="btn">Genie Effect ${ic('g-chev-d')}</button>`) +
        R('Animate opening apps', Set2.sw('anim', true)) +
        R('Show indicators for open applications', Set2.sw('ind', true))) +
        G('Desktop & Stage Manager', R('Show items', `<span style="font-size:12px;color:var(--txt-2)">On Desktop</span>${Set2.sw('items', true)}`) +
          R('Click wallpaper to reveal desktop', `<button class="btn">Only in Stage Manager ${ic('g-chev-d')}</button>`)) +
        G('Windows', R('Tiled windows have margins', Set2.sw('marg', true)) +
          R('Drag windows to screen edges to tile', Set2.sw('tile', true)));
    },
    sound() {
      const G = Set2.group, R = Set2.row;
      return G('Output & Input', R('Output volume', `${ic('g-vol-lo')}${Set2.slider('svol')}${ic('g-vol-hi')}`) +
        R('Mute', Set2.sw('mute', SYS.muted)) +
        R('Show Sound in menu bar', `<button class="btn">Always ${ic('g-chev-d')}</button>`)) +
        G('Sound Effects', R('Alert sound', `<button class="btn">Boop ${ic('g-chev-d')}</button>`) +
          R('Play sound on startup', Set2.sw('boot', true)) +
          R('Play user-interface sound effects', Set2.sw('ui', true))) +
        G('Output device', `<div class="st-item"><div class="lb" style="min-width:0;flex:1">MacBook Pro Speakers<div class="hint">Built‑in · 6 speakers</div></div><div class="rt" style="color:var(--blue)">${ic('g-check')}</div></div>
        <div class="st-item"><div class="lb" style="min-width:0;flex:1">AirPods Pro<div class="hint">Bluetooth</div></div></div>`);
    },
    wifi() {
      const G = Set2.group, R = Set2.row;
      return G('', R('Wi‑Fi', Set2.sw('wifi', SYS.wifi))) +
        G('Known Network', `<div class="st-item"><div class="lb" style="min-width:0;flex:1">${esc(SYS.wifiName)}<div class="hint">Connected · 1.2 Gbps</div></div><div class="rt">${ic('g-lock')}${wifiBars(3)}<button class="btn">Details…</button></div></div>`) +
        G('Other Networks', NETWORKS.filter(n => n.n !== SYS.wifiName).map(n =>
          `<div class="st-item" data-net="${esc(n.n)}"><div class="lb" style="min-width:0;flex:1">${esc(n.n)}</div><div class="rt">${n.lock ? ic('g-lock') : ''}${wifiBars(n.s)}</div></div>`).join(''));
    },
    bluetooth() {
      const G = Set2.group, R = Set2.row;
      return G('', R('Bluetooth', Set2.sw('bt', SYS.bluetooth))) +
        G('My Devices', [['AirPods Pro', 'Connected'], ['Magic Keyboard', 'Connected'], ['Magic Trackpad', 'Connected · 92%'], ['Sony WH‑1000XM5', 'Not Connected']].map(([n, s]) =>
          `<div class="st-item"><div class="lb" style="min-width:0;flex:1">${n}<div class="hint">${s}</div></div><div class="rt"><button class="btn">${s === 'Not Connected' ? 'Connect' : 'Disconnect'}</button></div></div>`).join(''));
    },
    network() {
      const G = Set2.group;
      return G('', [['Wi‑Fi', SYS.wifiName, '#30d158'], ['Thunderbolt Bridge', 'Not Connected', '#8e8e93'], ['VPN — Home', 'Not Connected', '#8e8e93']].map(([n, s, c]) =>
        `<div class="st-item"><span style="width:9px;height:9px;border-radius:50%;background:${c};flex:none"></span><div class="lb" style="min-width:0;flex:1">${n}<div class="hint">${s}</div></div><div class="rt">${ic('g-chev-r')}</div></div>`).join('')) +
        G('', Set2.row('Firewall', `<span style="font-size:12px;color:var(--txt-2)">On</span>${ic('g-chev-r')}`));
    },
    general() {
      const G = Set2.group, R = Set2.row;
      return G('', [['About', 'g-gear'], ['Software Update', 'g-download'], ['Storage', 'g-hd'], ['AirDrop & Handoff', 'g-airdrop'], ['Login Items & Extensions', 'g-apps'], ['Language & Region', 'g-globe'], ['Date & Time', 'g-clock-a'], ['Sharing', 'g-share'], ['Time Machine', 'g-clock-a']]
        .map(([n, i]) => `<div class="st-item"><span class="bg" style="width:20px;height:20px;border-radius:5px;background:#8e8e93;color:#fff;display:grid;place-items:center">${ic(i)}</span><div class="lb" style="min-width:0;flex:1">${n}</div><div class="rt">${ic('g-chev-r')}</div></div>`).join('')) +
        G('This Mac', `<div class="st-item"><div class="lb" style="min-width:0;flex:1">MacBook Pro 16″ · Apple M4 Max · 128 GB<div class="hint">macOS Tahoe 26.0 (26A5240b) — up to date</div></div><div class="rt"><button class="btn pri">More Info…</button></div></div>`);
    },
    displays() {
      const G = Set2.group, R = Set2.row;
      return G('Built‑in Liquid Retina XDR Display', R('Brightness', `${ic('g-sun')}${Set2.slider('sbri')}`) +
        R('Automatically adjust brightness', Set2.sw('autob', true)) +
        R('True Tone', Set2.sw('tt', true)) +
        R('Refresh rate', `<button class="btn">ProMotion (120 Hz) ${ic('g-chev-d')}</button>`) +
        R('Resolution', `<button class="btn">${innerWidth} × ${innerHeight} (Default) ${ic('g-chev-d')}</button>`)) +
        G('Colour', R('Colour profile', `<button class="btn">Apple XDR Display (P3‑1600 nits) ${ic('g-chev-d')}</button>`) +
          R('Night Shift', `<span style="font-size:12px;color:var(--txt-2)">Off</span>${ic('g-chev-r')}`));
    },
    battery() {
      const G = Set2.group, R = Set2.row;
      const mins = Math.round(SYS.battery / 100 * 11.4 * 60);
      return G('', `<div class="st-item"><div class="lb" style="min-width:0;flex:1"><b style="font-size:22px;font-weight:500">${SYS.battery}%</b>
        <div class="hint">${SYS.charging ? 'Charging' : `${Math.floor(mins / 60)} hr ${mins % 60} min remaining`}</div></div>
        <div class="rt" style="transform:scale(1.6);transform-origin:right center">${battSVG(SYS.battery, SYS.charging)}</div></div>`) +
        G('Battery Health', R('Condition', `<span style="font-size:12px;color:var(--txt-2)">Normal</span>${ic('g-chev-r')}`) +
          R('Maximum capacity', `<span style="font-size:12px;color:var(--txt-2)">98%</span>`) +
          R('Cycle count', `<span style="font-size:12px;color:var(--txt-2)">142</span>`)) +
        G('Options', R('Low Power Mode', `<button class="btn">Never ${ic('g-chev-d')}</button>`) +
          R('Optimised battery charging', Set2.sw('obc', true)));
    },
    privacy() {
      const G = Set2.group;
      return G('', [['Location Services', 'g-network', '#0a84ff'], ['Contacts', 'g-hand', '#ff9f0a'], ['Calendars', 'g-clock-a', '#ff375f'], ['Photos', 'g-gallery', '#bf5af2'], ['Camera', 'g-display', '#8e8e93'], ['Microphone', 'g-vol-hi', '#ff375f'], ['Screen & System Audio Recording', 'g-display', '#8e8e93'], ['Full Disk Access', 'g-hd', '#8e8e93'], ['FileVault', 'g-lock', '#30d158']]
        .map(([n, i, c]) => `<div class="st-item"><span class="bg" style="width:20px;height:20px;border-radius:5px;background:${c};color:#fff;display:grid;place-items:center">${ic(i)}</span><div class="lb" style="min-width:0;flex:1">${n}</div><div class="rt">${ic('g-chev-r')}</div></div>`).join('')) +
        G('', Set2.row('Allow applications from', `<button class="btn">App Store & known developers ${ic('g-chev-d')}</button>`));
    },
    _(s) { return Set2.group('', Set2.row(s.name, `<span style="font-size:12px;color:var(--txt-2)">Nothing to configure</span>`)); }
  }
};
/* ============================================================================
   20 · GENERATED "PHOTOS"  (used by Photos, Mail, TV, Books…)
   ========================================================================== */
const PAL = [
  ['#0f2b4a', '#2d7ea8', '#9fdcef', '#ffd9a0'], ['#1b1030', '#5b2a7a', '#c65fa0', '#ffd1a9'],
  ['#0a2f22', '#2f7a4f', '#98d17f', '#f3f0c8'], ['#2b1408', '#8a4a1e', '#e0913f', '#ffe1b0'],
  ['#101418', '#3a4652', '#8b9aa8', '#dfe6ec'], ['#25082a', '#7a1c58', '#e0417f', '#ffd0e0'],
  ['#04202b', '#0a6f7a', '#57ccbf', '#e8fbf5'], ['#301a04', '#a05a12', '#f0a83c', '#fff0cf'],
];
function photoArt(i, kindOverride) {
  /* One 32-bit scramble drives palette, composition and the small variations, so
     a wall of forty-eight of these doesn't visibly repeat every eighth cell. */
  let h = Math.imul(i + 1, 2654435761) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  const t = (sh, n) => ((h >>> sh) & 255) / 255 * n;      // jitter tap in 0..n
  const p = PAL[(h >>> 3) % PAL.length];
  const kind = kindOverride ?? (h >>> 11) % 5;
  const id = 'ph' + i + '_' + (kindOverride ?? 'x');
  const sun = (x, y, r, o = .9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p[3]}" opacity="${o}"/>`;
  const body = [
    /* ridgeline */
    `<rect width="100" height="100" fill="url(#${id})"/>${sun(58 + t(2, 30), 20 + t(5, 14), 8 + t(9, 5))}
     <path d="M0 ${70 + t(6, 8)} ${20 + t(7, 12)} ${46 + t(4, 10)}l18 16 20-24 38 30v34H0z" fill="${p[0]}" opacity=".55"/>
     <path d="M0 84 ${26 + t(8, 12)} ${62 + t(3, 10)}l22 14 26-16 22 14v30H0z" fill="${p[0]}"/>`,
    /* rolling hills */
    `<rect width="100" height="100" fill="url(#${id})"/>${sun(18 + t(4, 26), 18 + t(6, 12), 7 + t(2, 4), .85)}
     <path d="M0 ${58 + t(5, 8)}c16 0 16-10 32-10s16 10 32 10 16-10 36-10v50H0z" fill="${p[0]}" opacity=".45"/>
     <path d="M0 ${72 + t(7, 6)}c16 0 16-8 32-8s16 8 32 8 16-8 36-8v40H0z" fill="${p[0]}"/>`,
    /* bokeh */
    `<rect width="100" height="100" fill="${p[0]}"/>
     <circle cx="${42 + t(3, 16)}" cy="${42 + t(6, 16)}" r="${28 + t(9, 10)}" fill="url(#${id})" opacity=".92"/>
     <circle cx="${42 + t(3, 16)}" cy="${42 + t(6, 16)}" r="${14 + t(4, 8)}" fill="${p[3]}" opacity=".3"/>
     ${sun(42 + t(3, 16), 42 + t(6, 16), 6 + t(8, 4))}`,
    /* skyline */
    `<rect width="100" height="100" fill="url(#${id})"/>
     <g fill="${p[0]}" opacity=".85">${[...Array(7)].map((_, k) =>
      `<rect x="${2 + k * 14.6}" y="${100 - (22 + t(k * 3 + 1, 46))}" width="${9 + t(k * 2, 4)}" height="${22 + t(k * 3 + 1, 46)}"/>`).join('')}</g>
     ${sun(70 + t(5, 22), 16 + t(7, 12), 7 + t(2, 4))}`,
    /* still water, with the sun broken up on the surface */
    `<rect width="100" height="100" fill="url(#${id})"/>
     ${sun(30 + t(4, 40), 26 + t(6, 10), 8 + t(3, 4))}
     <rect y="${58 + t(8, 8)}" width="100" height="50" fill="${p[1]}" opacity=".55"/>
     <g fill="${p[3]}" opacity=".5">${[...Array(5)].map((_, k) =>
      `<rect x="${24 + t(4, 40) - (5 + k * 1.6)}" y="${64 + t(8, 8) + k * 6}" width="${12 + k * 4}" height="2.4" rx="1.2"/>`).join('')}</g>
     <path d="M0 ${74 + t(9, 10)}h100v40H0z" fill="${p[0]}" opacity=".8"/>`,
  ][kind];
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%"><defs>` +
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[1]}"/>` +
    `<stop offset=".55" stop-color="${p[2]}"/><stop offset="1" stop-color="${p[3]}"/></linearGradient></defs>${body}</svg>`;
}

/* ============================================================================
   21 · MAIL
   ========================================================================== */
const MAILS = [
  { f: 'Figma', s: 'Daniel left 3 comments on Desktop v4', p: 'Tray blur reads heavy at 62px — can we try 44 and put them side by side?', t: '4:21 PM', c: '#a259ff', unread: true, flag: true },
  { f: 'Vercel', s: 'Your deployment is live', p: 'desktop-web is ready. Build finished in 0s — there was nothing to build.', t: '3:58 PM', c: '#1d1d1f', unread: true },
  { f: 'Linear', s: 'ENG-412 moved to In Review', p: 'Shadow repaint during minimise: 12 dropped frames down to 0. Needs your sign-off.', t: '1:12 PM', c: '#5e6ad2' },
  { f: 'GitHub', s: '[workspace/desktop] PR #142 review requested', p: 'Column view: preview pane sizing. 4 files changed, +218 −31.', t: '11:04 AM', c: '#24292f' },
  { f: 'Anna Haro', s: 'Re: dock easing', p: 'The cosine falloff is right, but shorten the settle. Under 300ms or it reads as lag.', t: 'Yesterday', c: '#bf5af2' },
  { f: 'Apple Developer', s: 'macOS Tahoe 26 beta 4 is available', p: 'Liquid Glass refinements, Spotlight actions, and 42 resolved issues.', t: 'Yesterday', c: '#1d1d1f' },
  { f: 'Mom', s: 'call me when free', p: 'and eat something that is not coffee', t: 'Saturday', c: '#ff375f', flag: true },
];
APPS.mail = {
  name: 'Mail', icon: 'app-mail', w: 1020, h: 640, minW: 620, minH: 380,
  menus: () => stdMenus('mail'),
  mount(w) {
    w.st = { sel: 0, box: 'Inbox' };
    const boxes = [['Inbox', 'g-download', 2], ['VIP', 'g-star', ''], ['Flagged', 'g-tag', 2], ['Drafts', 'g-title', 1], ['Sent', 'g-share', ''], ['Junk', 'g-trash-glyph', ''], ['Trash', 'g-trash-glyph', '']];
    return `<div class="wb">
      <div class="sbar" data-drag style="width:196px"><div class="sb-top"><div data-tl></div></div>
        <div class="grp"><div class="gh">Mailboxes</div>
        ${boxes.map(([n, i, c]) => `<div class="si" data-box="${n}">${ic(i === 'g-trash-glyph' ? 'g-tag' : i, 'ico')}<span class="nm">${n}</span>${c ? `<span class="tail">${c}</span>` : ''}</div>`).join('')}
        </div>
        <div class="grp"><div class="gh">Smart Mailboxes</div>
          <div class="si">${ic('g-star', 'ico')}<span class="nm">Today</span></div>
          <div class="si">${ic('g-tag', 'ico')}<span class="nm">Attachments</span></div></div>
      </div>
      <div class="fx">
        <div class="fx-tb" data-drag>
          <button class="tbtn" data-nodrag data-mcompose title="New Message">${ic('g-plus')}</button>
          <button class="tbtn" data-nodrag data-mflag title="Flag">${ic('g-tag')}</button>
          <button class="tbtn" data-nodrag data-mshare title="Share">${ic('g-share')}</button>
          <div class="fx-title" data-mbtitle>Inbox</div>
          <div class="grow" style="flex:1"></div>
          <div class="sfield" data-nodrag style="width:170px"><span>${ic('g-search')}</span><input placeholder="Search"></div>
        </div>
        <div class="wb" style="flex:1;min-height:0">
          <div class="msg-list scroll" data-mlist style="width:344px"></div>
          <div class="pv scroll" data-mread style="place-items:start stretch;padding:0;background:var(--win)"></div>
        </div>
      </div></div>`;
  },
  ready(w) {
    const render = () => {
      w.node.querySelector('[data-mbtitle]').textContent = w.st.box;
      const list = w.st.box === 'Flagged' ? MAILS.filter(m => m.flag) : MAILS;
      $$('[data-box]', w.node).forEach(b => b.classList.toggle('on', b.dataset.box === w.st.box));
      w.node.querySelector('[data-mlist]').innerHTML = list.map((m, i) => `
        <div class="msg-c${i === w.st.sel ? ' on' : ''}" data-mi="${i}">
          <span class="av" style="background:${m.c}">${esc(m.f[0])}</span>
          <span class="bd"><b>${m.unread ? '<span style="color:var(--blue)">●</span> ' : ''}${esc(m.f)}</b>
            <b style="font-weight:500;font-size:12px">${esc(m.s)}</b><p>${esc(m.p)}</p></span>
          <span class="tm">${esc(m.t)}</span></div>`).join('');
      const m = list[w.st.sel] || list[0];
      w.node.querySelector('[data-mread]').innerHTML = m ? `<div style="padding:24px 30px;max-width:640px">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:18px">
          <span class="av" style="width:42px;height:42px;border-radius:50%;background:${m.c};display:grid;place-items:center;color:#fff;font-weight:600;font-size:16px">${esc(m.f[0])}</span>
          <div><div style="font-size:14px;font-weight:600">${esc(m.f)}</div><div style="font-size:11.5px;color:var(--txt-2)">To: Ashhh · ${esc(m.t)}</div></div></div>
        <h2 style="margin:0 0 14px;font-size:19px;font-weight:600;letter-spacing:-.02em">${esc(m.s)}</h2>
        <p style="font-size:13.5px;line-height:1.6;color:var(--txt)">${esc(m.p)}</p>
        <p style="font-size:13.5px;line-height:1.6;color:var(--txt-2)">Sent from a Mac that only exists as markup.</p>
      </div>` : '';
    };
    on(w.node, 'click', '[data-mi]', (e, t) => { w.st.sel = +t.dataset.mi; MAILS[w.st.sel].unread = false; render(); });
    on(w.node, 'click', '[data-box]', (e, t) => { w.st.box = t.dataset.box; w.st.sel = 0; render(); });
    on(w.node, 'click', '[data-mcompose]', () => Mail.compose());
    on(w.node, 'click', '[data-mflag]', () => {
      const list = w.st.box === 'Flagged' ? MAILS.filter(m => m.flag) : MAILS;
      const m = list[w.st.sel] || list[0];
      if (!m) return;
      m.flag = !m.flag;
      Toast(m.flag ? 'Flagged' : 'Flag removed');
      render();
    });
    on(w.node, 'click', '[data-mshare]', (e, t) => {
      const list = w.st.box === 'Flagged' ? MAILS.filter(m => m.flag) : MAILS;
      const m = list[w.st.sel] || list[0];
      menuUnder(t, [
        { id: 'r', label: 'Reply', run: () => Mail.compose('Re: ' + (m ? m.s : ''), m ? m.f : '') },
        { id: 'f', label: 'Forward', run: () => Mail.compose('Fwd: ' + (m ? m.s : '')) }, '-',
        { id: 'c', label: 'Copy Link', run: () => Toast('Link copied') },
        { id: 'p', label: 'Print…', run: () => Toast('Sent to printer') }]);
    });
    render();
  }
};

/* A compose sheet, because a mail app whose New Message button only toasts is a
   mail app with a dead button. */
const Mail = {
  compose(subject = '', to = '') {
    const node = el(`<div class="pop" style="padding:0;width:min(600px,84vw);border-radius:12px;overflow:hidden">
      <div class="fx-tb" style="height:46px;padding:0 12px;gap:8px;border-bottom:.5px solid var(--line)">
        <div class="fx-title" style="position:static;flex:1;text-align:left">New Message</div>
        <button class="btn" data-cancel style="height:22px">Cancel</button>
        <button class="btn pri" data-send style="height:22px">Send</button>
      </div>
      <div style="padding:0 14px">
        ${[['To', to], ['Subject', subject]].map(([l, v]) => `<div style="display:flex;align-items:center;gap:8px;height:34px;border-bottom:.5px solid var(--line)">
          <span style="width:54px;font-size:12px;color:var(--txt-2)">${l}:</span>
          <input data-f="${l}" value="${esc(v)}" style="flex:1;border:0;background:none;font-size:13px;outline:none;color:var(--txt)"></div>`).join('')}
      </div>
      <div contenteditable="true" data-body style="min-height:180px;padding:14px;font-size:13.5px;line-height:1.6;outline:none"></div></div>`);
    Pop.open(node, { x: innerWidth / 2 - 300, y: 96, origin: 'top center' });
    setTimeout(() => node.querySelector(subject ? '[data-body]' : '[data-f="To"]').focus(), 60);
    node.querySelector('[data-cancel]').onclick = () => Pop.close();
    node.querySelector('[data-send]').onclick = () => {
      const to = node.querySelector('[data-f="To"]').value.trim();
      Pop.close();
      Toast(to ? 'Message sent to ' + to : 'Message sent');
    };
  },
};

/* ============================================================================
   22 · MESSAGES
   ========================================================================== */
const CHATS = [
  {
    n: 'Kate', c: '#64d2ff', t: '4:28 PM', msgs: [
      ['them', 'lake trip still on for saturday?'], ['them', 'weather says clear all weekend'],
      ['me', 'yes. leaving at 6 so we get the light'], ['them', 'six in the morning is a threat'],
      ['me', 'bring coffee then'], ['them', 'bringing coffee AND a blanket, i know how you drive'],
    ]
  },
  {
    n: 'John', c: '#30d158', t: '2:14 PM', msgs: [
      ['them', 'did the review land'], ['me', 'merged an hour ago'],
      ['them', 'legend. the animation on the sidebar is so smooth now'],
      ['me', 'took four tries to get the easing right'], ['them', 'it shows, in a good way'],
    ]
  },
  {
    n: 'Design Crew', c: '#bf5af2', t: '11:40 AM', group: true, msgs: [
      ['them', 'Daniel: shadows on the unfocused windows are too heavy'],
      ['me', 'fixed — dropped the two outer layers'],
      ['them', 'Daniel: much better, they sit back now'],
      ['them', 'Freda: can we get the same treatment on the sheets?'],
      ['me', 'already in, refresh'], ['them', 'Freda: 🤝'],
    ]
  },
  {
    n: 'David', c: '#ff9f0a', t: '10:02 AM', msgs: [
      ['them', 'are you coming to the thing on friday'], ['me', 'what thing'],
      ['them', 'the thing i told you about twice'], ['me', 'the rooftop one?'],
      ['them', 'yes. 8pm. do not be fashionably late'], ['me', "i'll be unfashionably early"],
    ]
  },
  {
    n: 'Anna', c: '#0a84ff', t: '9:15 AM', msgs: [
      ['them', 'random but your site loads absurdly fast'], ['me', 'no framework, no fonts to wait on'],
      ['them', 'i keep forgetting that is allowed'],
    ]
  },
  {
    n: 'Chris', c: '#ff2d55', t: 'Yesterday', msgs: [
      ['them', 'sending you the playlist for the drive'], ['them', '4 hours, no repeats'],
      ['me', 'if there is a single sad song i am turning around'], ['them', 'no promises'],
    ]
  },
  {
    n: 'Hank', c: '#5e5ce6', t: 'Yesterday', msgs: [
      ['them', 'coffee thursday?'], ['me', 'the place with the bad chairs?'],
      ['them', 'the place with the good espresso and the bad chairs, yes'], ['me', 'deal'],
    ]
  },
  {
    n: 'Daniel', c: '#ffd60a', t: 'Sunday', msgs: [
      ['them', 'sent you the moodboard'], ['me', 'the third row is the one'],
      ['them', 'knew you would say that'],
    ]
  },
  {
    n: 'Freda', c: '#a2845e', t: 'Saturday', msgs: [
      ['them', 'did you get the keys back from the landlord'], ['me', 'picking them up tomorrow'],
      ['them', 'text me when you do'],
    ]
  },
  { n: 'Mom', c: '#ff375f', t: 'Friday', msgs: [['them', 'did you eat'], ['me', 'yes'], ['them', 'coffee is not food'], ['me', 'it has water in it'], ['them', 'call me tonight']] },
];
APPS.messages = {
  name: 'Messages', icon: 'app-messages', w: 900, h: 600, minW: 560, minH: 360,
  menus: () => stdMenus('messages'),
  mount(w) {
    w.st = { sel: 0, chats: CHATS.map(c => ({ ...c, msgs: c.msgs.map(m => m.slice()) })) };
    return `<div class="wb"><div class="msg">
      <div class="msg-list scroll" data-drag style="padding-top:0">
        <div style="display:flex;align-items:center;height:38px;padding:0 4px 0 2px">
          <div data-tl></div><div style="flex:1"></div>
          <button class="tbtn" data-nodrag data-cnew title="New Message">${ic('g-compose')}</button>
        </div>
        <div style="padding:0 2px 8px"><div class="sfield" data-nodrag><span>${ic('g-search')}</span><input placeholder="Search" data-csearch></div></div>
        <div data-clist></div>
      </div>
      <div class="msg-th">
        <div class="msg-hd" data-drag>
          <span class="who" data-cdetails><span class="av sm" data-cav></span><span data-cname></span>${ic('g-chev-r')}</span>
          <div style="flex:1"></div>
          <button class="tbtn" data-nodrag data-cft title="FaceTime">${ic('g-facetime')}</button>
          <button class="tbtn" data-nodrag data-cinfo title="Details">${ic('g-info')}</button>
        </div>
        <div class="msg-body scroll" data-cbody></div>
        <div class="msg-comp"><button class="tbtn" data-cattach title="Apps">${ic('g-plus')}</button>
          <div class="fld"><input placeholder="iMessage" data-cinput></div>
          <button class="tbtn" data-send>${ic('g-chev-u')}</button></div>
      </div></div></div>`;
  },
  ready(w) {
    const render = () => {
      const st = w.st;
      const q = (st.q || '').toLowerCase();
      const hit = c => !q || c.n.toLowerCase().includes(q) || c.msgs.some(m => m[1].toLowerCase().includes(q));
      w.node.querySelector('[data-clist]').innerHTML = st.chats.map((c, i) => hit(c) ? `
        <div class="msg-c${i === st.sel ? ' on' : ''}" data-ci="${i}">
          <span class="av" style="background:${c.c}">${esc(c.n[0])}</span>
          <span class="bd"><b>${esc(c.n)}</b><p>${esc(c.msgs[c.msgs.length - 1][1])}</p></span>
          <span class="tm">${esc(c.t)}</span></div>` : '').join('') ||
        `<div style="padding:22px 10px;text-align:center;font-size:12px;color:var(--txt-3)">No Results</div>`;
      const c = st.chats[st.sel];
      w.node.querySelector('[data-cname]').textContent = c.n;
      const av = w.node.querySelector('[data-cav]');
      av.textContent = c.n[0]; av.style.background = c.c;
      const body = w.node.querySelector('[data-cbody]');
      body.innerHTML = `<div class="msg-day">Today ${time12(new Date()).replace(NBSP, ' ')}</div>` +
        c.msgs.map((m, i) => {
          const last = i === c.msgs.length - 1 || c.msgs[i + 1][0] !== m[0];
          return `<div class="bub${m[0] === 'me' ? ' me' : ''}${last ? ' tail' : ''}">${esc(m[1])}</div>`;
        }).join('');
      body.scrollTop = body.scrollHeight;
    };
    const send = () => {
      const inp = w.node.querySelector('[data-cinput]');
      const v = inp.value.trim(); if (!v) return;
      const c = w.st.chats[w.st.sel];
      c.msgs.push(['me', v]); inp.value = ''; render();
      setTimeout(() => {
        const replies = ['ok that\'s wild', 'send the file', 'how is this one HTML file', 'screenshotting this', 'wait do the windows resize too'];
        c.msgs.push(['them', replies[Math.floor(Math.random() * replies.length)]]); render();
      }, 1100);
    };
    const details = () => {
      const c = w.st.chats[w.st.sel];
      const node = el(`<div class="pop" style="width:250px;padding:14px;text-align:center">
        <div class="av" style="width:56px;height:56px;border-radius:50%;background:${c.c};display:grid;place-items:center;
          color:#fff;font-size:22px;font-weight:600;margin:0 auto 8px">${esc(c.n[0])}</div>
        <div style="font-size:15px;font-weight:600">${esc(c.n)}</div>
        <div style="font-size:11.5px;color:var(--txt-2);margin-bottom:12px">${c.group ? c.msgs.length + ' messages · group' : 'iMessage'}</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn" data-d="audio" style="flex:1;height:26px">Audio</button>
          <button class="btn" data-d="video" style="flex:1;height:26px">Video</button></div>
        <div style="display:flex;flex-direction:column;gap:1px;margin-top:12px;background:var(--line);border-radius:8px;overflow:hidden">
          ${[['Hide Alerts', 'alerts'], ['Send Read Receipts', 'receipts']].map(([l, k]) =>
        `<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--win-2);padding:7px 10px;font-size:12px">
              ${l}<span class="sw${w.st[k] ? ' on' : ''}" data-t="${k}"><i></i></span></label>`).join('')}
        </div></div>`);
      Pop.open(node, { x: innerWidth / 2 - 125, y: 120, origin: 'top center' });
      on(node, 'click', '[data-d]', (e, t) => { Pop.close(); WM.open('facetime'); Toast(`Calling ${c.n}…`); });
      on(node, 'click', '.sw', (e, t) => { const k = t.dataset.t; w.st[k] = !w.st[k]; t.classList.toggle('on', w.st[k]); });
    };
    on(w.node, 'click', '[data-ci]', (e, t) => { w.st.sel = +t.dataset.ci; render(); });
    on(w.node, 'click', '[data-send]', send);
    on(w.node, 'click', '[data-cinfo]', details);
    on(w.node, 'click', '[data-cdetails]', details);
    on(w.node, 'click', '[data-cft]', () => { WM.open('facetime'); Toast(`Calling ${w.st.chats[w.st.sel].n}…`); });
    on(w.node, 'click', '[data-cattach]', (e, t) => menuUnder(t, [
      { id: 'p', label: 'Photos', icon: 'g-gallery', run: () => WM.open('photos') },
      { id: 's', label: 'Stickers', icon: 'g-star', run: () => insert('👍') },
      { id: 'a', label: 'Audio', icon: 'g-vol-hi', run: () => WM.open('voice') }, '-',
      { id: 'f', label: 'Send a File…', run: () => Toast('No files selected') }]));
    /* New Message starts an empty thread at the top of the list, like ⌘N. */
    on(w.node, 'click', '[data-cnew]', () => {
      const name = 'New Message';
      w.st.chats.unshift({ n: name, c: '#8e8e93', t: 'now', msgs: [['them', 'Type a message to begin.']] });
      w.st.sel = 0; w.st.q = ''; w.node.querySelector('[data-csearch]').value = '';
      render();
      w.node.querySelector('[data-cinput]').focus();
    });
    const insert = s => {
      const inp = w.node.querySelector('[data-cinput]');
      inp.value += s; inp.focus();
    };
    w.node.querySelector('[data-csearch]').addEventListener('input', e => { w.st.q = e.target.value; render(); });
    w.node.querySelector('[data-cinput]').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    render();
  }
};

/* ============================================================================
   23 · MAPS  (real tiles, live geocoding)
   ========================================================================== */
APPS.maps = {
  name: 'Maps', icon: 'app-maps', w: 940, h: 620, minW: 480, minH: 320,
  menus: () => stdMenus('maps', {
    View: [{ id: 'zi', label: 'Zoom In', key: '⌘+', run: () => Maps.zoom(1) },
    { id: 'zo', label: 'Zoom Out', key: '⌘-', run: () => Maps.zoom(-1) }, '-',
    { id: 'home', label: 'Go to Hyderabad', run: () => Maps.goto(37.3349, -122.0090, 15, 'Apple Park', '1 Apple Park Way · Hyderabad, Telangana') }],
  }, ['File', 'Edit', 'View', 'Window', 'Help']),
  mount(w) {
    return titlebar('Maps', {
      right: `<div class="sfield" data-nodrag style="width:210px"><span>${ic('g-search')}</span>
        <input data-msearch placeholder="Search Maps" spellcheck="false"></div>`
    }) + `<div class="maps" data-map>
      <div class="pane" data-pane></div>
      <svg class="pin" viewBox="0 0 26 34"><path fill="#f0453a" d="M13 0a13 13 0 0 0-13 13c0 8.7 13 21 13 21s13-12.3 13-21A13 13 0 0 0 13 0z"/><circle cx="13" cy="12.6" r="4.6" fill="#fff"/></svg>
      <div class="card" data-card></div>
      <div class="zoom"><button data-z="1" title="Zoom In">${ic('g-plus')}</button><button data-z="-1" title="Zoom Out">${ic('g-minus')}</button></div>
      <div class="attr">© OpenStreetMap · CARTO</div>
    </div>`;
  },
  ready(w) { Maps.attach(w); },
  onResize(w) { if (w === Maps.w) Maps.layout(); },
  onClose(w) { if (w === Maps.w) Maps.w = null; },
};

/* A minimal slippy map. Web Mercator, 256px tiles, one transformed pane.
   Tiles come from CARTO's OSM basemaps because their light style is the closest
   free match to Apple Maps — flat, pale, and out of the way of the labels. */
const Maps = {
  w: null, tiles: new Map(), z: 15, lat: 37.3349, lon: -122.0090,
  TILE: 256,

  /* Voyager for light: blue water, green parks, white roads on warm land — the
     closest free raster style to Apple Maps. Dark Matter for the dark theme. */
  style() { return SYS.theme === 'dark' ? 'dark_all' : 'rastertiles/voyager'; },
  url(x, y, z) {
    const sub = 'abcd'[(x + y) % 4];
    return `https://${sub}.basemaps.cartocdn.com/${this.style()}/${z}/${x}/${y}${devicePixelRatio > 1 ? '@2x' : ''}.png`;
  },
  /* Mercator, in world pixels at the current zoom. */
  worldX(lon, z) { return (lon + 180) / 360 * this.TILE * (1 << z); },
  worldY(lat, z) {
    const s = Math.sin(clamp(lat, -85.05, 85.05) * Math.PI / 180);
    return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * this.TILE * (1 << z);
  },
  lonAt(x, z) { return x / (this.TILE * (1 << z)) * 360 - 180; },
  latAt(y, z) {
    const n = Math.PI - 2 * Math.PI * y / (this.TILE * (1 << z));
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  },

  attach(w) {
    this.w = w;
    this.tiles.clear();
    this.card('Apple Park', '1 Apple Park Way · Amravati, Maharastra');
    /* One frame later the window has a real size to measure. */
    raf(() => this.layout());
    Bus.on('theme', () => { if (this.w && !this.w.dead) { this.tiles.clear(); this.pane().innerHTML = ''; this.layout(); } });

    const box = w.node.querySelector('[data-map]');
    on(w.node, 'click', '[data-z]', (e, t) => this.zoom(+t.dataset.z));

    box.addEventListener('pointerdown', e => {
      if (e.target.closest('.zoom,.card,.results')) return;
      box.setPointerCapture(e.pointerId);
      const ox = e.clientX, oy = e.clientY;
      const sx = this.worldX(this.lon, this.z), sy = this.worldY(this.lat, this.z);
      let moved = false;
      const mv = ev => {
        const dx = ev.clientX - ox, dy = ev.clientY - oy;
        if (!moved && Math.hypot(dx, dy) < 2) return;
        moved = true;
        this.lon = this.lonAt(sx - dx, this.z);
        this.lat = this.latAt(clamp(sy - dy, 0, this.TILE * (1 << this.z)), this.z);
        this.layout();
      };
      const up = () => {
        box.removeEventListener('pointermove', mv);
        box.removeEventListener('pointerup', up);
        if (moved) this.card('Dropped Pin', `${this.lat.toFixed(4)}, ${this.lon.toFixed(4)}`);
      };
      box.addEventListener('pointermove', mv);
      box.addEventListener('pointerup', up);
    });

    /* Wheel zooms about the cursor, the way every map does. */
    box.addEventListener('wheel', e => {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      const r = box.getBoundingClientRect();
      this.zoom(dir, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    }, { passive: false });

    box.addEventListener('dblclick', e => {
      if (e.target.closest('.zoom,.card,.results')) return;
      const r = box.getBoundingClientRect();
      this.zoom(1, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    });

    const input = w.node.querySelector('[data-msearch]');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.search(input.value.trim()); }
      if (e.key === 'Escape') { input.value = ''; this.clearResults(); }
    });
  },

  pane() { return this.w && this.w.node.querySelector('[data-pane]'); },

  zoom(dir, ax = 0, ay = 0) {
    if (!this.w) return;
    const nz = clamp(this.z + dir, 2, 19);
    if (nz === this.z) return;
    /* Keep the point under the cursor fixed: convert it to lat/lon first, then
       recentre so it lands in the same place at the new zoom. */
    const px = this.worldX(this.lon, this.z) + ax, py = this.worldY(this.lat, this.z) + ay;
    const alat = this.latAt(py, this.z), alon = this.lonAt(px, this.z);
    this.z = nz;
    this.lon = this.lonAt(this.worldX(alon, nz) - ax, nz);
    this.lat = this.latAt(clamp(this.worldY(alat, nz) - ay, 0, this.TILE * (1 << nz)), nz);
    this.layout();
  },

  goto(lat, lon, z, title, sub) {
    if (!this.w) return;
    this.lat = lat; this.lon = lon; if (z) this.z = clamp(z, 2, 19);
    this.layout();
    if (title) this.card(title, sub || '');
    /* Re-run the pin's drop so the arrival is visible. */
    const pin = this.w.node.querySelector('.pin');
    if (pin) { pin.style.animation = 'none'; raf(() => { pin.style.animation = ''; }); }
  },

  layout() {
    const w = this.w; if (!w || w.dead) return;
    const box = w.node.querySelector('[data-map]'), pane = this.pane();
    if (!box || !pane) return;
    const vw = box.clientWidth, vh = box.clientHeight;
    if (!vw || !vh) return;

    const z = this.z, T = this.TILE, n = 1 << z;
    const cx = this.worldX(this.lon, z), cy = this.worldY(this.lat, z);
    /* Top-left of the viewport in world pixels. */
    const ox = cx - vw / 2, oy = cy - vh / 2;
    /* One tile of margin beyond the viewport, so a drag reveals loaded map
       rather than the backdrop. */
    const x0 = Math.floor(ox / T) - 1, x1 = Math.floor((ox + vw) / T) + 1;
    const y0 = Math.floor(oy / T) - 1, y1 = Math.floor((oy + vh) / T) + 1;

    /* Subpixel offset lives on the pane; whole tiles are placed on the grid. */
    pane.style.transform = `translate3d(${-Math.round(ox)}px,${-Math.round(oy)}px,0)`;

    const want = new Set();
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      if (y < 0 || y >= n) continue;
      const wx = ((x % n) + n) % n;                    // wrap the globe east–west
      const key = `${z}/${wx}/${y}/${x}`;
      want.add(key);
      if (this.tiles.has(key)) continue;
      const img = new Image();
      img.src = this.url(wx, y, z);
      img.alt = '';
      img.style.left = x * T + 'px';
      img.style.top = y * T + 'px';
      img.addEventListener('load', () => { img.classList.add('in'); this.online(true); });
      img.addEventListener('error', () => { img.remove(); this.tiles.delete(key); this.online(false); });
      pane.append(img);
      this.tiles.set(key, img);
    }
    /* Drop anything that scrolled well out of view, and everything from the
       previous zoom level, so the pane doesn't grow without bound. */
    for (const [key, img] of this.tiles) {
      if (want.has(key)) continue;
      const [tz] = key.split('/');
      const [, , ty, tx] = key.split('/').map(Number);
      if (+tz !== z || tx < x0 - 2 || tx > x1 + 2 || ty < y0 - 2 || ty > y1 + 2) {
        img.remove(); this.tiles.delete(key);
      }
    }
  },

  /* Tiles failing in bulk means no network, which is worth saying once. */
  online(ok) {
    const w = this.w; if (!w || w.dead) return;
    if (ok) { this.fails = 0; const n = w.node.querySelector('.offline'); if (n) n.remove(); return; }
    this.fails = (this.fails || 0) + 1;
    if (this.fails < 4 || w.node.querySelector('.offline')) return;
    w.node.querySelector('[data-map]').append(el(
      `<div class="offline"><b style="display:block;font-size:13px;color:var(--txt);margin-bottom:2px">Map unavailable</b>
       Tiles come from the network, and there isn't one right now.</div>`));
  },

  card(title, sub, extra) {
    const w = this.w; if (!w) return;
    const c = w.node.querySelector('[data-card]'); if (!c) return;
    c.innerHTML = `<h3>${esc(title)}</h3><p>${esc(sub)}</p>
      ${extra ? `<p style="margin-top:6px;color:var(--green)">${esc(extra)}</p>` : ''}
      <div class="row"><button class="btn pri" style="flex:1" data-dir>Directions</button>
      <button class="btn" style="flex:1" data-save>Save</button></div>`;
    on(c, 'click', '[data-dir]', () => Toast(`Routing to ${title} isn't in this build`));
    on(c, 'click', '[data-save]', () => Toast(`${title} added to Favourites`));
  },

  clearResults() {
    const w = this.w; if (!w) return;
    const r = w.node.querySelector('.results'); if (r) r.remove();
  },

  /* Nominatim: OpenStreetMap's own geocoder, no key, CORS open. One request per
     Enter press, never per keystroke — their usage policy asks for exactly that. */
  async search(q) {
    if (!q || !this.w) return;
    this.clearResults();
    const box = this.w.node.querySelector('[data-map]');
    const panel = el(`<div class="results"><div style="padding:9px 10px;font-size:12px;color:var(--txt-2)">Searching…</div></div>`);
    box.append(panel);
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=' +
        encodeURIComponent(q), { headers: { 'Accept': 'application/json' } });
      const list = await r.json();
      if (!this.w || this.w.dead || !panel.isConnected) return;
      if (!list.length) {
        panel.innerHTML = `<div style="padding:9px 10px;font-size:12px;color:var(--txt-2)">No results for “${esc(q)}”</div>`;
        return;
      }
      panel.innerHTML = list.map((h, i) => {
        const name = h.name || h.display_name.split(',')[0];
        return `<button data-hit="${i}"><b>${esc(name)}</b><span>${esc(h.display_name)}</span></button>`;
      }).join('');
      on(panel, 'click', '[data-hit]', (e, t) => {
        const h = list[+t.dataset.hit];
        const z = h.boundingbox ? this.zoomForBox(h.boundingbox) : 15;
        this.goto(+h.lat, +h.lon, z, h.name || h.display_name.split(',')[0],
          h.display_name.split(',').slice(1, 4).join(',').trim());
        this.clearResults();
      });
    } catch (e) {
      if (panel.isConnected) panel.innerHTML =
        `<div style="padding:9px 10px;font-size:12px;color:var(--txt-2)">Search needs a network connection.</div>`;
    }
  },

  /* Fit the result's bounding box, so a country doesn't land at street zoom. */
  zoomForBox(bb) {
    const [s, n, wl, e] = bb.map(Number);
    const span = Math.max(Math.abs(n - s), Math.abs(e - wl));
    if (span > 20) return 4; if (span > 8) return 6; if (span > 2) return 8;
    if (span > .5) return 11; if (span > .1) return 13; if (span > .02) return 15;
    return 16;
  },
};

/* ============================================================================
   24 · PHOTOS
   ========================================================================== */
/* The library is real photographs — Commons featured pictures, carrying the titles,
   places, dates and photographers they actually came with. `th` is a 1000px thumbnail
   URL, and Commons will render any width from it, so tiles ask for what they need. */
const PHOTOS = [
  { t: 'Sydney (AU), Coast, Australian Fur Seals', place: 'Sydney, Australia', by: 'Dietmar Rabich', album: 'Coast', when: '2026-05-11',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Sydney_%28AU%29%2C_Coast%2C_Australian_Fur_Seals_--_2019_--_3489.jpg/500px-Sydney_%28AU%29%2C_Coast%2C_Australian_Fur_Seals_--_2019_--_3489.jpg' },
  { t: 'New York City at night', place: 'New York City', by: 'Paulo Barcellos Jr.', album: 'Cities', when: '2025-03-15',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/New_York_City_at_night_HDR.jpg/500px-New_York_City_at_night_HDR.jpg' },
  { t: 'Northern lights over Mývatn (Iceland)', place: 'Iceland', by: 'Giles Laurent', album: 'Skies', when: '2024-12-14',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/039_Northern_lights_over_M%C3%BDvatn_%28Iceland%29_Photo_by_Giles_Laurent.jpg/500px-039_Northern_lights_over_M%C3%BDvatn_%28Iceland%29_Photo_by_Giles_Laurent.jpg' },
  { t: 'Human looking at the stars during Perseids with th', place: 'Under the Perseids', by: 'Giles Laurent', album: 'Skies', when: '2023-12-14',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/018_Human_looking_at_the_stars_during_Perseids_with_the_Milky_Way_in_the_background_Photo_by_Giles_Laurent.jpg/500px-018_Human_looking_at_the_stars_during_Perseids_with_the_Milky_Way_in_the_background_Photo_by_Giles_Laurent.jpg' },
  { t: 'Étang de Thau and Sète', place: 'Sète, France', by: 'Christian Ferrer', album: 'Coast', when: '2022-01-10',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/%C3%89tang_de_Thau_and_S%C3%A8te.jpg/500px-%C3%89tang_de_Thau_and_S%C3%A8te.jpg' },
  { t: 'Peterborough (AU), Port Campbell National Park, Worm B', place: 'Victoria, Australia', by: 'Dietmar Rabich', album: 'Coast', when: '2021-07-20',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Peterborough_%28AU%29%2C_Port_Campbell_National_Park%2C_Worm_Bay_--_2019_--_0863.jpg/500px-Peterborough_%28AU%29%2C_Port_Campbell_National_Park%2C_Worm_Bay_--_2019_--_0863.jpg' },
  { t: 'Lac de Montriond', place: 'Haute-Savoie, France', by: 'Krzysztof Golik', album: 'Landscapes', when: '2020-06-30',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Lac_de_Montriond_06.jpg/500px-Lac_de_Montriond_06.jpg' },
  { t: 'Gaztelugache, Bermeo', place: 'Bermeo, Basque Country', by: 'Diego Delso', album: 'Coast', when: '2019-08-13',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Gaztelugache%2C_Bermeo%2C_Pa%C3%ADs_Vasco%2C_Espa%C3%B1a%2C_2019-08-13%2C_DD_14.jpg/500px-Gaztelugache%2C_Bermeo%2C_Pa%C3%ADs_Vasco%2C_Espa%C3%B1a%2C_2019-08-13%2C_DD_14.jpg' },
  { t: 'Water reflection of Kinkaku-ji Temple a sunny day, Kyo', place: 'Kyoto, Japan', by: 'Basile Morin', album: 'Travel', when: '2019-08-13',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Water_reflection_of_Kinkaku-ji_Temple_a_sunny_day%2C_Kyoto%2C_Japan.jpg/500px-Water_reflection_of_Kinkaku-ji_Temple_a_sunny_day%2C_Kyoto%2C_Japan.jpg' },
  { t: 'Sunlight through clouds and view of Ginkaku-ji Temple', place: 'Kyoto, Japan', by: 'Basile Morin', album: 'Travel', when: '2019-06-11',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Sunlight_through_clouds_and_view_of_Ginkaku-ji_Temple_from_above%2C_Kyoto%2C_Japan.jpg/500px-Sunlight_through_clouds_and_view_of_Ginkaku-ji_Temple_from_above%2C_Kyoto%2C_Japan.jpg' },
  { t: 'Bontecou Lake Milky Way panorama', place: 'Hudson Valley, New York', by: 'Juliancolton', album: 'Skies', when: '2018-09-05',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bontecou_Lake_Milky_Way_panorama.jpg/500px-Bontecou_Lake_Milky_Way_panorama.jpg' },
  { t: 'Lo sbadiglio', place: '', by: 'Alberto Peracchio', album: 'Wildlife', when: '2018-02-25',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Lo_sbadiglio.jpg/500px-Lo_sbadiglio.jpg' },
  { t: 'Dülmen, Börnste, Waldweg', place: 'Dülmen, Germany', by: 'Dietmar Rabich', album: 'Nature', when: '2017-09-19',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/D%C3%BClmen%2C_B%C3%B6rnste%2C_Waldweg_--_2015_--_4649.jpg/500px-D%C3%BClmen%2C_B%C3%B6rnste%2C_Waldweg_--_2015_--_4649.jpg' },
  { t: 'Québec city at night, view from Lévis city', place: 'Québec City, Canada', by: 'Wilfredor', album: 'Cities', when: '2017-08-26',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Qu%C3%A9bec_city_at_night%2C_view_from_L%C3%A9vis_city.jpg/500px-Qu%C3%A9bec_city_at_night%2C_view_from_L%C3%A9vis_city.jpg' },
  { t: 'Vulpes lagopus in Iceland', place: 'Iceland', by: 'Jonathen Pie https://unsplash.com/@r3dmax', album: 'Wildlife', when: '2017-01-13',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Vulpes_lagopus_in_Iceland.jpg/500px-Vulpes_lagopus_in_Iceland.jpg' },
  { t: 'Larus occidentalis in flight', place: '', by: 'Frank Schulenburg', album: 'Wildlife', when: '2016-01-25',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Larus_occidentalis_in_flight_%28Bodega_Head%29.jpg/500px-Larus_occidentalis_in_flight_%28Bodega_Head%29.jpg' },
  { t: 'Afternoon at Tennfjorden, Raftsundet', place: 'Lofoten, Norway', by: 'Ximonic (Simo Räsänen)', album: 'Nature', when: '2015-09-21',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Afternoon_at_Tennfjorden%2C_Raftsundet%2C_Hinn%C3%B8ya%2C_Norway%2C_2015_September_%2802%29.jpg/500px-Afternoon_at_Tennfjorden%2C_Raftsundet%2C_Hinn%C3%B8ya%2C_Norway%2C_2015_September_%2802%29.jpg' },
  { t: 'Hyacinth macaw (Anodorhynchus hyacinthinus) in flight', place: '', by: 'Charles J. Sharp', album: 'Wildlife', when: '2015-09-14',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Hyacinth_macaw_%28Anodorhynchus_hyacinthinus%29_in_flight.JPG/500px-Hyacinth_macaw_%28Anodorhynchus_hyacinthinus%29_in_flight.JPG' },
  { t: 'Piazzetta San Marco Venice', place: 'Venice, Italy', by: 'Benh LIEU SONG', album: 'Travel', when: '2015-07-10',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Piazzetta_San_Marco_Venice_BLS.jpg/500px-Piazzetta_San_Marco_Venice_BLS.jpg' },
  { t: 'Mountain lake, Mylgval mountain cirque, Western Caucas', place: 'Western Caucasus', by: 'Vyacheslav Argenberg', album: 'Landscapes', when: '2014-08-02',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Mountain_lake%2C_Mylgval_mountain_cirque%2C_Western_Caucasus.jpg/500px-Mountain_lake%2C_Mylgval_mountain_cirque%2C_Western_Caucasus.jpg' },
  { t: 'Larus californicus Palo Alto May 2011', place: 'Palo Alto, California', by: 'King of Hearts', album: 'Wildlife', when: '2013-10-27',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Larus_californicus_Palo_Alto_May_2011_001.jpg/500px-Larus_californicus_Palo_Alto_May_2011_001.jpg' },
  { t: 'The Bridge', place: '', by: 'Frank Schulenburg', album: 'Cities', when: '2013-08-15',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/The_Bridge_%28August_2013%29.jpg/500px-The_Bridge_%28August_2013%29.jpg' },
  { t: 'Panorama Piazza San Marco and Venice on Easter 2013', place: 'Venice, Italy', by: 'This Photo was taken by Wolfgang Moroder. ', album: 'Travel', when: '2013-03-31',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Panorama_Piazza_San_Marco_and_Venice_on_Easter_2013.jpg/500px-Panorama_Piazza_San_Marco_and_Venice_on_Easter_2013.jpg' },
  { t: 'Namib-Naukluft Sand Dunes', place: 'Sossusvlei, Namibia', by: 'Yathin S Krishnappa', album: 'Nature', when: '2013-02-08',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Namib-Naukluft_Sand_Dunes_%282011%29.jpg/500px-Namib-Naukluft_Sand_Dunes_%282011%29.jpg' },
  { t: 'Canal Grande Chiesa della Salute e Dogana dal ponte de', place: 'Venice, Italy', by: 'This Photo was taken by Wolfgang Moroder. ', album: 'Travel', when: '2012-12-12',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Canal_Grande_Chiesa_della_Salute_e_Dogana_dal_ponte_dell_Accademia.jpg/500px-Canal_Grande_Chiesa_della_Salute_e_Dogana_dal_ponte_dell_Accademia.jpg' },
  { t: 'Aurora borealis above Storfjorden and the Lyngen Alps', place: 'Troms, Norway', by: 'Ximonic (Simo Räsänen)', album: 'Skies', when: '2012-03-04',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Aurora_borealis_above_Storfjorden_and_the_Lyngen_Alps_in_moonlight%2C_2012_March.jpg/500px-Aurora_borealis_above_Storfjorden_and_the_Lyngen_Alps_in_moonlight%2C_2012_March.jpg' },
  { t: 'Tilisunahütte Panorama', place: 'Montafon, Austria', by: 'böhringer friedrich', album: 'Landscapes', when: '2011-08-01',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Tilisunah%C3%BCtte_Panorama.jpg/500px-Tilisunah%C3%BCtte_Panorama.jpg' },
  { t: 'Sossusvlei sand dunes', place: 'Sossusvlei, Namibia', by: 'Winfried Bruenken (Amrum)', album: 'Nature', when: '2009-12-19',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Sossusvlei_sand_dunes.jpg/500px-Sossusvlei_sand_dunes.jpg' },
  { t: 'Havelock Island, Sandy lagoon, Andaman Islands', place: 'Havelock Island, Andamans', by: 'Vyacheslav Argenberg', album: 'Coast', when: '2009-11-25',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Havelock_Island%2C_Sandy_lagoon%2C_Andaman_Islands.jpg/500px-Havelock_Island%2C_Sandy_lagoon%2C_Andaman_Islands.jpg' },
  { t: 'Havelock Island, Mangrove tree on the beach, Andaman I', place: 'Havelock Island, Andamans', by: 'Vyacheslav Argenberg', album: 'Coast', when: '2009-11-21',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Havelock_Island%2C_Mangrove_tree_on_the_beach%2C_Andaman_Islands.jpg/500px-Havelock_Island%2C_Mangrove_tree_on_the_beach%2C_Andaman_Islands.jpg' },
  { t: 'Chola Mountain Lake, Nepal', place: 'Solukhumbu, Nepal', by: 'Vyacheslav Argenberg', album: 'Landscapes', when: '2009-10-18',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Chola_Mountain_Lake%2C_Nepal.jpg/500px-Chola_Mountain_Lake%2C_Nepal.jpg' },
  { t: 'Mountains in snow, Mountain lake', place: 'Solukhumbu, Nepal', by: 'Vyacheslav Argenberg', album: 'Landscapes', when: '2009-10-18',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mountains_in_snow%2C_Mountain_lake%2C_Chola_Valley%2C_Nepal%2C_Himalayas.jpg/500px-Mountains_in_snow%2C_Mountain_lake%2C_Chola_Valley%2C_Nepal%2C_Himalayas.jpg' },
  { t: 'San Francisco with two bridges and the low fog', place: 'San Francisco, California', by: 'Brocken Inaglory', album: 'Cities', when: '2009-10-15',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/San_Francisco_with_two_bridges_and_the_low_fog.jpg/500px-San_Francisco_with_two_bridges_and_the_low_fog.jpg' },
  { t: 'Golden Gate Bridge at sunset', place: 'San Francisco, California', by: 'Brocken Inaglory', album: 'Cities', when: '2009-10-15',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Golden_Gate_Bridge_at_sunset_1.jpg/500px-Golden_Gate_Bridge_at_sunset_1.jpg' },
  { t: 'Boletus in Finnish forest', place: 'Finland', by: 'Petritap', album: 'Nature', when: '2009-09-15',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Boletus_in_Finnish_forest.jpg/500px-Boletus_in_Finnish_forest.jpg' },
  { t: 'Sunflower macro wide', place: '', by: 'Muhammad Mahdi Karim', album: 'Close-ups', when: '2009-03-09',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Sunflower_macro_wide.jpg/500px-Sunflower_macro_wide.jpg' },
  { t: 'New York Midtown Skyline at night', place: 'New York City', by: 'Diliff', album: 'Cities', when: '2008-11-02',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/New_York_Midtown_Skyline_at_night_-_Jan_2006_edit1.jpg/500px-New_York_Midtown_Skyline_at_night_-_Jan_2006_edit1.jpg' },
  { t: 'Lily Lilium \'Citronella\' Flower', place: '', by: 'Photo by and (c)2007 Derek Ramsey (Ram-Man', album: 'Close-ups', when: '2007-09-20',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Lily_Lilium_%27Citronella%27_Flower.jpg/500px-Lily_Lilium_%27Citronella%27_Flower.jpg' },
  { t: 'Lienz', place: 'Lienz, Austria', by: 'böhringer friedrich', album: 'Landscapes', when: '2007-09-13',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Lienz_SG8.JPG/500px-Lienz_SG8.JPG' },
  { t: 'Sossusvlei Dune Namib Desert Namibia Luca Galuzzi 2004', place: 'Sossusvlei, Namibia', by: 'Luca Galuzzi (Lucag)', album: 'Nature', when: '2004-07-19',
    th: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Sossusvlei_Dune_Namib_Desert_Namibia_Luca_Galuzzi_2004.JPG/500px-Sossusvlei_Dune_Namib_Desert_Namibia_Luca_Galuzzi_2004.JPG' },
].map((p, i) => ({ ...p, id: i + 1, fav: [1, 4, 9, 12, 19, 26].includes(i) }));
let PH_ID = PHOTOS.length;

/* upload.wikimedia.org only serves a fixed set of thumbnail widths now — ask for 400
   and you get a 400 back, with an HTML body that Chromium then blocks as an opaque
   response. So every request snaps up to the nearest size that exists. */
const PH_SIZES = [250, 500, 1280];
const phAt = (p, want) => {
  const w = PH_SIZES.find(s => s >= want) || PH_SIZES[PH_SIZES.length - 1];
  return p.th.replace(/\/\d+px-/, `/${w}px-`);
};
const phDate = w => new Date(w + 'T12:00:00');

/* Forty tiles asking Wikimedia for a thumbnail at once earns a wall of 429s, which
   Chromium then blocks outright — a grid of grey squares. So loading is queued a few
   at a time, only for tiles near the viewport, and a rejected request is retried. */
const PhLoad = {
  q: [], active: 0, MAX: 5,
  io: typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      PhLoad.io.unobserve(e.target);
      PhLoad.q.push(e.target);
    });
    PhLoad.pump();
  }, { rootMargin: '320px' }),

  /** Hand every <img data-src> in a freshly rendered subtree to the queue. */
  scan(root) {
    root.querySelectorAll('img[data-src]:not([data-q])').forEach(img => {
      img.dataset.q = '1';
      /* The photo you actually opened jumps the queue. */
      if (img.hasAttribute('data-first')) this.q.unshift(img);
      else if (this.io) this.io.observe(img);
      else this.q.push(img);
    });
    this.pump();
  },
  pump() {
    while (this.active < this.MAX && this.q.length) {
      const img = this.q.shift();
      if (!img.isConnected || img.dataset.done) continue;
      this.active++;
      const next = () => { this.active--; this.pump(); };
      img.onload = () => { img.dataset.done = '1'; img.classList.add('in'); next(); };
      img.onerror = () => {
        const n = +(img.dataset.try || 0) + 1;
        img.dataset.try = n;
        if (n <= 3) setTimeout(() => { this.q.push(img); this.pump(); }, 500 * n * n);
        else { img.classList.add('failed'); img.dataset.done = '1'; }
        next();
      };
      /* A retry needs a URL the cache hasn't already filed as broken. Wikimedia
         ignores unknown query params on thumbnails, so this is a free cache-buster. */
      img.src = img.dataset.src + (img.dataset.try > 0 ? '?r=' + img.dataset.try : '');
    }
  },
};

APPS.photos = {
  name: 'Photos', icon: 'app-photos', w: 1060, h: 700, minW: 640, minH: 420,
  menus: () => stdMenus('photos', {
    View: [{ id: 'y', label: 'Years', run: () => Ph.group('Years') },
    { id: 'm', label: 'Months', run: () => Ph.group('Months') },
    { id: 'd', label: 'Days', run: () => Ph.group('Days') },
    { id: 'a', label: 'All Photos', checked: true, run: () => Ph.group('All') }],
  }),
  mount(w) {
    const albums = [...new Set(PHOTOS.map(p => p.album))].sort();
    w.st = { view: 'Library', group: 'All', sel: null, pick: null, q: '', web: null, info: true };
    const S = [
      { head: 'Photos', items: [['Library', 'g-gallery'], ['Recents', 'g-clock-a'], ['Favourites', 'g-star'], ['Memories', 'g-star']] },
      { head: 'Albums', items: albums.map(a => [a, 'g-folder-g']) },
    ];
    return `<div class="wb"><div class="ph">
      <div class="sbar" data-drag style="width:206px"><div class="sb-top"><div data-tl></div></div>
      ${S.map(g => `<div class="grp"><div class="gh">${g.head}</div>${g.items.map(([n, i]) =>
      `<div class="si" data-pv="${esc(n)}">${ic(i, 'ico')}<span class="nm">${esc(n)}</span></div>`).join('')}</div>`).join('')}
      </div>
      <div class="ph-main">
        <div class="tbar" data-drag style="height:52px">
          <button class="tbtn" data-nodrag data-pback title="Back" style="display:none">${ic('g-chev-l')}</button>
          <div class="fx-title" data-ptitle style="position:static;text-align:left">Library</div>
          <div class="grow" style="flex:1"></div>
          <div class="seg" data-nodrag data-pseg>${[['Years', 38], ['Months', 44], ['Days', 36], ['All', 32]].map(([g, wd]) =>
      `<button data-pgroup="${g}"${g === 'All' ? ' class="on"' : ''} style="width:${wd}px;font-size:11px">${g}</button>`).join('')}</div>
          <button class="tbtn" data-nodrag data-pfav title="Favourite">${ic('g-star')}</button>
          <button class="tbtn" data-nodrag data-pinfo title="Info" style="display:none">${ic('g-info')}</button>
          <button class="tbtn" data-nodrag data-pshare title="Share">${ic('g-share')}</button>
          <div class="sfield" data-nodrag style="width:172px"><span>${ic('g-search')}</span><input placeholder="Search" data-psearch spellcheck="false"></div>
        </div>
        <div class="ph-body" data-pbody></div>
        <div class="ph-foot" data-pstat></div>
      </div></div></div>`;
  },
  ready(w) {
    Ph.w = w;
    on(w.node, 'click', '[data-pv]', (e, t) => {
      w.st.view = t.dataset.pv; w.st.sel = null; w.st.q = ''; w.st.web = null;
      w.node.querySelector('[data-psearch]').value = '';
      Ph.render(w);
    });
    on(w.node, 'click', '[data-pgroup]', (e, t) => Ph.group(t.dataset.pgroup, w));
    /* Selecting moves a class rather than re-rendering. Rebuilding the grid on the
       first click of a double-click swaps the element out from under the second one,
       so the dblclick never arrives and the photo never opens. */
    on(w.node, 'click', '[data-pi]', (e, t) => {
      w.st.pick = +t.dataset.pi;
      $$('.ph-cell', w.node).forEach(c => c.classList.toggle('on', c === t));
      Ph.paintChrome(w);
    });
    on(w.node, 'dblclick', '[data-pi]', (e, t) => Ph.open(w, +t.dataset.pi));
    on(w.node, 'click', '[data-pback]', () => { w.st.sel = null; Ph.render(w); });
    on(w.node, 'click', '[data-pstrip]', (e, t) => Ph.open(w, +t.dataset.pstrip));
    on(w.node, 'click', '[data-pfav]', () => Ph.toggleFav(w));
    on(w.node, 'click', '[data-pinfo]', () => { w.st.info = !w.st.info; Ph.render(w); });
    on(w.node, 'click', '[data-pdel]', () => Ph.remove(w));
    on(w.node, 'click', '[data-pweb]', (e, t) => Ph.search(w, t.dataset.pweb));
    on(w.node, 'click', '[data-padd]', (e, t) => Ph.add(w, +t.dataset.padd));
    on(w.node, 'click', '[data-pnudge]', (e, t) => Ph.step(w, +t.dataset.pnudge));
    on(w.node, 'click', '[data-pshare]', (e, t) => {
      const p = Ph.current(w);
      menuUnder(t, [
        { id: 'm', label: 'Mail', icon: 'g-compose', run: () => Mail.compose(p ? p.t : 'Photos') },
        { id: 'g', label: 'Messages', icon: 'g-facetime', run: () => WM.open('messages') }, '-',
        { id: 'c', label: 'Copy Photo', run: () => Toast(p ? 'Copied “' + p.t + '”' : 'Select a photo first') },
        { id: 'w', label: 'Open on Wikimedia Commons', run: () => p ? WM.open('safari', { url: p.th }) : Toast('Select a photo first') },
      ]);
    });
    const sf = w.node.querySelector('[data-psearch]');
    sf.addEventListener('input', () => {
      w.st.q = sf.value.trim(); w.st.sel = null; w.st.web = null;
      Ph.render(w);
    });
    /* Enter goes straight to the web, the way Photos falls through to its online
       results when the library has nothing to show. */
    sf.addEventListener('keydown', e => { if (e.key === 'Enter' && w.st.q) Ph.search(w, w.st.q); });
    /* Arrow keys drive the viewer, which is the only way anyone browses photos. */
    w.node.addEventListener('keydown', e => {
      if (w.st.sel == null) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); Ph.step(w, 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); Ph.step(w, -1); }
      if (e.key === 'Escape') { e.preventDefault(); w.st.sel = null; Ph.render(w); }
    });
    Ph.render(w);
  },
  onClose(w) { if (Ph.w === w) Ph.w = null; },
};

const Ph = {
  w: null,

  /** What the current sidebar selection and query resolve to. */
  list(w) {
    const v = w.st.view;
    let out = PHOTOS;
    if (v === 'Favourites') out = out.filter(p => p.fav);
    else if (v === 'Recents') out = out.slice(0, 18);
    else if (v === 'Memories') out = out.filter(p => ['Skies', 'Travel', 'Coast'].includes(p.album));
    else if (v !== 'Library') out = out.filter(p => p.album === v);
    const q = w.st.q.toLowerCase();
    if (q) out = out.filter(p =>
      (p.t + ' ' + p.place + ' ' + p.album + ' ' + p.by + ' ' + p.when).toLowerCase().includes(q));
    return out;
  },
  current(w) {
    const id = w.st.sel != null ? w.st.sel : w.st.pick;
    return id == null ? null : PHOTOS.find(p => p.id === id);
  },
  group(g, w) {
    w = w || this.w; if (!w) return;
    w.st.group = g; w.st.sel = null;
    this.render(w);
  },
  open(w, id) { w.st.sel = id; w.st.pick = id; this.render(w); },
  step(w, d) {
    const l = this.list(w);
    const i = l.findIndex(p => p.id === w.st.sel);
    if (i < 0) return;
    this.open(w, l[(i + d + l.length) % l.length].id);
  },
  toggleFav(w) {
    const p = this.current(w);
    if (!p) return Toast('Select a photo first');
    p.fav = !p.fav;
    /* In the grid only the pip and the toolbar change, and re-rendering would drop
       every tile back to a grey square while the queue reloaded it. */
    if (w.st.sel != null || w.st.view === 'Favourites') this.render(w);
    else {
      const cell = w.node.querySelector(`.ph-cell[data-pi="${p.id}"]`);
      if (cell) {
        cell.querySelector('.fav')?.remove();
        if (p.fav) cell.insertAdjacentHTML('beforeend', `<span class="fav">${ic('g-star')}</span>`);
      }
      this.paintChrome(w);
    }
    Toast(p.fav ? 'Added to Favourites' : 'Removed from Favourites');
  },
  remove(w) {
    const p = this.current(w);
    if (!p) return Toast('Select a photo first');
    PHOTOS.splice(PHOTOS.indexOf(p), 1);
    w.st.sel = null; w.st.pick = null;
    this.render(w);
    Toast('Deleted “' + p.t + '”');
  },

  /* ---- rendering ---- */
  /** Toolbar, title and status line — everything outside the photo area. */
  paintChrome(w) {
    const st = w.st, det = st.sel != null, cur = this.current(w);
    $$('[data-pv]', w.node).forEach(b => b.classList.toggle('on', b.dataset.pv === st.view));
    $$('[data-pgroup]', w.node).forEach(b => b.classList.toggle('on', b.dataset.pgroup === st.group));
    w.node.querySelector('[data-pback]').style.display = det ? '' : 'none';
    w.node.querySelector('[data-pseg]').style.display = det ? 'none' : '';
    w.node.querySelector('[data-pinfo]').style.display = det ? '' : 'none';
    w.node.querySelector('[data-pfav]').classList.toggle('on', !!(cur && cur.fav));
    w.node.querySelector('[data-pinfo]').classList.toggle('on', det && st.info);
    w.node.querySelector('[data-ptitle]').textContent =
      det ? (cur ? cur.t : st.view) : st.q ? `Search: ${st.q}` : st.view;
    const l = this.list(w);
    const favs = PHOTOS.filter(p => p.fav).length;
    const found = st.web && st.web.items ? `${st.web.items.length} from Wikimedia Commons` : '';
    w.node.querySelector('[data-pstat]').textContent = det && cur
      ? [cur.place || cur.album, cur.when, cur.by].filter(Boolean).join(' · ')
      : [`${l.length} ${l.length === 1 ? 'Photo' : 'Photos'}`, st.q ? found : `${favs} Favourite${favs === 1 ? '' : 's'}`]
        .filter(Boolean).join(' · ');
  },
  render(w) {
    w = w || this.w; if (!w) return;
    this.paintChrome(w);
    const body = w.node.querySelector('[data-pbody]');
    if (w.st.sel != null) { body.innerHTML = this.detailHTML(w); this.centreStrip(w); }
    else body.innerHTML = this.gridHTML(w);
    PhLoad.scan(body);
  },

  /** Section headings for the current grouping. */
  buckets(w, list) {
    const g = w.st.group;
    if (g === 'All') return [{ head: '', sub: '', items: list }];
    const keyOf = p => g === 'Years' ? p.when.slice(0, 4)
      : g === 'Months' ? p.when.slice(0, 7) : p.when;
    const map = new Map();
    list.forEach(p => { const k = keyOf(p); (map.get(k) || map.set(k, []).get(k)).push(p); });
    return [...map].map(([k, items]) => {
      const d = phDate(items[0].when);
      const head = g === 'Years' ? k
        : g === 'Months' ? `${MONS[d.getMonth()]} ${d.getFullYear()}`
          : `${DAYS[d.getDay()]}, ${d.getDate()} ${MONS[d.getMonth()]} ${d.getFullYear()}`;
      /* Photos captions a group with the places in it, so this does too. */
      const places = [...new Set(items.map(p => p.place).filter(Boolean))];
      const sub = places.slice(0, 3).join(' · ') + (places.length > 3 ? ` & ${places.length - 3} more` : '');
      return { head, sub, items };
    });
  },
  gridHTML(w) {
    const st = w.st, list = this.list(w);
    const big = st.group !== 'All';
    /* Photos gives a day with only a shot or two more room, so a sparse group
       reads as emphasis rather than as an empty row. */
    const tile = (p, span) => `<figure class="ph-cell${p.id === st.pick ? ' on' : ''}" data-pi="${p.id}"
      title="${esc(p.t)}"${span > 1 ? ` style="grid-column:span ${span}"` : ''}>
      <img data-src="${phAt(p, big ? 500 : 250)}" alt="${esc(p.t)}" decoding="async">
      ${p.fav ? `<span class="fav">${ic('g-star')}</span>` : ''}</figure>`;

    if (!list.length && !st.web) {
      return `<div class="ph-empty">
        <div class="ico">${ic('g-gallery')}</div>
        <b>${st.q ? `No photos match “${esc(st.q)}”` : 'Nothing here yet'}</b>
        ${st.q ? `<p>Look on Wikimedia Commons instead — whatever you pick joins your library.</p>
          <button class="btn pri" data-pweb="${esc(st.q)}">Search the web for “${esc(st.q)}”</button>` : ''}</div>`;
    }
    const cols = st.group === 'Years' ? 'repeat(auto-fill,minmax(340px,1fr))'
      : st.group === 'Months' ? 'repeat(auto-fill,minmax(240px,1fr))'
        : st.group === 'Days' ? 'repeat(auto-fill,minmax(190px,1fr))'
          : 'repeat(auto-fill,minmax(126px,1fr))';
    const sections = this.buckets(w, list).map(b => {
      const span = big && b.items.length < 3 ? 2 : 1;
      return `${b.head ? `<div class="ph-head"><b>${esc(b.head)}</b>${b.sub ? `<span>${esc(b.sub)}</span>` : ''}</div>` : ''}
       <div class="ph-grid${big ? ' big' : ''}" style="grid-template-columns:${cols}">${b.items.map(p => tile(p, span)).join('')}</div>`;
    }).join('');
    return `<div class="ph-scroll scroll">${sections}${this.webHTML(w)}
      ${st.q && !st.web ? `<div class="ph-more"><button class="btn" data-pweb="${esc(st.q)}">Search the web for “${esc(st.q)}”</button></div>` : ''}</div>`;
  },
  /** The imported-from-the-web strip, with its loading and failure states. */
  webHTML(w) {
    const web = w.st.web;
    if (!web) return '';
    const head = sub => `<div class="ph-head"><b>Wikimedia Commons</b><span>${sub}</span></div>`;
    if (web.loading) return head(`Searching “${esc(web.q)}”…`) +
      `<div class="ph-grid" style="grid-template-columns:repeat(auto-fill,minmax(126px,1fr))">
      ${[...Array(8)].map(() => `<div class="ph-cell skel"></div>`).join('')}</div>`;
    if (web.error) return head(esc(web.error));
    if (!web.items.length) return head(`Nothing found for “${esc(web.q)}”`);
    return head(`${web.items.length} results · click to add`) +
      `<div class="ph-grid" style="grid-template-columns:repeat(auto-fill,minmax(126px,1fr))">
      ${web.items.map((it, i) => `<figure class="ph-cell web" data-padd="${i}" title="${esc(it.t)}">
        <img data-src="${it.th}" alt="${esc(it.t)}" decoding="async">
        <span class="plus">${ic('g-plus')}</span></figure>`).join('')}</div>`;
  },
  detailHTML(w) {
    const p = PHOTOS.find(x => x.id === w.st.sel);
    if (!p) return '';
    const l = this.list(w);
    const i = l.findIndex(x => x.id === p.id);
    const d = phDate(p.when);
    return `<div class="ph-det">
      <div class="stage">
        <button class="nav l" data-pnudge="-1" title="Previous">${ic('g-chev-l')}</button>
        <img data-src="${phAt(p, 1280)}" data-first alt="${esc(p.t)}" decoding="async">
        <button class="nav r" data-pnudge="1" title="Next">${ic('g-chev-r')}</button>
      </div>
      ${w.st.info ? `<aside class="ph-info">
        <h4>${esc(p.t)}</h4>
        <div class="when">${DAYS[d.getDay()]}, ${d.getDate()} ${MONS[d.getMonth()]} ${d.getFullYear()}</div>
        ${p.place ? `<div class="row">${ic('g-pin')}<span>${esc(p.place)}</span></div>` : ''}
        <div class="row">${ic('g-camera')}<span>${esc(p.by)}</span></div>
        <div class="row">${ic('g-folder-g')}<span>${esc(p.album)}</span></div>
        <div class="acts">
          <button class="btn${p.fav ? ' pri' : ''}" data-pfav>${p.fav ? 'Favourited' : 'Favourite'}</button>
          <button class="btn" data-pdel>Delete</button>
        </div>
        <p class="lic">A featured picture from Wikimedia Commons, shown with the credit it carries.</p>
      </aside>` : ''}
      <div class="ph-strip" data-pstripbox>${l.map(x =>
      `<img class="${x.id === p.id ? 'on' : ''}" data-pstrip="${x.id}" data-src="${phAt(x, 250)}" alt="${esc(x.t)}">`).join('')}</div>
      <div class="ph-count">${i + 1} of ${l.length}</div></div>`;
  },
  /** Keep the open photo centred in the filmstrip. */
  centreStrip(w) {
    const box = w.node.querySelector('[data-pstripbox]');
    if (!box) return;
    const on = box.querySelector('.on');
    if (on) box.scrollLeft = on.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2;
  },

  /* ---- the web ---- */
  /** Live Commons search: no key, CORS-enabled, and every hit keeps its credit. */
  async search(w, q) {
    w = w || this.w; if (!w) return;
    w.st.web = { q, loading: true, items: [] };
    this.render(w);
    const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
      '&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + q) +
      '&gsrlimit=18&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=250&format=json&origin=*';
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const items = Object.values((j.query || {}).pages || {}).map(pg => {
        const ii = (pg.imageinfo || [])[0];
        if (!ii || !ii.thumburl) return null;
        const md = ii.extmetadata || {};
        const by = String((md.Artist && md.Artist.value) || 'Unknown')
          .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 42) || 'Unknown';
        return {
          t: pg.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' ').slice(0, 60),
          by, th: ii.thumburl,
        };
      }).filter(Boolean);
      /* A slower earlier search must not overwrite a newer one. */
      if (w.dead || !w.st.web || w.st.web.q !== q) return;
      w.st.web = { q, items };
    } catch (err) {
      if (w.dead || !w.st.web || w.st.web.q !== q) return;
      w.st.web = { q, items: [], error: navigator.onLine ? 'Commons did not answer' : 'You are offline' };
    }
    this.render(w);
  },
  add(w, i) {
    const it = w.st.web && w.st.web.items[i];
    if (!it) return;
    const p = {
      id: ++PH_ID, t: it.t, place: '', by: it.by, album: 'Imported',
      when: new Date().toISOString().slice(0, 10), th: it.th, fav: false,
    };
    PHOTOS.unshift(p);
    /* Imported is a brand-new album the first time, so the sidebar has to grow. */
    if (!w.node.querySelector('[data-pv="Imported"]')) {
      w.node.querySelectorAll('.sbar .grp')[1].insertAdjacentHTML('beforeend',
        `<div class="si" data-pv="Imported">${ic('g-folder-g', 'ico')}<span class="nm">Imported</span></div>`);
    }
    w.st.pick = p.id;
    this.render(w);
    Toast('Added “' + p.t + '” to your library');
  },
};

/* ============================================================================
   25 · SMALLER APPS
   ========================================================================== */
APPS.reminders = {
  name: 'Reminders', icon: 'app-reminders', w: 760, h: 540, minW: 480, minH: 320,
  menus: () => stdMenus('reminders'),
  mount(w) {
    const L = [['Today', '#0a84ff', 3], ['Scheduled', '#ff375f', 5], ['All', '#1d1d1f', 11], ['Flagged', '#ff9f0a', 2], ['Completed', '#8e8e93', 24]];
    const items = [
      ['Send design review feedback', 'Today 5:00 PM', false, '#ff375f'],
      ['Review PR #142 — column view sizing', 'Today 6:30 PM', false, '#0a84ff'],
      ['Pick up dry cleaning', 'Today', false, '#ff9f0a'],
      ['Book the car for Saturday', 'Tomorrow', false, '#0a84ff'],
      ['Reply to Anna about the tray blur', 'Tomorrow 9:00 AM', false, '#30d158'],
      ['Fix unfocused window shadows', 'Done', true, '#8e8e93'],
      ['Write the neofetch ASCII by hand', 'Done', true, '#8e8e93'],
    ];
    return `<div class="wb">
      <div class="sbar" data-drag style="width:206px"><div class="sb-top"><div data-tl></div></div>
        <div class="grp"><div class="gh">My Lists</div>
        ${L.map(([n, c, k]) => `<div class="si"><span class="ico" style="width:16px;height:16px;border-radius:50%;background:${c};color:#fff;display:grid;place-items:center;font-size:8px">●</span><span class="nm">${n}</span><span class="tail">${k}</span></div>`).join('')}
        </div></div>
      <div class="wmain">
        <div class="tbar" data-drag style="height:52px">
          <div class="fx-title" style="color:var(--blue);font-size:22px;font-weight:700">Today</div>
          <div class="grow" style="flex:1"></div><button class="tbtn" data-nodrag data-radd title="New Reminder">${ic('g-plus')}</button></div>
        <div class="scroll" style="flex:1;padding:6px 18px 20px" data-rlist>
        ${items.map((it, i) => `<div class="rem" data-ri="${i}" style="display:flex;gap:11px;align-items:flex-start;padding:9px 2px;border-bottom:.5px solid var(--line)">
          <span class="rc" style="width:17px;height:17px;border-radius:50%;border:1.6px solid ${it[2] ? it[3] : 'var(--txt-3)'};background:${it[2] ? it[3] : 'transparent'};flex:none;margin-top:1px;display:grid;place-items:center;color:#fff">${it[2] ? ic('g-check') : ''}</span>
          <span style="min-width:0"><span style="display:block;font-size:13px;${it[2] ? 'color:var(--txt-3);text-decoration:line-through' : ''}">${esc(it[0])}</span>
          <span style="font-size:11.5px;color:var(--txt-2)">${esc(it[1])}</span></span></div>`).join('')}
        </div></div></div>`;
  },
  ready(w) {
    w.node.querySelectorAll('.rc svg').forEach(s => s.style.cssText = 'width:10px;height:10px');
    /* + inserts an empty row you type straight into, like the real app. */
    on(w.node, 'click', '[data-radd]', () => {
      const list = w.node.querySelector('[data-rlist]');
      const row = el(`<div class="rem" style="display:flex;gap:11px;align-items:flex-start;padding:9px 2px;border-bottom:.5px solid var(--line)">
        <span class="rc" style="width:17px;height:17px;border-radius:50%;border:1.6px solid var(--txt-3);flex:none;margin-top:1px;display:grid;place-items:center;color:#fff"></span>
        <span style="min-width:0;flex:1"><span contenteditable="true" data-rnew style="display:block;font-size:13px;outline:none;min-height:17px"></span>
        <span style="font-size:11.5px;color:var(--txt-2)">Today</span></span></div>`);
      list.prepend(row);
      const f = row.querySelector('[data-rnew]');
      f.focus();
      f.addEventListener('blur', () => { if (!f.textContent.trim()) row.remove(); else f.removeAttribute('contenteditable'); });
      f.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); f.blur(); } });
    });
    on(w.node, 'click', '.rem', (e, t) => {
      const c = t.querySelector('.rc'), done = !!c.querySelector('svg');
      const lbl = t.querySelector('span span');
      if (done) { c.innerHTML = ''; c.style.background = 'transparent'; c.style.borderColor = 'var(--txt-3)'; lbl.style.cssText = 'display:block;font-size:13px'; }
      else {
        c.innerHTML = ic('g-check'); c.querySelector('svg').style.cssText = 'width:10px;height:10px';
        c.style.background = '#0a84ff'; c.style.borderColor = '#0a84ff';
        lbl.style.cssText = 'display:block;font-size:13px;color:var(--txt-3);text-decoration:line-through';
      }
    });
  }
};

/* ----------------------------------------------------------------------------
   Live forecast. Open-Meteo needs no key and sends CORS headers, so the app and
   the notification-centre widget can share one real reading. Hyderabad, because
   that's where macOS points on a fresh install.
   -------------------------------------------------------------------------- */
const Wx = {
  place: 'Hyderabad', lat: 17.3850, lon: 78.4867,
  data: null, pending: null,

  /* WMO code → label and glyph. Night swaps the sun for a moon. */
  code(c, day = 1) {
    const t = {
      0: ['Clear', day ? 'g-sun' : 'g-moon'], 1: ['Mostly Clear', day ? 'g-sun' : 'g-moon'],
      2: ['Partly Cloudy', day ? 'g-suncloud' : 'g-mooncloud'], 3: ['Cloudy', 'g-cloud'],
      45: ['Fog', 'g-fog'], 48: ['Freezing Fog', 'g-fog'],
      51: ['Light Drizzle', 'g-drizzle'], 53: ['Drizzle', 'g-drizzle'], 55: ['Heavy Drizzle', 'g-drizzle'],
      56: ['Freezing Drizzle', 'g-drizzle'], 57: ['Freezing Drizzle', 'g-drizzle'],
      61: ['Light Rain', 'g-rain'], 63: ['Rain', 'g-rain'], 65: ['Heavy Rain', 'g-rain'],
      66: ['Freezing Rain', 'g-rain'], 67: ['Freezing Rain', 'g-rain'],
      71: ['Light Snow', 'g-snow'], 73: ['Snow', 'g-snow'], 75: ['Heavy Snow', 'g-snow'], 77: ['Snow Grains', 'g-snow'],
      80: ['Showers', 'g-rain'], 81: ['Showers', 'g-rain'], 82: ['Heavy Showers', 'g-rain'],
      85: ['Snow Showers', 'g-snow'], 86: ['Snow Showers', 'g-snow'],
      95: ['Thunderstorms', 'g-storm'], 96: ['Thunderstorms', 'g-storm'], 99: ['Thunderstorms', 'g-storm'],
    };
    return t[c] || ['—', 'g-cloud'];
  },

  /* One request per session, shared by every caller. */
  load() {
    if (this.data) return Promise.resolve(this.data);
    if (this.pending) return this.pending;
    const q = `https://api.open-meteo.com/v1/forecast?latitude=${this.lat}&longitude=${this.lon}` +
      `&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`;
    this.pending = fetch(q).then(r => r.json()).then(j => {
      if (!j.current) throw new Error('bad payload');
      this.data = j; Bus.emit('wx', j); return j;
    }).catch(() => { this.pending = null; return null; });
    return this.pending;
  },

  /* Everything below reads whatever has arrived, falling back to a plausible
     reading so nothing renders empty while offline. */
  now() {
    const d = this.data;
    if (!d) return { t: 55, code: 0, day: 1, hi: 83, lo: 53, live: false };
    return {
      t: Math.round(d.current.temperature_2m), code: d.current.weather_code, day: d.current.is_day,
      hi: Math.round(d.daily.temperature_2m_max[0]), lo: Math.round(d.daily.temperature_2m_min[0]), live: true,
    };
  },
  hours(n = 6) {
    const d = this.data;
    if (!d) return [['Now', 55, 'g-sun'], ['5PM', 56, 'g-sun'], ['6PM', 54, 'g-suncloud'],
      ['7PM', 51, 'g-mooncloud'], ['8PM', 49, 'g-moon'], ['9PM', 47, 'g-moon']].slice(0, n);
    /* Open-Meteo returns the whole day from midnight; start at the current hour. */
    const now = new Date(d.current.time);
    let i = d.hourly.time.findIndex(t => new Date(t) >= now);
    if (i < 0) i = 0;
    const out = [];
    for (let k = 0; k < n; k++) {
      const j = Math.min(i + k, d.hourly.time.length - 1);
      const h = new Date(d.hourly.time[j]);
      const hr = h.getHours();
      out.push([k === 0 ? 'Now' : `${hr % 12 || 12}${hr < 12 ? 'AM' : 'PM'}`,
        Math.round(d.hourly.temperature_2m[j]),
        this.code(d.hourly.weather_code[j], hr >= 6 && hr < 20)[1]]);
    }
    return out;
  },
  days() {
    const d = this.data;
    if (!d) return [['Today', 53, 83, 'g-sun'], ['Tue', 55, 81, 'g-sun'], ['Wed', 56, 84, 'g-suncloud'],
      ['Thu', 57, 88, 'g-sun'], ['Fri', 56, 85, 'g-sun'], ['Sat', 54, 79, 'g-suncloud'], ['Sun', 52, 76, 'g-sun']];
    return d.daily.time.map((t, i) => [
      i === 0 ? 'Today' : DAYS3[new Date(t + 'T12:00').getDay()],
      Math.round(d.daily.temperature_2m_min[i]), Math.round(d.daily.temperature_2m_max[i]),
      this.code(d.daily.weather_code[i], 1)[1],
    ]);
  },
};

APPS.weather = {
  name: 'Weather', icon: 'app-weather', w: 460, h: 620, minW: 340, minH: 420,
  menus: () => stdMenus('weather'),
  mount() { return titlebar('Weather', { plain: true }) + `<div class="wx-app" data-wx></div>`; },
  ready(w) {
    const paint = () => {
      if (w.dead) return;
      const n = Wx.now(), hrs = Wx.hours(6), days = Wx.days();
      const [label] = Wx.code(n.code, n.day);
      /* Sky colour tracks day/night, the way the real app does. */
      const sky = n.day
        ? 'linear-gradient(175deg,#4aa3e8,#1f6fb8 55%,#17518d)'
        : 'linear-gradient(175deg,#274b7a,#1a2f52 55%,#141d33)';
      w.node.querySelector('[data-wx]').innerHTML = `
        <div style="flex:1;min-height:0;overflow:auto;background:${sky};color:#fff;padding:22px 20px 26px">
          <div style="text-align:center">
            <div style="font-size:15px;font-weight:500;letter-spacing:.01em">${esc(Wx.place)}</div>
            <div style="font-size:74px;font-weight:200;letter-spacing:-.05em;line-height:1.05">${n.t}°</div>
            <div style="font-size:14px;opacity:.9">${esc(label)}</div>
            <div style="font-size:13px;opacity:.8;margin-top:2px">H:${n.hi}° L:${n.lo}°</div>
          </div>
          <div style="margin-top:22px;background:rgba(255,255,255,.14);border:.5px solid rgba(255,255,255,.2);border-radius:14px;padding:12px 14px;backdrop-filter:blur(12px)">
            <div style="font-size:11px;opacity:.75;letter-spacing:.03em;text-transform:uppercase;padding-bottom:9px;border-bottom:.5px solid rgba(255,255,255,.18)">${esc(label)} conditions for the rest of the day.</div>
            <div style="display:flex;justify-content:space-between;padding-top:11px">
              ${hrs.map(([h, t2, i]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:7px;font-size:12px">
                <span>${esc(h)}</span><span style="width:20px;height:20px;opacity:.95">${ic(i)}</span><b style="font-size:14px;font-weight:600">${t2}°</b></div>`).join('')}
            </div></div>
          <div style="margin-top:14px;background:rgba(255,255,255,.14);border:.5px solid rgba(255,255,255,.2);border-radius:14px;padding:6px 14px">
            ${(() => {
          /* Each bar spans that day's range inside the week's range, so a cold
             day reads as a short bar sitting left — the whole point of the row. */
          const wLo = Math.min(...days.map(d => d[1])), wHi = Math.max(...days.map(d => d[2]));
          const span = Math.max(1, wHi - wLo);
          return days.map(([d, lo, hi, g]) => {
            const l = ((lo - wLo) / span * 100).toFixed(1), r = ((wHi - hi) / span * 100).toFixed(1);
            return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-top:.5px solid rgba(255,255,255,.14)">
              <span style="width:44px;font-size:13px;font-weight:500">${esc(d)}</span>
              <span style="width:20px;height:20px;opacity:.95">${ic(g)}</span>
              <span style="font-size:13px;opacity:.75;width:30px;text-align:right">${lo}°</span>
              <span style="flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.22);position:relative">
                <i style="position:absolute;left:${l}%;right:${r}%;top:0;bottom:0;border-radius:2px;
                  background:linear-gradient(90deg,#7ed6ff,#ffd84d,#ff9f0a)"></i></span>
              <span style="font-size:13px;width:30px">${hi}°</span></div>`;
          }).join('');
        })()}
          </div>
          <div style="margin-top:12px;text-align:center;font-size:10.5px;opacity:.55">
            ${n.live ? 'Live from Open-Meteo' : 'Last known reading — no connection'}</div>
        </div>`;
      w.node.querySelectorAll('[data-wx] svg').forEach(s => { s.style.cssText = 'width:100%;height:100%'; });
    };
    paint();
    Wx.load().then(() => paint());
    Bus.on('wx', () => paint());
  }
};

const TICKERS = [
  { s: 'AAPL', n: 'Apple Inc.', p: 232.40, d: 12.03, up: true }, { s: 'MSFT', n: 'Microsoft Corp.', p: 505.80, d: -3.12, up: false },
  { s: 'NVDA', n: 'NVIDIA Corp.', p: 168.25, d: -6.22, up: false }, { s: 'GOOGL', n: 'Alphabet Inc.', p: 204.11, d: 4.86, up: true },
  { s: 'TSLA', n: 'Tesla, Inc.', p: 318.94, d: 9.41, up: true }, { s: 'AMZN', n: 'Amazon.com', p: 241.62, d: 1.08, up: true },
];
/* `steps` controls how jagged the walk is, which is how the range selector makes a
   day look choppy and a decade look smooth. */
function spark(up, w = 90, h = 26, seed = 1, steps = 14) {
  let d = `M0 ${h * .6}`;
  for (let i = 1; i <= steps; i++) {
    const x = i / steps * w;
    const t = i / steps;
    const noise = Math.sin(i * 1.9 + seed * 3) * .18 + Math.sin(i * .7 + seed) * .12;
    const y = h * (up ? .78 - t * .58 + noise * .3 : .24 + t * .56 + noise * .3);
    d += ` L${x.toFixed(1)} ${clamp(y, 2, h - 2).toFixed(1)}`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:100%"><path d="${d}" fill="none" stroke="${up ? '#28c840' : '#ff453a'}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
APPS.stocks = {
  name: 'Stocks', icon: 'app-stocks', w: 800, h: 560, minW: 480, minH: 340,
  menus: () => stdMenus('stocks'),
  mount() {
    return `<div class="wb">
      <div class="sbar" data-drag style="width:270px;padding-top:0"><div class="sb-top"><div data-tl></div></div>
        <div style="padding:0 10px 8px"><div class="sfield" data-nodrag><span>${ic('g-search')}</span><input placeholder="Search"></div></div>
        <div style="overflow:auto;padding:0 8px">
        ${TICKERS.map((t, i) => `<div class="si" data-ti="${i}" style="height:52px;align-items:center">
          <span style="flex:1;min-width:0;display:flex;flex-direction:column">
            <b style="font-size:14px;font-weight:650;letter-spacing:-.01em">${t.s}</b>
            <span style="font-size:11px;color:var(--txt-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.n}</span></span>
          <span style="width:56px;height:26px;flex:none">${spark(t.up, 90, 26, i)}</span>
          <span style="display:flex;flex-direction:column;align-items:flex-end;width:74px;flex:none">
            <b style="font-size:13px;font-variant-numeric:tabular-nums">${t.p.toFixed(2)}</b>
            <span style="font-size:10.5px;font-weight:600;color:#fff;background:${t.up ? '#28c840' : '#ff453a'};padding:1px 5px;border-radius:4px">${t.up ? '+' : ''}${t.d.toFixed(2)}%</span></span>
        </div>`).join('')}
        </div></div>
      <div class="wmain">
        <div class="tbar" data-drag style="height:52px"><div class="fx-title" data-stt></div></div>
        <div class="scroll" style="flex:1;padding:18px 22px" data-stbody></div>
      </div></div>`;
  },
  ready(w) {
    const RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '5Y', '10Y'];
    w.st = { i: 0, range: '1M' };
    const render = i => {
      const t = TICKERS[i];
      w.st.i = i;
      w.node.querySelector('[data-stt]').textContent = t.s;
      $$('[data-ti]', w.node).forEach(b => b.classList.toggle('on', +b.dataset.ti === i));
      /* The range picks a different slice of the walk, so switching it really does
         redraw the chart — longer windows read smoother, as they should. */
      const ri = RANGES.indexOf(w.st.range);
      const detail = [26, 40, 60, 80, 100, 120, 140, 170, 200, 240][ri] || 60;
      w.node.querySelector('[data-stbody]').innerHTML = `
        <div style="font-size:26px;font-weight:650;letter-spacing:-.03em">${t.n}</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin-top:2px">
          <span style="font-size:36px;font-weight:300;letter-spacing:-.03em;font-variant-numeric:tabular-nums">${t.p.toFixed(2)}</span>
          <span style="font-size:15px;font-weight:600;color:${t.up ? '#28c840' : '#ff453a'}">${t.up ? '▲' : '▼'} ${Math.abs(t.d).toFixed(2)}%</span></div>
        <div style="display:flex;gap:4px;margin:16px 0 10px">${RANGES.map(p =>
        `<button class="btn" data-range="${p}" style="height:22px;padding:0 9px;font-size:11px${p === w.st.range ? ';background:var(--blue);color:#fff' : ''}">${p}</button>`).join('')}</div>
        <div style="height:190px;background:var(--win-2);border-radius:10px;padding:12px;box-shadow:0 0 0 .5px var(--line)">${spark(t.up, 600, 165, i + 3 + ri * 5, detail)}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin-top:16px;background:var(--line);border-radius:10px;overflow:hidden">
          ${[['Open', (t.p - t.d).toFixed(2)], ['High', (t.p * 1.014).toFixed(2)], ['Low', (t.p * .986).toFixed(2)], ['Vol', '58.2M'],
        ['P/E', '34.2'], ['Mkt Cap', '3.48T'], ['52W H', (t.p * 1.22).toFixed(2)], ['52W L', (t.p * .72).toFixed(2)]]
        .map(([k, v]) => `<div style="background:var(--win-2);padding:9px 12px"><div style="font-size:10.5px;color:var(--txt-2)">${k}</div><div style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums">${v}</div></div>`).join('')}
        </div>`;
    };
    on(w.node, 'click', '[data-ti]', (e, t) => render(+t.dataset.ti));
    on(w.node, 'click', '[data-range]', (e, t) => { w.st.range = t.dataset.range; render(w.st.i); });
    render(0);
  }
};

APPS.clock = {
  name: 'Clock', icon: 'app-clock', w: 520, h: 420, minW: 360, minH: 300,
  menus: () => stdMenus('clock'),
  mount() {
    const zones = [['Hyderabad', -12.5], ['Amravati', 0], ['London', -4.5], ['Tokyo', 3.5]];
    return titlebar('Clock', { plain: true }) + `<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);min-height:0">
      ${zones.map(([z, off]) => `<div style="background:var(--win);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:14px">
        <div data-cw="${off}" style="width:104px;height:104px"></div>
        <div style="font-size:13px;font-weight:600">${z}</div>
        <div style="font-size:11.5px;color:var(--txt-2)" data-ct="${off}"></div></div>`).join('')}
    </div>`;
  },
  ready(w) {
    const tick = () => {
      if (w.dead) return;
      $$('[data-cw]', w.node).forEach(n => {
        const off = +n.dataset.cw;
        const d = new Date(Date.now() + off * 3600e3);
        n.innerHTML = analogClock(d, 104);
      });
      $$('[data-ct]', w.node).forEach(n => {
        const d = new Date(Date.now() + (+n.dataset.ct) * 3600e3);
        n.textContent = time12(d).replace(NBSP, ' ');
      });
    };
    everySecond(tick);
  }
};

APPS.contacts = {
  name: 'Contacts', icon: 'app-contacts', w: 760, h: 540, minW: 480, minH: 320,
  menus: () => stdMenus('contacts'),
  mount(w) {
    const C = [['Anna Haro', 'Product design', '#0a84ff'], ['Chris Lee', 'Photographer', '#ff2d55'],
    ['Daniel Higgins', 'Engineering manager', '#ffd60a'], ['David Taylor', 'Motion design', '#ff9f0a'],
    ['Freda Klein', 'Architect', '#a2845e'], ['Hank Zakroff', 'Type designer', '#5e5ce6'],
    ['John Appleseed', 'iOS engineer', '#30d158'], ['Kate Bell', 'Frontend', '#64d2ff'],
    ['Mom', 'Family', '#ff375f'], ['Dr. Reed', 'Dentist', '#8e8e93']];
    w.C = C;
    return `<div class="wb">
      <div class="sbar" data-drag style="width:250px;padding-top:0"><div class="sb-top"><div data-tl></div></div>
        <div style="padding:0 10px 8px"><div class="sfield" data-nodrag><span>${ic('g-search')}</span><input placeholder="Search"></div></div>
        <div style="overflow:auto;padding:0 8px">${C.map((c, i) => `<div class="si" data-ci2="${i}" style="height:30px"><span class="nm">${esc(c[0])}</span></div>`).join('')}</div>
      </div>
      <div class="wmain"><div class="tbar" data-drag style="height:52px"></div>
        <div class="scroll" style="flex:1;padding:26px" data-cbody2></div></div></div>`;
  },
  ready(w) {
    const render = i => {
      const c = w.C[i];
      $$('[data-ci2]', w.node).forEach(b => b.classList.toggle('on', +b.dataset.ci2 === i));
      w.node.querySelector('[data-cbody2]').innerHTML = `
        <div style="display:flex;gap:18px;align-items:center">
          <div style="width:88px;height:88px;border-radius:50%;background:${c[2]};display:grid;place-items:center;color:#fff;font-size:34px;font-weight:600">${esc(c[0][0])}</div>
          <div><div style="font-size:25px;font-weight:600;letter-spacing:-.02em">${esc(c[0])}</div>
          <div style="font-size:13px;color:var(--txt-2)">${esc(c[1])}</div></div></div>
        <div style="margin-top:24px;max-width:420px">
          ${[['email', c[0].split(' ')[0].toLowerCase() + '@example.com'], ['home', 'Hyderabad, Telangana']]
        .map(([k, v]) => `<div style="display:flex;gap:16px;padding:8px 0;border-top:.5px solid var(--line)">
            <span style="width:60px;text-align:right;font-size:11.5px;color:var(--txt-2)">${k}</span>
            <span style="font-size:13px;color:var(--blue)">${esc(v)}</span></div>`).join('')}
        </div>`;
    };
    on(w.node, 'click', '[data-ci2]', (e, t) => render(+t.dataset.ci2));
    render(0);
  }
};

APPS.freeform = {
  name: 'Freeform', icon: 'app-freeform', w: 860, h: 600, minW: 480, minH: 320,
  menus: () => stdMenus('freeform'),
  mount() {
    return titlebar('Untitled Board', {
      right: `<div class="seg" data-nodrag>${['#1d1d1f', '#0a84ff', '#ff375f', '#30d158', '#ff9f0a'].map((c, i) =>
        `<button data-pen="${c}" class="${i === 0 ? 'on' : ''}" style="width:26px"><span style="width:13px;height:13px;border-radius:50%;background:${c};display:block"></span></button>`).join('')}</div>
      <button class="tbtn" data-nodrag data-clear title="Clear">${ic('g-x')}</button>`
    }) + `<div style="flex:1;position:relative;min-height:0;background:var(--win)">
        <canvas data-ff style="position:absolute;inset:0;width:100%;height:100%;display:block;cursor:var(--cur-cross)"></canvas>
        <div data-ffhint style="position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;color:var(--txt-3);font-size:13px">Drag to draw</div>
      </div>`;
  },
  ready(w) {
    const cv = w.node.querySelector('[data-ff]');
    let col = '#1d1d1f', dpr = Math.min(2, devicePixelRatio || 1), strokes = [];
    const fit = () => {
      const p = cv.parentElement;
      const r = { width: p.clientWidth, height: p.clientHeight };
      if (!r.width || !r.height) return;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.lineCap = 'round'; g.lineJoin = 'round';
      strokes.forEach(s => { g.strokeStyle = s.c; g.lineWidth = 3; g.beginPath(); s.p.forEach((pt, i) => i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])); g.stroke(); });
    };
    w.ffFit = fit; setTimeout(fit, 30); addEventListener('resize', fit);
    Bus.on('theme', () => { if (!w.dead) fit(); });
    on(w.node, 'click', '[data-pen]', (e, t) => { col = t.dataset.pen; $$('[data-pen]', w.node).forEach(b => b.classList.toggle('on', b === t)); });
    on(w.node, 'click', '[data-clear]', () => { strokes = []; fit(); w.node.querySelector('[data-ffhint]').style.opacity = '1'; });
    cv.addEventListener('pointerdown', e => {
      w.node.querySelector('[data-ffhint]').style.opacity = '0';
      const r = cv.getBoundingClientRect(), g = cv.getContext('2d');
      const s = { c: col, p: [[e.clientX - r.left, e.clientY - r.top]] };
      strokes.push(s);
      g.strokeStyle = col; g.lineWidth = 3;
      const mv = ev => {
        const p = [ev.clientX - r.left, ev.clientY - r.top];
        const last = s.p[s.p.length - 1];
        g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke();
        s.p.push(p);
      };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
  },
  onResize(w) { if (w.ffFit) w.ffFit(); }
};

/* Media-shelf apps share one shape */
function shelfApp(id, name, icon, title, rows, tint) {
  APPS[id] = {
    name, icon, w: 900, h: 600, minW: 520, minH: 340,
    menus: () => stdMenus(id),
    mount() {
      return titlebar(name, { right: `<div class="sfield" data-nodrag style="width:160px"><span>${ic('g-search')}</span><input placeholder="Search"></div>` }) +
        `<div class="scroll" style="flex:1;min-height:0;padding:18px 22px 28px;background:var(--win)">
          <h2 style="margin:0 0 3px;font-size:24px;font-weight:700;letter-spacing:-.025em">${esc(title)}</h2>
          <div style="font-size:12.5px;color:var(--txt-2);margin-bottom:18px">${esc(rows[0].sub)}</div>
          ${rows.map(r => `<div style="margin-bottom:26px">
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:11px"><h3 style="margin:0;font-size:16px;font-weight:650;letter-spacing:-.015em">${esc(r.head)}</h3>
            <span style="font-size:11.5px;color:var(--blue)">See All</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px 14px">
            ${r.items.map((it, i) => `<div class="alb"><div class="cv" style="aspect-ratio:${r.ratio || 1};border-radius:8px">${photoArt(i + r.seed)}<span class="pl">${ic('g-play')}</span></div>
              <b>${esc(it[0])}</b><span>${esc(it[1])}</span></div>`).join('')}</div></div>`).join('')}
        </div>`;
    }
  };
}
shelfApp('podcasts', 'Podcasts', 'app-podcasts', 'Listen Now', [
  { head: 'Up Next', sub: 'Six shows · 42 unplayed episodes', seed: 1, items: [['Design Details', 'Ep. 512 · Liquid Glass'], ['Syntax', 'Ep. 880 · One-file apps'], ['Acquired', 'Apple, Part IV'], ['The Talk Show', 'With John Gruber']] },
  { head: 'New Episodes', sub: '', seed: 5, items: [['Shop Talk', '2 hr ago'], ['Ship It', '5 hr ago'], ['Frontend First', 'Yesterday'], ['Hanselminutes', 'Yesterday']] },
]);
shelfApp('tv', 'TV', 'app-tv', 'Home', [
  { head: 'Continue Watching', sub: 'Apple TV+', seed: 2, ratio: 0.68, items: [['Severance', 'S2 · E4'], ['Silo', 'S2 · E7'], ['For All Mankind', 'S5 · E1'], ['Foundation', 'S3 · E9']] },
  { head: 'New & Noteworthy', sub: '', seed: 6, ratio: 0.68, items: [['The Studio', 'Comedy'], ['Presumed Innocent', 'Thriller'], ['Slow Horses', 'Drama'], ['Shrinking', 'Comedy']] },
]);
shelfApp('books', 'Books', 'app-books', 'Reading Now', [
  { head: 'Current', sub: '3 books in progress', seed: 3, ratio: 0.66, items: [['Refactoring UI', 'Wathan & Schoger'], ['The Design of Everyday Things', 'Norman'], ['Shape Up', 'Singer'], ['Thinking in Systems', 'Meadows']] },
  { head: 'Want to Read', sub: '', seed: 7, ratio: 0.66, items: [['Creative Selection', 'Kocienda'], ['Steal Like an Artist', 'Kleon'], ['The Making of Prince of Persia', 'Mechner'], ['Hackers & Painters', 'Graham']] },
]);
shelfApp('appstore', 'App Store', 'app-appstore', 'Discover', [
  { head: 'Featured', sub: 'Handpicked for you', seed: 4, items: [['CleanType', 'Typography utility'], ['Aurora Synth', 'Music'], ['Pattern Craft', 'Graphics'], ['Spark UI', 'Developer tools']] },
  { head: 'Top Free', sub: '', seed: 0, items: [['Raycast', 'Productivity'], ['Arc', 'Browser'], ['Figma', 'Design'], ['Warp', 'Terminal']] },
]);
APPS.facetime = {
  name: 'FaceTime', icon: 'app-facetime', w: 780, h: 560, minW: 440, minH: 320,
  menus: () => stdMenus('facetime'),
  mount(w) {
    w.st = {
      calls: [['Anna Haro', 'Outgoing', '24:12', 'Today 3:40 PM'], ['Design Crew', 'Missed', '', 'Today 11:02 AM'],
      ['John Appleseed', 'Incoming', '8:31', 'Yesterday'], ['Mom', 'Outgoing', '41:07', 'Saturday']],
      sel: 0, live: false, secs: 0, muted: false, cam: false,
    };
    return `<div class="wb">
      <div class="sbar" data-drag style="width:270px;padding-top:0"><div class="sb-top"><div data-tl></div></div>
        <div style="padding:0 10px 10px"><button class="btn pri" data-ftnew style="width:100%;height:28px">New FaceTime</button></div>
        <div style="overflow:auto;padding:0 8px" data-ftlist></div></div>
      <div class="wmain" style="background:#111114">
        <div class="tbar" data-drag style="height:52px;background:transparent;border:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#8a8a92;gap:12px;padding-bottom:20px" data-ftstage></div>
      </div></div>`;
  },
  ready(w) {
    const st = w.st;
    const initials = n => n.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    const render = () => {
      w.node.querySelector('[data-ftlist]').innerHTML = st.calls.map(([n, kind, len, when], i) => `
        <div class="si${i === st.sel ? ' on' : ''}" data-fti="${i}" style="height:46px;align-items:center">
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><b style="font-size:13px;font-weight:600">${esc(n)}</b>
          <span style="font-size:11px;color:${kind === 'Missed' ? 'var(--red)' : 'var(--txt-2)'}">${kind}${len ? ' · ' + len : ''}</span></span>
          <span style="font-size:10.5px;color:var(--txt-3)">${esc(when)}</span></div>`).join('');
      const c = st.calls[st.sel];
      const stage = w.node.querySelector('[data-ftstage]');
      if (!st.live) {
        stage.innerHTML = `
          <div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(150deg,#3a3a45,#1a1a20);display:grid;place-items:center;font-size:42px;color:#fff;font-weight:600">${esc(initials(c[0]))}</div>
          <div style="font-size:19px;color:#fff;font-weight:500">${esc(c[0])}</div>
          <div style="font-size:12.5px">${esc(c[1])}${c[2] ? ' · ' + c[2] : ''} — ${esc(c[3])}</div>
          <button class="btn pri" data-ftcall style="height:34px;padding:0 22px;border-radius:17px;margin-top:4px">${ic('g-facetime')}<span style="margin-left:6px">FaceTime</span></button>`;
        return;
      }
      stage.innerHTML = `
        <div style="width:150px;height:150px;border-radius:50%;position:relative;display:grid;place-items:center;font-size:52px;color:#fff;font-weight:600;
          background:${st.cam ? 'linear-gradient(150deg,#1d4b6e,#0d2436)' : 'linear-gradient(150deg,#3a3a45,#1a1a20)'}">
          ${st.cam ? '' : esc(initials(c[0]))}
          ${st.cam ? `<svg viewBox="0 0 40 40" style="width:60px;height:60px;opacity:.5"><use href="#g-display"></use></svg>` : ''}</div>
        <div style="font-size:19px;color:#fff;font-weight:500">${esc(c[0])}</div>
        <div style="font-size:12.5px;font-variant-numeric:tabular-nums" data-fttimer>${mmss(st.secs)}</div>
        <div style="display:flex;gap:12px;margin-top:6px">
          <button class="btn" data-ftmute title="${st.muted ? 'Unmute' : 'Mute'}" style="background:${st.muted ? '#fff' : '#2c2c30'};color:${st.muted ? '#111' : '#fff'};box-shadow:none;height:38px;width:38px;border-radius:50%;padding:0">${ic(st.muted ? 'g-vol-mute' : 'g-vol-hi')}</button>
          <button class="btn" data-ftend style="background:#ff453a;color:#fff;box-shadow:none;height:38px;padding:0 20px;border-radius:19px">End</button>
          <button class="btn" data-ftcam title="${st.cam ? 'Turn Off Video' : 'Turn On Video'}" style="background:${st.cam ? '#fff' : '#2c2c30'};color:${st.cam ? '#111' : '#fff'};box-shadow:none;height:38px;width:38px;border-radius:50%;padding:0">${ic('g-display')}</button>
        </div>`;
    };
    const start = () => {
      st.live = true; st.secs = 0;
      clearInterval(w.ftTimer);
      w.ftTimer = setInterval(() => {
        if (w.dead || !st.live) return;
        st.secs++;
        const t = w.node.querySelector('[data-fttimer]');
        if (t) t.textContent = mmss(st.secs);
      }, 1000);
      render();
    };
    on(w.node, 'click', '[data-fti]', (e, t) => { st.sel = +t.dataset.fti; st.live = false; render(); });
    on(w.node, 'click', '[data-ftcall]', start);
    on(w.node, 'click', '[data-ftmute]', () => { st.muted = !st.muted; render(); Toast(st.muted ? 'Microphone off' : 'Microphone on'); });
    on(w.node, 'click', '[data-ftcam]', () => { st.cam = !st.cam; render(); });
    on(w.node, 'click', '[data-ftend]', () => {
      st.live = false; clearInterval(w.ftTimer);
      st.calls[st.sel] = [st.calls[st.sel][0], 'Outgoing', mmss(st.secs), 'Just now'];
      render(); Toast('Call ended · ' + mmss(st.secs));
    });
    /* New FaceTime asks who, then dials — no dead primary button. */
    on(w.node, 'click', '[data-ftnew]', (e, t) => {
      const node = el(`<div class="pop" style="width:290px;padding:12px">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:8px">New FaceTime</div>
        <div class="sfield" style="width:100%"><span>${ic('g-search')}</span><input placeholder="Name or email" spellcheck="false"></div>
        <div style="display:flex;flex-direction:column;gap:1px;margin-top:10px;background:var(--line);border-radius:8px;overflow:hidden">
          ${['Anna Haro', 'David Taylor', 'Kate Bell', 'Mom'].map(n =>
        `<div class="mi" data-pick="${esc(n)}" style="background:var(--win-2);border-radius:0">${esc(n)}</div>`).join('')}</div>
        <button class="btn pri" data-go style="width:100%;height:26px;margin-top:10px">FaceTime</button></div>`);
      menuUnder(t, []); Pop.close(true);
      const r = t.getBoundingClientRect();
      Pop.open(node, { x: r.left, y: r.bottom + 6, origin: 'top left' });
      const inp = node.querySelector('input');
      setTimeout(() => inp.focus(), 50);
      const dial = name => {
        if (!name) return Toast('Enter a name to call');
        Pop.close();
        st.calls.unshift([name, 'Outgoing', '', 'Just now']); st.sel = 0;
        start();
      };
      on(node, 'click', '[data-pick]', (e2, p) => dial(p.dataset.pick));
      node.querySelector('[data-go]').onclick = () => dial(inp.value.trim());
      inp.addEventListener('keydown', e2 => { if (e2.key === 'Enter') dial(inp.value.trim()); });
    });
    render();
  },
  onClose(w) { clearInterval(w.ftTimer); }
};
/* ============================================================================
   25b · UTILITIES
   ========================================================================== */
APPS.activity = {
  name: 'Activity Monitor', icon: 'app-activity', w: 860, h: 560, minW: 560, minH: 340,
  menus: () => stdMenus('activity'),
  mount(w) {
    w.st = { tab: 'CPU' };
    return titlebar('Activity Monitor', {
      right: `<div class="seg" data-nodrag>${['CPU', 'Memory', 'Energy', 'Disk', 'Network'].map((t, i) =>
        `<button data-am="${t}" class="${i === 0 ? 'on' : ''}" style="width:auto;padding:0 9px;font-size:11.5px">${t}</button>`).join('')}</div>`
    }) + `<div class="wb col" style="background:var(--win)">
      <div class="fv-list scroll" style="flex:1">
        <div class="hd" data-head></div>
        <div data-proc></div>
      </div>
      <div style="flex:none;display:flex;gap:26px;align-items:center;height:70px;padding:0 20px;border-top:.5px solid var(--line);background:var(--win-2)">
        <div data-cpuring></div>
        <div style="display:grid;grid-template-columns:auto auto;gap:2px 14px;font-size:11.5px" data-legend></div>
        <div style="flex:1;height:44px;position:relative;overflow:hidden;border-radius:6px;background:var(--win-3)" data-graph></div>
      </div></div>`;
  },
  ready(w) {
    /* name, pid, cpu, threads, mem MB, user, energy, disk MB/s, net KB/s */
    const PROCS = [
      ['WindowServer', 214, 9.4, 24, 412.6, 'root', 8.2, 0.4, 12],
      ['kernel_task', 0, 6.1, 512, 1864, 'root', 3.1, 2.8, 6],
      ['Safari', 1841, 4.2, 31, 996.4, 'Ashhh', 21.4, 1.2, 486],
      ['Cursor Helper (Renderer)', 2290, 3.8, 42, 1240, 'Ashhh', 16.8, 0.9, 74],
      ['Terminal', 2461, 1.2, 8, 84.2, 'Ashhh', 1.1, 0.1, 0],
      ['Music', 1902, 0.9, 26, 288.1, 'Ashhh', 4.6, 0.6, 128],
      ['Finder', 620, 0.4, 12, 142.8, 'Ashhh', 0.8, 0.2, 2],
      ['Dock', 618, 0.3, 9, 96.4, 'Ashhh', 0.6, 0.0, 0],
      ['mds_stores', 340, 0.2, 7, 58.9, 'root', 0.4, 3.4, 0],
      ['bluetoothd', 188, 0.1, 5, 18.2, 'root', 0.2, 0.0, 1],
      ['loginwindow', 174, 0.0, 4, 22.6, 'Ashhh', 0.1, 0.0, 0],
      ['cfprefsd', 121, 0.0, 3, 9.4, 'root', 0.1, 0.1, 0],
    ];
    const mb = v => v >= 1024 ? (v / 1024).toFixed(2) + ' GB' : v.toFixed(1) + ' MB';
    /* Each tab is a different sort key, column set, ring and legend — the way the
       real app re-tables itself rather than just re-labelling one view. */
    const TABS = {
      CPU: {
        cols: ['Process Name', 'PID', '% CPU', 'Threads', 'Memory', 'User'], key: 2, hue: '#0a84ff',
        cells: p => [p[1], p[2].toFixed(1), p[3], mb(p[4]), p[5]], hot: p => p[2] > 5,
        ring: rows => clamp(rows.reduce((s, r) => s + r[2], 0), 0, 100),
        legend(rows) {
          const t = rows.reduce((s, r) => s + r[2], 0), sys = t * .38, usr = t * .62;
          return [['System', sys.toFixed(2) + '%'], ['User', usr.toFixed(2) + '%'], ['Idle', (100 - t).toFixed(2) + '%']];
        },
      },
      Memory: {
        cols: ['Process Name', 'PID', 'Memory', 'Threads', 'Compressed', 'User'], key: 4, hue: '#30d158',
        cells: p => [p[1], mb(p[4]), p[3], mb(p[4] * .18), p[5]], hot: p => p[4] > 900,
        ring: rows => clamp(rows.reduce((s, r) => s + r[4], 0) / 1310, 0, 100),
        legend(rows) {
          const used = rows.reduce((s, r) => s + r[4], 0) / 1024;
          return [['Physical', '128.00 GB'], ['Used', used.toFixed(2) + ' GB'], ['Cached', (used * .42).toFixed(2) + ' GB']];
        },
      },
      Energy: {
        cols: ['Process Name', 'PID', 'Energy Impact', '12 hr Power', 'App Nap', 'User'], key: 6, hue: '#ff9f0a',
        cells: p => [p[1], p[6].toFixed(1), (p[6] * .42).toFixed(2), p[6] < 1 ? 'Yes' : 'No', p[5]], hot: p => p[6] > 15,
        ring: rows => clamp(rows.reduce((s, r) => s + r[6], 0), 0, 100),
        legend: rows => [['Energy Impact', rows.reduce((s, r) => s + r[6], 0).toFixed(1)],
          ['Battery', SYS.battery + '%'], ['Remaining', '6:24']],
      },
      Disk: {
        cols: ['Process Name', 'PID', 'Bytes Read/s', 'Bytes Written/s', 'Reads In', 'User'], key: 7, hue: '#af52de',
        cells: p => [p[1], p[7].toFixed(2) + ' MB', (p[7] * .38).toFixed(2) + ' MB', Math.round(p[7] * 214), p[5]], hot: p => p[7] > 2,
        ring: rows => clamp(rows.reduce((s, r) => s + r[7], 0) * 9, 0, 100),
        legend: rows => [['Reads/s', rows.reduce((s, r) => s + r[7], 0).toFixed(2) + ' MB'],
          ['Writes/s', (rows.reduce((s, r) => s + r[7], 0) * .38).toFixed(2) + ' MB'], ['Total read', '284.6 GB']],
      },
      Network: {
        cols: ['Process Name', 'PID', 'Rcvd Bytes/s', 'Sent Bytes/s', 'Packets In', 'User'], key: 8, hue: '#5e5ce6',
        cells: p => [p[1], p[8].toFixed(0) + ' KB', (p[8] * .31).toFixed(0) + ' KB', Math.round(p[8] * 3.4), p[5]], hot: p => p[8] > 200,
        ring: rows => clamp(rows.reduce((s, r) => s + r[8], 0) / 12, 0, 100),
        legend: rows => [['Data received/s', rows.reduce((s, r) => s + r[8], 0).toFixed(0) + ' KB'],
          ['Data sent/s', (rows.reduce((s, r) => s + r[8], 0) * .31).toFixed(0) + ' KB'], ['Packets in', '1,284,602']],
      },
    };
    const hist = {}; Object.keys(TABS).forEach(k => hist[k] = [...Array(60)].map(() => 8 + Math.random() * 14));
    const tick = () => {
      if (w.dead) return;
      const T = TABS[w.st.tab], jit = s => (Math.random() - .5) * s;
      const rows = PROCS.map(p => {
        const q = p.slice();
        q[2] = Math.max(0, q[2] + jit(1.4)); q[6] = Math.max(0, q[6] + jit(1.8));
        q[7] = Math.max(0, q[7] + jit(.5)); q[8] = Math.max(0, q[8] + jit(40));
        return q;
      }).sort((a, b) => b[T.key] - a[T.key]);
      w.node.querySelector('[data-head]').innerHTML =
        T.cols.map((c, i) => `<span style="${i ? 'width:104px;text-align:right' : 'flex:1'}">${c}</span>`).join('');
      w.node.querySelector('[data-proc]').innerHTML = rows.map((p, i) => `
        <div class="r${i % 2 ? ' alt' : ''}"><span class="nm" style="flex:1">${esc(p[0])}</span>
          ${T.cells(p).map((v, k) => `<span style="width:104px;text-align:right;font-variant-numeric:tabular-nums;${k === 1 && T.hot(p) ? 'color:var(--red);font-weight:600;' : ''
        }${k === 4 ? 'color:var(--txt-2)' : ''}">${v}</span>`).join('')}</div>`).join('');
      w.node.querySelector('[data-legend]').innerHTML = T.legend(rows).map(([k, v]) =>
        `<span style="color:var(--txt-2)">${k}:</span><b style="font-variant-numeric:tabular-nums">${v}</b>`).join('');
      const C = 2 * Math.PI * 22, load = T.ring(rows) / 100;
      w.node.querySelector('[data-cpuring]').innerHTML = `<svg viewBox="0 0 52 52" style="width:52px;height:52px">
        <circle cx="26" cy="26" r="22" fill="none" stroke="var(--fill-2)" stroke-width="6"/>
        <circle cx="26" cy="26" r="22" fill="none" stroke="${T.hue}" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - load)}" transform="rotate(-90 26 26)"/>
        <text x="26" y="29.5" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">${Math.round(load * 100)}%</text></svg>`;
      const h = hist[w.st.tab];
      h.push(clamp(load * 100, 2, 96)); h.shift();
      const pts = h.map((v, i) => `${(i / (h.length - 1) * 100).toFixed(2)},${(100 - v).toFixed(1)}`).join(' ');
      w.node.querySelector('[data-graph]').innerHTML =
        `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%">
          <polygon points="0,100 ${pts} 100,100" fill="${T.hue}30"/>
          <polyline points="${pts}" fill="none" stroke="${T.hue}" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;
    };
    on(w.node, 'click', '[data-am]', (e, t) => {
      w.st.tab = t.dataset.am;
      $$('[data-am]', w.node).forEach(b => b.classList.toggle('on', b === t));
      tick();
    });
    tick(); w.actTimer = setInterval(tick, 1400);
  },
  onClose(w) { clearInterval(w.actTimer); }
};

APPS.diskutil = {
  name: 'Disk Utility', icon: 'app-diskutil', w: 800, h: 520, minW: 560, minH: 340,
  menus: () => stdMenus('diskutil'),
  mount() {
    const used = 842, total = 2048, pct = used / total;
    const seg = [['Apps', 214, '#0a84ff'], ['Documents', 168, '#30d158'], ['Photos', 296, '#ff9f0a'], ['System', 164, '#8e8e93']];
    return `<div class="wb">
      <div class="sbar" data-drag style="width:222px">
        <div style="display:flex;align-items:center;height:38px;padding:0 12px"><div data-tl></div></div>
        <div class="grp"><div class="gh">Internal</div>
          <div class="si">${ic('g-hd', 'ico')}<span class="nm">APPLE SSD AP2048</span></div>
          <div class="si on" style="padding-left:26px">${ic('g-hd', 'ico')}<span class="nm">Macintosh HD</span></div>
          <div class="si" style="padding-left:26px">${ic('g-hd', 'ico')}<span class="nm">Data</span></div>
        </div>
        <div class="grp"><div class="gh">External</div>
          <div class="si">${ic('g-hd', 'ico')}<span class="nm">Backup T7</span></div></div>
      </div>
      <div class="wmain">
        <div class="tbar" data-drag style="height:52px">
          <button class="tbtn" data-nodrag data-duadd title="Add Volume">${ic('g-plus')}</button>
          <button class="tbtn" data-nodrag data-durm title="Remove Volume">${ic('g-minus')}</button>
          <div class="fx-title">Macintosh HD</div><div style="flex:1"></div>
          <button class="btn" data-nodrag data-dufa>First Aid</button>
          <button class="btn" data-nodrag data-duerase>Erase</button>
        </div>
        <div class="scroll" style="flex:1;padding:24px 28px">
          <div style="display:flex;gap:18px;align-items:center">
            <div style="width:74px;height:74px">${ic('f-hd')}</div>
            <div><div style="font-size:20px;font-weight:600;letter-spacing:-.02em">Macintosh HD</div>
              <div style="font-size:12.5px;color:var(--txt-2)">APFS Volume · Internal · Encrypted</div></div>
          </div>
          <div style="margin-top:22px;height:30px;border-radius:6px;overflow:hidden;display:flex;box-shadow:0 0 0 .5px var(--line)">
            ${seg.map(([, v, c]) => `<div style="width:${v / total * 100}%;background:${c}"></div>`).join('')}
            <div style="flex:1;background:var(--win-3)"></div>
          </div>
          <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;font-size:12px">
            ${seg.map(([n, v, c]) => `<span style="display:flex;align-items:center;gap:6px">
              <i style="width:9px;height:9px;border-radius:2px;background:${c};display:block"></i>${n} — ${v} GB</span>`).join('')}
            <span style="display:flex;align-items:center;gap:6px;color:var(--txt-2)">
              <i style="width:9px;height:9px;border-radius:2px;background:var(--win-3);display:block"></i>Free — ${total - used} GB</span>
          </div>
          <div style="margin-top:24px;display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--line);border-radius:10px;overflow:hidden">
            ${[['Mount Point', '/'], ['Capacity', '2.05 TB'], ['Available', `${((total - used) / 1000).toFixed(2)} TB (${(100 - pct * 100).toFixed(0)}%)`],
        ['Used', `${(used / 1000).toFixed(2)} TB`], ['Type', 'APFS Volume'], ['Owners', 'Enabled'],
        ['Connection', 'PCI-Express'], ['Device', 'disk3s5s1']]
        .map(([k, v]) => `<div style="background:var(--win-2);padding:9px 14px;display:flex;justify-content:space-between;font-size:12.5px">
              <span style="color:var(--txt-2)">${k}:</span><b style="font-weight:550">${v}</b></div>`).join('')}
          </div></div></div></div>`;
  },
  ready(w) {
    /* First Aid runs a real progress sheet; Erase asks first, and refuses the boot
       volume the way Disk Utility does. */
    on(w.node, 'click', '[data-dufa]', () => {
      const node = el(`<div class="pop" style="width:400px;padding:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">First Aid</div>
        <div style="font-size:12px;color:var(--txt-2);margin-bottom:12px">Checking Macintosh HD for errors.</div>
        <div style="height:6px;border-radius:3px;background:var(--fill-2);overflow:hidden"><i data-bar style="display:block;height:100%;width:0;background:var(--blue);transition:width .3s linear"></i></div>
        <pre data-log style="margin:10px 0 0;font:11px/1.55 var(--mono);color:var(--txt-2);max-height:110px;overflow:auto;white-space:pre-wrap"></pre>
        <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn pri" data-done style="height:24px" disabled>Done</button></div></div>`);
      Pop.open(node, { x: innerWidth / 2 - 200, y: 160, origin: 'top center' });
      const steps = ['Running First Aid on “Macintosh HD”', 'Checking the container superblock',
        'Checking the object map', 'Checking the fsroot tree', 'Checking the snapshot metadata tree',
        'Verifying allocated space', 'The volume Macintosh HD appears to be OK', 'Operation successful.'];
      const log = node.querySelector('[data-log]'), bar = node.querySelector('[data-bar]');
      steps.forEach((s, i) => setTimeout(() => {
        if (!node.isConnected) return;
        log.textContent += s + '\n'; log.scrollTop = log.scrollHeight;
        bar.style.width = ((i + 1) / steps.length * 100) + '%';
        if (i === steps.length - 1) { const d = node.querySelector('[data-done]'); d.disabled = false; d.onclick = () => Pop.close(); }
      }, 260 + i * 340));
    });
    on(w.node, 'click', '[data-duerase]', () => {
      const node = el(`<div class="pop" style="width:340px;padding:16px;text-align:center">
        <div style="width:52px;height:52px;margin:0 auto 10px">${ic('f-hd')}</div>
        <div style="font-size:13px;font-weight:600">Erase “Macintosh HD”?</div>
        <div style="font-size:12px;color:var(--txt-2);margin:6px 0 14px">This is the startup disk. Erasing it would take the whole desktop with it — including this window.</div>
        <div style="display:flex;gap:8px"><button class="btn" data-x style="flex:1;height:26px">Cancel</button>
          <button class="btn" data-e style="flex:1;height:26px;background:var(--red);color:#fff">Erase</button></div></div>`);
      Pop.open(node, { x: innerWidth / 2 - 170, y: 180, origin: 'top center' });
      node.querySelector('[data-x]').onclick = () => Pop.close();
      node.querySelector('[data-e]').onclick = () => { Pop.close(); Toast('Erase blocked — cannot erase the startup disk'); };
    });
    on(w.node, 'click', '[data-duadd]', () => Toast('Add APFS Volume — container is at capacity'));
    on(w.node, 'click', '[data-durm]', () => Toast('Select a non-system volume to remove'));
  }
};

APPS.fontbook = {
  name: 'Font Book', icon: 'app-fontbook', w: 820, h: 560, minW: 540, minH: 340,
  menus: () => stdMenus('fontbook'),
  mount(w) {
    w.st = { sel: 0 };
    const FONTS = [
      ['SF Pro', '-apple-system,BlinkMacSystemFont,Inter,sans-serif', 'Regular · Medium · Semibold · Bold'],
      ['Inter', 'Inter,sans-serif', 'Variable 100–900'],
      ['Helvetica Neue', '"Helvetica Neue",Helvetica,sans-serif', 'Regular · Bold · Italic'],
      ['Georgia', 'Georgia,serif', 'Regular · Italic · Bold'],
      ['Times New Roman', '"Times New Roman",Times,serif', 'Regular · Bold'],
      ['JetBrains Mono', '"JetBrains Mono",ui-monospace,monospace', 'Regular · Bold'],
      ['Courier New', '"Courier New",monospace', 'Regular · Bold'],
      ['Impact', 'Impact,sans-serif', 'Regular'],
    ];
    w.FONTS = FONTS;
    return `<div class="wb">
      <div class="sbar" data-drag style="width:230px">
        <div style="display:flex;align-items:center;height:38px;padding:0 12px"><div data-tl></div></div>
        <div class="grp"><div class="gh">Collection</div>
          <div class="si on">${ic('g-title', 'ico')}<span class="nm">All Fonts</span><span class="tail">${FONTS.length}</span></div>
          <div class="si">${ic('g-star', 'ico')}<span class="nm">Favourites</span></div>
          <div class="si">${ic('g-tag', 'ico')}<span class="nm">Recently Used</span></div>
        </div>
        <div class="grp"><div class="gh">Family</div>
          ${FONTS.map(([n], i) => `<div class="si" data-fi="${i}"><span class="nm" style="font-family:${FONTS[i][1]}">${esc(n)}</span></div>`).join('')}
        </div>
      </div>
      <div class="wmain">
        <div class="tbar" data-drag style="height:52px"><div class="fx-title" data-fname></div><div style="flex:1"></div>
          <div class="sfield" data-nodrag style="width:150px"><span>${ic('g-search')}</span><input placeholder="Search"></div></div>
        <div class="scroll" style="flex:1;padding:26px 30px" data-fbody></div>
      </div></div>`;
  },
  ready(w) {
    const render = i => {
      const [n, f, styles] = w.FONTS[i];
      $$('[data-fi]', w.node).forEach(b => b.classList.toggle('on', +b.dataset.fi === i));
      w.node.querySelector('[data-fname]').textContent = n;
      w.node.querySelector('[data-fbody]').innerHTML = `
        <div style="font-family:${f};font-size:64px;line-height:1.1;letter-spacing:-.03em">Aa Bb Cc</div>
        <div style="font-size:12px;color:var(--txt-2);margin:6px 0 22px">${esc(styles)}</div>
        ${[42, 30, 22, 17, 13, 11].map(s => `<div style="font-family:${f};font-size:${s}px;line-height:1.35;margin-bottom:9px;letter-spacing:-.01em">
          The quick brown fox jumps over the lazy dog. 0123456789</div>`).join('')}`;
    };
    on(w.node, 'click', '[data-fi]', (e, t) => render(+t.dataset.fi));
    render(0);
  }
};

APPS.voice = {
  name: 'Voice Memos', icon: 'app-voice', w: 720, h: 500, minW: 460, minH: 320,
  menus: () => stdMenus('voice'),
  mount(w) {
    const M = [['Standup notes', 'Today 4:02 PM', '1:12'], ['Dock easing idea', 'Today 11:40 AM', '0:38'],
    ['Call with Daniel', 'Yesterday', '14:26'], ['Guitar riff', 'Saturday', '2:04']];
    w.M = M;
    return `<div class="wb">
      <div class="sbar" data-drag style="width:260px;padding-top:0">
        <div style="display:flex;align-items:center;height:38px;padding:0 12px"><div data-tl></div></div>
        <div style="padding:0 10px 8px"><div class="sfield" data-nodrag><span>${ic('g-search')}</span><input placeholder="Search"></div></div>
        <div style="overflow:auto;padding:0 8px">
        ${M.map(([n, d, l], i) => `<div class="si" data-vi="${i}" style="height:44px;align-items:center">
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><b style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n)}</b>
          <span style="font-size:11px;color:var(--txt-2)">${esc(d)}</span></span>
          <span style="font-size:11.5px;color:var(--txt-3);font-variant-numeric:tabular-nums">${l}</span></div>`).join('')}
        </div></div>
      <div class="wmain"><div class="tbar" data-drag style="height:52px"><div class="fx-title" data-vname></div></div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:20px 30px" data-vbody></div>
      </div></div>`;
  },
  ready(w) {
    const bars = n => [...Array(n)].map((_, i) => {
      const h = 8 + Math.abs(Math.sin(i * .7) * 40) + Math.abs(Math.sin(i * .23) * 22);
      return `<i style="height:${h.toFixed(0)}%"></i>`;
    }).join('');
    const secs = l => { const [m, s] = l.split(':').map(Number); return m * 60 + s; };
    const st = w.st = { i: 0, pos: 0, playing: false };
    const render = i => {
      if (i !== undefined && i !== st.i) { st.i = i; st.pos = 0; st.playing = false; }
      const [n, d, l] = w.M[st.i], dur = secs(l);
      $$('[data-vi]', w.node).forEach(b => b.classList.toggle('on', +b.dataset.vi === st.i));
      w.node.querySelector('[data-vname]').textContent = n;
      w.node.querySelector('[data-vbody]').innerHTML = `
        <div style="font-size:19px;font-weight:600;letter-spacing:-.02em">${esc(n)}</div>
        <div style="font-size:12px;color:var(--txt-2);margin-top:-12px">${esc(d)}</div>
        <div class="wave" data-vwave>${bars(78)}</div>
        <div style="display:flex;align-items:center;gap:10px;width:100%;max-width:420px;font-size:11px;color:var(--txt-2);font-variant-numeric:tabular-nums">
          <span data-vcur>0:00</span><div class="sl" data-vbar style="flex:1"><i style="width:0%"></i><b style="left:0%"></b></div><span>${l}</span></div>
        <div style="display:flex;align-items:center;gap:26px;margin-top:4px">
          <button class="tbtn" data-vskip="-5" title="Back 5s">${ic('g-bwd')}</button>
          <button class="btn pri" data-vplay style="width:46px;height:46px;border-radius:50%;padding:0;display:grid;place-items:center">${ic(st.playing ? 'g-pause' : 'g-play')}</button>
          <button class="tbtn" data-vskip="5" title="Forward 5s">${ic('g-fwd')}</button></div>`;
      w.node.querySelector('.btn.pri svg').style.cssText = 'width:17px;height:17px';
      paint(dur);
    };
    /* The waveform dims ahead of the playhead, which is how you can tell it is
       actually playing rather than just animating a bar. */
    const paint = dur => {
      const f = clamp(st.pos / dur, 0, 1);
      const bar = w.node.querySelector('[data-vbar]');
      if (!bar) return;
      bar.querySelector('i').style.width = f * 100 + '%';
      bar.querySelector('b').style.left = f * 100 + '%';
      w.node.querySelector('[data-vcur]').textContent = mmss(Math.round(st.pos));
      const wave = w.node.querySelector('[data-vwave]');
      const n = wave.children.length;
      [...wave.children].forEach((b, k) => b.style.opacity = k / n <= f ? '1' : '.32');
    };
    on(w.node, 'click', '[data-vi]', (e, t) => render(+t.dataset.vi));
    on(w.node, 'click', '[data-vplay]', () => { st.playing = !st.playing; render(); });
    on(w.node, 'click', '[data-vskip]', (e, t) => {
      const dur = secs(w.M[st.i][2]);
      st.pos = clamp(st.pos + +t.dataset.vskip, 0, dur); paint(dur);
    });
    on(w.node, 'pointerdown', '[data-vbar]', (e, t) => {
      const dur = secs(w.M[st.i][2]), r = t.getBoundingClientRect();
      const move = ev => { st.pos = clamp((ev.clientX - r.left) / r.width, 0, 1) * dur; paint(dur); };
      move(e);
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    });
    w.vTimer = setInterval(() => {
      if (w.dead || !st.playing) return;
      const dur = secs(w.M[st.i][2]);
      st.pos += .25;
      if (st.pos >= dur) { st.pos = dur; st.playing = false; render(); return; }
      paint(dur);
    }, 250);
    render(0);
  },
  onClose(w) { clearInterval(w.vTimer); }
};

APPS.launchpad = { name: 'Launchpad', icon: 'app-launchpad', overlay: true };
APPS.trash = { name: 'Trash', icon: 'app-trash', overlay: true };
/* ============================================================================
   26 · LAUNCHPAD
   ========================================================================== */
const LAUNCH_ORDER = ['finder', 'safari', 'mail', 'messages', 'maps', 'photos', 'facetime',
  'calendar', 'contacts', 'reminders', 'notes', 'freeform', 'voice', 'appstore',
  'podcasts', 'music', 'tv', 'books', 'stocks', 'weather', 'clock',
  'terminal', 'activity', 'diskutil', 'fontbook', 'calculator', 'textedit', 'preview',
  'settings', 'about'];
const PER_PAGE = 28;   /* 7 × 4, like the real grid at this height */

const Launchpad = {
  page: 0,
  toggle() { $('#lpad') ? this.close() : this.open(); },
  open() {
    if ($('#lpad')) return;
    Pop.close(true);
    this.page = 0; this.q = '';
    const node = el(`<div id="lpad" class="nosel">
      <div class="sq">${ic('g-search')}<input placeholder="Search" data-lq spellcheck="false"></div>
      <div class="grid" data-lgrid></div>
      <div class="dots" data-ldots></div></div>`);
    $('#layer-overlay').append(node);
    this.render();
    node.addEventListener('pointerdown', e => { if (e.target === node || e.target.classList.contains('grid')) this.close(); });
    on(node, 'click', '.app', (e, t) => {
      const id = t.dataset.app;
      this.close();
      setTimeout(() => Dock.activate(id), 90);
    });
    on(node, 'contextmenu', '.app', (e, t) => ctxMenu(e, [
      { id: 'o', label: 'Open', run: () => { this.close(); Dock.activate(t.dataset.app); } },
      { id: 'd', label: 'Add to Dock' }, { id: 'x', label: 'Delete', disabled: true },
    ]));
    const inp = node.querySelector('[data-lq]');
    inp.addEventListener('input', () => { this.q = inp.value; this.page = 0; this.render(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
      if (e.key === 'Enter') { const first = node.querySelector('.app'); if (first) first.click(); }
      if (!this.q && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); this.turn(e.key === 'ArrowRight' ? 1 : -1); }
    });
    setTimeout(() => inp.focus(), 120);
    node.addEventListener('wheel', e => {
      if (this.q) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { if (e.deltaX > 12) this.turn(1); else if (e.deltaX < -12) this.turn(-1); }
    }, { passive: true });
  },
  turn(d) {
    const pages = Math.ceil(LAUNCH_ORDER.length / PER_PAGE);
    const p = clamp(this.page + d, 0, pages - 1);
    if (p !== this.page) { this.page = p; this.render(); }
  },
  render() {
    const node = $('#lpad'); if (!node) return;
    let ids = LAUNCH_ORDER;
    if (this.q) { const q = this.q.toLowerCase(); ids = ids.filter(i => APPS[i].name.toLowerCase().includes(q)); }
    const pages = Math.max(1, Math.ceil(ids.length / PER_PAGE));
    this.page = clamp(this.page, 0, pages - 1);
    const slice = ids.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
    node.querySelector('[data-lgrid]').innerHTML = slice.map(id =>
      `<div class="app" data-app="${id}"><div class="art">${ic(APPS[id].icon)}</div><div class="nm">${esc(APPS[id].name)}</div></div>`).join('')
      || `<div style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,.75);font-size:14px;padding-top:40px;text-shadow:0 1px 3px rgba(0,0,0,.4)">No results</div>`;
    node.querySelector('[data-ldots]').innerHTML = pages > 1
      ? [...Array(pages)].map((_, i) => `<i class="${i === this.page ? 'on' : ''}"></i>`).join('') : '';
  },
  close() {
    const node = $('#lpad'); if (!node) return;
    node.classList.add('out');
    setTimeout(() => node.remove(), 200);
  }
};

/* ============================================================================
   27 · SPOTLIGHT
   ========================================================================== */
const SPOT_ACTIONS = [
  { name: 'Toggle Dark Mode', kind: 'Action', icon: 'g-moon', run: () => Theme.toggle() },
  { name: 'Open Launchpad', kind: 'Action', icon: 'app-launchpad', run: () => Launchpad.open() },
  { name: 'Notification Centre', kind: 'Action', icon: 'g-cc', run: () => NotifCenter.open() },
  { name: 'Empty Trash', kind: 'Action', icon: 'app-trash', run: () => { Dock.setTrashFull(false); Toast('Trash emptied'); } },
  { name: 'Change Wallpaper', kind: 'Action', icon: 'g-globe', run: () => WM.open('settings', { section: 'wallpaper' }) },
  { name: 'Sleep', kind: 'Action', icon: 'g-power', run: () => Screen.sleep() },
];

const Spotlight = {
  sel: 0, results: [],
  toggle() { $('#spot') ? this.close() : this.open(); },
  open() {
    if ($('#spot')) return;
    Pop.close(true);
    const node = el(`<div id="spot" class="nosel"><div class="scrim"></div>
      <div class="box"><div class="qrow">${ic('g-spot')}<input data-sq placeholder="Spotlight Search" spellcheck="false" autocomplete="off"></div>
      <div class="res scroll" data-sres"></div></div></div>`);
    $('#layer-overlay').append(node);
    node.querySelector('.scrim').addEventListener('pointerdown', () => this.close());
    const inp = node.querySelector('[data-sq]');
    inp.addEventListener('input', () => this.search(inp.value));
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); this.fire(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    });
    on(node, 'click', '.r', (e, t) => { this.sel = +t.dataset.i; this.fire(); });
    on(node, 'mousemove', '.r', (e, t) => { if (this.sel !== +t.dataset.i) { this.sel = +t.dataset.i; this.mark(); } });
    setTimeout(() => inp.focus(), 30);
    this.search('');
  },
  search(q) {
    const node = $('#spot'); if (!node) return;
    q = q.trim();
    const res = node.querySelector('.res');
    this.sel = 0;
    if (!q) { this.results = []; res.innerHTML = ''; return; }
    const lq = q.toLowerCase();
    const apps = LAUNCH_ORDER.filter(i => APPS[i].name.toLowerCase().includes(lq))
      .map(i => ({ name: APPS[i].name, kind: 'Application', icon: APPS[i].icon, run: () => Dock.activate(i) }));
    const acts = SPOT_ACTIONS.filter(a => a.name.toLowerCase().includes(lq));
    /* Bundles found on disk belong under Applications, not Documents. */
    const found = Finder.deepSearch(FS, lq).slice(0, 12).map(f => ({
      name: f.name,
      kind: f.kind === 'folder' ? 'Folder' : /\.app$/.test(f.name) ? 'Application' : (f.k || 'Document'),
      icon: f.icon,
      run: () => f.kind === 'folder' ? WM.open('finder', { path: Finder.findPath(FS, f) || PLACES.Ashhh }) : Finder.openFile(f)
    }));
    const notes = NOTE_SEED.filter(n => n.title.toLowerCase().includes(lq)).slice(0, 3)
      .map(n => ({ name: n.title, kind: 'Note', icon: 'app-notes', run: () => WM.open('notes') }));
    const web = [{ name: `Search the web for “${q}”`, kind: 'Safari', icon: 'app-safari', run: () => Saf.go('search:' + q) }];
    /* Prefer the real app entry over its .app file for the same name */
    const seen = new Set(apps.map(a => a.name.toLowerCase() + '.app'));

    const groups = [
      ['Top Hit', (apps[0] ? [apps[0]] : acts[0] ? [acts[0]] : found[0] ? [found[0]] : [])],
      ['Applications', apps.concat(found.filter(f => f.kind === 'Application' && !seen.has(f.name.toLowerCase())))],
      ['Actions', acts],
      ['Documents', found.filter(f => f.kind !== 'Folder' && f.kind !== 'Application')],
      ['Folders', found.filter(f => f.kind === 'Folder')],
      ['Notes', notes],
      ['Suggested Websites', web],
    ];
    this.results = [];
    let html = '';
    groups.forEach(([g, items]) => {
      const uniq = items.filter(it => !this.results.some(r => r.name === it.name && r.kind === it.kind));
      if (!uniq.length) return;
      html += `<div class="cat">${g}</div>`;
      uniq.slice(0, 6).forEach(it => {
        const i = this.results.length; this.results.push(it);
        html += `<div class="r" data-i="${i}"><span class="art">${ic(it.icon)}</span><span class="nm">${esc(it.name)}</span><span class="kind">${esc(it.kind)}</span></div>`;
      });
    });
    res.innerHTML = html || `<div class="empty">No results for “${esc(q)}”</div>`;
    this.mark();
  },
  mark() {
    const node = $('#spot'); if (!node) return;
    $$('.r', node).forEach(r => r.classList.toggle('on', +r.dataset.i === this.sel));
    const on2 = node.querySelector('.r.on');
    if (on2) on2.scrollIntoView({ block: 'nearest' });
  },
  move(d) { if (!this.results.length) return; this.sel = clamp(this.sel + d, 0, this.results.length - 1); this.mark(); },
  fire() {
    const r = this.results[this.sel];
    this.close();
    if (r && r.run) setTimeout(() => r.run(), 60);
  },
  close() {
    const node = $('#spot'); if (!node) return;
    node.classList.add('out');
    setTimeout(() => node.remove(), 150);
  }
};

/* ============================================================================
   28 · WIDGETS  (shared by the desktop and Notification Centre)
   ========================================================================== */
function analogClock(d, size = 130) {
  const s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
  const A = (deg, r1, r2, w, col, cap = 'round') => {
    const a = (deg - 90) * Math.PI / 180;
    return `<line x1="${50 + Math.cos(a) * r1}" y1="${50 + Math.sin(a) * r1}" x2="${50 + Math.cos(a) * r2}" y2="${50 + Math.sin(a) * r2}" stroke="${col}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
  };
  const ticks = [...Array(60)].map((_, i) => {
    const a = (i * 6 - 90) * Math.PI / 180, big = i % 5 === 0;
    const r1 = big ? 38 : 40.5, r2 = 43.5;
    return `<line x1="${50 + Math.cos(a) * r1}" y1="${50 + Math.sin(a) * r1}" x2="${50 + Math.cos(a) * r2}" y2="${50 + Math.sin(a) * r2}"
      stroke="currentColor" stroke-opacity="${big ? .78 : .28}" stroke-width="${big ? 2 : 1}" stroke-linecap="round"/>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" style="width:${size}px;height:${size}px;color:var(--txt)">
    <circle cx="50" cy="50" r="47" fill="var(--win)" stroke="var(--line)" stroke-width="1"/>
    ${ticks}
    ${A(h * 30, -4, 25, 4.4, 'currentColor')}
    ${A(m * 6, -6, 36, 3, 'currentColor')}
    ${A(s * 6, -9, 38, 1.2, '#ff453a')}
    <circle cx="50" cy="50" r="2.6" fill="currentColor"/><circle cx="50" cy="50" r="1.2" fill="#ff453a"/>
  </svg>`;
}

const Widgets = {
  /* Painted inline, not on the first tick: everySecond() fires before the node is
     in the document, so an isConnected guard would leave the face blank for up to
     a second every time the panel opens. */
  clock(o = {}) {
    const now = new Date(), sz = o.compact ? 118 : 132;
    const face = d => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONS[d.getMonth()]}`;
    const n = el(`<div class="wgt"><div class="clockw" data-cl>${analogClock(now, sz)}</div>
      <div style="text-align:center;font-size:12.5px;font-weight:600;margin-top:2px" data-cd>${face(now)}</div></div>`);
    everySecond(d => {
      if (!n.isConnected) return;
      n.querySelector('[data-cl]').innerHTML = analogClock(d, sz);
      n.querySelector('[data-cd]').textContent = face(d);
    });
    return n;
  },
  clockSq() {
    const n = el(`<div class="wgt sqw"><div class="clockw" data-cl>${analogClock(new Date(), 124)}</div></div>`);
    everySecond(d => { if (n.isConnected) n.querySelector('[data-cl]').innerHTML = analogClock(d, 124); });
    return n;
  },
  batterySq() {
    const pct = SYS.battery, C = 2 * Math.PI * 40;
    const col = !SYS.charging && pct <= 20 ? '#ff9f0a' : '#30d158';
    const mins = Math.round(pct / 100 * 11.4 * 60);
    const n = el(`<div class="wgt sqw batsq"><div class="wh"><span class="t">Battery</span></div>
      <div class="rw"><svg viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="var(--fill-2)" stroke-width="8"/>
        <circle cx="48" cy="48" r="40" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}" transform="rotate(-90 48 48)"/>
        </svg><b>${pct}%</b></div>
      <div class="sub">${SYS.charging ? 'Charging' : `${Math.floor(mins / 60)}h ${mins % 60}m left`}</div></div>`);
    Bus.on('battery', () => { if (n.isConnected) n.replaceWith(Widgets.batterySq()); });
    return n;
  },
  weather(o = {}) {
    const n = el(`<div class="wgt"><div class="wx" data-wxw></div></div>`);
    const paint = () => {
      if (!n.isConnected && !o.compact) return;
      const c = Wx.now(), hrs = Wx.hours(5), [label, glyph] = Wx.code(c.code, c.day);
      n.querySelector('[data-wxw]').innerHTML = `
        <div class="loc">${esc(Wx.place)}</div>
        <div class="now"><span class="deg">${c.t}°</span><span class="ico">${ic(glyph)}</span></div>
        <div class="cond">${esc(label)}</div><div class="hi">H:${c.hi}° L:${c.lo}°</div>
        <div class="hours">${hrs.map(([h, t, g]) => `<div><span>${esc(h)}</span>${ic(g)}<b>${t}°</b></div>`).join('')}</div>`;
    };
    paint();
    Wx.load().then(paint);
    Bus.on('wx', paint);
    n.addEventListener('dblclick', () => WM.open('weather'));
    return n;
  },
  stocks(o = {}) {
    const n = el(`<div class="wgt"><div class="wh"><span class="t">Stocks</span><span class="s">${time12(new Date())}</span></div>
      <div class="stk">${TICKERS.slice(0, 3).map((t, i) => `<div class="row ${t.up ? 'up' : 'dn'}">
        <span class="sym"><b>${t.s}</b><span>${esc(t.n)}</span></span>
        <span class="spark">${spark(t.up, 90, 26, i)}</span>
        <span class="num"><b>${t.p.toFixed(2)}</b><span>${t.up ? '+' : ''}${t.d.toFixed(2)}%</span></span></div>`).join('')}</div></div>`);
    n.addEventListener('dblclick', () => WM.open('stocks'));
    return n;
  },
  calendar(o = {}) {
    const d = new Date();
    const fill = n => {
      const evs = evOn(d.getFullYear(), d.getMonth(), d.getDate());
      n.innerHTML = `<div class="dow">${DAYS[d.getDay()]}</div><div class="dnum">${d.getDate()}</div>
      ${evs.length ? evs.map(e => `<div class="ev"><i style="background:${e.c}"></i><div class="b"><b>${esc(e.t)}</b><span>${esc(e.at)}</span></div></div>`).join('')
          : '<div class="none">No more events today.</div>'}`;
    };
    const n = el(`<div class="wgt calw"></div>`);
    fill(n);
    /* Adding, moving or hiding an event in Calendar has to show up here too. */
    Bus.on('events', () => { if (n.isConnected) fill(n); });
    n.addEventListener('dblclick', () => WM.open('calendar'));
    return n;
  },
  battery(o = {}) {
    const pct = SYS.battery, C = 2 * Math.PI * 27;
    const col = SYS.charging ? '#30d158' : pct <= 20 ? '#ff9f0a' : '#30d158';
    const mins = Math.round(pct / 100 * 11.4 * 60);
    const n = el(`<div class="wgt sm"><div class="wh"><span class="t">Battery</span></div>
      <div class="batw"><svg class="ring" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="27" fill="none" stroke="var(--fill-2)" stroke-width="7"/>
        <circle cx="32" cy="32" r="27" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}" transform="rotate(-90 32 32)"/>
        </svg>
        <div class="info"><b>${pct}%</b><span>${SYS.charging ? 'Charging' : `${Math.floor(mins / 60)}h ${mins % 60}m left`}</span></div></div></div>`);
    Bus.on('battery', () => { if (n.isConnected) n.replaceWith(Widgets.battery(o)); });
    return n;
  },
  reminders() {
    const items = [['Send brand review feedback', '#ff375f'], ['Review PR #142', '#0a84ff'], ['Pick up dry cleaning', '#ff9f0a']];
    const n = el(`<div class="wgt"><div class="wh"><span class="t">Today</span><span class="s">3 remaining</span></div>
      ${items.map(([t, c]) => `<div style="display:flex;gap:9px;align-items:center;padding:5px 0;border-top:.5px solid var(--line)">
        <span style="width:15px;height:15px;border-radius:50%;border:1.6px solid ${c};flex:none"></span>
        <span style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t)}</span></div>`).join('')}</div>`);
    n.addEventListener('dblclick', () => WM.open('reminders'));
    return n;
  }
};

/* ============================================================================
   29 · NOTIFICATION CENTRE
   ========================================================================== */
const NotifCenter = {
  toggle() { $('#nc') ? this.close() : this.open(); },
  open() {
    if ($('#nc')) return;
    Pop.close(true);
    const scrim = el(`<div id="nc-scrim"></div>`);
    const node = el(`<div id="nc" class="nosel"><div class="nc-scroll"></div></div>`);
    const box = node.querySelector('.nc-scroll');
    const row = el(`<div class="nc-row"></div>`);
    row.append(Widgets.clockSq(), Widgets.batterySq());
    box.append(row, Widgets.weather(), Widgets.calendar(), Widgets.stocks(), Widgets.reminders());
    box.insertAdjacentHTML('beforeend', `<div class="nc-title">Earlier Today</div>`);
    [
      ['app-messages', 'Messages', 'Kate', 'bringing coffee AND a blanket, i know how you drive', '4:28 PM'],
      ['app-mail', 'Mail', 'Figma', 'Daniel left 3 comments on Desktop v4', '4:21 PM'],
      ['app-calendar', 'Calendar', 'Dentist', 'in 10 minutes · 3:50 PM', '3:40 PM'],
      ['app-settings', 'Software Update', 'macOS Tahoe 26.0.1', 'A new update is available.', '1:02 PM'],
    ].forEach(([ico, app, t, b, tm]) => box.insertAdjacentHTML('beforeend',
      `<div class="note"><span class="art">${ic(ico)}</span><span class="bd"><b>${esc(t)}</b><p>${esc(b)}</p></span><span class="tm">${esc(tm)}</span></div>`));
    /* Parked off-screen for its first frame: laying out five widgets and priming
       the panel's blur costs a paint, and it would otherwise land on frame one of
       the slide. One frame later the panel is warm and the slide runs clean. */
    node.style.transform = 'translateX(100%)';
    $('#layer-overlay').append(scrim, node);
    scrim.addEventListener('pointerdown', () => this.close());
    $('#menubar [data-st="clock"]').classList.add('open');
    requestAnimationFrame(() => {
      if (!node.isConnected) return;
      node.style.transform = '';                      // no transform may survive, or the blur dies
      /* fill:none, so no transform survives the slide */
      node.animate([{ transform: 'translateX(100%)', opacity: .4 }, { transform: 'none', opacity: 1 }],
        { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
  },
  close() {
    const node = $('#nc'), scrim = $('#nc-scrim');
    if (!node) return;
    node.id = '';                                     // so a re-open can't find it
    if (scrim) scrim.remove();
    $('#menubar [data-st="clock"]').classList.remove('open');
    const a = node.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(101%)', opacity: .5 }],
      { duration: 260, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    a.onfinish = () => node.remove();
  }
};
/* ============================================================================
   30 · STARTUP — power-on, then login
   ========================================================================== */
/* After login: open Contact Me, then the Resume on top of it (instead of Finder). */
function openWelcome() {
  const mb = WM.mb(), cx = innerWidth / 2;
  WM.open('contactme', { x: cx - 520, y: mb + 56 });
  setTimeout(() => WM.open('preview', { file: 'Resume.pdf', url: RESUME_IMG, w: 640, h: 720, x: cx - 150, y: mb + 26 }), 150);
}

const Startup = {
  /* Skippable, because a 2s boot in front of every reload is a tax on anyone
     poking at this — including the test harness, which passes ?boot=0. */
  wanted() {
    const q = new URLSearchParams(location.search);
    return q.get('boot') !== '0' && !/\bnoboot\b/.test(location.hash);
  },

  run() {
    const boot = $('#boot');
    if (!this.wanted()) { boot.remove(); return; }

    const fill = boot.querySelector('.bar i');
    /* Uneven steps: a perfectly linear bar looks like a loading GIF. Apple's
       stalls, jumps, then finishes. */
    const steps = [[120, 14], [420, 27], [700, 34], [980, 62], [1180, 74], [1400, 88], [1620, 100]];
    steps.forEach(([at, pct]) => setTimeout(() => { fill.style.width = pct + '%'; }, at));

    const done = () => { if (boot.isConnected) { boot.classList.add('out'); setTimeout(() => boot.remove(), 480); this.lock(); } };
    this.bootTimer = setTimeout(done, 1980);
    /* Impatience is allowed. */
    const skip = () => { clearTimeout(this.bootTimer); fill.style.width = '100%'; done(); };
    boot.addEventListener('click', skip);
    addEventListener('keydown', function once(e) { if ($('#boot')) { skip(); } removeEventListener('keydown', once); });
  },

/* Shown after boot, and again from > Lock Screen. */
  lock() {
    const n = $('#lock'); if (!n || n.dataset.on === '1') return;
    n.hidden = false; n.dataset.on = '1';
    n.classList.remove('out', 'opening');
    
    /* Reuse whatever the desktop is currently showing, procedural fallback included. */
    const live = $('#wall .layer.photo.on');
    n.querySelector('.lk-wall').style.backgroundImage =
      (live && live.style.backgroundImage) || `url("${WALLPAPERS[SYS.wallpaper].url}")`;
    n.querySelector('[data-av]').style.backgroundImage = `url("${AVATAR}")`;
    
    const pwContainer = n.querySelector('.lk-pw');
    if (pwContainer && !pwContainer.querySelector('input')) {
      // Replace static span/icon with a real input field matching macOS style
      pwContainer.innerHTML = `
        <input type="password" class="lk-real-input" placeholder="Touch ID or Enter Password" style="width: 100%; height: 100%; background: transparent; border: none; outline: none; color: white; font-size: 12.5px; text-align: center; font-family: inherit;" />
        <i style="cursor: pointer;"></i>
      `;
    }

    const inputField = n.querySelector('.lk-real-input');
    const arrowBtn = n.querySelector('.lk-pw i');
    
    if (inputField) {
      inputField.value = '';
      setTimeout(() => inputField.focus(), 100);
    }

    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
    Pop.close(true);

    if (!this.bound) {
      this.bound = true;

      // Click anywhere on lock screen (outside user card) to unlock if password is empty, or click arrow
      n.addEventListener('click', (e) => {
        if (arrowBtn && arrowBtn.contains(e.target)) {
          this.unlock();
        } else if (!n.querySelector('.lk-user').contains(e.target)) {
          this.unlock();
        }
      });

      // Handle typing & enter key
      if (inputField) {
        inputField.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.unlock();
          }
        });
      }
    }

    this.keyGo = e => { 
      if (['Escape'].includes(e.key)) { 
        e.preventDefault(); 
        this.unlock(); 
      } 
    };
    addEventListener('keydown', this.keyGo);
  },

  tick() {
    const n = $('#lock'); if (!n) return;
    const d = new Date();
    n.querySelector('.lk-date').textContent = `${DAYS[d.getDay()]}, ${MONS[d.getMonth()] + ' ' + d.getDate()}`;
    n.querySelector('.lk-time').textContent = time12(d).replace(NBSP, ' ').replace(/\s?[AP]M$/, '');
  },

  /* Restart really does tear the session down — every window closes, the bar runs
     again, and you land back on the login screen. */
  restart() {
    WM.list.slice().forEach(w => WM.close(w.id));
    NotifCenter.close(); Pop.close(true);
    const boot = el(`<div id="boot"><svg viewBox="0 0 15 18" class="bl"><use href="#g-apple"/></svg>
      <div class="bar"><i></i></div></div>`);
    $('#stage').append(boot);
    const fill = boot.querySelector('.bar i');
    [[80, 18], [360, 30], [640, 48], [900, 70], [1120, 86], [1340, 100]]
      .forEach(([at, pct]) => setTimeout(() => { fill.style.width = pct + '%'; }, at));
    setTimeout(() => {
      boot.classList.add('out'); setTimeout(() => boot.remove(), 480);
      this.lock();
      setTimeout(openWelcome, 900);
    }, 1700);
  },

  shutDown() {
    WM.list.slice().forEach(w => WM.close(w.id));
    NotifCenter.close(); Pop.close(true);
    const off = el(`<div id="boot" style="cursor:var(--cur-hand)">
      <div style="font-size:13px;color:rgba(255,255,255,.5);position:absolute;bottom:16%">Click anywhere to start up</div></div>`);
    $('#stage').append(off);
    off.addEventListener('click', () => { off.remove(); this.restart(); });
  },

  unlock() {
    const n = $('#lock'); if (!n || n.dataset.on !== '1') return;
    n.dataset.on = '0';
    clearInterval(this.timer);
    removeEventListener('keydown', this.keyGo);
    /* Wallpaper snaps back into focus a beat before the panel dissolves, which is
       what makes it feel like the desktop was always there. */
    n.classList.add('opening');
    setTimeout(() => {
      n.classList.add('out');
      setTimeout(() => { n.hidden = true; n.classList.remove('out', 'opening'); }, 480);
    }, 120);
  },
};

(function boot() {
  /* Calendar dock icon shows the live date, like the real one */
  const now = new Date();
  const dow = $('#cal-dow'), day = $('#cal-day');
  if (dow) dow.textContent = DAYS3[now.getDay()].toUpperCase();
  if (day) day.textContent = now.getDate();

  Theme.setAppearance(SYS.appearance);
  Theme.paintAccent();
  Set2.applyChrome();
  Wall.set(SYS.wallpaper);
  Screen.setBrightness(Screen.brightness);

  MenuBar.init();
  Desktop.init();
  Dock.init();

  /* Right-click the dock's empty glass */
  $('#dock').addEventListener('contextmenu', e => {
    if (e.target.closest('.di')) return;
    ctxMenu(e, [
      { id: 'mag', label: 'Turn Magnification ' + (SYS.dockMagOn ? 'Off' : 'On'), run: () => { SYS.dockMagOn = !SYS.dockMagOn; Dock.measure(); } },
      { id: 'pos', label: 'Position on Screen', key: '▸' },
      '-',
      { id: 'pref', label: 'Dock Settings…', run: () => WM.open('settings', { section: 'dock' }) },
    ]);
  });

  /* Menu-bar clock area also responds to a right-click */
  $('#menubar').addEventListener('contextmenu', e => {
    e.preventDefault();
    ctxMenu(e, [
      { id: 'a', label: 'Menu Bar Settings…', run: () => WM.open('settings', { section: 'appearance' }) },
      { id: 'c', label: 'Control Centre Settings…', run: () => WM.open('settings', { section: 'appearance' }) },
    ]);
  });

  /* Battery drifts down slowly so the UI is never quite static */
  setInterval(() => {
    if (SYS.charging) SYS.battery = Math.min(100, SYS.battery + 1);
    else if (Math.random() < .35) SYS.battery = Math.max(3, SYS.battery - 1);
    MenuBar.paintStatus();
  }, 42000);

  /* Open the window most people would open first */
  setTimeout(openWelcome, 340);

  /* Launchpad's full-screen blur costs ~230ms the first time Chromium rasterises
     it — a visible stutter on the fade-in, and only ever on the first open. So
     pay it here, invisibly, while nobody is waiting on it. */
  const warm = () => {
    const n = el(`<div id="lpad" class="nosel" style="opacity:.002;animation:none;pointer-events:none">
      <div class="grid">${LAUNCH_ORDER.slice(0, PER_PAGE).map(id =>
      `<div class="app"><div class="art">${ic(APPS[id].icon)}</div><div class="nm">${esc(APPS[id].name)}</div></div>`).join('')}</div></div>`);
    /* The tray pays the same first-rasterise toll as Launchpad — a tall blurred
       surface Chromium has never composited before. Warm it off the same idle beat. */
    const t = el(`<div id="nc" class="nosel" style="opacity:.002;transform:none;animation:none;pointer-events:none"></div>`);
    /* And the genie: the first window to warp costs three long frames while Chromium
       rasterises an animated clip-path for the first time. Run one through the same
       keyframes on a throwaway node so the toll is paid before anyone sees it. */
    const g = el(`<div class="win mini" style="left:40px;top:40px;width:360px;height:260px;opacity:.002;pointer-events:none;visibility:visible">
      <div class="tb"></div><div class="wb"></div></div>`);
    $('#layer-overlay').append(n, t, g);
    n.getBoundingClientRect(); t.getBoundingClientRect();
    const ga = g.animate([
      { transform: 'translate(0px,0px) scale(1,1)', clipPath: 'polygon(0% 0%,100% 0%,100% 100%,0% 100%)', borderRadius: '11px' },
      { transform: 'translate(120px,300px) scale(.3,.3)', clipPath: 'polygon(20% 0%,80% 0%,93% 100%,7% 100%)', borderRadius: '22px', offset: .55 },
      { transform: 'translate(240px,600px) scale(.06,.06)', clipPath: 'polygon(43% 0%,57% 0%,100% 100%,0% 100%)', borderRadius: '40px' },
    ], { duration: 120, easing: 'cubic-bezier(.42,.02,.58,1)' });
    ga.onfinish = () => g.remove();
    requestAnimationFrame(() => requestAnimationFrame(() => { n.remove(); t.remove(); }));
  };
  (window.requestIdleCallback || (f => setTimeout(f, 1400)))(warm, { timeout: 2600 });

  addEventListener('resize', () => {
    /* keep windows on screen when the viewport shrinks */
    WM.list.forEach(w => {
      const n = w.node;
      if (w.zoomed) { Object.assign(n.style, { left: '0px', top: WM.mb() + 'px', width: innerWidth + 'px', height: WM.visibleH() + 'px' }); return; }
      n.style.left = Math.min(n.offsetLeft, Math.max(10, innerWidth - 120)) + 'px';
      n.style.top = clamp(n.offsetTop, WM.mb(), Math.max(WM.mb(), innerHeight - 40)) + 'px';
    });
  });

  /* Don't let the browser's own menu appear on the wallpaper */
  document.addEventListener('contextmenu', e => {
    if (e.target.closest('input,textarea,[contenteditable="true"],.tm-body')) return;
    if (!e.defaultPrevented) e.preventDefault();
  });
  document.addEventListener('dragstart', e => e.preventDefault());

  Startup.run();
})();

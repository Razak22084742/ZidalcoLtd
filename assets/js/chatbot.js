(function(){
  const SUGGESTIONS = [
    'Go to Home', 'Open Services', 'Contact Info', 'Show Portfolio', 'Admin Login', 'Send Email', 'Leave Feedback'
  ];
  const INTENTS = [
    { kw: ['home'], action: () => go('index.html'), reply: 'Navigating to Home.' },
    { kw: ['service','services'], action: () => go('services.html'), reply: 'Opening Services.' },
    { kw: ['contact','email','phone'], action: () => go('contact.html'), reply: 'Taking you to Contact.' },
    { kw: ['portfolio','projects'], action: () => go('portfolio.html'), reply: 'Opening Portfolio.' },
    { kw: ['admin','dashboard','login','signup'], action: () => go('admin/index.html'), reply: 'Opening Admin portal.' },
    { kw: ['feedback','comment','review'], action: () => reply('Use the feedback form on the homepage. I can take you there.'), follow: () => go('index.html') },
    { kw: ['help','support','assist'], action: () => reply('I can help you navigate. Try: "Go to Home", "Open Services", "Admin Login" or ask about Contact info.') }
  ];

  const storeKey = 'zidalco_chat_history_v1';
  let state = { open: false, history: [] };

  function init(){
    loadState();
    injectUI();
    if (state.history.length === 0) bot('Hi! I\'m ZidaBot. How can I help you today?');
    else state.history.forEach(m => addMsg(m.role, m.text, false));
  }

  function injectUI(){
    const launcher = document.createElement('button');
    launcher.className = 'chatbot-launcher';
    launcher.title = 'Chat with us';
    launcher.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h6"/><path d="M17 3h4v4"/></svg>';

    const panel = document.createElement('div');
    panel.className = 'chatbot-panel';
    panel.innerHTML = `
      <div class="chatbot-header">
        <h4>ZidaBot</h4>
        <button id="cb-close" style="background:none;border:none;color:#fff;cursor:pointer">✕</button>
      </div>
      <div class="chatbot-body" id="cb-body"></div>
      <div class="chatbot-footer">
        <input id="cb-input" class="chatbot-input" type="text" placeholder="Ask me to navigate or anything..."/>
        <button id="cb-send" class="chatbot-send">Send</button>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    launcher.addEventListener('click', ()=> toggle(panel));
    panel.querySelector('#cb-close').addEventListener('click', ()=> toggle(panel, false));
    panel.querySelector('#cb-send').addEventListener('click', onSend);
    panel.querySelector('#cb-input').addEventListener('keydown', e=>{ if(e.key==='Enter') onSend(); });

    // suggestions
    const sugg = document.createElement('div');
    sugg.className = 'chatbot-suggestions';
    SUGGESTIONS.forEach(s=>{
      const b = document.createElement('button');
      b.className = 'chatbot-chip'; b.textContent = s;
      b.addEventListener('click', ()=> handleUser(s));
      sugg.appendChild(b);
    });
    panel.querySelector('.chatbot-body').appendChild(sugg);
  }

  function toggle(panel, force){
    const open = force !== undefined ? force : !panel.classList.contains('open');
    if (open) panel.classList.add('open'); else panel.classList.remove('open');
    state.open = open; saveState();
  }

  function onSend(){
    const input = document.getElementById('cb-input');
    const text = (input.value||'').trim(); if (!text) return;
    input.value = '';
    handleUser(text);
  }

  function handleUser(text){
    user(text);
    // simple NLU: lowercase and match
    const q = text.toLowerCase();
    const intent = INTENTS.find(i=> i.kw.some(k=> q.includes(k)));
    if (intent){
      bot(intent.reply);
      if (intent.action) setTimeout(()=>intent.action(), 600);
      else if (intent.follow) setTimeout(()=>intent.follow(), 600);
    } else if (q.startsWith('go to ')||q.startsWith('open ')){
      const dest = q.replace(/^go to |^open /,'').trim();
      navigateGuess(dest);
    } else if (q.includes('where') && q.includes('admin')){
      bot('The admin portal is at /admin. I can open it for you.');
      setTimeout(()=>go('admin/index.html'), 600);
    } else if (q.includes('how') && (q.includes('email')||q.includes('contact'))){
      bot('Use the Contact page form to send an email. I can take you there.');
      setTimeout(()=>go('contact.html'), 600);
    } else if (q.includes('feedback')||q.includes('comment')){
      bot('Use the feedback form on the homepage. I can take you there.');
      setTimeout(()=>go('index.html'), 600);
    } else {
      bot('Sorry, I didn\'t catch that. Try: "Go to Home", "Open Services", "Admin Login", or ask about Contact.');
    }
  }

  function navigateGuess(dest){
    const map = [
      {k:['home','index'], p:'index.html'},
      {k:['service','services'], p:'services.html'},
      {k:['contact','email','phone'], p:'contact.html'},
      {k:['portfolio','project'], p:'portfolio.html'},
      {k:['admin','dashboard','login','signup'], p:'admin/index.html'}
    ];
    const match = map.find(m=> m.k.some(k=> dest.includes(k)));
    if (match){ bot('Opening '+match.p+' ...'); setTimeout(()=>go(match.p), 600); }
    else bot('Not sure where you want to go. Try Home, Services, Contact, Portfolio, or Admin.');
  }

  function addMsg(role, text, persist=true){
    const body = document.getElementById('cb-body');
    const row = document.createElement('div'); row.className = `chatbot-msg ${role}`;
    const bubble = document.createElement('div'); bubble.className = 'chatbot-bubble'; bubble.textContent = text;
    row.appendChild(bubble); body.appendChild(row); body.scrollTop = body.scrollHeight;
    if (persist){ state.history.push({role,text}); saveState(); }
  }
  function bot(text){ addMsg('bot', text); }
  function user(text){ addMsg('user', text); }

  function go(path){ window.location.href = path; }

  function loadState(){ try{ state = JSON.parse(localStorage.getItem(storeKey))||state; }catch(e){} }
  function saveState(){ localStorage.setItem(storeKey, JSON.stringify(state)); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

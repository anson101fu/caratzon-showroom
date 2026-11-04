window.initProductEnquiries = (client, openLogin) => {
  const copy = {
    ru: ['Задать вопрос', 'Мои вопросы', 'Управление запросами', 'Новый вопрос', 'Отправить', 'Закрыть', 'Нет запросов', 'Не удалось выполнить действие. Попробуйте ещё раз.', 'Экспорт Excel', 'Клиент', 'Сотрудник', 'Назад', 'Ваше сообщение', 'Войдите, чтобы задать вопрос.'],
    en: ['Ask about this product', 'My enquiries', 'Manage enquiries', 'New enquiry', 'Send', 'Close', 'No enquiries', 'Something went wrong. Please try again.', 'Export Excel', 'Customer', 'Staff', 'Back', 'Your message', 'Sign in to ask a question.'],
    zh: ['咨询此商品', '我的咨询', '咨询管理', '新建咨询', '发送', '关闭', '暂无咨询', '操作失败，请重试。', '导出 Excel', '客户', '客服', '返回', '请输入消息', '登录后即可咨询。']
  };
  const tr = i => (copy[document.documentElement.lang] || copy.ru)[i];
  const guestCopy = {
    ru: ['Способ связи', 'Контакт', 'Запрос отправлен. Мы свяжемся с вами указанным способом.', 'Телефон', 'Связаться по указанному контакту', 'Выберите способ связи', 'Укажите действительный номер с кодом страны.', 'Укажите действительный email.'],
    en: ['Contact method', 'Contact details', 'Enquiry sent. We’ll contact you using the details you provided.', 'Phone', 'Follow up using this contact', 'Choose a contact method', 'Enter a valid phone number including the country code.', 'Enter a valid email address.'],
    zh: ['联系方式', '联系资料', '咨询已提交，我们会通过你填写的方式联系你。', '电话', '请通过以下联系方式跟进', '请选择联系方式', '请输入有效的电话号码，建议加上国家区号。', '请输入有效的电子邮箱。']
  };
  const gt = i => (guestCopy[document.documentElement.lang] || guestCopy.ru)[i];
  const contactLabel = method => ({email:'Email', wechat:'WeChat ID', whatsapp:'WhatsApp', phone:gt(3), telegram:'Telegram'})[method];
  const node = (tag, value) => {
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  };
  const button = (label, action) => {
    const element = node('button', label);
    element.type = 'button';
    element.className = 'cz-enquiry-button';
    element.onclick = action;
    return element;
  };

  const dialog = node('dialog', '');
  dialog.id = 'cz-enquiry-dialog';
  dialog.setAttribute('aria-labelledby', 'cz-enquiry-title');
  const title = node('h2', '');
  title.id = 'cz-enquiry-title';
  const close = button('', () => dialog.close());
  const body = node('div', '');
  const status = node('p', '');
  status.setAttribute('role', 'status');
  const header = node('header', '');
  header.append(title, close);
  dialog.append(header, body, status);
  document.body.append(dialog);

  let view = 0;
  dialog.addEventListener('close', () => {
    if (!dialog.open) {
      view++;
      body.replaceChildren();
    }
  });
  client?.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT' && dialog.open) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dialog.classList.contains('cz-chat-floating')) {
      event.preventDefault();
      event.stopPropagation();
      dialog.close();
    }
  });
  const show = (label, floating = false) => {
    if (dialog.open && dialog.classList.contains('cz-chat-floating') !== floating) dialog.close();
    dialog.classList.toggle('cz-chat-floating', floating);
    dialog.classList.remove('cz-enquiry-manager');
    const ticket = ++view;
    title.textContent = label;
    close.textContent = floating ? '×' : tr(5);
    close.setAttribute('aria-label', tr(5));
    body.replaceChildren();
    status.textContent = '';
    if (!dialog.open) {
      if (floating) dialog.show();
      else dialog.showModal();
    }
    return ticket;
  };
  const current = ticket => ticket === view && dialog.open;
  const fail = ticket => {
    if (current(ticket)) status.textContent = tr(7);
  };
  const checked = async promise => {
    const {data, error} = await promise;
    if (error) throw error;
    return data;
  };
  const readAll = async (table, fields, filter, sort = 'id') => {
    const pageSize = 250;
    const rows = [];
    let batch;
    do {
      let query = client.from(table).select(fields);
      if (filter) query = query.eq(...filter);
      query = query.order(sort);
      if (sort !== 'id') query = query.order('id');
      batch = await checked(query.range(rows.length, rows.length + pageSize - 1));
      rows.push(...batch);
    } while (batch.length === pageSize);
    return rows;
  };

  const threadFields = 'id,created_at,email,sku,product_name,contact_method,contact_value,source,chat_language';
  const messageFields = 'id,enquiry_id,created_at,sender,body,staff_display_name';

  const compose = (ticket, thread, product, back) => {
    const form = node('form', '');
    const label = node('label', tr(12));
    const input = node('textarea', '');
    input.required = true;
    input.maxLength = 2000;
    input.rows = 4;
    label.append(input);
    const send = button(tr(4));
    send.type = 'submit';
    form.append(label, send);
    const threadId = thread?.id || crypto.randomUUID();
    let pending;
    form.onsubmit = async event => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value || send.disabled) return;
      if (pending?.message_body !== value) {
        pending = {thread_id: threadId, message_id: crypto.randomUUID(), message_body: value};
        if (product) Object.assign(pending, {product_sku: product.sku, product_label: product.name});
      }
      send.disabled = input.readOnly = true;
      status.textContent = '…';
      try {
        await checked(client.rpc('cz_send_enquiry', pending));
        if (current(ticket)) openThread(thread || {id: threadId, sku: product.sku, product_name: product.name}, back);
      } catch {
        fail(ticket);
      } finally {
        send.disabled = input.readOnly = false;
      }
    };
    body.append(form);
  };

  function openGuestForm(product) {
    const ticket = show(product.name + ' · ' + product.sku);
    const form = node('form', '');
    const method = node('select', '');
    method.required = true;
    const prompt = node('option', gt(5));
    prompt.value = '';
    prompt.disabled = prompt.selected = true;
    method.append(prompt);
    for (const key of ['email', 'wechat', 'whatsapp', 'phone', 'telegram']) {
      const option = node('option', contactLabel(key));
      option.value = key;
      method.append(option);
    }
    const contact = node('input', '');
    contact.required = true;
    contact.maxLength = 180;
    method.onchange = () => {
      contact.type = method.value === 'email' ? 'email' : ['phone', 'whatsapp'].includes(method.value) ? 'tel' : 'text';
      contact.placeholder = method.value === 'telegram' ? '@username / https://t.me/username' : '';
      contact.setCustomValidity('');
    };
    contact.oninput = () => contact.setCustomValidity('');
    const message = node('textarea', '');
    message.required = true;
    message.maxLength = 2000;
    message.rows = 4;
    const send = button(tr(4));
    send.type = 'submit';
    for (const [label, field] of [[gt(0), method], [gt(1), contact], [tr(12), message]]) {
      const wrapper = node('label', label);
      wrapper.append(field);
      form.append(wrapper);
    }
    form.append(send);
    body.append(form);
    let pending;
    form.onsubmit = async event => {
      event.preventDefault();
      const value = contact.value.trim();
      const question = message.value.trim();
      if (!value || !question || !method.value || send.disabled) {
        if (!send.disabled) fail(ticket);
        return;
      }
      const digits = value.replace(/[^0-9]/g, '').length;
      if (['phone', 'whatsapp'].includes(method.value) && (!/^\+?[0-9 ()-]+$/.test(value) || digits < 7 || digits > 15)) {
        contact.setCustomValidity(gt(6));
        contact.reportValidity();
        return;
      }
      if (method.value === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        contact.setCustomValidity(gt(7));
        contact.reportValidity();
        return;
      }
      if (pending?.contact !== value || pending?.method !== method.value || pending?.message_body !== question) {
        pending = {request_id:crypto.randomUUID(), product_sku:product.sku, product_label:product.name,
          message_body:question, method:method.value, contact:value};
      }
      send.disabled = method.disabled = contact.readOnly = message.readOnly = true;
      status.textContent = '…';
      try {
        await checked(client.rpc('cz_send_guest_enquiry', pending));
        if (current(ticket)) {
          body.replaceChildren();
          status.textContent = gt(2);
        }
      } catch {
        fail(ticket);
      } finally {
        send.disabled = method.disabled = contact.readOnly = message.readOnly = false;
      }
    };
  }

  const chatCopy = {
    ru: ['Чат','Сотрудник онлайн','Сейчас нет сотрудников онлайн','Я онлайн','Я офлайн','Принять чат','Автоответ','Сохранить контакт','Контакт сохранён','Новые чаты'],
    en: ['Live Chat','Staff online','Staff are offline','Go online','Go offline','Take chat','Auto-reply','Save contact','Contact saved','New chats'],
    zh: ['在线客服','客服在线','客服暂时离线','开始接待','停止接待','接手对话','自动回复','保存联系方式','联系方式已保存','新对话']
  };
  const roleCopy = {
    en: ['Live Chat queue','End chat','This chat has ended.','Start a new chat','No active chats'],
    zh: ['客服接待','结束对话','本次对话已结束。','开始新对话','暂无待接待对话'],
    ru: ['Очередь чатов','Завершить чат','Чат завершён.','Начать новый чат','Нет активных чатов']
  };
  const rt = i => (roleCopy[document.documentElement.lang] || roleCopy.en)[i];
  const staffName = row => row.staff_display_name ? 'staff-' + row.staff_display_name : '';
  const ct = i => (chatCopy[document.documentElement.lang] || chatCopy.en)[i];
  const languageOf = (message, fallback) => {
    if (/\p{Script=Han}/u.test(message)) {
      if (/[這個麼價錢貨運購買請問嗎幾現聯繫繼續廣東啲嘅喺係]/u.test(message)) return 'zh-Hant';
      if (/[这个么价钱货运购买请问吗几现联系继续广东]/u.test(message)) return 'zh-Hans';
      return fallback === 'zh-Hant' ? 'zh-Hant' : 'zh-Hans';
    }
    if (/\p{Script=Cyrillic}/u.test(message)) return 'ru';
    if (/[a-z]{2,}/i.test(message) && !/^(?:sku\s*[:#-]?\s*)?[a-z-]*\d[a-z0-9-]*$/i.test(message.trim())) return 'en';
    return fallback;
  };
  const pollWhile = (ticket, callback, seconds = 3) => {
    const tick = async () => {
      if (!current(ticket)) return;
      try { await callback(); } catch { /* Retry during the next poll. */ }
      if (current(ticket)) setTimeout(tick, seconds * 1000);
    };
    setTimeout(tick, seconds * 1000);
  };
  const activeProduct = () => {
    if (detail.hidden) return null;
    const product = products.find(item => item.sku === detail.dataset.sku);
    return product ? {sku:product.sku, name:productTitle(product)} : null;
  };

  async function openChat(product = activeProduct()) {
    const ticket = show(product ? ct(0) + ' · ' + product.name + ' · ' + product.sku : ct(0), true);
    if (!client) return fail(ticket);
    const key = 'cz-chat:' + (product?.sku || 'general');
    let session;
    try { session = JSON.parse(sessionStorage.getItem(key)); } catch { /* Storage unavailable. */ }
    const siteLanguage = document.documentElement.lang === 'zh' ? 'zh-Hans' :
      document.documentElement.lang === 'ru' ? 'ru' : 'en';
    session ||= {tid:crypto.randomUUID(), token:crypto.randomUUID(), language:siteLanguage, started:false};
    const access = {tid:session.tid, token:session.token};
    const presence = node('p', '…');
    presence.className = 'cz-chat-presence';
    const messages = node('div', '');
    messages.className = 'cz-live-transcript';
    messages.setAttribute('role', 'log');
    messages.append(node('p', ({
      ru:'Здравствуйте! Чем можем помочь?',
      en:'Hello! How can we help you today?',
      zh:'您好！有什么可以帮您？'
    })[document.documentElement.lang] || 'Hello! How can we help you today?'));
    const form = node('form', '');
    form.className = 'cz-chat-compose';
    const label = node('label', tr(12));
    const input = node('textarea', '');
    input.required = true;
    input.maxLength = 2000;
    input.rows = 2;
    input.placeholder = tr(12);
    label.append(input);
    const send = button(tr(4));
    send.type = 'submit';
    form.append(label, send);

    const contactForm = node('form', '');
    contactForm.hidden = true;
    contactForm.className = 'cz-chat-contact';
    const methodLabel = node('label', gt(0));
    const method = node('select', '');
    method.required = true;
    const placeholder = node('option', gt(5));
    placeholder.value = '';
    placeholder.selected = placeholder.disabled = true;
    method.append(placeholder);
    for (const name of ['email','wechat','whatsapp','phone','telegram']) {
      const option = node('option', contactLabel(name));
      option.value = name;
      method.append(option);
    }
    methodLabel.append(method);
    const contactLabelNode = node('label', gt(1));
    const contact = node('input', '');
    contact.required = true;
    contact.maxLength = 180;
    method.onchange = () => {
      contact.type = method.value === 'email' ? 'email' : ['phone','whatsapp'].includes(method.value) ? 'tel' : 'text';
      contact.placeholder = method.value === 'telegram' ? '@username / https://t.me/username' : '';
    };
    contactLabelNode.append(contact);
    const save = button(ct(7));
    save.type = 'submit';
    contactForm.append(methodLabel, contactLabelNode, save);
    const newChat = button(rt(3), () => {
      try { sessionStorage.removeItem(key); } catch { /* Storage unavailable. */ }
      openChat(product);
    });
    newChat.hidden = true;
    body.append(presence, messages, form, contactForm, newChat);
    let hasContact = false;
    let version;
    let syncing = false;
    const sync = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const online = await checked(client.rpc('cz_chat_online'));
        if (!current(ticket)) return;
        presence.textContent = ct(online ? 1 : 2);
        presence.dataset.online = String(online);
        if (!session.started) return;
        const result = await client.rpc('cz_chat_guest_read', access);
        if (result.error?.code === '42501') {
          if (current(ticket)) {
            form.hidden = contactForm.hidden = true;
            messages.replaceChildren();
            newChat.hidden = false;
            status.textContent = rt(2);
          }
          return;
        }
        if (result.error) throw result.error;
        const state = result.data;
        if (!current(ticket)) return;
        hasContact ||= state.has_contact;
        form.hidden = !!state.closed;
        newChat.hidden = !state.closed;
        if (state.closed) status.textContent = rt(2);
        contactForm.hidden = !!state.closed || hasContact || online;
        const latest = state.messages.at(-1)?.id;
        if (latest === version) return;
        version = latest;
        messages.replaceChildren(...state.messages.map(row => {
          const item = node('article', '');
          item.dataset.sender = row.sender;
          item.append(node('strong', row.sender === 'system' ? ct(6) : row.sender === 'staff' ? staffName(row) || tr(10) : tr(9)), node('p', row.body));
          return item;
        }));
        messages.scrollTop = messages.scrollHeight;
      } finally {
        syncing = false;
      }
    };
    let pending;
    form.onsubmit = async event => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || send.disabled) return;
      if (pending?.message !== message) pending = {mid:crypto.randomUUID(), message};
      send.disabled = input.readOnly = true;
      try {
        const language = languageOf(message, session.language);
        await checked(client.rpc('cz_chat_guest_send', {...access, ...pending, language,
          sku:product?.sku || 'LIVE-CHAT', label:product?.name || 'Live Chat'}));
        session.started = true;
        session.language = language;
        try { sessionStorage.setItem(key, JSON.stringify(session)); } catch { /* Storage unavailable. */ }
        input.value = '';
        pending = null;
        if (current(ticket)) status.textContent = '';
        await sync();
      } catch { fail(ticket); }
      finally { send.disabled = input.readOnly = false; }
    };
    contactForm.onsubmit = async event => {
      event.preventDefault();
      if (save.disabled || !contact.value.trim()) return;
      save.disabled = true;
      try {
        await checked(client.rpc('cz_chat_guest_contact', {...access, method:method.value, contact:contact.value.trim()}));
        hasContact = true;
        if (current(ticket)) {
          contactForm.hidden = true;
          status.textContent = ct(8);
        }
      } catch { fail(ticket); }
      finally { save.disabled = false; }
    };
    pollWhile(ticket, sync);
    try { await sync(); } catch { fail(ticket); }
  }

  let staffOnline = false;
  let heartbeat;
  const setStaffOnline = async online => {
    await checked(client.rpc('cz_chat_set_presence', {online}));
    staffOnline = online;
    clearInterval(heartbeat);
    if (online) heartbeat = setInterval(() => {
      if (!document.hidden) client.rpc('cz_chat_set_presence', {online:true}).catch(() => {});
    }, 25000);
  };

  function mountStaffChat(ticket, thread, agentOnly, back, canClose) {
    const details = node('p', '');
    const messages = node('div', '');
    messages.className = 'cz-live-transcript';
    messages.setAttribute('role', 'log');
    const controls = node('div', '');
    body.append(details, messages, controls);
    let version;
    let claimed = false;
    const sync = async () => {
      if (agentOnly && !claimed) return;
      let agentLog;
      if (agentOnly) {
        const result = await client.rpc('cz_chat_agent_read', {tid:thread.id});
        if (result.error?.code === '42501') {
          if (current(ticket)) back();
          return;
        }
        if (result.error) throw result.error;
        agentLog = result.data;
      }
      const [rows, log] = agentOnly ? [[thread], agentLog] : await Promise.all([
        readAll('cz_enquiries', threadFields, ['id', thread.id]),
        readAll('cz_enquiry_messages', messageFields, ['enquiry_id', thread.id], 'created_at')
      ]);
      if (!current(ticket) || !rows.length) return;
      const row = rows[0];
      details.textContent = [row.chat_language, row.contact_method && contactLabel(row.contact_method), row.contact_value].filter(Boolean).join(' · ');
      const latest = log.at(-1)?.id;
      if (latest === version) return;
      version = latest;
      messages.replaceChildren(...log.map(entry => {
        const item = node('article', '');
        item.append(node('strong', entry.sender === 'system' ? ct(6) : entry.sender === 'staff' ? staffName(entry) || tr(10) : tr(9)), node('p', entry.body));
        return item;
      }));
      messages.scrollTop = messages.scrollHeight;
    };
    const take = button(ct(5), async () => {
      take.disabled = true;
      try {
        await checked(client.rpc('cz_chat_staff', {tid:thread.id}));
        if (!current(ticket)) return;
        claimed = true;
        controls.replaceChildren();
        const end = button(rt(1), async () => {
          end.disabled = true;
          try {
            await checked(client.rpc('cz_chat_close', {tid:thread.id}));
            if (current(ticket)) back();
          } catch { fail(ticket); }
          finally { end.disabled = false; }
        });
        const form = node('form', '');
        const label = node('label', tr(12));
        const reply = node('textarea', '');
        reply.required = true;
        reply.maxLength = 2000;
        reply.rows = 3;
        label.append(reply);
        const submit = button(tr(4));
        submit.type = 'submit';
        form.append(label, submit);
        controls.append(form);
        if (canClose) controls.append(end);
        await sync();
        let pending;
        form.onsubmit = async event => {
          event.preventDefault();
          const message = reply.value.trim();
          if (!message || submit.disabled) return;
          if (pending?.message !== message) pending = {mid:crypto.randomUUID(), message};
          submit.disabled = reply.readOnly = true;
          try {
            await checked(client.rpc('cz_chat_staff', {tid:thread.id, ...pending}));
            reply.value = '';
            pending = null;
            if (current(ticket)) status.textContent = '';
            await sync();
          } catch { fail(ticket); }
          finally { submit.disabled = reply.readOnly = false; }
        };
      } catch { fail(ticket); }
      finally { take.disabled = false; }
    });
    controls.append(take);
    pollWhile(ticket, sync);
    sync().catch(() => fail(ticket));
  }

  async function openThread(thread, back, agentOnly = false, canClose = agentOnly) {
    const ticket = show(thread.product_name + ' · ' + thread.sku);
    const date = new Intl.DateTimeFormat(document.documentElement.lang, {dateStyle:'short', timeStyle:'short'});
    body.append(button(tr(11), back), node('p', '#' + thread.id));
    if (thread.source === 'live_chat') return mountStaffChat(ticket, thread, agentOnly, back, canClose);
    if (thread.contact_method) {
      body.append(node('p', gt(4) + ' · ' + contactLabel(thread.contact_method) + ' · ' + thread.contact_value));
    }
    try {
      const messages = await readAll('cz_enquiry_messages', messageFields, ['enquiry_id', thread.id], 'created_at');
      if (!current(ticket)) return;
      for (const message of messages) {
        const item = node('article', '');
        item.append(node('strong', (message.sender === 'staff' ? staffName(message) || tr(10) : tr(9)) + ' · ' + date.format(new Date(message.created_at))), node('p', message.body));
        body.append(item);
      }
      if (!thread.contact_method) compose(ticket, thread, null, back);
    } catch {
      fail(ticket);
    }
  }

  let excelScript;
  async function exportWorkbook() {
    if (!window.XLSX) {
      excelScript ||= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = () => { script.remove(); excelScript = null; reject(new Error('Excel library unavailable')); };
        document.head.append(script);
      });
      await excelScript;
    }
    if (!await checked(client.rpc('cz_is_enquiry_admin'))) throw new Error('Administrator access required');
    const [threads, messages] = await Promise.all([
      readAll('cz_enquiries', threadFields, null, 'created_at'),
      readAll('cz_enquiry_messages', messageFields, null, 'created_at')
    ]);
    const allowed = new Set(threads.map(row => row.id));
    const history = messages.filter(row => allowed.has(row.enquiry_id));
    const summaries = new Map();
    for (const row of history) {
      const summary = summaries.get(row.enquiry_id) || {count:0};
      summary.count++;
      if (row.sender === 'customer' && !summary.question) summary.question = row.body;
      if (row.sender !== 'system') summary.latest = row;
      summaries.set(row.enquiry_id, summary);
    }
    const overview = [['查詢編號', '提交時間 (UTC)', '客戶電郵', '聯絡方式', '聯絡資料', 'SKU', '產品', '最初問題', '最後一則訊息', '最新時間 (UTC)', '訊息數', '跟進狀態', '來源', '聊天語言']];
    for (const row of threads) {
      const item = summaries.get(row.id);
      overview.push([row.id, row.created_at, row.email, row.contact_method ? contactLabel(row.contact_method) : 'Email', row.contact_value || row.email, row.sku, row.product_name, item?.question || '',
        item?.latest.body || '', item?.latest.created_at || '', item?.count || 0,
        row.source !== 'live_chat' && row.contact_method ? '站外跟進' : item?.latest?.sender === 'staff' ? '已回覆' : '待回覆',
        row.source === 'live_chat' ? 'Live Chat' : '產品查詢', row.chat_language || '']);
    }
    const detail = [['查詢編號', '時間 (UTC)', '發送者', '訊息'], ...history.map(row =>
      [row.enquiry_id, row.created_at, row.sender === 'system' ? '自動回覆' : row.sender === 'staff' ? staffName(row) || '客服' : '客戶', row.body])];
    const byId = new Map(threads.map(row => [row.id, row]));
    const latestCustomerMessage = new Map();
    const replies = [['查詢編號', '回覆時間 (UTC)', '員工', '來源', 'SKU', '產品', '客人上一則訊息', '員工回覆原文']];
    for (const row of history) {
      if (row.sender === 'customer') latestCustomerMessage.set(row.enquiry_id, row.body);
      if (row.sender !== 'staff') continue;
      const enquiry = byId.get(row.enquiry_id);
      replies.push([row.enquiry_id, row.created_at, staffName(row) || '客服（未記名）',
        enquiry.source === 'live_chat' ? 'Live Chat' : '產品查詢',
        enquiry.sku === 'LIVE-CHAT' ? '' : enquiry.sku, enquiry.product_name,
        latestCustomerMessage.get(row.enquiry_id) || '', row.body]);
    }
    const xlsx = window.XLSX;
    const workbook = xlsx.utils.book_new();
    for (const [name, rows, widths] of [['查詢總表', overview, [38,29,32,14,32,19,27,48,48,29,10,14,14,14]],
      ['完整對話', detail, [38,29,18,70]], ['員工回覆紀錄', replies, [38,29,22,16,19,26,52,62]]]) {
      const sheet = xlsx.utils.aoa_to_sheet(rows);
      sheet['!cols'] = widths.map(wch => ({wch}));
      sheet['!autofilter'] = {ref: sheet['!ref']};
      xlsx.utils.book_append_sheet(workbook, sheet, name);
    }
    xlsx.writeFile(workbook, 'Caratzon-Product-Enquiries.xlsx', {compression:true});
  }

  async function openAgentQueue(ticket) {
    title.textContent = rt(0);
    const presenceButton = button(ct(staffOnline ? 4 : 3), async () => {
      presenceButton.disabled = true;
      try {
        await setStaffOnline(!staffOnline);
        presenceButton.textContent = ct(staffOnline ? 4 : 3);
      } catch { fail(ticket); }
      finally { presenceButton.disabled = false; }
    });
    const list = node('div', '');
    body.append(presenceButton, list);
    let snapshot;
    const refresh = async () => {
      const rows = await checked(client.rpc('cz_chat_agent_queue'));
      const next = JSON.stringify(rows);
      if (!current(ticket) || snapshot === next) return;
      snapshot = next;
      list.replaceChildren();
      if (!rows.length) list.append(node('p', rt(4)));
      for (const row of rows) {
        const entry = button([row.product_name, row.sku === 'LIVE-CHAT' ? '' : row.sku,
          new Date(row.created_at).toLocaleString()].filter(Boolean).join(' · '),
          () => openThread({...row, source:'live_chat'}, () => openList(), true));
        entry.classList.add('cz-enquiry-thread');
        list.append(entry);
      }
    };
    await refresh();
    pollWhile(ticket, refresh, 5);
  }

  async function agentRole() {
    const {data, error} = await client.rpc('cz_is_chat_agent');
    if (error && !['PGRST202', '42883'].includes(error.code)) throw error;
    if (error) return null;
    return data === true;
  }

  const managerCopy = {
    en: ['Enquiry type','All enquiries','Product enquiries','Delete','Permanently delete this enquiry and its messages?','Enquiry deleted.'],
    zh: ['咨询类型','全部咨询','商品咨询','删除','永久删除这条咨询及其全部消息？','已删除咨询。'],
    ru: ['Тип запроса','Все запросы','Запросы о товарах','Удалить','Навсегда удалить этот запрос и все его сообщения?','Запрос удалён.']
  };
  const mt = i => (managerCopy[document.documentElement.lang] || managerCopy.en)[i];
  let managerFilter = 'all';

  async function openList(product) {
    if (!client) {
      fail(show(tr(0)));
      return;
    }
    const ticket = show(product ? product.name + ' · ' + product.sku : tr(1));
    try {
      const {data, error} = await client.auth.getSession();
      if (!current(ticket)) return;
      if (error) throw error;
      const user = data.session?.user;
      if (!user && product) {
        openGuestForm(product);
        return;
      }
      if (!user) {
        dialog.close();
        if (typeof closeDetail === 'function') closeDetail();
        if (typeof toast === 'function') toast(tr(13));
        openLogin();
        return;
      }
      const admin = !product && await checked(client.rpc('cz_is_enquiry_admin'));
      const agent = product ? false : await agentRole();
      if (!product && !admin && agent) {
        if (current(ticket)) await openAgentQueue(ticket);
        return;
      }
      const filter = admin ? null : ['customer_id', user.id];
      let threads = (await readAll('cz_enquiries', threadFields, filter, 'created_at')).reverse();
      const removed = new Set();
      if (!current(ticket)) return;
      const back = () => openList(product);
      if (admin) {
        dialog.classList.add('cz-enquiry-manager');
        title.textContent = tr(2);
        const download = button(tr(8), async () => {
          download.disabled = true;
          status.textContent = '…';
          try {
            await exportWorkbook();
            if (current(ticket)) status.textContent = '';
          } catch {
            fail(ticket);
          } finally {
            download.disabled = false;
          }
        });
        download.classList.add('cz-manager-export');
        body.append(download);
      }
      if (product) {
        body.append(button(tr(3), () => {
          const draft = show(product.name + ' · ' + product.sku);
          body.append(button(tr(11), back));
          compose(draft, null, product, back);
        }));
      }
      const list = node('div', '');
      if (admin) list.className = 'cz-manager-list';
      body.append(list);
      const date = new Intl.DateTimeFormat(document.documentElement.lang, {dateStyle:'short', timeStyle:'short'});
      const renderList = rows => {
        const matching = rows.filter(row => !removed.has(row.id)
          && (!product || row.sku === product.sku)
          && (!admin || managerFilter === 'all' || (managerFilter === 'live_chat') === (row.source === 'live_chat')));
        list.replaceChildren();
        if (!matching.length && !product) list.append(node('p', tr(6)));
        for (const row of matching) {
          const label = [row.source === 'live_chat' ? ct(0) : '', row.product_name, row.sku,
            date.format(new Date(row.created_at)), admin ? row.contact_value || row.email : ''].filter(Boolean).join(' · ');
          const entry = button(admin ? '' : label, () => openThread(row, back, false, agent !== null && admin));
          entry.classList.add('cz-enquiry-thread');
          if (admin) {
            const isChat = row.source === 'live_chat';
            const generalChat = isChat && row.sku === 'LIVE-CHAT';
            const badge = node('span', isChat ? ct(0) : tr(0));
            badge.className = 'cz-manager-badge';
            badge.dataset.chat = String(isChat);
            const info = node('span', '');
            info.className = 'cz-manager-info';
            info.append(node('strong', generalChat ? ct(0) : row.product_name || row.sku),
              node('small', [generalChat ? '' : row.sku, date.format(new Date(row.created_at)),
                row.contact_value || row.email].filter(Boolean).join(' · ')));
            const arrow = node('span', '›');
            arrow.setAttribute('aria-hidden', 'true');
            entry.append(badge, info, arrow);
          }
          if (!admin) {
            list.append(entry);
            continue;
          }
          const wrapper = node('div', '');
          wrapper.className = 'cz-manager-row';
          const remove = button(mt(3), async () => {
            if (remove.disabled || !window.confirm(mt(4))) return;
            remove.disabled = true;
            try {
              await checked(client.rpc('cz_admin_delete_enquiry', {tid:row.id}));
              removed.add(row.id);
              if (current(ticket)) {
                renderList(threads);
                status.textContent = mt(5);
              }
            } catch { fail(ticket); }
            finally { remove.disabled = false; }
          });
          remove.classList.add('cz-manager-delete');
          remove.setAttribute('aria-label', mt(3) + ' · ' + (row.product_name || row.id));
          wrapper.append(entry, remove);
          list.append(wrapper);
        }
        return matching;
      };
      const matching = renderList(threads);
      if (admin) {
        const presenceButton = button(ct(staffOnline ? 4 : 3), async () => {
          presenceButton.disabled = true;
          try {
            await setStaffOnline(!staffOnline);
            presenceButton.textContent = ct(staffOnline ? 4 : 3);
          } catch { fail(ticket); }
          finally { presenceButton.disabled = false; }
        });
        const arrivals = node('p', '');
        arrivals.setAttribute('role', 'status');
        presenceButton.classList.add('cz-manager-presence');
        body.insertBefore(presenceButton, list);
        body.insertBefore(arrivals, list);
        const filterLabel = node('label', mt(0));
        filterLabel.className = 'cz-manager-filter';
        const category = node('select', '');
        for (const [key, label] of [['all', mt(1)], ['live_chat', ct(0)], ['product', mt(2)]]) {
          const option = node('option', label);
          option.value = key;
          category.append(option);
        }
        category.value = managerFilter;
        category.onchange = () => {
          managerFilter = category.value;
          renderList(threads);
        };
        filterLabel.append(category);
        body.insertBefore(filterLabel, list);
        const seen = new Set(threads.filter(row => row.source === 'live_chat').map(row => row.id));
        let newCount = 0;
        let snapshot = JSON.stringify(threads);
        pollWhile(ticket, async () => {
          const rows = (await readAll('cz_enquiries', threadFields, null, 'created_at')).reverse();
          if (!current(ticket)) return;
          for (const row of rows) {
            if (row.source !== 'live_chat' || seen.has(row.id)) continue;
            seen.add(row.id);
            newCount++;
          }
          if (newCount) arrivals.textContent = ct(9) + ' · ' + newCount;
          const next = JSON.stringify(rows);
          if (next !== snapshot) {
            snapshot = next;
            threads = rows;
            renderList(threads);
          }
        }, 5);
      }
      if (product && !matching.length) body.querySelector('button').click();
    } catch {
      fail(ticket);
    }
  }

  const detail = document.getElementById('v9Detail');
  const detailBody = document.getElementById('v9DetailBody');
  const inbox = button(tr(1), () => openList());
  document.querySelector('footer').append(inbox);
  const launcher = button(ct(0), () => {
    if (dialog.open && dialog.classList.contains('cz-chat-floating')) return dialog.close();
    return openChat();
  });
  launcher.id = 'cz-live-chat';
  document.body.append(launcher);
  client?.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') {
      staffOnline = false;
      clearInterval(heartbeat);
    }
  });
  const paintDetail = () => {
    launcher.textContent = ct(0);
    inbox.textContent = tr(1);
    const anchor = document.getElementById('v9DetailAdd');
    const existing = document.getElementById('cz-enquiry-product');
    if (existing) existing.textContent = tr(0);
    const productChat = document.getElementById('cz-product-chat');
    if (productChat) productChat.textContent = ct(0);
    if (!anchor || existing) return;
    const ask = button(tr(0), () => {
      const sku = detail.dataset.sku;
      const product = products.find(item => item.sku === sku);
      if (product) openList({sku, name:productTitle(product)});
    });
    ask.id = 'cz-enquiry-product';
    anchor.insertAdjacentElement('afterend', ask);
    const chat = button(ct(0), () => openChat(activeProduct()));
    chat.id = 'cz-product-chat';
    ask.insertAdjacentElement('afterend', chat);
  };
  new MutationObserver(paintDetail).observe(detailBody, {childList:true});
  new MutationObserver(paintDetail).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  paintDetail();
};

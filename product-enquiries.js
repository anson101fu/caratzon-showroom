window.initProductEnquiries = (client, openLogin) => {
  const copy = {
    ru: ['Задать вопрос', 'Мои вопросы', 'Управление запросами', 'Новый вопрос', 'Отправить', 'Закрыть', 'Нет запросов', 'Не удалось выполнить действие. Попробуйте ещё раз.', 'Экспорт Excel', 'Клиент', 'Сотрудник', 'Назад', 'Ваше сообщение', 'Войдите, чтобы задать вопрос.'],
    en: ['Ask about this product', 'My enquiries', 'Manage enquiries', 'New enquiry', 'Send', 'Close', 'No enquiries', 'Something went wrong. Please try again.', 'Export Excel', 'Customer', 'Staff', 'Back', 'Your message', 'Sign in to ask a question.'],
    zh: ['咨询此商品', '我的咨询', '咨询管理', '新建咨询', '发送', '关闭', '暂无咨询', '操作失败，请重试。', '导出 Excel', '客户', '客服', '返回', '请输入消息', '登录后即可咨询。']
  };
  const tr = i => (copy[document.documentElement.lang] || copy.ru)[i];
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
  const show = label => {
    const ticket = ++view;
    title.textContent = label;
    close.textContent = tr(5);
    body.replaceChildren();
    status.textContent = '';
    if (!dialog.open) dialog.showModal();
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

  const threadFields = 'id,created_at,email,sku,product_name';
  const messageFields = 'id,enquiry_id,created_at,sender,body';

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

  async function openThread(thread, back) {
    const ticket = show(thread.product_name + ' · ' + thread.sku);
    const date = new Intl.DateTimeFormat(document.documentElement.lang, {dateStyle:'short', timeStyle:'short'});
    body.append(button(tr(11), back), node('p', '#' + thread.id));
    try {
      const messages = await readAll('cz_enquiry_messages', messageFields, ['enquiry_id', thread.id], 'created_at');
      if (!current(ticket)) return;
      for (const message of messages) {
        const item = node('article', '');
        item.append(node('strong', tr(message.sender === 'staff' ? 10 : 9) + ' · ' + date.format(new Date(message.created_at))), node('p', message.body));
        body.append(item);
      }
      compose(ticket, thread, null, back);
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
      summary.latest = row;
      summaries.set(row.enquiry_id, summary);
    }
    const overview = [['查詢編號', '提交時間 (UTC)', '客戶電郵', 'SKU', '產品', '最初問題', '最後一則訊息', '最新時間 (UTC)', '訊息數', '跟進狀態']];
    for (const row of threads) {
      const item = summaries.get(row.id);
      overview.push([row.id, row.created_at, row.email, row.sku, row.product_name, item?.question || '',
        item?.latest.body || '', item?.latest.created_at || '', item?.count || 0,
        item?.latest.sender === 'staff' ? '已回覆' : '待回覆']);
    }
    const detail = [['查詢編號', '時間 (UTC)', '發送者', '訊息'], ...history.map(row =>
      [row.enquiry_id, row.created_at, row.sender === 'staff' ? '客服' : '客戶', row.body])];
    const xlsx = window.XLSX;
    const workbook = xlsx.utils.book_new();
    for (const [name, rows, widths] of [['查詢總表', overview, [38,29,32,19,27,48,48,29,10,14]],
      ['完整對話', detail, [38,29,12,70]]]) {
      const sheet = xlsx.utils.aoa_to_sheet(rows);
      sheet['!cols'] = widths.map(wch => ({wch}));
      sheet['!autofilter'] = {ref: sheet['!ref']};
      xlsx.utils.book_append_sheet(workbook, sheet, name);
    }
    xlsx.writeFile(workbook, 'Caratzon-Product-Enquiries.xlsx', {compression:true});
  }

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
      if (!user) {
        dialog.close();
        if (typeof closeDetail === 'function') closeDetail();
        if (typeof toast === 'function') toast(tr(13));
        openLogin();
        return;
      }
      const admin = !product && await checked(client.rpc('cz_is_enquiry_admin'));
      const filter = admin ? null : ['customer_id', user.id];
      const threads = (await readAll('cz_enquiries', threadFields, filter, 'created_at')).reverse();
      if (!current(ticket)) return;
      const back = () => openList(product);
      if (admin) {
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
        body.append(download);
      }
      if (product) {
        body.append(button(tr(3), () => {
          const draft = show(product.name + ' · ' + product.sku);
          body.append(button(tr(11), back));
          compose(draft, null, product, back);
        }));
      }
      const matching = product ? threads.filter(row => row.sku === product.sku) : threads;
      if (!matching.length && !product) body.append(node('p', tr(6)));
      const date = new Intl.DateTimeFormat(document.documentElement.lang, {dateStyle:'short', timeStyle:'short'});
      for (const row of matching) {
        const label = [row.product_name, row.sku, date.format(new Date(row.created_at)), admin ? row.email : ''].filter(Boolean).join(' · ');
        const entry = button(label, () => openThread(row, back));
        entry.classList.add('cz-enquiry-thread');
        body.append(entry);
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
  const paintDetail = () => {
    inbox.textContent = tr(1);
    const anchor = document.getElementById('v9DetailAdd');
    const existing = document.getElementById('cz-enquiry-product');
    if (existing) existing.textContent = tr(0);
    if (!anchor || existing) return;
    const ask = button(tr(0), () => {
      const sku = detail.dataset.sku;
      const product = products.find(item => item.sku === sku);
      if (product) openList({sku, name:productTitle(product)});
    });
    ask.id = 'cz-enquiry-product';
    anchor.insertAdjacentElement('afterend', ask);
  };
  new MutationObserver(paintDetail).observe(detailBody, {childList:true});
  new MutationObserver(paintDetail).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  paintDetail();
};

const navToggle = document.querySelector('[data-nav-toggle]');
const nav = document.querySelector('[data-nav]');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

function copyText(value) {
  if (!value) return Promise.reject(new Error('EMPTY'));
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement('textarea');
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  return Promise.resolve();
}

function flashMessage(message, type = 'success') {
  const node = document.createElement('div');
  node.className = `flash-message ${type}`;
  node.textContent = message;
  Object.assign(node.style, {
    position: 'fixed',
    left: '50%',
    bottom: '20px',
    transform: 'translateX(-50%)',
    zIndex: '999',
    minWidth: '220px',
    textAlign: 'center'
  });
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2800);
}

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    try {
      await copyText(button.getAttribute('data-copy'));
      flashMessage(`已复制：${button.getAttribute('data-copy')}`);
    } catch {
      flashMessage('复制失败，请手动复制。', 'error');
    }
  });
}

for (const form of document.querySelectorAll('[data-lead-form]')) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || '提交';
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const params = new URLSearchParams(window.location.search);
    payload.utm_source = params.get('utm_source') || '';
    payload.utm_medium = params.get('utm_medium') || '';
    payload.utm_campaign = params.get('utm_campaign') || '';
    payload.utm_term = params.get('utm_term') || '';
    payload.utm_content = params.get('utm_content') || '';
    payload.referrer = document.referrer || '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '提交中...';
    }
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || '提交失败');
      }
      form.reset();
      flashMessage(data.message || '线索已提交');
      const preferred = String(payload.preferred_channel || 'Telegram');
      if (preferred === 'WhatsApp' && data.next?.whatsappUrl) {
        setTimeout(() => {
          window.open(data.next.whatsappUrl, '_blank', 'noopener');
        }, 300);
      } else if (preferred === '微信' && data.next?.wechatId) {
        try {
          await copyText(data.next.wechatId);
          flashMessage(`已复制微信：${data.next.wechatId}`);
        } catch {
          flashMessage(`请手动添加微信：${data.next.wechatId}`, 'error');
        }
      } else if (data.next?.telegramUrl) {
        setTimeout(() => {
          window.open(data.next.telegramUrl, '_blank', 'noopener');
        }, 300);
      }
    } catch (error) {
      flashMessage(error.message || '提交失败，请稍后重试。', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

(() => {
  document.documentElement.classList.add('js');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  const mobile = window.matchMedia('(max-width: 960px)');
  const setMenu = (open, restoreFocus = false) => {
    if (open && mobile.matches) {
      const header = document.querySelector('.site-header');
      if (header.getBoundingClientRect().top > 0) window.scrollTo({ top: header.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
    }
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    nav?.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (restoreFocus) toggle?.focus();
  };
  setMenu(false);
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (toggle?.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { setMenu(false, true); return; }
    if (event.key !== 'Tab') return;
    const links = [...nav.querySelectorAll('a')];
    const last = links.at(-1);
    if (event.shiftKey && document.activeElement === toggle) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (toggle?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) setMenu(false);
  });
  mobile.addEventListener('change', () => setMenu(false));
  const messages = {
    'yo-gerencio': 'Yo Gerencio: formación y herramientas para liderar tu siguiente etapa.',
    'comunidad-experta': 'Comunidad Experta: conexión, mentoría y respaldo entre colegas.',
    'tribuna-femenina': 'Tribuna Femenina: un espacio para compartir tu criterio y ganar visibilidad.',
  };
  document.querySelectorAll('[data-goal]').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('[data-goal]').forEach((item) => item.classList.remove('is-selected'));
      link.classList.add('is-selected');
      const hint = document.querySelector('#path-hint');
      if (hint) hint.textContent = messages[link.dataset.goal];
    });
  });
  const dialog = document.querySelector('#video-dialog');
  const player = document.querySelector('#video-player');
  let videoTrigger;
  document.querySelectorAll('[data-video]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!dialog?.showModal || !player || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      videoTrigger = link;
      document.querySelector('#video-title').textContent = link.dataset.title;
      document.querySelector('#video-status').textContent = '';
      document.querySelector('#video-original').href = link.href;
      player.poster = link.dataset.poster;
      player.src = link.dataset.video;
      player.setAttribute('aria-label', link.dataset.title);
      dialog.showModal();
      document.querySelector('[data-close-video]').focus();
      // Playback follows the visitor's explicit click, never page loading.
      player.play().catch(() => {
        if (dialog.open) document.querySelector('#video-status').textContent = 'Pulsa reproducir en los controles del video para comenzar.';
      });
    });
  });
  document.querySelector('[data-close-video]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => {
    player.pause();
    player.removeAttribute('src');
    player.removeAttribute('poster');
    player.load();
    videoTrigger?.focus({ preventScroll: true });
  });
  player?.addEventListener('error', () => {
    if (dialog?.open) document.querySelector('#video-status').textContent = 'No se pudo reproducir el mensaje. Puedes abrir el video original con el enlace inferior.';
  });
  document.querySelectorAll('[data-member-carousel]').forEach(carousel => {
    const track = carousel.querySelector('.member-carousel-track');
    const previous = carousel.querySelector('[data-member-prev]');
    const next = carousel.querySelector('[data-member-next]');
    const status = carousel.querySelector('[data-member-status]');
    const controls = carousel.querySelector('.member-carousel-controls');
    const hint = carousel.querySelector('.member-carousel-hint');
    const compact = matchMedia('(max-width: 700px)');
    const cards = [...track.children];
    const visibleCards = () => cards.filter(card => !card.hidden);
    const currentIndex = visible => {
      const left = track.getBoundingClientRect().left;
      let current = 0;
      visible.forEach((card, index) => {
        if (Math.abs(card.getBoundingClientRect().left - left) < Math.abs(visible[current].getBoundingClientRect().left - left)) current = index;
      });
      return current;
    };
    const update = () => {
      const visible = visibleCards();
      const current = visible.length ? currentIndex(visible) : 0;
      const message = visible.length ? `Integrante ${current + 1} de ${visible.length}` : 'Sin integrantes para mostrar';
      if (status.textContent !== message) status.textContent = message;
      previous.disabled = current === 0;
      next.disabled = !visible.length || current === visible.length - 1;
      controls.hidden = !visible.length;
      hint.hidden = visible.length <= 1;
      if (track.hidden !== !visible.length) track.hidden = !visible.length;
    };
    const goTo = (index, immediate = false) => {
      if (!compact.matches) return;
      const visible = visibleCards();
      const card = visible[Math.max(0, Math.min(index, visible.length - 1))];
      if (!card) return;
      track.scrollTo({
        left: track.scrollLeft + card.getBoundingClientRect().left - track.getBoundingClientRect().left,
        behavior: immediate || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    };
    previous.addEventListener('click', () => goTo(currentIndex(visibleCards()) - 1));
    next.addEventListener('click', () => goTo(currentIndex(visibleCards()) + 1));
    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', event => {
      if (!compact.matches || event.target !== track) return;
      const visible = visibleCards();
      const current = visible.length ? currentIndex(visible) : 0;
      const destination = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: visible.length - 1 }[event.key];
      if (destination === undefined) return;
      event.preventDefault(); goTo(destination, event.key === 'Home' || event.key === 'End');
    });
    const setLayout = () => {
      if (compact.matches) {
        track.setAttribute('tabindex', '0');
        carousel.setAttribute('aria-roledescription', 'carrusel');
      } else {
        track.removeAttribute('tabindex');
        carousel.removeAttribute('aria-roledescription');
        track.scrollTo({ left: 0, behavior: 'instant' });
      }
      update();
    };
    compact.addEventListener('change', setLayout);
    new ResizeObserver(update).observe(track);
    const filters = new MutationObserver(() => {
      track.scrollTo({ left: 0, behavior: 'instant' });
      update();
    });
    cards.forEach(card => filters.observe(card, { attributes: true, attributeFilter: ['hidden'] }));
    setLayout();
  });
  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    const track = carousel.querySelector('.carousel-track');
    const cards = [...track.querySelectorAll('.video-card')];
    const previous = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    const status = carousel.querySelector('.carousel-status');
    cards.forEach((card, index) => {
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', 'diapositiva');
      card.setAttribute('aria-label', `Mensaje ${index + 1} de ${cards.length}`);
    });
    const update = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 24;
      const step = (cards[0]?.getBoundingClientRect().width || 1) + gap;
      const firstIndex = cards.indexOf(track.querySelector('.video-card'));
      const first = (firstIndex + Math.round(track.scrollLeft / step)) % cards.length + 1;
      const visible = Math.max(1, Math.round(track.clientWidth / step));
      previous.disabled = !carousel.hasAttribute('data-auto-carousel') && track.scrollLeft <= 2;
      next.disabled = !carousel.hasAttribute('data-auto-carousel') && track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      status.textContent = `Mensaje ${first} de ${cards.length} · ${Math.min(visible, cards.length)} visibles`;
    };
    let move = direction => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 24;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const step = (cards[0]?.getBoundingClientRect().width || 1) + gap;
      track.scrollBy({ left: direction * step, behavior: reduced ? 'instant' : 'smooth' });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
    });
    track.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(track);
    update();
    if (carousel.hasAttribute('data-auto-carousel')) {
      const control = carousel.querySelector('[data-carousel-autoplay]');
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      let paused = false;
      let visible = false;
      let timer;
      let moving = false;
      let cancelMove;
      const normalize = step => {
        while (track.scrollLeft >= step - 1) {
          const left = track.scrollLeft;
          track.append(track.firstElementChild);
          track.scrollTo({ left: Math.max(0, left - step), behavior: 'instant' });
        }
      };
      move = async direction => {
        if (moving || track.scrollWidth <= track.clientWidth + 1) return;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 24;
        const step = cards[0].getBoundingClientRect().width + gap;
        normalize(step);
        if (direction < 0 && track.scrollLeft < 1) {
          track.prepend(track.lastElementChild);
          track.scrollTo({ left: step, behavior: 'instant' });
        }
        const start = track.scrollLeft;
        const target = direction > 0 ? step : 0;
        moving = true;
        const completed = await new Promise(resolve => {
          let frame;
          let began;
          cancelMove = () => { cancelAnimationFrame(frame); resolve(false); };
          const tick = now => {
            began ??= now;
            const progress = reducedMotion.matches ? 1 : Math.min(1, (now - began) / 1200);
            const eased = (1 - Math.cos(Math.PI * progress)) / 2;
            track.scrollTo({ left: start + (target - start) * eased, behavior: 'instant' });
            if (progress < 1) frame = requestAnimationFrame(tick);
            else resolve(true);
          };
          frame = requestAnimationFrame(tick);
        });
        cancelMove = undefined;
        if (completed && direction > 0) {
          track.append(track.firstElementChild);
          track.scrollTo({ left: 0, behavior: 'instant' });
        }
        moving = false;
        update();
      };
      const sync = () => {
        clearTimeout(timer);
        control.textContent = paused ? 'Reanudar' : 'Pausar';
        control.setAttribute('aria-label', paused ? 'Reanudar avance automático' : 'Pausar avance automático');
        status.setAttribute('aria-live', paused ? 'polite' : 'off');
        if (paused || !visible || document.hidden) return;
        timer = setTimeout(async () => {
          if (!document.querySelector('dialog[open]')) {
            await move(1);
          }
          sync();
        }, 1800);
      };
      control.addEventListener('click', () => { paused = !paused; if (paused) cancelMove?.(); sync(); });
      track.addEventListener('pointerdown', () => { cancelMove?.(); sync(); });
      document.addEventListener('visibilitychange', sync);
      reducedMotion.addEventListener('change', sync);
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .15 }).observe(carousel);
      sync();
    }
  });
  const directoryForm = document.querySelector('#directory-search');
  if (directoryForm) {
    const query = document.querySelector('#member-query');
    const area = document.querySelector('#practice-filter');
    const verified = document.querySelector('#verified-filter');
    const cards = [...document.querySelectorAll('[data-member]')];
    const empty = document.querySelector('#directory-empty');
    const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const params = new URLSearchParams(location.search);
    query.value = params.get('q') || '';
    area.value = params.get('area') || '';
    verified.checked = params.get('verified') === 'true';
    const filter = () => {
      const terms = normalize(query.value).split(/\s+/).filter(Boolean);
      let total = 0;
      cards.forEach(card => {
        const text = normalize(`${card.dataset.name} ${card.dataset.location}`);
        const show = terms.every(term => text.includes(term)) && (!area.value || card.dataset.areas.split(' ').includes(area.value)) && (!verified.checked || card.dataset.verified === 'true');
        card.hidden = !show;
        if (show) total++;
      });
      document.querySelector('#directory-result-count').textContent = `${total} ${total === 1 ? 'perfil encontrado' : 'perfiles encontrados'}`;
      empty.hidden = total > 0;
      document.querySelectorAll('[data-area]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.area === area.value)));
      const updated = new URLSearchParams();
      if (query.value.trim()) updated.set('q', query.value.trim());
      if (area.value) updated.set('area', area.value);
      if (verified.checked) updated.set('verified', 'true');
      try { history.replaceState(null, '', `${location.pathname}${updated.size ? '?' + updated : ''}${location.hash}`); } catch { /* File preview can restrict history updates. */ }
    };
    directoryForm.addEventListener('submit', event => { event.preventDefault(); filter(); });
    query.addEventListener('input', filter);
    area.addEventListener('change', filter);
    verified.addEventListener('change', filter);
    directoryForm.addEventListener('reset', () => setTimeout(filter, 0));
    document.querySelectorAll('[data-area]').forEach(button => button.addEventListener('click', () => { area.value = button.dataset.area; filter(); }));
    document.querySelector('#directory-clear').addEventListener('click', () => directoryForm.reset());
    filter();
  }
  document.querySelectorAll('[data-newsletter]').forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = form.querySelector('button[type="submit"]');
      const status = form.querySelector('.newsletter-status');
      button.disabled = true;
      status.textContent = 'Registrando tu correo…';
      try {
        if (!['http:', 'https:'].includes(location.protocol)) throw new Error('No server');
        const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: form.elements.email.value, consent: form.elements.consent.checked }) });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || 'Request failed');
        status.textContent = 'Tu correo quedó registrado en la lista de novedades. Gracias por acompañarnos.';
        form.reset();
      } catch {
        status.textContent = 'No pudimos registrar tu correo en este momento. Inténtalo de nuevo más tarde.';
      } finally { button.disabled = false; }
    });
  });
  const admissionDialog = document.querySelector('.admission-dialog');
  const admissionForm = admissionDialog?.querySelector('[data-admission]');
  const admissionSuccess = admissionDialog?.querySelector('[data-admission-success]');
  let admissionStep = 1;
  const showAdmissionStep = (step, focus = false) => {
    admissionStep = step;
    admissionForm.querySelectorAll('[data-admission-step]').forEach(fieldset => { fieldset.hidden = Number(fieldset.dataset.admissionStep) !== step; });
    admissionForm.querySelector('[data-admission-final]').hidden = step !== 2;
    admissionForm.querySelector('[data-admission-back]').hidden = step === 1;
    admissionForm.querySelector('[data-admission-next]').hidden = step !== 1;
    const progress = admissionDialog.querySelector('[data-admission-progress]');
    progress.textContent = `Paso ${step} de 2 · ${step === 1 ? 'Contacto' : 'Perfil profesional'}`;
    admissionDialog.scrollTop = 0;
    if (focus) document.querySelector('#admission-title').focus({ preventScroll: true });
  };
  if (admissionForm) {
    admissionForm.noValidate = true;
    admissionForm.querySelector('[data-admission-actions]').hidden = false;
    admissionDialog.querySelector('[data-admission-progress]').hidden = false;
    const fields = [...admissionForm.querySelectorAll('input, select, textarea')];
    fields.forEach(field => {
      field.id ||= `application-${field.name}`;
      const error = document.createElement('span');
      error.className = 'field-error';
      error.id = `${field.id}-error`;
      error.hidden = true;
      field.after(error);
      field.setAttribute('aria-describedby', error.id);
      const check = () => {
        const invalid = !field.validity.valid;
        error.textContent = !invalid ? '' : field.validity.valueMissing ? (field.type === 'checkbox' ? 'Autoriza el uso de tus datos para continuar.' : 'Completa este campo.') : field.type === 'email' ? 'Ingresa un correo válido, por ejemplo nombre@correo.com.' : field.type === 'tel' ? 'Ingresa un teléfono válido con código de país.' : field.validationMessage;
        error.hidden = !invalid;
        field.setAttribute('aria-invalid', String(invalid));
        return !invalid;
      };
      field.addEventListener('invalid', check);
      field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') check(); });
    });
    const validateStep = () => {
      const invalid = fields.filter(field => !field.closest('[hidden]') && !field.checkValidity());
      if (invalid.length) { invalid[0].focus(); return false; }
      return true;
    };
    admissionForm.querySelector('[data-admission-next]').addEventListener('click', () => { if (validateStep()) showAdmissionStep(2, true); });
    admissionForm.querySelector('[data-admission-back]').addEventListener('click', () => showAdmissionStep(1, true));
    admissionForm.addEventListener('submit', event => {
      if (admissionStep === 1) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (validateStep()) showAdmissionStep(2, true);
      } else if (!validateStep()) { event.preventDefault(); event.stopImmediatePropagation(); }
    });
    admissionDialog.querySelector('[data-admission-done]').addEventListener('click', () => admissionDialog.close());
    admissionForm.addEventListener('reset', () => {
      fields.forEach(field => field.removeAttribute('aria-invalid'));
      admissionForm.querySelectorAll('.field-error').forEach(error => { error.hidden = true; error.textContent = ''; });
    });
    showAdmissionStep(1);
  }
  const contactContext = document.querySelector('[data-contact-context]');
  if (contactContext) {
    const member = new URLSearchParams(location.search).get('integrante');
    if (member) { contactContext.textContent = `Consulta por: ${member.slice(0, 120)}`; contactContext.hidden = false; }
  }
  let admissionTrigger;
  const openAdmission = trigger => {
    if (!admissionDialog?.showModal || admissionDialog.open) return;
    admissionTrigger = trigger;
    setMenu(false);
    const status = admissionDialog.querySelector('.admission-status');
    if (status.dataset.state === 'success') { status.textContent = ''; delete status.dataset.state; }
    if (!admissionSuccess.hidden) {
      admissionSuccess.hidden = true; admissionForm.hidden = false; showAdmissionStep(1);
    }
    admissionDialog.showModal();
    document.body.classList.add('admission-open');
    admissionDialog.scrollTop = 0;
    document.querySelector('#admission-title').focus({ preventScroll: true });
  };
  document.querySelectorAll('a[href="unete.html#solicitud"], [data-open-admission]').forEach(trigger => {
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'solicitud');
    trigger.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !admissionDialog?.showModal) return;
      event.preventDefault();
      openAdmission(trigger);
    });
  });
  admissionDialog?.querySelector('[data-close-admission]').addEventListener('click', () => admissionDialog.close());
  admissionDialog?.addEventListener('click', event => {
    if (event.target !== admissionDialog) return;
    const r = admissionDialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) admissionDialog.close();
  });
  admissionDialog?.addEventListener('close', () => {
    document.body.classList.remove('admission-open');
    admissionTrigger?.focus({ preventScroll: true });
  });
  if (location.hash === '#solicitud') openAdmission(document.querySelector('a[href="unete.html#solicitud"]'));
  document.querySelectorAll('[data-admission]').forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = form.querySelector('button[type="submit"]');
      const status = form.querySelector('.admission-status');
      button.disabled = true;
      status.textContent = 'Guardando tu solicitud…';
      try {
        if (!['http:', 'https:'].includes(location.protocol)) throw new Error('Abre la web desde el servidor para enviar tu solicitud.');
        const data = Object.fromEntries(new FormData(form));
        data.consent = form.elements.consent.checked;
        const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || 'No pudimos guardar tu solicitud. Inténtalo de nuevo.');
        status.textContent = result.message;
        status.dataset.state = 'success';
        form.reset();
        form.hidden = true;
        admissionSuccess.hidden = false;
        admissionDialog.scrollTop = 0;
        admissionSuccess.focus({ preventScroll: true });
      } catch (error) {
        status.dataset.state = 'error';
        status.textContent = error instanceof TypeError ? 'No pudimos conectar. Conservamos tus datos en el formulario para que puedas intentarlo de nuevo.' : error.message;
      } finally { button.disabled = false; }
    });
  });
})();

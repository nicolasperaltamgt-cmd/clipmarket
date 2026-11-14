const SB_URL = "https://zxhnxblflouukxagwmbb.supabase.co";
const SB_KEY = "sb_publishable_WxNJKw54UB5cQkgr-Mq1XA_vxWGNiAL";
const BUCKET = "clipmarket";
const sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY) : null;

// Perfiles ficticios con imagen ilustrativa. Se muestran solo mientras hay pocas muestras reales.
const examples = [
  {id:"ex-serum", example:true, video:"clip-1.mp4", title:"Rutina en 30 segundos", creator:"Sofi Vega", category:"Belleza", city:"Palermo, CABA", price_from:45000, image:"clip-1.webp", description:"Presentación de un sérum con luz natural y aplicación en cámara."},
  {id:"ex-matcha", example:true, video:"clip-2.mp4", title:"Matcha para llevar", creator:"Nico Paz", category:"Gastronomía", city:"Córdoba", price_from:30000, image:"clip-2.webp", description:"Preparación y primera impresión de un matcha frío."},
  {id:"ex-sneaker", example:true, video:"clip-3.mp4", title:"Zapatillas en movimiento", creator:"Juli Ríos", category:"Moda", city:"Rosario", price_from:60000, image:"clip-3.webp", description:"Detalles, ajuste y una toma caminando en exteriores."},
];
const categories = ["Belleza","Gastronomía","Moda","Tecnología","Mascotas","Hogar","Deportes","Otro"];
const videoTypes = ["Cómo se usa","Unboxing","Testimonio","Reseña","Anuncio"];
const durations = ["15 segundos","30 segundos","60 segundos"];
const stages = ["Enviado","En producción","Entregado","Aprobado"];
const EXT = {"video/mp4":"mp4","video/webm":"webm","video/quicktime":"mov"};

const $ = s => document.querySelector(s);
const grid = $("#grid"), dialog = $("dialog"), panel = $("#panel");
const fCategory = $("#category"), fSearch = $("#search"), fPrice = $("#price"), fSort = $("#sort");
let clips = [], user = null, pending = null, loading = true, loadError = false;

const esc = s => String(s ?? "").replace(/[&<>"']/g, x => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[x]);
const money = n => "$ " + Number(n).toLocaleString("es-AR");
const pub = path => `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
const myName = () => user?.user_metadata?.name || user?.email?.split("@")[0] || "";
const find = id => [...clips, ...examples].find(x => x.id === id);

/* ---------- Vidriera ---------- */
function shown() {
  const all = clips.length >= 6 ? clips : [...clips, ...examples];
  const q = fSearch.value.toLowerCase().trim(), cat = fCategory.value, max = Number(fPrice.value);
  const list = all.filter(x => (!cat || x.category === cat)
    && (!max || (x.price_from && x.price_from <= max))
    && [x.title, x.creator, x.category, x.description, x.city].join(" ").toLowerCase().includes(q));
  if (fSort.value === "cheap") list.sort((a, b) => (a.price_from || Infinity) - (b.price_from || Infinity));
  return list;
}
function media(x, big) {
  if (!x.video_path && !x.video) return `<img src="${esc(x.image)}" alt="" ${big ? "" : 'loading="lazy"'}>`;
  const thumb = x.video ? x.image : x.thumb_path && pub(x.thumb_path);
  const poster = thumb ? ` poster="${esc(thumb)}"` : "";
  const src = esc(x.video || pub(x.video_path)) + (thumb || big ? "" : "#t=0.1");
  return big ? `<video src="${src}"${poster} controls autoplay playsinline></video>`
    : `<video src="${src}"${poster} muted loop playsinline preload="${thumb ? "none" : "metadata"}"></video>`;
}
function card(x) {
  return `<button class="clip" data-clip="${esc(x.id)}" aria-label="${esc(x.title)}, de ${esc(x.creator)}">
    <span class="shot">${media(x)}${x.example ? '<span class="pill ex">Ejemplo</span>' : ""}<span class="playdot" aria-hidden="true">▶</span>
      <span class="who"><span class="pill">${esc(x.category)}</span><span>${esc(x.creator)}</span></span></span>
    <span class="line1"><span class="t">${esc(x.title)}</span>${x.price_from ? `<span class="p">${money(x.price_from)}</span>` : ""}</span>
    ${x.city ? `<span class="city">${esc(x.city)}</span>` : ""}</button>`;
}
function render() {
  const filtered = fCategory.value || fSearch.value.trim() || fPrice.value;
  $("#clear").hidden = !filtered;
  if (loading) {
    grid.innerHTML = Array(5).fill('<div class="clip skel"><span class="shot"></span></div>').join("");
    return;
  }
  const list = shown();
  $("#gridtitle").textContent = filtered ? `${list.length} ${list.length === 1 ? "video" : "videos"}` : "Videos";
  grid.innerHTML = list.map(card).join("") || `<div class="empty"><h3>No hay videos con esa búsqueda</h3>
    <p>Probá con otro rubro o sacá los filtros.</p><button class="outline" id="clear2">Ver todos</button></div>`;
  if (loadError && !filtered) grid.insertAdjacentHTML("beforeend", '<div class="empty"><p>No pudimos cargar los videos nuevos. Revisá la conexión y recargá.</p></div>');
}
async function loadClips() {
  if (!sb) { loading = false; loadError = true; return render(); }
  const { data, error } = await sb.from("cm_clips").select("*").order("created_at", { ascending:false }).limit(120);
  loading = false; loadError = !!error; clips = data || [];
  render();
}

/* ---------- Diálogo ---------- */
function show(html, wide) {
  dialog.classList.toggle("wide", !!wide);
  panel.innerHTML = html;
  if (!dialog.open) dialog.showModal();
  panel.querySelector("h2")?.focus();
}
const title = t => `<h2 id="dialog-title" tabindex="-1">${esc(t)}</h2>`;
const notice = '<p class="notice" role="alert"></p>';
function needUser(action) {
  if (user) return action();
  pending = action;
  auth("signup");
}

function detail(id) {
  const x = find(id);
  if (!x) return;
  const mine = user && x.user_id === user.id;
  const cta = x.example ? `<p>Perfil de ejemplo con imagen ilustrativa. No recibe pedidos.</p><button class="primary" data-view="upload">Subir mi video</button>`
    : mine ? `<p class="notice ok">Esta muestra es tuya. Así la ven las marcas.</p><button class="outline" data-del="${esc(x.id)}">Borrar muestra</button>`
    : `<button class="primary cta" data-order="${esc(x.id)}">Pedir un video</button><p>Gratis, sin comisión. El pago lo acuerdan entre ustedes.</p>`;
  show(`<div class="detail">${media(x, true)}<div class="side">
    <div class="facts"><span class="fact">${esc(x.category)}</span>${x.city ? `<span class="fact">${esc(x.city)}</span>` : ""}</div>
    ${title(x.title)}
    <div class="byline"><span class="av">${esc(x.creator.charAt(0).toUpperCase())}</span>${esc(x.creator)}</div>
    <p>${esc(x.description)}</p>
    ${x.instagram ? `<a class="outline" href="https://instagram.com/${esc(x.instagram)}" target="_blank" rel="noopener">@${esc(x.instagram)}</a>` : ""}
    ${x.price_from ? `<div class="bigprice">${money(x.price_from)} <small>desde, por video</small></div>` : ""}
    ${cta}${notice}</div></div>`, true);
}

/* ---------- Cuenta ---------- */
function auth(mode) {
  const up = mode === "signup";
  show(title(up ? "Creá tu cuenta" : "Entrá a tu cuenta") + `<p>${up ? "Es gratis. La necesitás para subir tu video o pedir uno." : "Con el mail y la contraseña que elegiste."}</p>
  <form data-form="${up ? "signup" : "login"}">
    ${up ? '<label>Tu nombre o el de tu marca<input name="name" required maxlength="60" autocomplete="name"></label>' : ""}
    <label>Mail<input name="email" type="email" required autocomplete="email"></label>
    <label>Contraseña ${up ? "<small>Al menos 6 caracteres</small>" : ""}<input name="password" type="password" required minlength="6" autocomplete="${up ? "new-password" : "current-password"}"></label>
    <button class="primary">${up ? "Crear cuenta" : "Entrar"}</button>${notice}</form>
  <p class="switch">${up ? "¿Ya tenés cuenta?" : "¿No tenés cuenta?"} <button class="linkbtn" data-auth="${up ? "login" : "signup"}">${up ? "Entrá" : "Creala gratis"}</button></p>`);
}
function account() {
  if (!user) return auth("login");
  show(title("Hola, " + myName()) + `<p>${esc(user.email)}</p><form><button type="button" class="outline" data-view="orders">Ver mis encargos</button>
    <button type="button" class="outline" data-view="logout">Cerrar sesión</button></form>`);
}
function authError(error) {
  const m = error?.message || "";
  if (/already registered/i.test(m)) return "Ese mail ya tiene cuenta. Entrá con tu contraseña.";
  if (/invalid login/i.test(m)) return "Mail o contraseña incorrectos.";
  if (/not confirmed/i.test(m)) return "Todavía no confirmaste el mail. Abrí el link que te mandamos.";
  if (/rate limit|too many/i.test(m)) return "Hubo muchos intentos seguidos. Esperá unos minutos y probá de nuevo.";
  if (/password/i.test(m)) return "La contraseña tiene que tener al menos 6 caracteres.";
  return "No pudimos completar el registro. Probá de nuevo.";
}

/* ---------- Subir video ---------- */
function upload() {
  show(title("Subí tu video") + `<p>Mostrá cómo presentás un producto. Queda público en la vidriera.</p><form data-form="upload">
  <label>Video <small>MP4, MOV o WebM, hasta 50 MB</small><input name="file" type="file" accept="video/mp4,video/webm,video/quicktime" required></label>
  <label>Título<input name="title" required maxlength="85" placeholder="Qué se ve en el video"></label>
  <div class="two"><label>Rubro<select name="category" required>${categories.map(c => `<option>${c}</option>`).join("")}</select></label>
    <label>Ciudad<input name="city" maxlength="60" placeholder="Opcional"></label></div>
  <div class="two"><label>Precio desde (ARS)<input name="price_from" type="number" min="1" step="1" inputmode="numeric" placeholder="Opcional"></label>
    <label>Instagram<input name="instagram" maxlength="31" placeholder="Opcional" autocapitalize="none"></label></div>
  <label>Descripción<textarea name="description" rows="2" maxlength="240" required placeholder="Qué producto es y qué mostrás"></textarea></label>
  <label>Tu nombre como creador<input name="creator" required maxlength="60" value="${esc(myName())}"></label>
  <label class="check"><input type="checkbox" name="rights" required><span>El video es mío y acepto que sea público.</span></label>
  <div class="bar" hidden><i></i></div>
  <button class="primary">Publicar</button>${notice}</form>`);
}
function makeThumb(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file), v = document.createElement("video");
    const done = blob => { clearTimeout(timer); URL.revokeObjectURL(url); resolve(blob); };
    const timer = setTimeout(() => done(null), 5000);
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    v.onloadeddata = () => { v.currentTime = Math.min(0.6, (v.duration || 1) / 2); };
    v.onseeked = () => {
      try {
        const w = 480, h = Math.round(w * v.videoHeight / v.videoWidth) || 600, c = document.createElement("canvas");
        c.width = w; c.height = h; c.getContext("2d").drawImage(v, 0, 0, w, h);
        c.toBlob(done, "image/jpeg", 0.8);
      } catch { done(null); }
    };
    v.onerror = () => done(null);
  });
}
async function putFile(path, blob, type, onProgress) {
  const { data } = await sb.auth.getSession();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SB_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("apikey", SB_KEY);
    xhr.setRequestHeader("authorization", "Bearer " + data.session.access_token);
    xhr.setRequestHeader("content-type", type);
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status)));
    xhr.onerror = () => reject(new Error("red"));
    xhr.send(blob);
  });
}

/* ---------- Encargos ---------- */
function order(id) {
  const x = find(id);
  if (!x || x.example) return;
  let brand = ""; try { brand = localStorage.getItem("cm-brand") || ""; } catch {}
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const chips = (name, list, picked) => `<fieldset class="chips"><legend>${name === "video_type" ? "Tipo de video" : "Duración"}</legend>${list.map(v =>
    `<label><input type="radio" name="${name}" value="${v}" ${v === picked ? "checked" : ""} required><span>${v}</span></label>`).join("")}</fieldset>`;
  show(title("Pedile un video a " + x.creator) + `<form data-form="order" data-id="${esc(x.id)}">
    <div class="two"><label>Tu marca<input name="brand" required maxlength="70" value="${esc(brand || myName())}"></label>
      <label>Producto<input name="product" required maxlength="100"></label></div>
    ${chips("video_type", videoTypes, videoTypes[0])}${chips("duration", durations, durations[1])}
    <label>Qué tiene que mostrar<textarea name="brief" required rows="3" maxlength="2000" placeholder="Lo que sí o sí tiene que verse o decirse, y lo que no."></textarea></label>
    <div class="two"><label>Cuánto pagás (ARS)<input name="budget" type="number" min="1" step="1" inputmode="numeric" required value="${x.price_from || ""}"></label>
      <label>Para cuándo<input name="deadline" type="date" required min="${tomorrow}"></label></div>
    <label>Dónde lo vas a usar<select name="usage"><option>Redes de la marca</option><option>Anuncios pagos</option><option>Redes y anuncios pagos</option></select></label>
    <button class="primary cta">Enviar pedido</button>${notice}</form>`);
}
async function orders(tab, message) {
  show(title("Encargos") + "<p>Cargando…</p>");
  const { data, error } = await sb.from("cm_orders").select("*").order("created_at", { ascending:false });
  if (error) return show(title("Encargos") + "<p>No pudimos cargar tus encargos. Revisá la conexión y probá de nuevo.</p>");
  const sent = data.filter(o => o.brand_id === user.id), got = data.filter(o => o.creator_id === user.id);
  tab = tab || (got.some(o => o.stage < 2) ? "got" : "sent");
  const list = tab === "got" ? got : sent;
  const row = o => {
    const creator = tab === "got", link = o.delivery_url && /^https:\/\//.test(o.delivery_url)
      ? `<a class="outline" href="${esc(o.delivery_url)}" target="_blank" rel="noopener">Ver video entregado</a>` : "";
    const action = creator
      ? [`<button class="primary" data-stage="${o.id}" data-to="1">Aceptar pedido</button>`,
         `<form class="deliver" data-form="deliver" data-id="${o.id}"><input name="url" type="url" required placeholder="Link al video (Drive, WeTransfer…)" aria-label="Link al video"><button class="primary">Entregar</button></form>`,
         link + "<p>Esperando que la marca lo apruebe.</p>", link + "<p>Aprobado. Coordiná el cobro con la marca.</p>"][o.stage]
      : ["<p>Esperando que el creador acepte.</p>", "<p>El creador está grabando.</p>",
         link + `<button class="primary" data-stage="${o.id}" data-to="3">Aprobar video</button>`, link + "<p>Aprobado. Coordiná el pago con el creador.</p>"][o.stage];
    return `<article class="order"><span class="stage s${o.stage}">${stages[o.stage]}</span>
      <h3>${esc(o.product)} · ${creator ? "de " + esc(o.brand) : "para " + esc(o.creator_name)}</h3>
      <p>${esc(o.video_type)} · ${esc(o.duration)} · ${money(o.budget)} · entrega ${esc(o.deadline.split("-").reverse().join("/"))} · ${esc(o.usage)}</p>
      <p class="brief">${esc(o.brief)}</p>
      <div class="track">${stages.map((s, i) => `<span class="${i <= o.stage ? "on" : ""}">${s}</span>`).join("")}</div>${action}</article>`;
  };
  show(title("Encargos") + (message ? `<p class="notice ok">${esc(message)}</p>` : "") +
    `<div class="tabs"><button data-tab="sent" aria-pressed="${tab === "sent"}">Los que pedí (${sent.length})</button>
      <button data-tab="got" aria-pressed="${tab === "got"}">Me pidieron (${got.length})</button></div>` +
    (list.map(row).join("") || `<article class="order"><p>${tab === "got" ? "Todavía nadie te pidió un video. Subí una muestra para que te encuentren." : "Todavía no pediste ningún video. Elegí uno en la vidriera."}</p></article>`) + notice);
}

/* ---------- Eventos ---------- */
document.addEventListener("click", async event => {
  const b = event.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (b.classList.contains("close")) return dialog.close();
  if (b.id === "clear" || b.id === "clear2") { fCategory.value = ""; fSearch.value = ""; fPrice.value = ""; return render(); }
  if (d.clip) return detail(d.clip);
  if (d.auth) return auth(d.auth);
  if (d.tab) return orders(d.tab);
  if (d.order) return needUser(() => order(d.order));
  if (d.view === "upload") return needUser(upload);
  if (d.view === "orders") return needUser(() => orders());
  if (d.view === "account") return account();
  if (d.view === "logout") { await sb.auth.signOut(); return dialog.close(); }
  if (d.stage) {
    b.disabled = true;
    const { error } = await sb.from("cm_orders").update({ stage:Number(d.to) }).eq("id", d.stage);
    if (error) { b.disabled = false; panel.querySelector(".notice:last-child").textContent = "No pudimos guardar el cambio. Probá de nuevo."; return; }
    return orders(d.to === "1" ? "got" : "sent");
  }
  if (d.del) {
    if (!d.sure) { d.sure = "1"; b.textContent = "Tocá de nuevo para borrarla"; return; }
    b.disabled = true;
    const x = find(d.del);
    await sb.storage.from(BUCKET).remove([x.video_path, x.thumb_path].filter(Boolean));
    const { error } = await sb.from("cm_clips").delete().eq("id", x.id);
    if (error) { b.disabled = false; panel.querySelector("[role=alert]").textContent = "No pudimos borrarla. Probá de nuevo."; return; }
    clips = clips.filter(c => c.id !== x.id); render(); dialog.close();
  }
});
dialog.addEventListener("close", () => { panel.innerHTML = ""; });
dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
grid.addEventListener("pointerover", e => { e.target.closest(".clip")?.querySelector("video")?.play().catch(() => {}); });
grid.addEventListener("pointerout", e => {
  const c = e.target.closest(".clip");
  if (c && !c.contains(e.relatedTarget)) c.querySelector("video")?.pause();
});
$("#searchform").addEventListener("submit", e => { e.preventDefault(); render(); $("#explorar").scrollIntoView(); });
[fCategory, fSearch, fPrice, fSort].forEach(el => el.addEventListener("input", render));

panel.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.target, type = form.dataset.form;
  if (!type) return;
  const message = form.querySelector("[role=alert]") || panel.querySelector("[role=alert]");
  const button = form.querySelector("button.primary");
  const data = Object.fromEntries(new FormData(form));
  const say = (t, ok) => { message.textContent = t; message.classList.toggle("ok", !!ok); };
  button.disabled = true; say("");
  try {
    if (type === "signup") {
      const { data:res, error } = await sb.auth.signUp({ email:data.email.trim(), password:data.password,
        options:{ data:{ name:data.name.trim() }, emailRedirectTo:location.origin + location.pathname } });
      if (error) return say(authError(error));
      if (res.user && res.user.identities && !res.user.identities.length) return say("Ese mail ya tiene cuenta. Entrá con tu contraseña.");
      if (!res.session) return say(`Te mandamos un mail a ${data.email.trim()}. Confirmá la cuenta desde ahí y después entrá.`, true);
    } else if (type === "login") {
      const { error } = await sb.auth.signInWithPassword({ email:data.email.trim(), password:data.password });
      if (error) return say(authError(error));
    } else if (type === "upload") {
      const file = data.file, ext = EXT[file.type];
      if (!ext) return say("Usá un video MP4, MOV o WebM.");
      if (file.size > 50 * 1024 * 1024) return say("El video supera los 50 MB. Recortalo o bajale la calidad.");
      const ig = data.instagram.trim().replace(/^@/, "");
      if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) return say("Revisá el usuario de Instagram: solo letras, números, punto y guion bajo.");
      const id = crypto.randomUUID(), bar = form.querySelector(".bar");
      bar.hidden = false; button.textContent = "Subiendo…";
      let thumb = null;
      const blob = await makeThumb(file);
      if (blob) { try { await putFile(`thumbs/${id}.jpg`, blob, "image/jpeg"); thumb = `thumbs/${id}.jpg`; } catch {} }
      try { await putFile(`videos/${id}.${ext}`, file, file.type, p => { bar.firstElementChild.style.width = Math.round(p * 100) + "%"; }); }
      catch (e) { bar.hidden = true; button.textContent = "Publicar"; return say(e.message === "413" ? "El video supera los 50 MB." : "No pudimos subir el video. Revisá la conexión y probá de nuevo."); }
      const { data:row, error } = await sb.from("cm_clips").insert({ creator:data.creator.trim(), title:data.title.trim(), category:data.category,
        description:data.description.trim(), city:data.city.trim() || null, price_from:data.price_from ? Number(data.price_from) : null,
        instagram:ig || null, video_path:`videos/${id}.${ext}`, thumb_path:thumb }).select().single();
      if (error) { bar.hidden = true; button.textContent = "Publicar"; return say("El video subió pero no pudimos publicarlo. Probá de nuevo."); }
      clips = [row, ...clips]; fCategory.value = ""; fSearch.value = ""; fPrice.value = "";
      render(); dialog.close(); $("#explorar").scrollIntoView();
    } else if (type === "order") {
      const x = find(form.dataset.id);
      const { error } = await sb.from("cm_orders").insert({ clip_id:x.id, clip_title:x.title, creator_id:x.user_id, creator_name:x.creator,
        brand:data.brand.trim(), product:data.product.trim(), video_type:data.video_type, duration:data.duration, brief:data.brief.trim(),
        budget:Number(data.budget), deadline:data.deadline, usage:data.usage });
      if (error) return say("No pudimos enviar el pedido. Revisá los datos y probá de nuevo.");
      try { localStorage.setItem("cm-brand", data.brand.trim()); } catch {}
      return orders("sent", `Pedido enviado a ${x.creator}. Lo va a ver en sus encargos.`);
    } else if (type === "deliver") {
      const url = data.url.trim();
      if (!/^https:\/\//.test(url)) return say("El link tiene que empezar con https://");
      const { error } = await sb.from("cm_orders").update({ stage:2, delivery_url:url }).eq("id", form.dataset.id);
      if (error) return say("No pudimos guardar la entrega. Probá de nuevo.");
      return orders("got");
    }
  } catch {
    say("Algo falló. Revisá la conexión y probá de nuevo.");
  } finally { if (button.isConnected) button.disabled = false; }
});

/* ---------- Inicio ---------- */
fCategory.innerHTML = '<option value="">Todos</option>' + categories.map(c => `<option>${c}</option>`).join("");
function setUser(u) {
  user = u || null;
  $("#account").textContent = user ? myName().split(" ")[0] : "Entrar";
  if (user && pending) { const next = pending; pending = null; setTimeout(next, 0); }
  else if (user && dialog.open && panel.querySelector('[data-form="signup"],[data-form="login"]')) dialog.close();
}
render();
if (sb) {
  sb.auth.getSession().then(({ data }) => setUser(data.session?.user));
  sb.auth.onAuthStateChange((_event, session) => setTimeout(() => setUser(session?.user), 0));
}
loadClips();

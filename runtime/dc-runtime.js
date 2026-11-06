/*
 * dc-runtime.js — a tiny, dependency-free renderer for the Unlocked prototype.
 *
 * The prototype is authored in Claude Design's canvas format (design/project/Main.dc.html):
 *   - markup with {{dotted.lookups}}, <sc-if value> and <sc-for list as>
 *   - a `class Component extends DCLogic` whose renderVals() returns the values
 * This file renders that format in any browser so the prototype can run
 * standalone (index.html, GitHub Pages) without the canvas.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var ONE_HOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;
  var TEXT_INPUTS = { text: 1, search: 1, email: 1, number: 1, date: 1, password: 1, tel: 1, url: 1, '': 1 };

  function DCLogic() {}
  DCLogic.prototype.forceUpdate = function () { if (this.__schedule) this.__schedule(); };

  // ---------- value lookup ----------
  function lookup(scope, path) {
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v === null || v === undefined) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  function resolveAttr(scope, raw) {
    var m = raw.match(ONE_HOLE);
    if (m) return lookup(scope, m[1]);
    if (raw.indexOf('{{') < 0) return raw;
    return raw.replace(HOLE, function (_, p) { var v = lookup(scope, p); return v === null || v === undefined ? '' : String(v); });
  }

  // ---------- template -> virtual tree ----------
  function eventName(tag, type, attr) {
    var e = attr.slice(2); // already lower-case from the HTML parser
    if (e === 'change' && (tag === 'textarea' || (tag === 'input' && TEXT_INPUTS[(type || '').toLowerCase()]))) return 'input';
    if (e === 'blur') return 'focusout';   // bubbles, like React's onBlur
    if (e === 'focus') return 'focusin';
    return e;
  }

  function build(node, scope, out) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      out.push({ text: t.indexOf('{{') < 0 ? t : resolveAttr(scope, t) });
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName, kids = [], i;

    if (tag === 'sc-if') {
      if (resolveAttr(scope, node.getAttribute('value') || '')) buildKids(node, scope, kids);
      out.push({ tag: tag, ns: null, props: {}, kids: kids });
      return;
    }
    if (tag === 'sc-for') {
      var list = resolveAttr(scope, node.getAttribute('list') || '') || [], as = node.getAttribute('as') || 'item';
      for (i = 0; i < list.length; i++) {
        var s = Object.create(scope); s[as] = list[i];
        buildKids(node, s, kids);
      }
      out.push({ tag: tag, ns: null, props: {}, kids: kids });
      return;
    }

    var props = {}, attrs = node.attributes, type = node.getAttribute('type');
    for (i = 0; i < attrs.length; i++) {
      var a = attrs[i], name = a.name;
      if (name.indexOf('hint-') === 0) continue;
      var v = resolveAttr(scope, a.value);
      if (name.indexOf('on') === 0 && name.length > 2) { props['on:' + eventName(tag, type, name)] = v; continue; }
      if (name.indexOf('aria-') === 0 && typeof v === 'boolean') v = String(v);
      props[name] = v;
    }
    buildKids(node.localName === 'template' ? node.content : node, scope, kids);
    out.push({ tag: tag, ns: node.namespaceURI === SVG_NS ? SVG_NS : null, props: props, kids: kids });
  }
  function buildKids(node, scope, out) {
    for (var c = node.firstChild; c; c = c.nextSibling) build(c, scope, out);
  }

  // ---------- virtual tree -> DOM (positional patching) ----------
  function setProp(el, k, v, old) {
    if (k.indexOf('on:') === 0) {
      var ev = k.slice(3);
      el.__h = el.__h || {};
      if (!(ev in el.__h)) el.addEventListener(ev, function (e) { var f = el.__h[ev]; if (typeof f === 'function') f(e); });
      el.__h[ev] = v;
      return;
    }
    if (k === 'value' && !el.namespaceURI.match(/svg/) && 'value' in el) {
      var s = v === null || v === undefined ? '' : String(v);
      if (el.value !== s) el.value = s;
      return;
    }
    if (k === 'checked' && 'checked' in el) { el.checked = !!v; return; }
    if (v === old) return;
    if (v === false || v === null || v === undefined) el.removeAttribute(k);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  function create(v) {
    if ('text' in v) return document.createTextNode(v.text);
    var el = v.ns ? document.createElementNS(v.ns, v.tag) : document.createElement(v.tag);
    v.kids.forEach(function (c) { el.appendChild(create(c)); });
    Object.keys(v.props).forEach(function (k) { setProp(el, k, v.props[k], undefined); });
    return el;
  }
  function patch(dom, o, n) {
    if ('text' in n) {
      if (o && 'text' in o) { if (o.text !== n.text) dom.nodeValue = n.text; return dom; }
      var t = create(n); dom.parentNode.replaceChild(t, dom); return t;
    }
    if (!o || 'text' in o || o.tag !== n.tag || o.ns !== n.ns) { var e = create(n); dom.parentNode.replaceChild(e, dom); return e; }
    Object.keys(o.props).forEach(function (k) { if (!(k in n.props)) setProp(dom, k, k.indexOf('on:') === 0 ? null : undefined, o.props[k]); });
    patchKids(dom, o.kids, n.kids);
    Object.keys(n.props).forEach(function (k) { setProp(dom, k, n.props[k], o.props[k]); }); // after kids, so <select value> sees its options
    return dom;
  }
  function patchKids(el, oldK, newK) {
    var i, nodes = Array.prototype.slice.call(el.childNodes);
    for (i = 0; i < newK.length; i++) {
      if (i < oldK.length && nodes[i]) patch(nodes[i], oldK[i], newK[i]);
      else el.appendChild(create(newK[i]));
    }
    for (i = nodes.length - 1; i >= newK.length; i--) el.removeChild(nodes[i]);
  }

  // ---------- mount ----------
  function mount(Component, template, root) {
    var c = new Component(), prev = [], queued = false;
    function render() {
      queued = false;
      var next = [];
      buildKids(template.content, c.renderVals() || {}, next);
      patchKids(root, prev, next);
      prev = next;
    }
    c.__schedule = function () { if (!queued) { queued = true; Promise.resolve().then(render); } };
    render();
    return c;
  }

  window.DCLogic = DCLogic;
  window.DCRuntime = { mount: mount };
})();

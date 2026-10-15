// Source-level interaction checks. This is not a browser or visual inspection.
const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const parse5 = require('parse5')
const postcss = require('postcss')
const html = fs.readFileSync(`${__dirname}/mockup.html`, 'utf8')
const tree = parse5.parse(html)
const all = [], byId = new Map()
function visit(node) {
  if (node.tagName) {
    const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]))
    const innerText = n => (n.value || '') + (n.childNodes || []).map(innerText).join('')
    const element = {
      tagName: node.tagName, attrs, dataset: {}, hidden: 'hidden' in attrs,
      value: node.tagName === 'textarea' ? innerText(node) : '',
      disabled: 'disabled' in attrs, textContent: innerText(node), firstChild: {textContent: innerText(node)},
      listeners: {},
      setAttribute(name, value) { this.attrs[name] = value },
      removeAttribute(name) { delete this.attrs[name]; if(name === 'data-pressed') delete this.dataset.pressed },
      addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback) },
      focus() { document.activeElement = this },
      fire(type, event = {}) { for (const f of this.listeners[type] || []) f({preventDefault() {}, ...event}) },
    }
    for(const [name, value] of Object.entries(attrs)) if(name.startsWith('data-')) element.dataset[name.slice(5)] = value
    all.push(element)
    if(attrs.id) { assert(!byId.has(attrs.id), `duplicate ID ${attrs.id}`); byId.set(attrs.id,element) }
  }
  for(const child of node.childNodes || []) visit(child)
}
visit(tree)
for(const el of all) {
  if(el.attrs.for) assert(byId.has(el.attrs.for), `missing label target ${el.attrs.for}`)
  if(el.attrs['aria-labelledby']) assert(byId.has(el.attrs['aria-labelledby']))
  if(el.attrs.href?.startsWith('#')) assert(byId.has(el.attrs.href.slice(1)), `missing anchor ${el.attrs.href}`)
}
const document = {
  activeElement: null, listeners: {},
  getElementById(id) { assert(byId.has(id), `missing script target ${id}`); return byId.get(id) },
  querySelectorAll(selector) {
    if(selector.startsWith('.')) return all.filter(e => (e.attrs.class || '').split(' ').includes(selector.slice(1)))
    const name = selector.slice(1,-1)
    return all.filter(e => name in e.attrs || name === 'data-pressed' && e.dataset.pressed)
  },
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback) },
}
postcss.parse(html.match(/<style>([\s\S]*?)<\/style>/)[1])
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
const scheduled = [];
vm.runInNewContext(script, {document, matchMedia: () => ({matches:false}), setTimeout: callback => {scheduled.push(callback); return scheduled.length}, clearTimeout: () => {}})
// Run even cancelled callbacks: session guards must reject them themselves.
const flush = () => {scheduled.splice(0).forEach(callback => callback())}
const get = id => byId.get(id)
const state = name => all.find(e => e.dataset.state === name).fire('click')
const target = name => all.find(e => e.dataset.target === name).fire('click')
const original=get('message').value
assert.equal(get('dictateLabel').textContent,'Dictate')
assert(!byId.has('capture'))
get('dictate').fire('click')
assert.equal(get('dictateLabel').textContent,'Stop dictation')
assert.equal(get('send').disabled,false)
assert(get('message').value.startsWith(original))
assert(get('message').value.includes('Um,'))
get('message').value += ' My typed correction.'
get('message').fire('input')
flush()
assert(get('message').value.includes('My typed correction.'))
assert(get('message').value.includes('without looking.'))
get('dictate').fire('click')
assert.equal(get('dictateLabel').textContent,'Dictate')
const raw=get('message').value
get('clean').fire('click')
assert(!get('message').value.includes('Um,'))
assert(!get('message').value.includes('Uh,'))
assert(get('message').value.includes('My typed correction.'))
assert.equal(get('cleanupNote').hidden,false)
get('undo').fire('click')
assert.equal(get('message').value,raw)
get('clean').fire('click')
get('message').value+=' New edit.'
get('message').fire('input')
const edited=get('message').value
assert.equal(get('undo').disabled,true)
get('undo').fire('click')
assert.equal(get('message').value,edited)
get('dictate').fire('click')
get('composer').fire('submit')
const submitted=get('message').value
flush()
assert.equal(get('message').value,submitted)
assert.equal(get('dictateLabel').textContent,'Dictate')
assert(get('result').textContent.includes('No AI request'))
get('dictate').fire('click')
const retained=get('message').value
target('answer')
flush()
assert.equal(get('message').value,'')
get('message').value='A separate answer.'
get('message').fire('input')
target('message')
assert.equal(get('message').value,retained)
target('answer')
assert.equal(get('message').value,'A separate answer.')
state('error')
assert.equal(get('failure').hidden,false)
assert.equal(get('send').disabled,false)
state('unavailable')
assert.equal(get('dictate').disabled,true)
assert.equal(get('send').disabled,false)
state('listening')
for(const f of document.listeners.keydown) f({key:'Escape',preventDefault(){}})
const stopped=get('message').value
flush()
assert.equal(get('message').value,stopped)
assert.equal(get('dictateLabel').textContent,'Dictate')
state('listening')
get('clean').fire('click')
const cleaned=get('message').value
flush()
assert.equal(get('message').value,cleaned)
assert.equal(get('dictateLabel').textContent,'Dictate')
assert(!/getUserMedia|SpeechRecognition|fetch\(|XMLHttpRequest|WebSocket|localStorage|@import/.test(html))
console.log('PASS: HTML/CSS/JS parse, direct transcription, toggle stop, live typing preserved, cleanup/undo, edits after cleanup protected, send freezes text, stale callbacks rejected, separate destinations, permission/unavailable fallback, Escape, no live APIs.')
console.log('NOT VERIFIED: browser rendering/layout, native focus, assistive technology, physical microphone, motion replay.')

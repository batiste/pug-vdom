/* eslint-env mocha */
var assert = require('assert')
var vDom = require('../pug-vdom')
var vm = require('vm')
require('../runtime');
var h = require('virtual-dom/h');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
var pugText1 = `
.my-element
`

var pugText2 = `
.my-element(data-foo=locals.myLocal)
`

var pugText3 = `
.class-1#my-id(data-foo=locals.myLocal, data-boo='goo',class='class-2 class-3')&attributes({class: "class-4"})
`

var pugText4 = `
.class-1#my-id(data-foo=locals.myLocal, class='class-2 class-3')&attributes({class: "class-4"}, {class: 'class-5', 'data-moo': locals.myOtherLocal})
`

var pugText5 = `
.class-1#my-id(data-foo=locals.myLocal, class=['class-2', 'class-3'])&attributes({class: ["class-4"]}, {class: 'class-5', 'data-moo': locals.myOtherLocal})
`

var pugText6 = `
.class-1#my-id(data-foo=locals.myLocal, class=['class-2', 'class-3'])&attributes({class: ["class-4"]}, {class: 'class-5', 'data-moo': locals.myOtherLocal}, {class: {'my-class': true, 'my-other-class': false, 'my-third-class': locals.myThirdLocal, 'my-fourth-class': locals.myFourthLocal } })
`

var pugText7 = `
.class-1(class={'class-2': locals.myLocal, 'class-3': false, 'class-4': {} })
`

var pugText8 = `
- var n = 0;
ul
    while n < locals.numChildren
        li= n++
`;

var pugText9 = `
.parent
    #{locals.myTagName}(data-foo="somevalue")
`;

var pugText10 = `
.my-element(data-foo=myLocal)
`

var pugText11 = `
div
    p This text belongs to the paragraph tag.
    br
    .
        This text belongs to the div tag.
`

var pugText12 = `
div
    | This text is #{"<div>plain</div>"}
    .foo bar
    | This text is #{"<div>plain</div>"}
`

var pugText13 = `
div
    | This text is !{"<div>html</div>"}
    .foo bar
    | This text is !{"<div>html</div>"}
`

var pugText14 = `
div
    | This text is #{locals.myText}
    .foo bar
    | This text is #{locals.myText}
`

var pugText15 = `
div
    | This text is !{locals.myText}
    .foo bar
    | This text is !{locals.myText}
`
var pugText16 = `
div
    p This text belongs to the paragraph tag.
    <div>This is html</div>
    br
    .
        This text belongs to the div tag.
`

var pugText17 = `
- this.words = ["myword"]
for word in this.words
  = word
`

var pugText18 = `
each x in func()
  = x
`


function vdom (tagname, attrs, children) {
  return {tagName: tagname, attrs: attrs, children: children}
}

describe('Compiler', function () {
  it('Generates well formed code', function (done) {
    var ast = vDom.ast('tpl/all.pug', './tpl')
    var compiler = new vDom.Compiler(ast)
    var code = compiler.compile()
    assert.ok(code)
    var render = new vm.Script(code + '\r\nrender({}, function(){})')
    var context = new vm.createContext({pugVDOMRuntime: pugVDOMRuntime,variable: 1, msg: 'Blop', friends: 10, inputs: []})
    render.runInContext(context)
    done()
  })

  it('Generates a module template', function (done) {
    vDom.generateFile('tpl/all.pug', 'public/all.pug.js', './tpl')
    var tpl = require('../public/all.pug.js')
    var tree = tpl({variable: 1, msg: 'Blop', friends: 10, inputs: []}, vdom)
    assert.ok(tree)
    done()
  })

  it('Compiles a template function from pug text', function (done) {
      assert.ok(typeof vDom.generateTemplateFunction(pugText1) === 'function')
      done()
  })

  it('Compiles a template function and executes it with locals object', function (done) {
      var vnodes = vDom.generateTemplateFunction(pugText2)({
          myLocal: "foo"
      }, h);
      var vnode = vnodes[0];

      assert.equal(vnode.properties.attributes['data-foo'], "foo")
      done()
  })

  it('Compiles a pug tag with complex attributes', function (done) {
      var vnodes = vDom.generateTemplateFunction(pugText3)({
          myLocal: "foo"
      }, h);
      var vnode = vnodes[0];

      assert.equal(vnode.properties.attributes.class, 'class-1 class-2 class-3 class-4')
      assert.equal(vnode.properties.attributes.id, 'my-id')
      assert.equal(vnode.properties.attributes['data-foo'], 'foo')
      assert.equal(vnode.properties.attributes['data-boo'], 'goo')
      assert.equal(vnode.key, 'my-id')

      done()
  })

  it('Compiles a pug tag with complex attributes using multiple &attributes blocks', function (done) {
      var vnodes = vDom.generateTemplateFunction(pugText4)({
          myLocal: "foo",
          myOtherLocal: "moo"
      }, h);
      var vnode = vnodes[0];

      assert.equal(vnode.properties.attributes.class, 'class-1 class-2 class-3 class-4 class-5')
      assert.equal(vnode.properties.attributes.id, 'my-id')
      assert.equal(vnode.properties.attributes['data-foo'], 'foo')
      assert.equal(vnode.properties.attributes['data-moo'], 'moo')
      assert.equal(vnode.key, 'my-id')

      done()
  })

  it('Compiles a pug tag with complex attributes using multiple &attributes blocks and class attribute as array', function (done) {
      var vnodes = vDom.generateTemplateFunction(pugText5)({
          myLocal: "foo",
          myOtherLocal: "moo"
      }, h);
      var vnode = vnodes[0];

      assert.equal(vnode.properties.attributes.class, 'class-1 class-2 class-3 class-4 class-5')
      assert.equal(vnode.properties.attributes.id, 'my-id')
      assert.equal(vnode.properties.attributes['data-foo'], 'foo')
      assert.equal(vnode.properties.attributes['data-moo'], 'moo')
      assert.equal(vnode.key, 'my-id')

      done()
  })

  it('Compiles a pug tag with complex attributes using multiple &attributes blocks and class attribute as object', function (done) {
    var vnodes = vDom.generateTemplateFunction(pugText6)({
        myLocal: "foo",
        myOtherLocal: "moo",
        myThirdLocal: true,
        myFourthLocal: false
    }, h);
    var vnode = vnodes[0];

    assert.equal(vnode.properties.attributes.class, 'class-1 class-2 class-3 class-4 class-5 my-class my-third-class')
    assert.equal(vnode.properties.attributes.id, 'my-id')
    assert.equal(vnode.properties.attributes['data-foo'], 'foo')
    assert.equal(vnode.properties.attributes['data-moo'], 'moo')
    assert.equal(vnode.key, 'my-id')

    done()
  })

  it('Compiles a pug tag with class attribute as object', function (done) {
    var vnodes = vDom.generateTemplateFunction(pugText7)({
        myLocal: true
    }, h);
    var vnode = vnodes[0];

    assert.equal(vnode.properties.attributes.class, 'class-1 class-2 class-4')

    done()
  })

  it('Compiles pug code using while loop', function (done) {
    var vnodes = vDom.generateTemplateFunction(pugText8)({
        numChildren: 4
    }, h);
    var vnode = vnodes[0];

    assert.equal(vnode.tagName, `UL`)
    assert.equal(vnode.children.length, 4)
    assert.ok(vnode.children.every(child => child.tagName === 'LI'))

    done()
  })

  it('Only evaluates expression once in for...in loop', function(done) {
    var callCount = 0;
    var vnodes = vDom.generateTemplateFunction(pugText18)({
      func: function() {
        callCount += 1;

        return [1, 2];
      }
    }, h);

    assert.equal(callCount, 1)
    done()
  })

  it('Keeps `this` unchanged inside for...in loop', function (done) {
    var vnodes = vDom.generateTemplateFunction(pugText17).call({}, {}, h);

    assert.equal(vnodes[0], 'myword')
    done()
  })

  it('Compiles a tag with interpolated tagname', function (done) {
    var vnodes = vDom.generateTemplateFunction(pugText9)({
        myTagName: 'span'
    }, h);
    var vnode = vnodes[0];

    assert.equal(vnode.children.length, 1)
    assert.equal(vnode.children[0].tagName, 'SPAN')

    done()
  })

  it('Compiles a template with locals namespace conflict', function (done) {
    global.myLocal = 'wrong';
    var vnodes = vDom.generateTemplateFunction(pugText10)({
        myLocal: "foo"
    }, h);
    var vnode = vnodes[0];

    assert.equal(vnode.properties.attributes['data-foo'], "foo")
    done()
  })

  it('Compiles a tag with dot block content.', function (done) {
    var vnodes = vDom.generateTemplateFunction(pugText11)({}, h);
    var vnode = vnodes[0];

    assert.equal(vnode.children[2].type, 'VirtualText');
    assert.equal(vnode.children[2].text, 'This text belongs to the div tag.');

    done()
  })

  it('Compiles a tag with buffered escaped string content.', function (done) {
    var vnodes = vDom.generateTemplateFunction(pugText12)({}, h);
    var vnode = vnodes[0];

    assert.equal(vnode.children[1].type, 'VirtualText');
    assert.equal(vnode.children[1].text, "<div>plain</div>");
    assert.notEqual(vnode.children[2].type, 'Widget');
    assert.equal(vnode.children[4].type, 'VirtualText');
    assert.equal(vnode.children[4].text, "<div>plain</div>");

    done()
  })

  it('Compiles a tag with buffered non-escaped string content.', function (done) {
    global.document = (new JSDOM(`<!DOCTYPE html><html><body></body></html>`)).window.document;
    var vnodes = vDom.generateTemplateFunction(pugText13)({}, h);
    var vnode = vnodes[0];

    assert.equal(vnode.children[1].type, 'Widget');
    assert.equal(vnode.children[1].el.outerHTML, "<div>html</div>");
    assert.notEqual(vnode.children[2].type, 'Widget');
    assert.equal(vnode.children[4].type, 'Widget');
    assert.equal(vnode.children[4].el.outerHTML, "<div>html</div>");

    delete global.document;

    done()
  })

  it('Compiles a tag with buffered escaped string content from local var.', function (done) {
    var vnodes = vDom.generateTemplateFunction(pugText14)({ myText: '<div>plain</div>' }, h);
    var vnode = vnodes[0];

    assert.equal(vnode.children[1].type, 'VirtualText');
    assert.equal(vnode.children[1].text, "<div>plain</div>");
    assert.notEqual(vnode.children[2].type, 'Widget');
    assert.equal(vnode.children[4].type, 'VirtualText');
    assert.equal(vnode.children[4].text, "<div>plain</div>");

    done()
  })



  it('Compiles a tag with buffered non-escaped string content from local var.', function (done) {
    global.document = (new JSDOM(`<!DOCTYPE html><html><body></body></html>`)).window.document;
    var vnodes = vDom.generateTemplateFunction(pugText15)({ myText: '<div>html</div>' }, h);
    var vnode = vnodes[0];

    assert.equal(vnode.children[1].type, 'Widget');
    assert.equal(vnode.children[1].el.outerHTML, "<div>html</div>");
    assert.notEqual(vnode.children[2].type, 'Widget');
    assert.equal(vnode.children[4].type, 'Widget');
    assert.equal(vnode.children[4].el.outerHTML, "<div>html</div>");

    delete global.document;

    done()
  })

  it('Compiles a tag containing HTML text line.', function (done) {
    global.document = (new JSDOM(`<!DOCTYPE html><html><body></body></html>`)).window.document;
    var vnodes = vDom.generateTemplateFunction(pugText16)({}, h);
    var vnode = vnodes[0];

    assert.equal(vnode.children[1].type, 'Widget');
    assert.equal(vnode.children[1].el.outerHTML, '<div>This is html</div>');

    delete global.document;

    done()
  })

})

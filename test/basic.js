/* eslint-env mocha */
var assert = require('assert')
var vDom = require('../pug-vdom')
var vm = require('vm')

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
    var context = new vm.createContext({variable: 1, msg: 'Blop', friends: []})
    render.runInContext(context)
    done()
  })

  it('Generates a module template', function (done) {
    vDom.generateFile('tpl/all.pug', 'public/all.pug.js', './tpl')
    var tpl = require('../public/all.pug.js')
    var tree = tpl({variable: 1, msg: 'Blop', friends: []}, vdom)
    assert.ok(tree)
    done()
  })
})

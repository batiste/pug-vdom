/* eslint-env mocha */
var assert = require('assert')
var vDom = require('../pug-vdom')
var vm = require('vm')

describe('Compiler', function () {
  it('should return -1 when the value is not present', function () {
    var ast = vDom.ast('tpl/all.pug', './tpl')
    var compiler = new vDom.Compiler(ast)
    compiler.compile()
    var code = compiler.buffer.join('')
    assert.ok(code)
    var render = new vm.Script(code + '\r\nrender({}, function(){})')
    var context = new vm.createContext({variable: 1, msg: 'Blop', friends: []})
    render.runInContext(context)
  })
})

var render = require('./public/all.pug.js')
var h = require('virtual-dom/h')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')
var createElement = require('virtual-dom/create-element')

function int () {
  return Math.floor((Math.random() + 1) * 100)
}

function randomContext () {
  return {
    variable: int(),
    msg: 'there is ' + int() + ' ponies',
    friends: int(),
    inputs: [1, 2, 4, 5]
  }
}

var tree = render(randomContext(), h)
var rootNode = createElement(tree[0])
document.querySelector('main').appendChild(rootNode)

var dom = document.getElementById('reRender')
dom.addEventListener('click', function () {
  var newTree = render(randomContext(), h)
  var domDiff = diff(tree[0], newTree[0])
  patch(rootNode, domDiff)
  tree = newTree
})

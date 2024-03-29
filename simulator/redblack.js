/*
 * An implementation of self-balancing red-black tree.
 *
 * Obtained from:
 * https://github.com/scttnlsn/redblack.js
 *
 * Distributed under the MIT license:
 *
 * Copyright (C) 2012 Scott Nelson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * License link:
 * https://github.com/scttnlsn/redblack.js/blob/master/LICENSE
 */

(function() {

    var redblack = {};
    var root = this;
    var orig = root.redblack;

    /*if (typeof module !== 'undefined' && module.exports) {
        module.exports = redblack;
    } else {
        root.redblack = redblack;
    }*/
    root.redblack = redblack;   // we're not intending to use node so this is enough

    redblack.VERSION = '0.1.2';

    redblack.noConflict = function() {
        root.redblack = orig;
        return redblack;
    };

    redblack.tree = function() {
        return new Tree();
    };

    var BLACK = redblack.BLACK = 'black';
    var RED = redblack.RED = 'red';

    // Node
    // ---------------

    function Node(key, value) {
        this.key = key;
        this.value = value;
        this.color = RED;
        this.left = null;
        this.right = null;
        this.parent = null;
    };

    Node.prototype.grandparent = function() {
        if (this.parent === null) return null;
        return this.parent.parent;
    };

    Node.prototype.sibling = function() {
        if (this.parent === null) return null;
        return this === this.parent.left ? this.parent.right : this.parent.left;
    };

    Node.prototype.uncle = function() {
        if (this.parent === null) return null;
        return this.parent.sibling();
    };

    // Cursor
    // ---------------

    function Cursor(tree, start, end) {
        this.tree = tree;
        this.start = start;
        this.end = end;

        var self = this;
        this.walk = function walk(node, iterator) {
            if (node === null) return;

            if (start !== undefined && node.key < start) {
                walk(node.right, iterator);
            } else if (end !== undefined && node.key > end) {
                walk(node.left, iterator);
            } else {
                walk(node.left, iterator);
                iterator(node.value, node.key, self.tree);
                walk(node.right, iterator);
            }
        };
    };

    Cursor.prototype.forEach = function(iterator) {
        this.walk(this.tree.root, iterator);
    };

    Cursor.prototype.map = function(iterator) {
        var results = [];

        this.forEach(function(value, key, tree) {
            results.push(iterator(value, key, tree));
        });

        return results;
    };

    // Tree
    // ---------------

    function Tree() {
        this.root = null;
        this.balancer = new Balancer(this);
    };

    Tree.prototype.get = function(key) {
        var node = find(this.root, key);
        return node === null ? null : node.value;
    };

    Tree.prototype.insert = function(key, value) {
        var newNode = new Node(key, value);

        if (this.root === null) {
            this.root = newNode;
        } else {
            var node = this.root;

            while (true) {
                if (key < node.key) {
                    if (node.left === null) {
                        node.left = newNode;
                        break;
                    } else {
                        node = node.left;
                    }
                } else if (key > node.key) {
                    if (node.right === null) {
                        node.right = newNode;
                        break;
                    } else {
                        node = node.right;
                    }
                } else {
                    node.value = value;
                    return;
                }
            }

            newNode.parent = node;
        }

        this.balancer.inserted(newNode);
    };

    Tree.prototype.delete = function(key) {
        var node = find(this.root, key);
        if (node === null) return;

        if (node.left !== null && node.right !== null) {
            var pred = node.left;
            while (pred.right !== null) pred = pred.right;

            node.key = pred.key;
            node.value = pred.value;
            node = pred;
        }

        var child = (node.right === null) ? node.left : node.right;
        if (nodeColor(node) === BLACK) {
            node.color = nodeColor(child);
            this.balancer.deleted(node);
        }

        this.balancer.replaceNode(node, child);

        if (nodeColor(this.root) === RED) {
            this.root.color = BLACK;
        }
    };

    Tree.prototype.range = function(start, end) {
        return new Cursor(this, start, end);
    };

    /*
     * Additional functions, written for RazSim ------------------------------------------------------------------------
     */

    /* A method that accepts a node (not a key) directly and deletes it. Modified from Tree.delete(). */
    function directDelete (tree, node) {
        if (node === undefined || node === null) return null;

        if (node.left !== null && node.right !== null) {
            var pred = node.left;
            while (pred.right !== null) pred = pred.right;

            node.key = pred.key;
            node.value = pred.value;
            node = pred;
        }

        var child = (node.right === null) ? node.left : node.right;
        if (nodeColor(node) === BLACK) {
            node.color = nodeColor(child);
            tree.balancer.deleted(node);
        }

        tree.balancer.replaceNode(node, child);

        if (nodeColor(tree.root) === RED) {
            tree.root.color = BLACK;
        }
    }

    /* A method that returns a value of a key in the tree and deletes it. */
    Tree.prototype.getDelete = function(key) {
        var node = find(this.root, key);
        var retVal = node === null ? null : node.value;

        directDelete(this, node);

        return retVal;
    }

    /* A method that returns the value of the leftmost node in the tree and deletes it. Modified from Tree.delete(). */
    Tree.prototype.leftmostDelete = function() {
        var node = leftmostFind(this.root);
        var retVal = node === null ? null : node.value;

        directDelete(this, node);

        return retVal;
    }

    /* A method that checks the value of the leftmost node in the tree WITHOUT deleting it. */
    Tree.prototype.leftmost = function() {
        var retVal = leftmostFind(this.root);
        return retVal === null ? null : retVal.value;
    }

    /* A helper function that finds the leftmost node in the tree (the one with lowest value). */
    function leftmostFind(node) {
        while (node !== null && node.left !== null) {
            node = node.left;
        }

        return node;
    }

    /*
     * -----------------------------------------------------------------------------------------------------------------
     */

    // Proxy cursor methods
    for (var method in Cursor.prototype) {
        if (Cursor.prototype.hasOwnProperty(method)) {
            var func = Cursor.prototype[method];
            Tree.prototype[method] = function() {
                var cursor = new Cursor(this);
                return func.apply(cursor, arguments);
            };
        }
    }

    // Balancer
    // ---------------

    function Balancer(tree) {
        this.tree = tree;
    };

    Balancer.prototype.inserted = function(node) {
        this.insertCase1(node);
    };

    Balancer.prototype.deleted = function(node) {
        this.deleteCase1(node);
    };

    Balancer.prototype.replaceNode = function(original, replacement) {
        if (original.parent === null) {
            this.tree.root = replacement;
        } else {
            if (original === original.parent.left) {
                original.parent.left = replacement;
            } else {
                original.parent.right = replacement;
            }
        }

        if (replacement !== null) {
            replacement.parent = original.parent;
        }
    };

    Balancer.prototype.rotateLeft = function(node) {
        var right = node.right;
        this.replaceNode(node, right);

        // Update pointers
        node.right = right.left;
        if (right.left !== null) right.left.parent = node;
        right.left = node;
        node.parent = right;
    };

    Balancer.prototype.rotateRight = function(node) {
        var left = node.left;
        this.replaceNode(node, left);

        // Update pointers
        node.left = left.right;
        if (left.right !== null) left.right.parent = node;
        left.right = node;
        node.parent = left;
    };

    Balancer.prototype.insertCase1 = function(node) {
        if (node.parent === null) {
            node.color = BLACK;
        } else {
            this.insertCase2(node);
        }
    };

    Balancer.prototype.insertCase2 = function(node) {
        if (nodeColor(node.parent) === BLACK) {
            return;
        } else {
            this.insertCase3(node);
        }
    };

    Balancer.prototype.insertCase3 = function(node) {
        var uncle = node.uncle();
        var grandparent = node.grandparent();

        if (uncle !== null && nodeColor(uncle) === RED) {
            node.parent.color = BLACK;
            uncle.color = BLACK;
            grandparent.color = RED;
            this.insertCase1(grandparent);
        } else {
            this.insertCase4(node);
        }
    };

    Balancer.prototype.insertCase4 = function(node) {
        var grandparent = node.grandparent();

        if (node === node.parent.right && node.parent === grandparent.left) {
            this.rotateLeft(node.parent);
            node = node.left;
        } else if (node === node.parent.left && node.parent === grandparent.right) {
            this.rotateRight(node.parent);
            node = node.right;
        }

        this.insertCase5(node);
    };

    Balancer.prototype.insertCase5 = function(node) {
        var grandparent = node.grandparent();

        node.parent.color = BLACK;
        grandparent.color = RED;

        if (node === node.parent.left && node.parent === grandparent.left) {
            this.rotateRight(grandparent);
        } else if (node === node.parent.right && node.parent === grandparent.right) {
            this.rotateLeft(grandparent);
        }
    };

    Balancer.prototype.deleteCase1 = function(node) {
        if (node.parent !== null) this.deleteCase2(node);
    };

    Balancer.prototype.deleteCase2 = function(node) {
        var sibling = node.sibling();

        if (nodeColor(sibling) === RED) {
            node.parent.color = RED;
            sibling.color = BLACK;
            if (node === node.parent.left) {
                this.rotateLeft(node.parent);
            } else {
                this.rotateRight(node.parent);
            }
        }

        this.deleteCase3(node);
    };

    Balancer.prototype.deleteCase3 = function(node) {
        var sibling = node.sibling();

        if (nodeColor(node.parent) === BLACK &&
            nodeColor(sibling) === BLACK &&
            nodeColor(sibling.left) === BLACK &&
            nodeColor(sibling.right) === BLACK) {

            sibling.color = RED;
            this.deleteCase1(node.parent);
        } else {
            this.deleteCase4(node);
        }
    };

    Balancer.prototype.deleteCase4 = function(node) {
        var sibling = node.sibling();

        if (nodeColor(node.parent) === RED &&
            nodeColor(sibling) === BLACK &&
            nodeColor(sibling.left) === BLACK &&
            nodeColor(sibling.right) === BLACK) {

            sibling.color = RED;
            node.parent.color = BLACK;
        } else {
            this.deleteCase5(node);
        }
    };

    Balancer.prototype.deleteCase5 = function(node) {
        var sibling = node.sibling();

        if (node === node.parent.left &&
            nodeColor(sibling) === BLACK &&
            nodeColor(sibling.left) === RED &&
            nodeColor(sibling.right) === BLACK) {

            sibling.color = RED;
            sibling.left.color = BLACK;
            this.rotateRight(sibling);
        } else if (node === node.parent.right &&
            nodeColor(sibling) === BLACK &&
            nodeColor(sibling.right) === RED &&
            nodeColor(sibling.left) === BLACK) {

            sibling.color = RED;
            sibling.right.color = BLACK;
            this.rotateLeft(sibling);
        }

        this.deleteCase6(node);
    };

    Balancer.prototype.deleteCase6 = function(node) {
        var sibling = node.sibling();

        sibling.color = nodeColor(node.parent);
        node.parent.color = BLACK;

        if (node === node.parent.left) {
            sibling.right.color = BLACK;
            this.rotateLeft(node.parent);
        } else {
            sibling.left.color = BLACK;
            this.rotateRight(node.parent);
        }
    };

    // Helpers
    // ---------------

    function nodeColor(node) {
        return node === null ? BLACK : node.color;
    };

    function find(node, key) {
        while (node !== null) {
            if (key === node.key) {
                return node;
            } else if (key < node.key) {
                node = node.left;
            } else if (key > node.key) {
                node = node.right;
            }
        }

        return node;
    };

})();

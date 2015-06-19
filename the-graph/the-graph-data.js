(function (context) {
  "use strict";

  var TheGraph = context.TheGraph;
  var Mori = require('mori');

  Mori.dissocIn = function(coll, keys) {
    if (keys.length < 2) return mori.dissoc(coll, keys[0]);

    var subKeys = keys.slice(0, keys.length - 1);
    return Mori.assocIn(coll, subKeys,
                        Mori.dissoc(Mori.getIn(coll, subKeys), keys[keys.length - 1]));
  };

  Mori.dissocInAndClean = function(coll, keys) {
    while (key.length > 1 && Mori.count(Mori.getIn(coll, keys.slice(0, keys.length - 1))) < 2)
      keys.pop();
    return Mori.dissocIn(coll, keys);
  };

  var UIGraph = function(graph) {
    this.graph = graph;
    this.persistent = Mori.hashMap(
      'nodes', Mori.hashMap(),
      'edgesIn', Mori.hashMap(),
      'edgesOut', Mori.hashMap(),
      'initializers', Mori.hashMap(),
      'properties', Mori.hashMap()
    );
    this._loadGraphIntoPersistent();
  };

  UIGraph.prototype = {
    _loadGraphIntoPersistent: function() {
      for (var node in this.graph.nodes)
        this._persistentCalls.addNode.call(this, node.id, node.component, node.metadata);
      for (var edge in this.graph.edges)
        this._persistentCalls.addEdge.call(this, edge.from.node, edge.from.port,
                                           edge.to.node, edge.to.port, edge.metadata);
      for (var initializer in this.graph.initializer)
        this._persistentCalls.addEdge.call(this, initializer.data,
                                           initializer.node, initializer.port,
                                           initializer.metadata);
      this._persistentCalls.setProperties.call(this, this.graph.properties);
    },

    _persistentCalls: {
      addNode: function(id, component, metadata) {
        this.persistent = Mori.updateIn(this.persistent, ['nodes', id],
                                        Mori.hashMap('component', component,
                                                     'metadata', metadata));
      },
      removeNode: function(id) {
        this.persistent = Mori.updateIn(this.persistent, ['nodes', id]);
      },
      renameNode: function(oldId, newId) {
        var node = Mori.getIn(this.persistent, ['nodes', oldId]);
        this.persistent = Mori.dissoc(this.persistent, ['nodes', oldId]);
        this.persistent = Mori.assocIn(this.persistent, ['nodes', newId], node);
      },
      setNodeMetadata: function(id, metadata) {
        this.persistent = Mori.updateIn(this.persistent, ['nodes', id, 'metadata'], metadata);
      },

      addEdge: function(outNode, outPort, inNode, inPort, metadata) {
        this.persistent = Mori.assocIn(this.persistent,
                                       ['edgesIn', inNode, inPort, outNode, outPort],
                                       metadata);
        this.persistent = Mori.assocIn(this.persistent,
                                       ['edgesOut', outNode, outPort, inNode, inPort],
                                       metadata);
      },
      addEdgeIndex: function(outNode, outPort, outIndex, inNode, inPort, inIndex, metadata) {
        // TODO
      },
      removeEdge: function(outNode, outPort, inNode, inPort) {
        this.persistent = Mori.dissocInAndClean(this.persistent,
                                                ['edgesIn', inNode, inPort, outNode, outPort]);
        this.persistent = Mori.dissocInAndClean(this.persistent,
                                                ['edgesOut', outNode, outPort, inNode, inPort]);
      },
      setEdgeMetadata: function(outNode, outPort, inNode, inPort, metadata) {
        this.persistent = Mori.updateIn(this.persistent,
                                        ['edgesIn', inNode, inPort, outNode, outPort],
                                        metadata);
        this.persistent = Mori.updateIn(this.persistent,
                                        ['edgesOut', outNode, outPort, inNode, inPort],
                                        metadata);
      },

      addInitial: function(data, node, port, metadata) {
        this.persistent = Mori.assocIn(this.persistent,
                                       ['properties', node, port],
                                       { data: data, metadata: metadata});
      },
      addInitialIndex: function(data, node, port, index, metadata) {
        // TODO
      },
      removeInitial: function(node, port) {
        this.persistent = Mori.dissocIn(this.persistent, ['properties', node, port]);
      },

      setProperties: function(props) {
        for (var p in props)
          this.persistent = Mori.updateIn(this.persistent, ['properties', p], props[p]);
      },
    },

    selectNode: function(id) {
      this.persistent = Mori.updateIn(this.persistent, ['nodes', id, 'selected'], true);
    },
    unselectNode: function(id) {
      this.persistent = Mori.updateIn(this.persistent, ['nodes', id, 'selected'], false);
    },

    selectEdge: function(outNode, outPort, inNode, inPort) {
      this.persistent = Mori.updateIn(this.persistent, ['nodes', id, 'selected'], true);
    },
    unselectEdge: function(outNode, outPort, inNode, inPort) {
      this.persistent = Mori.updateIn(this.persistent, ['nodes', id, 'selected'], false);
    },

    addPreEdge: function(outNode, outPort, inNode, inPort, metadata) {
      if (inNode)
        this.persistent = Mori.updateIn(this.persistent, ['preEdgesIn', inNode, inPort], metadata);
      else
        this.persistent = Mori.updateIn(this.persistent, ['preEdgesOut', outNode, outPort], metadata);
    },
    removePreEdge: function(outNode, outPort, inNode, inPort) {
      if (Mori.getIn(this.persistent, ['preEdgesIn', inNode, inPort]))
        this.persistent = Mori.dissocInAndClean(this.persistent, ['preEdgesIn', inNode, inPort]);
      else
        this.persistent = Mori.dissocInAndClean(this.persistent, ['preEdgesOut', outNode, outPort]);
    },
  };

  var generateUiMethod = function(methodName) {
    return function() {
      this.graph[methodName].apply(this.graph, arguments);
      this._persistentCalls[methodName].apply(this, arguments);
    };
  };

  for (var m in UIGraph.prototype._persistentCalls) {
    UIGraph.prototype[m] = generateUiMethod(m);
  }


  TheGraph.UIGraph = UIGraph;

})(this);

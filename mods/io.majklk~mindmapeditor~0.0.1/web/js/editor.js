	var MindMapEditor;
	MindMapEditor.width = 1280;
	MindMapEditor.height = 800;
	MindMapEditor.levelWidth = 150;
	MindMapEditor.treeLayout = d3.layout.tree().size
	([MindMapEditor.height, MindMapEditor.width]);
	MindMapEditor.diagonalGenerator = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });

	MindMapEditor.prototype.addClientAction = function(actionID){
		this.clientActions.unshift(actionID);
		this.clientActions=this.clientActions.slice(0,10);
	}

	MindMapEditor.prototype.renderVisualization = function() {
		var self = this;

		var nodes = MindMapEditor.treeLayout.nodes(this.mindMap).reverse();
		nodes.forEach(function(d) { d.y = d.depth *	MindMapEditor.levelWidth; });
		var node = this.vis.selectAll("g.node").data(nodes, function(d) { return d.key; });
		var nodeEnter = node.enter().append("svg:g")
		.attr("class", "node")
		.attr("data-type", "text")
		.attr("opacity", "0")
		.attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });
		nodeEnter.append("svg:circle").attr("r", 10)
		.style("fill", "lightsteelblue")
		.style("fill", function(d) { return d.children ? "lightsteelblue" : "#fff"; })
		.on("click", function(c) { 
			self.addNode(c);
		});

		nodeEnter.append("svg:text").attr("x", 15)
		.attr("dy", ".35em").text(function(d) { return d.name; })
		.attr("id", function(d) { return d.key; })
		.attr("data-first-node",function(d){
			if(d._id){
				return true;
			}else{
				return false;
			}
		})
		.attr("class","editable editable-click");

		node.transition()
		.attr("opacity", "1")
		.attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
		.select("text")
		.text(function(d) { return d.name; });
		node.exit().remove();
		var link = this.vis.selectAll("path.link").data(MindMapEditor.treeLayout.links(nodes), function(d) {
			return d.target.key; });
		link.enter().insert("svg:path", "g")
		.attr("class", "link")
		.attr("opacity", "0")
		.attr("d", MindMapEditor.diagonalGenerator)
		.on('click', function(l) {
			if(confirm("Do you really delete node "+l.target.name + " with all connected nodes?"))
			self.deleteNode(l.source, l.target);
		});
		link.transition()
		.attr("d", MindMapEditor.diagonalGenerator)
		.attr("opacity", "1");
		link.exit().remove();
	}

	MindMapEditor.prototype.addNode = function(parentNode) {
		var actionID=makeUUID();
		this.addClientAction(actionID);
		this.eventBus.send('mindMaps.editor.addNode', { actionID:actionID, mindMapId: this.mindMap._id, parentKey: parentNode.key });
	}
	
	MindMapEditor.prototype.renameNode = function(nodeKey, newName,firstNode) {
		firstNode=firstNode||false;
		var actionID=makeUUID();
		this.addClientAction(actionID);
		this.eventBus.send('mindMaps.editor.renameNode', { actionID:actionID, mindMapId: this.mindMap._id,key: nodeKey,newName: newName, firstNode:firstNode});
	}
	
	MindMapEditor.prototype.deleteNode = function(parentNode, childNode) {
		var actionID=makeUUID();
		this.addClientAction(actionID);
		this.eventBus.send('mindMaps.editor.deleteNode', { actionID:actionID, mindMapId: this.mindMap._id,	parentKey: parentNode.key, key: childNode.key });
	}

	MindMapEditor.prototype.registerEventHandlers = function() {
		var self=this;
		this.eventBus.registerHandler('mindMaps.events.'+self.mindMap._id, function(event) {
			switch (event.event) {
				case 'nodeAdded':self.onNodeAdded(event); break;
				case 'nodeRenamed': self.onNodeRenamed(event); break;
				case 'nodeDeleted': self.onNodeDeleted(event); break;
			}
			setTimeout(function(){
				self.renderVisualization();
			},200);
		});
	}

	MindMapEditor.prototype.onNodeAdded = function(event) {
		var parent = findNodeByKey(this.mindMap, event.parentKey);
		if (parent) {
			if (!parent.children) {
				parent.children = [];
			}
			parent.children.push(event.node);
			if(this.clientActions.indexOf(event.actionID)==-1){
				this.angularScope.$emit('nodeAdded',{nodeKey: parent.key,nodeName:parent.name});
			}
		}else{
			alert('Node add error!\nTry to reload page.');
		}
	}
	MindMapEditor.prototype.onNodeRenamed = function(event) {
		var node = findNodeByKey(this.mindMap, event.key);
		var oldName=node.name;
		if (node) {
			node.name = event.newName;
			var myEventIndex= this.clientActions.indexOf(event.actionID)
			if(event.firstNode || myEventIndex==-1){
				this.angularScope.$emit('nodeRenamed',{nodeKey:event.key,newName:event.newName, oldName:oldName, firstNode:event.firstNode, fireNotification:(myEventIndex==-1)});
			}
		}else{
			alert('Node rename error!\nTry to reload page.');
		}
	}
	MindMapEditor.prototype.onNodeDeleted = function(event) {
		var parent = findNodeByKey(this.mindMap, event.parentKey);
		if (parent) {
			for (var i=0 ; i<parent.children.length ; i++) {
				if (parent.children[i].key === event.key) {
					parent.children.splice(i, 1);
					return;
				}
			}
			if(this.clientActions.indexOf(event.actionID)==-1){
				this.angularScope.$emit('nodeDeleted',{nodeKey:parent.key,nodeName:parent.name});
			}
		}else{
			alert('Node delete error!\nTry to reload page.');
		}
	}

	MindMapEditor.prototype.initVisualization = function() {
		//.attr("width", MindMapEditor.width)
		//.attr("height", MindMapEditor.height)
		this.vis = d3.select(".editor").html('').append("svg:svg")
		.append("svg:g")
		.attr("transform", "translate(20,0)");
		//console.log("constructed");
	}
	MindMapEditor.prototype.initEditable = function(){
		var self=this;
       	$(".editor ").editable({
       		selector:'text.editable',
	       	container: 'section',
       		mode: 'popup',
       		emptytext:'no name',
		    title: 'Enter new name',
	        success: function(response, newValue) {
	           self.renameNode($(this).attr("id"), newValue,$(this).attr("data-first-node"));
			   $(this).popover("hide");
			},
			cancel:function(){
				$(this).popover("hide");
			}
		});
	}

function MindMapEditor(mindMap, eventBus,angularScope,successFn) {
	this.mindMap = mindMap;
	this.eventBus = eventBus;
	this.clientActions=[];
	this.registerEventHandlers();
	this.initVisualization();
	this.renderVisualization();
	this.initEditable();
	if(typeof angularScope !== 'undefined'){
		this.angularScope = angularScope;
	}
	if(typeof successFn === 'function'){
		successFn();
	}
	//alert("Editor constructed");

}

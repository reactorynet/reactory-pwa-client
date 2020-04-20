import React, { Component } from 'react';
import {
	DiagramEngine,
	DiagramModel,
	DefaultNodeModel,
  LinkModel,
  LabelModel,
	DiagramWidget,
	DefaultLinkModel
} from "@projectstorm/react-diagrams";

import 'storm-react-diagrams/dist/style.min.css';

import { withStyles, withTheme } from '@material-ui/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { compose } from 'redux';

class ReactoryFormEditor extends Component<any,{}> {

  static styles = (theme) => {
    return {
      srdRoot: {
        minHeight: `500px`
      }
    }
  }

  render(){

    const { uiSchema, schema, formData } = this.props;
    
    var engine = new DiagramEngine();
    engine.installDefaultFactories();

    //2) setup the diagram model
    var model = new DiagramModel();

    //3-A) create a default node
    var node1 = new DefaultNodeModel("Node 1", "rgb(0,192,255)");
    let port1 = node1.addOutPort("Out");
    node1.setPosition(100, 100);

    //3-B) create another default node
    var node2 = new DefaultNodeModel("Node 2", "rgb(192,255,0)");
    let port2 = node2.addInPort("In");
    node2.setPosition(400, 100);

    // link the ports
    let link1 = port1.link(port2);
    link1.addLabel(new LabelModel("default", "link1"));

    //4) add the models to the root graph
    model.addAll(node1, node2, link1);
    if(formData && formData.nodes) {
      formData.nodes.forEach((node) => {
        model.addNode(new DefaultNodeModel(node.title, node.color));
      })      
    }

    //5) load model into engine
    engine.setDiagramModel(model);

    //6) render the diagram!    
    return <DiagramWidget className={this.props.classes.srdRoot} diagramEngine={engine}/>;
  }

}

export default compose(withApi, withTheme, withStyles(ReactoryFormEditor.styles))(ReactoryFormEditor)



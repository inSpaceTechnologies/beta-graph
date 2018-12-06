/*
Copyright (c) 2018 inSpace Technologies Ltd
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/
import * as d3 from 'd3';

import config from './config';

export default class Layout {
  init() {
    this._simulation = d3.forceSimulation()
      .force('link', d3.forceLink().distance(d => config.scaleFactor(d.source.filespaceItem.level()) * 50))
      .force('charge', d3.forceManyBody().strength(d => config.scaleFactor(d.filespaceItem.level()) * -25))
      .force('gravityX', d3.forceX(0).strength(0.01))
      .force('gravityY', d3.forceY(0).strength(0.01));
    this._simulation.stop();

    this._nodes = [];
    this._links = [];

    this._rootFilespaceItem = null;
  }

  tick() {
    this._simulation.tick();
  }

  restart() {
    this._simulation.alphaTarget(0.3).restart();
  }

  addFilespaceItem(filespaceItem) {
    const parentFolder = filespaceItem.parentFolder();

    this._nodes.push(filespaceItem.forceNode());

    if (parentFolder) {
      const link = {
        source: parentFolder.forceNode(),
        target: filespaceItem.forceNode(),
      };
      this._links.push(link);
      filespaceItem.forceNode().link = link;
    } else {
      // it's the root
      // fix its position
      filespaceItem.forceNode().fx = 0;
      filespaceItem.forceNode().fy = 0;
      this._rootFilespaceItem = filespaceItem;
    }

    this._simulation.nodes(this._nodes);
    this._simulation.force('link').links(this._links);

    this.restart();
  }

  removeFilespaceItem(filespaceItem) {
    let index = this._nodes.indexOf(filespaceItem.forceNode());
    if (index > -1) {
      this._nodes.splice(index, 1);
    }

    const { link } = filespaceItem.forceNode();

    if (link) {
      index = this._links.indexOf(link);
      if (index > -1) {
        this._links.splice(index, 1);
      }
      filespaceItem.forceNode().link = null;
    }

    this._simulation.nodes(this._nodes);
    this._simulation.force('link').links(this._links);

    this.restart();
  }

  startDrag(filespaceItem) {
    const forceNode = filespaceItem.forceNode();
    this.restart();
    forceNode.fx = forceNode.x;
    forceNode.fy = forceNode.y;
  }

  static drag(filespaceItem, newPosition) {
    const forceNode = filespaceItem.forceNode();
    forceNode.fx = newPosition.x;
    forceNode.fy = newPosition.y;
  }

  endDrag(filespaceItem) {
    const forceNode = filespaceItem.forceNode();
    this._simulation.alphaTarget(0);
    if (filespaceItem !== this._rootFilespaceItem) {
      forceNode.fx = null;
      forceNode.fy = null;
    }
  }
}

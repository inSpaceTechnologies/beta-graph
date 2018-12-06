/*
Copyright (c) 2018 inSpace Technologies Ltd
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/
import Renderer from './renderer';
import Layout from './layout';
import Input from './input';
import Dropdown from './dropdown';

class FilespaceItem {
  constructor(name) {
    this._className = 'FilespaceItem';
    this._name = name;
    this._renderData = {};
    this._level = 0;
    this._forceNode = {
      filespaceItem: this,
    };
    this._updateFunctions = [];
    this._parentFolder = null;
  }

  // can't use .constructor.name because of minification
  className() {
    return this._className;
  }

  name() {
    return this._name;
  }

  level() {
    return this._level;
  }

  renderData() {
    return this._renderData;
  }

  forceNode() {
    return this._forceNode;
  }

  parentFolder() {
    return this._parentFolder;
  }

  setParentFolder(parentFolder) {
    this._parentFolder = parentFolder;
  }

  addUpdateFunction(fun) {
    this._updateFunctions.push(fun);
  }

  update() {
    this._updateFunctions.forEach((updateFunction) => {
      updateFunction(this);
    });
  }
  /*
  dropdownData() {
    return null;
  }
  */
}

class Folder extends FilespaceItem {
  constructor(name) {
    super(name);
    this._className = 'Folder';
    this._childFiles = [];
    this._childFolders = [];
  }

  addChild(childFilespaceItem) {
    const childClass = childFilespaceItem.constructor.name;
    childFilespaceItem._level = this._level + 1;
    if (childClass === 'Folder') {
      this._childFolders.push(childFilespaceItem);
    } else {
      this._childFiles.push(childFilespaceItem);
    }
    childFilespaceItem.setParentFolder(this);
  }

  removeChild(childFilespaceItem) {
    const childClass = childFilespaceItem.constructor.name;
    if (childClass === 'Folder') {
      const index = this._childFolders.indexOf(childFilespaceItem);
      if (index > -1) {
        this._childFolders.splice(index, 1);
      }
    } else {
      const index = this._childFiles.indexOf(childFilespaceItem);
      if (index > -1) {
        this._childFiles.splice(index, 1);
      }
    }
    childFilespaceItem.setParentFolder(null);
  }

  hasChildren() {
    if (this._childFolders.length === 0 && this._childFiles.length === 0) {
      return false;
    }
    return true;
  }

  dropdownData(dataFunctions) {
    return [
      {
        sectionTitle: null,
        elements: [
          {
            type: 'button',
            text: 'Add folder',
            onClick: () => {
              dataFunctions.newFolder(this);
            },
          },
          {
            type: 'file select',
            text: 'Upload file(s)',
            allow: () => dataFunctions.canUpload(),
            onSelect: (files) => {
              files.forEach((file) => {
                dataFunctions.uploadFile(this, file);
              });
            },
          },
          {
            type: 'button',
            text: 'Delete',
            onClick: () => {
              dataFunctions.deleteFolder(this);
            },
          },
        ],
      },
    ];
  }
}

class File extends FilespaceItem {
  constructor(name) {
    super(name);
    this._className = 'File';
  }

  dropdownData(dataFunctions) {
    return [
      {
        sectionTitle: null,
        elements: [
          {
            type: 'link',
            text: 'Download',
            newWindow: true,
            url: dataFunctions.downloadURL(this),
          },
          {
            type: 'button',
            text: 'Delete',
            onClick: () => {
              dataFunctions.deleteFile(this);
            },
          },
        ],
      },
    ];
  }
}

class Controller {
  constructor() {
    this._root = null;
    this._filespaceItems = [];
  }

  init(container, dataFunctions, fontPaths, done) {
    this._container = container;

    this._dataFunctions = dataFunctions;

    this._layout = new Layout();
    this._layout.init();

    this._renderer = new Renderer();
    this._renderer.init(container, fontPaths, done);

    this._input = new Input(container);

    this._dropdown = new Dropdown();
    this._dropdown.init();
  }

  addFilespaceItem(parent, filespaceItem) {
    if (parent) {
      parent.addChild(filespaceItem);
    } else {
      if (this._root) {
        throw new Error("Can't have multiple roots");
      }
      this._root = filespaceItem;
    }

    this._filespaceItems.push(filespaceItem);
    this._layout.addFilespaceItem(filespaceItem);
    this._renderer.addFilespaceItem(filespaceItem);
  }

  removeFilespaceItem(filespaceItem) {
    const parentFolder = filespaceItem.parentFolder();
    parentFolder.removeChild(filespaceItem);

    const index = this._filespaceItems.indexOf(filespaceItem);
    if (index > -1) {
      this._filespaceItems.splice(index, 1);
    }

    this._layout.removeFilespaceItem(filespaceItem);
    this._renderer.removeFilespaceItem(filespaceItem);
  }

  update() {
    const currentMousePosition = this._input.mousePosition();
    const finishedClicks = this._input.popFinishedClicks();
    const currentDrag = this._input.currentDragInfo();
    const finishedDrags = this._input.popFinishedDrags();
    const wheelDelta = this._input.popWheelDelta();
    const pinchScale = this._input.popPinchScale();

    if (currentMousePosition) {
      this._renderer.pick(currentMousePosition);
    }

    if (finishedClicks && finishedClicks.length) {
      this._dropdown.hideDropdown();
    }

    if (finishedClicks) {
      finishedClicks.forEach((click) => {
        if (!click.handled) {
          const intersect = this._renderer.pick(click);
          if (intersect && intersect.object.inspaceInfo.type === 'dropdown button') {
            const { filespaceItem } = intersect.object.inspaceInfo;
            this._dropdown.generateDropdown(filespaceItem.dropdownData(this._dataFunctions), click.absoluteX, click.absoluteY);
            click.handled = true;
          }
        }
      });
    }

    if (finishedDrags) {
      finishedDrags.forEach((drag) => {
        if (drag.info && drag.info.end) {
          drag.info.end(drag.endPosition);
        }
        drag.info = null;
      });
    }

    if (currentDrag) {
      if (currentDrag.info) {
        if (currentDrag.info.update) {
          currentDrag.info.update(currentDrag.currentPosition);
        }
      } else {
        const intersect = this._renderer.pick(currentDrag.currentPosition);
        if (intersect && intersect.object.inspaceInfo.type === 'outer cylinder') {
          const { filespaceItem } = intersect.object.inspaceInfo;
          this._layout.startDrag(filespaceItem);
          const worldMouse = this._renderer.toWorld(currentDrag.startPosition);
          const worldObject = filespaceItem.forceNode();
          const offset = {
            x: worldMouse.x - worldObject.x,
            y: worldMouse.y - worldObject.y,
          };
          currentDrag.info = {
            offset,
            update: (newPosition) => {
              const newPositionWorld = this._renderer.toWorld(newPosition);
              const newObjectWorld = {
                x: newPositionWorld.x - offset.x,
                y: newPositionWorld.y - offset.y,
              };
              Layout.drag(filespaceItem, newObjectWorld);
            },
            end: (newPosition) => {
              currentDrag.info.update(newPosition);
              this._layout.endDrag(filespaceItem);
            },
          };
        } else {
          // camera pan
          currentDrag.info = {
            lastProcessedPosition: currentDrag.startPosition,
            update: (newPosition) => {
              this._renderer.panCamera(currentDrag.info.lastProcessedPosition, newPosition);
              currentDrag.info.lastProcessedPosition = newPosition;
            },
            end: (newPosition) => {
              // can work out velocity for pan inertia
              currentDrag.info.update(newPosition);
            },
          };
        }
      }
    }

    // camera zoom
    if (currentMousePosition && wheelDelta) {
      this._renderer.zoomCamera(currentMousePosition, 0.9 ** (wheelDelta * 0.6625));
    }
    if (pinchScale) {
      this._renderer.zoomCamera(pinchScale.position, pinchScale.scale);
    }

    this._layout.tick();
    this._filespaceItems.forEach((filespaceItem) => {
      filespaceItem.update();
    });

    this._renderer.update();
  }

  animate() {
    // request the next animation frame
    requestAnimationFrame(this.animate.bind(this));
    this.update();
  }
}

export { Controller, Folder, File };

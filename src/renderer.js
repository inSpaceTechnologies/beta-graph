/*
Copyright (c) 2018 inSpace Technologies Ltd
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/
/* global THREE */
// THREE is loaded globally (see webpack.config.js).

import Stats from 'stats-js';

import loadFont from 'load-bmfont';
import createTextGeometry from 'three-bmfont-text';
import createSDFShader from './shaders/sdf';

import config from './config';

// https://stackoverflow.com/questions/15139649/three-js-two-points-one-cylinder-align-issue/15160850#15160850
function positionCylinderObject(cylinderObject, start, end, startOffset, endOffset) {
  const HALF_PI = Math.PI * 0.5;
  const spacing = start.distanceTo(end);
  const distance = spacing - startOffset - endOffset;

  // reset matrix
  cylinderObject.position.set(0, 0, 0);
  cylinderObject.scale.set(1, distance, 1);
  cylinderObject.rotation.set(0, 0, 0);
  cylinderObject.updateMatrix();

  const orientation = new THREE.Matrix4();// a new orientation matrix to offset pivot
  const offsetRotation = new THREE.Matrix4();// a matrix to fix pivot rotation
  orientation.lookAt(start, end, new THREE.Vector3(0, 1, 0));// look at destination
  offsetRotation.makeRotationX(HALF_PI);// rotate 90 degs on X
  orientation.multiply(offsetRotation);// combine orientation with rotation transformations

  cylinderObject.applyMatrix(orientation);

  cylinderObject.position.copy(start);
  const midPoint = (startOffset + 0.5 * distance) / spacing;
  cylinderObject.position.lerp(end, midPoint);
}

function createPrismGeometry(left, right, top, bottom, depth) {
  const mid = (left + right) * 0.5;

  const shape = new THREE.Shape();
  shape.moveTo(left, top);
  shape.lineTo(right, top);
  shape.lineTo(mid, bottom);
  shape.lineTo(left, top);

  const extrudeSettings = {
    steps: 1,
    depth,
    bevelEnabled: false,
    /*
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 1,
    bevelSegments: 1
    */
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.translate(0, 0, -depth);

  return geometry;
}

function toVector3(obj) {
  if (Object.prototype.hasOwnProperty.call(obj, 'x')) {
    const { x } = obj;
    const { y } = obj;
    let { z } = obj;
    if (!Object.prototype.hasOwnProperty.call(obj, 'z')) {
      z = 0;
    }
    return new THREE.Vector3(x, y, z);
  }
  return new THREE.Vector3(obj[0], obj[1], obj[2]);
}

function setOuterCylinderMaterial(filespaceItem, materials) {
  // can't use filespaceItem.constructor.name because of minification
  if (filespaceItem.className() === 'File') {
    filespaceItem.renderData().outerCylinder.material = materials.outer;
    return;
  }
  if (filespaceItem.hasChildren()) {
    filespaceItem.renderData().outerCylinder.material = materials.outer;
  } else {
    filespaceItem.renderData().outerCylinder.material = materials.outerLeaf;
  }
}

const createUpdateFunction = materials => (filespaceItem) => {
  setOuterCylinderMaterial(filespaceItem, materials);
  const scale = config.scaleFactor(filespaceItem.level());
  const forceNode = filespaceItem.forceNode();
  const renderData = filespaceItem.renderData();
  if (Object.prototype.hasOwnProperty.call(forceNode, 'x')) {
    renderData.group.position.x = forceNode.x;
    renderData.group.position.y = forceNode.y;
    renderData.group.position.z = 0;

    const parentFolder = filespaceItem.parentFolder();
    if (parentFolder) {
      const parentScale = config.scaleFactor(parentFolder.level());
      positionCylinderObject(
        renderData.cylinderObject,
        toVector3(filespaceItem.forceNode()),
        toVector3(parentFolder.forceNode()),
        config.geometry.outerRadius * scale,
        config.geometry.outerRadius * parentScale,
      );
    }
  }
};

export default class Renderer {
  init(container, fontPaths, done) {
    const sceneWidth = container.clientWidth;
    const sceneHeight = container.clientHeight;

    const cameraAspectRatio = sceneWidth / sceneHeight;

    this._stats = new Stats();
    this._stats.domElement.style.position = 'absolute';
    this._stats.domElement.style.right = '12px';
    this._stats.domElement.style.bottom = '12px';
    this._stats.domElement.style['z-index'] = '100';

    // init the webgl renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this._renderer.setSize(sceneWidth, sceneHeight);
    this._renderer.setClearColor(0xffffff, 0);

    // init the camera
    this._camera = new THREE.PerspectiveCamera(config.camera.angle, cameraAspectRatio, config.camera.near, config.camera.far);

    // init the scene
    this._scene = new THREE.Scene();
    this._scene.add(this._camera);

    // light
    // TODO: finalise and add to config
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(-30, 30, -20);
    directionalLight.target.position.set(0, 0, 0);
    this._scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.25, 200, 1);
    pointLight.position.set(30, 30, -50);
    this._scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // soft white light
    this._scene.add(ambientLight);

    // init the controls
    /*
    this.controls = new THREE.OrbitControls(this._camera);
    this.controls.mouseButtons = {
      ORBIT: THREE.MOUSE.RIGHT,
      ZOOM: THREE.MOUSE.MIDDLE,
      PAN: THREE.MOUSE.LEFT,
    };
    this.controls.screenSpacePanning = true;
    */

    container.appendChild(this._renderer.domElement);
    document.body.appendChild(this._stats.domElement);

    // place this camera back a little bit
    this._camera.position.set(0, 0, config.camera.initialZ);
    this._camera.lookAt(0, 0, 0);

    // materials
    this._materials = {
      link: new THREE.MeshPhongMaterial({ color: config.colours.link }),
      dropdownButton: new THREE.MeshPhongMaterial({ color: config.colours.dropdownButton }),
      dropdownButtonHover: new THREE.MeshPhongMaterial({ color: config.colours.dropdownButtonHover }),
      outer: new THREE.MeshPhongMaterial({ color: config.colours.outer }),
      outerLeaf: new THREE.MeshPhongMaterial({ color: config.colours.outerLeaf }),
      inner: new THREE.MeshPhongMaterial({ color: config.colours.inner }),
    };

    this._objects = {
      dropdownButtons: [],
      outerCylinders: [],
    };
    this._hoverObject = null;

    // SDF font texture
    loadFont(fontPaths.fnt, (err, font) => {
      if (err) {
        return done(err);
      }
      return new THREE.TextureLoader().load(
        fontPaths.png,

        // onLoad callback
        (texture) => {
          // const maxAni = this._renderer.capabilities.getMaxAnisotropy();
          texture.needsUpdate = true;
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          // texture.anisotropy = maxAni;

          this._font = font;

          // build a shader material
          this._materials.font = new THREE.RawShaderMaterial(createSDFShader({
            map: texture,
            side: THREE.DoubleSide,
            opacity: 1.0,
            transparent: true,
            color: 'rgb(0, 0, 0)',
          }));
          return done(null);
        },

        // onProgress callback currently not supported
        undefined,

        // onError callback
        err2 => done(err2),
      );
    });
  }

  createTextGeom(text) {
    const scale = config.geometry.textScale;
    const maxWidth = config.geometry.maxTextWidth / scale;
    const material = this._materials.font;

    function createCenteredMesh(geometry) {
      const { width, height } = geometry.layout;

      const mesh = new THREE.Mesh(geometry, material);
      // scale it down and centre it
      mesh.scale.multiplyScalar(-scale);
      mesh.position.x = (-width * -scale) / 2;
      mesh.position.y = (height * -scale) / 4;
      mesh.position.z = -config.geometry.outerDepth - 1.0;
      return mesh;
    }

    let testText = text;

    let truncatedGeometry = null;
    const untruncateGeometry = createTextGeometry({
      text: testText,
      font: this._font,
      // width: 1000 // optional width for word-wrap
    });
    let testWidth = untruncateGeometry.layout.width;

    while (testWidth > maxWidth) {
      testText = testText.slice(0, -1);

      truncatedGeometry = createTextGeometry({
        text: `${testText}...`,
        font: this._font,
      });

      testWidth = truncatedGeometry.layout.width;
    }


    const untruncatedMesh = createCenteredMesh(untruncateGeometry);
    let truncatedMesh = null;
    if (truncatedGeometry) {
      truncatedMesh = createCenteredMesh(truncatedGeometry);
    }

    const ret = {};
    if (truncatedGeometry) {
      ret.mesh = truncatedMesh;
      ret.untruncatedMesh = untruncatedMesh;
    } else {
      ret.mesh = untruncatedMesh;
    }

    return ret;
  }

  addFilespaceItem(filespaceItem) {
    const parentFolder = filespaceItem.parentFolder();

    const renderData = filespaceItem.renderData();

    const scale = config.scaleFactor(filespaceItem.level());

    const group = new THREE.Group();
    renderData.group = group;
    group.scale.set(scale, scale, scale);

    const outerCylinder = new THREE.Mesh(new THREE.CylinderGeometry(config.geometry.outerRadius, config.geometry.outerRadius, config.geometry.outerDepth, 64), null);
    renderData.outerCylinder = outerCylinder;
    setOuterCylinderMaterial(filespaceItem, this._materials);
    outerCylinder.rotation.x = Math.PI / 2;
    group.add(outerCylinder);

    // can't use filespaceItem.constructor.name because of minification
    if (filespaceItem.className() === 'Folder') {
      const innerCylinder = new THREE.Mesh(new THREE.CylinderGeometry(config.geometry.innerRadius, config.geometry.innerRadius, config.geometry.innerDepth, 64), this._materials.inner);
      innerCylinder.rotation.x = Math.PI / 2;
      group.add(innerCylinder);
    }

    outerCylinder.inspaceInfo = {
      type: 'outer cylinder',
      filespaceItem,
      onHover: [],
      onLeaveHover: [],
    };
    this._objects.outerCylinders.push(outerCylinder);

    // create the text
    const textMeshes = this.createTextGeom(filespaceItem.name());
    group.add(textMeshes.mesh);
    if (textMeshes.untruncatedMesh) {
      outerCylinder.inspaceInfo.onHover.push(() => {
        group.remove(textMeshes.mesh);
        group.add(textMeshes.untruncatedMesh);
      });
      outerCylinder.inspaceInfo.onLeaveHover.push(() => {
        group.remove(textMeshes.untruncatedMesh);
        group.add(textMeshes.mesh);
      });
    }

    const dropdownButton = new THREE.Mesh(
      createPrismGeometry(config.geometry.dropdownButton.left, config.geometry.dropdownButton.right, config.geometry.dropdownButton.top, config.geometry.dropdownButton.bottom, config.geometry.dropdownButton.depth),
      this._materials.dropdownButton,
    );
    renderData.dropdownButton = dropdownButton;
    dropdownButton.inspaceInfo = {
      type: 'dropdown button',
      filespaceItem,
      onHover: [],
      onLeaveHover: [],
    };
    this._objects.dropdownButtons.push(dropdownButton);

    group.add(dropdownButton);

    this._scene.add(group);

    if (parentFolder) {
      const parentScale = config.scaleFactor(parentFolder.level());
      const radius = config.geometry.linkDiameter * 0.5 * parentScale;
      // normalised height
      const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, 1, 10, 10, false);
      const mesh = new THREE.Mesh(cylinderGeometry, this._materials.link);
      renderData.cylinderObject = mesh;
      this._scene.add(mesh);
    }

    filespaceItem.addUpdateFunction(createUpdateFunction(this._materials));
  }

  removeFilespaceItem(filespaceItem) {
    const renderData = filespaceItem.renderData();
    const { group } = renderData;

    let index = this._objects.outerCylinders.indexOf(renderData.outerCylinder);
    if (index > -1) {
      this._objects.outerCylinders.splice(index, 1);
    }

    index = this._objects.dropdownButtons.indexOf(renderData.dropdownButton);
    if (index > -1) {
      this._objects.dropdownButtons.splice(index, 1);
    }

    /*
    // clear renderdata
    Object.getOwnPropertyNames(renderData).forEach((prop) => {
      delete renderData[prop];
    });
    */

    this._scene.remove(group);

    if (renderData.cylinderObject) {
      this._scene.remove(renderData.cylinderObject);
    }
  }

  // projects mouse position onto z=0 plane
  toWorld(mousePosition) {
    // https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
    const vector = new THREE.Vector3(mousePosition.normalisedX, -mousePosition.normalisedY, 0.5);
    vector.unproject(this._camera);
    const dir = vector.sub(this._camera.position).normalize();
    const distance = -this._camera.position.z / dir.z;
    const pos = this._camera.position.clone().add(dir.multiplyScalar(distance));
    return pos;
  }

  pick(mousePosition) {
    const raycaster = new THREE.Raycaster();
    // need to invert y for some reason
    const mouse = new THREE.Vector2(mousePosition.normalisedX, -mousePosition.normalisedY);

    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, this._camera);

    // calculate objects intersecting the picking ray
    const objects = this._objects.outerCylinders.concat(this._objects.dropdownButtons);
    const intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
      // sorted by distance, so 0th will be closest
      const closest = intersects[0];
      const { object } = closest;

      if (object !== this._hoverObject) {
        if (this._hoverObject) {
          this._hoverObject.inspaceInfo.onLeaveHover.forEach((onLeaveHover) => {
            onLeaveHover();
          });
        }
        this._hoverObject = object;
        object.inspaceInfo.onHover.forEach((onHover) => {
          onHover();
        });
      }

      return closest;
    }
    // no intersects
    if (this._hoverObject) {
      this._hoverObject.inspaceInfo.onLeaveHover.forEach((onLeaveHover) => {
        onLeaveHover();
      });
      this._hoverObject = null;
    }
    return null;
  }

  render() {
    this._renderer.render(this._scene, this._camera);
  }

  panCamera(start, end) {
    const startWorld = this.toWorld(start);
    const endWorld = this.toWorld(end);
    this._camera.position.x -= (endWorld.x - startWorld.x);
    this._camera.position.y -= (endWorld.y - startWorld.y);
  }

  zoomCamera(position, scale) {
    this._camera.position.z *= 1.0 / scale;
  }

  update() {
    // this.controls.update();
    this._stats.update();

    this._objects.dropdownButtons.forEach((dropdownButton) => {
      if (this._hoverObject === dropdownButton) {
        if (dropdownButton.material !== this._materials.dropdownButtonHover) {
          dropdownButton.material = this._materials.dropdownButtonHover;
        }
      } else if (dropdownButton.material !== this._materials.dropdownButton) {
        dropdownButton.material = this._materials.dropdownButton;
      }
    });

    this.render();
  }
}

/* eslint no-alert: 0 */ // --> OFF

import '../src/style/style.css';
import { Controller, Folder, File } from '../src/controller';

const container = document.getElementById('container');

const controller = new Controller();

const dataFunctions = {
  newFolder: (parentFolder) => {
    const name = prompt('Enter folder name');
    const newFolder = new Folder(name);
    controller.addFilespaceItem(parentFolder, newFolder);
  },
  uploadFile: (parentFolder, file) => {
    const newFile = new File(file.name);
    controller.addFilespaceItem(parentFolder, newFile);
  },
  deleteFolder: (folder) => {
    controller.removeFilespaceItem(folder);
  },
  deleteFile: (file) => {
    controller.removeFilespaceItem(file);
  },
  downloadURL: file => `http://inspace.tv/${file.name()}`,
  canUpload: () => true,
};

controller.init(container, dataFunctions, { fnt: '/fonts/roboto.fnt', png: 'fonts/roboto.png' }, () => {
  const rootFolder = new Folder('My Files');
  controller.addFilespaceItem(null, rootFolder);

  controller.addFilespaceItem(rootFolder, new Folder('My Videos'));
  controller.addFilespaceItem(rootFolder, new Folder('My Documents'));
  controller.addFilespaceItem(rootFolder, new Folder('My Games'));
  controller.addFilespaceItem(rootFolder, new Folder('Long, long, long, long, long folder name'));

  controller.addFilespaceItem(rootFolder, new File('todo.txt'));
  controller.addFilespaceItem(rootFolder, new File('taxes.xls'));

  const myPictures = new Folder('My Pictures');
  controller.addFilespaceItem(rootFolder, myPictures);

  controller.addFilespaceItem(myPictures, new Folder('My Cats'));
  controller.addFilespaceItem(myPictures, new Folder('My Dogs'));
  controller.addFilespaceItem(myPictures, new Folder('My Sheep'));
  controller.addFilespaceItem(myPictures, new File('Long, long, long, long, long file name'));

  controller.animate();
});

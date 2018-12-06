/*
Copyright (c) 2018 inSpace Technologies Ltd
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/
import config from './config';

export default class Dropdown {
  constructor() {
    this.dropdown = null;
    this.dropdownContent = null;
  }

  init() {
    // create the dropdown div as a child of <body> so that it gets positioned correctly
    const dropdown = document.createElement('div');
    dropdown.setAttribute('class', config.dropdown.class);
    document.body.appendChild(dropdown);

    this.dropdown = dropdown;

    // hide the dropdown if the user clicks outside of the dropdown, without using event.stopPropagation()
    // https://stackoverflow.com/questions/152975/how-do-i-detect-a-click-outside-an-element/3028037#3028037
    document.addEventListener('click', (event) => {
      if (!this.dropdown.contains(event.target)) {
        this.hideDropdown();
      }
    });
  }

  hideDropdown() {
    this.dropdown.style.display = 'none';
  }

  generateDropdown(dropdownData, x, y) {
    if (!dropdownData) {
      return;
    }
    if (this.dropdownContent) {
      this.dropdownContent.remove();
    }

    this.dropdownContent = document.createElement('div');
    this.dropdown.appendChild(this.dropdownContent);

    const dropdownList = document.createElement('ul');
    this.dropdownContent.appendChild(dropdownList);

    dropdownData.forEach((section, i) => {
      if (i !== 0) {
        // divider between sections
        dropdownList.appendChild(document.createElement('li')).appendChild(document.createElement('hr'));
      }

      if (section.sectionTitle) {
        dropdownList.appendChild(document.createElement('li')).appendChild(document.createElement('h1')).appendChild(document.createTextNode(section.sectionTitle));
      }

      section.elements.forEach((element) => {
        if (!element) {
          return;
        }

        if (element.type === 'button') {
          const button = document.createElement('li');
          button.setAttribute('class', config.dropdown.clickableClass);
          button.appendChild(document.createTextNode(element.text));
          button.addEventListener('click', (/* event */) => {
            element.onClick();
            this.hideDropdown();
          });
          dropdownList.appendChild(button);
        } else if (element.type === 'link') {
          const a = document.createElement('a');
          a.setAttribute('href', element.url);
          if (element.newWindow) {
            a.setAttribute('target', '_blank');
          }
          a.appendChild(document.createTextNode(element.text));
          const li = document.createElement('li');
          li.setAttribute('class', config.dropdown.clickableClass);
          li.appendChild(a);
          dropdownList.appendChild(li);
        } else if (element.type === 'file select') {
          const inputElement = document.createElement('input');
          inputElement.setAttribute('id', element.id);
          inputElement.setAttribute('type', 'file');
          inputElement.setAttribute('multiple', true);
          inputElement.addEventListener('change', (event) => {
            element.onSelect(Array.from(event.target.files));
          });
          dropdownList.appendChild(inputElement);
          inputElement.style.display = 'none';

          const button = document.createElement('li');
          button.setAttribute('class', config.dropdown.clickableClass);
          button.appendChild(document.createTextNode(element.text));
          button.addEventListener('click', (/* event */) => {
            if (!element.allow()) {
              return;
            }
            inputElement.click();
            this.hideDropdown();
          });
          dropdownList.appendChild(button);
        }
      });
    });

    let left = x;
    let top = y;

    // show it
    this.dropdown.style.display = 'block';

    if (y + this.dropdown.offsetHeight >= document.documentElement.clientHeight) {
      // would fall off the bottom, so draw it above
      top -= this.dropdown.offsetHeight;
    }
    if (x + this.dropdown.offsetWidth >= document.documentElement.clientWidth) {
      // would fall off the right, so draw it to the left
      left -= this.dropdown.offsetWidth;
    }

    const { style } = this.dropdown;
    style.left = `${left}px`;
    style.top = `${top}px`;
  }
}

const config = {
  scaleFactor(level) {
    return 0.6 ** level;
  },
  geometry: {
    innerRadius: 10,
    outerRadius: 11.5,
    linkDiameter: null, // derived below
    outerDepth: null, // derived below
    innerDepth: null, // derived below
    dropdownButton: {
      top: -4.0,
      bottom: -8.0,
      left: -4.0,
      right: 4.0,
      depth: 2.0,
    },
    textScale: 0.25,
    maxTextWidth: 35.0,
  },
  colours: {
    link: 0x666666,
    dropdownButton: 0x444444,
    dropdownButtonHover: 0x999999,
    outer: null, // derived below
    outerLeaf: 0xffffff,
    inner: 0xcccccc,
  },
  camera: {
    angle: 45,
    near: 0.1,
    far: 10000,
    initialZ: -300,
  },
  dropdown: {
    class: 'filespace-dropdown',
    clickableClass: 'clickable',
  },
};

config.geometry.linkDiameter = config.geometry.outerRadius - config.geometry.innerRadius;
config.geometry.outerDepth = config.geometry.linkDiameter;
config.geometry.innerDepth = config.geometry.outerDepth * 1.75;

config.colours.outer = config.colours.link;

export default config;

require("url-polyfill");

/**
 * Provides a global namespace for the Zinc javascript library and some default parameters for it.
 * 
 * @namespace
 * @author Alan Wu
 */

const Zinc = function() {
  this.Revision = 29;
  this.defaultMaterialColor = 0xFFFFFF;
  this.defaultOpacity = 1.0;
  this.modelPrefix = undefined;
  this.Geometry = require('./geometry').Geometry;
  this.Glyph = require('./glyph').Glyph;
  this.Glyphset = require('./glyphset').Glyphset;
  this.Pointset = require('./pointset').Pointset;
  this.Renderer = require('./renderer').Renderer;
  this.Scene = require('./scene').Scene;
  this.GeometryCSG = require('./geometryCSG').GeometryCSG;
  this.GlyphsetCSG = require('./glyphsetCSG').GlyphsetCSG;
  this.Viewport = require('./controls').Viewport;
  this.CameraControls = require('./controls').CameraControls;
  this.SmoothCameraTransition = require('./controls').SmoothCameraTransition;
  this.RayCaster = require('./controls').RayCaster;
  this.CameraAutoTumble = require('./controls').CameraAutoTumble;
  this.loadExternalFile = require('./utilities').loadExternalFile;
  this.loadExternalFiles = require('./utilities').loadExternalFiles;
  this.StereoEffect = require('./controls').StereoEffect;
  this.THREE = require('three'); 
  
};

module.exports = new Zinc();

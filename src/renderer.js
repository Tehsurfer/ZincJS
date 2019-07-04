const THREE = require('three');
/**
 * Create a Zinc 3D renderer in the container provided.
 * The primary function of a Zinc 3D renderer is to display the current
 * scene (@link Zinc.Scene} set to the renderer and each scene may contain as 
 * many geometries, glyphset and other primitives as the system can support.
 * Zinc.Renderer also allows additional scenes to be displayed.
 * 
 * @param {Object} containerIn - Container to create the renderer on.
 * @class
 * @author Alan Wu
 * @return {Zinc.Renderer}
 */
exports.Renderer = function (containerIn) {

	let container = containerIn;
	
	const stats = 0;
	
	let renderer = undefined;
	let currentScene = undefined;

	//myGezincGeometriestains a tuple of the threejs mesh, timeEnabled, morphColour flag, unique id and morph
	const clock = new THREE.Clock();
	this.playAnimation = true
	/* default animation update rate, rate is 500 and duration is default to 3000, 6s to finish a full animation */
	let playRate = 500;
	let preRenderCallbackFunctions = [];
	let preRenderCallbackFunctions_id = 0;
	let animated_id = undefined;
	let cameraOrtho = undefined, sceneOrtho = undefined, logoSprite = undefined;
	let sceneMap = [];
	let additionalActiveScenes = [];
	let scenesGroup = new THREE.Group();
	let canvas = undefined;
	const _this = this;
	const currentSize = [0, 0];
	const currentOffset = [0, 0];
	
	this.getDrawingWidth = () => {
		if (container) {
			return container.clientWidth;
		} else if (canvas)
			if (typeof canvas.clientWidth !== 'undefined')
				return Math.round(canvas.clientWidth);
			else
				return Math.round(canvas.width);
		return 0;
	}
	
	this.getDrawingHeight = () => {
		if (container) {
			return container.clientHeight;
		} else if (canvas)
			if (typeof canvas.clientHeight !== 'undefined')
				return Math.round(canvas.clientHeight);
			else
				return Math.round(canvas.height);
		return 0;
	}
	
	/** 
	 * Call this to resize the renderer, this is normally call automatically.
	 */
	this.onWindowResize = () => {
		currentScene.onWindowResize();
		const width = this.getDrawingWidth();
		const height = this.getDrawingHeight();
		if (renderer != undefined) {
			let rect = undefined;
			if (container) {
				rect = container.getBoundingClientRect();
				renderer.setSize(width, height);		
			} else if (canvas) {
				if (typeof canvas.getBoundingClientRect !== 'undefined') {
					rect = canvas.getBoundingClientRect();
					canvas.width = width;
					canvas.height = height;
					renderer.setSize(width, height, false);
				} else {
					renderer.setSize(width, height, false);
					
				}
			}
			if (rect) {
				currentOffset[0] = rect.left;
				currentOffset[1] = rect.top;
			}
			currentSize[0] = renderer.getSize().width;
			currentSize[1] = renderer.getSize().height;
		}
	}
	
	const resizeIfRequired = () => {
		const width = this.getDrawingWidth();
		const height = this.getDrawingHeight();
		let rect = undefined;
		let left = 0, top = 0;
		if (container)
			rect = container.getBoundingClientRect();
		else if (canvas && (typeof canvas.getBoundingClientRect !== 'undefined')) {
			rect = canvas.getBoundingClientRect();
		}
		if (rect) {
			left = rect.left;
			top = rect.top;
		}
		if (currentSize[0] != width || currentSize[1] != height ||
			left != currentOffset[0] || top != currentOffset[1]) {
			this.onWindowResize();
		}
	}
	
	/**
	 * Initialise the renderer and its visualisations.
	 */
	this.initialiseVisualisation = parameters => {
	  parameters = parameters || {};
	  if (parameters['antialias'] === undefined) {
      let onMobile = false;
      try {
        if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
          onMobile = true;
        }
      }
      catch(err) {
        onMobile = false;
      }
      if (onMobile)
        parameters['antialias'] = false;
      else
        parameters['antialias'] = true;
	  }
	  if (parameters["canvas"]) {
		  container = undefined;
		  canvas = parameters["canvas"];
	  }
      renderer = new THREE.WebGLRenderer(parameters);
      if (container !== undefined) {
    	  container.appendChild( renderer.domElement );
      }
	  renderer.setClearColor( 0xffffff, 1);
	  if (canvas && canvas.style) {
		  canvas.style.height = "100%";
		  canvas.style.width = "100%";
	  }
	  const scene = this.createScene("default");
	  this.setCurrentScene(scene);
	}
	
	/**
	 * Get the current scene on display.
	 * @return {Zinc.Scene};
	 */
	this.getCurrentScene = () => {
		return currentScene;
	}
	
	/**
	 * Set the current scene on display.
	 * 
	 * @param {Zinc.Scene} sceneIn - The scene to be set, only scene created by this instance
	 * of ZincRenderer is supported currently.
	 */
	this.setCurrentScene = sceneIn => {
		if (sceneIn) {
			this.removeActiveScene(sceneIn);
			const oldScene = currentScene;
			currentScene = sceneIn;
			if (oldScene) {
				oldScene.setInteractiveControlEnable(false);
			}
			currentScene.setInteractiveControlEnable(true);
			currentScene.setAdditionalScenesGroup(scenesGroup);
			this.onWindowResize();
		}
	}
	
	/**
	 * Return scene with the matching name if scene with that name has been created.
	 * 
	 * @param {String} name - Name to match
	 * @return {Zinc.Scene}
	 */
	this.getSceneByName = name => {
		return sceneMap[name];
	}
	
	/**
	 * Create a new scene with the provided name if scene with the same name exists,
	 * return undefined.
	 * 
	 * @param {String} name - Name of the scene to be created.
	 * @return {Zinc.Scene}
	 */
	this.createScene = name => {
		if (sceneMap[name] != undefined){
			return undefined;
		} else {
			let new_scene = undefined;
			if (canvas)
				new_scene = new (require('./scene').Scene)(canvas, renderer);
			else
				new_scene = new (require('./scene').Scene)(container, renderer);
			sceneMap[name] = new_scene;
			new_scene.sceneName = name;
			return new_scene;
		}
	}
	
	const updateOrthoScene = () => {
		if (logoSprite != undefined) {
			const material = logoSprite.material;
			if (material.map) {
				const width = this.getDrawingWidth();
				const height = this.getDrawingHeight();
				const calculatedWidth = (width - material.map.image.width)/2;
				const calculatedHeight = (-height + material.map.image.height)/2;
				logoSprite.position.set(calculatedWidth, calculatedHeight, 1 );
			}
		}
	};
	
	const updateOrthoCamera = () => {
		if (cameraOrtho != undefined) {
			const width = this.getDrawingWidth();
			const height = this.getDrawingHeight();
			cameraOrtho.left = -width / 2;
			cameraOrtho.right = width / 2;
			cameraOrtho.top =  height / 2;
			cameraOrtho.bottom = -height / 2;
			cameraOrtho.updateProjectionMatrix();
		}
	};
	
	/**
	 * Reset the viewport of the current scene to its original state.
	 */
	this.resetView = () => {
		currentScene.resetView();
	}
	
	/**
	 * Adjust zoom distance to include all primitives in scene and also the additional scenes
	 * but the lookat direction and up vectors will remain constant.
	 */
	this.viewAll = () => {
		if (currentScene) {	
			const boundingBox = currentScene.getBoundingBox();
			if (boundingBox) {
			    for(i = 0; i < additionalActiveScenes.length; i++) {
			        const boundingBox2 = additionalActiveScenes[i].getBoundingBox();
			        if (boundingBox2) {
			        	boundingBox.union(boundingBox2);
			        }
			    }
				currentScene.viewAllWithBoundingBox(boundingBox);
			}
		}
	}
	
	/**
	 * Load a legacy model(s) format with the provided URLs and parameters. This only loads the geometry
	 * without any of the metadata. Therefore, extra parameters should be provided. This should be
	 * called from {@link Zinc.Scene}.
	 * 
	 * @deprecated
	 */
	this.loadModelsURL = (urls, colours, opacities, timeEnabled, morphColour, finishCallback) => {
		currentScene.loadModelsURL(urls, colours, opacities, timeEnabled, morphColour, finishCallback);
	}
	
	const loadView = viewData => {
		currentScene.loadView(viewData);
	};
	
	/**
	 * Load the viewport from an external location provided by the url. This should be
	 * called from {@link Zinc.Scene};
	 * @param {String} URL - address to the file containing viewport information.
	 * @deprecated
	 */
	this.loadViewURL = url => {
		currentScene.loadViewURL(url);
	}
	
	/**
	 * Load a legacy file format containing the viewport and its model file from an external 
	 * location provided by the url. Use the new metadata format with
	 * {@link Zinc.Scene#loadMetadataURL} instead. This should be
	 * called from {@link Zinc.Scene};
	 * 
	 * @param {String} URL - address to the file containing viewport and model information.
	 * @deprecated
	 */
	this.loadFromViewURL = (jsonFilePrefix, finishCallback) => {
		currentScene.loadFromViewURL(jsonFilePrefix, finishCallback);
	}

	/**
	 * Manually add a zinc geometry to the scene. This should be
	 * called from {@link Zinc.Scene};
	 * 
	 * @deprecated
	 */
	this.addZincGeometry = (
        geometry,
        modelId,
        colour,
        opacity,
        localTimeEnabled,
        localMorphColour,
        external,
        finishCallback
    ) => {
		return currentScene.addZincGeometry(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, external, finishCallback);
	}
			
	this.updateDirectionalLight = () => {
		currentScene.updateDirectionalLight();
	}
	
	/**
	 * Stop the animation and renderer to get into the render loop.
	 */
	this.stopAnimate = () => {
		cancelAnimationFrame(animated_id);
   	animated_id = undefined;
	}

	/**
	 * Start the animation and begin the rendering loop.
	 */
	this.animate = () => {
		animated_id = requestAnimationFrame( this.animate );
		this.render();
	}

	const prevTime = Date.now();
	
	/**
	 * Add a callback function which will be called everytime before the renderer renders its scene.
	 * @param {Function} callbackFunction - callbackFunction to be added.
	 * 
	 * @return {Number}
	 */
	this.addPreRenderCallbackFunction = callbackFunction => {
		preRenderCallbackFunctions_id = preRenderCallbackFunctions_id + 1;
		preRenderCallbackFunctions[preRenderCallbackFunctions_id] = callbackFunction;
		return preRenderCallbackFunctions_id;
	}
	
	/**
	 * Remove a callback function that is previously added to the scene.
	 * @param {Number} id - identifier of the previously added callback function.
	 */
	this.removePreRenderCallbackFunction = id => {
		if (id in preRenderCallbackFunctions) {
   			delete preRenderCallbackFunctions[id];
		}
	}
	
	/**
	 * Get the current play rate, playrate affects how fast an animated object animates.
	 * Also see {@link Zinc.Scene#duration}.
	 */
	this.getPlayRate = () => {
		return playRate;
	}
	
	/**
	 * Set the current play rate, playrate affects how fast an animated object animates.
	 * @param {Number} PlayRateIn - value to set the playrate to.
	 * Also see {@link Zinc.Scene#duration}.
	 */
	this.setPlayRate = playRateIn => {
		playRate = playRateIn;
	}
	
	this.getCurrentTime = () => {
		return currentScene.getCurrentTime();
	}
	
	
	/**
	 * Get the current play rate, playrate affects how fast an animated object animates.
	 * Also see {@link Zinc.Scene#duration}.
	 */
	this.setMorphsTime = time => {
		currentScene.setMorphsTime(time);
	}
	
	/**
	 * Get {Zinc.Geoemtry} by its id. This should be called from {@link Zinc.Scene};
	 * 
	 * @depreacted
	 * @return {Zinc.Geometry}
	 */
	this.getZincGeometryByID = id => {
		return currentScene.getZincGeometryByID(id);
	}	
	
	/**
	 * Add {Three.Object} to the current scene.
	 */
	this.addToScene = object => {
		currentScene.addObject(object)
	}
	
	/**
	 * Add {Three.Object} to the ortho scene, objects added to the ortho scene are rendered in
	 * normalised coordinates and overlay on top of current scene.  
	 * 
	 */
	this.addToOrthoScene = object => {
		if (sceneOrtho == undefined)
			sceneOrtho = new THREE.Scene();
		if (cameraOrtho == undefined) {
			const width = this.getDrawingWidth();
			const height = this.getDrawingHeight();
			cameraOrtho = new THREE.OrthographicCamera( -width / 2,
					width / 2, height/ 2, -height / 2, 1, 10 );
			cameraOrtho.position.z = 10;
		}
		sceneOrtho.add(object)
	}
	
	const createHUDSprites = logoSprite => {
		return texture => {
			texture.needsUpdate = true;
			const material = new THREE.SpriteMaterial( { map: texture } );
			const imagewidth = material.map.image.width;
			const imageheight = material.map.image.height;
			logoSprite.material = material;
			logoSprite.scale.set( imagewidth, imageheight, 1 );
			const width = this.getDrawingWidth();
			const height = this.getDrawingHeight();
			logoSprite.position.set( (width - imagewidth)/2, (-height + imageheight)/2, 1 );
			this.addToOrthoScene(logoSprite);
		};
	};
	
	this.addLogo = () => {
		logoSprite = new THREE.Sprite();
		const logo = THREE.ImageUtils.loadTexture(
				"images/abi_big_logo_transparent_small.png", undefined, createHUDSprites(logoSprite));
	}
	
	/**
	 * Render the current and all additional scenes. It will first update all geometries and glyphsets
	 * in scenes, clear depth buffer and render the ortho scene, call the preRenderCallbackFunctions stack
	 * and finally render the scenes.
	 */
	this.render = () => {
		resizeIfRequired();
		const delta = clock.getDelta();
		currentScene.renderGeometries(playRate, delta, this.playAnimation);
	    for(i = 0; i < additionalActiveScenes.length; i++) {
	        const sceneItem = additionalActiveScenes[i];
	        sceneItem.renderGeometries(playRate, delta, this.playAnimation);
	    }
		if (cameraOrtho != undefined && sceneOrtho != undefined) {
			renderer.clearDepth();
			renderer.render( sceneOrtho, cameraOrtho );
		}
	    for (key in preRenderCallbackFunctions) {
	      if (preRenderCallbackFunctions.hasOwnProperty(key)) {
	        preRenderCallbackFunctions[key].call();
	      }
	    }
		currentScene.render(renderer);
	}
	
	/**
	 * Get the internal {@link Three.Renderer}, to gain access to ThreeJS APIs.
	 */
	this.getThreeJSRenderer = () => {
		return renderer;
	}
	
	/**
	 * Check if a scene is currently active.
	 * @param {Zinc.Scene} sceneIn - Scene to check if it is currently
	 * rendered.
	 */
	this.isSceneActive = sceneIn => {
		if (currentScene === sceneIn) {
			return true;
		} else {
		    for(i = 0; i < additionalActiveScenes.length; i++) {
		        const sceneItem = additionalActiveScenes[i];
		        if (sceneItem === sceneIn)
		        	return true;
		    }
		}
	  return false;
	} 
	
	/**
	 * Add additional active scene for rendering, this scene will also be rendered but 
	 * viewport of the currentScene will be used. 
	 * @param {Zinc.Scene} additionalScene - Scene to be added to the rendering.
	 */
	this.addActiveScene = additionalScene => {
		if (!this.isSceneActive(additionalScene)) {
			additionalActiveScenes.push(additionalScene);
			scenesGroup.add(additionalScene.getThreeJSScene());
		}
	}
	
	/**
	 * Remove a currenrtly active scene from the renderer, this scene will also be rendered but 
	 * viewport of the currentScene will be used. 
	 * @param {Zinc.Scene} additionalScene - Scene to be removed from rendering.
	 */
	this.removeActiveScene = additionalScene => {
	    for(i = 0; i < additionalActiveScenes.length; i++) {
	        const sceneItem = additionalActiveScenes[i];
	        if (sceneItem === additionalScene) {
	        	additionalActiveScenes.splice(i, 1);
	        	scenesGroup.remove(additionalScene.getThreeJSScene());
	        	return;
	        }
	    }
	}
	
	/**
	 * Clear all additional scenes from rendering except for curentScene.
	 */
	this.clearAllActiveScene = () => {
		for (let i = 0; i < additionalActiveScenes.length; i++) {
			scenesGroup.remove(additionalActiveScenes[i].getThreeJSScene());
		}
		additionalActiveScenes.splice(0,additionalActiveScenes.length);
	}
	
	/**
	 * Dispose all memory allocated, this will effetively destroy all scenes.
	 */
	this.dispose = () => {
	  for (const key in sceneMap) {
	    if (sceneMap.hasOwnProperty(key)) {
	      sceneMap[key].clearAll();
	    }
	  }
	  sceneMap = [];
	  additionalActiveScenes = [];
	  scenesGroup = new THREE.Group();
	  this.stopAnimate();
	  preRenderCallbackFunctions = [];
	  preRenderCallbackFunctions_id = 0;
	  cameraOrtho = undefined;
	  sceneOrtho = undefined;
	  logoSprite = undefined;
	  const scene = this.createScene("default");
	  this.setCurrentScene(scene);
	}
	
	/**
	 * Transition from the current viewport to the endingScene's viewport in the specified duration.
	 * 
	 * @param {Zinc.Scene} endingScene - Viewport of this scene will be used as the destination.
	 * @param {Number} duration - Amount of time to transition from current viewport to the 
	 * endingScene's viewport.
	 */
	this.transitionScene = (endingScene, duration) => {
		if (currentScene) {
			const currentCamera = currentScene.getZincCameraControls();
			const boundingBox = endingScene.getBoundingBox();
			if (boundingBox) {
				const radius = boundingBox.min.distanceTo(boundingBox.max)/2.0;
				const centreX = (boundingBox.min.x + boundingBox.max.x) / 2.0;
				const centreY = (boundingBox.min.y + boundingBox.max.y) / 2.0;
				const centreZ = (boundingBox.min.z + boundingBox.max.z) / 2.0;
				const clip_factor = 4.0;
				const endingViewport = currentCamera.getViewportFromCentreAndRadius(centreX, centreY, centreZ, radius, 40, radius * clip_factor );
				const startingViewport = currentCamera.getCurrentViewport();
				currentCamera.cameraTransition(startingViewport, endingViewport, duration);
				currentCamera.enableCameraTransition();
			}
		}
	}
};

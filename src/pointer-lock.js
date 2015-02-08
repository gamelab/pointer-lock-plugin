/**
* Description about the main namespace that the plugin is in.
*
* @module Kiwi
* @submodule Plugins
* @namespace Kiwi.Plugins
* @class PointerLock
*/
Kiwi.Plugins.PointerLock = {
	/**
	* The name of this plugin.
	* @property name
	* @type String
	* @default "MyPlugin"
	* @public
	*/
	name:"PointerLock",

	/**
	* The version of this plugin.
	* @property version
	* @type String
	* @default "0.1.0"
	* @public
	*/
	version:"0.1.0",

	minimumKiwiVersion: "1.0.0"
};

/**
* Registers this plugin with the Global Kiwi Plugins Manager if it is avaiable.
* 
*/
Kiwi.PluginManager.register( Kiwi.Plugins.PointerLock );

/**
* This create method is executed when Kiwi Game that has been told
* to use this plugin reaches the boot stage of the game loop.
* @method create
* @param game{Kiwi.Game} The game that is current in the boot stage.
* @private 
*/
Kiwi.Plugins.PointerLock.create = function( game ) {
	console.log( "Pointer Lock Plugin created in game", game.name );
};


/**
* @module Kiwi.Plugins
* @submodule PointerLock
* @namespace Kiwi.Plugins.PointerLock
*/


/**
* The PointerLock object manages pointer lock for your game.
* <br><br>
* This object only requires a reference to the Game object to initialise.
*	It will otherwise set default values.
*	You may pass a single Game object instead of its standard params,
*	for example "new Kiwi.Plugins.PointerLock.PointerLock( myGame )"
*	instead of "new Kiwi.Plugins.PointerLock.PointerLock( { game: myGame } )".
*	You must specify the entire params object if you wish to set other params.
* <br><br>
* By default, when you create a new PointerLock object, it will trigger
*	pointer lock when the user clicks anywhere on the game area.
*	You can exit pointer lock by pressing ESC.
*	We provide this method because pointer lock must be activated
*	by user gesture.
* <br><br>
* The PointerLock object tracks the X and Y movements of the mouse
*	and can fire custom functions as part of the user gesture.
*	By default this occurs whether the pointer is locked or not.
*	You may toggle this with the "trackWhileUnlocked" flag.
* <br><br>
* You may define custom functions in the blank functions
*	"runOnLock", "runOnUnlock," "runOnMouseMove" and "runOnLockError".
*
* @class PointerLock
* @constructor
* @param params {Object} Parameter object
*	@param params.game {Kiwi.Game} Current game object
*	@param [params.lockOnClick=true] {Boolean} Whether to always lock the game
*		when clicked
*	@param [params.trackWhileUnlocked=true] {Boolean} Whether to always
*		track mouse movement events
*	@param [params.runOnLock] {function} Function to run on pointer lock
*	@param [params.runOnUnlock] {function} Function to run on pointer unlock
*	@param [params.runOnLockError] {function} Function to run on error
*	@param [params.runOnMouseMove] {function} Function to run on mouse movement
* @return Kiwi.Plugins.PointerLock.PointerLock
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock = function( params ) {
	var _reportLockError,
		_reportLockChange;

	/**
	* DOM element on which the lock occurs
	* @property canvas
	* @type Object
	* @public
	* @since 0.1.0
	*/
	this.canvas = null;

	/**
	* Whether the canvas is currently locked
	* @property locked
	* @type Boolean
	* @public
	* @since 0.1.0
	*/
	this.locked = false;

	/**
	* Whether to lock the pointer if it is not locked and the game is clicked.
	* @property lockOnClick
	* @type Boolean
	* @default true
	* @public
	* @since 0.1.0
	*/
	this.lockOnClick = true;

	/**
	* Mouse delta in X axis; how far the mouse was last moved horizontally.
	*	This data is available to the "runOnMouseMove" method
	*	and should be used there.
	* @property movementX
	* @type Number
	* @default 0
	* @public
	* @since 0.1.0
	*/
	this.movementX = 0;

	/**
	* Mouse delta in Y axis; how far the mouse was last moved vertically.
	*	This data is available to the "runOnMouseMove" method
	*	and should be used there.
	* @property movementY
	* @type Number
	* @default 0
	* @public
	* @since 0.1.0
	*/
	this.movementY = 0;

	/**
	* Whether to track mouse deltas when the pointer is not locked.
	* @property trackWhileUnlocked
	* @type Boolean
	* @default true
	* @public
	* @since 0.1.0
	*/
	this.trackWhileUnlocked = true;



	if ( params.objType && params.objType() === "Game" ) {
		this.canvas = params.stage.container;
	} else {
		this.canvas = params.game.stage.container;
		if ( params.lockOnClick === false ) {
			this.lockOnClick = false;
		}
		if ( params.trackWhileUnlocked === false ) {
			this.trackWhileUnlocked = false;
		}
		if ( typeof params.runOnLock === "function" ) {
			this.runOnLock = params.runOnLock;
		}
		if ( typeof params.runOnUnlock === "function" ) {
			this.runOnUnlock = params.runOnUnlock;
		}
		if ( typeof params.runOnLockError === "function" ) {
			this.runOnLockError = params.runOnLockError;
		}
		if ( typeof params.runOnMouseMove === "function" ) {
			this.runOnMouseMove = params.runOnMouseMove;
		}
	}

	if ( this.lockOnClick ) {
		this.clickGameToLock();
	}

	// Consolidate Pointer Lock API calls on DOM element
	this.canvas.requestPointerLock =
		this.canvas.requestPointerLock ||
		this.canvas.mozRequestPointerLock ||
		this.canvas.webkitRequestPointerLock;
	this.canvas.exitPointerLock =
		this.canvas.exitPointerLock ||
		this.canvas.mozExitPointerLock ||
		this.canvas.webtkitExitPointerLock;

	// Setup event listeners

	// Movement listener
	_reportMouseMove = this._reportMouseMove.bind( this );
	document.addEventListener( "mousemove", _reportMouseMove, false );

	// Error listeners
	_reportLockError = this._reportLockError.bind( this );
	document.addEventListener( "pointerlockerror",
		_reportLockError, false );
	document.addEventListener( "mozpointerlockerror",
		_reportLockError, false );
	document.addEventListener( "webkitpointerlockerror",
		_reportLockError, false );

	// Lock change listeners
	_reportLockChange = this._reportLockChange.bind( this );
	if ( "onpointerlockchange" in document ) {
		document.addEventListener( "pointerlockchange",
			_reportLockChange, false );
	} else if ( "onmozpointerlockchange" in document ) {
		document.addEventListener( "mozpointerlockchange",
			_reportLockChange, false );
	} else if ( "onwebkitpointerlockchange" in document ) {
		document.addEventListener( "webkitpointerlockchange",
			_reportLockChange, false );
	}

	return this;
};


/**
* @method _reportLockChange
* @param event {Event}
* @since 0.1.0
* @private
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype._reportLockChange =
		function( event ) {
	if ( this.getPointerLockElement() === this.canvas ) {
		this.locked = true;
		this.runOnLock();
	} else {
		this.locked = false;
		if ( this.lockOnClick ) {
			this.clickGameToLock();
		}
		this.runOnUnlock();
	}
};


/**
* @method _reportLockError
* @param event {Event}
* @since 0.1.0
* @private
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype._reportLockError =
		function( event ) {
	console.warn( "Pointer lock change failed" );
	this.runOnLockError();
};


/**
* @method _reportMouseMove
* @param event {Event}
* @private
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype._reportMouseMove =
		function( event ) {
	if ( this.locked || this.trackWhileUnlocked ) {
		this.movementX =
			event.movementX ||
			event.mozMovementX ||
			event.webkitMovementX ||
			0;
		this.movementY =
			event.movementY ||
			event.mozMovementY ||
			event.webkitMovementY ||
			0;
		this.runOnMouseMove();
	}
};


/**
* Convenience method for quickly activating pointer lock.
*	When called, the game listens for a click anywhere on its surface,
*	then activates pointer lock.
* @method clickGameToLock
* @public
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype.clickGameToLock =
		function() {
	this.canvas.onclick = (function() {
		this.enablePointerLock();

		// Disable click after activation
		this.canvas.onclick = function(){};
	}).bind( this );
};


/**
* Disables pointer lock.
*	In the event that you need to bypass safety checks,
*	you may directly call "this.canvas.exitPointerLock()",
*	but this is not recommended.
* @method disablePointerLock
* @public
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype.disablePointerLock = function() {
	if ( this.canvas === this.getPointerLockElement() ) {
		this.canvas.exitPointerLock();
	} else {
		console.warn( "Pointer unlock failed: element not locked" );
	}
};


/**
* Enables pointer lock.
*	In the event that you need to bypass safety checks,
*	you may directly call "this.canvas.requestPointerLock()",
*	but this is not recommended.
* @method enablePointerLock
* @public
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype.enablePointerLock = function() {
	var pointerLockElement = this.getPointerLockElement();

	// Check document for currently locked elements
	if ( pointerLockElement === this.canvas ) {
		console.warn( "Pointer lock failed: already locked on target element");
	}
	if ( pointerLockElement != null ) {
		console.warn( "Pointer lock failed: already locked on element",
			pointerLockElement );
		return;
	}

	// Call Pointer Lock
	this.canvas.requestPointerLock();
};


/**
* Returns the currently locked DOM element, or "null" if no element is locked.
* @method getPointerLockElement
* @return {Object} DOM element that is locked.
* @public
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype.getPointerLockElement =
		function() {
	return document.pointerLockElement ||
		document.mozPointerLockElement ||
		document.webkitPointerLockElement;
};


/**
* Returns the type of object that this is.
* @method objType
* @return {string}
* @public
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype.objType = function() {
	return "PointerLock";
};


/**
* Empty function called whenever the pointer is locked.
*	Override this to perform game-specific functions.
*	Scope is always on the PointerLock object.
* @method runOnLock
* @public
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype.runOnLock = function() {};


/**
* Empty function called whenever the pointer lock encounters an error.
*	Override this to perform game-specific functions.
*	Scope is always on the PointerLock object.
* @method runOnLockError
* @public
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype.runOnLockError = function() {};


/**
* Empty function called whenever the pointer moves.
*	Override this to perform game-specific functions.
*	Scope is always on the PointerLock object.
* @method runOnMouseMove
* @public
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype.runOnMouseMove = function() {};


/**
* Empty function called whenever the pointer is unlocked.
*	Override this to perform game-specific functions.
*	Scope is always on the PointerLock object.
* @method runOnUnlock
* @public
* @since 0.1.0
*/
Kiwi.Plugins.PointerLock.PointerLock.prototype.runOnUnlock = function() {};

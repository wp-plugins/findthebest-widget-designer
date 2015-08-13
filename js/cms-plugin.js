/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	// Expose gobal integrations
	__webpack_require__(2);
	__webpack_require__(3);
	__webpack_require__(4);


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var FTB = window.FTB = window.FTB || {};
	FTB.Recommender = __webpack_require__(5);


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * jquery-plugin
	 *
	 * Adds a jquery plugin that allows you to quickly create
	 * an widget search instance inside a container element
	 */
	var Recommender = __webpack_require__(5);

	var jQueryGlobal = window.jQuery;
	if (jQueryGlobal && !jQueryGlobal.fn.recommender) {
		jQueryGlobal.fn.recommender = function(options) {

			// Check if an widget search instance already exists for this element
			var recommender = this.data('__recommender');
			
			if (!recommender) {
				// Create a new recommender instance contained in this element
				options = jQueryGlobal.extend(options, {
					mode: 'container',
					container: this
				});
				recommender = new Recommender(options);
				this.data('__recommender', recommender);
			} else {
				recommender.search();
			}

			return this;
		};
	}


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var PLUGIN_NAME = 'ftb-plugin';

	var Constants = __webpack_require__(6);

	if (window.CKEDITOR) {
		window.CKEDITOR.plugins.add(PLUGIN_NAME, {
			init: function(editor){
				editor.addCommand(PLUGIN_NAME, {
					exec: function(editor){
						if (editor.__recommender) {
							editor.__recommender.show();
						} else {
							// TODO May want to create one with default settings?
							console.log('No Recommender attached to this editor');
						}
					}
				});

				editor.ui.addButton(PLUGIN_NAME, {
					label: 'Recommended Content',
					icon: Constants.ICON,
					command: PLUGIN_NAME
				});
			}
		});
	}


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var Class = __webpack_require__(9);
	var Constants = __webpack_require__(6);
	var EventEmitter = __webpack_require__(8).EventEmitter;
	var extend = __webpack_require__(10);
	var frame = __webpack_require__(7);
	var msg = __webpack_require__(11);
	var noop = function(){};

	var Recommender = Class({

		///////////////////////////////////////
		// PUBLIC INTERFACE ///////////////////
		///////////////////////////////////////

		init: function(options) {
			options = extend({}, options);

			// Some defaults before we call setters
			this.setMode(Constants.MODE_MODAL);
			this.setText().setTitle().setTags();

			// Call setters for options passed in
			for (var prop in options) {
				if (options.hasOwnProperty(prop)) {
					set.call(this, prop, options[prop]);
				}
			}

			// Listen for messages from the iframe
			msg.receiveMessage(receiveMessage.bind(this), Constants.HOST);
		},

		show: function() {
			this.showModal();

			// For now, show will automatically trigger a search
			// In a future version, we may want to require search() to be called explicitly
			this.search();

			return this;
		},

		showModal: function() {
			var self = this;
			var src = Constants.HOST+'/widgets/plugin';

			var params = this.buildQueryString({
				key:               this.key,
				locale:            this.locale,
				client_user_id:    this.userID,
				client_user_email: this.userEmail
			});
			if (params) {
				src += '?' + params;
			}

			if (!this.frame) {
				this.frame = frame('<iframe id="wsp-iframe" src="'+src+'" frameborder="0"></iframe>', this.getMode());
				this.iframe = document.querySelector('#wsp-iframe');
				this.frame.on('hide', function(){
					self.afterHide();
				});
				this.frame.on('show', function(){
					self.afterShow();
				});
			} else {
				this.frame.show();
			}

			this.afterShow();

			return this;
		},

		afterShow: function() {
			this.isShown = true;
			this.emit('show');
			return this;
		},

		hide: function() {
			this.frame.hide();
			this.afterHide();
			return this;
		},

		afterHide: function() {
			this.emit('hide');
			this.isShown = false;
			return this;
		},

		search: function(query) {
			// Make sure modal is showing
			if (!this.isShown) {
				this.showModal();
			}

			// Make sure the interface has loaded
			if (!this.isLoaded) {
				this.onLoad = function(){
					this.search(query);
				}.bind(this);
				return this;
			}

			if (query) {
				postMessage.call(this, 'search', {
					text: query
				});
			} else {
				postMessage.call(this, 'search', {
					title: this.title(),
					text: this.text(),
					tags: this.tags()
				});
			}

			return this;
		},

		setKey: function(key) {
			this.key = key;
			return this;
		},

		getKey: function() {
			return this.key;
		},

		setText: function(callback){
			this.text = callback || noop;
			return this;
		},

		getText: function() {
			return this.text;
		},

		setTitle: function(callback){
			this.title = callback || noop;
			return this;
		},

		getTitle: function() {
			return this.title;
		},

		setTags: function(callback){
			this.tags = callback || noop;
			return this;
		},

		getTags: function() {
			return this.tags;
		},

		setMode: function(mode, container) {
			if (mode === Constants.MODE_CONTAINER) {
				if (container) {
					this.setContainer(container);
				}
				this.mode = Constants.MODE_CONTAINER;
			} else if (mode === Constants.MODE_SIDEBAR) {
				this.mode = Constants.MODE_SIDEBAR;
			} else {
				this.mode = Constants.MODE_MODAL;
			}
			if (this.frame) {
				this.frame.setMode(this.mode);
			}
			return this;
		},

		getMode: function() {
			return this.mode || Constants.MODE_MODAL;
		},

		setContainer: function(container) {
			this.container = container;
			return this;
		},

		getContainer: function() {
			return this.container;
		},

		setUserID: function(id) {
			this.userID = id;
			return this;
		},

		getUserID: function() {
			return this.userID;
		},

		setUserEmail: function(email) {
			this.userEmail = email;
			return this;
		},

		getUserEmail: function() {
			return this.userEmail;
		},

		setColor: function(color) {
			if (color && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
				this.color = color;
			}
			return this;
		},

		getColor: function() {
			return this.color;
		},

		setEmbedType: function(type) {
			if (type === 'script' || type === 'iframe') {
				this.embedType = type;
			}
			return this;
		},

		getEmbedType: function() {
			return this.embedType || 'script';
		},

		setLocale: function(locale) {
			this.locale = locale;
		},

		getLocale: function() {
			return this.locale;
		},

		attachEditor: function(editor) {
			editor.__recommender = this;
			this.setText(function(){
				return editor.getData();
			});
			this.on('select', function(result){
				editor.insertHtml('<br/>'+result.code+'<br/>');
			});
			return this;
		},

		buildQueryString: function(data) {
			var ret = [];
			for (var d in data) {
				if (data.hasOwnProperty(d) && data[d] !== undefined) {
					ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
				}
			}
			return ret.join('&');
		}

	});


	///////////////////////////////////////
	// PUBLIC MIXIN METHODS ///////////////
	///////////////////////////////////////

	// Events: on/off/emit/etc.
	extend(Recommender.prototype, EventEmitter.prototype);


	///////////////////////////////////////
	// PRIVATE INSTANCE METHODS ///////////
	///////////////////////////////////////

	function set(option, value) {
		// Capitalize
		option = option.charAt(0).toUpperCase() + option.slice(1);
		var fn = 'set'+option;
		if (this[fn]) {
			this[fn](value);
		}
	}

	function postMessage(method, payload) {
		if (!this.iframe) return;
		var message = {
			method: method,
			payload: payload
		};
		msg.postMessage(message, Constants.HOST, this.iframe.contentWindow);
	}

	function receiveMessage(event) {
		var data = event.data;
		if (!data || !data.method) return;
		if (data.method === 'load') {
			this.isLoaded = true;

			// Pass options to iframe
			postOptions.call(this);

			this.onLoad && this.onLoad();
			this.emit('load', data.payload);
		}
		if (data.method === 'select') {
			this.emit('select', data.payload);
			this.hide();
		}
	}

	/**
	 * Pass any options required for the current session into
	 * the iframe so they can be used when communicating with
	 * the server
	 */
	function postOptions() {
		postMessage.call(this, 'options', {
			key: this.key,
			color: this.color,
			embedType: this.embedType
		});
	}

	///////////////////////////////////////
	// PUBLIC CONSTANTS ///////////////////
	///////////////////////////////////////

	Recommender.VERSION = Constants.VERSION;
	Recommender.ICON = Constants.ICON;


	module.exports = Recommender;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var IS_LOCAL = window.FTB.IS_LOCAL || window.FTB_IS_LOCAL,
		DOMAIN = IS_LOCAL ? 'dw.com' : 'findthebest.com',
		PROTOCOL = IS_LOCAL ? window.location.protocol : 'https:',
		HOST = PROTOCOL + '//www.' + DOMAIN;

	module.exports = {
		DOMAIN: DOMAIN,
		PROTOCOL: PROTOCOL,
		HOST: HOST,
		ICON: '//img1.findthebest.com/sites/default/files/4261/media/images/_6326290.png',
		VERSION: 0.1,
		MODE_MODAL: 'modal',
		MODE_SIDEBAR: 'sidebar',
		MODE_CONTAINER: 'container'
	};


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var dom = __webpack_require__(12);
	var tpl = __webpack_require__(13);
	var Constants = __webpack_require__(6);
	var EventEmitter = __webpack_require__(8).EventEmitter;
	var extend = __webpack_require__(10);

	module.exports = function(content, mode) {
		var self = {};

		// Require CSS lazily since it inserts styles into head
		__webpack_require__(14);

		// Append modal to DOM
		var tempDiv = document.createElement('div');
		tempDiv.innerHTML = tpl.replace('{content}', content);
		document.getElementsByTagName('body')[0].appendChild(tempDiv.children[0]);

		// Store reference to modal
		var modal = document.getElementsByClassName('wsm-wrap')[0];

		modal.querySelector('.wsm-close').addEventListener('click', function(){
			self.hide();
		});
		modal.querySelector('.wsm-bg').addEventListener('click', function(){
			self.hide();
		});

		self.show = function() {
			modal.style.display = 'block';
			modal.clientLeft; // Repaint
			dom.addClass(modal, 'shown');

			self.emit('show');
		};

		self.hide = function() {
			dom.removeClass(modal, 'shown');
			setTimeout(function(){
				modal.style.display = 'none';
			}, 400);
			self.emit('hide');
		};

		self.destroy = function() {
			modal.parentNode.removeChild(modal);
			self.emit('destroy');
		};

		self.setMode = function(mode) {
			// Set data attribute
			modal.dataset.mode = mode;
		};

		// Events: on/off/emit/etc.
		extend(self, EventEmitter.prototype);

		self.setMode(mode);
		self.show();

		return self;
	};

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        len = arguments.length;
	        args = new Array(len - 1);
	        for (i = 1; i < len; i++)
	          args[i - 1] = arguments[i];
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    len = arguments.length;
	    args = new Array(len - 1);
	    for (i = 1; i < len; i++)
	      args[i - 1] = arguments[i];

	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    var m;
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  var ret;
	  if (!emitter._events || !emitter._events[type])
	    ret = 0;
	  else if (isFunction(emitter._events[type]))
	    ret = 1;
	  else
	    ret = emitter._events[type].length;
	  return ret;
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Author: Ivan Zhidkov
	 * Info: https://github.com/scaryzet/class.js
	 *
	 * Released under the MIT License.
	 *
	 * Based on:
	 *
	 *   "Simple JavaScript Inheritance" by John Resig (MIT Licensed).
	 *   http://ejohn.org/blog/simple-javascript-inheritance/
	 *
	 *   "Simple Class Instantiation" by John Resig (MIT Licensed).
	 *   http://ejohn.org/blog/simple-class-instantiation/
	 */
	module.exports = (function() {
		var initializing = false;

		/**
		 * @example
		 *
		 * var A = makeSmartClass();
		 * A.prototype.init = function(x) { this.x = x; };
		 *
		 * // Both ways are valid:
		 * var instance1 = new A(2);
		 * var instance2 = A(2);
		 */
		function makeSmartClass() {
			function SmartClass(args) {
				// Was the keyword "new" used?
				if (this instanceof SmartClass) {
					if (!initializing && typeof this.init == 'function')
						this.init.apply(this, args && args.callee ? args : arguments);
				} else {
					return new SmartClass(arguments);
				}
			};

			return SmartClass;
		}

		function Base() {
		};

		// NOTE: Function source code is always accessible in nodejs.
		var parentFnRegex = /\b_parent\b/;

		Base.extend = function(properties) {
			var _parent = this.prototype;

			// Instantiate a base class (but only create the instance, don't run the init constructor).

			initializing = true;
			var prototype = new this();
			initializing = false;

			// Copy the properties over onto the new prototype.

			for (var name in properties) {
				var property = properties[name];

				// We want to have a special property "_parent" in our methods, which acts itself
				// as the corresponding parent method called in context of our object.
				//
				// So that this._parent(...) calls the method of the same name of the parent class.

				if (typeof property == 'function' && parentFnRegex.test(property)) {
					prototype[name] = (function(name, fn) {
						var parentFunction = typeof _parent[name] == 'function'
	//						? function() {
	//							return _parent[name].apply(this, arguments);
	//						}
							? _parent[name]
							: function() {
								throw new Error('Bad _parent() call: ' + name + '() doesn\'t exist in parent class.');
							};

						return function() {
							var tmp = this._parent;

							// Add a new ._parent().

							this._parent = parentFunction;

							// The method only need to be bound temporarily,
							// so we remove it when we're done executing.

							var ret = fn.apply(this, arguments);
							this._parent = tmp;

							return ret;
						};
					})(name, property);
				} else {
					prototype[name] = property;
				}
			}

			var Class = makeSmartClass();

			// Populate our constructed prototype object, enforce the constructor to be what we expect,
			// and make this class extendable.

			Class.prototype = prototype;
			Class.prototype.constructor = Class;
			Class.extend = arguments.callee;

			return Class;
		};

		return function(properties) {
			return Base.extend(properties);
		};
	}());


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var hasOwn = Object.prototype.hasOwnProperty;
	var toString = Object.prototype.toString;
	var undefined;

	var isPlainObject = function isPlainObject(obj) {
		'use strict';
		if (!obj || toString.call(obj) !== '[object Object]') {
			return false;
		}

		var has_own_constructor = hasOwn.call(obj, 'constructor');
		var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
		// Not own constructor property must be Object
		if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
			return false;
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.
		var key;
		for (key in obj) {}

		return key === undefined || hasOwn.call(obj, key);
	};

	module.exports = function extend() {
		'use strict';
		var options, name, src, copy, copyIsArray, clone,
			target = arguments[0],
			i = 1,
			length = arguments.length,
			deep = false;

		// Handle a deep copy situation
		if (typeof target === 'boolean') {
			deep = target;
			target = arguments[1] || {};
			// skip the boolean and the target
			i = 2;
		} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
			target = {};
		}

		for (; i < length; ++i) {
			options = arguments[i];
			// Only deal with non-null/undefined values
			if (options != null) {
				// Extend the base object
				for (name in options) {
					src = target[name];
					copy = options[name];

					// Prevent never-ending loop
					if (target === copy) {
						continue;
					}

					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && Array.isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[name] = extend(deep, clone, copy);

					// Don't bring in undefined values
					} else if (copy !== undefined) {
						target[name] = copy;
					}
				}
			}
		}

		// Return the modified object
		return target;
	};



/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * ender postMessage - v0.1.3 - 5/1/2012
	 * by Thomas Sturm http://www.sturm.to
	 * Dual licensed under the MIT and GPL licenses.
	 *
	 * based on 
	 *
	 * jQuery postMessage - v0.5 - 9/11/2009
	 * http://benalman.com/projects/jquery-postmessage-plugin/
	 * Copyright (c) 2009 "Cowboy" Ben Alman
	 * Dual licensed under the MIT and GPL licenses.
	 * http://benalman.com/about/license/
	 */

	// Release History
	// ender postMessage
	// 0.1.3 - (5/1/2012) compatible with browserify
	// 0.1.2 - (5/26/2011) Initial Fork and Release
	//
	// jQuery postMessage
	// 0.5 - (9/11/2009) Improved cache-busting
	// 0.4 - (8/25/2009) Initial release

	!function (window) {
	     // A few vars used in non-awesome browsers
	     var interval_id,
		  last_hash,
		  original_hash,
		  cache_bust = 1,
			
		  // A var used in awesome browsers.
		  rm_callback,
			
		  // A few convenient shortcuts.
		  window = this,
		  FALSE = !1,
			
		  // Reused internal strings.
		  postMessage = 'postMessage',
		  addEventListener = 'addEventListener',

	      has_postMessage = window[postMessage];
	     
	      fn = {};
		
		  // Method: ender.postMessage
		  // 
		  // This method will call window.postMessage if available, setting the
		  // targetOrigin parameter to the base of the target_url parameter for maximum
		  // security in browsers that support it. If window.postMessage is not available,
		  // the target window's location.hash will be used to pass the message. 
		  //
		  // Please Note: The ender version does not support the jQuery object serialization 
		  // for postMessage
		  // 
		  // Usage:
		  // 
		  // > ender.postMessage( message, target_url [, target ] );
		  // 
		  // Arguments:
		  // 
		  //  message - (String) A message to be passed to the other frame.
		  //  target_url - (String) The URL of the other frame this window is
		  //    attempting to communicate with. This must be the exact URL (including
		  //    any query string) of the other window for this script to work in
		  //    browsers that don't support window.postMessage.
		  //  target - (Object) A reference to the other frame this window is
		  //    attempting to communicate with. If omitted, defaults to `parent`.
		  // 
		  // Returns:
		  // 
		  //  Nothing.
		  
		  fn.postMessage = function( message, target_url, target ) {
			if ( !target_url ) { return; }
			
			// Default to parent if unspecified.
			target = target || parent;
			
			if ( has_postMessage ) {
			  // The browser supports window.postMessage, so call it with a targetOrigin
			  // set appropriately, based on the target_url parameter.
			  target[postMessage]( message, target_url.replace( /([^:]+:\/\/[^\/]+).*/, '$1' ) );
			  
			} else if ( target_url ) {
			  // The browser does not support window.postMessage, so set the location
			  // of the target to target_url#message. A bit ugly, but it works! A cache
			  // bust parameter is added to ensure that repeat messages trigger the
			  // callback.
			  target.location = target_url.replace( /#.*$/, '' ) + '#' + (+new Date) + (cache_bust++) + '&' + message;
			}
		  };
		  
		  // Method: ender.receiveMessage
		  // 
		  // Register a single callback for either a window.postMessage call, if
		  // supported, or if unsupported, for any change in the current window
		  // location.hash. If window.postMessage is supported and source_origin is
		  // specified, the source window will be checked against this for maximum
		  // security. If window.postMessage is unsupported, a polling loop will be
		  // started to watch for changes to the location.hash.
		  // 
		  // Note that for simplicity's sake, only a single callback can be registered
		  // at one time. Passing no params will unbind this event (or stop the polling
		  // loop), and calling this method a second time with another callback will
		  // unbind the event (or stop the polling loop) first, before binding the new
		  // callback.
		  // 
		  // Also note that if window.postMessage is available, the optional
		  // source_origin param will be used to test the event.origin property. From
		  // the MDC window.postMessage docs: This string is the concatenation of the
		  // protocol and "://", the host name if one exists, and ":" followed by a port
		  // number if a port is present and differs from the default port for the given
		  // protocol. Examples of typical origins are https://example.org (implying
		  // port 443), http://example.net (implying port 80), and http://example.com:8080.
		  // 
		  // Usage:
		  // 
		  // > ender.receiveMessage( callback [, source_origin ] [, delay ] );
		  // 
		  // Arguments:
		  // 
		  //  callback - (Function) This callback will execute whenever a <ender.postMessage>
		  //    message is received, provided the source_origin matches. If callback is
		  //    omitted, any existing receiveMessage event bind or polling loop will be
		  //    canceled.
		  //  source_origin - (String) If window.postMessage is available and this value
		  //    is not equal to the event.origin property, the callback will not be
		  //    called.
		  //  source_origin - (Function) If window.postMessage is available and this
		  //    function returns false when passed the event.origin property, the
		  //    callback will not be called.
		  //  delay - (Number) An optional zero-or-greater delay in milliseconds at
		  //    which the polling loop will execute (for browser that don't support
		  //    window.postMessage). If omitted, defaults to 100.
		  // 
		  // Returns:
		  // 
		  //  Nothing!
		  
		  fn.receiveMessage = function( callback, source_origin, delay ) {
			if ( has_postMessage ) {
			  // Since the browser supports window.postMessage, the callback will be
			  // bound to the actual event associated with window.postMessage.
			  
			  if ( callback ) {
				// Unbind an existing callback if it exists.
				rm_callback && fn.receiveMessage();
				
				// Bind the callback. A reference to the callback is stored for ease of
				// unbinding.
				rm_callback = function(e) {
				  if ( ( typeof source_origin === 'string' && e.origin !== source_origin )
					|| ( typeof source_origin === 'function' && source_origin( e.origin ) === FALSE ) ) {
					return FALSE;
				  }
				  callback( e );
				};
			  }
			  
			  if ( window[addEventListener] ) {
				window[ callback ? addEventListener : 'removeEventListener' ]( 'message', rm_callback, FALSE );
			  } else {
				window[ callback ? 'attachEvent' : 'detachEvent' ]( 'onmessage', rm_callback );
			  }
			  
			} else {
			  // Since the browser sucks, a polling loop will be started, and the
			  // callback will be called whenever the location.hash changes.
			  
			  interval_id && clearInterval( interval_id );
			  interval_id = null;
			  
			  if ( callback ) {
				delay = typeof source_origin === 'number'
				  ? source_origin
				  : typeof delay === 'number'
					? delay
					: 100;
				
				original_hash = document.location.hash;
				
				interval_id = setInterval(function(){
				  var hash = document.location.hash,
					re = /^#?\d+&/;
				  if ( hash !== last_hash && hash !== original_hash && re.test( hash ) ) {
					last_hash = hash;
					if ( original_hash ) {
						document.location.hash = original_hash; 
					} else {
						document.location.hash = ''; 
					}
					callback({ data: hash.replace( re, '' ) });
				  }
				}, delay );
			  }
			}
		  };
		  module.exports = {postMessage: fn.postMessage, receiveMessage: fn.receiveMessage};
	}(window);


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
		addClass: function(el, className) {
			if (el.classList)
				el.classList.add(className);
			else
				el.className += ' ' + className;
		},
		removeClass: function(el, className) {
			if (el.classList)
				el.classList.remove(className);
			else
				el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
		}
	};

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "<div class=\"wsm-wrap\">\n\t<div class=\"wsm-bg\"></div>\n\t<div class=\"wsm-frame\">\n\t\t<div class=\"wsm-content\">{content}</div>\n\t\t<div class=\"wsm-close\">&times;</div>\n\t</div>\n</div>\n";

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(15);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(16)(content, {});
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		module.hot.accept("!!/Users/dschnurr/findthebest/source/sites/all/modules/custom/widgets/plugin/client/node_modules/css-loader/index.js!/Users/dschnurr/findthebest/source/sites/all/modules/custom/widgets/plugin/client/frame.css", function() {
			var newContent = require("!!/Users/dschnurr/findthebest/source/sites/all/modules/custom/widgets/plugin/client/node_modules/css-loader/index.js!/Users/dschnurr/findthebest/source/sites/all/modules/custom/widgets/plugin/client/frame.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(17)();
	exports.push([module.id, "/**\n * Common/Reset styles for all modes\n */\n.wsm-bg {\n\tdisplay: none;\n}\n.wsm-frame {\n\tbackground: #eee;\n}\n.wsm-content {\n\tposition: absolute;\n\ttop: 0;\n\tleft: 0;\n\tright: 0;\n\tbottom: 0;\n}\n.wsm-content iframe {\n\tposition: absolute;\n\twidth: 100%;\n\theight: 100%;\n}\n.wsm-wrap.shown {\n\topacity: 1 !important;\n}\n.wsm-close {\n\tposition: absolute;\n\ttop: 9px;\n\tright: 20px;\n\tpadding: 3px;\n\ttext-align: center;\n\tfont-weight: bold;\n\tcolor: #999;\n\tfont-size: 30px;\n\tline-height: 1;\n\tcursor: pointer;\n}\n.wsm-close:hover {\n\tcolor: #aaa;\n}\n.wsm-close:active {\n\tcolor: #bbb;\n}\n\n\n/**\n * Modal Mode\n */\n.wsm-wrap[data-mode=\"modal\"] {\n\tposition: fixed;\n\tmin-height: 360px;\n\tz-index: 9999999;\n\tdisplay: none;\n\topacity: 0;\n\ttransition: 0.4s opacity;\n\ttop: 0;\n\tleft: 0;\n\tright: 0;\n\tbottom: 0;\n}\n\n.wsm-wrap[data-mode=\"modal\"] .wsm-bg {\n\tdisplay: block;\n\tposition: absolute;\n\tbackground: #000;\n\topacity: 0.7;\n\ttop: 0;\n\tleft: 0;\n\tright: 0;\n\tbottom: 0;\n}\n\n.wsm-wrap[data-mode=\"modal\"] .wsm-frame {\n\tposition: absolute;\n\ttop: 30px;\n\tleft: 30px;\n\tright: 30px;\n\tbottom: 30px;\n\tz-index: 2;\n\t-webkit-box-shadow: 0 5px 15px rgba(0, 0, 0, 0.7);\n\t        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.7);\n}\n\n/**\n * Sidebar Mode\n */\n.wsm-wrap[data-mode=\"sidebar\"] {\n\tposition: fixed;\n\tmin-height: 360px;\n\tz-index: 9999999;\n\tdisplay: none;\n\topacity: 0;\n\ttransition: 0.4s opacity;\n\ttop: 0;\n\tright: 0;\n\tbottom: 0;\n\twidth: 300px;\n\t-webkit-box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.2);\n\t\t\tbox-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.2);\n}\n\n.wsm-wrap[data-mode=\"sidebar\"] .wsm-frame {\n\tposition: absolute;\n\ttop: 0;\n\tleft: 0;\n\tright: 0;\n\tbottom: 0;\n}\n", ""]);

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	var stylesInDom = {},
		memoize = function(fn) {
			var memo;
			return function () {
				if (typeof memo === "undefined") memo = fn.apply(this, arguments);
				return memo;
			};
		},
		isIE9 = memoize(function() {
			return /msie 9\b/.test(window.navigator.userAgent.toLowerCase());
		}),
		getHeadElement = memoize(function () {
			return document.head || document.getElementsByTagName("head")[0];
		}),
		singletonElement = null,
		singletonCounter = 0;

	module.exports = function(list, options) {
		if(false) {
			if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
		}

		options = options || {};
		// Force single-tag solution on IE9, which has a hard limit on the # of <style>
		// tags it will allow on a page
		if (typeof options.singleton === "undefined") options.singleton = isIE9();

		var styles = listToStyles(list);
		addStylesToDom(styles, options);

		return function update(newList) {
			var mayRemove = [];
			for(var i = 0; i < styles.length; i++) {
				var item = styles[i];
				var domStyle = stylesInDom[item.id];
				domStyle.refs--;
				mayRemove.push(domStyle);
			}
			if(newList) {
				var newStyles = listToStyles(newList);
				addStylesToDom(newStyles, options);
			}
			for(var i = 0; i < mayRemove.length; i++) {
				var domStyle = mayRemove[i];
				if(domStyle.refs === 0) {
					for(var j = 0; j < domStyle.parts.length; j++)
						domStyle.parts[j]();
					delete stylesInDom[domStyle.id];
				}
			}
		};
	}

	function addStylesToDom(styles, options) {
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			if(domStyle) {
				domStyle.refs++;
				for(var j = 0; j < domStyle.parts.length; j++) {
					domStyle.parts[j](item.parts[j]);
				}
				for(; j < item.parts.length; j++) {
					domStyle.parts.push(addStyle(item.parts[j], options));
				}
			} else {
				var parts = [];
				for(var j = 0; j < item.parts.length; j++) {
					parts.push(addStyle(item.parts[j], options));
				}
				stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
			}
		}
	}

	function listToStyles(list) {
		var styles = [];
		var newStyles = {};
		for(var i = 0; i < list.length; i++) {
			var item = list[i];
			var id = item[0];
			var css = item[1];
			var media = item[2];
			var sourceMap = item[3];
			var part = {css: css, media: media, sourceMap: sourceMap};
			if(!newStyles[id])
				styles.push(newStyles[id] = {id: id, parts: [part]});
			else
				newStyles[id].parts.push(part);
		}
		return styles;
	}

	function createStyleElement() {
		var styleElement = document.createElement("style");
		var head = getHeadElement();
		styleElement.type = "text/css";
		head.appendChild(styleElement);
		return styleElement;
	}

	function addStyle(obj, options) {
		var styleElement, update, remove;

		if (options.singleton) {
			var styleIndex = singletonCounter++;
			styleElement = singletonElement || (singletonElement = createStyleElement());
			update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
			remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
		} else {
			styleElement = createStyleElement();
			update = applyToTag.bind(null, styleElement);
			remove = function () {
				styleElement.parentNode.removeChild(styleElement);
			};
		}

		update(obj);

		return function updateStyle(newObj) {
			if(newObj) {
				if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
					return;
				update(obj = newObj);
			} else {
				remove();
			}
		};
	}

	function replaceText(source, id, replacement) {
		var boundaries = ["/** >>" + id + " **/", "/** " + id + "<< **/"];
		var start = source.lastIndexOf(boundaries[0]);
		var wrappedReplacement = replacement
			? (boundaries[0] + replacement + boundaries[1])
			: "";
		if (source.lastIndexOf(boundaries[0]) >= 0) {
			var end = source.lastIndexOf(boundaries[1]) + boundaries[1].length;
			return source.slice(0, start) + wrappedReplacement + source.slice(end);
		} else {
			return source + wrappedReplacement;
		}
	}

	function applyToSingletonTag(styleElement, index, remove, obj) {
		var css = remove ? "" : obj.css;

		if(styleElement.styleSheet) {
			styleElement.styleSheet.cssText = replaceText(styleElement.styleSheet.cssText, index, css);
		} else {
			var cssNode = document.createTextNode(css);
			var childNodes = styleElement.childNodes;
			if (childNodes[index]) styleElement.removeChild(childNodes[index]);
			if (childNodes.length) {
				styleElement.insertBefore(cssNode, childNodes[index]);
			} else {
				styleElement.appendChild(cssNode);
			}
		}
	}

	function applyToTag(styleElement, obj) {
		var css = obj.css;
		var media = obj.media;
		var sourceMap = obj.sourceMap;

		if(sourceMap && typeof btoa === "function") {
			try {
				css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(JSON.stringify(sourceMap)) + " */";
				css = "@import url(\"data:text/css;base64," + btoa(css) + "\")";
			} catch(e) {}
		}

		if(media) {
			styleElement.setAttribute("media", media)
		}

		if(styleElement.styleSheet) {
			styleElement.styleSheet.cssText = css;
		} else {
			while(styleElement.firstChild) {
				styleElement.removeChild(styleElement.firstChild);
			}
			styleElement.appendChild(document.createTextNode(css));
		}
	}


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() {
		var list = [];
		list.toString = function toString() {
			var result = [];
			for(var i = 0; i < this.length; i++) {
				var item = this[i];
				if(item[2]) {
					result.push("@media " + item[2] + "{" + item[1] + "}");
				} else {
					result.push(item[1]);
				}
			}
			return result.join("");
		};
		return list;
	}

/***/ }
/******/ ]);
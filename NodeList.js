( function( undefined ) {
	var setProto, ArrayProto = Array.prototype, NL, div, prop;
	if( Object.setPrototypeOf ) {
		setProto = function setProto( nodes, owner ) {
			nodes.owner = owner;
			return Object.setPrototypeOf( nodes, NL );
		}
	} else {
		setProto = function setProto( nodes, owner ) {
			return new NodeList( [ nodes, owner ] );
		}
	}

	function flatten( arr, owner ) {
		var elms = [], i = 0, l = arr.length, el;
		for( ; i < l; i++ ) {
			el = arr[ i ];
			if( el instanceof Node || el == null ) {
				elms.push( el );
			} else if( el instanceof window.NodeList || el instanceof NodeList || el instanceof HTMLCollection || el instanceof Array ) {
				elms = ArrayProto.concat.apply( elms, flatten( el ) );
			} else {
				arr.get = NL.get; arr.set = NL.set; arr.call = NL.call; arr.owner = owner;
				return arr;
			}
		}
		return setProto( elms, owner );
	}

	function NodeList( args ) {
		var nodes, i, l;
		if( typeof args[0] === 'string' ) {
			nodes = ( args[1] || document ).querySelectorAll( args[0] );
			for( i = 0, l = this.length = nodes.length; i < l; i++ ) this[ i ] = nodes[ i ];
		} else if( 0 in args && !( args[0] instanceof Node ) && 'length' in args[0] ) {
			for( i = 0, l = this.length = args[ 0 ].length; i < l; i++ ) this[ i ] = args[0][ i ];
			if( args[1] ) this.owner = args[1];
		} else {
			for( i = 0, l = this.length = args.length; i < l; i++ ) this[ i ] = args[ i ];
		}
	}

	NL = NodeList.prototype = {
		includes: ArrayProto.includes || function includes( element, index ) {
			return this.indexOf( element, index ) > -1;
		},

		forEach: function forEach() {
			ArrayProto.forEach.apply( this, arguments );
			return this;
		},

		push: function push() {
			var push = ArrayProto.push.bind( this ), i = 0, l = arguments.length, arg;
			for( ; i < l; i++ ) {
				arg = arguments[ i ];
				if( !( arg instanceof Node ) ) throw Error( 'Passed arguments must be of Node' );
				if( this.indexOf( arg ) === -1 ) push( arg );
			}
			return this;
		},

		pop: function pop( amount ) {
			if( typeof amount !== "number" ) amount = 1;
			var nodes = [], pop = ArrayProto.pop.bind( this ), i;
			for( i = 0; i < amount; i++ ) nodes.push( pop() );
			return setProto( nodes, this );
		},

		unshift: function unshift() {
			var unshift = ArrayProto.unshift.bind( this ), i = 0, l = arguments.length, arg;
			for( ; i < l; i++ ) {
				arg = arguments[ i ];
				if( !( arg instanceof Node ) ) throw Error( 'Passed arguments must be of Node' );
				if( this.indexOf(arg) === -1 ) unshift( arg );
			}
			return this;
		},

		shift: function shift( amount ) {
			if( typeof amount !== "number" ) amount = 1;
			var nodes = [], shift = ArrayProto.shift.bind( this ), i;
			for( i = 0; i < amount; i++ ) nodes.push( shift() );
			return setProto(  nodes, this );
		},

		splice: function splice() {
			for( var i = 2, l = arguments.length; i < l; i++ ) {
				if( !( arguments[i] instanceof Node ) ) throw Error( 'Passed arguments must be of Node' );
			}
			return setProto( ArrayProto.splice.apply( this, arguments ), this );
		},

		slice: function slice() {
			return setProto( ArrayProto.slice.apply( this, arguments ), this );
		},

		filter: function filter() {
			return setProto( ArrayProto.filter.apply( this, arguments ), this );
		},

		map: function map() {
			return flatten( ArrayProto.map.apply( this, arguments ), this );
		},

		concat: function concat() {
			var nodes = flatten( this ), i = 0, l = arguments.length, arg;
			for( ; i < l; i++ ) {
				arg = arguments[ i ];
				if( arg == null  ) {
					continue;
				} else if( arg instanceof Node ) {
					if( nodes.indexOf( arg ) === -1 ) nodes.push( arg );
				} else if( arg instanceof window.NodeList || arg instanceof HTMLCollection || arg instanceof Array || arg instanceof NodeList ) {
					nodes = nodes.concat.apply( nodes, arg );
				} else {
					throw Error( 'Concat arguments must be of a Node, NodeList, HTMLCollection, or Array of (Node, NodeList, HTMLCollection, Array)' );
				}
			}
			nodes.owner = this;
			return nodes;
		},

		get: function get( prop ) {
			var arr = [], i = 0, l = this.length, el, item;
			for( ; i < l; i++ ) {
				el = this[ i ];
				if( el == null ) {
					arr.push( el );
					continue;
				}
				item = el[ prop ];
				if( item instanceof Node && arr.indexOf(item) !== -1 ) continue;
				arr.push( item );
			}
			return flatten( arr, this );
		},

		set: function set( prop, value ) {
			var i = 0, l = this.length, el, key;
			if( prop.constructor === Object ) {
				for( ; i < l; i++ ) {
					el = this[ i ];
					if( el != null  ) {
						for( key in prop ) {
							if( key in el ) el[ key ] = prop[ key ];
						}
					}
				}
			} else {
				for( ; i < l; i++ ) {
					el = this[ i ];
					if( el != null && prop in el ) el[ prop ] = value;
				}
			}
			return this;
		},

		call: function call() {
			var arr = [], method = ArrayProto.shift.call( arguments ), returnThis = true, i = 0, l = this.length, el, funcCall;
			for( ; i < l; i++ ) {
				el = this[ i ];
				if( el != null && el[ method ] instanceof Function ) {
					funcCall = el[ method ].apply( el, arguments );
					arr.push( funcCall );
					if( returnThis && funcCall !== undefined ) returnThis = false;
				} else {
					arr.push( null );
				}
			}
			return returnThis ? this : flatten( arr, this );
		},

		item: function( index ) {
			return setProto( [ this[ index ] ], this );
		},

		get asArray() {
			return ArrayProto.slice.call( this );
		}
	}

	Object.getOwnPropertyNames( ArrayProto ).forEach( function( key ) {
		if( key !== 'join' && key !== 'copyWithin' && key !== 'fill' && NL[ key ] === undefined ) {
			NL[ key ] = ArrayProto[ key ];
		}
	});

	if(window.Symbol && Symbol.iterator) NL[ Symbol.iterator ] = NL.values = ArrayProto[ Symbol.iterator ];

	function setterGetter( prop ) {
		if( div[ prop ] instanceof Function ) {
			NL[ prop ] = function() {
				var arr = [], returnThis = true, i = 0, l = this.length, el, funcCall;
				for( ; i < l; i++ ) {
					el = this[ i ];
					if( el != null && el[ prop ] instanceof Function ) {
						funcCall = el[ prop ].apply( el, arguments );
						arr.push( funcCall );
						if( returnThis && funcCall !== undefined ) returnThis = false;
					} else {
						arr.push( null );
					}
				}
				return returnThis ? this : flatten( arr, this );
			}
		} else {
			Object.defineProperty( NL, prop, {
				get: function() {
					var arr = [], i = 0, l = this.length, el, item;
					for( ; i < l; i++ ) {
						el = this[ i ];
						if( el == null ) {
							arr.push( el );
							continue;
						}
						item = el[ prop ];
						if( item instanceof Node && arr.indexOf( item ) !== -1 ) continue;
						arr.push( item );
					}
					return flatten( arr, this );
				},
				set: function( value ) {
					for( var i = 0, l = this.length, el; i < l; i++ ) {
						el = this[ i ];
						if( el != null && prop in el ) el[ prop ] = value;
					}
				}
			});
		}
	}

	div = document.createElement( 'div' );
	for( prop in div ) setterGetter( prop );
	div = prop = null;

	window.$$ = function NodeListJS() {
		return new NodeList( arguments );
	}
	window.$$.NL = NL;
} )( undefined );

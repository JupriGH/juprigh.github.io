console.log('========================')
console.log('	core.js v1.0		 ')
console.log('========================')

{
    [	
        [[Number, String], {
            /*time : function( ) { 
                // this = unix timestamp
                var h = 0, n = 0, s = 0//, d = 0
                if (this === 0) {
                } else {
                    var t = new Date(this * 1000)
                    h = t.getHours()
                    n = t.getMinutes()
                    s = t.getSeconds()
                    //d =
                }
                return 			(h > 9 ? h : '0' + h) 
                        + ':' + (n > 9 ? n : '0' + n) 
                        + '.' + (s > 9 ? s : '0' + s)
            },
            */
            
            money : function( ) { 
                // Intl.NumberFormat('id-ID')
                //return this.toLocaleString(locale||'id-ID', { style: 'decimal' } ) 
                return window.__formatter.money.format( this )
            },
            
            // from seconds( unixtime )
            time 		: function( ) { return window.__formatter.time.format( this * 1000 ) },
            date 		: function( ) { return window.__formatter.date.format( this * 1000 ) },		
            datetime 	: function( ) { return window.__formatter.datetime.format( this * 1000 ) },
            datelong 	: function( ) { return window.__formatter.datelong.format( this * 1000 ) },
            dateshort 	: function( ) { return window.__formatter.dateshort.format( this * 1000 ) },
            datemini	: function( ) { return window.__formatter.datemini.format( this * 1000 ) },
            
            duration : function( mode, txt ) {
                // this = seconds
                // txt = ['hr','min','second']
                if ( mode === true ) mode = 1
                else if ( mode === false ) mode = 2
                
                var t = parseInt(this)
                
                if (t < 0) t = 0
                
                var h = Math.floor(t/3600),
                    m = Math.floor((t % 3600)/60),
                    s = t % 60
                
                switch ( mode )
                {
                case 1:
                    // hh:mm
                    return	(h > 9 ? h : '0' + h) + ':' 
                        + 	(m > 9 ? m : '0' + m)
                
                case 3:
                    // x hr x min x second 
                    return	( h > 0 ? h + ' hr ' : '')
                        + 	( m > 0 ? m + ' min ' : '')
                        +	( s > 0 ? s + ' second' : '')
                case 2:
                default:
                    // hh:mm.ss
                    return	(h > 0 ? (h + ':') : '')
                        + 	(m > 9 ? m : '0' + m) + '.' 
                        + 	(s > 9 ? s : '0' + s)
                }
            }
        }],
        [[Array], {
            each : Array.prototype.forEach,
        }],
        [[EventTarget], {
            on( ) {
                
                //if ( arguments[2] ) {
                //	console.warn( '#####', ... arguments )
                //}
                
                if ( Array.isArray( arguments[0] ) )
                {
                    var arg = Array.prototype.slice.call( arguments )
                    arguments[0].map( function( o ) {
                        arg[0] = o
                        this.addEventListener.apply( this, arg )
                    }, this)
                }
                else 
                {	
                    this.addEventListener.apply( this, arguments )
                }
                return this
            },
            fire(t, d, b, c) { 
                //if ( b !== undefined ) console.warn( '####', ... arguments )
                    
                return this.dispatchEvent( new CustomEvent(t, { detail: d, bubble: b, cancelable: c }) )
            }
        }],
        [[NodeList,NamedNodeMap,HTMLCollection], {
            each : function( ) { return Array.prototype.forEach.apply	( Array.prototype.slice.call( this ), arguments ) },
            some : function( ) { return Array.prototype.some.apply		( Array.prototype.slice.call( this ), arguments ) },
            //each : function( f, b ) { return Array.prototype.forEach.call( this, f, b ) },
            //some : function( f, b ) { return Array.prototype.some.call( this, f, b ) },
            //map  : function( f, b ) { return Array.prototype.map.call( this, f, b ) }
        }],
        [[Node], {
            /*_set : function( o ) {
                for ( var n in o ) this[ n ] = o[n]
                return this
            },
            */
            
            each : function() { return this.childNodes.each.apply( this.childNodes, arguments ) },
            some : function() { return this.childNodes.some.apply( this.childNodes, arguments ) },
            //map  : function( f, b ) { return this.childNodes.map( f, b ) },
            
            data( o ) {
                Object.assign( this.dataset, o )
                return this
            },
            push( ) {
                Array.prototype.forEach.call( arguments, ( o ) => {
                    if ( Array.isArray( o ) )
                    {
                        if ( this.__proto__.__pushtag__ ) {
                            o = _( this.__proto__.__pushtag__ ).push( ... o )
                            this.appendChild( o )
                        } else
                            this.push( ... o )
                    }
                    else if ( o instanceof Node )
                    {
                        if ( this.__proto__.__pushtag__ )
                            o = _( this.__proto__.__pushtag__ ).push( o )

                        this.appendChild( o )
                    }
                    else
                    {
                        var c = undefined
                        //
                        if ( this.__proto__.__pushtag__ )
                            c = _( this.__proto__.__pushtag__ )
                        //
                        if ( ( o !== null ) && ( o !== undefined ) )
                        {
                            var t = window.document.createTextNode( o )
                            if ( c ) c.push( t )
                            else c = t
                        }
                        //
                        if ( c ) this.appendChild( c )
                    }
                } )
                //
                return this		
            },
            _( ) {
                this.nodes( ... arguments )
                return this
            },
            nodes( ) {
                Array.prototype.forEach.call( arguments, ( o ) => {
                    if ( ( o !== null ) && (o !== undefined) )
                    {
                        if ( Array.isArray( o ) )
                            this.nodes.apply( this, o )
                        else if ( o instanceof Node )
                            this.appendChild( o )
                        else
                            this._text( o )
                    }
                } )
                //
                return this
            },
            clear : function( ) {
                while ( this.firstChild )
                    this.firstChild.remove( )
                //
                return this
            },
            attr : function( a ) { 
                if ( typeof a === "string" )
                    return this.getAttribute(a)
                else if (a !== null) 
                    for (var n in a) this.setAttribute( n, a[n] )
                return this
            },
            css : function() {
                
                Array.prototype.forEach.call( arguments, o => {
                    if ( o.constructor === String )
                        this.classList.add( o )
                    else if( o.constructor === Object )
                        Object.assign( this.style, o )
                })
                
                //this.classList.add.apply( this.classList, arguments )
                
                return this
            },
            replace : function( o )
            {
                this.parentNode.replaceChild( o, this )
                return o
            },
            _text : function() {
                Array.prototype.forEach.call( arguments, o => {
                    this.appendChild( document.createTextNode( o ) )
                })
                //		
                return this
            }
        }],
        [[Element], {
            bind()
            {
                for ( var a of arguments ) 
                    if ( a instanceof Function ) this[a.name] = a.bind( this )
                return this
            },
            show(s) 
            {				
                switch(s) 
                {
                case undefined :
                case null :
                case true :
                case 1 :
                    this.style.visibility = 'visible'; break							
                //
                case false :
                case 0 :
                    this.style.visibility = 'hidden'; break
                }
                return this
            },
            display(s)
            {
                this.style.display = ( s ? '' : 'none' ) 
            },
            center()
            {
                if ( getComputedStyle( this ).position === 'fixed' )
                {
                    var b = this.getBoundingClientRect()
                    
                    Object.assign( this.style, {
                        left : ( (window.innerWidth - b.width) / 2 ) + 'px',
                        top	 : ( (window.innerHeight - b.height) / 2 ) + 'px'
                    } )
                }
                return this
            }
            
        }],
        [[HTMLTableRowElement], {
            __pushtag__ : 'td',

            edit : function() 
            {
                for (var i=0,a=arguments,u=a.length; i<u; ++i) if (a[i] != undefined) this.cells[i].textContent = a[i]
                return this
            },
            colspan : function()
            {
                Array.prototype.forEach.call( arguments, function( n, i ) {
                    if ( n && (n > 1) ) this.cells[i].attr({colspan:n})
                }, this )
                return this
            },
            rowspan : function()
            {
                Array.prototype.forEach.call( arguments, function( n, i ) {
                    if ( n && (n > 1) ) this.cells[i].attr({rowspan:n})
                }, this )
                return this
            }
        }],
        [[HTMLTableSectionElement], { // <TBODY>, <THEAD>, <TFOOT>
            push : function()
            {
                Array.prototype.forEach.call( arguments, function( o ) {					
                    if ( Array.isArray( o ) )
                        this.appendChild( _('tr').push(o) )
                    else
                        this.appendChild( o )						
                }, this )
                //
                return this
            }
        }],
        [[HTMLSelectElement], { // <SELECT>
            __pushtag__ : 'option',
            
            insert : function()
            {
                for ( var i=0; i < arguments.length; ++i ) 
                {
                    if ( Array.isArray(arguments[i]) ) // range
                    {
                        for (var a=arguments[i],n = a[0], u = a[1]; n <= u; ++n) 
                            this.nodes( _('option').nodes(n).attr({'value':n}) )
                    } 
                    else if (typeof arguments[i] === 'object') // values
                    { 						
                        for (var n in arguments[i])
                            this.nodes( _('option').attr({'value':n})._text(arguments[i][n]) )							
                    }
                    else {
                        //this.nodes(_('option').attr({'value':arguments[n]})._text_(arguments[n][i]) );
                    }
                }
                return this
            }
        }],
        [[HTMLVideoElement], {
            unload : function( msg )
            {
                if ( this.dataset.debug ) alert( 'video unload: '+ msg )
                this.pause()
                this.removeAttribute('poster')
                this.removeAttribute('src')
                this.load()
                //this.src = null
                //delete this.video.src
            }
        }]
        
    ].forEach( function( a ) {
        
        a[0].forEach( function( o ) {
            
            for ( var n in a[1] ) 
                //o.prototype[ n ] = a[1][ n ]
                Object.defineProperty( o.prototype, n, { value: a[1][n] } )
        })
    })
}

window._ = window.document.createElement.bind( window.document )
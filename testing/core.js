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
            attr(a) { 
                if ( typeof a === "string" )
                    return this.getAttribute(a)
                else if (a !== null) 
                    for (var n in a) this.setAttribute( n, a[n] )
                return this
            },
            css() {
                
                Array.prototype.forEach.call( arguments, o => {
                    if ( o.constructor === String )
                        this.classList.add( o )
                    else if( o.constructor === Object )
                        Object.assign( this.style, o )
                })
                
                //this.classList.add.apply( this.classList, arguments )
                
                return this
            },
            replace(o) {
                this.parentNode.replaceChild( o, this )
                return o
            },
            _text() {
                Array.prototype.forEach.call( arguments, o => {
                    this.appendChild( document.createTextNode( o ) )
                })
                //		
                return this
            }
        }],
        [[Element], {
			HTML(s) {
				this.setHTML(s)
				return this
			},
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

////////////////////////////////////// BASE APPLICATION
class Application {
	
	api_url		= ''
	api_host 	= ''
	
	param 		= null // query parameters
	
	
	get_param = () => {
		var query = Object.fromEntries(new URLSearchParams(window.location.search).entries())
		var {param} = query
		if (param) {
			this.param = param
			param = query.param = JSON.parse(atob(param))
			console.log('PARAM', param)
			this.api_host = param.server
		}
		return query
	}

	__query = this.get_param()

	api = (query, url, progress) => {
		if (!url) url = `${this.api_url}` || `${this.api_host}/api`
		console.log('<api> <<', query)

		var prom = fetch(url, {
			method		: 'POST',
			cache		: 'no-cache',
			headers		: {'Content-Type': 'application/json'},
			credentials	: 'include', // omit / include
			body		: JSON.stringify(query) 
		})
		
		if (0) { // (progress) {
			prom = prom.then(res => 
				new Promise((resolve) => {
					var tmp = new Response(
						new ReadableStream({
							async start(controller) {
								var reader = res.body.getReader()
								var count = 0
								var total = res.headers.get('content-length')
								console.log('TOTAL', total)
								total = parseInt(total, 10)
								
								progress({caption:'downloading ... ', count:0, total:0})
								
								for (;;) {
									var {done, value} = await reader.read()
									//console.log('---', done, value)
									
									if (done) break

									count += value.byteLength
									try {
										progress({count, total})
									} catch (e) {
										console.error(e)
									}
									controller.enqueue(value)
								}
								//console.log('download completed')
								progress()
								controller.close()
								resolve(tmp)
							}
						})
					)
				})
			)
		}
		///
		return prom
			.then(res => res.json())
			.then(res => {
				if (res.code === 0) {
					console.log('<api> >>', res)
					return res
				} else {
					console.error('<api> >>', res)
					if (!res.error) res.error = 'Unknwon API error'
					return Promise.reject(res)
				}
			})
	}

	ws(query, url, progress) {
		
		return new Promise((resolve, reject) => {
			if (!url) url =  `${this.api_host}/api`
			url = url.replace('https://','wss://').replace('http://','ws://')
			
			console.log('<ws> <<', query)
			
			var sock = new WebSocket(url)
			var raws = [] // chunks
			
			sock.on(['open','message','error','close'], e => {
				switch(e.type) {
				case 'open':
					console.warn(`ws:${e.type}`, e)
					sock.send(JSON.stringify(query))
					break
				
				case 'message':
					var con = e?.data?.constructor
					if (con === String) {
						
						var res = JSON.parse(e.data)
						switch (res.code) {
						case 0: // END
							e.target.close(1000, 'manual close')
							if (progress) progress()
							if (raws.length) res.file = new Blob([...raws])
							console.log('<ws> >>', res)
							resolve(res)
							break
						
						case 101: // PROGRESS	
							console.log('PROGRESS', res)
							if (progress) {
								var {caption, count, total} = res
								progress({caption, count, total})
							}
							break
							
						default:
							
							e.target.close(1000, 'manual close')
							
							if (res.code >= 500) { // ERRORS							
								
								if (progress) progress()
								if (!res.error) res.error = 'Unknwon API error'
								console.error('<ws> >>', res)
								reject(res)
							}
							else {
							
								console.warn('UNKNOWN MESSAGE', e.data)
								// statuses, progress, etc.
								reject(res)
							}
							
						}

					} else if (con === Blob) {
						
						console.warn('BLOB', e.data.size)
						raws.push(e.data)

					} else {
						console.warn('TODO: ws-message', e)						
					}
					break
				
				case 'error':
					console.warn(`ws:${e.type}`, e)
					break
				
				case 'close':
					console.warn(`ws:${e.type}`, e)
					if (progress) progress()

					if (e.code === 1000) {
					} else {
						reject(`[websocket] error ${e.code} ${e.reason||"unknown error"}`)
					}
					break
				
				default:
					console.error(`UNHANDLED event ws:${e.type}`, e)
				}
				
			})
		})
	}
}

////////////////////////////////////// BASE INTERFACE
class UI_Base extends HTMLDivElement {
	constructor() {
		super()
	}

	button = (command, caption) => _('button').attr({type:'button'}).data({command}).on('click', this)._(caption)
	
	run(promise, element) {
		(element||this).dataset.running = 1
		
		return promise
			.catch(e => {
				var arg = undefined
					 if (e.error) 	arg = {message:e.error, 		type:'error'} // red
				else if (e.warning)	arg = {message:e.warning, 		type:'alert'} // yellow
				else {
					console.error('RUN', e)
					arg = {message:e.error||e, type:'error'}
				}
				return this.confirm(arg)
			})
			.finally(() => delete (element||this).dataset.running)
	}
	
	confirm = ({message, type, content, buttons, element}) => new Promise((resolve) => {
		var modal = _('div', {is:'ui-confirm'})._open({message, type, content, buttons, callback:resolve})
		var res = (element||this)._(modal)
		/// modal.showModal()
		return modal
	})

	handleEvent(e, ... args) {		
		var command = e.target.dataset.command
		if (command == undefined) {
			console.error('command undefined')
			return
		}
		
		//var value 	= e.target.dataset[command]
		//console.log({command, value, t:e.target, ct:e.currentTarget})
		
		//if (value) {
			var name = `on_${command}`.replace('-','_')
			if (this[name]) this[name](e, ... args)
			else console.warn('event:', name, ... args)
		//}
		
		/*
		var command = e.currentTarget.dataset.command ?? e.target.dataset.command
		command = command ? `on_${command}_${e.type}` : `on_${e.type}`
		command = command.replace('-','_')

		if (this[command]) this[command](e, ... args)
		else console.warn('event:', command, ... args)
		*/
	}
	
	animate_close = () => this.css({'animation':'animate-zoom-out 0.5s'}).on('animationend', e => this.remove()) 
}

//////
export { Application, UI_Base }